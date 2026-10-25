// server-scraper/lib/extractors.js
import { fetchText } from './httpClient.js';

const MEDIA_EXT = /\.(m3u8|mp4|mkv|webm|ts|m4s|vtt|srt)(\?|#|$)/i;

/**
 * Lightweight safe unpacker for Dean Edwards p.a.c.k.e.r encoded scripts commonly found on video mirrors.
 */
export function unpackJs(code) {
  if (!code || typeof code !== 'string') return '';
  const regex = /eval\(function\(p,a,c,k,e,[rd]\)\{.*\}\('(.*?)',(\d+),(\d+),'(.*?)'\.split\('\|'\)/s;
  const match = regex.exec(code);
  if (!match) return code;
  try {
    const [, payload, radixStr, countStr, syms] = match;
    const radix = parseInt(radixStr, 10);
    const count = parseInt(countStr, 10);
    const symArray = syms.split('|');
    const baseUnpack = (c) => {
      return (c < radix ? '' : baseUnpack(Math.floor(c / radix))) +
        ((c = c % radix) > 35 ? String.fromCharCode(c + 29) : c.toString(36));
    };
    const dict = {};
    for (let i = 0; i < count; i++) {
      dict[baseUnpack(i)] = symArray[i] || baseUnpack(i);
    }
    return payload.replace(/\b\w+\b/g, (w) => dict[w] !== undefined ? dict[w] : w);
  } catch {
    return code;
  }
}

export function extractMediaUrls(html, baseUrl) {
  const out = new Set();
  if (!html) return [];

  // 1. If script is packed, unpack and merge
  let combined = html;
  if (/eval\(function\(p,a,c,k,e,[rd]\)/.test(html)) {
    const unpacked = unpackJs(html);
    if (unpacked) combined = html + '\n' + unpacked;
  }

  // 2. Unescape common JSON escaped slashes
  const unescaped = combined.replace(/\\\//g, '/');

  // 3. Raw URLs matching media extensions
  const rawRegex = /https?:\/\/[^"'`\s<>]+/gi;
  let m;
  while ((m = rawRegex.exec(unescaped))) {
    const u = m[0].replace(/[),;\\"]+$/, '');
    if (MEDIA_EXT.test(u)) {
      try { out.add(new URL(u, baseUrl).toString()); } catch {}
    }
  }

  // 4. Match script variables (e.g. file: "...", source: "...", url: "...")
  const sourcePattern = /(?:file|source|url|streamUrl|src)["']?\s*:\s*["']([^"']+\.(?:m3u8|mp4|webm|vtt|srt)[^"']*)["']/gi;
  while ((m = sourcePattern.exec(unescaped))) {
    const raw = m[1];
    try {
      const u = new URL(raw, baseUrl).toString();
      out.add(u);
    } catch {}
  }

  // 5. iframe src attributes
  const iframeRegex = /<iframe[^>]+src=["']([^"']+)["']/gi;
  while ((m = iframeRegex.exec(combined))) {
    try {
      const u = new URL(m[1], baseUrl).toString();
      if (!MEDIA_EXT.test(u)) out.add('__IFRAME__' + u);
    } catch {}
  }

  // 6. Generic src/href attributes
  const attrRegex = /(?:src|href)=["']([^"']+)["']/gi;
  while ((m = attrRegex.exec(combined))) {
    const v = m[1];
    if (MEDIA_EXT.test(v)) {
      try { out.add(new URL(v, baseUrl).toString()); } catch {}
    }
  }

  return [...out];
}

export function isMasterPlaylist(text) {
  return /#EXT-X-STREAM-INF/i.test(text);
}

export function parseMasterPlaylist(manifestText, manifestUrl) {
  const lines = manifestText.split(/\r?\n/);
  const videoSources = [];
  const audioTracks = [];
  const subtitles = [];
  let pendingStream = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#EXT-X-STREAM-INF')) {
      const bw = /BANDWIDTH=(\d+)/i.exec(line)?.[1];
      const res = /RESOLUTION=(\d+x\d+)/i.exec(line)?.[1];
      const name = /NAME="([^"]+)"/i.exec(line)?.[1];
      pendingStream = { bandwidth: Number(bw || 0), resolution: res || '', name: name || '' };
      continue;
    }
    if (pendingStream && !line.startsWith('#')) {
      try {
        const url = new URL(line, manifestUrl).toString();
        const height = pendingStream.resolution ? Number(pendingStream.resolution.split('x')[1]) : 0;
        const label = pendingStream.name || (height ? `${height}p` : (pendingStream.bandwidth ? `${Math.round(pendingStream.bandwidth / 1000)}kbps` : 'Auto'));
        videoSources.push({
          quality: label,
          url,
          bandwidth: pendingStream.bandwidth,
          resolution: pendingStream.resolution,
          height: height || 0
        });
      } catch {}
      pendingStream = null;
      continue;
    }
    if (line.startsWith('#EXT-X-MEDIA')) {
      const type = /TYPE=([A-Z-]+)/i.exec(line)?.[1];
      const uriMatch = /URI="([^"]+)"/i.exec(line);
      const lang = /LANGUAGE="([^"]+)"/i.exec(line)?.[1] || /NAME="([^"]+)"/i.exec(line)?.[1];
      const name = /NAME="([^"]+)"/i.exec(line)?.[1] || lang;
      const isDefault = /DEFAULT=YES/i.test(line);
      if (uriMatch) {
        try {
          const url = new URL(uriMatch[1], manifestUrl).toString();
          if (type === 'AUDIO') {
            audioTracks.push({ name: name || 'Audio', lang: lang || 'und', url, default: isDefault });
          }
          if (type === 'SUBTITLES') {
            subtitles.push({ lang: name || lang || 'Subtitle', url, default: isDefault });
          }
        } catch {}
      }
    }
  }

  // Sort video sources by height/bandwidth descending (e.g. 1080p, 720p, 480p, 360p)
  videoSources.sort((a, b) => {
    if (b.height !== a.height) return b.height - a.height;
    return (b.bandwidth || 0) - (a.bandwidth || 0);
  });

  // Always include Auto adaptive stream pointing to the root master manifest
  if (videoSources.length > 0) {
    videoSources.unshift({
      quality: 'Auto (Adaptive)',
      url: manifestUrl,
      bandwidth: 0,
      resolution: 'Auto',
      height: 9999
    });
  }

  return { videoSources, audioTracks, subtitles };
}

export function normalizeQualityLabel(q) {
  return String(q || '').trim();
}

export async function expandManifest(url, referer) {
  const { fetchText } = await import('./httpClient.js');
  const ft = await fetchText(url, { referer });
  const text = ft.body || '';
  if (/#EXTM3U/i.test(text)) {
    if (isMasterPlaylist(text)) {
      const parsed = parseMasterPlaylist(text, url);
      return { type: 'master', ...parsed, headersReferer: referer || new URL(url).origin + '/' };
    }
    return { type: 'media', videoSources: [{ quality: 'Auto (Adaptive)', url }], audioTracks: [], subtitles: [] };
  }
  return null;
}

export function dedupSources(sources) {
  const seen = new Set();
  return sources.filter(s => {
    if (!s || !s.url) return false;
    if (seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });
}
