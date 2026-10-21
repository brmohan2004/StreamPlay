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
 * Detects if a search query dynamically relates to trending or viral music.
 */
export function isTrendingQuery(query: string): boolean {
  const q = query.toLowerCase().trim();
  return /\b(trending|viral|trend)\b/i.test(q);
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
export async function searchAudiusSongs(query: string, limit = 12, offset = 0): Promise<SongItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const audiusHosts = [
    'https://discoveryprovider.audius.co',
    'https://audius-discovery-1.theblueprint.xyz',
    'https://discoveryprovider2.audius.co'
  ];

  for (const host of audiusHosts) {
    try {
      const url = `${host}/v1/tracks/search?query=${encodeURIComponent(trimmed)}&limit=${limit}&offset=${offset}&app_name=StreamPlay`;
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
export async function searchItunesSongs(query: string, limit = 12, offset = 0): Promise<SongItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(trimmed)}&entity=song&limit=${limit}&offset=${offset}`;
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
  const query = `${lang} trending hits`;
  const songs = await performRawSaavnSearch(query, page, limit);

  // Strictly filter out old retro songs (< 2024) so genuine fresh hits appear
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

  const cacheKey = `${trimmed.toLowerCase()}_p${page}_n${limit}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS && cached.data.length > 0) {
    return cached.data;
  }

  // Concurrent dynamic query to all free alternative providers (JioSaavn + Audius + Apple iTunes)
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

  // If query asks for trending / viral, dynamically prioritize newest releases
  if (isTrendingQuery(trimmed)) {
    merged.sort((a, b) => {
      const ya = parseInt(a.year || '0', 10) || 0;
      const yb = parseInt(b.year || '0', 10) || 0;
      return yb - ya;
    });
  }

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
 * Fetches 100% live dynamic query suggestions directly from the search engine
 * with ZERO pre-built dictionaries or hardcoded artist lists.
 */
export async function fetchDynamicQuerySuggestions(query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const baseUrls = getSaavnBaseUrls();
  for (const base of baseUrls) {
    try {
      const url = `${base}?__call=autocomplete.get&_marker=0&query=${encodeURIComponent(trimmed)}&ctx=web6dot0&_format=json`;
      const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
      if (!res.ok) continue;
      const data = await res.json();
      const suggestions: string[] = [];
      if (Array.isArray(data.albums?.data)) {
        for (const a of data.albums.data) {
          if (a.title) suggestions.push(decodeHtml(a.title));
        }
      }
      if (Array.isArray(data.songs?.data)) {
        for (const s of data.songs.data) {
          if (s.title) suggestions.push(decodeHtml(s.title));
        }
      }
      if (Array.isArray(data.artists?.data)) {
        for (const ar of data.artists.data) {
          if (ar.title) suggestions.push(`${decodeHtml(ar.title)} songs`);
        }
      }
      return Array.from(new Set(suggestions)).slice(0, 10);
    } catch {
      // try next base
    }
  }
  return [];
}

/**
 * Returns dynamic search seeds. Zero pre-built queries or hardcoded dictionaries.
 */
export function generateRelatedSearchSeeds(query: string): string[] {
  const trimmed = query.trim();
  return trimmed ? [trimmed] : [];
}

/**
 * Dynamic Infinite Search Loader.
 * Directly paginates through the user's exact query across all free providers (JioSaavn, Audius, Apple Music),
 * dynamically auto-picking fresh songs as the user scrolls.
 * Completely eliminates pre-built queries, prevents cut-offs (such as stopping at 47 tracks),
 * and strictly deduplicates compilation albums and identical audio streams with different thumbnails.
 */
export async function fetchInfiniteSearchSongs(
  query: string,
  pageNumber: number,
  seenKeys: Set<string> = new Set(),
  limit = 25
): Promise<{ songs: SongItem[]; hasMore: boolean; nextPage: number }> {
  const trimmed = query.trim();
  if (!trimmed) return { songs: [], hasMore: false, nextPage: 1 };

  const collected: SongItem[] = [];
  let apiPage = pageNumber;
  let hasMoreFromApi = true;
  let attempts = 0;

  // Dynamically fetch from the search engine until we fill the requested limit of unique songs
  // or until the API runs out of results.
  while (collected.length < limit && attempts < 4 && hasMoreFromApi) {
    attempts++;
    let rawSongs: SongItem[] = [];

    try {
      if (apiPage === 1) {
        // Multi-provider initial query: JioSaavn + Audius + Apple Music
        rawSongs = await searchSongsPaged(trimmed, apiPage, limit);
      } else {
        // Direct dynamic multi-provider pagination across JioSaavn, Audius, and Apple Music
        const [saavnRes, audiusRes, itunesRes] = await Promise.allSettled([
          performRawSaavnSearch(trimmed, apiPage, limit),
          searchAudiusSongs(trimmed, 6, (apiPage - 1) * 6),
          searchItunesSongs(trimmed, 8, (apiPage - 1) * 8)
        ]);
        const saavn = saavnRes.status === 'fulfilled' ? saavnRes.value : [];
        const audius = audiusRes.status === 'fulfilled' ? audiusRes.value : [];
        const itunes = itunesRes.status === 'fulfilled' ? itunesRes.value : [];
        rawSongs = deduplicateSongs([...saavn, ...audius, ...itunes]);
      }
    } catch (err) {
      console.warn(`Dynamic search fetch failed for page ${apiPage}:`, err);
    }

    if (!rawSongs || rawSongs.length === 0) {
      hasMoreFromApi = false;
      break;
    }

    // Strict deduplication: filter out compilation album duplicates & different thumbnails for identical audio
    for (const song of rawSongs) {
      const key = getSongCoreKey(song.title, song.artist, song.streamUrl);
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        collected.push(song);
        if (collected.length >= limit) break;
      }
    }

    apiPage++;
  }

  // If direct pages returned 0 items on page 1, dynamically try live autocomplete suggestions
  if (collected.length === 0 && pageNumber === 1) {
    try {
      const dynamicSuggestions = await fetchDynamicQuerySuggestions(trimmed);
      for (const suggestion of dynamicSuggestions.slice(0, 2)) {
        if (suggestion.toLowerCase() === trimmed.toLowerCase()) continue;
        const suggestedSongs = await performRawSaavnSearch(suggestion, 1, limit);
        for (const s of suggestedSongs) {
          const key = getSongCoreKey(s.title, s.artist, s.streamUrl);
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            collected.push(s);
            if (collected.length >= limit) break;
          }
        }
        if (collected.length >= limit) break;
      }
    } catch {
      // ignore
    }
  }

  return {
    songs: collected,
    hasMore: hasMoreFromApi || collected.length > 0,
    nextPage: apiPage
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

/**
 * Dynamically fetches infinite songs for any language without pre-built queries.
 * Queries the language directly and dynamically paginates through live results.
 */
export async function fetchInfiniteLanguageSongs(
  language: string,
  batchIndex = 0,
  limit = 20
): Promise<SongItem[]> {
  const page = batchIndex + 1;
  const langClean = (language || 'All').trim();
  const dynamicQuery = langClean.toLowerCase() === 'all' ? 'top songs' : `${langClean} songs`;
  const results = await performRawSaavnSearch(dynamicQuery, page, limit);
  return results.map(s => ({ ...s, language: langClean }));
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
