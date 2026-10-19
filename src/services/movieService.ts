import { MovieItem, OTTBrand, OTTMetadata } from '../types/media';

const CINEMETA_BASE = 'https://v3-cinemeta.strem.io';

export const OTT_PLATFORMS: OTTMetadata[] = [
  {
    brand: 'All',
    displayName: 'All OTTs',
    tagline: 'All streaming catalogs combined',
    accentColor: '#00d2ff',
    logoText: 'ALL',
    popularQueries: ['Action', 'Thriller', 'Popular']
  },
  {
    brand: 'Netflix',
    displayName: 'Netflix',
    tagline: 'Unlimited original series & films',
    accentColor: '#E50914',
    logoText: 'NETFLIX',
    popularQueries: ['Stranger Things', 'Squid Game', 'Wednesday', 'Money Heist', 'Extraction']
  },
  {
    brand: 'JioHotstar',
    displayName: 'JioHotstar',
    tagline: 'Disney, Marvel, HBO & Indian Blockbusters',
    accentColor: '#1288FF',
    logoText: 'JIOHOTSTAR',
    popularQueries: ['Loki', 'The Mandalorian', 'Marvel', 'House of the Dragon', 'Aarya']
  },
  {
    brand: 'Prime Video',
    displayName: 'Prime Video',
    tagline: 'Amazon Originals & Global Hits',
    accentColor: '#00A8E1',
    logoText: 'PRIME',
    popularQueries: ['The Boys', 'Reacher', 'Fallout', 'Mirzapur', 'Panchayat']
  },
  {
    brand: 'Apple TV+',
    displayName: 'Apple TV+',
    tagline: 'Award-winning Apple Originals',
    accentColor: '#FFFFFF',
    logoText: 'APPLE TV+',
    popularQueries: ['Severance', 'Ted Lasso', 'Foundation', 'Slow Horses', 'Silu']
  },
  {
    brand: 'Sony LIV',
    displayName: 'Sony LIV',
    tagline: 'Original series & Premium sports drama',
    accentColor: '#FD7E14',
    logoText: 'SONYLIV',
    popularQueries: ['Scam 1992', 'Rocket Boys', 'Maharani', 'Gullak', 'Undekhi']
  },
  {
    brand: 'Zee5',
    displayName: 'Zee5',
    tagline: 'Blockbuster regional cinema & originals',
    accentColor: '#A855F7',
    logoText: 'ZEE5',
    popularQueries: ['Taj', 'Manoj Bajpayee', 'Sunflower', 'Saas Bahu Achaar']
  }
];

export async function fetchTopMovies(): Promise<MovieItem[]> {
  try {
    const res = await fetch(`${CINEMETA_BASE}/catalog/movie/top.json`);
    const data = await res.json();
    return (data.metas || []).map((m: any) => formatMovie(m, 'movie'));
  } catch (err) {
    console.error('Failed to fetch top movies:', err);
    return [];
  }
}

export async function fetchTopSeries(): Promise<MovieItem[]> {
  try {
    const res = await fetch(`${CINEMETA_BASE}/catalog/series/top.json`);
    const data = await res.json();
    return (data.metas || []).map((m: any) => formatMovie(m, 'series'));
  } catch (err) {
    console.error('Failed to fetch top series:', err);
    return [];
  }
}

export async function searchMoviesAndShows(query: string): Promise<MovieItem[]> {
  if (!query.trim()) return [];
  try {
    const [movieRes, seriesRes] = await Promise.all([
      fetch(`${CINEMETA_BASE}/catalog/movie/top/search=${encodeURIComponent(query)}.json`).then(r => r.json()),
      fetch(`${CINEMETA_BASE}/catalog/series/top/search=${encodeURIComponent(query)}.json`).then(r => r.json())
    ]);

    const movies = (movieRes.metas || []).map((m: any) => formatMovie(m, 'movie'));
    const series = (seriesRes.metas || []).map((m: any) => formatMovie(m, 'series'));
    return [...movies, ...series];
  } catch (err) {
    console.error('Search failed:', err);
    return [];
  }
}

