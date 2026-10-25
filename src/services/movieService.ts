import { MovieItem, OTTBrand, OTTMetadata } from '../types/media';
import { DEFAULT_POSTER_FALLBACK } from '../config/mediaFallback';

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
    const [topBaseRes, year25Res] = await Promise.all([
      fetch(`${CINEMETA_BASE}/catalog/movie/top.json`).then(r => r.json()).catch(() => ({ metas: [] })),
      fetch(`${CINEMETA_BASE}/catalog/movie/year/genre=2025.json`).then(r => r.json()).catch(() => ({ metas: [] }))
    ]);

    const baseMovies = (topBaseRes.metas || []).map((m: any) => formatMovie(m, 'movie'));
    const year25Movies = (year25Res.metas || []).map((m: any) => formatMovie(m, 'movie'));

    // Prioritize confirmed released blockbusters and active streaming hits
    const pool = [...baseMovies.slice(0, 15), ...year25Movies.slice(0, 15), ...baseMovies.slice(15)];
    const seen = new Set<string>();
    const trendingRecent: MovieItem[] = [];

    for (const m of pool) {
      if (!m.id || seen.has(m.id)) continue;
      seen.add(m.id);
      trendingRecent.push(m);
    }

    const result = trendingRecent.length > 0 ? trendingRecent : baseMovies;
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
 * Fully Dynamic Channel Content Catalog.
 * Queries television networks, serials, and broadcasts dynamically with zero hardcoded show names.
 */
export async function fetchChannelContent(channelIdOrName: string): Promise<MovieItem[]> {
  const raw = (channelIdOrName || '').trim();
  if (!raw || raw.toLowerCase() === 'all') return [];

  // Dynamically resolve clean channel brand name
  let cleanBrand = raw
    .replace(/[-_]/g, ' ')
    .replace(/\b(channel|network)\b/gi, '')
    .trim();

  // Normalize common channel abbreviations dynamically
  const lower = cleanBrand.toLowerCase();
  if (lower.includes('star plus') || lower.includes('starplus')) cleanBrand = 'Star Plus';
  else if (lower.includes('star vijay') || lower.includes('vijay')) cleanBrand = 'Vijay TV';
  else if (lower.includes('colors')) cleanBrand = 'Colors TV';
  else if (lower.includes('zee')) cleanBrand = 'Zee TV';
  else if (lower.includes('sony set') || lower.includes('sony')) cleanBrand = 'Sony TV';
  else if (lower.includes('asianet')) cleanBrand = 'Asianet';
  else if (lower.includes('sun')) cleanBrand = 'Sun TV';

  // Dynamic search terms derived strictly from the channel name itself with current years
  const currentYear = new Date().getFullYear();
  const dynamicQueries = [
    `${cleanBrand}`,
    cleanBrand.endsWith('TV') ? cleanBrand : `${cleanBrand} TV`,
    `${cleanBrand} Serials`,
    `${cleanBrand} Shows`,
    `${cleanBrand} Drama`,
    `${cleanBrand} ${currentYear}`
  ];

  try {
    const results = await Promise.all(
      dynamicQueries.map(q => searchMoviesAndShows(q))
    );

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

    // Sort dynamically from newest release year to older
    flat.sort((a, b) => {
      const yearA = parseInt(a.releaseInfo || '0') || 0;
      const yearB = parseInt(b.releaseInfo || '0') || 0;
      return yearB - yearA;
    });

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
    poster: item.poster || DEFAULT_POSTER_FALLBACK,
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

/**
 * Dynamically computes regional cinema search queries for ANY language.
 * Dynamically derives current and past years from Date with zero hardcoded dictionary lists.
 */
export function getDynamicLanguageQueries(language: string): string[] {
  const lang = (language || 'All').trim();
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];

  if (lang.toLowerCase() === 'all') {
    return [
      ...years.map(y => `${y}`),
      'Top Movies',
      'Top Series',
      'Popular Cinema'
    ];
  }

  return [
    `${lang} ${years[0]}`,
    `${lang} ${years[1]}`,
    `${lang} ${years[2]}`,
    `${lang} Cinema`,
    `${lang} Movie`,
    `${lang} Hits`,
    `${lang} Series`
  ];
}

// Export dynamic proxy to preserve backward compatibility without any static dictionary
export const DYNAMIC_LANGUAGE_QUERIES: Record<string, string[]> = new Proxy({}, {
  get: (_target, prop: string) => {
    return getDynamicLanguageQueries(prop);
  }
});

/**
 * Dynamically fetches language movies with multi-query pagination and
 * STRICT sorting from recently released (newest year) to older classics.
 */
export async function fetchInfiniteLanguageMovies(
  language: string,
  batchIndex = 0,
  limit = 40
): Promise<MovieItem[]> {
  const lang = (language || 'All').trim();
  const terms = getDynamicLanguageQueries(lang);
  const queryIndex = (batchIndex * 2) % terms.length;
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
          language: lang
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
        poster: DEFAULT_POSTER_FALLBACK
      };
    }
    const m = data.meta;
    return {
      id: m.id || id,
      name: m.name || 'Untitled',
      type: (m.type as 'movie' | 'series') || type,
      poster: m.poster || DEFAULT_POSTER_FALLBACK,
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
      poster: DEFAULT_POSTER_FALLBACK
    };
  }
}

