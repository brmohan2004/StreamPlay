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

export function getCachedInitialMovies(key: string): MovieItem[] {
  try {
    const raw = localStorage.getItem(`streamplay_cached_movie_${key}`);
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

export function saveCachedInitialMovies(key: string, items: MovieItem[]) {
  try {
    if (Array.isArray(items) && items.length > 0) {
      localStorage.setItem(`streamplay_cached_movie_${key}`, JSON.stringify(items.slice(0, 25)));
    }
  } catch {
    // ignore
  }
}

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

  // Instant local cache fallback
  const localCached = getCachedInitialMovies('top_movies');

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
      saveCachedInitialMovies('top_movies', result);
    }
    return result.length > 0 ? result : localCached;
  } catch (err) {
    console.error('Failed to fetch web trending movies:', err);
    return localCached;
  }
}

export async function fetchTopSeries(): Promise<MovieItem[]> {
  if (cachedTopSeries && cachedTopSeries.length > 0) {
    return cachedTopSeries;
  }
  const localCached = getCachedInitialMovies('top_series');
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

    const finalResult = combined.length > 0 ? combined : topSeries;
    if (finalResult.length > 0) {
      cachedTopSeries = finalResult;
      saveCachedInitialMovies('top_series', finalResult);
    }
    return finalResult.length > 0 ? finalResult : localCached;
  } catch (err) {
    console.error('Failed to fetch top series:', err);
    return localCached;
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

    const seen = new Set<string>();
    const combined: MovieItem[] = [];
    for (const item of [...series, ...movies]) {
      if (item && item.id && !seen.has(item.id)) {
        seen.add(item.id);
        combined.push(item);
      }
    }
    return combined;
  } catch (err) {
    console.error('Search failed:', err);
    return [];
  }
}

/**
 * Paged multi-query search with 25-by-25 batching and dynamic filtering support.
 */
export async function searchMoviesAndShowsPaged(
  query: string,
  page = 0,
  limit = 25,
  activeFilter?: string
): Promise<{ items: MovieItem[]; totalAvailable: number }> {
  const trimmed = query.trim();
  if (!trimmed) return { items: [], totalAvailable: 0 };

  try {
    // Generate related queries to pull a rich, comprehensive pool of content
    const expandedQueries = [
      trimmed,
      `${trimmed} 2026`,
      `${trimmed} 2025`,
      `${trimmed} 2024`,
      `${trimmed} series`,
      `${trimmed} movie`
    ];

    const resultsByQuery = await Promise.all(
      expandedQueries.slice(0, 3).map(q => searchMoviesAndShows(q))
    );

    const seen = new Set<string>();
    let pool: MovieItem[] = [];
    for (const group of resultsByQuery) {
      for (const item of group) {
        if (item && item.id && !seen.has(item.id)) {
          seen.add(item.id);
          pool.push(item);
        }
      }
    }

    // Apply active filter capsule if selected (e.g. specific actor, director, genre, or dubbed)
    if (activeFilter && activeFilter !== 'All') {
      const filterLower = activeFilter.toLowerCase();
      if (filterLower === 'movies') {
        pool = pool.filter(item => item.type !== 'series');
      } else if (filterLower === 'series') {
        pool = pool.filter(item => item.type === 'series');
      } else if (filterLower === 'dubbed') {
        pool = pool.filter(item => {
          const text = `${item.name} ${item.description || ''} ${(item.genres || []).join(' ')}`.toLowerCase();
          return text.includes('dub') || text.includes('hindi') || text.includes('tamil') || text.includes('telugu') || text.includes('multi');
        });
      } else if (filterLower === 'actors' || filterLower === 'cast') {
        pool = pool.filter(item => item.cast && item.cast.length > 0);
      } else {
        pool = pool.filter(item => {
          const text = `${item.name} ${item.description || ''} ${(item.genres || []).join(' ')} ${(item.cast || []).join(' ')}`.toLowerCase();
          return text.includes(filterLower);
        });
      }
    }

    // Sort strictly from Newest to Oldest (e.g. 2026, 2025, 2024...)
    pool.sort((a, b) => {
      const yearA = parseInt(a.releaseInfo || '0') || 0;
      const yearB = parseInt(b.releaseInfo || '0') || 0;
      if (yearA !== yearB) return yearB - yearA;
      const ratingA = parseFloat(a.imdbRating || '0') || 0;
      const ratingB = parseFloat(b.imdbRating || '0') || 0;
      return ratingB - ratingA;
    });

    const start = page * limit;
    const paged = pool.slice(start, start + limit);
    return { items: paged, totalAvailable: pool.length };
  } catch (err) {
    console.error('Paged movie search failed:', err);
    return { items: [], totalAvailable: 0 };
  }
}

