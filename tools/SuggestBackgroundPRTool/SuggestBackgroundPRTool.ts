import { z } from 'zod/v4'
import { buildTool } from '../../Tool.js'
import type { PermissionResult } from '../../types/permissions.js'

const inputSchema = z.object({}).passthrough()

export const SUGGEST_BACKGROUND_PR_TOOL_NAME = 'SuggestBackgroundPR'

export const SuggestBackgroundPRTool = buildTool({
  name: SUGGEST_BACKGROUND_PR_TOOL_NAME,
  async description() {
    return 'Unavailable in the reconstructed external build'
  },
  async prompt() {
    return 'This tool is unavailable in the reconstructed external build.'
  },
  get inputSchema() {
    return inputSchema
  },
  isEnabled() {
    return false
  },
  isConcurrencySafe() {
    return true
  },
  isReadOnly() {
    return true
  },
  async call() {
    return {
      data: 'Background PR suggestions are unavailable in this build.',
    }
  },
  async checkPermissions(input): Promise<PermissionResult> {
    return {
      behavior: 'allow',
      updatedInput: input,
    }
  },
})
