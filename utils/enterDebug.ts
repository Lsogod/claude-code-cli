import fs from 'fs'

const ENTER_DEBUG_LOG = '/tmp/claude-enter-debug.log'

function isEnabled(): boolean {
  return process.env.CLAUDE_CODE_DEBUG_ENTER === '1'
}

export function clearEnterDebugLog(): void {
  if (!isEnabled()) return

  try {
    fs.writeFileSync(ENTER_DEBUG_LOG, '')
  } catch {
    // Best-effort only.
  }
}

export function logEnterDebug(source: string, payload: Record<string, unknown>): void {
  if (!isEnabled()) return

  try {
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      source,
      ...payload,
    })
    fs.appendFileSync(ENTER_DEBUG_LOG, `${line}\n`)
  } catch {
    // Best-effort only.
  }
}
