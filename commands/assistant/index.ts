import type { Command } from '../../types/command.js'

const assistantCommand = {
  type: 'local-jsx',
  name: 'assistant',
  description: 'Unavailable in the reconstructed external build',
  isEnabled: () => false,
  immediate: true,
  load: () => import('./assistant.js'),
} satisfies Command

export default assistantCommand
