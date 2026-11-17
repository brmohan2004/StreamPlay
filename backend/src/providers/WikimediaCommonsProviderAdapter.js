import { ProviderAdapter } from '../core/ProviderAdapter.js';
import { isSafePublicHttpsUrl } from '../core/SourceValidator.js';

const WIKIMEDIA_API_URL = 'https://commons.wikimedia.org/w/api.php';

function normalizeTitle(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function guessQualityFromHeight(height) {
  const h = Number(height);
  if (!Number.isFinite(h) || h <= 0) return 'HD';
  if (h >= 2160) return '2160p';
  if (h >= 1080) return '1080p';
  if (h >= 720) return '720p';
  if (h >= 480) return '480p';
  return `${h}p`;
}

function isOpenWikimediaLicense(extmetadata) {
  const licenseShort = String(extmetadata?.LicenseShortName?.value ?? '').toLowerCase();
  const licenseUrl = String(extmetadata?.LicenseUrl?.value ?? '').toLowerCase();
  return (
    licenseShort.includes('public domain') ||
    licenseShort.includes('cc by') ||
    licenseShort.includes('cc0') ||
    licenseShort.includes('pd') ||
    licenseUrl.includes('creativecommons.org') ||
    licenseUrl.includes('publicdomain')
  );
}

/**
 * Authorized Provider #2: Wikimedia Commons Dynamic Open-Media Video Resolver
 * Dynamically queries the official Wikimedia Commons MediaWiki API for legally authorized
 * Public Domain / Creative Commons full-length MP4/HLS films matching the clicked title.
 */
export class WikimediaCommonsProviderAdapter extends ProviderAdapter {
  constructor({ enabled = true, priority = 20, fetchImpl = globalThis.fetch, requestTimeoutMs = 7000 } = {}) {
    super({
      id: 'wikimedia-commons-open',
      name: 'Wikimedia Commons (Open License)',
      description: 'Dynamic public-domain & Creative Commons video discovery via commons.wikimedia.org',
      priority,
      enabled,
      supportedFormats: ['mp4'],
    });
    this.fetchImpl = fetchImpl;
    this.requestTimeoutMs = Number(requestTimeoutMs);
  }

  async _fetchJson(params) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    try {
      const qs = new URLSearchParams({ format: 'json', origin: '*', ...params });
      const response = await this.fetchImpl(`${WIKIMEDIA_API_URL}?${qs.toString()}`, {
        headers: { Accept: 'application/json', 'User-Agent': 'StreamPlay-Authorized-Resolver/1.0' },
        signal: controller.signal,
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  async searchContent(query) {
    const cleanTitle = normalizeTitle(query);
    if (!cleanTitle || cleanTitle.length < 2) return [];

    const data = await this._fetchJson({
      action: 'query',
      generator: 'search',
      gsrnamespace: '6', // File: namespace
      gsrsearch: `"${cleanTitle}" filetype:video`,
      gsrlimit: '5',
      prop: 'imageinfo',
      iiprop: 'url|mime|size|dimensions|extmetadata',
    });

    const pages = data?.query?.pages;
    if (!pages || typeof pages !== 'object') return [];

    const matches = [];
    for (const page of Object.values(pages)) {
      const fileTitle = String(page.title ?? '');
      const cleanFileTitle = normalizeTitle(fileTitle.replace(/^File:/i, '').replace(/\.[a-z0-9]+$/i, ''));
      if (!cleanFileTitle.includes(cleanTitle)) continue;

      const info = Array.isArray(page.imageinfo) ? page.imageinfo[0] : null;
      if (!info || !info.url) continue;

      const mime = String(info.mime ?? '').toLowerCase();
      const url = String(info.url);
      // Require direct MP4 and open license, plus meaningful duration/file size (> 5MB) to avoid tiny clips
      if ((mime === 'video/mp4' || url.toLowerCase().endsWith('.mp4')) && Number(info.size ?? 0) >= 5_000_000) {
        if (isOpenWikimediaLicense(info.extmetadata)) {
          matches.push({
            providerId: this.id,
            fileTitle,
            url,
            height: Number(info.height ?? 0),
            duration: Number(info.duration ?? 0),
            license: String(info.extmetadata?.LicenseShortName?.value ?? 'Public Domain / CC'),
          });
        }
      }
    }

    return matches;
  }

  async getSources(request) {
    if (!request.title || String(request.title).trim().length < 2) {
      return [];
    }

    const matches = await this.searchContent(request.title);
    if (matches.length === 0) return [];

    const sources = [];
    for (const match of matches.slice(0, 2)) {
      sources.push({
        providerId: this.id,
        providerName: this.name,
        contentId: request.contentId,
        mediaType: request.mediaType ?? 'movie',
        playbackUrl: match.url,
        format: 'mp4',
        quality: guessQualityFromHeight(match.height),
        audioLanguages: ['English'],
        subtitleLanguages: [],
        audioTracks: [
          {
            id: `wikimedia-${sources.length}-main`,
            language: 'en',
            label: 'Original Audio',
            channels: '2.0',
            codec: 'AAC',
            isDefault: true,
          },
        ],
        subtitles: [],
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        authorizationStatus: 'authorized',
        licenseType: match.license,
        season: request.season ?? null,
        episode: request.episode ?? null,
      });
    }

    return sources;
  }

  async validateSource(source) {
    const check = isSafePublicHttpsUrl(source?.playbackUrl);
    if (!check.ok) return { valid: false, reason: check.reason };
    const host = check.url.hostname.toLowerCase();
    if (!host.endsWith('.wikimedia.org') && host !== 'upload.wikimedia.org') {
      return { valid: false, reason: 'Wikimedia adapter only permits wikimedia.org hosts.' };
    }
    return { valid: true };
  }

  async getSubtitles(_contentId, options = {}) {
    return Array.isArray(options?.source?.subtitles) ? options.source.subtitles : [];
  }

  async getAudioTracks(_contentId, options = {}) {
    return Array.isArray(options?.source?.audioTracks) ? options.source.audioTracks : [];
  }
}
