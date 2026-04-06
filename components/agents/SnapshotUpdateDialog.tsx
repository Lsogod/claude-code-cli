import React, { useEffect } from 'react'
import { Box, Text } from '../../ink.js'
import type { AgentMemoryScope } from '../../tools/AgentTool/agentMemory.js'

export function SnapshotUpdateDialog(props: {
  agentType: string
  scope: AgentMemoryScope
  snapshotTimestamp: string
  onComplete: (choice: 'merge' | 'keep' | 'replace') => void
  onCancel: () => void
}): React.ReactNode {
  useEffect(() => {
    props.onCancel()
  }, [props])

  return (
    <Box flexDirection="column">
      <Text>
        Snapshot update UI is unavailable in this reconstructed external build.
      </Text>
    </Box>
  )
}
