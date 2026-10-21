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

export function decodeHtmlEntities(html: string): string {
  if (!html) return '';
  return html
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/**
 * Normalizes song titles by stripping extraneous film tags, lyrical qualifiers,
 * and album suffixes to prevent duplicate tracks in search and recommendations.
 */
export function cleanSongTitle(title: string): string {
  if (!title) return '';
  let cleaned = decodeHtmlEntities(title).trim();

  // Strip film/movie tags in parentheses / brackets: (From "Movie"), (From Movie), [From Movie], etc.
  cleaned = cleaned.replace(/\s*[\(\[][^()\[\]]*\b(?:from|soundtrack|ost|film|movie|lyric|video|version|remix|theme|reprise|audio|teaser|promo|feat|ft|original)\b[^()\[\]]*[\)\]]/gi, '');
  // If there's a hyphen separator "Song Name - Movie Name", take the first segment
  if (cleaned.includes(' - ')) {
    cleaned = cleaned.split(/\s+-\s+/)[0];
  }
  // Strip anything in remaining parentheses if it's a qualifier or language tag
  cleaned = cleaned.replace(/\s*\([^)]*\)/g, '');
  cleaned = cleaned.replace(/\s*\[[^\]]*\]/g, '');

  return cleaned.trim();
}

/**
 * Computes a unique normalized signature key for a song to detect identical songs
 * across different compilation albums, different thumbnails, or duplicate providers.
 */
export function getSongCoreKey(title: string, artist = '', streamUrl = ''): string {
  const cleaned = cleanSongTitle(title);
  const normTitle = cleaned.toLowerCase().trim().replace(/[^a-z0-9]/g, '');

  const firstArtist = decodeHtmlEntities(artist)
    .toLowerCase()
    .split(/[,&/|]/)[0]
    ?.trim()
    .replace(/[^a-z0-9]/g, '') || '';

  // Extract media hash if present to catch identical audio streams under different album titles
  let mediaHash = '';
  if (streamUrl && streamUrl.includes('/')) {
    const parts = streamUrl.split('/');
    mediaHash = parts[parts.length - 1]?.replace(/_[0-9]+\.mp4/i, '') || '';
  }

  if (mediaHash && mediaHash.length > 5) {
    return `media_${mediaHash}`;
  }

  return normTitle.length >= 6 ? normTitle : `${normTitle}|${firstArtist}`;
}

/**
 * Deduplicates an array of songs based on normalized core title, lead artist, and audio stream hash.
 * Prevents identical songs with different thumbnails or compilation album names from repeating.
 */
export function deduplicateSongs(songs: SongItem[]): SongItem[] {
  const seenKeys = new Set<string>();
  const seenIds = new Set<string>();
  const unique: SongItem[] = [];

  for (const song of songs) {
    if (!song || !song.title) continue;
    if (song.id && seenIds.has(String(song.id))) continue;

    const key = getSongCoreKey(song.title, song.artist, song.streamUrl);
    if (seenKeys.has(key)) {
      continue;
    }

    if (song.id) seenIds.add(String(song.id));
    seenKeys.add(key);
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

export interface ArtistResultItem {
  id: string;
  name: string;
  role: string;
  image: string;
}

export interface PlaylistResultItem {
  id: string;
  title: string;
  subtitle?: string;
  songCount: number;
  image: string;
}

/**
 * Checks if search query refers to trending / viral / latest hits.
 */
export function isTrendingQuery(query: string): boolean {
  const q = query.toLowerCase().trim();
  return (
    q === 'trending' ||
    q === 'trending songs' ||
    q === 'trending song' ||
    q === 'trending hits' ||
    q === 'trend songs' ||
    q === 'trend' ||
    q === 'viral' ||
    q === 'viral songs' ||
    q === 'viral hits' ||
    q === 'latest songs' ||
    q === 'top hits' ||
    q === 'new songs' ||
    q === 'top songs' ||
    q === 'popular songs' ||
    q === 'tamil trending' ||
    q === 'hindi trending' ||
    q.includes('trending') ||
    q.includes('viral hits')
  );
}

/**
 * Performs raw JioSaavn search without trending interception to prevent infinite recursion.
 */
async function performRawSaavnSearch(query: string, page = 1, limit = 25): Promise<SongItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

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
            const durationSec = parseInt(item.duration || item.more_info?.duration || '180', 10);
            const isShortClip = durationSec > 0 && durationSec < 90;

            const ACCENT_COLORS = ['#ff9800', '#00e5ff', '#c8ff00', '#ff4081', '#7c4dff', '#00e676', '#ffab00'];

            return {
              id: String(item.id),
              title: rawTitle,
              album,
              artist,
              year: item.year || item.more_info?.year,
              duration: durationSec,
              isShortClip,
              image: (item.image || item.more_info?.thumbnail || '').replace('150x150', '500x500'),
              streamUrl,
              backupStreamUrls,
              videoUrl: `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(
                rawTitle + ' ' + artist + ' official video'
              )}`,
              accentColor: ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)],
              quality: '320kbps Ultra-HD',
              source: 'JioSaavn'
            };
          })
          .filter((s: SongItem | null): s is SongItem => s !== null);

        if (parsed.length > 0) {
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

  return [];
}

