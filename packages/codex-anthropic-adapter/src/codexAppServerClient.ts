import { randomUUID } from 'crypto'
import WebSocket from 'ws'

type JsonRpcRequest = {
  id: string
  method: string
  params?: unknown
}

type JsonRpcNotification = {
  method: string
  params?: unknown
}

type JsonRpcResponse = {
  id: string
  result?: unknown
  error?: {
    code?: number
    message?: string
    data?: unknown
  }
}

type JsonRpcServerRequest = JsonRpcRequest

type JsonRpcMessage =
  | JsonRpcServerRequest
  | JsonRpcNotification
  | JsonRpcResponse

type NotificationListener = (message: JsonRpcNotification) => void
type ServerRequestListener = (message: JsonRpcServerRequest) => void

export class CodexAppServerClient {
  private readonly url: string
  private ws: WebSocket | null = null
  private initialized = false
  private readonly pending = new Map<
    string,
    {
      resolve: (value: unknown) => void
      reject: (reason?: unknown) => void
    }
  >()
  private readonly notificationListeners = new Set<NotificationListener>()
  private readonly serverRequestListeners = new Set<ServerRequestListener>()

  constructor(url: string) {
    this.url = url
  }

  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return
    }

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(this.url)
      this.ws = ws
      let settled = false

      const fail = (error: unknown) => {
        if (settled) {
          return
        }
        settled = true
        reject(error)
      }

      ws.once('open', () => {
        if (settled) {
          return
        }
        settled = true
        resolve()
      })
      ws.on('error', error => {
        fail(error)
      })
      ws.on('message', data => {
        this.handleMessage(data.toString())
      })
      ws.on('close', () => {
        this.initialized = false
        this.ws = null
        for (const pending of this.pending.values()) {
          pending.reject(new Error('codex app-server connection closed'))
        }
        this.pending.clear()
      })
    })
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }
    await this.connect()
    await this.request('initialize', {
      clientInfo: {
        name: 'claude-code-codex-adapter',
        version: '0.1.0',
      },
      capabilities: {
        experimentalApi: true,
      },
    })
    await this.notify('initialized')
    this.initialized = true
  }

  async ensureInitialized(): Promise<void> {
    await this.initialize()
  }

  async request<T = unknown>(method: string, params?: unknown): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect()
    }

    const id = randomUUID()
    const payload: JsonRpcRequest = { id, method, params }

    const promise = new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
    })

    this.ws!.send(JSON.stringify(payload))
    return promise
  }

  async notify(method: string, params?: unknown): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect()
    }
    const payload: JsonRpcNotification = { method, params }
    this.ws!.send(JSON.stringify(payload))
  }

  async respond(id: string, result: unknown): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect()
    }
    this.ws!.send(JSON.stringify({ id, result }))
  }

  async respondError(
    id: string,
    message: string,
    data?: unknown,
    code = -32000,
  ): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect()
    }
    this.ws!.send(
      JSON.stringify({
        id,
        error: {
          code,
          message,
          ...(data === undefined ? {} : { data }),
        },
      }),
    )
  }

  onNotification(listener: NotificationListener): () => void {
    this.notificationListeners.add(listener)
    return () => this.notificationListeners.delete(listener)
  }

  onServerRequest(listener: ServerRequestListener): () => void {
    this.serverRequestListeners.add(listener)
    return () => this.serverRequestListeners.delete(listener)
  }

  async close(): Promise<void> {
    if (!this.ws) {
      return
    }

    const ws = this.ws
    this.ws = null
    await new Promise<void>(resolve => {
      ws.once('close', () => resolve())
      ws.close()
    })
  }

  async probe(): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.initialize()
      await this.close()
      return { ok: true }
    } catch (error) {
      await this.close().catch(() => {})
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  private handleMessage(raw: string): void {
    let message: JsonRpcMessage
    try {
      message = JSON.parse(raw) as JsonRpcMessage
    } catch {
      return
    }

    if ('id' in message && ('result' in message || 'error' in message)) {
      const pending = this.pending.get(message.id)
      if (!pending) {
        return
      }
      this.pending.delete(message.id)
      if (message.error) {
        pending.reject(
          new Error(message.error.message || 'codex app-server request failed'),
        )
      } else {
        pending.resolve(message.result)
      }
      return
    }

    if ('id' in message && 'method' in message) {
      for (const listener of this.serverRequestListeners) {
        listener(message)
      }
      return
    }

    if ('method' in message) {
      for (const listener of this.notificationListeners) {
        listener(message)
      }
    }
  }
}
