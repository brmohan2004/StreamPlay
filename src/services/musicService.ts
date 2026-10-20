import CryptoJS from 'crypto-js';
import { Capacitor } from '@capacitor/core';
import { SongItem } from '../types/media';

const SAAVN_API_BASE =
  Capacitor.isNativePlatform()
    ? 'https://www.jiosaavn.com/api.php'
    : (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '1420'
        ? '/api/saavn'
        : 'https://www.jiosaavn.com/api.php');
const DES_KEY = '38346591';

export function decryptMediaUrl(encryptedUrl: string): string {
  try {
    const key = CryptoJS.enc.Utf8.parse(DES_KEY);
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Base64.parse(encryptedUrl)
    });
    const decrypted = CryptoJS.DES.decrypt(
      cipherParams,
      key,
      {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
      }
    );
    const stream = decrypted.toString(CryptoJS.enc.Utf8);
    // Replace default _96.mp4 with high quality 320kbps stream if available
    if (stream.includes('_96.mp4')) {
      return stream.replace('_96.mp4', '_320.mp4');
    }
    return stream;
  } catch (err) {
    console.error('Failed to decrypt audio stream URL:', err);
    return '';
  }
}

const searchCache = new Map<string, { timestamp: number; data: SongItem[] }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function searchSongs(query: string, limit = 20): Promise<SongItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const cacheKey = `${trimmed.toLowerCase()}_${limit}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS && cached.data.length > 0) {
    return cached.data;
  }

  const url = `${SAAVN_API_BASE}?__call=search.getResults&_marker=0&q=${encodeURIComponent(
    trimmed
  )}&ctx=web6dot0&_format=json&n=${limit}&p=1`;

  // Attempt fetch with 1 automatic retry on network drops
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        if (attempt === 1) {
          await new Promise(r => setTimeout(r, 400));
          continue;
        }
        break;
      }
      const data = await res.json();
      const list = data.results || [];

      const parsed: SongItem[] = list
        .map((item: any) => {
          const encrypted = item.encrypted_media_url || item.more_info?.encrypted_media_url;
          if (!encrypted) return null;

          const streamUrl = decryptMediaUrl(encrypted);
          if (!streamUrl) return null;

          const ACCENT_COLORS = ['#ff9800', '#00e5ff', '#c8ff00', '#ff4081', '#7c4dff', '#00e676', '#ffab00'];

          return {
            id: item.id,
            title: decodeHtml(item.song || item.title || 'Unknown Track'),
            album: decodeHtml(item.album || item.more_info?.album || 'Single'),
            artist: decodeHtml(item.primary_artists || item.more_info?.artistMap?.primary_artists?.[0]?.name || 'Various Artists'),
            year: item.year || item.more_info?.year,
            duration: parseInt(item.duration || item.more_info?.duration || '180', 10),
            image: (item.image || item.more_info?.thumbnail || '').replace('150x150', '500x500'),
            streamUrl,
            videoUrl: `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent((item.song || item.title) + ' ' + (item.primary_artists || ''))}`,
            accentColor: ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)],
            quality: '320kbps Ultra-HD'
          };
        })
        .filter((s: SongItem | null): s is SongItem => s !== null);

      if (parsed.length > 0) {
        searchCache.set(cacheKey, { timestamp: Date.now(), data: parsed });
        return parsed;
      }
    } catch (err) {
      if (attempt === 1) {
        await new Promise(r => setTimeout(r, 500));
        continue;
      }
      console.warn(`[StreamPlay] Saavn search temporarily unavailable for "${trimmed}":`, err);
    }
  }

  return cached?.data || [];
}

export async function fetchTrendingSongs(): Promise<SongItem[]> {
  const trendingQueries = ['Top Hits 2026', 'The Weeknd', 'Taylor Swift', 'Dua Lipa', 'Drake'];
  const randomQuery = trendingQueries[Math.floor(Math.random() * trendingQueries.length)];
  return searchSongs(randomQuery, 25);
}

export async function fetchLanguageSongs(language: string, limit = 15): Promise<SongItem[]> {
  const query = `${language} Top Hits 2026`;
  const list = await searchSongs(query, limit);
  return list.map(s => ({ ...s, language }));
}

export async function fetchGenreSongs(genre: string, limit = 15): Promise<SongItem[]> {
  return searchSongs(`${genre} music hits`, limit);
}

export async function fetchVideoSongs(language = 'Global', limit = 12): Promise<SongItem[]> {
  const list = await searchSongs(`${language} official music video songs`, limit);
  return list.map(song => ({
    ...song,
    isVideo: true,
    videoUrl: song.videoUrl || `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(song.title + ' ' + song.artist + ' official 4k video')}`
  }));
}

function decodeHtml(html: string): string {
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
}
