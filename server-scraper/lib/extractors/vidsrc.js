// server-scraper/lib/extractors/vidsrc.js
import { BaseExtractor, unpackJs, rc4Decrypt, extractSubtitlesFromText } from './base.js';
import { fetchText } from '../httpClient.js';

export class VidSrcExtractor extends BaseExtractor {
  constructor() {
    super('VidSrc');
  }

  canExtract(url) {
    return /vidsrc|vidplay|2embed|rcp|vidsrc2/i.test(url);
  }

  async extract(embedUrl, referer) {
    const origin = (() => {
      try { return new URL(embedUrl).origin; } catch { return 'https://vidsrc.net'; }
    })();

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': referer || `${origin}/`,
      'Origin': origin
    };

    const videoSources = [];
    const subtitles = [];
    const audioTracks = [];

    try {
      const pageRes = await fetchText(embedUrl, { referer: headers.Referer });
      const html = pageRes.body || '';

      // 1. Unpack any p.a.c.k.e.r scripts
      let textToParse = html;
      if (/eval\(function\(p,a,c,k,e,[rd]\)/.test(html)) {
        textToParse += '\n' + unpackJs(html);
      }

      // 2. Look for direct .m3u8 sources in script variables or HTML
      const m3u8Regex = /https?:\/\/[^"'`\s<>]+\.m3u8[^"'`\s<>]*/gi;
      let m;
      while ((m = m3u8Regex.exec(textToParse))) {
        const u = m[0].replace(/[),;\\"]+$/, '');
        videoSources.push({ quality: 'Auto (Adaptive)', url: u });
      }

      // 3. Extract iframe sources (e.g., /rcp/, /src/, /embed/)
      const iframeMatches = [...textToParse.matchAll(/<iframe[^>]+src=["']([^"']+)["']/gi)];
      for (const match of iframeMatches) {
        let iframeUrl = match[1];
        if (iframeUrl.startsWith('//')) iframeUrl = 'https:' + iframeUrl;
        else if (iframeUrl.startsWith('/')) iframeUrl = origin + iframeUrl;

        try {
          const ifrRes = await fetchText(iframeUrl, { referer: embedUrl });
          const ifrHtml = ifrRes.body || '';
          let ifrText = ifrHtml;
          if (/eval\(function\(p,a,c,k,e,[rd]\)/.test(ifrHtml)) {
            ifrText += '\n' + unpackJs(ifrHtml);
          }

          let m2;
          while ((m2 = m3u8Regex.exec(ifrText))) {
            const u = m2[0].replace(/[),;\\"]+$/, '');
            videoSources.push({ quality: 'Auto (Adaptive)', url: u });
          }

          // Extract subtitles from iframe text
          subtitles.push(...extractSubtitlesFromText(ifrText, iframeUrl));
        } catch {}
      }

      // 4. Handle RCP / PREROLL decryption token endpoints if present
      const rcpMatch = textToParse.match(/src=["'](\/rcp\/[^"']+)["']/i) ||
                       textToParse.match(/["'](\/rcp\/[a-zA-Z0-9_-]+)["']/i);
      if (rcpMatch) {
        const rcpUrl = new URL(rcpMatch[1], origin).toString();
        try {
          const rcpRes = await fetchText(rcpUrl, { referer: embedUrl });
          const rcpText = rcpRes.body || '';

          // Try RC4 decryption if obfuscated key present
          const cipherMatch = rcpText.match(/div id=["']s?[^"']+["'][^>]*>([a-zA-Z0-9+/=]+)</i) ||
                              rcpText.match(/["']([a-f0-9]{32,})["']/i);
          if (cipherMatch) {
            const decrypted = rc4Decrypt('vidsrc_key', cipherMatch[1]);
            if (decrypted && decrypted.includes('.m3u8')) {
              const urlMatch = decrypted.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/);
              if (urlMatch) videoSources.push({ quality: 'Auto (Adaptive)', url: urlMatch[0] });
            }
          }
        } catch {}
      }

      subtitles.push(...extractSubtitlesFromText(textToParse, embedUrl));

    } catch (err) {
      console.warn('[VidSrcExtractor] Extraction warning:', err.message);
    }

    return {
      success: videoSources.length > 0,
      videoSources,
      audioTracks,
      subtitles,
      headers
    };
  }
}
