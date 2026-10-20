// === StreamPlay Recommendation Engine — Type Definitions ===

export type SignalType =
  | 'click'            // User clicked/tapped on a title
  | 'detail_view'      // User opened the detail page
  | 'watch_start'      // User started playing a movie/song
  | 'watch_complete'   // User completed >75% of the content
  | 'search'           // User searched for a query
  | 'like'             // User liked/hearted a song
  | 'unlike'           // User unliked/unhearted a song
  | 'skip'             // User skipped a song within 30 seconds
  | 'add_watchlist'    // User added movie to Watch Later
  | 'add_playlist'     // User added song to a playlist
  | 'repeat_listen'    // User replayed a song
  | 'genre_browse';    // User browsed a genre category

export interface BehaviorSignal {
  type: SignalType;
  itemId: string;
  itemType: 'movie' | 'series' | 'song';
  timestamp: number;
  metadata?: {
    genres?: string[];
    language?: string;
    artist?: string;
    ottProvider?: string;
    query?: string;          // For search signals
    progress?: number;       // 0-1 for watch/listen progress
    duration?: number;       // Content duration in seconds
  };
}

export interface UserPreferenceProfile {
  // Weighted scores per category (higher = stronger affinity)
  genreWeights: Record<string, number>;
  languageWeights: Record<string, number>;
  artistWeights: Record<string, number>;
  ottWeights: Record<string, number>;

  // Interaction history (bounded)
  recentMovieIds: string[];     // Last 50 movie IDs interacted with
  recentSongIds: string[];      // Last 50 song IDs interacted with
  completedMovieIds: string[];  // Movies watched >75%
  completedSongIds: string[];   // Songs listened fully
  skippedSongIds: string[];     // Songs skipped early
  likedSongIds: string[];       // Songs the user has liked

  // Search intent history (last 30 queries)
  searchHistory: { query: string; timestamp: number }[];

  // Time-of-day patterns (genre weights bucketed by time of day)
  timePatterns: {
    morning: Record<string, number>;   // 6AM–12PM
    afternoon: Record<string, number>; // 12PM–5PM
    evening: Record<string, number>;   // 5PM–9PM
    night: Record<string, number>;     // 9PM–6AM
  };

  // "Because You Watched / Listened" anchor items
  lastWatchedMovies: { id: string; name: string; genres: string[]; timestamp: number }[];
  lastListenedSongs: { id: string; title: string; artist: string; genres: string[]; timestamp: number }[];

  // Metadata
  totalInteractions: number;
  lastUpdated: number;
  profileVersion: number;
}

export interface RecommendationResult {
  id: string;
  score: number;
  reason: string;        // e.g. "Because you watched Inception"
  reasonType:
    | 'genre_match'
    | 'similar_item'
    | 'trending'
    | 'language'
    | 'artist'
    | 'ott'
    | 'search_intent'
    | 'time_of_day'
    | 'exploration'
    | 'cold_start';
}

// Default empty profile for new users
export function createDefaultProfile(): UserPreferenceProfile {
  return {
    genreWeights: {},
    languageWeights: {},
    artistWeights: {},
    ottWeights: {},
    recentMovieIds: [],
    recentSongIds: [],
    completedMovieIds: [],
    completedSongIds: [],
    skippedSongIds: [],
    likedSongIds: [],
    searchHistory: [],
    timePatterns: {
      morning: {},
      afternoon: {},
      evening: {},
      night: {},
    },
    lastWatchedMovies: [],
    lastListenedSongs: [],
    totalInteractions: 0,
    lastUpdated: Date.now(),
    profileVersion: 1,
  };
}
