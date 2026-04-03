export type SDKControlInitializeRequest = {
  subtype: 'initialize'
  [key: string]: unknown
}

export type SDKControlInitializeResponse = {
  [key: string]: unknown
}

export type SDKControlPermissionRequest = {
  subtype: 'can_use_tool'
  tool_name: string
  input: Record<string, unknown>
  tool_use_id: string
  [key: string]: unknown
}

export type SDKControlMcpSetServersResponse = {
  [key: string]: unknown
}

export type SDKControlReloadPluginsResponse = {
  [key: string]: unknown
}

export type SDKControlRequestInner =
  | SDKControlInitializeRequest
  | SDKControlPermissionRequest
  | {
      subtype: string
      [key: string]: unknown
    }

export type SDKControlRequest = {
  type: 'control_request'
  request_id: string
  request: SDKControlRequestInner
}

export type SDKControlResponse = {
  type: 'control_response'
  response: {
    subtype?: string
    request_id?: string
    response?: Record<string, unknown>
    error?: string
    [key: string]: unknown
  }
}

export type SDKControlCancelRequest = {
  type: 'control_cancel_request'
  request_id: string
}

export type SDKPartialAssistantMessage = {
  type: 'stream_event'
  event?: unknown
  parent_tool_use_id?: string | null
  uuid?: string
  session_id?: string
  [key: string]: unknown
}

export type StdoutMessage =
  | SDKControlResponse
  | SDKControlRequest
  | SDKControlCancelRequest
  | SDKPartialAssistantMessage
  | Record<string, unknown>

export type StdinMessage =
  | SDKControlRequest
  | SDKControlResponse
  | Record<string, unknown>
