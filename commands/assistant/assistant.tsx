import os from 'os'
import path from 'path'
import React, { useEffect } from 'react'
import { Box, Text } from '../../ink.js'
import type {
  LocalJSXCommandCall,
  LocalJSXCommandOnDone,
} from '../../types/command.js'

export async function computeDefaultInstallDir(): Promise<string> {
  return path.join(os.homedir(), '.claude-assistant')
}

export function NewInstallWizard(props: {
  defaultDir: string
  onInstalled: (dir: string) => void
  onCancel: () => void
  onError: (message: string) => void
}): React.ReactNode {
  useEffect(() => {
    props.onCancel()
  }, [props])

  return (
    <Box flexDirection="column">
      <Text>
        Assistant installation is unavailable in this reconstructed external
        build.
      </Text>
    </Box>
  )
}

export const call: LocalJSXCommandCall = async (
  onDone: LocalJSXCommandOnDone,
): Promise<React.ReactNode> => {
  onDone(
    'The assistant command is unavailable in this reconstructed external build.',
    { display: 'system' },
  )
  return null
}
