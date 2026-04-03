import React, { useEffect } from 'react'
import { Box, Text } from '../ink.js'
import type { AssistantSession } from './sessionDiscovery.js'

export function AssistantSessionChooser(props: {
  sessions: AssistantSession[]
  onSelect: (sessionId: string) => void
  onCancel: () => void
}): React.ReactNode {
  useEffect(() => {
    props.onCancel()
  }, [props])

  return (
    <Box flexDirection="column">
      <Text>
        Assistant session picker is unavailable in this reconstructed external
        build.
      </Text>
    </Box>
  )
}
