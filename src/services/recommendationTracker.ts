// === StreamPlay Recommendation Tracker ===
// Captures user behavioral signals and maintains the UserPreferenceProfile in localStorage.

import {
  BehaviorSignal,
  SignalType,
  UserPreferenceProfile,
  createDefaultProfile,
} from '../types/recommendation';

// ─── Storage Keys ───
const PROFILE_KEY = 'streamplay_rec_profile';
const SIGNALS_KEY = 'streamplay_rec_signals';

// ─── Limits ───
const MAX_RECENT_MOVIES = 50;
const MAX_RECENT_SONGS = 50;
const MAX_COMPLETED_MOVIES = 100;
const MAX_COMPLETED_SONGS = 100;
const MAX_SKIPPED_SONGS = 80;
const MAX_LIKED_SONGS = 200;
const MAX_SEARCH_HISTORY = 30;
const MAX_LAST_WATCHED = 10;
const MAX_LAST_LISTENED = 10;
const MAX_RAW_SIGNALS = 500;

// ─── Signal Weight Matrix ───
const SIGNAL_WEIGHTS: Record<SignalType, { genre: number; language: number; artist: number; ott: number }> = {
  click:          { genre: 1,  language: 1,  artist: 0,  ott: 1 },
  detail_view:    { genre: 1,  language: 1,  artist: 0,  ott: 1 },
  watch_start:    { genre: 2,  language: 1,  artist: 1,  ott: 1 },
  watch_complete: { genre: 5,  language: 3,  artist: 3,  ott: 2 },
  search:         { genre: 2,  language: 1,  artist: 1,  ott: 0 },
  like:           { genre: 3,  language: 2,  artist: 2,  ott: 0 },
  unlike:         { genre: -2, language: -1, artist: -2, ott: 0 },
  skip:           { genre: -2, language: -1, artist: -3, ott: 0 },
  add_watchlist:  { genre: 2,  language: 1,  artist: 0,  ott: 1 },
  add_playlist:   { genre: 2,  language: 1,  artist: 2,  ott: 0 },
  repeat_listen:  { genre: 2,  language: 1,  artist: 4,  ott: 0 },
  genre_browse:   { genre: 3,  language: 0,  artist: 0,  ott: 0 },
};

// ─── Temporal Decay ───
const DECAY_LAMBDA = 0.05; // Half-life ≈ 14 days

function getTimeBucket(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function boundArray<T>(arr: T[], max: number): T[] {
  return arr.length > max ? arr.slice(0, max) : arr;
}

// ─── Public API ───

/** Load the user preference profile from localStorage (or create a fresh one). */
export function getProfile(): UserPreferenceProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as UserPreferenceProfile;
      if (parsed.profileVersion) return parsed;
    }
  } catch {
    // Corrupted data – fall through to default
  }
  const fresh = createDefaultProfile();
  saveProfile(fresh);
  return fresh;
}

/** Persist the profile to localStorage. */
export function saveProfile(profile: UserPreferenceProfile): void {
  profile.lastUpdated = Date.now();
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.warn('[StreamPlay Rec] Failed to save profile:', e);
  }
}

/** Reset the entire recommendation profile (e.g. from profile settings). */
export function resetProfile(): void {
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem(SIGNALS_KEY);
}

/** Append a raw signal to the signal buffer (for debugging / advanced use). */
function appendRawSignal(signal: BehaviorSignal): void {
  try {
    const raw = localStorage.getItem(SIGNALS_KEY);
    const signals: BehaviorSignal[] = raw ? JSON.parse(raw) : [];
    signals.unshift(signal);
    localStorage.setItem(SIGNALS_KEY, JSON.stringify(boundArray(signals, MAX_RAW_SIGNALS)));
  } catch {
    // Non-critical — silently fail
  }
}

