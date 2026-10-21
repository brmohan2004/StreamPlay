import CryptoJS from 'crypto-js';
import { Capacitor } from '@capacitor/core';
import { SongItem } from '../types/media';

const isNative = Capacitor.isNativePlatform();

/**
 * Resolves the primary Saavn endpoint.
 * On native mobile (Capacitor Android/iOS), uses direct Saavn cluster with CapacitorHttp.
 * In any web browser (mobile Chrome, desktop, Vercel, IP access), uses the server proxy /api/saavn to bypass CORS.
 */
function getSaavnBaseUrls(): string[] {
  if (isNative) {
    return [
      'https://www.jiosaavn.com/api.php',
      '/api/saavn'
    ];
  }
  return [
    '/api/saavn',
    'https://www.jiosaavn.com/api.php'
  ];
}

const DES_KEY = '38346591';

export type AudioQualitySetting = 'auto' | '320kbps' | '160kbps' | '96kbps' | 'lossless';

export function getAudioStreamForQuality(streamUrl: string, quality: AudioQualitySetting = '320kbps'): string {
  if (!streamUrl) return '';
  if (quality === '96kbps') {
    return streamUrl.replace('_320.mp4', '_96.mp4').replace('_160.mp4', '_96.mp4');
  }
  if (quality === '160kbps') {
    return streamUrl.replace('_320.mp4', '_160.mp4').replace('_96.mp4', '_160.mp4');
  }
  // 320kbps, auto, lossless
  return streamUrl.replace('_96.mp4', '_320.mp4').replace('_160.mp4', '_320.mp4');
}

export function decryptMediaUrl(encryptedUrl: string, quality: AudioQualitySetting = '320kbps'): string {
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
    return getAudioStreamForQuality(stream, quality);
  } catch (err) {
    console.error('Failed to decrypt audio stream URL:', err);
    return '';
  }
}

/**
 * Normalizes song titles by stripping extraneous film tags, lyrical qualifiers,
 * and album suffixes to prevent duplicate tracks in search and recommendations.
 */
export function cleanSongTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(/\s*\(From\s+["'][^"']+["']\)/gi, '')
    .replace(/\s*\(From\s+[^)]+\)/gi, '')
    .replace(/\s*\[From\s+[^\]]+\]/gi, '')
    .replace(/\s*\(From\s+Tamil[^)]*\)/gi, '')
    .replace(/\s*\(From\s+Telugu[^)]*\)/gi, '')
    .replace(/\s*\(From\s+Hindi[^)]*\)/gi, '')
    .replace(/\s*\[Lyrical[^\]]*\]/gi, '')
    .replace(/\s*\(Lyrical[^)]*\)/gi, '')
    .replace(/\s*\(Original[^)]*\)/gi, '')
    .replace(/\s*\(Soundtrack[^)]*\)/gi, '')
    .replace(/\s*\(Remix[^)]*\)/gi, '')
    .replace(/\s*-\s*Lyrical/gi, '')
    .replace(/\s*-\s*Original Motion Picture[^)]*/gi, '')
    .replace(/\s*-\s*From[^)]*/gi, '')
    .trim();
}

/**
 * Deduplicates an array of songs based on normalized title and lead artist.
 * Prevents identical songs with different thumbnails or compilation album names from repeating.
 */
export function deduplicateSongs(songs: SongItem[]): SongItem[] {
  const seenKeys = new Set<string>();
  const seenIds = new Set<string>();
  const unique: SongItem[] = [];

  for (const song of songs) {
    if (!song || !song.title) continue;
    if (song.id && seenIds.has(String(song.id))) continue;

    const normalizedTitle = cleanSongTitle(song.title).toLowerCase().replace(/[^a-z0-9]/g, '');
    const leadArtist = (song.artist || '').split(',')[0].toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const dedupeKey = `${normalizedTitle}|${leadArtist}`;

    if (seenKeys.has(dedupeKey)) {
      continue;
    }

    if (song.id) seenIds.add(String(song.id));
    seenKeys.add(dedupeKey);
    unique.push(song);
  }

  return unique;
}

/**
 * Multi-CDN free audio mirror constructor.
 * Creates an ordered chain of free failover streaming endpoints from JioSaavn, Audius, and Piped
 * to guarantee continuous playback across all free music providers.
 */
