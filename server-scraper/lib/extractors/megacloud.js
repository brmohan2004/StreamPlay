// server-scraper/lib/extractors/megacloud.js
import { BaseExtractor, aesCbcDecrypt, extractSubtitlesFromText } from './base.js';
import { fetchText } from '../httpClient.js';

export class MegaCloudExtractor extends BaseExtractor {
  constructor() {
    super('MegaCloud');
  }

  canExtract(url) {
    return /megacloud|rabbitstream|dokicloud|upcloud|vizcloud|vidcloud/i.test(url);
  }

  async extract(embedUrl, referer) {
    const origin = (() => {
      try { return new URL(embedUrl).origin; } catch { return 'https://megacloud.tv'; }
    })();

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': referer || `${origin}/`,
      'X-Requested-With': 'XMLHttpRequest'
    };

    const videoSources = [];
    const subtitles = [];

    try {
      const u = new URL(embedUrl);
      const embedId = u.pathname.split('/').pop() || '';

      if (embedId) {
        const apiUrl = `${origin}/embed-2/ajax/e-1/getSources?id=${embedId}`;
        try {
          const apiRes = await fetchText(apiUrl, { referer: embedUrl, headers });
          const json = JSON.parse(apiRes.body || '{}');

          if (json.sources) {
            if (Array.isArray(json.sources)) {
              for (const s of json.sources) {
                if (s.file) videoSources.push({ quality: 'Auto (Adaptive)', url: s.file });
              }
            } else if (typeof json.sources === 'string') {
              // Encrypted cipher string
              const key = 'megacloud_secret_key_32bytes_len';
              const iv = 'megacloud_iv_16b';
              const decrypted = aesCbcDecrypt(Buffer.from(key, 'utf8'), Buffer.from(iv, 'utf8'), json.sources);
              if (decrypted) {
                const match = decrypted.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/);
                if (match) videoSources.push({ quality: 'Auto (Adaptive)', url: match[0] });
              }
            }
          }

          if (Array.isArray(json.tracks)) {
            for (const t of json.tracks) {
              if (t.kind === 'captions' || t.kind === 'subtitles') {
                subtitles.push({
                  lang: t.label || 'Subtitle',
                  url: t.file,
                  default: !!t.default
                });
              }
            }
          }
        } catch {}
      }

      // Fallback: direct page regex match
      if (videoSources.length === 0) {
        const pageRes = await fetchText(embedUrl, { referer: headers.Referer });
        const html = pageRes.body || '';
        const m3u8Match = html.match(/https?:\/\/[^"'`\s<>]+\.m3u8[^"'`\s<>]*/gi);
        if (m3u8Match) {
          for (const m of m3u8Match) {
            videoSources.push({ quality: 'Auto (Adaptive)', url: m.replace(/[),;\\"]+$/, '') });
          }
        }
        subtitles.push(...extractSubtitlesFromText(html, embedUrl));
      }
    } catch (err) {
      console.warn('[MegaCloudExtractor] Extraction warning:', err.message);
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
