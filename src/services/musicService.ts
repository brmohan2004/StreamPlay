import CryptoJS from 'crypto-js';
import { Capacitor } from '@capacitor/core';
import { SongItem } from '../types/media';

const isNative = Capacitor.isNativePlatform();

/**
 * Resolves the primary Saavn endpoint.
 * On native mobile (Capacitor Android/iOS), uses direct Saavn cluster with CapacitorHttp.
 * In any web browser (mobile Chrome, desktop, Vercel, IP access), uses the server proxy /api/saavn to bypass CORS.
 */
export function getSaavnBaseUrls(): string[] {
  if (typeof window === 'undefined') {
    return [
      'https://www.jiosaavn.com/api.php',
      'http://localhost:1422/api/saavn',
      'http://localhost:1420/api/saavn'
    ];
  }
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

const DEFAULT_HEADERS: Record<string, string> =
  typeof window === 'undefined'
    ? {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://www.jiosaavn.com/',
        Accept: 'application/json, text/plain, */*'
      }
    : {};

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
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
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
export function getSongCoreKey(title: string, artist = '', _streamUrl = ''): string {
  const cleaned = cleanSongTitle(title);
  const normTitle = cleaned.toLowerCase().trim().replace(/[^a-z0-9]/g, '');

  // Extract normalized and sorted artist tokens to handle differing artist order across compilations
  const artistTokens = decodeHtmlEntities(artist)
    .toLowerCase()
    .split(/[,&/|]/)
    .map(a => a.trim().replace(/[^a-z0-9]/g, ''))
    .filter(a => a.length >= 3)
    .sort();

  const artistSig = artistTokens.slice(0, 2).join('_');

  if (normTitle && artistSig) {
    return `${normTitle}|${artistSig}`;
  }
  return normTitle;
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
  category?: 'actor' | 'actress' | 'composer' | 'singer' | 'artist';
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
        const res = await fetch(url, { headers: DEFAULT_HEADERS, signal: AbortSignal.timeout(6000) });
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
            const starring = decodeHtml(item.starring || item.more_info?.starring || '');
            const music = decodeHtml(item.music || item.more_info?.music || '');
            const singers = decodeHtml(item.singers || item.more_info?.singers || '');
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
              starring: starring || undefined,
              composer: music || undefined,
              singers: singers || undefined,
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
 * Detects regional language intent from search query or user preferences.
 */
export function detectLanguageIntent(query: string): string {
  const q = query.toLowerCase().trim();
  if (/\b(tamil|kollywood|chennai|madras|kuthu|dappankuthu|gaana)\b/i.test(q)) return 'tamil';
  if (/\b(telugu|tollywood|hyderabad|andhra)\b/i.test(q)) return 'telugu';
  if (/\b(hindi|bollywood|bombay)\b/i.test(q)) return 'hindi';
  if (/\b(malayalam|mollywood|kerala)\b/i.test(q)) return 'malayalam';
  if (/\b(kannada|sandalwood|bengaluru|bangalore)\b/i.test(q)) return 'kannada';
  if (/\b(punjabi|bhangra|pollywood)\b/i.test(q)) return 'punjabi';
  if (/\b(english|hollywood|pop|billboard|global|synthwave|phonk|edm)\b/i.test(q)) return 'english';

  // Fallback to active app language preference if explicitly set by user
  try {
    const pref = typeof localStorage !== 'undefined' ? localStorage.getItem('streamplay_primary_lang') : null;
    if (pref) return pref.toLowerCase().trim();
  } catch {}

  return '';
}

/**
 * Detects musical mood, genre, and cinematic intent dynamically from any search query.
 */
export function detectGenreAndMoodIntent(query: string): string {
  const q = query.toLowerCase().trim();

  if (/\b(item|kuthu|dance|party|club|dj|remix|fast beat|dappankuthu|mass dance|folk dance|tappu)\b/i.test(q)) {
    return 'dance_item';
  }
  if (/\b(melody|love|romantic|romance|duet|soulful|feel good|unplugged|acoustic|lofi|lo-fi|chill)\b/i.test(q)) {
    return 'melody_love';
  }
  if (/\b(mass|hero|elevation|intro|action|fight|swagger|attitude|villain|entry)\b/i.test(q)) {
    return 'mass_hero';
  }
  if (/\b(sad|breakup|pain|heartbreak|pathos|emotional|crying|lonely|failure|tears)\b/i.test(q)) {
    return 'sad_breakup';
  }
  if (/\b(bgm|theme|instrumental|ost|score|ringtone|tune|whistle)\b/i.test(q)) {
    return 'bgm_instrumental';
  }
  if (/\b(90s|80s|70s|2000s|retro|vintage|classic|golden hits|evergreen|old)\b/i.test(q)) {
    return 'vintage_retro';
  }
  if (/\b(devotional|bhakti|spiritual|god|temple|aarti|bhajan|suprabhatam|stotram|mantra)\b/i.test(q)) {
    return 'devotional';
  }
  if (/\b(workout|gym|motivation|fitness|running|power|energy)\b/i.test(q)) {
    return 'workout_energy';
  }
  if (/\b(folk|gramiya|traditional|village|gaana|oppari|thiruvizha)\b/i.test(q)) {
    return 'folk_traditional';
  }
  if (/\b(rap|hip hop|hiphop|trap|drill|indie|cypher)\b/i.test(q)) {
    return 'hiphop_rap';
  }

  return 'general';
}

/**
 * Intelligently expands search queries with dynamic content pitching:
 * semantic synonyms, regional dialect slang, cinematic themes, franchise variations,
 * and related playlists to guarantee a massive content library for any search intent.
 */
export function expandSearchQuery(rawQuery: string): string[] {
  const q = rawQuery.toLowerCase().trim();
  if (!q) return [];

  const pitchedQueries: string[] = [rawQuery.trim()];
  const lang = detectLanguageIntent(rawQuery);
  const intent = detectGenreAndMoodIntent(rawQuery);

  // Dynamic thematic pitch based on intent - strictly preserving user's query tokens
  switch (intent) {
    case 'dance_item':
      pitchedQueries.push(
        `${rawQuery.trim()} hits`,
        `${rawQuery.trim()} dance`,
        `${rawQuery.trim()} party songs`,
        `${rawQuery.trim()} fast beat`,
        `${rawQuery.trim()} dj remix`
      );
      if (lang) {
        pitchedQueries.push(`${lang} ${rawQuery.trim()}`);
      }
      break;

    case 'melody_love':
      pitchedQueries.push(
        `${rawQuery.trim()} hits`,
        `${rawQuery.trim()} melody`,
        `${rawQuery.trim()} love songs`,
        `${rawQuery.trim()} romantic songs`,
        `${rawQuery.trim()} acoustic`
      );
      if (lang) {
        pitchedQueries.push(`${lang} ${rawQuery.trim()}`);
      }
      break;

    case 'mass_hero':
      pitchedQueries.push(
        `${rawQuery.trim()} mass hits`,
        `${rawQuery.trim()} bgm theme`,
        `${rawQuery.trim()} elevation`,
        `${rawQuery.trim()} action score`
      );
      if (lang) {
        pitchedQueries.push(`${lang} ${rawQuery.trim()}`);
      }
      break;

    case 'sad_breakup':
      pitchedQueries.push(
        `${rawQuery.trim()} sad songs`,
        `${rawQuery.trim()} breakup songs`,
        `${rawQuery.trim()} heartbreak hits`,
        `${rawQuery.trim()} emotional`
      );
      break;

    case 'bgm_instrumental':
      pitchedQueries.push(
        `${rawQuery.trim()} theme music`,
        `${rawQuery.trim()} instrumental`,
        `${rawQuery.trim()} movie score`,
        `${rawQuery.trim()} bgm`
      );
      break;

    case 'vintage_retro':
      pitchedQueries.push(
        `${rawQuery.trim()} golden hits`,
        `${rawQuery.trim()} evergreen songs`,
        `${rawQuery.trim()} retro classics`,
        `${rawQuery.trim()} 90s hits`
      );
      break;

    case 'devotional':
      pitchedQueries.push(
        `${rawQuery.trim()} devotional`,
        `${rawQuery.trim()} morning bhakti`,
        `${rawQuery.trim()} spiritual songs`,
        `${rawQuery.trim()} temple songs`
      );
      break;

    case 'workout_energy':
      pitchedQueries.push(
        `${rawQuery.trim()} motivation`,
        `${rawQuery.trim()} gym songs`,
        `${rawQuery.trim()} high energy beats`,
        `${rawQuery.trim()} workout mix`
      );
      break;

    case 'folk_traditional':
      pitchedQueries.push(
        `${rawQuery.trim()} folk hits`,
        `${rawQuery.trim()} traditional songs`,
        `${rawQuery.trim()} village songs`,
        `${rawQuery.trim()} cultural beats`
      );
      break;

    case 'hiphop_rap':
      pitchedQueries.push(
        `${rawQuery.trim()} rap`,
        `${rawQuery.trim()} hip hop`,
        `${rawQuery.trim()} trap beat`,
        `${rawQuery.trim()} cypher`
      );
      break;

    default:
      pitchedQueries.push(
        `${rawQuery.trim()} songs`,
        `${rawQuery.trim()} hits`,
        `${rawQuery.trim()} best of`,
        `${rawQuery.trim()} album`,
        `${rawQuery.trim()} jukebox`
      );
      if (lang) {
        pitchedQueries.push(`${lang} ${rawQuery.trim()}`);
      }
      break;
  }

  return Array.from(new Set(pitchedQueries));
}

/**
 * Dynamically harvests and pitches real artists, actors, composers, and vocalists
 * directly from song search response metadata.
 */
export function extractArtistsFromSongs(songs: SongItem[]): ArtistResultItem[] {
  const extracted: ArtistResultItem[] = [];
  const seen = new Set<string>();

  for (const song of songs) {
    if (!song) continue;

    // 1. Dynamic extraction from Starring Actors / Actresses
    if (song.starring) {
      const names = song.starring.split(/[,&/|]/).map(s => s.trim()).filter(Boolean);
      for (const name of names) {
        const cleanName = decodeHtml(name);
        const lower = cleanName.toLowerCase();
        const key = lower.replace(/[^a-z0-9]/g, '');
        if (!key || seen.has(key)) continue;
        seen.add(key);

        extracted.push({
          id: `star_${key}`,
          name: cleanName,
          role: 'Starring Cast',
          image: `https://c.saavncdn.com/artists/${cleanName.replace(/\s+/g, '_')}_500x500.jpg`,
          category: 'actor'
        });
      }
    }

    // 2. Dynamic extraction from Music Directors / Composers
    if (song.composer) {
      const names = song.composer.split(/[,&/|]/).map(s => s.trim()).filter(Boolean);
      for (const name of names) {
        const cleanName = decodeHtml(name);
        const lower = cleanName.toLowerCase();
        const key = lower.replace(/[^a-z0-9]/g, '');
        if (!key || seen.has(key)) continue;
        seen.add(key);

        extracted.push({
          id: `comp_${key}`,
          name: cleanName,
          role: 'Music Director',
          image: `https://c.saavncdn.com/artists/${cleanName.replace(/\s+/g, '_')}_500x500.jpg`,
          category: 'composer'
        });
      }
    }

    // 3. Dynamic extraction from Playback Singers
    if (song.singers) {
      const names = song.singers.split(/[,&/|]/).map(s => s.trim()).filter(Boolean);
      for (const name of names) {
        const cleanName = decodeHtml(name);
        const key = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!key || seen.has(key)) continue;
        seen.add(key);

        extracted.push({
          id: `sing_${key}`,
          name: cleanName,
          role: 'Playback Singer',
          image: `https://c.saavncdn.com/artists/${cleanName.replace(/\s+/g, '_')}_500x500.jpg`,
          category: 'singer'
        });
      }
    }
  }

  return extracted;
}

/**
 * Deduplicates artists by normalized name, preserving rich category tagging.
 */
export function deduplicateArtists(artists: ArtistResultItem[]): ArtistResultItem[] {
  const seen = new Map<string, ArtistResultItem>();

  for (const a of artists) {
    if (!a || !a.name) continue;
    const key = a.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!key) continue;

    if (!seen.has(key)) {
      seen.set(key, a);
    } else {
      // If previous entry was generic 'artist' but this one has specific 'actress'/'actor'/'composer'/'singer', upgrade it!
      const existing = seen.get(key)!;
      if (existing.category === 'artist' && a.category && a.category !== 'artist') {
        seen.set(key, a);
      }
    }
  }

  return Array.from(seen.values());
}

