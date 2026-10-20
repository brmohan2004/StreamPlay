// === StreamPlay Recommendation Context ===
// Exposes computed recommendations to the UI. Refreshes when the catalog changes
// or when the user interacts enough to warrant a re-rank.

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { MovieItem, SongItem } from '../types/media';
import {
  getMovieRecommendations,
  getMusicRecommendations,
  getBecauseYouWatched,
  getBecauseYouListened,
  getDailyMix,
  getExplorationPicks,
  getExplorationSongs,
} from '../services/recommendationEngine';
import { getProfile, applyTemporalDecay, hasEnoughHistory } from '../services/recommendationTracker';

// ─── Types ───
interface BecauseYouWatchedEntry {
  anchor: { id: string; name: string; genres: string[] };
  movies: (MovieItem & { _recReason: string })[];
}

interface BecauseYouListenedEntry {
  anchor: { id: string; title: string; artist: string; genres: string[] };
  songs: (SongItem & { _recReason: string })[];
}

interface RecommendationContextType {
  // Movies
  forYouMovies: (MovieItem & { _recReason: string })[];
  becauseYouWatched: BecauseYouWatchedEntry[];
  explorationMovies: (MovieItem & { _recReason: string })[];

  // Music
  forYouSongs: (SongItem & { _recReason: string })[];
  becauseYouListened: BecauseYouListenedEntry[];
  dailyMix: (SongItem & { _recReason: string })[];
  discoverWeekly: (SongItem & { _recReason: string })[];

  // Status
  isReady: boolean;
  hasPersonalization: boolean;

  // Actions
  refreshRecommendations: () => void;
}

const RecommendationContext = createContext<RecommendationContextType | undefined>(undefined);

interface RecommendationProviderProps {
  children: React.ReactNode;
  movieCatalog: MovieItem[];
  songCatalog: SongItem[];
}

export const RecommendationProvider: React.FC<RecommendationProviderProps> = ({
  children,
  movieCatalog,
  songCatalog,
}) => {
  // Movies
  const [forYouMovies, setForYouMovies] = useState<(MovieItem & { _recReason: string })[]>([]);
  const [becauseYouWatched, setBecauseYouWatched] = useState<BecauseYouWatchedEntry[]>([]);
  const [explorationMovies, setExplorationMovies] = useState<(MovieItem & { _recReason: string })[]>([]);

  // Music
  const [forYouSongs, setForYouSongs] = useState<(SongItem & { _recReason: string })[]>([]);
  const [becauseYouListened, setBecauseYouListened] = useState<BecauseYouListenedEntry[]>([]);
  const [dailyMix, setDailyMix] = useState<(SongItem & { _recReason: string })[]>([]);
  const [discoverWeekly, setDiscoverWeekly] = useState<(SongItem & { _recReason: string })[]>([]);

  const [isReady, setIsReady] = useState(false);
  const hasPersonalization = hasEnoughHistory();

  // Debounce refresh to avoid rapid re-computation
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const computeRecommendations = useCallback(() => {
    // Apply decay on first computation per session
    applyTemporalDecay();

    const profile = getProfile();

    // ─── Movie Recommendations ───
    if (movieCatalog.length > 0) {
      setForYouMovies(getMovieRecommendations(movieCatalog, 12));

      // "Because You Watched" rows — up to 2 distinct anchor movies
      const bywEntries: BecauseYouWatchedEntry[] = [];
      const usedRecMovieIds = new Set<string>();

      for (const anchor of profile.lastWatchedMovies) {
        if (
          !anchor ||
          !anchor.name ||
          anchor.name === 'Untitled' ||
          anchor.id.startsWith('sports-') ||
          anchor.name.toLowerCase().includes('sports')
        ) {
          continue;
        }

        const recs = getBecauseYouWatched(anchor, movieCatalog, 8)
          .filter(m => !usedRecMovieIds.has(m.id));

        if (recs.length >= 2) {
          recs.forEach(m => usedRecMovieIds.add(m.id));
          bywEntries.push({ anchor, movies: recs });
          if (bywEntries.length >= 2) break;
        }
      }
      setBecauseYouWatched(bywEntries);

      // Exploration picks
      if (hasEnoughHistory()) {
        setExplorationMovies(getExplorationPicks(movieCatalog, 6));
      }
    }

    // ─── Music Recommendations ───
    if (songCatalog.length > 0) {
      setForYouSongs(getMusicRecommendations(songCatalog, 12));
      const primLang = localStorage.getItem('streamplay_primary_lang') || 'Tamil';
      const secLang = localStorage.getItem('streamplay_secondary_lang') || 'English';
      setDailyMix(getDailyMix(songCatalog, 12, primLang, secLang));
      setDiscoverWeekly(getExplorationSongs(songCatalog, 8));

      // "Because You Listened" rows — up to 2 anchor songs
      const bylEntries: BecauseYouListenedEntry[] = [];
      for (const anchor of profile.lastListenedSongs.slice(0, 2)) {
        const recs = getBecauseYouListened(anchor, songCatalog, 8);
        if (recs.length >= 2) {
          bylEntries.push({ anchor, songs: recs });
        }
      }
      setBecauseYouListened(bylEntries);
    }

    setIsReady(true);
  }, [movieCatalog, songCatalog]);

  // Recompute when catalogs change (initial load + lazy loaded content)
  useEffect(() => {
    if (movieCatalog.length > 0 || songCatalog.length > 0) {
      computeRecommendations();
    }
  }, [movieCatalog, songCatalog, computeRecommendations]);

  // Public refresh — debounced so rapid interactions don't cause jank
  const refreshRecommendations = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      computeRecommendations();
    }, 2000); // 2 second debounce
  }, [computeRecommendations]);

  // Listen for profile updates via a custom event (fired from MediaContext after logging signals)
  useEffect(() => {
    const handler = () => refreshRecommendations();
    window.addEventListener('streamplay-rec-update', handler);
    return () => window.removeEventListener('streamplay-rec-update', handler);
  }, [refreshRecommendations]);

  return (
    <RecommendationContext.Provider
      value={{
        forYouMovies,
        becauseYouWatched,
        explorationMovies,
        forYouSongs,
        becauseYouListened,
        dailyMix,
        discoverWeekly,
        isReady,
        hasPersonalization,
        refreshRecommendations,
      }}
    >
      {children}
    </RecommendationContext.Provider>
  );
};

export const useRecommendations = () => {
  const ctx = useContext(RecommendationContext);
  if (!ctx) throw new Error('useRecommendations must be used within RecommendationProvider');
  return ctx;
};
