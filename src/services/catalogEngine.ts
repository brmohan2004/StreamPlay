// === StreamPlay Unified Catalog Engine ===
// Powers Spotify / Netflix / Prime / JioSaavn tier user-based personalization,
// cross-platform infinite content streams, zero-repetition shelf deduplication,
// and 0ms glitch-free stale-while-revalidate caching.

import { MovieItem, SongItem } from '../types/media';
import {
  getSongCoreKey,
  searchSongsPaged,
  fetchInfiniteLanguageSongs,
  fetchGenreSongs
} from './musicService';
import {
  fetchGenreMovies,
  fetchPagedGenreMovies,
  searchMoviesAndShowsPaged,
  fetchInfiniteLanguageMovies
} from './movieService';
import { getUserLocation } from './locationService';

// ─────────────────────────────────────────────────────────────
// 1. FAST IN-MEMORY STALE-WHILE-REVALIDATE (SWR) CACHE
// ─────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCatalogCache = new Map<string, CacheEntry<any>>();
const activePromises = new Map<string, Promise<any>>();

export async function fetchWithSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = 1000 * 60 * 15 // 15 mins fresh window
): Promise<T> {
  const cached = memoryCatalogCache.get(key);
  const now = Date.now();

  // 1. If cache exists and is fresh, return immediately in 0ms
  if (cached && (now - cached.timestamp < ttlMs)) {
    return cached.data;
  }

  // 2. If an active fetch is already in flight for this exact key, reuse it to avoid duplicate network calls
  if (activePromises.has(key)) {
    if (cached) {
      // If we have stale data, return it immediately while the existing promise finishes in background
      return cached.data;
    }
    return activePromises.get(key)!;
  }

  // 3. Initiate background fetch
  const fetchPromise = (async () => {
    try {
      const freshData = await fetcher();
      if (freshData && (!Array.isArray(freshData) || freshData.length > 0)) {
        memoryCatalogCache.set(key, { data: freshData, timestamp: Date.now() });
      }
      return freshData;
    } finally {
      activePromises.delete(key);
    }
  })();

  activePromises.set(key, fetchPromise);

  // If we had stale data, return stale data immediately (Stale-While-Revalidate = 0ms delay)
  if (cached) {
    return cached.data;
  }

  // Otherwise await the fresh fetch
  return fetchPromise;
}

// ─────────────────────────────────────────────────────────────
// 2. CROSS-SHELF DEDUPLICATION REGISTRY (Like Netflix & Spotify)
// ─────────────────────────────────────────────────────────────

/**
 * Normalizes movie identifier to avoid duplicates across IDs or variants
 */
