/**
 * Anthropic SDK shim for OpenAI-compatible endpoints.
 *
 * Creates a fake Anthropic client that implements the subset of the
 * SDK interface used by queryModel in claude.ts:
 *
 *   anthropic.beta.messages.create(params, options).withResponse()
 *   → { data: AsyncIterable<BetaRawMessageStreamEvent>, request_id, response }
 *
 * Internally translates Anthropic format → OpenAI format, makes HTTP
 * requests, and translates OpenAI responses back to Anthropic events.
 *
 * This is the same "lie about the return type" approach used by
 * @anthropic-ai/bedrock-sdk, vertex-sdk, and foundry-sdk.
 *
 * Translated from: claw-code/rust/crates/api/src/client.rs (ProviderClient dispatch)
 */

import type { OpenAIProviderConfig } from './types.js'
import { chatCompletion, streamChatCompletion } from './client.js'
import {
  buildChatCompletionRequest,
  createStreamState,
  finishStream,
  ingestChunk,
  normalizeResponse,
} from './translate.js'

/**
 * Create an OpenAI-compatible client that masquerades as an Anthropic SDK client.
 *
 * The returned object implements the minimal interface consumed by
 * services/api/claude.ts queryModel():
 *   - client.beta.messages.create(params, options) → StreamWrapper
 *   - StreamWrapper.withResponse() → { data, request_id, response }
 *   - data is async-iterable, yielding Anthropic-format stream events
 */
export function createOpenAICompatibleClient(config: OpenAIProviderConfig) {
  const client = {
    beta: {
      messages: {
        create(params: any, options?: any) {
          return new StreamWrapper(params, options, config)
        },
      },
    },
    // Non-streaming create used by verifyApiKey
    messages: {
      create: async (params: any) => {
        const request = buildChatCompletionRequest(
          config.model || params.model,
          params.max_tokens,
          params.messages,
          params.system,
          params.tools,
          params.tool_choice,
          false,
        )
        const response = await chatCompletion(request, config)
        return normalizeResponse(config.model || params.model, response)
      },
    },
  }
  return client
}

/**
 * Wraps an OpenAI streaming request to match the Anthropic SDK's
 * Stream interface: async-iterable + .withResponse().
 */
class StreamWrapper {
  private params: any
  private options: any
  private config: OpenAIProviderConfig

  constructor(params: any, options: any, config: OpenAIProviderConfig) {
    this.params = params
    this.options = options
    this.config = config
  }

  /**
   * Returns the stream with response metadata.
   * Matches: anthropic.beta.messages.create(...).withResponse()
   */
  async withResponse(): Promise<{
    data: AsyncIterable<any>
    request_id: string | null
    response: Response
  }> {
    const model = this.config.model || this.params.model
    const signal = this.options?.signal as AbortSignal | undefined

    if (this.params.stream) {
      const request = buildChatCompletionRequest(
        model,
        this.params.max_tokens,
        this.params.messages,
        typeof this.params.system === 'string'
          ? this.params.system
          : Array.isArray(this.params.system)
            ? this.params.system
                .map((s: any) =>
                  typeof s === 'string' ? s : s.text ?? '',
                )
                .join('\n')
            : undefined,
        this.params.tools,
        this.params.tool_choice,
        true,
      )

      const stream = createAnthropicEventStream(
        request,
        this.config,
        model,
        signal,
      )

      return {
        data: stream,
        request_id: null,
        response: new Response(null, { status: 200 }),
      }
    }

    // Non-streaming path
    const request = buildChatCompletionRequest(
      model,
      this.params.max_tokens,
      this.params.messages,
      typeof this.params.system === 'string' ? this.params.system : undefined,
      this.params.tools,
      this.params.tool_choice,
      false,
    )
    const response = await chatCompletion(request, this.config, signal)
    const message = normalizeResponse(model, response)

    // Wrap single message as a synthetic stream
    const syntheticEvents = [
      {
        type: 'message_start',
        message,
      },
      { type: 'message_stop' },
    ]

    return {
      data: (async function* () {
        for (const event of syntheticEvents) {
          yield event
        }
      })(),
      request_id: null,
      response: new Response(null, { status: 200 }),
    }
  }

  /**
   * Make the wrapper itself async-iterable (for code paths that
   * iterate the stream directly without calling .withResponse()).
   */
  async *[Symbol.asyncIterator]() {
    const { data } = await this.withResponse()
    yield* data
  }
}

/**
 * Creates an async generator that yields Anthropic-format stream events
 * by consuming an OpenAI SSE stream and translating each chunk.
 */
async function* createAnthropicEventStream(
  request: any,
  config: OpenAIProviderConfig,
  model: string,
  signal?: AbortSignal,
): AsyncGenerator<any> {
  const state = createStreamState(model)

  for await (const chunk of streamChatCompletion(request, config, signal)) {
    const events = ingestChunk(state, chunk)
    for (const event of events) {
      yield event
    }
  }

  // Emit closing events
  const finalEvents = finishStream(state)
  for (const event of finalEvents) {
    yield event
  }
}
