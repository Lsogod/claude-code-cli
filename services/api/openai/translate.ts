/**
 * Bidirectional translator between Anthropic and OpenAI message formats.
 *
 * Handles both request translation (Anthropic → OpenAI) and response
 * translation (OpenAI → Anthropic), including streaming SSE events.
 *
 * Translated from: claw-code/rust/crates/api/src/providers/openai_compat.rs
 * Functions: build_chat_completion_request, translate_message, normalize_response,
 *            StreamState.ingest_chunk, StreamState.finish
 */

import type {
  OpenAIChatCompletionChunk,
  OpenAIChatCompletionRequest,
  OpenAIChatCompletionResponse,
  OpenAIMessage,
  OpenAITool,
  OpenAIToolCall,
  OpenAIToolChoice,
} from './types.js'

// ============================================================================
// Request translation: Anthropic → OpenAI
// ============================================================================

/**
 * Build an OpenAI chat completion request from Anthropic-style params.
 *
 * Reference: openai_compat.rs build_chat_completion_request()
 */
/**
 * Trim the Claude Code system prompt for local models.
 *
 * The full system prompt is ~15-20k tokens with sections designed for
 * Claude's capabilities (prompt caching, tool search, context management).
 * Local models (8B-24B) get confused by the volume. This strips sections
 * that are Anthropic-specific or too verbose, keeping core instructions.
 *
 * Gated behind OPENAI_TRIM_SYSTEM_PROMPT=1 (set automatically for local providers).
 */
function trimSystemPromptForLocalModel(system: string): string {
  const shouldTrim = process.env.OPENAI_TRIM_SYSTEM_PROMPT === '1'
  if (!shouldTrim) return system

  // Sections to remove entirely (matched by heading or content)
  const sectionsToRemove = [
    // Anthropic-specific features
    /# Executing actions with care[\s\S]*?(?=\n#\s|\n\nIMPORTANT:|\Z)/,
    // Function result clearing (Anthropic context management)
    /# Function result clearing[\s\S]*?(?=\n#\s|\Z)/,
    // Summarize tool results (Anthropic context compression)
    /When working with tool results, write down any important.*?cleared later\./,
    // The system will automatically compress (Anthropic context window)
    / - The system will automatically compress prior messages.*?context window\./,
    // Prompt caching boundary marker
    /={3,}.*BOUNDARY.*={3,}/,
    // Attribution header (Anthropic-specific)
    /x-client-request-id.*?correlation/,
    // Numeric length anchors (Ant-only)
    /Length limits: keep text between tool calls.*?detail\./,
    // Token budget instructions
    /When the user specifies a token target.*?continue you\./,
  ]

  let trimmed = system
  for (const pattern of sectionsToRemove) {
    trimmed = trimmed.replace(pattern, '')
  }

  // Collapse excessive whitespace from removed sections
  trimmed = trimmed.replace(/\n{4,}/g, '\n\n\n')

  return trimmed.trim()
}

