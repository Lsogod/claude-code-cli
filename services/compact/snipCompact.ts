import type { Message } from '../../types/message.js'

export const SNIP_NUDGE_TEXT =
  'Context efficiency helpers are unavailable in this reconstructed external build.'

export function isSnipRuntimeEnabled(): boolean {
  return false
}

export function snipCompactIfNeeded(
  messages: Message[],
  _options?: { force?: boolean },
): {
  messages: Message[]
  tokensFreed: number
  boundaryMessage?: undefined
} {
  return {
    messages,
    tokensFreed: 0,
  }
}

export function shouldNudgeForSnips(_messages: Message[]): boolean {
  return false
}

export function isSnipMarkerMessage(_message: Message): boolean {
  return false
}
