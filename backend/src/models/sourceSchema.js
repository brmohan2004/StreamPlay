import crypto from 'node:crypto';

export const ALLOWED_FORMATS = new Set(['mp4', 'hls', 'dash']);
export const ALLOWED_AUTH_STATUSES = new Set([
  'authorized',
  'unauthorized',
  'expired',
  'geo_restricted',
]);

export function normalizeFormat(rawFormat, playbackUrl = '') {
  const f = String(rawFormat ?? '').toLowerCase().trim();
  if (f === 'mp4' || f === 'video/mp4') return 'mp4';
  if (
    f === 'hls' ||
    f === 'm3u8' ||
    f === 'application/vnd.apple.mpegurl' ||
    f === 'application/x-mpegurl'
  ) {
    return 'hls';
  }
  if (f === 'dash' || f === 'mpd' || f === 'application/dash+xml') return 'dash';

  const lowerUrl = String(playbackUrl ?? '').toLowerCase();
  if (lowerUrl.includes('.m3u8')) return 'hls';
  if (lowerUrl.includes('.mpd')) return 'dash';
  if (lowerUrl.includes('.mp4')) return 'mp4';
  return 'unknown';
}

export function normalizeSubtitleTrack(raw, index = 0) {
  return {
    id: String(raw?.id ?? `sub-${index}`),
    language: String(raw?.language ?? 'und').trim(),
    label: String(raw?.label ?? raw?.language ?? `Subtitle ${index + 1}`).trim(),
    url: raw?.url ? String(raw.url).trim() : null,
    format: String(raw?.format ?? 'vtt').toLowerCase().trim(),
    isDefault: Boolean(raw?.isDefault),
    isExternal: raw?.isExternal !== false,
  };
}

export function normalizeAudioTrack(raw, index = 0) {
  return {
    id: String(raw?.id ?? `audio-${index}`),
    language: String(raw?.language ?? 'und').trim(),
    label: String(raw?.label ?? raw?.language ?? `Audio ${index + 1}`).trim(),
    channels: raw?.channels ? String(raw.channels).trim() : null,
    codec: raw?.codec ? String(raw.codec).trim() : null,
    bitrateKbps: Number.isFinite(Number(raw?.bitrateKbps))
      ? Number(raw.bitrateKbps)
      : null,
    isDefault: Boolean(raw?.isDefault),
  };
}

export function computeSourceId({ providerId, contentId, format, quality, playbackUrl, season, episode }) {
  const material = [
    providerId,
    contentId,
    format,
    quality,
    playbackUrl,
    season ?? '',
    episode ?? '',
  ].join('|');
  return crypto.createHash('sha256').update(material).digest('hex').slice(0, 24);
}

export function normalizeSource(raw, context = {}) {
  const providerId = String(raw?.providerId ?? context.providerId ?? '').trim();
  const providerName = String(raw?.providerName ?? context.providerName ?? 'Authorized Provider').trim();
  const contentId = String(raw?.contentId ?? context.contentId ?? '').trim();
  const mediaType = String(raw?.mediaType ?? context.mediaType ?? 'movie').toLowerCase().trim();
  const playbackUrl = String(raw?.playbackUrl ?? '').trim();
  const format = normalizeFormat(raw?.format, playbackUrl);
  const quality = String(raw?.quality ?? 'HD').trim();

  const subtitles = Array.isArray(raw?.subtitles)
    ? raw.subtitles.map((s, i) => normalizeSubtitleTrack(s, i))
    : [];

  const audioTracks = Array.isArray(raw?.audioTracks)
    ? raw.audioTracks.map((a, i) => normalizeAudioTrack(a, i))
    : [];

  const audioLanguages = Array.isArray(raw?.audioLanguages) && raw.audioLanguages.length > 0
    ? [...new Set(raw.audioLanguages.map((l) => String(l).trim()).filter(Boolean))]
    : [...new Set(audioTracks.map((a) => a.label || a.language).filter(Boolean))];

  const subtitleLanguages = Array.isArray(raw?.subtitleLanguages) && raw.subtitleLanguages.length > 0
    ? [...new Set(raw.subtitleLanguages.map((l) => String(l).trim()).filter(Boolean))]
    : [...new Set(subtitles.map((s) => s.label || s.language).filter(Boolean))];

  let expiresAtIso;
  if (raw?.expiresAt) {
    const d = new Date(raw.expiresAt);
    expiresAtIso = Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
  } else {
    const ttlSeconds = Number.isFinite(Number(raw?.ttlSeconds)) && Number(raw.ttlSeconds) > 0
      ? Number(raw.ttlSeconds)
      : 3600;
    expiresAtIso = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  }

  const rawAuth = String(raw?.authorizationStatus ?? 'unauthorized').toLowerCase().trim();
  const authorizationStatus = ALLOWED_AUTH_STATUSES.has(rawAuth) ? rawAuth : 'unauthorized';

  const headers = {};
  if (raw?.headers && typeof raw.headers === 'object' && !Array.isArray(raw.headers)) {
    for (const [k, v] of Object.entries(raw.headers)) {
      if (k && v !== undefined && v !== null) {
        headers[String(k)] = String(v);
      }
    }
  }

  const season = raw?.season !== undefined && raw?.season !== null ? Number(raw.season) : (context.season ?? null);
  const episode = raw?.episode !== undefined && raw?.episode !== null ? Number(raw.episode) : (context.episode ?? null);

  const sourceId = raw?.sourceId
    ? String(raw.sourceId).trim()
    : computeSourceId({ providerId, contentId, format, quality, playbackUrl, season, episode });

  return {
    sourceId,
    providerId,
    providerName,
    contentId,
    mediaType,
    playbackUrl,
    format,
    quality,
    audioLanguages,
    subtitleLanguages,
    audioTracks,
    subtitles,
    expiresAt: expiresAtIso,
    authorizationStatus,
    headers,
    licenseType: raw?.licenseType ? String(raw.licenseType).trim() : null,
    season: Number.isFinite(season) ? season : null,
    episode: Number.isFinite(episode) ? episode : null,
  };
}