export function buildChatCompletionRequest(
  model: string,
  maxTokens: number,
  messages: unknown[],
  system: string | undefined,
  tools: unknown[] | undefined,
  toolChoice: unknown | undefined,
  stream: boolean,
): OpenAIChatCompletionRequest {
  const openaiMessages: OpenAIMessage[] = []

  // Trim system prompt for local models if enabled
  const trimmedSystem = system ? trimSystemPromptForLocalModel(system) : system

  // System prompt: use 'system' role if the model supports it,
  // otherwise prepend to the first user message. Mistral and some other
  // local models reject the system role entirely.
  const useSystemRole = process.env.OPENAI_SYSTEM_ROLE !== '0'
  if (trimmedSystem && useSystemRole) {
    openaiMessages.push({ role: 'system', content: trimmedSystem })
  }

  // Translate each Anthropic message
  for (const msg of messages) {
    openaiMessages.push(...translateMessage(msg as any))
  }

  // If system role is disabled, prepend system content to first user message
  if (trimmedSystem && !useSystemRole && openaiMessages.length > 0) {
    const first = openaiMessages[0]
    if (first.role === 'user' && typeof first.content === 'string') {
      openaiMessages[0] = { role: 'user', content: trimmedSystem + '\n\n' + first.content }
    } else {
      // Insert as user message before other messages
      openaiMessages.unshift({ role: 'user', content: trimmedSystem })
    }
  }

  // Merge consecutive same-role messages. Many local models (Mistral, Llama)
  // enforce strict role alternation (user/assistant/user/...) and reject
  // requests with consecutive messages of the same role. The Anthropic format
  // can produce multiple user messages in a row (e.g., text + tool_result).
  const mergedMessages = mergeConsecutiveRoles(openaiMessages)

  const request: OpenAIChatCompletionRequest = {
    model,
    max_tokens: maxTokens,
    messages: mergedMessages,
    stream,
  }

  if (stream) {
    request.stream_options = { include_usage: true }
  }

  // Only send tools if OPENAI_SEND_TOOLS=1 is set. Most local models
  // (MLX, ollama, vLLM with small models) don't handle tool calling
  // reliably and generate malformed tool_use responses that crash the
  // query engine. Disable by default for safety.
  const sendTools = process.env.OPENAI_SEND_TOOLS === '1'
  if (sendTools && tools && tools.length > 0) {
    let translatedTools = tools.map(translateToolDefinition)

    // Limit tools sent to local models to avoid OOM.
    // OPENAI_MAX_TOOLS caps the number of tool definitions. Core tools
    // (Bash, Read, Edit, Write, Glob, Grep, Agent) are prioritised.
    const maxTools = parseInt(process.env.OPENAI_MAX_TOOLS || '0', 10)
    if (maxTools > 0 && translatedTools.length > maxTools) {
      const coreToolNames = new Set([
        'Bash', 'Read', 'Edit', 'Write', 'Glob', 'Grep', 'Agent',
        'WebFetch', 'WebSearch', 'TaskCreate', 'TaskUpdate',
      ])
      const core = translatedTools.filter(t => coreToolNames.has(t.function.name))
      const rest = translatedTools.filter(t => !coreToolNames.has(t.function.name))
      translatedTools = [...core, ...rest].slice(0, maxTools)
    }

    request.tools = translatedTools
  }

  if (sendTools && toolChoice) {
    request.tool_choice = translateToolChoice(toolChoice as any)
  }

  return request
}

/**
 * Translate a single Anthropic message to one or more OpenAI messages.
 *
 * Reference: openai_compat.rs translate_message()
 */
