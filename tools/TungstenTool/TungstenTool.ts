import type { Tool } from '../../Tool.js'

export const TungstenTool = {
  name: 'Tungsten',
  async description() {
    return 'Unavailable in this reconstructed build.'
  },
  prompt: 'Unavailable in this reconstructed build.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  userFacingName() {
    return 'Tungsten'
  },
  isEnabled() {
    return false
  },
  isReadOnly() {
    return true
  },
  async needsPermissions() {
    return false
  },
  async call() {
    return {
      data: 'Tungsten is unavailable in this reconstructed build.',
    }
  },
} as unknown as Tool