export function getMovieCoreKey(movie: MovieItem): string {
  if (movie.id && movie.id.startsWith('tt')) {
    return movie.id;
  }
  const cleanTitle = (movie.name || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const year = movie.releaseInfo ? movie.releaseInfo.trim() : '';
  return `${cleanTitle}_${year}`;
}

export class CrossShelfRegistry {
  private seenMovieKeys = new Set<string>();
  private seenSongKeys = new Set<string>();

  public reset() {
    this.seenMovieKeys.clear();
    this.seenSongKeys.clear();
  }

  /**
   * Deduplicates movies for a specific shelf against all previously rendered shelves.
   * If an item has already been displayed prominently in an earlier shelf, it is skipped.
   */
  public deduplicateMovies(items: MovieItem[], minYield = 6): MovieItem[] {
    const uniqueList: MovieItem[] = [];

    for (const item of items) {
      const key = getMovieCoreKey(item);
      if (!this.seenMovieKeys.has(key)) {
        this.seenMovieKeys.add(key);
        uniqueList.push(item);
      }
    }

    // Safety fallback: if deduplication aggressively trimmed the row below minYield,
    // allow some original items back so the shelf never collapses or looks broken
    if (uniqueList.length < minYield && items.length > 0) {
      for (const item of items) {
        if (!uniqueList.some(u => u.id === item.id)) {
          uniqueList.push(item);
          if (uniqueList.length >= minYield) break;
        }
      }
    }

    return uniqueList;
  }

  /**
   * Deduplicates songs for a specific shelf against all previously rendered shelves.
   * Uses deep song core key comparison (stripping film suffixes & remixes).
   */
  public deduplicateSongs(items: SongItem[], minYield = 6): SongItem[] {
    const uniqueList: SongItem[] = [];

    for (const item of items) {
      const key = getSongCoreKey(item.title, item.artist, item.streamUrl);
      if (!this.seenSongKeys.has(key)) {
        this.seenSongKeys.add(key);
        uniqueList.push(item);
      }
    }

    if (uniqueList.length < minYield && items.length > 0) {
      for (const item of items) {
        if (!uniqueList.some(u => String(u.id) === String(item.id))) {
          uniqueList.push(item);
          if (uniqueList.length >= minYield) break;
        }
      }
    }

    return uniqueList;
  }
}

// Global active registry instance for screens
export const globalScreenRegistry = new CrossShelfRegistry();

// ─────────────────────────────────────────────────────────────
// 3. USER-BASED LOCATION & LANGUAGE PERSONALIZATION
// ─────────────────────────────────────────────────────────────

export interface ContentWeights {
  primaryLang: string;
  secondaryLang: string;
  locationCinemaHub: string;
  locationCity: string;
}

export function getCurrentContentWeights(primaryLang = 'Tamil', secondaryLang = 'English'): ContentWeights {
  const loc = getUserLocation();
  return {
    primaryLang: primaryLang || loc.defaultLang || 'Tamil',
    secondaryLang: secondaryLang || 'English',
    locationCinemaHub: loc.cinemaHub,
    locationCity: loc.name
  };
}

// ─────────────────────────────────────────────────────────────
// 4. DYNAMIC INFINITE CONTENT CATALOG EXTENSION POOLS
// ─────────────────────────────────────────────────────────────

export interface DynamicMovieShelfSpec {
  genre: string;
  title: string;
  desc: string;
  query?: string;
  sourceType: 'genre' | 'language' | 'regional' | 'decade' | 'curated';
}

export interface DynamicMusicShelfSpec {
  type: 'mood' | 'decade' | 'genre' | 'artist' | 'regional' | 'language';
  query: string;
  title: string;
  desc: string;
}

/**
 * Returns dynamic regional artist names based on location id
 */
export function getRegionalArtists(locationId = 'chennai'): string[] {
  const map: Record<string, string[]> = {
    chennai: ['Anirudh Ravichander', 'A.R. Rahman', 'Yuvan Shankar Raja', 'Sid Sriram', 'Harris Jayaraj'],
    mumbai: ['Arijit Singh', 'Pritam', 'Vishal-Shekhar', 'Badshah', 'Shreya Ghoshal'],
    hyderabad: ['Thaman S', 'Devi Sri Prasad', 'Sid Sriram', 'M.M. Keeravaani', 'Anirudh'],
    bengaluru: ['Sid Sriram', 'Sanjith Hegde', 'Charan Raj', 'Raghu Dixit', 'Arjun Janya'],
    kochi: ['Sushin Shyam', 'Hesham Abdul Wahab', 'Jassie Gift', 'Vidyasagar', 'Job Kurian'],
    delhi: ['Diljit Dosanjh', 'AP Dhillon', 'Arijit Singh', 'B Praak', 'Honey Singh'],
    kolkata: ['Arijit Singh', 'Jeet Gannguli', 'Anupam Roy', 'Shreya Ghoshal', 'Nachiketa'],
    global: ['The Weeknd', 'Taylor Swift', 'Billie Eilish', 'Bruno Mars', 'Dua Lipa']
  };
  return map[locationId.toLowerCase()] || map['chennai'];
}

/**
 * Dynamic Time-of-Day mood determination
 */
export function getDynamicTimeMood() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return {
      movie: { title: 'Morning Uplift & Inspiring Sagas', desc: 'Heartwarming stories and peaceful drama' },
      music: { query: 'Morning Acoustic Peaceful Melodies', title: 'Morning Awakening', desc: 'Acoustic warmth, soft vocals and mindful peace' }
    };
  }
  if (hour >= 12 && hour < 17) {
    return {
      movie: { title: 'Midday Blockbusters & Action', desc: 'High-octane blockbusters to power your day' },
      music: { query: 'Lo-Fi Chill Focus Beats', title: 'Midday Focus & Chill', desc: 'Smooth instrumental lo-fi and focus rhythms' }
    };
  }
  if (hour >= 17 && hour < 22) {
    return {
      movie: { title: 'Prime Time Premieres & Family Hits', desc: 'The most popular movies trending tonight' },
      music: { query: 'Party Dance Anthems EDM High Energy', title: 'Prime Time Dance & Beats', desc: 'Heavy bass drops and high-energy party anthems' }
    };
  }
  return {
    movie: { title: 'Midnight Psychological Thrillers', desc: 'Mindbenders and dark suspense for the night' },
    music: { query: 'Late Night Soulful Romance Melodies', title: 'Late Night Reverie', desc: 'Intimate melodies and calming midnight soundscapes' }
  };
}

