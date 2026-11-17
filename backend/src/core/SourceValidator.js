import net from 'node:net';
import { ALLOWED_FORMATS } from '../models/sourceSchema.js';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  '0.0.0.0',
  '::1',
  '[::1]',
  'metadata.google.internal',
]);

const EMBED_WEBPAGE_PATTERNS = [
  /\.html?($|\?)/i,
  /\/embed\//i,
  /\/iframe\//i,
  /youtube\.com\/watch/i,
  /youtu\.be\//i,
  /vimeo\.com\/\d+/i,
];

function isPrivateIpv4(ip) {
  const parts = ip.split('.').map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function isPrivateIpv6(ip) {
  const normalized = ip.toLowerCase().replace(/^\[|\]$/g, '');
  return (
    normalized === '::1' ||
    normalized === '::' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80') ||
    normalized.startsWith('::ffff:127.') ||
    normalized.startsWith('::ffff:10.') ||
    normalized.startsWith('::ffff:192.168.')
  );
}

export function isSafePublicHttpsUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { ok: false, reason: 'URL is missing.' };
  }

  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { ok: false, reason: 'URL is malformed.' };
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, reason: 'Only HTTPS stream URLs are permitted.' };
  }

  const host = parsed.hostname.toLowerCase();
  if (!host || BLOCKED_HOSTNAMES.has(host) || host.endsWith('.local') || host.endsWith('.internal')) {
    return { ok: false, reason: 'Host is restricted.' };
  }

  const ipVersion = net.isIP(host.replace(/^\[|\]$/g, ''));
  if (ipVersion === 4 && isPrivateIpv4(host)) {
    return { ok: false, reason: 'Private IPv4 stream targets are prohibited.' };
  }
  if (ipVersion === 6 && isPrivateIpv6(host)) {
    return { ok: false, reason: 'Private IPv6 stream targets are prohibited.' };
  }

  return { ok: true, url: parsed };
}

export class SourceValidator {
  constructor({
    validateUpstreamHead = false,
    upstreamHeadTimeoutMs = 4000,
    fetchImpl = globalThis.fetch,
  } = {}) {
    this.validateUpstreamHead = Boolean(validateUpstreamHead);
    this.upstreamHeadTimeoutMs = Number(upstreamHeadTimeoutMs);
    this.fetchImpl = fetchImpl;
  }

  async validate(source, { checkUpstream = this.validateUpstreamHead } = {}) {
    const errors = [];

    if (!source || typeof source !== 'object') {
      return { valid: false, errors: ['Source payload is empty.'] };
    }

    if (!source.providerId) errors.push('Missing providerId.');
    if (!source.contentId) errors.push('Missing contentId.');

    if (source.authorizationStatus !== 'authorized') {
      errors.push(`Source is not authorized (status: ${source.authorizationStatus}).`);
    }

    if (!ALLOWED_FORMATS.has(source.format)) {
      errors.push(`Unsupported direct stream format: ${source.format}.`);
    }

    const urlCheck = isSafePublicHttpsUrl(source.playbackUrl);
    if (!urlCheck.ok) {
      errors.push(urlCheck.reason);
    } else if (EMBED_WEBPAGE_PATTERNS.some((pattern) => pattern.test(source.playbackUrl))) {
      errors.push('Embedded webpage or iframe URLs are not permitted for direct playback.');
    }

    const expiresAtMs = Date.parse(source.expiresAt ?? '');
    if (Number.isNaN(expiresAtMs) || expiresAtMs <= Date.now()) {
      errors.push('Source playback URL has expired.');
    }

    if (Array.isArray(source.subtitles)) {
      for (const sub of source.subtitles) {
        if (sub.isExternal && sub.url) {
          const subUrlCheck = isSafePublicHttpsUrl(sub.url);
          if (!subUrlCheck.ok) {
            errors.push(`Invalid subtitle URL (${sub.id}): ${subUrlCheck.reason}`);
          }
        }
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    if (checkUpstream && typeof this.fetchImpl === 'function') {
      const upstream = await this._probeUpstream(source);
      if (!upstream.ok) {
        return { valid: false, errors: [upstream.reason] };
      }
    }

    return { valid: true, errors: [] };
  }

  async _probeUpstream(source) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.upstreamHeadTimeoutMs);
    try {
      const response = await this.fetchImpl(source.playbackUrl, {
        method: 'HEAD',
        redirect: 'follow',
        headers: source.headers ?? {},
        signal: controller.signal,
      });

      if (!response.ok && response.status !== 405) {
        return { ok: false, reason: `Upstream returned HTTP ${response.status}.` };
      }

      const contentType = String(response.headers?.get?.('content-type') ?? '').toLowerCase();
      if (contentType.includes('text/html')) {
        return { ok: false, reason: 'Upstream returned HTML webpage instead of direct media.' };
      }

      return { ok: true };
    } catch (err) {
      return { ok: false, reason: `Upstream check failed: ${err?.message ?? 'network error'}` };
    } finally {
      clearTimeout(timer);
    }
  }
}
