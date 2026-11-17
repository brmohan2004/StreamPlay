import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

function parseBool(value, defaultValue) {
  if (value === undefined || value === null || value === '') return defaultValue;
  return String(value).toLowerCase() === 'true';
}

function parseIntSafe(value, defaultValue) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

export function loadConfig(overrides = {}) {
  const signingSecret =
    overrides.signingSecret ??
    process.env.PLAYBACK_SIGNING_SECRET ??
    crypto.randomBytes(32).toString('hex');

  return {
    port: overrides.port ?? parseIntSafe(process.env.PORT, 4100),
    host: overrides.host ?? process.env.HOST ?? '127.0.0.1',
    signingSecret,
    sessionTtlSeconds:
      overrides.sessionTtlSeconds ?? parseIntSafe(process.env.SESSION_TTL_SECONDS, 1800),
    sourceCacheTtlSeconds:
      overrides.sourceCacheTtlSeconds ?? parseIntSafe(process.env.SOURCE_CACHE_TTL_SECONDS, 300),
    providerTimeoutMs:
      overrides.providerTimeoutMs ?? parseIntSafe(process.env.PROVIDER_TIMEOUT_MS, 8000),
    validateUpstreamHead:
      overrides.validateUpstreamHead ?? parseBool(process.env.VALIDATE_UPSTREAM_HEAD, false),
    upstreamHeadTimeoutMs:
      overrides.upstreamHeadTimeoutMs ?? parseIntSafe(process.env.UPSTREAM_HEAD_TIMEOUT_MS, 4000),
    enableArchiveOrg:
      overrides.enableArchiveOrg ?? parseBool(process.env.ENABLE_ARCHIVE_ORG, true),
    enableWikimediaCommons:
      overrides.enableWikimediaCommons ?? parseBool(process.env.ENABLE_WIKIMEDIA_COMMONS, true),
    enablePartnerProvider:
      overrides.enablePartnerProvider ?? parseBool(process.env.ENABLE_PARTNER_PROVIDER, false),
    partnerProviderName:
      overrides.partnerProviderName ?? process.env.PARTNER_PROVIDER_NAME ?? 'Licensed Partner CDN',
    partnerProviderBaseUrl:
      overrides.partnerProviderBaseUrl ?? process.env.PARTNER_PROVIDER_BASE_URL ?? '',
    partnerProviderApiKey:
      overrides.partnerProviderApiKey ?? process.env.PARTNER_PROVIDER_API_KEY ?? '',
  };
}
