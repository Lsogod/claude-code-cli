import { z } from 'zod/v4'
import { buildTool } from '../../Tool.js'
import type { PermissionResult } from '../../types/permissions.js'
import { VERIFY_PLAN_EXECUTION_TOOL_NAME } from './constants.js'

const inputSchema = z.object({}).passthrough()

export const VerifyPlanExecutionTool = buildTool({
  name: VERIFY_PLAN_EXECUTION_TOOL_NAME,
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
      data: 'Plan verification is unavailable in this build.',
    }
  },
  async checkPermissions(input): Promise<PermissionResult> {
    return {
      behavior: 'allow',
      updatedInput: input,
    }
  },
})
