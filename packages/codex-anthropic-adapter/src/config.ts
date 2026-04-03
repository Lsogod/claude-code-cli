export function getAdapterHost(): string {
  return process.env.CODEX_ADAPTER_HOST || '127.0.0.1'
}

export function getAdapterPort(): number {
  const raw = process.env.CODEX_ADAPTER_PORT || '4317'
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 4317
}

export function getAdapterBaseUrl(): string {
  return `http://${getAdapterHost()}:${getAdapterPort()}`
}

export function getCodexAppServerUrl(): string {
  return process.env.CODEX_APP_SERVER_URL || 'ws://127.0.0.1:4318'
}

export function getAdapterApiKey(): string {
  return process.env.CODEX_ADAPTER_API_KEY || 'codex-local'
}
