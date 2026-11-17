import { ProviderAdapter } from '../core/ProviderAdapter.js';
import { isSafePublicHttpsUrl } from '../core/SourceValidator.js';

const ARCHIVE_SEARCH_URL = 'https://archive.org/advancedsearch.php';
const ARCHIVE_META_BASE = 'https://archive.org/metadata';
const ARCHIVE_DOWNLOAD_BASE = 'https://archive.org/download';

const PUBLIC_MOVIE_COLLECTIONS = [
  'feature_films',
  'opensource_movies',
  'classic_tv',
  'television',
  'sci_fi_horror',
  'film_noir',
  'comedy_films',
  'animationandcartoons',
  'silent_films',
  'prelinger',
];

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

function isAuthorizedPublicLicense(metadata) {
  const license = String(metadata?.licenseurl ?? '').toLowerCase();
  const rights = String(metadata?.rights ?? '').toLowerCase();
  const collections = Array.isArray(metadata?.collection)
    ? metadata.collection.map((c) => String(c).toLowerCase())
    : [String(metadata?.collection ?? '').toLowerCase()];
  const itemYear = Number.parseInt(String(metadata?.year ?? metadata?.date ?? ''), 10);

  // 1. Explicit Creative Commons or Public Domain license URI
  if (
    license.includes('creativecommons.org/licenses/') ||
    license.includes('creativecommons.org/publicdomain/') ||
    license.includes('publicdomain') ||
    rights.includes('public domain')
  ) {
    return true;
  }

  // 2. Classic curated public-domain collections only when clearly pre-1978 or explicitly marked PD
  const classicPdCollections = ['feature_films', 'classic_tv', 'film_noir', 'silent_films', 'prelinger'];
  if (collections.some((c) => classicPdCollections.includes(c))) {
    if (Number.isFinite(itemYear) && itemYear > 1900 && itemYear <= 1978) {
      return true;
    }
  }

  return false;
}

function detectFormatFromFileName(fileName) {
  const lower = String(fileName ?? '').toLowerCase();
  if (lower.endsWith('.m3u8')) return 'hls';
  if (lower.endsWith('.mpd')) return 'dash';
  if (lower.endsWith('.mp4')) return 'mp4';
  return null;
}

/**
 * Authorized Provider #1: Internet Archive Dynamic Public-Domain & Creative Commons Resolver
 * Dynamically discovers real, legally authorized video streams and subtitles from archive.org
 * matching whichever movie or TV series episode the user clicked (zero hardcoded video URLs).
 */
export class ArchiveOrgProviderAdapter extends ProviderAdapter {
  constructor({ enabled = true, priority = 10, fetchImpl = globalThis.fetch, requestTimeoutMs = 7000 } = {}) {
    super({
      id: 'archive-org-public',
      name: 'Internet Archive (Public Domain)',
      description: 'Dynamic public-domain & Creative Commons movie and classic TV discovery via archive.org',
      priority,
      enabled,
      supportedFormats: ['mp4', 'hls', 'dash'],
    });
    this.fetchImpl = fetchImpl;
    this.requestTimeoutMs = Number(requestTimeoutMs);
  }