/** Central method: log a user behavior signal and update the preference profile. */
export function logSignal(signal: BehaviorSignal): void {
  appendRawSignal(signal);

  const profile = getProfile();
  const weights = SIGNAL_WEIGHTS[signal.type];
  const meta = signal.metadata || {};
  const timeBucket = getTimeBucket();

  // --- Update Genre Weights ---
  if (meta.genres && meta.genres.length > 0) {
    for (const genre of meta.genres) {
      const g = genre.trim();
      if (!g) continue;
      profile.genreWeights[g] = (profile.genreWeights[g] || 0) + weights.genre;
      // Time-of-day genre tracking
      if (weights.genre > 0) {
        profile.timePatterns[timeBucket][g] = (profile.timePatterns[timeBucket][g] || 0) + weights.genre;
      }
    }
  }

  // --- Update Language Weights ---
  if (meta.language) {
    profile.languageWeights[meta.language] = (profile.languageWeights[meta.language] || 0) + weights.language;
  }

  // --- Update Artist Weights ---
  if (meta.artist) {
    profile.artistWeights[meta.artist] = (profile.artistWeights[meta.artist] || 0) + weights.artist;
  }

  // --- Update OTT Weights ---
  if (meta.ottProvider) {
    profile.ottWeights[meta.ottProvider] = (profile.ottWeights[meta.ottProvider] || 0) + weights.ott;
  }

  // --- Update Interaction Lists ---
  const itemId = signal.itemId;

  if (signal.itemType === 'movie' || signal.itemType === 'series') {
    // Recent movies
    profile.recentMovieIds = boundArray(
      [itemId, ...profile.recentMovieIds.filter(id => id !== itemId)],
      MAX_RECENT_MOVIES
    );

    // Completed movies
    if (signal.type === 'watch_complete') {
      if (!profile.completedMovieIds.includes(itemId)) {
        profile.completedMovieIds = boundArray([itemId, ...profile.completedMovieIds], MAX_COMPLETED_MOVIES);
      }
    }

    // Last watched (for "Because You Watched" row)
    if (signal.type === 'watch_complete' || signal.type === 'watch_start') {
      profile.lastWatchedMovies = boundArray(
        [
          { id: itemId, name: meta.query || itemId, genres: meta.genres || [], timestamp: signal.timestamp },
          ...profile.lastWatchedMovies.filter(m => m.id !== itemId),
        ],
        MAX_LAST_WATCHED
      );
    }
  }

  if (signal.itemType === 'song') {
    // Recent songs
    profile.recentSongIds = boundArray(
      [itemId, ...profile.recentSongIds.filter(id => id !== itemId)],
      MAX_RECENT_SONGS
    );

    // Completed songs
    if (signal.type === 'watch_complete') {
      if (!profile.completedSongIds.includes(itemId)) {
        profile.completedSongIds = boundArray([itemId, ...profile.completedSongIds], MAX_COMPLETED_SONGS);
      }
    }

    // Skipped songs
    if (signal.type === 'skip') {
      if (!profile.skippedSongIds.includes(itemId)) {
        profile.skippedSongIds = boundArray([itemId, ...profile.skippedSongIds], MAX_SKIPPED_SONGS);
      }
    }

    // Liked songs sync
    if (signal.type === 'like') {
      if (!profile.likedSongIds.includes(itemId)) {
        profile.likedSongIds = boundArray([itemId, ...profile.likedSongIds], MAX_LIKED_SONGS);
      }
    } else if (signal.type === 'unlike') {
      profile.likedSongIds = profile.likedSongIds.filter(id => id !== itemId);
    }

    // Last listened (for "Because You Listened" row)
    if (signal.type === 'watch_complete' || signal.type === 'repeat_listen') {
      profile.lastListenedSongs = boundArray(
        [
          {
            id: itemId,
            title: meta.query || itemId,
            artist: meta.artist || '',
            genres: meta.genres || [],
            timestamp: signal.timestamp,
          },
          ...profile.lastListenedSongs.filter(s => s.id !== itemId),
        ],
        MAX_LAST_LISTENED
      );
    }
  }

  // --- Search History ---
  if (signal.type === 'search' && meta.query) {
    profile.searchHistory = boundArray(
      [{ query: meta.query, timestamp: signal.timestamp }, ...profile.searchHistory],
      MAX_SEARCH_HISTORY
    );
  }

  profile.totalInteractions += 1;
  saveProfile(profile);
}

/**
 * Apply temporal decay to all weight maps in the profile.
 * Call this periodically (e.g. on app load or once per session).
 */
export function applyTemporalDecay(): void {
  const profile = getProfile();
  const now = Date.now();
  const daysSinceUpdate = (now - profile.lastUpdated) / (1000 * 60 * 60 * 24);

  // Only decay if at least 1 day has passed since last update
  if (daysSinceUpdate < 1) return;

  const decayFactor = Math.exp(-DECAY_LAMBDA * daysSinceUpdate);

  const decayMap = (map: Record<string, number>): Record<string, number> => {
    const result: Record<string, number> = {};
    for (const [key, value] of Object.entries(map)) {
      const decayed = value * decayFactor;
      // Prune weights that have decayed below 0.1
      if (Math.abs(decayed) >= 0.1) {
        result[key] = Math.round(decayed * 100) / 100;
      }
    }
    return result;
  };

  profile.genreWeights = decayMap(profile.genreWeights);
  profile.languageWeights = decayMap(profile.languageWeights);
  profile.artistWeights = decayMap(profile.artistWeights);
  profile.ottWeights = decayMap(profile.ottWeights);

  // Decay time patterns too
  profile.timePatterns.morning = decayMap(profile.timePatterns.morning);
  profile.timePatterns.afternoon = decayMap(profile.timePatterns.afternoon);
  profile.timePatterns.evening = decayMap(profile.timePatterns.evening);
  profile.timePatterns.night = decayMap(profile.timePatterns.night);

  saveProfile(profile);
}

/** Check whether the user has enough interaction history for personalized recommendations. */
export function hasEnoughHistory(): boolean {
  const profile = getProfile();
  return profile.totalInteractions >= 3;
}

/** Get the top-N genres the user prefers (sorted descending by weight). */
export function getTopGenres(limit = 5): string[] {
  const profile = getProfile();
  return Object.entries(profile.genreWeights)
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([genre]) => genre);
}

/** Get the top-N artists the user prefers. */
export function getTopArtists(limit = 5): string[] {
  const profile = getProfile();
  return Object.entries(profile.artistWeights)
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([artist]) => artist);
}
