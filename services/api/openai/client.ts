/**
 * HTTP client for OpenAI-compatible API endpoints.
 *
 * Uses native fetch (available in Bun) for HTTP requests and
 * manual SSE parsing for streaming responses.
 *
 * Translated from: claw-code/rust/crates/api/src/providers/openai_compat.rs
 * Functions: send_raw_request, send_with_retry, OpenAiSseParser, expect_success
 */

import type {
  OpenAIChatCompletionChunk,
  OpenAIChatCompletionRequest,
  OpenAIChatCompletionResponse,
  OpenAIErrorResponse,
  OpenAIProviderConfig,
} from './types.js'

const DEFAULT_MAX_RETRIES = 2
const DEFAULT_INITIAL_BACKOFF_MS = 200
const DEFAULT_MAX_BACKOFF_MS = 2000
const RETRYABLE_STATUS_CODES = new Set([408, 409, 429, 500, 502, 503, 504])

/**
 * Build the chat completions endpoint URL.
 *
 * Reference: openai_compat.rs chat_completions_endpoint()
 */
function chatCompletionsEndpoint(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, '')
  if (trimmed.endsWith('/chat/completions')) return trimmed
  return `${trimmed}/chat/completions`
}

/**
 * Send a non-streaming chat completion request.
 */
export async function chatCompletion(
  request: OpenAIChatCompletionRequest,
  config: OpenAIProviderConfig,
  signal?: AbortSignal,
): Promise<OpenAIChatCompletionResponse> {
  const response = await sendWithRetry(
    { ...request, stream: false },
    config,
    signal,
  )
  return response.json() as Promise<OpenAIChatCompletionResponse>
}

/**
 * Send a streaming chat completion request and yield parsed chunks.
 *
 * Reference: openai_compat.rs MessageStream, OpenAiSseParser
 */
export async function* streamChatCompletion(
  request: OpenAIChatCompletionRequest,
  config: OpenAIProviderConfig,
  signal?: AbortSignal,
): AsyncGenerator<OpenAIChatCompletionChunk> {
  const response = await sendWithRetry(
    { ...request, stream: true, stream_options: { include_usage: true } },
    config,
    signal,
  )

  const reader = response.body?.getReader()
  if (!reader) throw new Error('Response body is not readable')

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Parse SSE frames from buffer
      // Reference: openai_compat.rs next_sse_frame(), parse_sse_frame()
      while (true) {
        // Find double-newline frame boundary (\n\n or \r\n\r\n)
        const nnIdx = buffer.indexOf('\n\n')
        const rnrnIdx = buffer.indexOf('\r\n\r\n')

        let frameEnd: number
        let sepLen: number
        if (nnIdx === -1 && rnrnIdx === -1) break
        if (rnrnIdx !== -1 && (nnIdx === -1 || rnrnIdx < nnIdx)) {
          frameEnd = rnrnIdx
          sepLen = 4
        } else {
          frameEnd = nnIdx
          sepLen = 2
        }

        const frame = buffer.slice(0, frameEnd)
        buffer = buffer.slice(frameEnd + sepLen)

        const chunk = parseSseFrame(frame)
        if (chunk) yield chunk
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * Parse a single SSE frame into a ChatCompletionChunk.
 *
 * Reference: openai_compat.rs parse_sse_frame()
 */
function parseSseFrame(frame: string): OpenAIChatCompletionChunk | null {
  const trimmed = frame.trim()
  if (!trimmed) return null

  const dataLines: string[] = []
  for (const line of trimmed.split('\n')) {
    // Skip SSE comments
    if (line.startsWith(':')) continue
    const match = line.match(/^data:\s?(.*)$/)
    if (match) {
      dataLines.push(match[1])
    }
  }

  if (dataLines.length === 0) return null
  const payload = dataLines.join('\n')
  if (payload === '[DONE]') return null

  return JSON.parse(payload) as OpenAIChatCompletionChunk
}

/**
 * Send a request with retry logic.
 *
 * Reference: openai_compat.rs send_with_retry()
 */
async function sendWithRetry(
  request: OpenAIChatCompletionRequest,
  config: OpenAIProviderConfig,
  signal?: AbortSignal,
): Promise<Response> {
  const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await sendRawRequest(request, config, signal)
      if (response.ok) return response

      // Check if retryable
      if (
        RETRYABLE_STATUS_CODES.has(response.status) &&
        attempt < maxRetries
      ) {
        const body = await response.text()
        lastError = new Error(
          `OpenAI API error ${response.status}: ${parseErrorMessage(body)}`,
        )
        await sleep(backoffForAttempt(attempt))
        continue
      }

      // Non-retryable error
      const body = await response.text()
      throw new Error(
        `OpenAI API error ${response.status}: ${parseErrorMessage(body)}`,
      )
    } catch (error) {
      if (signal?.aborted) throw error

      // Connection errors (e.g., local server not running)
      if (
        error instanceof TypeError &&
        (error.message.includes('fetch') ||
          error.message.includes('connect') ||
          error.message.includes('ECONNREFUSED'))
      ) {
        throw new Error(
          `Cannot connect to OpenAI-compatible server at ${config.baseUrl}. ` +
            `Is the server running? (${error.message})`,
        )
      }

      if (attempt < maxRetries && isRetryableError(error)) {
        lastError = error as Error
        await sleep(backoffForAttempt(attempt))
        continue
      }
      throw error
    }
  }

  throw lastError || new Error('Request failed after retries')
}

/**
 * Send a single HTTP request.
 *
 * Reference: openai_compat.rs send_raw_request()
 */
async function sendRawRequest(
  request: OpenAIChatCompletionRequest,
  config: OpenAIProviderConfig,
  signal?: AbortSignal,
): Promise<Response> {
  const url = chatCompletionsEndpoint(config.baseUrl)
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.apiKey && {
        Authorization: `Bearer ${config.apiKey}`,
      }),
    },
    body: JSON.stringify(request),
    signal,
  })
}

function parseErrorMessage(body: string): string {
  try {
    const parsed = JSON.parse(body) as OpenAIErrorResponse
    return parsed.error?.message || body
  } catch {
    return body
  }
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('ECONNRESET') ||
      error.message.includes('EPIPE') ||
      error.message.includes('socket hang up')
    )
  }
  return false
}

/**
 * Exponential backoff.
 *
 * Reference: openai_compat.rs backoff_for_attempt()
 */
function backoffForAttempt(attempt: number): number {
  const delay = DEFAULT_INITIAL_BACKOFF_MS * Math.pow(2, attempt)
  return Math.min(delay, DEFAULT_MAX_BACKOFF_MS)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