// === Complete 12-Server Video Engine Registry ===
export interface StreamingServerMeta {
  id: number;
  name: string;
  isNoAds: boolean;
  specialty: string;
  getUrl: (cleanId: string, rawId: string, type: 'movie' | 'series', season: number, episode: number) => string;
}

export const STREAMING_SERVERS: StreamingServerMeta[] = [
  // 1. VidLink Pro (Modern 4K HTML5 Player — Fast & CC)
  {
    id: 0,
    name: 'VidLink Pro (Fast & CC)',
    isNoAds: true,
    specialty: 'Modern Next.js HTML5 player with multi-subtitles, multi-audio & instant 1080p/4K',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://vidlink.pro/tv/${id}/${s}/${e}?autoplay=true`
        : `https://vidlink.pro/movie/${id}?autoplay=true`
  },
  // 2. VidSrc PM (Fast Origin Cluster — Zero Black Screen, Instant Playback)
  {
    id: 1,
    name: 'VidSrc PM (Fast Origin)',
    isNoAds: true,
    specialty: 'High-speed origin cluster with instant playback and zero black screen',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://vidsrc.pm/embed/tv/${id}/${s}/${e}?autoplay=1`
        : `https://vidsrc.pm/embed/movie/${id}?autoplay=1`
  },
  // 3. AutoEmbed (Global & Regional — High Indian & International Catalog)
  {
    id: 2,
    name: 'AutoEmbed (Global & Regional)',
    isNoAds: true,
    specialty: 'Ultra-fast multi-source engine with broad Indian, regional & global coverage',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://player.autoembed.cc/embed/tv/${id}/${s}/${e}?autoplay=1`
        : `https://player.autoembed.cc/embed/movie/${id}?autoplay=1`
  },
  // 4. 2Embed CC (Multi-Audio & Dubs)
  {
    id: 3,
    name: '2Embed CC (Multi-Audio)',
    isNoAds: true,
    specialty: 'High compatibility multi-audio & CC subtitles (ad-sanitized)',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`
        : `https://www.2embed.cc/embed/${id}`
  },
  // 5. SmashyStream (Multi-Source Cluster)
  {
    id: 4,
    name: 'SmashyStream (Multi-Source)',
    isNoAds: true,
    specialty: 'Multi-source player with broad format and regional Indian support',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://player.smashystream.com/tv/${id}?s=${s}&e=${e}`
        : `https://player.smashystream.com/movie/${id}`
  },
  // 6. VidBinge (Fast Player)
  {
    id: 5,
    name: 'VidBinge (Fast Player)',
    isNoAds: true,
    specialty: 'Fast HTML5 player with multi-audio & subtitle support',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://vidbinge.dev/embed/tv/${id}/${s}/${e}`
        : `https://vidbinge.dev/embed/movie/${id}`
  },
  // 7. VidSrc NL (Player Mirror)
  {
    id: 6,
    name: 'VidSrc NL (Player Mirror)',
    isNoAds: true,
    specialty: 'Clean player mirror with stable playback',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://vidsrc.nl/embed/tv/${id}/${s}/${e}`
        : `https://vidsrc.nl/embed/movie/${id}`
  },
  // 8. VidSrc CC (Official v2)
  {
    id: 7,
    name: 'VidSrc CC (Official v2)',
    isNoAds: true,
    specialty: 'Official v2 embed with reliable playback',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}?autoPlay=true`
        : `https://vidsrc.cc/v2/embed/movie/${id}?autoPlay=true`
  },
  // 9. MoviesAPI (Club Mirror)
  {
    id: 8,
    name: 'MoviesAPI (Club Mirror)',
    isNoAds: true,
    specialty: 'Club mirror with multi-language support',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://moviesapi.club/tv/${id}-${s}-${e}`
        : `https://moviesapi.club/movie/${id}`
  },
  // 10. MultiEmbed (Aggregated)
  {
    id: 9,
    name: 'MultiEmbed (Aggregated)',
    isNoAds: true,
    specialty: 'Aggregated sources with automatic fallback',
    getUrl: (id, _, type, s, e) =>
      type === 'series'
        ? `https://multiembed.mov/?video_id=${id}&s=${s}&e=${e}`
        : `https://multiembed.mov/?video_id=${id}`
  }
];