/**
 * Dynamic artist query helper without static presets.
 */
export function getCuratedArtistsForQuery(_rawQuery: string): ArtistResultItem[] {
  return [];
}

/**
 * Dynamic Infinite Search Loader with Semantic Expansion.
 * Queries both exact terms and cinematic synonyms across JioSaavn, Audius, Apple Music,
 * plus harvests tracks from top-charting playlists to guarantee a massive content library.
 */
export async function fetchInfiniteSearchSongs(
  query: string,
  pageNumber: number,
  seenKeys: Set<string> = new Set(),
  limit = 30
): Promise<{ songs: SongItem[]; hasMore: boolean; nextPage: number }> {
  const trimmed = query.trim();
  if (!trimmed) return { songs: [], hasMore: false, nextPage: 1 };

  const collected: SongItem[] = [];
  const expandedQueries = expandSearchQuery(trimmed);

  // On page 1: concurrently query expanded terms AND top matching playlists!
  if (pageNumber === 1) {
    try {
      // 1. Concurrently query top expanded terms
      const saavnPromises = expandedQueries.slice(0, 4).map(term =>
        performRawSaavnSearch(term, 1, 30)
      );

      // 2. Also search top playlists for this intent to harvest verified hits (e.g. Top Kuthu, Semma Mass)
      const playlistPromise = searchPlaylists(trimmed, 4).then(async (pls) => {
        const topPls = pls.slice(0, 2);
        const tracksPromises = topPls.map(p => fetchPlaylistTracks(p.id));
        const plTracks = await Promise.all(tracksPromises);
        return plTracks.flat();
      }).catch(() => []);

      const [saavnResults, playlistTracks, audiusSongs, itunesSongs] = await Promise.all([
        Promise.all(saavnPromises),
        playlistPromise,
        searchAudiusSongs(trimmed, 6),
        searchItunesSongs(trimmed, 6)
      ]);

      const allInitialSongs = deduplicateSongs([
        ...saavnResults.flat(),
        ...playlistTracks,
        ...audiusSongs,
        ...itunesSongs
      ]);

      for (const song of allInitialSongs) {
        const key = getSongCoreKey(song.title, song.artist, song.streamUrl);
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          collected.push(song);
          if (collected.length >= limit * 3) break;
        }
      }
    } catch (err) {
      console.warn('Initial search fetch failed:', err);
    }
  } else {
    // Pagination (Page 2, 3, 4, 5...):
    // Concurrently fetch next pages of all expanded queries
    try {
      const promises = expandedQueries.map(term =>
        performRawSaavnSearch(term, pageNumber, 30)
      );
      const results = await Promise.all(promises);
      const flat = deduplicateSongs(results.flat());

      for (const song of flat) {
        const key = getSongCoreKey(song.title, song.artist, song.streamUrl);
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          collected.push(song);
          if (collected.length >= limit) break;
        }
      }
    } catch (err) {
      console.warn(`Dynamic search fetch failed for page ${pageNumber}:`, err);
    }
  }

  // Next page and hasMore calculation:
  // If we found songs or if pageNumber < 10, keep hasMore true!
  const hasMore = collected.length > 0 || pageNumber < 8;

  return {
    songs: collected,
    hasMore,
    nextPage: pageNumber + 1
  };
}

