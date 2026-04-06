import type { CallToolResult, ToolAnnotations } from '@modelcontextprotocol/sdk/types.js'

export type AnyZodRawShape = Record<string, unknown>

export type InferShape<_Schema> = Record<string, unknown>

export type EffortLevel = 'low' | 'medium' | 'high' | 'max'

export type Options = Record<string, unknown>

export type InternalOptions = Options & Record<string, unknown>

export interface Query extends AsyncGenerator<Record<string, unknown>, void> {}

export interface InternalQuery
  extends AsyncGenerator<Record<string, unknown>, void> {}

export type SessionMutationOptions = {
  dir?: string
  [key: string]: unknown
}

export type ForkSessionOptions = SessionMutationOptions & {
  [key: string]: unknown
}

export type ForkSessionResult = {
  sessionId?: string
  [key: string]: unknown
}

export type GetSessionInfoOptions = {
  dir?: string
}

export type GetSessionMessagesOptions = {
  dir?: string
  limit?: number
  offset?: number
  includeSystemMessages?: boolean
}

export type ListSessionsOptions = {
  dir?: string
  limit?: number
  offset?: number
}

export type SessionMessage = Record<string, unknown>

export type SDKSessionOptions = {
  model: string
  [key: string]: unknown
}

export interface SDKSession {
  id?: string
  [key: string]: unknown
}

export type McpSdkServerConfigWithInstance = {
  type?: string
  name?: string
  instance?: unknown
  [key: string]: unknown
}

export type SdkMcpToolDefinition<Schema extends AnyZodRawShape = AnyZodRawShape> = {
  name: string
  description: string
  inputSchema: Schema
  annotations?: ToolAnnotations
  searchHint?: string
  alwaysLoad?: boolean
  handler: (
    args: InferShape<Schema>,
    extra: unknown,
  ) => Promise<CallToolResult>
}