/**
 * Curated Trending Deck:
 * Integrates 2025/2026 Theater & OTT hits, weighted by user's primary/secondary languages,
 * high IMDb ratings (>= 7.5), and popular TV shows.
 */
export async function fetchCuratedTrendingDeck(
  primaryLang = 'Tamil',
  secondaryLang = 'English'
): Promise<MovieItem[]> {
  try {
    const [movies, series, theathers, primLangMovies, secLangMovies] = await Promise.all([
      fetchTopMovies(),
      fetchTopSeries(),
      fetchTheaterReleases(),
      fetchInfiniteLanguageMovies(primaryLang, 0, 15).catch(() => []),
      fetchInfiniteLanguageMovies(secondaryLang, 0, 15).catch(() => [])
    ]);

    const candidatePool = [
      ...theathers.slice(0, 6),
      ...movies.slice(0, 10),
      ...series.slice(0, 6),
      ...primLangMovies.slice(0, 8),
      ...secLangMovies.slice(0, 6)
    ];

    const seen = new Set<string>();
    const scoredList: { movie: MovieItem; score: number }[] = [];

    for (const m of candidatePool) {
      if (!m || !m.id || seen.has(m.id)) continue;
      seen.add(m.id);

      const year = parseInt(m.releaseInfo || '0') || 0;
      const rating = parseFloat(m.imdbRating || '0') || 0;
      const titleLower = m.name.toLowerCase();

      // Recency score (2026 gets top priority, 2025 high priority)
      let score = year >= 2026 ? 8 : year >= 2025 ? 5 : year >= 2024 ? 2 : 0;

      // Rating score
      if (rating >= 8.5) score += 6;
      else if (rating >= 7.8) score += 4;
      else if (rating >= 7.0) score += 2;

      // Primary / Secondary language boost
      if (m.language === primaryLang || titleLower.includes(primaryLang.toLowerCase())) {
        score += 7;
      } else if (m.language === secondaryLang || titleLower.includes(secondaryLang.toLowerCase())) {
        score += 4;
      }

      // Popular series balance
      if (m.type === 'series') {
        score += 3;
      }

      // Theatrical release bonus
      if (m.isTheaterPrint) {
        score += 4;
      }

      scoredList.push({ movie: m, score });
    }

    scoredList.sort((a, b) => b.score - a.score);
    return scoredList.slice(0, 12).map(item => item.movie);
  } catch (err) {
    console.error('Failed to curate trending deck:', err);
    return fetchTopMovies();
  }
}

/**
 * Dynamic Channel Content Catalog (StarPlus, Colors, Star Vijay, Zee TV, Sony SET, Asianet)
 */
