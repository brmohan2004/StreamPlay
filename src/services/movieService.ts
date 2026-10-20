import { MovieItem, OTTBrand, OTTMetadata } from '../types/media';

const CINEMETA_BASE = 'https://v3-cinemeta.strem.io';

export const OTT_PLATFORMS: OTTMetadata[] = [
  {
    brand: 'All',
    displayName: 'All OTTs',
    tagline: 'All streaming catalogs combined',
    accentColor: '#00d2ff',
    logoText: 'ALL',
    popularQueries: ['Action', 'Thriller', 'Popular', 'Sci-Fi', 'Comedy', 'Drama']
  },
  {
    brand: 'Netflix',
    displayName: 'Netflix',
    tagline: 'Unlimited original series & films',
    accentColor: '#E50914',
    logoText: 'NETFLIX',
    popularQueries: ['Netflix Original', 'Netflix Series', 'Netflix Film', 'Netflix 2025', 'Netflix 2026']
  },
  {
    brand: 'JioHotstar',
    displayName: 'JioHotstar',
    tagline: 'Disney, Marvel, HBO & Indian Blockbusters',
    accentColor: '#1288FF',
    logoText: 'JIOHOTSTAR',
    popularQueries: ['Hotstar Specials', 'Disney Plus', 'Marvel Studios', 'HBO Original', 'Hotstar 2025']
  },
  {
    brand: 'Prime Video',
    displayName: 'Prime Video',
    tagline: 'Amazon Originals & Global Hits',
    accentColor: '#00A8E1',
    logoText: 'PRIME',
    popularQueries: ['Amazon Original', 'Amazon Studios', 'Prime Video 2025', 'Prime Video 2026']
  },
  {
    brand: 'Apple TV+',
    displayName: 'Apple TV+',
    tagline: 'Award-winning Apple Originals',
    accentColor: '#FFFFFF',
    logoText: 'APPLE TV+',
    popularQueries: ['Apple Original', 'Apple Studios', 'Apple TV+ 2025', 'Apple TV+ 2026']
  },
  {
    brand: 'Sony LIV',
    displayName: 'Sony LIV',
    tagline: 'Original series & Premium sports drama',
    accentColor: '#FD7E14',
    logoText: 'SONYLIV',
    popularQueries: ['Sony LIV Original', 'Sony LIV Series', 'Sony Pictures', 'Sony LIV 2025']
  },
  {
    brand: 'Zee5',
    displayName: 'Zee5',
    tagline: 'Blockbuster regional cinema & originals',
    accentColor: '#A855F7',
    logoText: 'ZEE5',
    popularQueries: ['Zee5 Original', 'Zee Studios', 'Zee5 Blockbuster', 'Zee5 2025']
  }
];

let cachedTopMovies: { dateKey: string; items: MovieItem[] } | null = null;
let cachedTopSeries: MovieItem[] | null = null;
const ottCache = new Map<string, MovieItem[]>();

/**
 * Returns real-time Web Trending Movies.
 * Combines live web trending from Cinemeta with 2025/2026 releases (both theater & OTT).
 * Strictly filters out ancient/old movies so every trending card is a current hit.
 */