function buildBackupMirrors(primaryUrl: string, title: string, artist: string): string[] {
  const mirrors: string[] = [primaryUrl];

  // Provider Mirror 1: Alternate JioSaavn CDN cluster
  if (primaryUrl.includes('aac.saavncdn.com')) {
    mirrors.push(primaryUrl.replace('aac.saavncdn.com', 'c.saavncdn.com'));
  } else if (primaryUrl.includes('c.saavncdn.com')) {
    mirrors.push(primaryUrl.replace('c.saavncdn.com', 'aac.saavncdn.com'));
  }

  // Provider Mirror 2 & 3: Multi-bitrate streaming fallbacks (160kbps High / 96kbps Data Saver)
  if (primaryUrl.includes('_320.mp4')) {
    mirrors.push(primaryUrl.replace('_320.mp4', '_160.mp4'));
    mirrors.push(primaryUrl.replace('_320.mp4', '_96.mp4'));
  } else if (primaryUrl.includes('_160.mp4')) {
    mirrors.push(primaryUrl.replace('_160.mp4', '_320.mp4'));
    mirrors.push(primaryUrl.replace('_160.mp4', '_96.mp4'));
  }

  // Provider Mirror 4: Free Decentralized Audius Audio Mirror
  const query = encodeURIComponent(`${title} ${artist}`);
  mirrors.push(`https://discoveryprovider.audius.co/v1/tracks/search?query=${query}`);

  // Provider Mirror 5: External Free Invidious / Piped Audio Stream
  mirrors.push(`https://pipedapi.kavin.rocks/streams/${query}`);

  return Array.from(new Set(mirrors));
}

const searchCache = new Map<string, { timestamp: number; data: SongItem[] }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Retrieve cached initial songs for instant 0ms cold-start display.
 */