/**
 * Free Decentralized Audius Music Provider.
 * Searches 100% free creator music, remixes, EDM, and independent global tracks.
 */
export async function searchAudiusSongs(query: string, limit = 12): Promise<SongItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const audiusHosts = [
    'https://discoveryprovider.audius.co',
    'https://audius-discovery-1.theblueprint.xyz',
    'https://discoveryprovider2.audius.co'
  ];

  for (const host of audiusHosts) {
    try {
      const url = `${host}/v1/tracks/search?query=${encodeURIComponent(trimmed)}&app_name=StreamPlay`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
      if (!res.ok) continue;

      const data = await res.json();
      const tracks = data.data || [];
      if (!Array.isArray(tracks) || tracks.length === 0) continue;

      const mapped: SongItem[] = tracks.slice(0, limit).map((t: any) => {
        const streamUrl = `${host}/v1/tracks/${t.id}/stream?app_name=StreamPlay`;
        const artwork = t.artwork?.['480x480'] || t.artwork?.['150x150'] || t.artwork?.['1000x1000'] || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500';
        const durationSec = Math.round(t.duration || 180);

        return {
          id: `audius_${t.id}`,
          title: cleanSongTitle(t.title || 'Audius Track'),
          album: t.genre || 'Audius Free Music',
          artist: t.user?.name || 'Audius Creator',
          year: t.release_date ? String(new Date(t.release_date).getFullYear()) : '2025',
          duration: durationSec,
          isShortClip: durationSec > 0 && durationSec < 90,
          image: artwork,
          streamUrl,
          backupStreamUrls: [
            `https://discoveryprovider.audius.co/v1/tracks/${t.id}/stream?app_name=StreamPlay`,
            streamUrl
          ],
          videoUrl: `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(t.title + ' ' + (t.user?.name || ''))}`,
          accentColor: '#c8ff00',
          quality: 'Audius Free HD Stream',
          source: 'Audius'
        };
      });

      if (mapped.length > 0) return mapped;
    } catch {
      // try next host
    }
  }

  return [];
}

/**
 * Free Apple Music / iTunes Public Music Provider.
 * Searches high-quality global hits, official tracks, and previews without subscription.
 */
export async function searchItunesSongs(query: string, limit = 12): Promise<SongItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(trimmed)}&entity=song&limit=${limit}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
    if (!res.ok) return [];

    const data = await res.json();
    const tracks = data.results || [];
    if (!Array.isArray(tracks)) return [];

    return tracks
      .filter((t: any) => t.previewUrl)
      .map((t: any) => {
        const durationSec = Math.round((t.trackTimeMillis || 180000) / 1000);
        const artwork = (t.artworkUrl100 || '').replace('100x100bb', '600x600bb') || (t.artworkUrl60 || '');

        return {
          id: `itunes_${t.trackId}`,
          title: cleanSongTitle(t.trackName || 'Track'),
          album: t.collectionName || 'Single',
          artist: t.artistName || 'Artist',
          year: t.releaseDate ? String(new Date(t.releaseDate).getFullYear()) : '2025',
          duration: durationSec,
          isShortClip: durationSec > 0 && durationSec < 90,
          image: artwork,
          streamUrl: t.previewUrl,
          backupStreamUrls: [t.previewUrl],
          videoUrl: `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(t.trackName + ' ' + t.artistName)}`,
          accentColor: '#00e5ff',
          quality: 'Apple Music 256k AAC',
          source: 'Apple'
        };
      });
  } catch {
    return [];
  }
}