export async function fetchTopMovies(): Promise<MovieItem[]> {
  const todayKey = new Date().toISOString().slice(0, 10);
  if (cachedTopMovies && cachedTopMovies.dateKey === todayKey && cachedTopMovies.items.length > 0) {
    return cachedTopMovies.items;
  }

  try {
    const [topBaseRes, year26Res, year25Res] = await Promise.all([
      fetch(`${CINEMETA_BASE}/catalog/movie/top.json`).then(r => r.json()).catch(() => ({ metas: [] })),
      fetch(`${CINEMETA_BASE}/catalog/movie/year/genre=2026.json`).then(r => r.json()).catch(() => ({ metas: [] })),
      fetch(`${CINEMETA_BASE}/catalog/movie/year/genre=2025.json`).then(r => r.json()).catch(() => ({ metas: [] }))
    ]);

    const baseMovies = (topBaseRes.metas || []).map((m: any) => formatMovie(m, 'movie'));
    const year26Movies = (year26Res.metas || []).map((m: any) => formatMovie(m, 'movie'));
    const year25Movies = (year25Res.metas || []).map((m: any) => formatMovie(m, 'movie'));

    // Web trending: true real-time mix of current theatrical releases & hot OTT trending
    const pool = [...year26Movies.slice(0, 10), ...year25Movies.slice(0, 15), ...baseMovies];
    const seen = new Set<string>();
    const trendingRecent: MovieItem[] = [];

    for (const m of pool) {
      if (!m.id || seen.has(m.id)) continue;
      seen.add(m.id);

      const y = parseInt(m.releaseInfo || '0') || 0;
      // Strictly filter to current/recent titles (2025-2026) to prevent ancient movies
      if (y >= 2025) {
        trendingRecent.push(m);
      }
    }

    const result = trendingRecent.length >= 10 ? trendingRecent : pool.filter(m => (parseInt(m.releaseInfo || '0') || 0) >= 2024);
    if (result.length > 0) {
      cachedTopMovies = { dateKey: todayKey, items: result };
    }
    return result;
  } catch (err) {
    console.error('Failed to fetch web trending movies:', err);
    return [];
  }
}

export async function fetchTopSeries(): Promise<MovieItem[]> {
  if (cachedTopSeries && cachedTopSeries.length > 0) {
    return cachedTopSeries;
  }
  try {
    const [topSeriesRes, year25SeriesRes] = await Promise.all([
      fetch(`${CINEMETA_BASE}/catalog/series/top.json`).then(r => r.json()).catch(() => ({ metas: [] })),
      fetch(`${CINEMETA_BASE}/catalog/series/year/genre=2025.json`).then(r => r.json()).catch(() => ({ metas: [] }))
    ]);

    const topSeries = (topSeriesRes.metas || []).map((m: any) => formatMovie(m, 'series'));
    const yearSeries = (year25SeriesRes.metas || []).map((m: any) => formatMovie(m, 'series'));

    const seen = new Set<string>();
    const combined: MovieItem[] = [];

    for (const s of [...yearSeries.slice(0, 10), ...topSeries]) {
      if (!s.id || seen.has(s.id)) continue;
      seen.add(s.id);
      const y = parseInt(s.releaseInfo || '0') || 0;
      if (y >= 2024) {
        combined.push(s);
      }
    }

    cachedTopSeries = combined.length > 0 ? combined : topSeries;
    return cachedTopSeries || [];
  } catch (err) {
    console.error('Failed to fetch top series:', err);
    return [];
  }
}

export async function searchMoviesAndShows(query: string): Promise<MovieItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  try {
    const [movieRes, seriesRes] = await Promise.all([
      fetch(`${CINEMETA_BASE}/catalog/movie/top/search=${encodeURIComponent(trimmed)}.json`)
        .then(r => r.json())
        .catch(() => ({ metas: [] })),
      fetch(`${CINEMETA_BASE}/catalog/series/top/search=${encodeURIComponent(trimmed)}.json`)
        .then(r => r.json())
        .catch(() => ({ metas: [] }))
    ]);

    const movies = (movieRes.metas || []).map((m: any) => formatMovie(m, 'movie'));
    const series = (seriesRes.metas || []).map((m: any) => formatMovie(m, 'series'));
    return [...movies, ...series];
  } catch (err) {
    console.error('Search failed:', err);
    return [];
  }
}

export async function fetchByOTT(brand: OTTBrand, page = 0): Promise<MovieItem[]> {
  const cacheKey = `${brand}_page_${page}`;
  if (ottCache.has(cacheKey)) {
    return ottCache.get(cacheKey)!;
  }

  if (brand === 'All') {
    const [movies, series] = await Promise.all([fetchTopMovies(), fetchTopSeries()]);
    const start = page * 24;
    const combined = [...movies, ...series].slice(start, start + 36);
    ottCache.set(cacheKey, combined);
    return combined;
  }

  const platform = OTT_PLATFORMS.find(p => p.brand === brand);
  if (!platform) return [];

  try {
    const queryResults = await Promise.all(
      platform.popularQueries.map(async q => {
        const items = await searchMoviesAndShows(q);
        return items.slice(0, 5);
      })
    );

    const results: MovieItem[] = [];
    const seen = new Set<string>();
    for (const group of queryResults) {
      for (const item of group) {
        if (item && !seen.has(item.id)) {
          seen.add(item.id);
          results.push({ ...item, ottProvider: brand });
        }
      }
    }

    // Register all discovered titles into dynamic OTT registry
    registerOttMovies(results, brand);

    // Sort by rating & release year descending
    results.sort((a, b) => {
      const yearA = parseInt(a.releaseInfo || '0') || 0;
      const yearB = parseInt(b.releaseInfo || '0') || 0;
      return yearB - yearA;
    });

    if (results.length > 0) {
      ottCache.set(cacheKey, results);
    }
    return results;
  } catch (err) {
    console.error(`Failed to fetch OTT brand ${brand}:`, err);
    return [];
  }
}