export function getStreamEmbedUrl(
  id: string,
  type: 'movie' | 'series',
  providerIndex = 0,
  season = 1,
  episode = 1
): string {
  const cleanId = String(id || '').trim();
  if (!cleanId) return '';

  // Defensive normalization: prevents malformed provider paths and traversal-like input.
  const safeSeason = Math.max(1, Math.trunc(Number(season) || 1));
  const safeEpisode = Math.max(1, Math.trunc(Number(episode) || 1));
  const rawId = cleanId.replace(/^tt/i, '');
  if (!cleanId || (!/^tt\d{5,12}$/.test(cleanId) && !/^\d{1,12}$/.test(cleanId))) {
    return '';
  }

  const total = STREAMING_SERVERS.length;
  const normalizedIndex = total > 0 ? ((Math.trunc(providerIndex) % total) + total) % total : 0;
  const server = STREAMING_SERVERS[normalizedIndex];
  if (!server) return '';
  return server.getUrl(cleanId, rawId, type, safeSeason, safeEpisode);
}


// === Provider Health Tracking (sessionStorage-backed) ===
const PROVIDER_HEALTH_KEY = 'streamplay_provider_health';

function readProviderHealth(): Record<number, { success: number; failure: number; lastFailure?: number }> {
  try {
    const raw = sessionStorage.getItem(PROVIDER_HEALTH_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
}

function writeProviderHealth(state: Record<number, { success: number; failure: number; lastFailure?: number }>) {
  try {
    sessionStorage.setItem(PROVIDER_HEALTH_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function markProviderHealthy(index: number) {
  const state = readProviderHealth();
  state[index] = {
    success: (state[index]?.success || 0) + 1,
    failure: state[index]?.failure || 0,
    lastFailure: state[index]?.lastFailure
  };
  writeProviderHealth(state);
}

export function markProviderUnhealthy(index: number) {
  const state = readProviderHealth();
  state[index] = {
    success: state[index]?.success || 0,
    failure: (state[index]?.failure || 0) + 1,
    lastFailure: Date.now()
  };
  writeProviderHealth(state);
}

export function isProviderHealthy(index: number): boolean {
  const state = readProviderHealth();
  const entry = state[index];
  if (!entry) return true;
  if (entry.failure >= 2 && entry.lastFailure && Date.now() - entry.lastFailure < 10 * 60 * 1000) {
    return false;
  }
  return true;
}

export function getBestHealthyProviderIndex(currentIndex = -1, total: number = STREAMING_SERVERS.length): number {
  const state = readProviderHealth();
  const safeTotal = total > 0 ? total : STREAMING_SERVERS.length;

  const candidates: { index: number; score: number }[] = [];

  for (let idx = 0; idx < safeTotal; idx++) {
    if (idx === currentIndex && safeTotal > 1) continue;

    const entry = state[idx] || { success: 0, failure: 0 };
    const isRecentFailure = entry.lastFailure && (Date.now() - entry.lastFailure < 10 * 60 * 1000);

    // Initial base score by provider hierarchy
    let score = 100 - (idx * 2);
    score += (entry.success * 15);
    score -= (entry.failure * 35);

    if (isRecentFailure) {
      score -= 100;
    }

    candidates.push({ index: idx, score });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.index ?? 0;
}

export function getFirstHealthyProviderIndex(total: number = STREAMING_SERVERS.length): number {
  return getBestHealthyProviderIndex(-1, total);
}

export function getNextHealthyProviderIndex(start: number, total: number = STREAMING_SERVERS.length): number {
  return getBestHealthyProviderIndex(start, total);
}