function translateMessage(message: {
  role: string
  content: unknown[] | string
}): OpenAIMessage[] {
  // Handle string content (simple user message)
  if (typeof message.content === 'string') {
    return [{ role: message.role as 'user', content: message.content }]
  }

  const blocks = message.content as any[]

  if (message.role === 'assistant') {
    let text = ''
    const toolCalls: OpenAIToolCall[] = []

    for (const block of blocks) {
      if (block.type === 'text') {
        text += block.text
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          type: 'function',
          function: {
            name: block.name,
            arguments:
              typeof block.input === 'string'
                ? block.input
                : JSON.stringify(block.input),
          },
        })
      }
      // thinking blocks are stripped (no OpenAI equivalent)
    }

    if (!text && toolCalls.length === 0) {
      return []
    }

    const msg: OpenAIMessage = {
      role: 'assistant',
      content: text || null,
      ...(toolCalls.length > 0 && { tool_calls: toolCalls }),
    }
    return [msg]
  }

  // User/other roles: expand content blocks into separate messages
  const result: OpenAIMessage[] = []
  for (const block of blocks) {
    if (block.type === 'text') {
      result.push({ role: 'user', content: block.text })
    } else if (block.type === 'tool_result') {
      const content = flattenToolResultContent(block.content)
      result.push({
        role: 'tool',
        tool_call_id: block.tool_use_id,
        content,
      })
    } else if (block.type === 'image') {
      // Translate base64 images to OpenAI image_url format
      if (block.source?.type === 'base64') {
        result.push({
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${block.source.media_type};base64,${block.source.data}`,
              },
            },
          ],
        })
      }
    }
  }
  return result
}

/**
 * Flatten tool result content blocks to a single string.
 *
 * Reference: openai_compat.rs flatten_tool_result_content()
 */
function flattenToolResultContent(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return String(content ?? '')
  return content
    .map((block: any) => {
      if (block.type === 'text') return block.text
      if (block.type === 'json') return JSON.stringify(block.value)
      return String(block.text ?? block.content ?? '')
    })
    .join('\n')
}

/**
 * Translate an Anthropic tool definition to OpenAI function format.
 *
 * Reference: openai_compat.rs openai_tool_definition()
 */
function translateToolDefinition(tool: any): OpenAITool {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }
}

/**
 * Translate Anthropic tool_choice to OpenAI format.
 *
 * Reference: openai_compat.rs openai_tool_choice()
 */
function translateToolChoice(tc: {
  type: string
  name?: string
}): OpenAIToolChoice {
  switch (tc.type) {
    case 'auto':
      return 'auto'
    case 'any':
      return 'required'
    case 'tool':
      return { type: 'function', function: { name: tc.name! } }
    default:
      return 'auto'
  }
}

// ============================================================================
// Non-streaming response translation: OpenAI → Anthropic
// ============================================================================

/**
 * Translate an OpenAI chat completion response to Anthropic message format.
 *
 * Reference: openai_compat.rs normalize_response()
 */
export function normalizeResponse(
  model: string,
  response: OpenAIChatCompletionResponse,
): any {
  const choice = response.choices[0]
  if (!choice) {
    throw new Error('Chat completion response missing choices')
  }

  const content: any[] = []
  if (choice.message.content) {
    content.push({ type: 'text', text: choice.message.content })
  }
  for (const tc of choice.message.tool_calls ?? []) {
    content.push({
      type: 'tool_use',
      id: tc.id,
      name: tc.function.name,
      input: parseToolArguments(tc.function.arguments),
    })
  }

  return {
    id: response.id,
    type: 'message',
    role: choice.message.role || 'assistant',
    content,
    model: response.model || model,
    stop_reason: choice.finish_reason
      ? normalizeFinishReason(choice.finish_reason)
      : null,
    stop_sequence: null,
    usage: {
      input_tokens: response.usage?.prompt_tokens ?? 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      output_tokens: response.usage?.completion_tokens ?? 0,
    },
  }
}

// ============================================================================
// Streaming translation: OpenAI chunks → Anthropic events
// ============================================================================

/**
 * Mutable state for translating a stream of OpenAI chunks to Anthropic events.
 *
 * Reference: openai_compat.rs StreamState
 */
export interface StreamTranslationState {
  model: string
  messageStarted: boolean
  textStarted: boolean
  textFinished: boolean
  finished: boolean
  stopReason: string | null
  usage: { input_tokens: number; output_tokens: number } | null
  toolCalls: Map<
    number,
    {
      id: string | null
      name: string | null
      arguments: string
      emittedLen: number
      started: boolean
      stopped: boolean
    }
  >
}

export function createStreamState(model: string): StreamTranslationState {
  return {
    model,
    messageStarted: false,
    textStarted: false,
    textFinished: false,
    finished: false,
    stopReason: null,
    usage: null,
    toolCalls: new Map(),
  }
}

/**
 * Translate a single OpenAI SSE chunk into Anthropic stream events.
 *
 * Reference: openai_compat.rs StreamState.ingest_chunk()
 */
export function ingestChunk(
  state: StreamTranslationState,
  chunk: OpenAIChatCompletionChunk,
): any[] {
  const events: any[] = []

  // Emit message_start on first chunk
  if (!state.messageStarted) {
    state.messageStarted = true
    events.push({
      type: 'message_start',
      message: {
        id: chunk.id,
        type: 'message',
        role: 'assistant',
        content: [],
        model: chunk.model || state.model,
        stop_reason: null,
        stop_sequence: null,
        usage: {
          input_tokens: 0,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
          output_tokens: 0,
        },
      },
    })
  }

  // Track usage from streaming chunks
  if (chunk.usage) {
    state.usage = {
      input_tokens: chunk.usage.prompt_tokens,
      output_tokens: chunk.usage.completion_tokens,
    }
  }

  for (const choice of chunk.choices) {
    // Text content delta
    const content = choice.delta.content
    if (content != null && content !== '') {
      if (!state.textStarted) {
        state.textStarted = true
        events.push({
          type: 'content_block_start',
          index: 0,
          content_block: { type: 'text', text: '' },
        })
      }
      events.push({
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'text_delta', text: content },
      })
    }

    // Tool call deltas
    for (const tc of choice.delta.tool_calls ?? []) {
      if (!state.toolCalls.has(tc.index)) {
        state.toolCalls.set(tc.index, {
          id: null,
          name: null,
          arguments: '',
          emittedLen: 0,
          started: false,
          stopped: false,
        })
      }
      const tcState = state.toolCalls.get(tc.index)!

      // Apply delta
      if (tc.id) tcState.id = tc.id
      if (tc.function?.name) tcState.name = tc.function.name
      if (tc.function?.arguments) tcState.arguments += tc.function.arguments

      const blockIndex = tc.index + 1 // text is block 0, tools start at 1

      // Start event (once we have a name)
      if (!tcState.started && tcState.name) {
        tcState.started = true
        events.push({
          type: 'content_block_start',
          index: blockIndex,
          content_block: {
            type: 'tool_use',
            id: tcState.id || `tool_call_${tc.index}`,
            name: tcState.name,
            input: {},
          },
        })
      }

      // Delta event (new argument characters)
      if (tcState.started && tcState.emittedLen < tcState.arguments.length) {
        const delta = tcState.arguments.slice(tcState.emittedLen)
        tcState.emittedLen = tcState.arguments.length
        events.push({
          type: 'content_block_delta',
          index: blockIndex,
          delta: { type: 'input_json_delta', partial_json: delta },
        })
      }

      // Stop tool blocks on tool_calls finish reason
      if (
        choice.finish_reason === 'tool_calls' &&
        tcState.started &&
        !tcState.stopped
      ) {
        tcState.stopped = true
        events.push({ type: 'content_block_stop', index: blockIndex })
      }
    }

    // Finish reason
    if (choice.finish_reason) {
      state.stopReason = normalizeFinishReason(choice.finish_reason)

      // Stop all un-stopped tool blocks
      if (choice.finish_reason === 'tool_calls') {
        for (const [idx, tcState] of state.toolCalls) {
          if (tcState.started && !tcState.stopped) {
            tcState.stopped = true
            events.push({ type: 'content_block_stop', index: idx + 1 })
          }
        }
      }
    }
  }

  return events
}

/**
 * Emit final events to close the stream.
 *
 * Reference: openai_compat.rs StreamState.finish()
 */
export function finishStream(state: StreamTranslationState): any[] {
  if (state.finished) return []
  state.finished = true

  const events: any[] = []

  // Close text block if open
  if (state.textStarted && !state.textFinished) {
    state.textFinished = true
    events.push({ type: 'content_block_stop', index: 0 })
  }

  // Close any remaining tool blocks
  for (const [idx, tcState] of state.toolCalls) {
    if (!tcState.started && tcState.name) {
      tcState.started = true
      events.push({
        type: 'content_block_start',
        index: idx + 1,
        content_block: {
          type: 'tool_use',
          id: tcState.id || `tool_call_${idx}`,
          name: tcState.name,
          input: {},
        },
      })
      if (tcState.emittedLen < tcState.arguments.length) {
        events.push({
          type: 'content_block_delta',
          index: idx + 1,
          delta: {
            type: 'input_json_delta',
            partial_json: tcState.arguments.slice(tcState.emittedLen),
          },
        })
      }
    }
    if (tcState.started && !tcState.stopped) {
      tcState.stopped = true
      events.push({ type: 'content_block_stop', index: idx + 1 })
    }
  }

  // Message delta + stop
  if (state.messageStarted) {
    events.push({
      type: 'message_delta',
      delta: {
        stop_reason: state.stopReason || 'end_turn',
        stop_sequence: null,
      },
      usage: {
        input_tokens: state.usage?.input_tokens ?? 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        output_tokens: state.usage?.output_tokens ?? 0,
      },
    })
    events.push({ type: 'message_stop' })
  }

  return events
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Reference: openai_compat.rs normalize_finish_reason()
 */
function normalizeFinishReason(reason: string): string {
  switch (reason) {
    case 'stop':
      return 'end_turn'
    case 'tool_calls':
      return 'tool_use'
    case 'length':
      return 'max_tokens'
    default:
      return reason
  }
}

function parseToolArguments(args: string): unknown {
  try {
    return JSON.parse(args)
  } catch {
    return { raw: args }
  }
}

/**
 * Merge consecutive messages with the same role into single messages.
 * Many local models (Mistral, Llama, etc.) enforce strict role alternation
 * and return 404/400 if consecutive messages share a role.
 *
 * Tool-role messages are left as-is (they need tool_call_id).
 */
function mergeConsecutiveRoles(messages: OpenAIMessage[]): OpenAIMessage[] {
  if (messages.length === 0) return messages
  const merged: OpenAIMessage[] = [messages[0]]

  for (let i = 1; i < messages.length; i++) {
    const prev = merged[merged.length - 1]
    const curr = messages[i]

    // Only merge user+user or system+system (not tool, not assistant with tool_calls)
    if (
      curr.role === prev.role &&
      (curr.role === 'user' || curr.role === 'system') &&
      typeof prev.content === 'string' &&
      typeof curr.content === 'string'
    ) {
      ;(merged[merged.length - 1] as any) = {
        role: prev.role,
        content: prev.content + '\n' + curr.content,
      }
    } else {
      merged.push(curr)
    }
  }

  return merged
}
