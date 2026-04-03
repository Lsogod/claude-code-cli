import * as React from 'react'
import { useEffect, useState } from 'react'
import { Box, Text } from '../../ink.js'
import { useAppState } from '../../state/AppState.js'
import { truncate } from '../../utils/format.js'
import { getEffortSuffix } from '../../utils/effort.js'
import { getLogoDisplayData } from '../../utils/logoV2Utils.js'
import { renderModelSetting } from '../../utils/model/model.js'
import { getAPIProvider } from '../../utils/model/providers.js'
import { refreshCodexUsageCache } from '../../services/codex/auth.js'
import { OffscreenFreeze } from '../OffscreenFreeze.js'
import { useMainLoopModel } from '../../hooks/useMainLoopModel.js'
import {
  GuestPassesUpsell,
  incrementGuestPassesSeenCount,
  useShowGuestPassesUpsell,
} from './GuestPassesUpsell.js'
import {
  incrementOverageCreditUpsellSeenCount,
  OverageCreditUpsell,
  useShowOverageCreditUpsell,
} from './OverageCreditUpsell.js'

const SUBTLE_COLOR = 'ansi256(243)'
const F = '\x1b[38;2;255;85;60m'
const B = '\x1b[48;2;255;85;60m'
const E = '\x1b[48;2;255;85;60m\x1b[30m'
const R = '\x1b[0m'
const ART_LINES = [
  `  ${B}          ${R}`,
  ` ${F}▄${R}${B}  ${R} ${B}    ${R} ${B}  ${R}${F}▄${R}`,
  ` ${F}▀${R}${B}    ${E}▄▄${B}    ${R}${F}▀${R}`,
  `   ${F}▀ ▀  ▀ ▀${R}`,
]

export function CondensedLogo(): React.ReactNode {
  const effortValue = useAppState(s => s.effortValue)
  const [displayData, setDisplayData] = useState(() => getLogoDisplayData())
  const { version, cwd, billingType, accountLabel } = displayData
  const model = useMainLoopModel()
  const showGuestPassesUpsell = useShowGuestPassesUpsell()
  const showOverageCreditUpsell = useShowOverageCreditUpsell()
  const modelLabel = `${renderModelSetting(model)}${getEffortSuffix(
    model,
    effortValue,
  )}`
  const modelAndBilling = truncate(`${modelLabel} · ${billingType}`, 36)
  const cwdLabel = truncate(cwd, 36)
  const accountLine = accountLabel ? truncate(accountLabel, 36) : null

  useEffect(() => {
    if (showGuestPassesUpsell) {
      incrementGuestPassesSeenCount()
    }
  }, [showGuestPassesUpsell])

  useEffect(() => {
    if (showOverageCreditUpsell && !showGuestPassesUpsell) {
      incrementOverageCreditUpsellSeenCount()
    }
  }, [showGuestPassesUpsell, showOverageCreditUpsell])

  useEffect(() => {
    if (getAPIProvider() !== 'codex') {
      return
    }

    let cancelled = false
    refreshCodexUsageCache()
      .then(() => {
        if (!cancelled) {
          setDisplayData(getLogoDisplayData())
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <OffscreenFreeze>
      <Box flexDirection="row" gap={3} alignItems="flex-start">
        <Box flexDirection="column">
          {ART_LINES.map(line => (
            <Text key={line}>
              {line}
            </Text>
          ))}
        </Box>
        <Box flexDirection="column">
          <Text>
            <Text bold>One Claw</Text>{' '}
            <Text color={SUBTLE_COLOR}>v{version}</Text>
          </Text>
          <Text color={SUBTLE_COLOR}>{modelAndBilling}</Text>
          <Text color={SUBTLE_COLOR}>{cwdLabel}</Text>
          {accountLine ? <Text color={SUBTLE_COLOR}>{accountLine}</Text> : null}
          {showGuestPassesUpsell ? <GuestPassesUpsell /> : null}
          {!showGuestPassesUpsell && showOverageCreditUpsell ? (
            <OverageCreditUpsell maxWidth={36} twoLine />
          ) : null}
        </Box>
      </Box>
    </OffscreenFreeze>
  )
}
