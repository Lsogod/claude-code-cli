export type ModifierKey = 'shift' | 'command' | 'control' | 'option'

let prewarmed = false

/**
 * Pre-warm the native module by loading it in advance.
 * Call this early to avoid delay on first use.
 */
export function prewarmModifiers(): void {
  if (prewarmed || process.platform !== 'darwin') {
    return
  }
  prewarmed = true
  // Load module in background
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('modifiers-napi') as { prewarm?: () => void }
    mod.prewarm?.()
  } catch {
    // Ignore errors during prewarm
  }
}

/**
 * Check if a specific modifier key is currently pressed (synchronous).
 */
export function isModifierPressed(modifier: ModifierKey): boolean {
  if (process.platform !== 'darwin') {
    return false
  }
  try {
    // Dynamic import to avoid loading native module at top level.
    // Some external environments install the reserved placeholder package
    // instead of the native addon, so fail closed to "not pressed".
    const mod =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('modifiers-napi') as { isModifierPressed?: (m: string) => boolean }
    return mod.isModifierPressed?.(modifier) ?? false
  } catch {
    return false
  }
}