  async _fetchJson(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    try {
      const response = await this.fetchImpl(url, {
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

  async searchContent(query, { year, mediaType = 'movie', season, episode } = {}) {
    const cleanTitle = normalizeTitle(query);
    if (!cleanTitle || cleanTitle.length < 2) return [];

    const safePhrase = cleanTitle.replace(/"/g, '');
    const collectionClause = `collection:(${PUBLIC_MOVIE_COLLECTIONS.join(' OR ')})`;
    const qParts = [
      `title:("${safePhrase}")`,
      'mediatype:(movies)',
      collectionClause,
    ];

    if (mediaType === 'series' && season && episode) {
      const sPad = String(season).padStart(2, '0');
      const ePad = String(episode).padStart(2, '0');
      qParts.push(`(title:(S${sPad}E${ePad}) OR title:("Episode ${episode}") OR title:("${safePhrase}"))`);
    } else if (year && Number.isFinite(Number(year))) {
      qParts.push(`year:${Number(year)}`);
    }

    const params = new URLSearchParams({
      q: qParts.join(' AND '),
      'fl[]': 'identifier,title,year,licenseurl,downloads',
      'sort[]': 'downloads desc',
      rows: '6',
      page: '1',
      output: 'json',
    });

    const data = await this._fetchJson(`${ARCHIVE_SEARCH_URL}?${params.toString()}`);
    let docs = data?.response?.docs;

    // If strict year filter returned 0 hits, retry without year constraint (still requiring exact title match)
    if ((!Array.isArray(docs) || docs.length === 0) && year) {
      const fallbackParams = new URLSearchParams({
        q: [`title:("${safePhrase}")`, 'mediatype:(movies)', collectionClause].join(' AND '),
        'fl[]': 'identifier,title,year,licenseurl,downloads',
        'sort[]': 'downloads desc',
        rows: '6',
        page: '1',
        output: 'json',
      });
      const fallbackData = await this._fetchJson(`${ARCHIVE_SEARCH_URL}?${fallbackParams.toString()}`);
      docs = fallbackData?.response?.docs;
    }

    if (!Array.isArray(docs)) return [];

    return docs
      .filter((doc) => {
        const docTitle = normalizeTitle(doc.title);
        return (
          docTitle === cleanTitle ||
          docTitle.startsWith(`${cleanTitle} `) ||
          docTitle.endsWith(` ${cleanTitle}`)
        );
      })
      .map((doc) => ({
        providerId: this.id,
        identifier: String(doc.identifier),
        title: String(doc.title ?? ''),
        year: doc.year ? Number(doc.year) : null,
        licenseUrl: doc.licenseurl ? String(doc.licenseurl) : null,
      }));
  }

  async getSources(request) {
    if (!request.title || String(request.title).trim().length < 2) {
      return [];
    }

    const matches = await this.searchContent(request.title, {
      year: request.year,
      mediaType: request.mediaType,
      season: request.season,
      episode: request.episode,
    });
    if (matches.length === 0) return [];

    const results = [];
    for (const candidate of matches.slice(0, 2)) {
      const meta = await this._fetchJson(
        `${ARCHIVE_META_BASE}/${encodeURIComponent(candidate.identifier)}`
      );
      if (!meta || !Array.isArray(meta.files)) continue;
      if (!isAuthorizedPublicLicense(meta.metadata)) continue;

      const subtitleTracks = this._extractSubtitles(candidate.identifier, meta.files);
      const streamFiles = meta.files
        .filter((f) => {
          const name = String(f.name ?? '');
          const lower = name.toLowerCase();
          const fmt = detectFormatFromFileName(name);
          if (!fmt) return false;
          if (fmt === 'mp4') {
            if (lower.includes('_512kb') || String(f.format ?? '').toLowerCase().includes('512kb')) {
              return false;
            }
            if (Number(f.size ?? 0) < 1_000_000) return false;
          }
          return true;
        })
        .sort((a, b) => Number(b.height ?? 0) - Number(a.height ?? 0))
        .slice(0, 3);

      if (streamFiles.length === 0) continue;

      const language = meta.metadata?.language
        ? String(Array.isArray(meta.metadata.language) ? meta.metadata.language[0] : meta.metadata.language)
        : 'English';

      for (const file of streamFiles) {
        const format = detectFormatFromFileName(file.name);
        const encodedName = String(file.name)
          .split('/')
          .map((seg) => encodeURIComponent(seg))
          .join('/');
        const playbackUrl = `${ARCHIVE_DOWNLOAD_BASE}/${encodeURIComponent(candidate.identifier)}/${encodedName}`;
        const quality = guessQualityFromHeight(file.height);

        results.push({
          providerId: this.id,
          providerName: this.name,
          contentId: request.contentId,
          mediaType: request.mediaType ?? 'movie',
          playbackUrl,
          format,
          quality,
          audioLanguages: [language],
          subtitleLanguages: subtitleTracks.map((s) => s.label),
          audioTracks: [
            {
              id: `archive-${candidate.identifier}-main`,
              language: language.slice(0, 2).toLowerCase(),
              label: language,
              channels: '2.0',
              codec: 'AAC',
              isDefault: true,
            },
          ],
          subtitles: subtitleTracks,
          expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
          authorizationStatus: 'authorized',
          licenseType: meta.metadata?.licenseurl || 'Public Domain / Internet Archive',
          season: request.season ?? null,
          episode: request.episode ?? null,
        });
      }

      if (results.length > 0) break;
    }

    return results;
  }

  _extractSubtitles(identifier, files) {
    const subs = [];
    for (const f of files) {
      const name = String(f.name ?? '');
      const lower = name.toLowerCase();
      if (!lower.endsWith('.vtt') && !lower.endsWith('.srt')) continue;

      const format = lower.endsWith('.vtt') ? 'vtt' : 'srt';
      const encodedName = name
        .split('/')
        .map((seg) => encodeURIComponent(seg))
        .join('/');
      subs.push({
        id: `archive-sub-${subs.length}`,
        language: 'en',
        label: name.replace(/\.(vtt|srt)$/i, ''),
        url: `${ARCHIVE_DOWNLOAD_BASE}/${encodeURIComponent(identifier)}/${encodedName}`,
        format,
        isDefault: subs.length === 0,
        isExternal: true,
      });
    }
    return subs.slice(0, 8);
  }

  async validateSource(source) {
    const urlCheck = isSafePublicHttpsUrl(source?.playbackUrl);
    if (!urlCheck.ok) return { valid: false, reason: urlCheck.reason };
    const host = urlCheck.url.hostname.toLowerCase();
    if (host !== 'archive.org' && !host.endsWith('.archive.org')) {
      return { valid: false, reason: 'Archive.org adapter only permits archive.org hosts.' };
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
