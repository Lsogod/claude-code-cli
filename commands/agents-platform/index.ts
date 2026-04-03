import type { Command } from '../../types/command.js'

const agentsPlatform = {
  type: 'local',
  name: 'agents-platform',
  description: 'Unavailable in the reconstructed external build',
  supportsNonInteractive: true,
  isEnabled: () => false,
  load: async () => ({
    async call() {
      return {
        type: 'text' as const,
        value:
          'The agents-platform command is unavailable in this reconstructed external build.',
      }
    },
  }),
} satisfies Command

export default agentsPlatform