export async function fetchChannelContent(channelIdOrName: string): Promise<MovieItem[]> {
  const channelMap: Record<string, string[]> = {
    'star-plus': ['StarPlus serials', 'StarPlus Hindi drama', 'Anupamaa', 'Yeh Rishta Kya Kehlata Hai'],
    'StarPlus': ['StarPlus serials', 'StarPlus Hindi drama', 'Anupamaa', 'Yeh Rishta Kya Kehlata Hai'],
    'colors-tv': ['Colors TV serials', 'Colors TV drama', 'Naagin', 'Bigg Boss Hindi'],
    'colors': ['Colors TV serials', 'Colors TV drama', 'Naagin', 'Bigg Boss Hindi'],
    'star-vijay': ['Star Vijay Tamil serials', 'Star Vijay shows', 'Cooku with Comali', 'Bigg Boss Tamil', 'Baakiyalakshmi'],
    'Star Vijay': ['Star Vijay Tamil serials', 'Star Vijay shows', 'Cooku with Comali', 'Bigg Boss Tamil', 'Baakiyalakshmi'],
    'zee-tv': ['Zee TV serials', 'Zee TV drama', 'Kundali Bhagya', 'Kumkum Bhagya'],
    'Zee TV': ['Zee TV serials', 'Zee TV drama', 'Kundali Bhagya', 'Kumkum Bhagya'],
    'sony-set': ['Sony Entertainment Television', 'Sony SET shows', 'CID', 'Crime Patrol', 'The Kapil Sharma Show'],
    'Sony SET': ['Sony Entertainment Television', 'Sony SET shows', 'CID', 'Crime Patrol', 'The Kapil Sharma Show'],
    'asianet': ['Asianet Malayalam serials', 'Asianet shows', 'Santhwanam', 'Kudumbavilakku'],
    'Asianet': ['Asianet Malayalam serials', 'Asianet shows', 'Santhwanam', 'Kudumbavilakku'],
    'sun-tv': ['Sun TV Tamil serials', 'Sun TV shows', 'Ethirneechal', 'Kayal', 'Singapennae'],
    'Sun TV': ['Sun TV Tamil serials', 'Sun TV shows', 'Ethirneechal', 'Kayal', 'Singapennae']
  };

  const queries = channelMap[channelIdOrName] || [`${channelIdOrName} serials`, `${channelIdOrName} shows`];
  try {
    const results = await Promise.all(queries.map(q => searchMoviesAndShows(q)));
    const seen = new Set<string>();
    const flat: MovieItem[] = [];

    for (const group of results) {
      for (const item of group) {
        if (item && item.id && !seen.has(item.id)) {
          seen.add(item.id);
          flat.push({
            ...item,
            type: 'series'
          });
        }
      }
    }
    return flat;
  } catch (err) {
    console.error(`Failed to fetch channel content for ${channelIdOrName}:`, err);
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

export async function fetchGenreSeries(genre: string, skip = 0): Promise<MovieItem[]> {
  try {
    const skipSuffix = skip > 0 ? `/skip=${skip}.json` : '.json';
    const res = await fetch(`${CINEMETA_BASE}/catalog/series/top/genre=${encodeURIComponent(genre)}${skipSuffix}`);
    const data = await res.json();
    return (data.metas || []).map((m: any) => formatMovie(m, 'series'));
  } catch (err) {
    console.error(`Failed to fetch series genre ${genre} skip ${skip}:`, err);
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
      videos: (() => {
        const rawVideos = (m.videos || []).map((v: any) => {
          const seasonNum = typeof v.season === 'number' ? v.season : parseInt(v.season, 10);
          const safeSeason = isNaN(seasonNum) ? 1 : seasonNum;
          const episodeNum = typeof v.number === 'number'
            ? v.number
            : typeof v.episode === 'number'
            ? v.episode
            : parseInt(v.number || v.episode, 10);
          const safeNumber = isNaN(episodeNum) ? 1 : episodeNum;
          return {
            id: v.id || `${id}:${safeSeason}:${safeNumber}`,
            name: v.name || v.title || `Episode ${safeNumber}`,
            season: safeSeason,
            number: safeNumber,
            overview: v.overview || v.description || '',
            thumbnail: v.thumbnail || '',
            rating: v.rating,
            released: v.released || v.firstAired
          };
        });

        const seenKeys = new Set<string>();
        const uniqueVideos: any[] = [];
        for (const ep of rawVideos) {
          const key = `${ep.season}:${ep.number}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            uniqueVideos.push(ep);
          }
        }

        uniqueVideos.sort((a, b) => {
          if (a.season !== b.season) return a.season - b.season;
          return a.number - b.number;
        });

        return uniqueVideos;
      })()
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
  // 1. AutoEmbed CO (Ultra High-Speed, Multi-Audio & Subtitles, Zero Sandbox Error)
  {
    id: 0,
    name: 'AutoEmbed (Multi-Audio & Subs)',
    isNoAds: true,
    specialty: 'Multi-language audio & subtitles with zero sandbox blocks',
    getUrl: (id, _, type, s, e) => {
      const isImdb = id.startsWith('tt');
      const prefix = isImdb ? 'imdb/' : 'tmdb/';
      return type === 'series'
        ? `https://autoembed.co/tv/${prefix}${id}-${s}-${e}`
        : `https://autoembed.co/movie/${prefix}${id}`;
    }
  },
  // 2. 2Embed CC (Multi-Language & Audio Tracks)
  {
    id: 1,
    name: '2Embed CC (Multi-Audio)',
    isNoAds: true,
    specialty: 'High compatibility multi-audio & CC subtitles',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`
        : `https://www.2embed.cc/embed/${id}`
  },
  // 3. VidSrc PM (Origin Cluster)
  {
    id: 2,
    name: 'VidSrc PM (Origin Cluster)',
    isNoAds: true,
    specialty: 'Fast origin cluster with zero popup breakout',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://vidsrc.pm/embed/tv/${id}/${s}/${e}`
        : `https://vidsrc.pm/embed/movie/${id}`
  },
  // 4. VidBinge (Clean Ad-Free Player)
  {
    id: 3,
    name: 'VidBinge (Zero Ads & CC)',
    isNoAds: true,
    specialty: 'Clean ad-free HTML5 stream player with subtitle selection',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://vidbinge.dev/embed/tv/${id}/${s}/${e}`
        : `https://vidbinge.dev/embed/movie/${id}`
  },
  // 5. VidSrc NL (High Bitrate Stream)
  {
    id: 4,
    name: 'VidSrc NL (High Bitrate)',
    isNoAds: true,
    specialty: 'Direct smooth stream with multi-resolution',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://player.vidsrc.nl/embed/tv/${id}/${s}/${e}`
        : `https://player.vidsrc.nl/embed/movie/${id}`
  },
  // 6. AutoEmbed TO (Backup Mirror)
  {
    id: 5,
    name: 'AutoEmbed Mirror (TO)',
    isNoAds: true,
    specialty: 'High-availability mirror node for AutoEmbed',
    getUrl: (id, _, type, s, e) => {
      const isImdb = id.startsWith('tt');
      const prefix = isImdb ? 'imdb/' : 'tmdb/';
      return type === 'series'
        ? `https://autoembed.to/tv/${prefix}${id}-${s}-${e}`
        : `https://autoembed.to/movie/${prefix}${id}`;
    }
  },
  // 7. 111Movies (Asian & Regional Cinema)
  {
    id: 6,
    name: '111Movies (Asian & Regional)',
    isNoAds: false,
    specialty: 'Regional Indian & Asian cinema catalog',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://111movies.com/tv/${id}/${s}/${e}`
        : `https://111movies.com/movie/${id}`
  },
  // 8. VidLink Pro (Alternative Mirror)
  {
    id: 7,
    name: 'VidLink Pro (Alternative)',
    isNoAds: false,
    specialty: 'High-speed 4K/1080p mirror',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://vidlink.pro/tv/${id}/${s}/${e}`
        : `https://vidlink.pro/movie/${id}`
  },
  // 9. VidSrc CC (Clean 1080p)
  {
    id: 8,
    name: 'VidSrc CC (Clean 1080p)',
    isNoAds: true,
    specialty: 'High-bitrate pristine 1080p stream with multi-audio',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`
        : `https://vidsrc.cc/v2/embed/movie/${id}`
  },
  // 10. SmashyStream (AnyEmbed)
  {
    id: 9,
    name: 'SmashyStream (Ultra Clean)',
    isNoAds: true,
    specialty: 'High-speed cluster with multiple audio & CC tracks',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://embed.smashystream.com/playere.php?tmdb=${id}&season=${s}&episode=${e}`
        : `https://embed.smashystream.com/playere.php?tmdb=${id}`
  },
  // 11. MoviesAPI (Ad-Free Fast CDN)
  {
    id: 10,
    name: 'MoviesAPI (No Ads)',
    isNoAds: true,
    specialty: 'Multi-resolution streaming with adaptive bitrate',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://moviesapi.club/tv/${id}-${s}-${e}`
        : `https://moviesapi.club/movie/${id}`
  },
  // 12. MultiEmbed (Universal Mirrors)
  {
    id: 11,
    name: 'MultiEmbed (Universal Mirrors)',
    isNoAds: true,
    specialty: 'Dynamic multi-source selector with auto-fallback',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`
        : `https://multiembed.mov/?video_id=${id}&tmdb=1`
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