/**
 * Generates an ENDLESS sequence of dynamic movie shelf specifications.
 * Seamlessly personalizes based on user's primary/secondary language, location,
 * active theatrical release year, and time-of-day.
 */
export function getDynamicMovieShelfSpec(index: number, customWeights?: ContentWeights): DynamicMovieShelfSpec {
  const weights = customWeights || getCurrentContentWeights();
  const currentYear = new Date().getFullYear();
  const timeMood = getDynamicTimeMood();

  // Core dynamic templates incorporating real user variables
  const baseSpecs: DynamicMovieShelfSpec[] = [
    {
      genre: 'Action',
      title: `${weights.primaryLang} Action & Adrenaline`,
      desc: `High-octane ${weights.primaryLang} action blockbusters and superhero sagas`,
      query: `${weights.primaryLang} Action ${currentYear}`,
      sourceType: 'language'
    },
    {
      genre: 'Sci-Fi',
      title: 'Futuristic Universes & Mindbenders',
      desc: 'Outer space adventures, time paradoxes and quantum thrillers',
      query: 'Sci-Fi Universe',
      sourceType: 'genre'
    },
    {
      genre: 'Thriller',
      title: `${weights.locationCinemaHub} Suspense & Thrillers`,
      desc: `Edge-of-your-seat psychological twists from ${weights.locationCity}`,
      query: `${weights.primaryLang} Thriller`,
      sourceType: 'regional'
    },
    {
      genre: 'Curated',
      title: timeMood.movie.title,
      desc: timeMood.movie.desc,
      query: 'Top Trending Cinema',
      sourceType: 'curated'
    },
    {
      genre: 'Crime',
      title: 'Underworld Heists & Detective Files',
      desc: 'Forensic investigations, mafia syndicates and true crime sagas',
      query: 'Crime Thriller',
      sourceType: 'genre'
    },
    {
      genre: 'Romance',
      title: `${weights.primaryLang} Love Stories & Melodrama`,
      desc: `Heartfelt journeys and musical romance in ${weights.primaryLang}`,
      query: `${weights.primaryLang} Romance Love`,
      sourceType: 'language'
    },
    {
      genre: 'Comedy',
      title: 'Laugh-Out-Loud Favorites',
      desc: 'Blockbuster comedies and hilarious family entertainment',
      query: 'Comedy Blockbuster',
      sourceType: 'genre'
    },
    {
      genre: 'Animation',
      title: 'Animated Masterpieces & Anime',
      desc: 'Critically acclaimed animated sagas and anime blockbusters',
      query: 'Animation Anime',
      sourceType: 'genre'
    },
    {
      genre: 'Drama',
      title: `${weights.secondaryLang} Global Sensations`,
      desc: `Top-rated international prestige films in ${weights.secondaryLang}`,
      query: `${weights.secondaryLang} Award Winning`,
      sourceType: 'language'
    },
    {
      genre: 'Horror',
      title: 'Supernatural & Chilling Mysteries',
      desc: 'Hauntings, occult terror and creature thrillers',
      query: 'Horror Mystery',
      sourceType: 'genre'
    },
    {
      genre: 'Adventure',
      title: 'Epic Expeditions & Quests',
      desc: 'Survival sagas and mystical expeditions across uncharted worlds',
      query: 'Adventure Epic',
      sourceType: 'genre'
    },
    {
      genre: 'Decade',
      title: `${currentYear - 10}s Golden Decade Classics`,
      desc: `The era-defining blockbusters from ${currentYear - 15} to ${currentYear - 8}`,
      query: `${weights.primaryLang} ${currentYear - 10}`,
      sourceType: 'decade'
    }
  ];

  if (index < baseSpecs.length) {
    return baseSpecs[index];
  }

  // Infinite expansion: dynamically cycle with volume and subgenre extensions
  const cycle = Math.floor(index / baseSpecs.length);
  const slot = index % baseSpecs.length;
  const base = baseSpecs[slot];

  const subgenres = [
    'Neo-Noir',
    'Cyberpunk',
    'Martial Arts',
    'Historical Epics',
    'Supernatural Heists',
    'Psychological Mysteries',
    'Indie Spotlights',
    'Cult Classics',
    'Award Winners',
    'Box Office Phenomenon',
    'Midnight Horror',
    'Festival Favorites'
  ];

  const sub = subgenres[index % subgenres.length];
  return {
    genre: base.genre,
    title: `${weights.primaryLang} ${sub} (Vol. ${cycle + 1})`,
    desc: `Endless curated ${sub.toLowerCase()} cinema streaming for you`,
    query: `${weights.primaryLang} ${sub}`,
    sourceType: 'curated'
  };
}