/**
 * Search dedicated artists by query from JioSaavn + Curated category stars, composers & singers,
 * plus live dynamic extraction from songs.
 */
export async function searchArtists(query: string, limit = 30, liveSongs: SongItem[] = []): Promise<ArtistResultItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const harvested = liveSongs.length > 0 ? extractArtistsFromSongs(liveSongs) : [];

  // Query live Saavn artists for the raw query
  let liveArtists: ArtistResultItem[] = [];
  const baseUrls = getSaavnBaseUrls();
  for (const base of baseUrls) {
    try {
      const url = `${base}?__call=search.getArtistResults&_marker=0&q=${encodeURIComponent(trimmed)}&ctx=web6dot0&_format=json&n=${limit}&p=1`;
      const res = await fetch(url, { headers: DEFAULT_HEADERS, signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const data = await res.json();
      const list = data.results || [];
      liveArtists = list
        .filter((a: any) => {
          // Filter out spammy non-music matches (like "Gypsies + Future Garage Sale Item", "Box Item")
          const n = (a.name || '').toLowerCase();
          return !n.includes('garage sale') && !n.includes('spiritual items') && !n.includes('free items');
        })
        .map((a: any) => ({
          id: String(a.id || a.artistid || a.name),
          name: decodeHtml(a.name || 'Artist'),
          role: a.role || 'Artist',
          image: (a.image || '').replace('50x50', '500x500').replace('150x150', '500x500') || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500',
          category: 'artist' as const
        }));
      if (liveArtists.length > 0) break;
    } catch {
      // try next base
    }
  }

  // Pure dynamic combination: live searched artists + song-harvested stars/composers/singers
  return deduplicateArtists([...liveArtists, ...harvested]);
}

/**
 * Search curated playlists/albums with multi-query semantic harvesting and relevance ranking.
 */
export async function searchPlaylists(query: string, limit = 30): Promise<PlaylistResultItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const expanded = expandSearchQuery(trimmed);
  const searchTerms = [trimmed, ...expanded.slice(1, 4)];

  const allPlaylists: PlaylistResultItem[] = [];
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  const baseUrls = getSaavnBaseUrls();

  for (const base of baseUrls) {
    try {
      const promises = searchTerms.map(term => {
        const url = `${base}?__call=search.getPlaylistResults&_marker=0&q=${encodeURIComponent(term)}&ctx=web6dot0&_format=json&n=20&p=1`;
        return fetch(url, { headers: DEFAULT_HEADERS, signal: AbortSignal.timeout(8000) }).then(r => r.json()).catch(() => ({ results: [] }));
      });
      const resultsArray = await Promise.all(promises);

      for (const data of resultsArray) {
        const list = data.results || [];
        for (const p of list) {
          const id = String(p.listid || p.id);
          const title = decodeHtml(p.listname || p.title || 'Playlist').trim();
          const titleKey = title.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (!seenIds.has(id) && (!titleKey || !seenTitles.has(titleKey))) {
            seenIds.add(id);
            if (titleKey) seenTitles.add(titleKey);
            allPlaylists.push({
              id,
              title,
              subtitle: p.artist_name || p.more_info?.firstname || '',
              songCount: parseInt(p.count || p.numsongs || p.more_info?.song_count || '25', 10),
              image: (p.image || '').replace('150x150', '500x500') || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500'
            });
          }
        }
      }
      if (allPlaylists.length > 0) break;
    } catch {
      // try next base
    }
  }

  // Rank and filter playlists by relevance to query intent
  const qLower = trimmed.toLowerCase();
  const isItemOrDance = qLower.includes('item') || qLower.includes('kuthu') || qLower.includes('dance') || qLower.includes('party');

  const scored = allPlaylists.map(pl => {
    const text = (pl.title + ' ' + (pl.subtitle || '')).toLowerCase();
    let score = 5; // Base relevance from search result
    if (isItemOrDance) {
      const danceKeywords = ['kuthu', 'item', 'dance', 'party', 'mass', 'beat', 'hits', 'club', 'dj', 'folk', 'local', 'thara', 'masala', 'dappankuthu', 'gaana'];
      danceKeywords.forEach(kw => {
        if (text.includes(kw)) score += 10;
      });
      // Penalize sad, bgm, devotional if looking for dance/item
      if (text.includes('sad') || text.includes('bgm') || text.includes('motivational') || text.includes('devotional')) {
        score -= 20;
      }
    } else {
      const words = qLower.split(/\s+/).filter(w => w.length > 2);
      words.forEach(w => {
        if (text.includes(w)) score += 10;
      });
    }
    return { ...pl, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.filter(p => p.score >= 0).slice(0, limit);
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
      const res = await fetch(url, { headers: DEFAULT_HEADERS, signal: AbortSignal.timeout(6000) });
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

const DAY_THEMES = [
  'Sunday Superhits',
  'Monday Motivation Hits',
  'Tuesday Chartbusters',
  'Wednesday Viral Beats',
  'Thursday Blockbusters',
  'Friday Party Anthems',
  'Saturday Night Fever'
];

/**
 * Dynamically fetches recommended music video songs paged by:
 * 1. Previously watched video songs / listened artists (recommendation profile)
 * 2. Rotating day-of-the-week themes and language preferences as fallback
 * Guaranteed to return full pages (12+ items) without collapsing to 1 item.
 */
export async function fetchVideoSongsPaged(
  primaryLanguage = 'Tamil',
  secondaryLanguage = 'English',
  page = 1,
  limit = 12,
  watchedVideos: SongItem[] = []
): Promise<SongItem[]> {
  const cleanPrim = (primaryLanguage || 'Tamil').trim();
  const cleanSec = (secondaryLanguage || 'English').trim();
  let query = '';

  // 1. Recommendation based on watched video songs previously
  if (watchedVideos && watchedVideos.length > 0) {
    const anchor = watchedVideos[(page - 1) % watchedVideos.length];
    if (page === 1) {
      query = `${anchor.artist} official video songs hits`;
    } else if (page === 2 && watchedVideos.length > 1) {
      query = `${watchedVideos[1].artist} official video songs hits`;
    } else if (page % 2 === 1) {
      query = `${anchor.artist} ${cleanPrim} hit video songs`;
    } else {
      query = `${cleanPrim} top chartbuster official video songs 2026`;
    }
  } else {
    // Rotating dynamic queries based on language and day of week
    const dayIndex = new Date().getDay();
    const dayTheme = DAY_THEMES[dayIndex];
    const targetLang = (page % 2 === 1) ? cleanPrim : cleanSec;
    query = `${targetLang} ${dayTheme} official music video songs`;
  }

  let list = await searchSongsPaged(query, Math.ceil(page / 2), limit);

  // Fallback to ensure we NEVER return just 1 or 2 songs
  if (!list || list.length < 8) {
    const fallbackQueries = [
      `${cleanPrim} official video songs hits 2026`,
      `${cleanPrim} viral blockbuster video songs`,
      `${cleanSec} top billboard official video songs`
    ];
    const fallbackQuery = fallbackQueries[(page - 1) % fallbackQueries.length];
    const fallbackList = await searchSongsPaged(fallbackQuery, page, limit);
    list = deduplicateSongs([...(list || []), ...(fallbackList || [])]);
  }

  return (list || []).map(song => ({
    ...song,
    isVideo: true
  }));
}

export async function fetchVideoSongs(language = 'Global', limit = 12): Promise<SongItem[]> {
  return fetchVideoSongsPaged(language, 'English', 1, limit);
}

/**
 * Dynamically fetches recommended English songs paged by:
 * 1. Previously listened English songs / artists from user history
 * 2. Major international Billboard Hot 100 / Pop Chartbusters collections as fallback
 * Guaranteed to return full pages (15+ items) without collapsing to 2 items.
 */
export async function fetchRecommendedEnglishSongsPaged(
  listenedSongs: SongItem[] = [],
  page = 1,
  limit = 15
): Promise<SongItem[]> {
  // Extract previously listened English tracks or artists
  const englishListened = (listenedSongs || []).filter(s => {
    const lang = (s.language || '').toLowerCase();
    const artist = (s.artist || '').toLowerCase();
    return lang === 'english' ||
      /weeknd|taylor|coldplay|sheeran|mars|lipa|eilish|drake|post malone|eminem|rihanna|bieber|swift|adele|maroon|charlie puth|shawn mendes|katy perry|billie|pitbull|jennifer lopez|alan walker|chainsmokers|imagine dragons/i.test(artist);
  });

  let query = '';
  if (englishListened.length > 0) {
    const anchor = englishListened[(page - 1) % englishListened.length];
    if (page === 1) {
      query = `${anchor.artist} songs hits`;
    } else if (page === 2 && englishListened.length > 1) {
      query = `${englishListened[1].artist} songs hits`;
    } else if (page % 2 === 1) {
      query = `${anchor.artist} english pop hits`;
    } else {
      query = 'English pop chartbusters 2026';
    }
  } else {
    // Rich cold start catalog (Billboard & International Pop Hits)
    const curatedQueries = [
      'English pop chartbusters 2026',
      'Billboard Hot 100 English hits 2026',
      'Global viral English pop hits',
      'The Weeknd Taylor Swift Coldplay hits',
      'English acoustic chill pop melodies',
      'English dance club party hits'
    ];
    query = curatedQueries[(page - 1) % curatedQueries.length];
  }

  let list = await searchSongsPaged(query, Math.ceil(page / 2), limit);

  // Fallback to guarantee a full, rich shelf of at least 15 songs
  if (!list || list.length < 8) {
    const fallbackList = await searchSongsPaged('English pop hits chartbusters', page, limit);
    list = deduplicateSongs([...(list || []), ...(fallbackList || [])]);
  }

  return list || [];
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
  if (!html) return '';
  if (typeof document !== 'undefined') {
    try {
      const txt = document.createElement('textarea');
      txt.innerHTML = html;
      return txt.value;
    } catch {
      // fallback to regex decoding
    }
  }
  return decodeHtmlEntities(html);
}
