/**
 * OpenAI Chat Completions API types.
 *
 * Self-contained type definitions matching the OpenAI API spec.
 * No npm dependency on the openai package — these are used by our
 * own HTTP client and translation layer.
 *
 * Translated from: claw-code/rust/crates/api/src/providers/openai_compat.rs
 */

// ============================================================================
// Request types
// ============================================================================

export interface OpenAIChatCompletionRequest {
  model: string
  messages: OpenAIMessage[]
  max_tokens?: number
  temperature?: number
  stream?: boolean
  stream_options?: { include_usage?: boolean }
  tools?: OpenAITool[]
  tool_choice?: OpenAIToolChoice
}

export type OpenAIMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string | OpenAIContentPart[] }
  | {
      role: 'assistant'
      content: string | null
      tool_calls?: OpenAIToolCall[]
    }
  | {
      role: 'tool'
      tool_call_id: string
      content: string
    }

export type OpenAIContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

export interface OpenAIToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface OpenAITool {
  type: 'function'
  function: {
    name: string
    description?: string
    parameters: Record<string, unknown>
  }
}

export type OpenAIToolChoice =
  | 'auto'
  | 'none'
  | 'required'
  | { type: 'function'; function: { name: string } }

// ============================================================================
// Non-streaming response types
// ============================================================================

export interface OpenAIChatCompletionResponse {
  id: string
  object: string
  model: string
  choices: OpenAIChoice[]
  usage?: OpenAIUsage
}

export interface OpenAIChoice {
  message: {
    role: string
    content: string | null
    tool_calls?: OpenAIToolCall[]
  }
  finish_reason: string | null
}

export interface OpenAIUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens?: number
}

// ============================================================================
// Streaming chunk types
// ============================================================================

export interface OpenAIChatCompletionChunk {
  id: string
  object: string
  model?: string
  choices: OpenAIChunkChoice[]
  usage?: OpenAIUsage
}

export interface OpenAIChunkChoice {
  delta: OpenAIChunkDelta
  finish_reason: string | null
}

export interface OpenAIChunkDelta {
  role?: string
  content?: string | null
  tool_calls?: OpenAIDeltaToolCall[]
}

export interface OpenAIDeltaToolCall {
  index: number
  id?: string
  type?: string
  function?: {
    name?: string
    arguments?: string
  }
}

// ============================================================================
// Error types
// ============================================================================

export interface OpenAIErrorResponse {
  error: {
    type?: string
    message?: string
    code?: string
  }
}

// ============================================================================
// Config
// ============================================================================

export interface OpenAIProviderConfig {
  baseUrl: string
  apiKey: string
  model?: string
  maxRetries?: number
}
