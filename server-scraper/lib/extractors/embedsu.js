// server-scraper/lib/extractors/embedsu.js
import { BaseExtractor, extractSubtitlesFromText } from './base.js';
import { fetchText } from '../httpClient.js';

export class EmbedSuExtractor extends BaseExtractor {
  constructor() {
    super('EmbedSu');
  }

  canExtract(url) {
    return /embed\.su|autoembed|multiembed|vidsrc\.cc|vidlink/i.test(url);
  }

  async extract(embedUrl, referer) {
    const origin = (() => {
      try { return new URL(embedUrl).origin; } catch { return 'https://embed.su'; }
    })();

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': referer || `${origin}/`,
      'Origin': origin
    };

    const videoSources = [];
    const subtitles = [];

    try {
      const res = await fetchText(embedUrl, { referer: headers.Referer, timeout: 4000 });
      const html = res.body || '';

      // 1. Direct .m3u8 search
      const m3u8Matches = html.match(/https?:\/\/[^"'`\s<>]+\.m3u8[^"'`\s<>]*/gi);
      if (m3u8Matches) {
        for (const u of m3u8Matches) {
          videoSources.push({ quality: 'Auto (Adaptive)', url: u.replace(/[),;\\"]+$/, '') });
        }
      }

      // 2. Decode base64 or JSON API endpoints if present
      const apiMatches = html.match(/["'](\/api\/[a-zA-Z0-9_\-\/]+)["']/gi);
      if (apiMatches) {
        for (const m of apiMatches) {
          const apiPath = m.replace(/["']/g, '');
          const apiUrl = new URL(apiPath, origin).toString();
          try {
            const apiRes = await fetchText(apiUrl, { referer: embedUrl, headers });
            const json = JSON.parse(apiRes.body || '{}');
            if (Array.isArray(json.sources)) {
              for (const s of json.sources) {
                if (s.file || s.url) videoSources.push({ quality: s.quality || 'Auto', url: s.file || s.url });
              }
            }
          } catch {}
        }
      }

      subtitles.push(...extractSubtitlesFromText(html, embedUrl));
    } catch (err) {
      console.warn('[EmbedSuExtractor] Extraction warning:', err.message);
    }

    return {
      success: videoSources.length > 0,
      videoSources,
      audioTracks: [],
      subtitles,
      headers
    };
  }
}
