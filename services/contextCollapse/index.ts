import type { Message } from '../../types/message.js'

type ContextCollapseHealth = {
  totalSpawns: number
  totalErrors: number
  totalEmptySpawns: number
  emptySpawnWarningEmitted: boolean
  lastError?: string
}

type ContextCollapseStats = {
  collapsedSpans: number
  stagedSpans: number
  collapsedMessages: number
  health: ContextCollapseHealth
}

const EMPTY_STATS: ContextCollapseStats = {
  collapsedSpans: 0,
  stagedSpans: 0,
  collapsedMessages: 0,
  health: {
    totalSpawns: 0,
    totalErrors: 0,
    totalEmptySpawns: 0,
    emptySpawnWarningEmitted: false,
    lastError: undefined,
  },
}

const listeners = new Set<() => void>()

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function emit(): void {
  for (const listener of listeners) {
    listener()
  }
}

export function getStats(): ContextCollapseStats {
  return EMPTY_STATS
}

export function isContextCollapseEnabled(): boolean {
  return false
}

export async function applyCollapsesIfNeeded(
  messages: Message[],
): Promise<{ messages: Message[] }> {
  return { messages }
}

export function recoverFromOverflow(
  messages: Message[],
): { messages: Message[]; committed: number } {
  return {
    messages,
    committed: 0,
  }
}

export function isWithheldPromptTooLong(): boolean {
  return false
}

export function resetContextCollapse(): void {
  emit()
}