function formatMovie(item: any, type: 'movie' | 'series'): MovieItem {
  return {
    id: item.id || '',
    name: item.name || 'Untitled',
    type,
    poster: item.poster || 'https://images.metahub.space/poster/small/default/img',
    background: item.background || item.poster,
    description: item.description || 'Watch now in high quality on StreamPlay.',
    releaseInfo: item.releaseInfo || item.year || '',
    imdbRating: item.imdbRating || '8.5',
    genres: item.genres || ['Drama', 'Action'],
    released: item.released
  };
}

export async function fetchGenreMovies(genre: string): Promise<MovieItem[]> {
  return fetchPagedGenreMovies(genre, 0);
}

export async function fetchPagedGenreMovies(genre: string, skip = 0): Promise<MovieItem[]> {
  try {
    const skipSuffix = skip > 0 ? `/skip=${skip}.json` : '.json';
    const res = await fetch(`${CINEMETA_BASE}/catalog/movie/top/genre=${encodeURIComponent(genre)}${skipSuffix}`);
    const data = await res.json();
    return (data.metas || []).map((m: any) => formatMovie(m, 'movie'));
  } catch (err) {
    console.error(`Failed to fetch genre ${genre} skip ${skip}:`, err);
    return [];
  }
}

// === Dynamic Regional Cinema Search Terms (No hardcoded film names) ===
export const DYNAMIC_LANGUAGE_QUERIES: Record<string, string[]> = {
  Tamil: ['Tamil 2026', 'Tamil 2025', 'Tamil 2024', 'Tamil Cinema', 'Kollywood'],
  Telugu: ['Telugu 2026', 'Telugu 2025', 'Telugu 2024', 'Telugu Cinema', 'Tollywood'],
  Hindi: ['Hindi 2026', 'Hindi 2025', 'Hindi 2024', 'Bollywood', 'Hindi Cinema'],
  Malayalam: ['Malayalam 2026', 'Malayalam 2025', 'Malayalam 2024', 'Mollywood'],
  Kannada: ['Kannada 2026', 'Kannada 2025', 'Kannada 2024', 'Sandalwood'],
  English: ['2026', '2025', 'Hollywood', 'English Action', 'English Sci-Fi'],
  Korean: ['Korean 2026', 'Korean 2025', 'K-Drama', 'Korean Cinema']
};

/**
 * Dynamically fetches language movies with multi-query pagination and
 * STRICT sorting from recently released (2026, 2025, 2024) to older classics.
 */
export async function fetchInfiniteLanguageMovies(
  language: string,
  batchIndex = 0,
  limit = 40
): Promise<MovieItem[]> {
  const terms = DYNAMIC_LANGUAGE_QUERIES[language] || [`${language} 2026`, `${language} 2025`, `${language} Cinema`];
  const queryIndex = batchIndex % terms.length;
  const currentTerms = [terms[queryIndex], terms[(queryIndex + 1) % terms.length]];

  const queryResults = await Promise.all(
    currentTerms.map(async q => {
      const list = await searchMoviesAndShows(q);
      return list;
    })
  );

  const flatList: MovieItem[] = [];
  const seenIds = new Set<string>();

  for (const group of queryResults) {
    for (const movie of group) {
      if (!seenIds.has(movie.id)) {
        seenIds.add(movie.id);
        flatList.push({
          ...movie,
          language
        });
      }
    }
  }

  // Strict sorting: Recently Released (newest year) to Oldest
  flatList.sort((a, b) => {
    const yearA = parseInt(a.releaseInfo || '0') || 0;
    const yearB = parseInt(b.releaseInfo || '0') || 0;
    return yearB - yearA;
  });

  return flatList.slice(0, limit);
}