/**
 * Returns dynamic list of movie shelves based on active user context
 */
export function getDynamicMovieShelves(count = 12, customWeights?: ContentWeights): DynamicMovieShelfSpec[] {
  const weights = customWeights || getCurrentContentWeights();
  const list: DynamicMovieShelfSpec[] = [];
  for (let i = 0; i < count; i++) {
    list.push(getDynamicMovieShelfSpec(i, weights));
  }
  return list;
}

/**
 * Generates an ENDLESS sequence of dynamic music shelf specifications.
 * Seamlessly personalizes based on user's primary/secondary language, location,
 * regional top artists, and time-of-day.
 */
export function getDynamicMusicShelfSpec(index: number, customWeights?: ContentWeights): DynamicMusicShelfSpec {
  const weights = customWeights || getCurrentContentWeights();
  const currentYear = new Date().getFullYear();
  const timeMood = getDynamicTimeMood();
  const loc = getUserLocation();
  const artists = getRegionalArtists(loc.id);
  const primaryArtist = artists[0] || 'Anirudh Ravichander';
  const secondaryArtist = artists[1] || 'A.R. Rahman';

  const baseSpecs: DynamicMusicShelfSpec[] = [
    {
      type: 'regional',
      query: `${weights.locationCity} Top Hits ${currentYear}`,
      title: `${weights.locationCity} Anthems & ${weights.locationCinemaHub} Sound`,
      desc: `Hottest local tracks and mass melodies vibrating in ${weights.locationCity}`
    },
    {
      type: 'language',
      query: `${weights.primaryLang} Top Hits ${currentYear}`,
      title: `${weights.primaryLang} Chartbusters ${currentYear}`,
      desc: `The biggest trending melodies and viral anthems in ${weights.primaryLang}`
    },
    {
      type: 'artist',
      query: primaryArtist,
      title: `${primaryArtist} Spotlight`,
      desc: `Curated signature tracks and greatest hits of ${primaryArtist}`
    },
    {
      type: 'mood',
      query: timeMood.music.query,
      title: timeMood.music.title,
      desc: timeMood.music.desc
    },
    {
      type: 'language',
      query: `${weights.secondaryLang} Hits ${currentYear}`,
      title: `${weights.secondaryLang} Pop & Melodies`,
      desc: `International & bilingual favorites in ${weights.secondaryLang}`
    },
    {
      type: 'mood',
      query: `${weights.primaryLang} Workout Energetic Gym`,
      title: 'High-Octane Workout',
      desc: 'High-BPM heavy bass beats to power your exercise sets'
    },
    {
      type: 'mood',
      query: `${weights.primaryLang} Romantic Melodies Love`,
      title: 'Soulful Romance',
      desc: 'Intimate acoustics, heartfelt duets and romantic warmth'
    },
    {
      type: 'artist',
      query: secondaryArtist,
      title: `${secondaryArtist} Magic`,
      desc: `Evergreen melodies and symphonies composed by ${secondaryArtist}`
    },
    {
      type: 'genre',
      query: `${weights.primaryLang} Dance Party EDM Club`,
      title: 'Festival Dance Anthems',
      desc: 'Fast beats, party dance anthems and club bangers'
    },
    {
      type: 'decade',
      query: `${weights.primaryLang} 2010s Golden Hits`,
      title: '2010s Nostalgia Wave',
      desc: 'The defining chartbusters and nostalgic hits of the past decade'
    },
    {
      type: 'decade',
      query: `${weights.primaryLang} 2000s Classic Melodies`,
      title: '2000s Timeless Classics',
      desc: 'Evergreen melodies and golden audio classics'
    },
    {
      type: 'mood',
      query: `${weights.primaryLang} Acoustic Unplugged Lo-Fi`,
      title: 'Acoustic & Stripped Down',
      desc: 'Pure acoustic guitars, soothing vocals and raw organic sound'
    }
  ];

  if (index < baseSpecs.length) {
    return baseSpecs[index];
  }

  // Infinite expansion: dynamically cycle with artist/mood variants
  const cycle = Math.floor(index / baseSpecs.length);
  const artistIndex = (index) % artists.length;
  const currentArtist = artists[artistIndex];

  const moodVariations = [
    { title: 'Indie & Breakthrough Voices', query: `${weights.primaryLang} Indie Alternative` },
    { title: 'Golden Era Retro Rewind', query: `${weights.primaryLang} Retro Golden Era` },
    { title: 'Midnight Chill & Lo-Fi', query: `${weights.primaryLang} Chill Lo-Fi Midnight` },
    { title: 'Devotional Serenity', query: `${weights.primaryLang} Devotional Chants Peace` },
    { title: 'Monsoon Rain Melodies', query: `${weights.primaryLang} Rainy Day Melodies` },
    { title: 'Unplugged Coffeehouse Jam', query: `${weights.primaryLang} Unplugged Acoustic Jam` }
  ];

  const mood = moodVariations[index % moodVariations.length];

  return {
    type: 'mood',
    query: `${currentArtist} ${mood.query}`,
    title: `${currentArtist} • ${mood.title} (Vol. ${cycle + 1})`,
    desc: `Endless personalized radio and curated streams in ${weights.primaryLang}`
  };
}

