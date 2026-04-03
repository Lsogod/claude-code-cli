import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '../../services/analytics/index.js'
import { isEnvTruthy } from '../envUtils.js'
import { getSettings_DEPRECATED } from '../settings/settings.js'

export type APIProvider =
  | 'firstParty'
  | 'bedrock'
  | 'vertex'
  | 'foundry'
  | 'codex'

export type ProviderSetting =
  | 'anthropic'
  | 'bedrock'
  | 'vertex'
  | 'foundry'
  | 'codex'

function normalizeProviderSetting(
  value: string | undefined,
): APIProvider | undefined {
  if (!value) {
    return undefined
  }

  switch (value.trim().toLowerCase()) {
    case 'anthropic':
    case 'firstparty':
    case 'first-party':
    case 'first_party':
      return 'firstParty'
    case 'bedrock':
      return 'bedrock'
    case 'vertex':
      return 'vertex'
    case 'foundry':
      return 'foundry'
    case 'codex':
      return 'codex'
    default:
      return undefined
  }
}

function getConfiguredProviderOverride(): APIProvider | undefined {
  const envProvider = normalizeProviderSetting(process.env.CLAUDE_CODE_PROVIDER)
  if (envProvider) {
    return envProvider
  }

  try {
    const settings = getSettings_DEPRECATED()
    return normalizeProviderSetting(settings?.provider)
  } catch {
    return undefined
  }
}

export function getAPIProvider(): APIProvider {
  return isEnvTruthy(process.env.CLAUDE_CODE_USE_BEDROCK)
    ? 'bedrock'
    : isEnvTruthy(process.env.CLAUDE_CODE_USE_VERTEX)
      ? 'vertex'
      : isEnvTruthy(process.env.CLAUDE_CODE_USE_FOUNDRY)
        ? 'foundry'
        : getConfiguredProviderOverride() ?? 'firstParty'
}

export function getAPIProviderForStatsig(): AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  return getAPIProvider() as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
}

export function isCodexProvider(): boolean {
  return getAPIProvider() === 'codex'
}

export function shouldUseClaudeControlPlane(): boolean {
  return getAPIProvider() === 'firstParty'
}

export function getCodexAdapterBaseUrl(): string {
  return (
    process.env.CLAUDE_CODE_CODEX_ADAPTER_BASE_URL ||
    process.env.CODEX_ADAPTER_BASE_URL ||
    'http://127.0.0.1:4317'
  )
}

export function getCodexAdapterApiKey(): string {
  return (
    process.env.CLAUDE_CODE_CODEX_ADAPTER_API_KEY ||
    process.env.CODEX_ADAPTER_API_KEY ||
    'codex-local'
  )
}

export function getAPIProviderDisplayName(
  provider: APIProvider = getAPIProvider(),
): string {
  return (
    {
      firstParty: 'Anthropic',
      bedrock: 'AWS Bedrock',
      vertex: 'Google Vertex AI',
      foundry: 'Microsoft Foundry',
      codex: 'OpenAI Codex',
    } satisfies Record<APIProvider, string>
  )[provider]
}

/**
 * Check if ANTHROPIC_BASE_URL is a first-party Anthropic API URL.
 * Returns true if not set (default API) or points to api.anthropic.com
 * (or api-staging.anthropic.com for ant users).
 */
export function isFirstPartyAnthropicBaseUrl(): boolean {
  const baseUrl = process.env.ANTHROPIC_BASE_URL
  if (!baseUrl) {
    return true
  }
  try {
    const host = new URL(baseUrl).host
    const allowedHosts = ['api.anthropic.com']
    if (process.env.USER_TYPE === 'ant') {
      allowedHosts.push('api-staging.anthropic.com')
    }
    return allowedHosts.includes(host)
  } catch {
    return false
  }
}