export async function fetchLanguageMovies(language: string): Promise<MovieItem[]> {
  return fetchInfiniteLanguageMovies(language, 0, 40);
}

// Dynamic runtime registry of all movies discovered to be released on OTT platforms
export const dynamicOttCatalogIds = new Set<string>();
export const dynamicOttTitles = new Set<string>();

export function registerOttMovies(movies: MovieItem[], ottBrand?: string): void {
  for (const m of movies) {
    if (m.id) dynamicOttCatalogIds.add(m.id);
    if (m.name) {
      dynamicOttTitles.add(m.name.toLowerCase().replace(/[^a-z0-9]/g, ''));
    }
    if (ottBrand && ottBrand !== 'All') {
      m.ottProvider = ottBrand as any;
    }
  }
}

/**
 * Dynamically determines whether a movie has already been released on OTT.
 * Criteria (100% dynamic - no static lists):
 * 1. Has an OTT streaming provider tag (Netflix, Prime, Hotstar, etc.)
 * 2. Exists in our dynamic OTT catalog registry
 * 3. Release date / year evaluation: Theatrical exclusivity is strictly 45-60 days (~8 weeks).
 *    Any movie released more than 60 days ago or from previous release years (< 2026) has
 *    already finished its theatrical exclusive run and dropped on OTT platforms.
 */