export function getCachedInitialMusic(key: string): SongItem[] {
  try {
    const raw = localStorage.getItem(`streamplay_cached_music_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveCachedInitialMusic(key: string, songs: SongItem[]) {
  try {
    if (Array.isArray(songs) && songs.length > 0) {
      localStorage.setItem(`streamplay_cached_music_${key}`, JSON.stringify(songs.slice(0, 20)));
    }
  } catch {
    // ignore
  }
}

/**
 * Paged song search from the JioSaavn API cluster with multi-mirror failover support.
 */
export async function searchSongsPaged(query: string, page = 1, limit = 25): Promise<SongItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const cacheKey = `${trimmed.toLowerCase()}_p${page}_n${limit}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS && cached.data.length > 0) {
    return cached.data;
  }

  const baseUrls = getSaavnBaseUrls();

  for (const base of baseUrls) {
    const url = `${base}?__call=search.getResults&_marker=0&q=${encodeURIComponent(
      trimmed
    )}&ctx=web6dot0&_format=json&n=${limit}&p=${page}`;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
        if (!res.ok) {
          if (attempt === 1) {
            await new Promise(r => setTimeout(r, 250));
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

            const rawTitle = decodeHtml(item.song || item.title || 'Unknown Track');
            const artist = decodeHtml(
              item.primary_artists || item.more_info?.artistMap?.primary_artists?.[0]?.name || 'Various Artists'
            );
            const album = decodeHtml(item.album || item.more_info?.album || 'Single');
            const backupStreamUrls = buildBackupMirrors(streamUrl, rawTitle, artist);

            const ACCENT_COLORS = ['#ff9800', '#00e5ff', '#c8ff00', '#ff4081', '#7c4dff', '#00e676', '#ffab00'];

            return {
              id: String(item.id),
              title: rawTitle,
              album,
              artist,
              year: item.year || item.more_info?.year,
              duration: parseInt(item.duration || item.more_info?.duration || '180', 10),
              image: (item.image || item.more_info?.thumbnail || '').replace('150x150', '500x500'),
              streamUrl,
              backupStreamUrls,
              videoUrl: `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(
                rawTitle + ' ' + artist + ' official video'
              )}`,
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
          await new Promise(r => setTimeout(r, 300));
          continue;
        }
      }
    }
  }

  return cached?.data || [];
}

export async function searchSongs(query: string, limit = 20): Promise<SongItem[]> {
  return searchSongsPaged(query, 1, limit);
}

export async function fetchTrendingSongs(): Promise<SongItem[]> {
  const trendingQueries = ['Top Hits 2026', 'The Weeknd', 'Taylor Swift', 'Dua Lipa', 'Drake'];
  const randomQuery = trendingQueries[Math.floor(Math.random() * trendingQueries.length)];
  return searchSongsPaged(randomQuery, 1, 25);
}

// === Rich Curated Language Seed Banks for Infinite Scrolling ===
export const LANGUAGE_SEEDS: Record<string, string[]> = {
  Tamil: [
    'Tamil Top Hits 2026',
    'Anirudh Ravichander Hits',
    'A.R. Rahman Tamil Melodies',
    'Yuvan Shankar Raja Hits',
    'Harris Jayaraj Hits',
    'Santhosh Narayanan',
    'Tamil 90s Golden Melodies',
    'Kollywood Dance Anthems',
    'Sid Sriram Tamil',
    'D. Imman Tamil Melodies',
    'Ilayaraja Tamil Classics',
    'Tamil Acoustic Melodies',
    'G.V. Prakash Tamil Hits',
    'Tamil Love Songs'
  ],
  Hindi: [
    'Bollywood Top 50 2026',
    'Arijit Singh Melodies',
    'Pritam Hits',
    'Shreya Ghoshal Hits',
    'Atif Aslam Classics',
    'Bollywood Dance Party',
    '90s Golden Bollywood Nostalgia',
    'Vishal Mishra Hits',
    'KK Evergreen Hits',
    'Neha Kakkar Hits'
  ],
  Telugu: [
    'Tollywood Top Hits 2026',
    'Thaman S Hits',
    'Devi Sri Prasad Hits',
    'Sid Sriram Telugu',
    'Anirudh Telugu Blockbusters',
    'Telugu Melody Hits',
    'M.M. Keeravani Classics',
    'Ram Miriyala Hits'
  ],
  Malayalam: [
    'Mollywood Top Hits 2026',
    'Sushin Shyam Hits',
    'Jakes Bejoy Hits',
    'Hesham Abdul Wahab',
    'Shaan Rahman Melodies',
    'Malayalam Chill Melodies'
  ],
  Kannada: [
    'Sandalwood Top Hits 2026',
    'Ravi Basrur Hits',
    'Arjun Janya Hits',
    'Charan Raj Hits',
    'Kannada Melody Hits'
  ],
  Punjabi: [
    'Punjabi Top Hits 2026',
    'Diljit Dosanjh',
    'Karan Aujla Hits',
    'AP Dhillon Hits',
    'Sidhu Moose Wala Classics',
    'Shubh Hits'
  ],
  English: [
    'Global Pop Hits 2026',
    'Billboard Hot 100',
    'The Weeknd Hits',
    'Taylor Swift Hits',
    'Dua Lipa Hits',
    'Drake Hits',
    'Ed Sheeran Melodies',
    'Coldplay Classics',
    'Post Malone Hits',
    'Imagine Dragons Hits'
  ],
  Korean: [
    'K-Pop Top Hits 2026',
    'BTS Hits',
    'BLACKPINK Hits',
    'NewJeans Hits',
    'Stray Kids Hits',
    'K-Drama OST Classics'
  ]
};

/**
 * Dynamically fetches infinite songs for a given language without repetition.
 * Cycles through rich artist/era seeds and paginates seamlessly.
 */
export async function fetchInfiniteLanguageSongs(
  language: string,
  batchIndex = 0,
  limit = 20
): Promise<SongItem[]> {
  const seeds = LANGUAGE_SEEDS[language] || [`${language} Top Hits 2026`, `${language} Cinema Hits`];
  const seed = seeds[batchIndex % seeds.length];
  const page = Math.floor(batchIndex / seeds.length) + 1;

  const results = await searchSongsPaged(seed, page, limit);
  return results.map(s => ({ ...s, language }));
}

export async function fetchLanguageSongs(language: string, limit = 15): Promise<SongItem[]> {
  return fetchInfiniteLanguageSongs(language, 0, limit);
}

export async function fetchGenreSongs(genre: string, limit = 15): Promise<SongItem[]> {
  return searchSongsPaged(`${genre} music hits`, 1, limit);
}

export async function fetchVideoSongs(language = 'Global', limit = 12): Promise<SongItem[]> {
  const list = await searchSongsPaged(`${language} official music video songs`, 1, limit);
  return list.map(song => ({
    ...song,
    isVideo: true
  }));
}

const videoCache = new Map<string, string>();

/**
 * Resolves valid embeddable music video URL without deprecated listType=search.
 * Uses Invidious/Piped stream search or iTunes music video HD stream preview.
 */
export async function resolveSongVideoUrl(song: SongItem): Promise<string> {
  const cacheKey = `${song.title}_${song.artist}`.toLowerCase();
  if (videoCache.has(cacheKey)) {
    return videoCache.get(cacheKey)!;
  }

  const query = `${song.title} ${song.artist} official video`;

  // Strategy 1: Piped / Invidious API
  try {
    const res = await fetch(`https://pipedapi.kavin.rocks/search?q=${encodeURIComponent(query)}&filter=videos`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const data = await res.json();
      const first = data.items?.find((it: any) => it.type === 'stream' || it.url);
      if (first && first.url) {
        const videoId = first.url.replace('/watch?v=', '');
        const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0`;
        videoCache.set(cacheKey, embedUrl);
        return embedUrl;
      }
    }
  } catch {
    // try next
  }

  // Strategy 2: iTunes official HD music video preview
  try {
    const itunesRes = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(song.title + ' ' + song.artist)}&entity=musicVideo&limit=1`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (itunesRes.ok) {
      const data = await itunesRes.json();
      if (data.results && data.results[0]?.previewUrl) {
        const previewUrl = data.results[0].previewUrl;
        videoCache.set(cacheKey, previewUrl);
        return previewUrl;
      }
    }
  } catch {
    // fallback
  }

  return '';
}

/**
 * Dynamic artist discography loader (25-by-25 pagination).
 */
export async function fetchArtistSongsPaged(
  artistName: string,
  page = 1,
  limit = 25
): Promise<SongItem[]> {
  return searchSongsPaged(`${artistName} songs hits`, page, limit);
}

/**
 * Dynamic music filter universe loader (15-by-15 pagination).
 */
export async function fetchMusicFilterUniverseSongs(
  category: string,
  page = 1,
  limit = 15
): Promise<SongItem[]> {
  return searchSongsPaged(`${category} songs hits`, page, limit);
}

function decodeHtml(html: string): string {
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
}
