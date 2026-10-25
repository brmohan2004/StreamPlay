// server-scraper/lib/extractors/filemoon.js
import { BaseExtractor, unpackJs, extractSubtitlesFromText } from './base.js';
import { fetchText } from '../httpClient.js';

export class FileMoonExtractor extends BaseExtractor {
  constructor() {
    super('FileMoon');
  }

  canExtract(url) {
    return /filemoon|moonplayer|fmoon|fplayer/i.test(url);
  }

  async extract(embedUrl, referer) {
    const origin = (() => {
      try { return new URL(embedUrl).origin; } catch { return 'https://filemoon.sx'; }
    })();

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': referer || `${origin}/`,
      'Origin': origin
    };

    const videoSources = [];
    const subtitles = [];

    try {
      const res = await fetchText(embedUrl, { referer: headers.Referer });
      const html = res.body || '';

      let unpacked = html;
      if (/eval\(function\(p,a,c,k,e,[rd]\)/.test(html)) {
        unpacked = unpackJs(html);
      }

      // Look for sources array or file property in unpacked code
      const fileMatch = unpacked.match(/(?:file|sources)\s*:\s*\[?\{?\s*(?:file|src)\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i) ||
                        unpacked.match(/["']([^"']+\.m3u8[^"']*)["']/i);

      if (fileMatch) {
        videoSources.push({
          quality: 'Auto (Adaptive)',
          url: fileMatch[1]
        });
      }

      // Extract subtitles if present
      subtitles.push(...extractSubtitlesFromText(unpacked, embedUrl));
    } catch (err) {
      console.warn('[FileMoonExtractor] Extraction warning:', err.message);
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