export function isMovieReleasedOnOTT(
  item: MovieItem | { name: string; releaseInfo?: string; released?: string; ottProvider?: string; id?: string } | string,
  explicitOttProvider?: string
): boolean {
  if (typeof item === 'string') {
    if (explicitOttProvider && explicitOttProvider !== 'All') return true;
    const clean = item.toLowerCase().replace(/[^a-z0-9]/g, '');
    return dynamicOttTitles.has(clean);
  }

  // 1. Explicit OTT Provider assigned
  if ((item.ottProvider && item.ottProvider !== 'All') || (explicitOttProvider && explicitOttProvider !== 'All')) {
    return true;
  }

  // 2. Present in dynamic OTT Catalog
  if (item.id && dynamicOttCatalogIds.has(item.id)) {
    return true;
  }
  if (item.name) {
    const clean = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (dynamicOttTitles.has(clean)) return true;
  }

  // 3. Dynamic theatrical exclusivity window check
  // Cinema exclusivity is strictly 45-60 days. Anything older has moved to OTT/digital.
  const year = parseInt(item.releaseInfo || '0') || 0;
  if (year > 0 && year < 2026) {
    return true;
  }

  if (item.released) {
    const releaseTime = new Date(item.released).getTime();
    if (!isNaN(releaseTime)) {
      const daysSinceRelease = (Date.now() - releaseTime) / (1000 * 60 * 60 * 24);
      if (daysSinceRelease > 60) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Dedicated In-Theaters Section.
 * Dynamically fetches current theatrical releases from live Cinemeta.
 * STRICT CHECK: Once a movie is released on OTT, it is automatically filtered out
 * and NOT shown in this section. Only movies strictly in theatrical exclusivity are shown.
 */
export async function fetchTheaterReleases(): Promise<MovieItem[]> {
  try {
    const res2026 = await fetch(`${CINEMETA_BASE}/catalog/movie/year/genre=2026.json`).then(r => r.json()).catch(() => ({ metas: [] }));
    const movies26 = (res2026.metas || []).map((m: any) => formatMovie(m, 'movie'));

    const seen = new Set<string>();
    const activeTheatricalMovies: MovieItem[] = [];

    for (const m of movies26) {
      if (!m.id || seen.has(m.id)) continue;
      seen.add(m.id);

      // STRICT CHECK: Once released on OTT, DO NOT show in theater section!
      if (isMovieReleasedOnOTT(m)) {
        continue;
      }

      activeTheatricalMovies.push({
        ...m,
        isTheaterPrint: true,
        theaterPrint: 'IN THEATERS ONLY',
        releaseInfo: m.releaseInfo || '2026'
      });
    }

    return activeTheatricalMovies.slice(0, 20);
  } catch (err) {
    console.error('Failed to fetch dynamic theater releases:', err);
    return [];
  }
}

export async function fetchMovieDetails(id: string, type: 'movie' | 'series'): Promise<MovieItem> {
  try {
    const res = await fetch(`${CINEMETA_BASE}/meta/${type}/${id}.json`);
    const data = await res.json();
    if (!data.meta) {
      return {
        id,
        name: 'Untitled',
        type,
        poster: 'https://images.metahub.space/poster/small/default/img'
      };
    }
    const m = data.meta;
    return {
      id: m.id || id,
      name: m.name || 'Untitled',
      type: (m.type as 'movie' | 'series') || type,
      poster: m.poster || 'https://images.metahub.space/poster/small/default/img',
      background: m.background || m.poster,
      description: m.description || 'Watch now on StreamPlay in high quality.',
      releaseInfo: m.releaseInfo || m.year || '',
      imdbRating: m.imdbRating || '8.5',
      genres: m.genres || ['Action', 'Drama'],
      cast: m.cast || [],
      runtime: m.runtime || '',
      trailer: m.trailerStreams?.[0]?.ytId
        ? `https://www.youtube.com/embed/${m.trailerStreams[0].ytId}`
        : m.trailers?.[0]?.source
        ? `https://www.youtube.com/embed/${m.trailers[0].source}`
        : m.trailer_yt_id
        ? `https://www.youtube.com/embed/${m.trailer_yt_id}`
        : typeof m.trailer === 'string' && m.trailer.length > 5
        ? (m.trailer.startsWith('http') ? m.trailer : `https://www.youtube.com/embed/${m.trailer}`)
        : undefined,
      videos: (m.videos || []).map((v: any) => ({
        id: v.id || `${id}:${v.season || 1}:${v.number || v.episode || 1}`,
        name: v.name || v.title || `Episode ${v.number || v.episode || 1}`,
        season: v.season || 1,
        number: v.number || v.episode || 1,
        overview: v.overview || v.description || '',
        thumbnail: v.thumbnail || '',
        rating: v.rating,
        released: v.released || v.firstAired
      }))
    };
  } catch (err) {
    console.error('Failed to fetch movie details:', err);
    return {
      id,
      name: 'Untitled',
      type,
      poster: 'https://images.metahub.space/poster/small/default/img'
    };
  }
}

// === Complete 30-Server Video Engine Registry ===
export interface StreamingServerMeta {
  id: number;
  name: string;
  isNoAds: boolean;
  specialty: string;
  getUrl: (cleanId: string, rawId: string, type: 'movie' | 'series', season: number, episode: number) => string;
}

export const STREAMING_SERVERS: StreamingServerMeta[] = [
  // 1. VidLink (Ultra HD 4K/1080p - Primary)
  {
    id: 0,
    name: 'VidLink (Ultra HD)',
    isNoAds: true,
    specialty: 'High-speed 4K/1080p fast CDN',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://vidlink.pro/tv/${id}/${s}/${e}`
        : `https://vidlink.pro/movie/${id}`
  },
  // 2. AutoEmbed (Adaptive CDN)
  {
    id: 1,
    name: 'AutoEmbed (Adaptive)',
    isNoAds: true,
    specialty: 'Instant fast buffer & multi-source',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://autoembed.co/tv/imdb/${id}-${s}-${e}`
        : `https://autoembed.co/movie/imdb/${id}`
  },
  // 3. VidSrc PM (Direct HTML5)
  {
    id: 2,
    name: 'VidSrc PM',
    isNoAds: true,
    specialty: 'Reliable fast origin cluster',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://vidsrc.pm/embed/tv/${id}/${s}/${e}`
        : `https://vidsrc.pm/embed/movie/${id}`
  },
  // 4. 2Embed (Multi-Audio & Subs)
  {
    id: 3,
    name: '2Embed',
    isNoAds: false,
    specialty: 'Multi-subtitles & audio tracks',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://2embed.cc/embedtv/${id}&s=${s}&e=${e}`
        : `https://2embed.cc/embed/${id}`
  },
  // 5. 123Embed
  {
    id: 4,
    name: '123Embed',
    isNoAds: false,
    specialty: 'Global multi-mirror cluster',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://play2.123embed.net/tv/${id}/${s}/${e}`
        : `https://play2.123embed.net/movie/${id}`
  },
  // 6. VidSrc Embed
  {
    id: 5,
    name: 'VidSrc Embed',
    isNoAds: false,
    specialty: 'Massive global catalog',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://vidsrc.xyz/embed/tv/${id}/${s}/${e}`
        : `https://vidsrc.xyz/embed/movie/${id}`
  },
  // 7. MultiEmbed
  {
    id: 6,
    name: 'MultiEmbed',
    isNoAds: false,
    specialty: 'Dynamic auto-stream selector',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://multiembed.mov/?video_id=${id}&s=${s}&e=${e}`
        : `https://multiembed.mov/?video_id=${id}`
  },
  // 8. MoviesAPI
  {
    id: 7,
    name: 'MoviesAPI',
    isNoAds: true,
    specialty: 'Multi-resolution streaming',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://moviesapi.club/tv/${id}-${s}-${e}`
        : `https://moviesapi.club/movie/${id}`
  },
  // 8. VidEasy
  {
    id: 7,
    name: 'VidEasy',
    isNoAds: false,
    specialty: 'Lightweight HTML5 stream',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://videasy.net/embed/tv/${id}/${s}/${e}`
        : `https://videasy.net/embed/movie/${id}`
  },
  // 9. 111Movies
  {
    id: 8,
    name: '111Movies',
    isNoAds: false,
    specialty: 'Regional Indian & Asian cinema',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://111movies.com/tv/${id}/${s}/${e}`
        : `https://111movies.com/movie/${id}`
  },
  // 10. VidZee
  {
    id: 9,
    name: 'VidZee',
    isNoAds: false,
    specialty: 'Clean player controls',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://vidzee.online/embed/tv/${id}/${s}/${e}`
        : `https://vidzee.online/embed/movie/${id}`
  },
  // 11. VidSrc
  {
    id: 10,
    name: 'VidSrc',
    isNoAds: false,
    specialty: 'Reliable classic origin',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://vidsrc.me/embed/tv?imdb=${id}&season=${s}&episode=${e}`
        : `https://vidsrc.me/embed/movie?imdb=${id}`
  },
  // 12. 2Embed
  {
    id: 11,
    name: '2Embed',
    isNoAds: false,
    specialty: 'Multi-audio and multi-subtitles',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://2embed.cc/embedtv/${id}&s=${s}&e=${e}`
        : `https://2embed.cc/embed/${id}`
  },
  // 13. Mapple
  {
    id: 12,
    name: 'Mapple',
    isNoAds: false,
    specialty: 'Mobile-first low bandwidth',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://mapple.tv/embed/tv/${id}/${s}/${e}`
        : `https://mapple.tv/embed/movie/${id}`
  },
  // 14. PrimeSrc
  {
    id: 13,
    name: 'PrimeSrc',
    isNoAds: false,
    specialty: 'Prime & Netflix mirror proxy',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://primesrc.net/embed/tv/${id}/${s}/${e}`
        : `https://primesrc.net/embed/movie/${id}`
  },
  // 15. MultiEmbed
  {
    id: 14,
    name: 'MultiEmbed',
    isNoAds: false,
    specialty: 'Dynamic auto-stream selector',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://multiembed.mov/?video_id=${id}&s=${s}&e=${e}`
        : `https://multiembed.mov/?video_id=${id}`
  },
  // 16. AutoEmbed
  {
    id: 15,
    name: 'AutoEmbed',
    isNoAds: false,
    specialty: 'Instant load buffer',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://player.autoembed.cc/embed/tv/${id}/${s}/${e}`
        : `https://player.autoembed.cc/embed/movie/${id}`
  },
  // 17. VixSrc
  {
    id: 16,
    name: 'VixSrc',
    isNoAds: false,
    specialty: 'High-bitrate audio & video',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://vixsrc.to/embed/tv/${id}/${s}/${e}`
        : `https://vixsrc.to/embed/movie/${id}`
  },
  // 18. VidLove
  {
    id: 17,
    name: 'VidLove',
    isNoAds: false,
    specialty: 'Stable European CDN nodes',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://vidlove.stream/embed/tv/${id}/${s}/${e}`
        : `https://vidlove.stream/embed/movie/${id}`
  },
  // 19. VidFast
  {
    id: 18,
    name: 'VidFast',
    isNoAds: false,
    specialty: 'Low-latency Asian CDN nodes',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://vidfast.stream/embed/tv/${id}/${s}/${e}`
        : `https://vidfast.stream/embed/movie/${id}`
  },
  // 20. Filmu
  {
    id: 19,
    name: 'Filmu',
    isNoAds: false,
    specialty: 'Bollywood & Kollywood fast cache',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://filmu.stream/embed/tv/${id}/${s}/${e}`
        : `https://filmu.stream/embed/movie/${id}`
  },
  // 21. VidCore
  {
    id: 20,
    name: 'VidCore',
    isNoAds: false,
    specialty: 'Core backbone mirror',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://vidcore.stream/embed/tv/${id}/${s}/${e}`
        : `https://vidcore.stream/embed/movie/${id}`
  },
  // 22. VAPlayer
  {
    id: 21,
    name: 'VAPlayer',
    isNoAds: false,
    specialty: 'Smooth HTML5 pipeline',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://vaplayer.stream/embed/tv/${id}/${s}/${e}`
        : `https://vaplayer.stream/embed/movie/${id}`
  },
  // 23. Vares
  {
    id: 22,
    name: 'Vares',
    isNoAds: false,
    specialty: 'Fast reverse proxy',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://vares.stream/embed/tv/${id}/${s}/${e}`
        : `https://vares.stream/embed/movie/${id}`
  },
  // 24. VidKing
  {
    id: 23,
    name: 'VidKing',
    isNoAds: false,
    specialty: 'High availability cluster',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://vidking.stream/embed/tv/${id}/${s}/${e}`
        : `https://vidking.stream/embed/movie/${id}`
  },
  // 25. VidBolt
  {
    id: 24,
    name: 'VidBolt',
    isNoAds: false,
    specialty: 'Lightning fast start time',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://vidbolt.stream/embed/tv/${id}/${s}/${e}`
        : `https://vidbolt.stream/embed/movie/${id}`
  },
  // 26. VidNest
  {
    id: 25,
    name: 'VidNest',
    isNoAds: false,
    specialty: 'Ad-free edge cache',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://vidnest.stream/embed/tv/${id}/${s}/${e}`
        : `https://vidnest.stream/embed/movie/${id}`
  },
  // 27. VidSrc.su
  {
    id: 26,
    name: 'VidSrc.su',
    isNoAds: false,
    specialty: 'Dedicated high-bandwidth node',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://vidsrc.su/embed/tv/${id}/${s}/${e}`
        : `https://vidsrc.su/embed/movie/${id}`
  },
  // 28. VidGod
  {
    id: 27,
    name: 'VidGod',
    isNoAds: false,
    specialty: 'Multi-source dynamic fallback',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://vidgod.stream/embed/tv/${id}/${s}/${e}`
        : `https://vidgod.stream/embed/movie/${id}`
  },
  // 29. VidSrc.me
  {
    id: 28,
    name: 'VidSrc.me',
    isNoAds: false,
    specialty: 'Direct mirror with episode router',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://vidsrc.me/embed/${id}/${s}-${e}`
        : `https://vidsrc.me/embed/${id}`
  },
  // 30. 1Embed
  {
    id: 29,
    name: '1Embed',
    isNoAds: false,
    specialty: 'Universal emergency fallback',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://1embed.to/embed/${id}/${s}/${e}`
        : `https://1embed.to/embed/${id}`
  }
];

export function getStreamEmbedUrl(
  id: string,
  type: 'movie' | 'series',
  providerIndex = 0,
  season = 1,
  episode = 1
): string {
  const cleanId = id.trim();
  const rawId = cleanId.replace('tt', '');

  const serverIndex = Math.abs(providerIndex) % STREAMING_SERVERS.length;
  const server = STREAMING_SERVERS[serverIndex];
  return server.getUrl(cleanId, rawId, type, season, episode);
}
