// === StreamPlay Recommendation Engine ===
// Scores & ranks catalog items based on the user preference profile.

import { MovieItem, SongItem } from '../types/media';
import { RecommendationResult } from '../types/recommendation';
import { getProfile, hasEnoughHistory } from './recommendationTracker';

// ─── Time Bucket Helper ───
function getTimeBucket(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

// ─── Diversity Helper ───
// Ensures no more than ~40% of results share the same primary genre
function applyDiversity<T extends { id: string }>(
  scored: { item: T; score: number; reason: string; reasonType: RecommendationResult['reasonType']; primaryGenre?: string }[],
  limit: number
): { item: T; score: number; reason: string; reasonType: RecommendationResult['reasonType'] }[] {
  const result: typeof scored = [];
  const genreCounts: Record<string, number> = {};
  const maxPerGenre = Math.max(2, Math.ceil(limit * 0.4));

  for (const entry of scored) {
    const pg = entry.primaryGenre || '_none_';
    if ((genreCounts[pg] || 0) >= maxPerGenre) continue;
    result.push(entry);
    genreCounts[pg] = (genreCounts[pg] || 0) + 1;
    if (result.length >= limit) break;
  }

  // If we haven't hit the limit, fill from remaining
  if (result.length < limit) {
    const usedIds = new Set(result.map(r => r.item.id));
    for (const entry of scored) {
      if (usedIds.has(entry.item.id)) continue;
      result.push(entry);
      if (result.length >= limit) break;
    }
  }

  return result;
}

// ────────────────────────────────────────────────────
//  MOVIE RECOMMENDATIONS
// ────────────────────────────────────────────────────

/** Score a single movie against the user profile. */
function scoreMovie(movie: MovieItem): { score: number; reason: string; reasonType: RecommendationResult['reasonType']; primaryGenre: string } {
  const profile = getProfile();
  let score = 0;
  let topReason = '';
  let topReasonType: RecommendationResult['reasonType'] = 'genre_match';
  let highestContrib = 0;
  const primaryGenre = movie.genres?.[0] || '';

  // 1. Genre affinity
  for (const genre of movie.genres || []) {
    const w = profile.genreWeights[genre] || 0;
    score += w;
    if (w > highestContrib) {
      highestContrib = w;
      topReason = `Matches your love for ${genre}`;
      topReasonType = 'genre_match';
    }
  }

  // 2. Language affinity (inferred from user language preferences)
  for (const [lang, w] of Object.entries(profile.languageWeights)) {
    if (w > 0) {
      const matchInGenres = movie.genres?.some(g => g.toLowerCase() === lang.toLowerCase());
      const matchInTitle = movie.name?.toLowerCase().includes(lang.toLowerCase());
      if (matchInGenres || matchInTitle) {
        score += w * 1.5;
        if (w > highestContrib) {
          highestContrib = w;
          topReason = `${lang} cinema pick for you`;
          topReasonType = 'language';
        }
      } else {
        score += w * 0.1;
      }
    }
  }

  // 3. OTT platform affinity
  if (movie.ottProvider && profile.ottWeights[movie.ottProvider]) {
    const ottW = profile.ottWeights[movie.ottProvider];
    score += ottW;
    if (ottW > highestContrib) {
      highestContrib = ottW;
      topReason = `Popular on ${movie.ottProvider}`;
      topReasonType = 'ott';
    }
  }

  // 4. Time-of-day bonus
  const timeBucket = getTimeBucket();
  const timeWeights = profile.timePatterns[timeBucket];
  for (const genre of movie.genres || []) {
    const tw = timeWeights[genre] || 0;
    score += tw * 0.5;
    if (tw > highestContrib && tw > 2) {
      highestContrib = tw;
      topReason = `Great for your ${timeBucket} watch`;
      topReasonType = 'time_of_day';
    }
  }

  // 5. Popularity baseline (use IMDB rating as a proxy)
  const rating = parseFloat(movie.imdbRating || '0');
  score += rating * 0.3;

  // 6. Penalize already-watched
  if (profile.completedMovieIds.includes(movie.id)) {
    score -= 10;
  }

  // 7. Mild boost for recently interacted genres from search history
  for (const entry of profile.searchHistory.slice(0, 5)) {
    const q = entry.query.toLowerCase();
    for (const genre of movie.genres || []) {
      if (q.includes(genre.toLowerCase())) {
        score += 1.5;
        if (topReasonType === 'genre_match' || highestContrib < 1.5) {
          topReason = `Related to your search "${entry.query}"`;
          topReasonType = 'search_intent';
        }
      }
    }
  }

  // Default reason fallback
  if (!topReason) {
    topReason = rating >= 7 ? 'Highly rated' : 'Trending now';
    topReasonType = 'trending';
  }

  return { score, reason: topReason, reasonType: topReasonType, primaryGenre };
}

/** Get personalized movie recommendations from a catalog. */
export function getMovieRecommendations(catalog: MovieItem[], limit = 12): (MovieItem & { _recReason: string })[] {
  if (!hasEnoughHistory()) {
    return getColdStartMovies(catalog, limit);
  }

  const scored = catalog.map(movie => {
    const { score, reason, reasonType, primaryGenre } = scoreMovie(movie);
    return { item: movie, score, reason, reasonType, primaryGenre };
  });

  scored.sort((a, b) => b.score - a.score);

  const diverse = applyDiversity(scored, limit);
  return diverse.map(d => ({ ...d.item, _recReason: d.reason }));
}

/** "Because You Watched [X]" — find movies similar to a specific watched movie. */
export function getBecauseYouWatched(
  anchorMovie: { id: string; name: string; genres: string[] },
  catalog: MovieItem[],
  limit = 8
): (MovieItem & { _recReason: string })[] {
  if (!anchorMovie.genres || anchorMovie.genres.length === 0 || !anchorMovie.name || anchorMovie.name === 'Untitled') {
    return [];
  }

  const anchorGenres = new Set(anchorMovie.genres.map(g => g.toLowerCase()));

  const scored = catalog
    .filter(m => m.id !== anchorMovie.id)
    .map(movie => {
      let score = 0;
      let matched = false;
      for (const genre of movie.genres || []) {
        if (anchorGenres.has(genre.toLowerCase())) {
          score += 3;
          matched = true;
        }
      }

      if (!matched) {
        return {
          item: movie,
          score: 0,
          reason: '',
          reasonType: 'similar_item' as RecommendationResult['reasonType'],
          primaryGenre: ''
        };
      }

      // Popularity boost
      score += parseFloat(movie.imdbRating || '0') * 0.2;
      return {
        item: movie,
        score,
        reason: `Because you watched ${anchorMovie.name}`,
        reasonType: 'similar_item' as RecommendationResult['reasonType'],
        primaryGenre: movie.genres?.[0] || '',
      };
    })
    .filter(s => s.score > 0);

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(d => ({ ...d.item, _recReason: d.reason }));
}

/** Cold-start: return top-rated movies for new users. */
function getColdStartMovies(catalog: MovieItem[], limit: number): (MovieItem & { _recReason: string })[] {
  return [...catalog]
    .sort((a, b) => parseFloat(b.imdbRating || '0') - parseFloat(a.imdbRating || '0'))
    .slice(0, limit)
    .map(m => ({ ...m, _recReason: 'Top rated on StreamPlay' }));
}

// ────────────────────────────────────────────────────
//  MUSIC RECOMMENDATIONS
// ────────────────────────────────────────────────────

/** Score a single song against the user profile. */
function scoreSong(song: SongItem): { score: number; reason: string; reasonType: RecommendationResult['reasonType'] } {
  const profile = getProfile();
  let score = 0;
  let topReason = '';
  let topReasonType: RecommendationResult['reasonType'] = 'genre_match';
  let highestContrib = 0;

  // 1. Artist affinity (strongest signal for music)
  if (song.artist) {
    // Check each known artist in the song's artist string
    for (const [knownArtist, w] of Object.entries(profile.artistWeights)) {
      if (w > 0 && song.artist.toLowerCase().includes(knownArtist.toLowerCase())) {
        score += w * 1.5;
        if (w > highestContrib) {
          highestContrib = w;
          topReason = `You love ${knownArtist}`;
          topReasonType = 'artist';
        }
      }
    }
  }

  // 2. Language affinity
  if (song.language) {
    const langW = profile.languageWeights[song.language] || 0;
    score += langW;
    if (langW > highestContrib) {
      highestContrib = langW;
      topReason = `${song.language} music you enjoy`;
      topReasonType = 'language';
    }
  }

  // 3. Genre affinity (music genres are less explicit, but we try)
  // Songs from JioSaavn don't have explicit genres, but we can cross-reference with
  // the user's genre weights from movie watching for shared concepts like "Romance", "Party", etc.
  for (const [genre, w] of Object.entries(profile.genreWeights)) {
    if (w > 0) {
      // Check if album or title hints at a genre
      const titleLower = (song.title + ' ' + song.album).toLowerCase();
      const genreLower = genre.toLowerCase();
      if (titleLower.includes(genreLower)) {
        score += w * 0.5;
      }
    }
  }

  // 4. Time-of-day bonus
  const timeBucket = getTimeBucket();
  const timeWeights = profile.timePatterns[timeBucket];
  for (const [genre, tw] of Object.entries(timeWeights)) {
    if (tw > 0) {
      const titleLower = (song.title + ' ' + song.album + ' ' + song.artist).toLowerCase();
      if (titleLower.includes(genre.toLowerCase())) {
        score += tw * 0.3;
      }
    }
  }

  // 5. Penalize already-skipped songs
  if (profile.skippedSongIds.includes(song.id)) {
    score -= 5;
  }

  // 6. Boost liked songs slightly (they should still appear but not dominate)
  if (profile.likedSongIds.includes(song.id)) {
    score += 1;
  }

  // 7. Penalize already-completed (mild — repeats are OK for music)
  if (profile.completedSongIds.includes(song.id)) {
    score -= 1;
  }

  // 8. Search history boost
  for (const entry of profile.searchHistory.slice(0, 5)) {
    const q = entry.query.toLowerCase();
    if (
      song.title.toLowerCase().includes(q) ||
      song.artist.toLowerCase().includes(q) ||
      song.album.toLowerCase().includes(q)
    ) {
      score += 2;
      if (highestContrib < 2) {
        topReason = `Related to your search "${entry.query}"`;
        topReasonType = 'search_intent';
      }
    }
  }

  if (!topReason) {
    topReason = 'Trending now';
    topReasonType = 'trending';
  }

  return { score, reason: topReason, reasonType: topReasonType };
}

/** Get personalized music recommendations from a catalog. */
export function getMusicRecommendations(catalog: SongItem[], limit = 12): (SongItem & { _recReason: string })[] {
  if (!hasEnoughHistory()) {
    return getColdStartSongs(catalog, limit);
  }

  const scored = catalog.map(song => {
    const { score, reason, reasonType } = scoreSong(song);
    return { item: song, score, reason, reasonType };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(d => ({ ...d.item, _recReason: d.reason }));
}

/** "Because You Listened to [X]" — find songs similar to a specific listened song. */
export function getBecauseYouListened(
  anchorSong: { id: string; title: string; artist: string; genres: string[] },
  catalog: SongItem[],
  limit = 8
): (SongItem & { _recReason: string })[] {
  const scored = catalog
    .filter(s => s.id !== anchorSong.id)
    .map(song => {
      let score = 0;

      // Artist match is the strongest signal for music
      if (
        song.artist &&
        anchorSong.artist &&
        song.artist.toLowerCase().includes(anchorSong.artist.toLowerCase())
      ) {
        score += 5;
      }

      // Language match (if both have language tags)
      if (song.language && anchorSong.genres.some(g => g.toLowerCase() === song.language?.toLowerCase())) {
        score += 2;
      }

      return {
        item: song,
        score,
        reason: `Because you listened to ${anchorSong.title}`,
        reasonType: 'similar_item' as RecommendationResult['reasonType'],
      };
    })
    .filter(s => s.score > 0);

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(d => ({ ...d.item, _recReason: d.reason }));
}

/**
 * Dynamic Daily Mix:
 * Based on primary and secondary languages, daily trending songs, albums, and playlists,
 * blended with time-of-day audio profiles.
 */
export function getDailyMix(
  catalog: SongItem[],
  limit = 12,
  primaryLang?: string,
  secondaryLang?: string
): (SongItem & { _recReason: string })[] {
  const profile = getProfile();
  const timeBucket = getTimeBucket();
  const timeWeights = profile.timePatterns[timeBucket] || {};

  const prim = (primaryLang || (profile as any).preferredLanguage || 'Tamil').toLowerCase();
  const sec = (secondaryLang || 'English').toLowerCase();

  const bucketLabels: Record<string, string> = {
    morning: '☀️ Morning Daily Energy',
    afternoon: '🌤️ Afternoon Vibe Mix',
    evening: '🌆 Evening Chillout',
    night: '🌙 Late Night Ambient',
  };

  const scored = catalog.map(song => {
    let score = 0;
    const titleLower = (song.title + ' ' + song.album + ' ' + song.artist).toLowerCase();
    const songLang = (song.language || '').toLowerCase();

    // 1. Primary language affinity
    if (songLang.includes(prim) || titleLower.includes(prim)) {
      score += 12;
    }

    // 2. Secondary language affinity
    if (songLang.includes(sec) || titleLower.includes(sec)) {
      score += 8;
    }

    // 3. Trending & Album / Playlist signal
    if (song.album && song.album !== 'Single') {
      score += 4;
    }
    if (titleLower.includes('trending') || titleLower.includes('hits') || titleLower.includes('top')) {
      score += 5;
    }

    // 4. Time bucket weights
    for (const [genre, tw] of Object.entries(timeWeights)) {
      if (titleLower.includes(genre.toLowerCase())) {
        score += tw;
      }
    }

    // 5. Artist affinity
    for (const [artist, aw] of Object.entries(profile.artistWeights)) {
      if (aw > 0 && song.artist?.toLowerCase().includes(artist.toLowerCase())) {
        score += aw * 0.8;
      }
    }

    let reason = bucketLabels[timeBucket] || 'Your Daily Mix';
    if (songLang.includes(prim)) {
      reason = `Daily Mix • ${primaryLang || 'Trending'}`;
    }

    return {
      item: song,
      score,
      reason,
      reasonType: 'time_of_day' as RecommendationResult['reasonType'],
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(d => ({ ...d.item, _recReason: d.reason }));
}

/** Exploration picks — high-quality items from genres the user hasn't explored much. */
export function getExplorationPicks(catalog: MovieItem[], limit = 6): (MovieItem & { _recReason: string })[] {
  const profile = getProfile();
  const strongGenres = new Set(
    Object.entries(profile.genreWeights)
      .filter(([, w]) => w > 3)
      .map(([g]) => g.toLowerCase())
  );

  const unexplored = catalog.filter(m => {
    const movieGenres = (m.genres || []).map(g => g.toLowerCase());
    // Movie must NOT primarily belong to the user's strong genres
    return movieGenres.length > 0 && !movieGenres.some(g => strongGenres.has(g));
  });

  // Sort by rating — show the best of the unexplored
  unexplored.sort((a, b) => parseFloat(b.imdbRating || '0') - parseFloat(a.imdbRating || '0'));

  return unexplored.slice(0, limit).map(m => ({
    ...m,
    _recReason: 'Something different for you',
  }));
}

/** Cold-start: return a basic trending list for new users. */
function getColdStartSongs(catalog: SongItem[], limit: number): (SongItem & { _recReason: string })[] {
  return catalog.slice(0, limit).map(s => ({ ...s, _recReason: 'Trending on StreamPlay' }));
}

/** Exploration songs ("Discover Weekly") — fresh tracks outside the user's top artists. */
export function getExplorationSongs(catalog: SongItem[], limit = 6): (SongItem & { _recReason: string })[] {
  const profile = getProfile();
  const strongArtists = new Set(
    Object.entries(profile.artistWeights)
      .filter(([, w]) => w > 2)
      .map(([a]) => a.toLowerCase())
  );

  const unexplored = catalog.filter(s => {
    if (!s.artist) return true;
    const a = s.artist.toLowerCase();
    return !Array.from(strongArtists).some(sa => a.includes(sa));
  });

  return (unexplored.length > 0 ? unexplored : catalog)
    .slice(0, limit)
    .map(s => ({
      ...s,
      _recReason: 'Fresh sound outside your comfort zone',
    }));
}