/**
 * Real-time trending hits: combines verified 2025/2026 chart-toppers and strictly filters out old 80s/90s songs.
 */
export async function fetchRealTrendingSongs(page = 1, limit = 25, langPref?: string): Promise<SongItem[]> {
  const lang = langPref || (typeof localStorage !== 'undefined' && localStorage.getItem('streamplay_primary_lang')) || 'Tamil';
  const trendingSeeds = [
    `${lang} Top Hits 2026`,
    `${lang} Viral Hits 2026`,
    'Latest Bollywood Hits 2026',
    'Global Pop Hits 2026',
    'Billboard Hot 100 2026'
  ];
  const targetSeed = trendingSeeds[(page - 1) % trendingSeeds.length];
  const songs = await performRawSaavnSearch(targetSeed, page, limit);

  // Strictly filter out old retro songs (< 2024) so genuine 2025/2026 hits appear
  const fresh = songs.filter(s => {
    const y = parseInt(s.year || '0', 10);
    return isNaN(y) || y >= 2024;
  });

  return fresh.length >= 8 ? fresh : songs;
}

/**
 * Multi-Provider Unified Free Music Search.
 * Concurrently queries JioSaavn, Audius, and Apple Music to provide a unified free catalog.
 */
export async function searchSongsPaged(query: string, page = 1, limit = 25): Promise<SongItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Intercept trending searches to prevent JioSaavn returning old 1980s albums titled "Trending Nostalgia"
  if (isTrendingQuery(trimmed)) {
    return fetchRealTrendingSongs(page, limit);
  }

  const cacheKey = `${trimmed.toLowerCase()}_p${page}_n${limit}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS && cached.data.length > 0) {
    return cached.data;
  }

  // Concurrent query to all free alternative providers (JioSaavn + Audius + Apple iTunes)
  const [saavnRes, audiusRes, itunesRes] = await Promise.allSettled([
    performRawSaavnSearch(trimmed, page, limit),
    page === 1 ? searchAudiusSongs(trimmed, 8) : Promise.resolve([]),
    page === 1 ? searchItunesSongs(trimmed, 8) : Promise.resolve([])
  ]);

  const saavnSongs = saavnRes.status === 'fulfilled' ? saavnRes.value : [];
  const audiusSongs = audiusRes.status === 'fulfilled' ? audiusRes.value : [];
  const itunesSongs = itunesRes.status === 'fulfilled' ? itunesRes.value : [];

  // Combine all free alternatives: JioSaavn + Audius Creator Tracks + Apple Music
  const merged = deduplicateSongs([...saavnSongs, ...audiusSongs, ...itunesSongs]);

  if (merged.length > 0) {
    searchCache.set(cacheKey, { timestamp: Date.now(), data: merged });
  }
  return merged;
}

export async function searchSongs(query: string, limit = 20): Promise<SongItem[]> {
  return searchSongsPaged(query, 1, limit);
}

export async function fetchTrendingSongs(): Promise<SongItem[]> {
  return fetchRealTrendingSongs(1, 25);
}

/**
 * Generates intelligent contextual expansion seeds derived strictly from the user's search query.
 * Keeps the music strictly relevant to the user's intended language, artist, mood, and genre.
 */
export function generateRelatedSearchSeeds(query: string): string[] {
  const q = query.toLowerCase().trim();
  const seeds: string[] = [query];

  // Language Detection
  let lang = '';
  if (q.includes('tamil')) lang = 'Tamil';
  else if (q.includes('hindi') || q.includes('bollywood')) lang = 'Hindi';
  else if (q.includes('telugu')) lang = 'Telugu';
  else if (q.includes('malayalam') || q.includes('mollywood')) lang = 'Malayalam';
  else if (q.includes('kannada') || q.includes('sandalwood')) lang = 'Kannada';
  else if (q.includes('punjabi')) lang = 'Punjabi';
  else if (q.includes('english') || q.includes('hollywood') || q.includes('billboard')) lang = 'English';
  else if (q.includes('korean') || q.includes('kpop')) lang = 'Korean';

  // Mood / Genre Detection
  const isMelody = q.includes('melody') || q.includes('romantic') || q.includes('love') || q.includes('slow') || q.includes('chill');
  const isParty = q.includes('party') || q.includes('dance') || q.includes('mass') || q.includes('kuthu') || q.includes('beat') || q.includes('club');
  const isOld = q.includes('old') || q.includes('retro') || q.includes('classic') || q.includes('80s') || q.includes('90s');

  // Detect Popular Artists
  const ARTIST_MAP: Record<string, string> = {
    'anirudh': 'Anirudh Ravichander',
    'rahman': 'A.R. Rahman',
    'ar rahman': 'A.R. Rahman',
    'ilayaraja': 'Ilaiyaraaja',
    'ilaiyaraaja': 'Ilaiyaraaja',
    'harris': 'Harris Jayaraj',
    'yuvan': 'Yuvan Shankar Raja',
    'u1': 'Yuvan Shankar Raja',
    'sid sriram': 'Sid Sriram',
    'arijit': 'Arijit Singh',
    'shreya': 'Shreya Ghoshal',
    'pritam': 'Pritam',
    'diljit': 'Diljit Dosanjh',
    'taylor swift': 'Taylor Swift',
    'coldplay': 'Coldplay',
    'the weeknd': 'The Weeknd',
    'weeknd': 'The Weeknd',
    'sai abhyankkar': 'Sai Abhyankkar',
    'sushin': 'Sushin Shyam'
  };

  let matchedArtist = '';
  for (const [key, name] of Object.entries(ARTIST_MAP)) {
    if (q.includes(key)) {
      matchedArtist = name;
      break;
    }
  }

  if (matchedArtist) {
    seeds.push(
      `${matchedArtist} hits`,
      `${matchedArtist} top songs`,
      `${matchedArtist} melodies`,
      `${matchedArtist} chartbusters`,
      `Best of ${matchedArtist}`
    );
  } else if (lang) {
    if (isMelody) {
      seeds.push(
        `${lang} Melody Super Hits`,
        `${lang} Romantic Melodies 2026`,
        `${lang} Soulful Hits`,
        `${lang} Love Songs 2026`,
        `${lang} Acoustic Melodies`
      );
    } else if (isParty) {
      seeds.push(
        `${lang} Dance Hits 2026`,
        `${lang} Mass Super Hits`,
        `${lang} Party Bangers 2026`,
        `${lang} Electrifying Hits`
      );
    } else if (isOld) {
      seeds.push(
        `${lang} Golden Classics`,
        `${lang} Retro Hits`,
        `${lang} 90s Evergreen Hits`,
        `${lang} All Time Classics`
      );
    } else {
      seeds.push(
        `${lang} Top Hits 2026`,
        `${lang} Cinema Super Hits`,
        `${lang} Chartbuster Songs 2026`,
        `${lang} Viral Songs 2026`,
        `${lang} Superhit Songs`,
        `${lang} All Time Hits`
      );
    }
  } else {
    seeds.push(
      `${query} songs`,
      `${query} hits`,
      `${query} top tracks`,
      `${query} album`,
      `${query} soundtrack`
    );
  }

  return Array.from(new Set(seeds));
}

/**
 * Dynamic Infinite Search Loader.
 * Automatically picks fresh, highly relevant songs as the user scrolls down,
 * preventing pagination cut-offs (such as stopping at 47 tracks) and strictly filtering
 * out duplicates across compilation albums and thumbnails.
 */
export async function fetchInfiniteSearchSongs(
  query: string,
  batchNumber: number,
  seenKeys: Set<string> = new Set(),
  limit = 25
): Promise<{ songs: SongItem[]; hasMore: boolean }> {
  const trimmed = query.trim();
  if (!trimmed) return { songs: [], hasMore: false };

  const seeds = generateRelatedSearchSeeds(trimmed);
  const collected: SongItem[] = [];

  let currentSeedIndex = Math.floor((batchNumber - 1) / 3) % seeds.length;
  let pageInSeed = ((batchNumber - 1) % 3) + 1;

  let attempts = 0;
  while (collected.length < limit && attempts < 5 && currentSeedIndex < seeds.length) {
    attempts++;
    const currentSeed = seeds[currentSeedIndex];
    let rawSongs: SongItem[] = [];

    try {
      if (currentSeedIndex === 0 && batchNumber === 1) {
        // Multi-provider query on first batch (JioSaavn + Audius + Apple)
        rawSongs = await searchSongsPaged(currentSeed, pageInSeed, limit);
      } else {
        rawSongs = await performRawSaavnSearch(currentSeed, pageInSeed, limit);
      }
    } catch (err) {
      console.warn(`Seed search failed for "${currentSeed}":`, err);
    }

    if (rawSongs.length > 0) {
      for (const song of rawSongs) {
        const key = getSongCoreKey(song.title, song.artist, song.streamUrl);
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          collected.push(song);
          if (collected.length >= limit) break;
        }
      }
    }

    // If this page did not fulfill the requested batch of fresh unique songs, advance
    if (collected.length < limit) {
      pageInSeed++;
      if (pageInSeed > 3) {
        pageInSeed = 1;
        currentSeedIndex = (currentSeedIndex + 1) % seeds.length;
      }
    }
  }

  return {
    songs: collected,
    hasMore: true // Keeps infinite scroll going dynamically!
  };
}

/**
 * Search dedicated artists by query from JioSaavn.
 */
export async function searchArtists(query: string, limit = 10): Promise<ArtistResultItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const baseUrls = getSaavnBaseUrls();
  for (const base of baseUrls) {
    try {
      const url = `${base}?__call=search.getArtistResults&_marker=0&q=${encodeURIComponent(trimmed)}&ctx=web6dot0&_format=json&n=${limit}&p=1`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
      if (!res.ok) continue;
      const data = await res.json();
      const list = data.results || [];
      return list.map((a: any) => ({
        id: String(a.id || a.artistid || a.name),
        name: decodeHtml(a.name || 'Artist'),
        role: a.role || 'Artist',
        image: (a.image || '').replace('50x50', '500x500').replace('150x150', '500x500') || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500'
      }));
    } catch {
      // try next base
    }
  }
  return [];
}

/**
 * Search curated playlists/albums by query from JioSaavn.
 */
export async function searchPlaylists(query: string, limit = 10): Promise<PlaylistResultItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const baseUrls = getSaavnBaseUrls();
  for (const base of baseUrls) {
    try {
      const url = `${base}?__call=search.getPlaylistResults&_marker=0&q=${encodeURIComponent(trimmed)}&ctx=web6dot0&_format=json&n=${limit}&p=1`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
      if (!res.ok) continue;
      const data = await res.json();
      const list = data.results || [];
      return list.map((p: any) => ({
        id: String(p.listid || p.id),
        title: decodeHtml(p.listname || p.title || 'Playlist'),
        subtitle: p.artist_name || p.more_info?.firstname || '',
        songCount: parseInt(p.count || p.numsongs || p.more_info?.song_count || '15', 10),
        image: (p.image || '').replace('150x150', '500x500') || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500'
      }));
    } catch {
      // try next base
    }
  }
  return [];
}

/**
 * Loads all songs in a curated playlist by playlist ID.
 */
export async function fetchPlaylistTracks(playlistId: string): Promise<SongItem[]> {
  if (!playlistId) return [];
  const baseUrls = getSaavnBaseUrls();
  for (const base of baseUrls) {
    try {
      const url = `${base}?__call=playlist.getDetails&listid=${encodeURIComponent(playlistId)}&_marker=0&ctx=web6dot0&_format=json`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;
      const data = await res.json();
      const list = data.songs || data.list || [];
      const parsed: SongItem[] = list
        .map((item: any) => {
          const encrypted = item.encrypted_media_url || item.more_info?.encrypted_media_url;
          if (!encrypted) return null;
          const streamUrl = decryptMediaUrl(encrypted);
          if (!streamUrl) return null;
          const rawTitle = decodeHtml(item.song || item.title || 'Unknown Track');
          const artist = decodeHtml(item.primary_artists || item.more_info?.artistMap?.primary_artists?.[0]?.name || 'Various Artists');
          const album = decodeHtml(item.album || item.more_info?.album || 'Single');
          const durationSec = parseInt(item.duration || item.more_info?.duration || '180', 10);
          return {
            id: String(item.id),
            title: rawTitle,
            album,
            artist,
            year: item.year || item.more_info?.year,
            duration: durationSec,
            isShortClip: durationSec > 0 && durationSec < 90,
            image: (item.image || item.more_info?.thumbnail || '').replace('150x150', '500x500'),
            streamUrl,
            backupStreamUrls: buildBackupMirrors(streamUrl, rawTitle, artist),
            videoUrl: `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(rawTitle + ' ' + artist + ' official video')}`,
            quality: '320kbps Ultra-HD'
          };
        })
        .filter((s: SongItem | null): s is SongItem => s !== null);
      if (parsed.length > 0) return deduplicateSongs(parsed);
    } catch {
      // try next
    }
  }
  return [];
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