/**
 * Returns dynamic list of music shelves based on active user context
 */
export function getDynamicMusicShelves(count = 12, customWeights?: ContentWeights): DynamicMusicShelfSpec[] {
  const weights = customWeights || getCurrentContentWeights();
  const list: DynamicMusicShelfSpec[] = [];
  for (let i = 0; i < count; i++) {
    list.push(getDynamicMusicShelfSpec(i, weights));
  }
  return list;
}

/**
 * Proactive Dynamic Shelf Data Fetchers (Zero Delay + SWR Caching + Deduplication)
 */
export async function fetchDynamicMovieShelf(
  index: number,
  customWeights?: ContentWeights
): Promise<{ title: string; subtitle: string; items: MovieItem[] }> {
  const spec = getDynamicMovieShelfSpec(index, customWeights);
  const cacheKey = `dyn_shelf_movie_${index}_${spec.title.replace(/\s+/g, '_')}`;

  const items = await fetchWithSWR(
    cacheKey,
    async () => {
      let raw: MovieItem[] = [];
      if (spec.sourceType === 'genre') {
        raw = await fetchPagedGenreMovies(spec.genre, 0);
      } else if (spec.sourceType === 'language' && spec.query) {
        const res = await searchMoviesAndShowsPaged(spec.query, 1);
        raw = res.items || [];
        if (raw.length === 0) {
          raw = await fetchInfiniteLanguageMovies(spec.genre, 0, 15);
        }
      } else if (spec.query) {
        const res = await searchMoviesAndShowsPaged(spec.query, 1);
        raw = res.items || [];
      }

      if (raw.length === 0) {
        raw = await fetchGenreMovies(spec.genre || 'Action');
      }

      return globalScreenRegistry.deduplicateMovies(raw, 5);
    },
    1000 * 60 * 15 // 15 mins SWR
  );

  return {
    title: spec.title,
    subtitle: spec.desc,
    items
  };
}