export async function fetchByOTT(brand: OTTBrand): Promise<MovieItem[]> {
  if (brand === 'All') {
    const [movies, series] = await Promise.all([fetchTopMovies(), fetchTopSeries()]);
    return [...movies.slice(0, 15), ...series.slice(0, 15)];
  }

  const platform = OTT_PLATFORMS.find(p => p.brand === brand);
  if (!platform) return [];

  const results: MovieItem[] = [];
  for (const q of platform.popularQueries) {
    const items = await searchMoviesAndShows(q);
    if (items.length > 0) {
      const top = items[0];
      top.ottProvider = brand;
      if (!results.some(r => r.id === top.id)) {
        results.push(top);
      }
    }
  }
  return results;
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
    genres: item.genres || ['Drama', 'Action']
  };
}

export async function fetchGenreMovies(genre: string): Promise<MovieItem[]> {
  try {
    const res = await fetch(`${CINEMETA_BASE}/catalog/movie/top/genre=${encodeURIComponent(genre)}.json`);
    const data = await res.json();
    return (data.metas || []).map((m: any) => formatMovie(m, 'movie'));
  } catch (err) {
    console.error(`Failed to fetch genre ${genre}:`, err);
    return [];
  }
}

export async function fetchLanguageMovies(language: string): Promise<MovieItem[]> {
  const languageKeywords: Record<string, string[]> = {
    Tamil: ['Leo', 'Jailer', 'Vikram', 'Ponniyin Selvan', 'Master'],
    Hindi: ['Jawan', 'Animal', 'Pathaan', 'Stree', 'Fighter'],
    Telugu: ['RRR', 'Salaar', 'Pushpa', 'Kalki', 'Devara'],
    Malayalam: ['Manjummel Boys', 'Aadujeevitham', 'Aavesham', 'Premalu'],
    Kannada: ['KGF', 'Kantara', 'Charlie 777', 'Kantara'],
    English: ['Oppenheimer', 'Dune', 'Avatar', 'Interstellar', 'Batman'],
    Korean: ['Parasite', 'Squid Game', 'Train to Busan', 'Oldboy']
  };

  const keywords = languageKeywords[language] || [language, 'Cinema'];
  const results: MovieItem[] = [];

  for (const q of keywords.slice(0, 3)) {
    const list = await searchMoviesAndShows(q);
    for (const item of list) {
      if (!results.some(r => r.id === item.id)) {
        results.push(item);
      }
    }
  }

  return results.length ? results : fetchGenreMovies('Action');
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
      director: m.director || [],
      runtime: m.runtime || '',
      trailer: m.trailerStreams?.[0]?.ytId ? `https://www.youtube.com/embed/${m.trailerStreams[0].ytId}` : undefined,
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

export function getStreamEmbedUrl(
  id: string,
  type: 'movie' | 'series',
  providerIndex = 0,
  season = 1,
  episode = 1
): string {
  const cleanId = id.trim();
  const rawId = cleanId.replace('tt', '');

  // Multi-source clean streaming providers
  const providers = [
    // Server 1: VidLink (Ultra HD Fast CDN)
    type === 'series'
      ? `https://vidlink.pro/tv/${cleanId}/${season}/${episode}`
      : `https://vidlink.pro/movie/${cleanId}`,

    // Server 2: NetMirror / SmashyStream
    type === 'series'
      ? `https://player.smashy.stream/tv/${cleanId}?s=${season}&e=${episode}`
      : `https://player.smashy.stream/movie/${cleanId}`,

    // Server 3: 2Embed (Multi-Audio & Subs)
    type === 'series'
      ? `https://2embed.cc/embedtv/${cleanId}&s=${season}&e=${episode}`
      : `https://2embed.cc/embed/${cleanId}`,

    // Server 4: CineSrc Direct CDN
    type === 'series'
      ? `https://cinesrc.st/embed/tv/${rawId}/${season}/${episode}`
      : `https://cinesrc.st/embed/movie/${rawId}`,

    // Server 5: EmbedMaster / SuperEmbed
    type === 'series'
      ? `https://embedmaster.link/tv/${cleanId}/${season}/${episode}`
      : `https://embedmaster.link/movie/${cleanId}`
  ];

  return providers[Math.abs(providerIndex) % providers.length];
}