export async function fetchDynamicMusicShelf(
  index: number,
  customWeights?: ContentWeights
): Promise<{ title: string; subtitle: string; songs: SongItem[] }> {
  const spec = getDynamicMusicShelfSpec(index, customWeights);
  const cacheKey = `dyn_shelf_music_${index}_${spec.query.replace(/\s+/g, '_')}`;

  const songs = await fetchWithSWR(
    cacheKey,
    async () => {
      let raw: SongItem[] = [];
      if (spec.type === 'genre') {
        raw = await fetchGenreSongs(spec.query, 15);
      } else {
        raw = await searchSongsPaged(spec.query, 1, 15);
      }

      if (raw.length === 0) {
        raw = await fetchInfiniteLanguageSongs(getCurrentContentWeights().primaryLang, 0, 15);
      }

      return globalScreenRegistry.deduplicateSongs(raw, 5);
    },
    1000 * 60 * 15 // 15 mins SWR
  );

  return {
    title: spec.title,
    subtitle: spec.desc,
    songs
  };
}

// Dynamic proxies to preserve backwards compatibility while delivering 100% dynamic data
export const INFINITE_MOVIE_SHELVES_SPEC: DynamicMovieShelfSpec[] = new Proxy([] as DynamicMovieShelfSpec[], {
  get(_target, prop: string | symbol) {
    const list = getDynamicMovieShelves(12);
    if (prop === 'length') return list.length;
    if (typeof prop === 'string' && !isNaN(Number(prop))) {
      return getDynamicMovieShelfSpec(Number(prop));
    }
    const val = (list as any)[prop];
    if (typeof val === 'function') {
      return val.bind(list);
    }
    return val;
  }
});

export const INFINITE_MUSIC_SHELVES_SPEC: DynamicMusicShelfSpec[] = new Proxy([] as DynamicMusicShelfSpec[], {
  get(_target, prop: string | symbol) {
    const list = getDynamicMusicShelves(12);
    if (prop === 'length') return list.length;
    if (typeof prop === 'string' && !isNaN(Number(prop))) {
      return getDynamicMusicShelfSpec(Number(prop));
    }
    const val = (list as any)[prop];
    if (typeof val === 'function') {
      return val.bind(list);
    }
    return val;
  }
});

