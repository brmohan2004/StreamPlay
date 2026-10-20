import './MoviesHomeScreen.css';
import React, { useState, useEffect, useRef } from 'react';
import { TopAppHeader } from '../components/TopAppHeader';
import {
  MovieTrendingFannedDeck,
  MovieSpotlightCard,
  MovieBackdropCard,
  MovieRankedCard,
  MovieTileCard,
  MoviePanoramaCard,
  MovieContinueCard,
  MovieSectionRow,
  MovieTwoRowSection
} from '../components/MovieCardsDesign';
import { MediaRow } from '../components/MediaRow';
import { MediaCard } from '../components/MediaCard';
import { MovieItem } from '../types/media';
import { useMedia } from '../context/MediaContext';
import { useNavigation } from '../context/NavigationContext';
import { useRecommendations } from '../context/RecommendationContext';
import {
  fetchLanguageMovies,
  fetchInfiniteLanguageMovies,
  fetchGenreMovies,
  fetchByOTT,
  fetchTheaterReleases
} from '../services/movieService';

interface MoviesHomeScreenProps {
  topMovies: MovieItem[];
  topSeries: MovieItem[];
  netflixHits: MovieItem[];
  hotstarHits: MovieItem[];
  primeHits: MovieItem[];
  appleHits: MovieItem[];
  sonyHits: MovieItem[];
  zeeHits: MovieItem[];
  loadedGenreRows: { title: string; subtitle: string; items: MovieItem[] }[];
  isLoadingMore: boolean;
  onLoadMoreGenres: () => void;
  hasMoreGenres: boolean;
}

export const MoviesHomeScreen: React.FC<MoviesHomeScreenProps> = ({
  topMovies,
  topSeries,
  netflixHits,
  hotstarHits,
  primeHits,
  appleHits,
  sonyHits,
  zeeHits,
  loadedGenreRows,
  isLoadingMore,
  onLoadMoreGenres,
  hasMoreGenres
}) => {
  const {
    activeCategory,
    setActiveCategory,
    selectedOTT,
    selectedLanguage
  } = useNavigation();
  const { continueWatching, primaryLanguage, secondaryLanguage } = useMedia();
  const { forYouMovies, becauseYouWatched, explorationMovies } = useRecommendations();

  const [primaryLangMovies, setPrimaryLangMovies] = useState<MovieItem[]>([]);
  const [secondaryLangMovies, setSecondaryLangMovies] = useState<MovieItem[]>([]);
  const movieBottomRef = useRef<HTMLDivElement>(null);

  // Dynamic Genre Movies Cache for Capsule Listing
  const [genreCache, setGenreCache] = useState<Record<string, MovieItem[]>>({});
  const [isGenreLoading, setIsGenreLoading] = useState(false);

  // Regional Language Universe State
  const [languageUniverseMovies, setLanguageUniverseMovies] = useState<MovieItem[]>([]);
  const [langBatchIndex, setLangBatchIndex] = useState(0);
  const [isLoadingLangMore, setIsLoadingLangMore] = useState(false);

  // OTT Universe State
  const [ottUniverseMovies, setOttUniverseMovies] = useState<MovieItem[]>([]);
  const [isLoadingOtt, setIsLoadingOtt] = useState(false);

  // Theatrical Releases
  const [theaterReleases, setTheaterReleases] = useState<MovieItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    fetchTheaterReleases().then(res => {
      if (isMounted) setTheaterReleases(res);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch OTT Universe Catalog when selectedOTT changes
  useEffect(() => {
    if (selectedOTT === 'All') return;
    let isMounted = true;
    setIsLoadingOtt(true);
    fetchByOTT(selectedOTT).then(res => {
      if (isMounted) {
        setOttUniverseMovies(res);
        setIsLoadingOtt(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [selectedOTT]);

  // Fetch Language Universe Catalog when selectedLanguage changes
  useEffect(() => {
    if (selectedLanguage === 'All') return;
    let isMounted = true;
    setIsLoadingLangMore(true);
    setLangBatchIndex(0);
    fetchInfiniteLanguageMovies(selectedLanguage, 0, 35).then(res => {
      if (isMounted) {
        setLanguageUniverseMovies(res);
        setIsLoadingLangMore(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [selectedLanguage]);

  // Infinite Scroll loader for language batches
  const loadNextLanguageBatch = async () => {
    if (isLoadingLangMore) return;
    setIsLoadingLangMore(true);
    try {
      const nextBatch = langBatchIndex + 1;
      const more = await fetchInfiniteLanguageMovies(selectedLanguage, nextBatch, 20);
      setLanguageUniverseMovies(prev => {
        const seen = new Set(prev.map(p => p.id));
        const filtered = more.filter(m => !seen.has(m.id));
        return [...prev, ...filtered];
      });
      setLangBatchIndex(nextBatch);
    } catch (err) {
      console.error('Failed to load next language batch:', err);
    } finally {
      setIsLoadingLangMore(false);
    }
  };

  // Automatic Infinite Scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (!entries[0].isIntersecting) return;
        if (selectedLanguage !== 'All') {
          loadNextLanguageBatch();
        } else if (activeCategory === 'All' && selectedOTT === 'All') {
          if (!isLoadingMore && hasMoreGenres) {
            onLoadMoreGenres();
          }
        }
      },
      { rootMargin: '300px' }
    );

    if (movieBottomRef.current) {
      observer.observe(movieBottomRef.current);
    }

    return () => observer.disconnect();
  }, [isLoadingMore, hasMoreGenres, onLoadMoreGenres, activeCategory, selectedLanguage, selectedOTT, langBatchIndex, isLoadingLangMore]);

  // Load language-based movies for standard home
  useEffect(() => {
    let isMounted = true;
    async function loadLangMovies() {
      try {
        const [primList, secList] = await Promise.all([
          fetchLanguageMovies(primaryLanguage),
          fetchLanguageMovies(secondaryLanguage)
        ]);
        if (isMounted) {
          setPrimaryLangMovies(primList);
          setSecondaryLangMovies(secList);
        }
      } catch (err) {
        console.error('Failed to load language movies:', err);
      }
    }
    loadLangMovies();
    return () => {
      isMounted = false;
    };
  }, [primaryLanguage, secondaryLanguage]);

  // Fetch Genre Movies when capsule is clicked
  useEffect(() => {
    if (activeCategory === 'All' || activeCategory === 'Series' || activeCategory === 'Shows' || activeCategory === 'Movies') {
      return;
    }

    if (!genreCache[activeCategory]) {
      setIsGenreLoading(true);
      fetchGenreMovies(activeCategory)
        .then((items: MovieItem[]) => {
          setGenreCache(prev => ({ ...prev, [activeCategory]: items }));
        })
        .catch((err: unknown) => {
          console.error(`Failed to load genre movies for ${activeCategory}:`, err);
        })
        .finally(() => setIsGenreLoading(false));
    }
  }, [activeCategory, genreCache]);

  // Derive New Movies (Simulate releases with OTT tags)
  const newMoviesWithTags = [...netflixHits.slice(0, 4), ...hotstarHits.slice(0, 4), ...primeHits.slice(0, 4)].map(
    (item, index) => {
      const otts = ['Netflix', 'JioHotstar', 'Prime Video', 'Apple TV+'];
      return {
        ...item,
        ottProvider: item.ottProvider || (otts[index % otts.length] as any)
      };
    }
  );

  // Compute movies for category capsule listing
  const getCategoryMovies = (): MovieItem[] => {
    if (activeCategory === 'All') return [];

    let pool = [
      ...topMovies,
      ...topSeries,
      ...netflixHits,
      ...hotstarHits,
      ...primeHits,
      ...appleHits,
      ...sonyHits,
      ...zeeHits
    ];

    if (activeCategory === 'Series' || activeCategory === 'Shows') {
      return Array.from(new Map(pool.filter(m => m.type === 'series').map(m => [m.id, m])).values());
    }

    if (activeCategory === 'Movies') {
      return Array.from(new Map(pool.filter(m => m.type !== 'series').map(m => [m.id, m])).values());
    }

    const apiItems = genreCache[activeCategory] || [];
    const poolFiltered = pool.filter(m =>
      m.genres?.some(g => g.toLowerCase().includes(activeCategory.toLowerCase()))
    );
    const merged = [...apiItems, ...poolFiltered];
    return Array.from(new Map(merged.map(m => [m.id, m])).values());
  };

  const categoryFilteredMovies = getCategoryMovies();

  // =========================================================================
  // GLOBAL CROSS-SECTION DEDUPLICATION
  // Guarantees that NO movie ever repeats across any section on the Home screen!
  // =========================================================================
  const globalSeenIds = new Set<string>();

  // 1. Trending Fanned Deck
  const deduplicatedTopMovies: MovieItem[] = [];
  for (const m of topMovies) {
    if (m && m.id && !globalSeenIds.has(m.id)) {
      globalSeenIds.add(m.id);
      deduplicatedTopMovies.push(m);
    }
  }

  // 2. In Theaters Now
  const deduplicatedTheaterReleases: MovieItem[] = [];
  for (const m of theaterReleases) {
    if (m && m.id && !globalSeenIds.has(m.id)) {
      globalSeenIds.add(m.id);
      deduplicatedTheaterReleases.push(m);
    }
  }

  // 3. Top Picks For You
  const deduplicatedForYou: MovieItem[] = [];
  for (const m of forYouMovies) {
    if (m && m.id && !globalSeenIds.has(m.id)) {
      globalSeenIds.add(m.id);
      deduplicatedForYou.push(m);
    }
  }

  // 4. Because You Watched Rows
  const deduplicatedBecauseYouWatched = becauseYouWatched
    .map(entry => {
      if (
        !entry ||
        !entry.anchor ||
        !entry.anchor.name ||
        entry.anchor.name === 'Untitled' ||
        entry.anchor.id.startsWith('sports-') ||
        entry.anchor.genres?.some(g => g.toLowerCase() === 'sports')
      ) {
        return null;
      }
      const uniqueMovies: MovieItem[] = [];
      for (const m of entry.movies) {
        if (m && m.id && !globalSeenIds.has(m.id)) {
          globalSeenIds.add(m.id);
          uniqueMovies.push(m);
        }
      }
      return {
        ...entry,
        movies: uniqueMovies
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null && entry.movies.length >= 2);

  // 5. New Releases
  const deduplicatedNewReleases: MovieItem[] = [];
  for (const m of newMoviesWithTags) {
    if (m && m.id && !globalSeenIds.has(m.id)) {
      globalSeenIds.add(m.id);
      deduplicatedNewReleases.push(m);
    }
  }

  // 6. Regional Languages
  const deduplicatedPrimaryLang: MovieItem[] = [];
  for (const m of primaryLangMovies) {
    if (m && m.id && !globalSeenIds.has(m.id)) {
      globalSeenIds.add(m.id);
      deduplicatedPrimaryLang.push(m);
    }
  }

  const deduplicatedSecondaryLang: MovieItem[] = [];
  for (const m of secondaryLangMovies) {
    if (m && m.id && !globalSeenIds.has(m.id)) {
      globalSeenIds.add(m.id);
      deduplicatedSecondaryLang.push(m);
    }
  }

  // 7. Exploration Picks
  const deduplicatedExploration: MovieItem[] = [];
  for (const m of explorationMovies) {
    if (m && m.id && !globalSeenIds.has(m.id)) {
      globalSeenIds.add(m.id);
      deduplicatedExploration.push(m);
    }
  }

  // Helper for OTT and Genre rows
  const deduplicateRow = (items: MovieItem[]): MovieItem[] => {
    const unique: MovieItem[] = [];
    for (const m of items) {
      if (m && m.id && !globalSeenIds.has(m.id)) {
        globalSeenIds.add(m.id);
        unique.push(m);
      }
    }
    return unique;
  };

  // 8. OTT Brand Rows & Series
  const deduplicatedSeries = deduplicateRow(topSeries);
  const deduplicatedHotstar = deduplicateRow(hotstarHits);
  const deduplicatedNetflix = deduplicateRow(netflixHits);
  const deduplicatedPrime = deduplicateRow(primeHits);
  const deduplicatedApple = deduplicateRow(appleHits);
  const deduplicatedSony = deduplicateRow(sonyHits);
  const deduplicatedZee = deduplicateRow(zeeHits);

  // 9. Infinite Scrolling Genre Rows
  const deduplicatedGenreRows = loadedGenreRows
    .map(row => ({
      ...row,
      items: deduplicateRow(row.items)
    }))
    .filter(row => row.items.length >= 2);

  return (
    <div className="movies-home-screen">
      {/* 1. Top Header */}
      <TopAppHeader />

      <div className="movies-home-scrollable">
        {/* ========================================================================= */}
        {/* CASE 1: REGIONAL LANGUAGE UNIVERSE (e.g. Tamil Cinema Universe)            */}
        {/* ========================================================================= */}
        {selectedLanguage !== 'All' ? (
          <>
            {/* Trending Cards for this language */}
            <MovieTrendingFannedDeck
              movies={languageUniverseMovies.length > 0 ? languageUniverseMovies.slice(0, 8) : topMovies.slice(0, 5)}
            />

            {/* Continue Watching */}
            {continueWatching.length > 0 && (
              <div className="continue-watching-section">
                <div className="section-title-wrap continue-head">
                  <h3 className="section-heading">Continue Watching</h3>
                </div>
                <div className="continue-cards-scroll">
                  {continueWatching.map(item => (
                    <MovieContinueCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )}

            {/* Language Curated Media Rows */}
            <MediaRow title={`Trending in ${selectedLanguage} Today`} items={languageUniverseMovies.slice(0, 10)} />
            <MediaRow title={`${selectedLanguage} Action Blockbusters`} items={languageUniverseMovies.slice(10, 20)} />
            <MediaRow title={`Top Picks in ${selectedLanguage}`} items={languageUniverseMovies.slice(20, 30)} />
            <MediaRow title={`New Releases in ${selectedLanguage}`} items={languageUniverseMovies.slice(30, 40)} />
            {languageUniverseMovies.length > 40 && (
              <MediaRow
                title={`Critically Acclaimed ${selectedLanguage} Cinema`}
                items={languageUniverseMovies.slice(40, 55)}
              />
            )}

            {/* Infinite Scroll Anchor & Loader */}
            <div ref={movieBottomRef} className="movie-bottom-loader-anchor">
              {isLoadingLangMore && (
                <div className="infinite-scroll-loading">
                  <div className="spinner cyan-spinner" />
                  <span>Loading more {selectedLanguage} movies...</span>
                </div>
              )}
            </div>
          </>
        ) : selectedOTT !== 'All' ? (
          /* ========================================================================= */
          /* CASE 2: DEDICATED OTT UNIVERSE (e.g. Netflix Crimson Universe)            */
          /* ========================================================================= */
          <>
            {/* Trending Cards for this OTT - NO EXIT BANNER CARD */}
            <MovieTrendingFannedDeck
              movies={ottUniverseMovies.length > 0 ? ottUniverseMovies.slice(0, 8) : topMovies.slice(0, 5)}
            />

            {/* Continue Watching */}
            {continueWatching.length > 0 && (
              <div className="continue-watching-section">
                <div className="section-title-wrap continue-head">
                  <h3 className="section-heading">Continue Watching on {selectedOTT}</h3>
                </div>
                <div className="continue-cards-scroll">
                  {continueWatching.map(item => (
                    <MovieContinueCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )}

            {isLoadingOtt ? (
              <div className="capsule-loading-box">
                <div className="spinner cyan-spinner" />
                <p>Connecting to {selectedOTT} catalog...</p>
              </div>
            ) : (
              <>
                <MediaRow title={`Trending on ${selectedOTT}`} items={ottUniverseMovies.slice(0, 10)} />
                <MediaRow title={`Top 10 in India Today • ${selectedOTT}`} items={ottUniverseMovies.slice(10, 20)} />
                <MediaRow title={`${selectedOTT} Originals & Blockbusters`} items={ottUniverseMovies.slice(20, 30)} />
                {ottUniverseMovies.filter(m => m.type === 'series').length > 0 && (
                  <MediaRow
                    title={`${selectedOTT} Binge-Worthy Series`}
                    items={ottUniverseMovies.filter(m => m.type === 'series')}
                  />
                )}
                <MediaRow title={`${selectedOTT} Suspense & Thrillers`} items={ottUniverseMovies.slice(5, 18)} />
              </>
            )}
          </>
        ) : activeCategory !== 'All' ? (
          /* ========================================================================= */
          /* CASE 3: CATEGORY / GENRE CAPSULE LISTING - NO EXIT BANNER CARD            */
          /* ========================================================================= */
          <div className="capsule-filtered-section">
            {isGenreLoading && categoryFilteredMovies.length === 0 ? (
              <div className="capsule-loading-box">
                <div className="spinner cyan-spinner" />
                <p>Curating {activeCategory} titles...</p>
              </div>
            ) : categoryFilteredMovies.length === 0 ? (
              <div className="capsule-empty-box">
                <p>No titles found in this category.</p>
                <button
                  className="capsule-browse-all-btn"
                  onClick={() => setActiveCategory('All')}
                >
                  Browse All
                </button>
              </div>
            ) : (
              <div className="capsule-media-grid">
                {categoryFilteredMovies.map(movie => (
                  <MediaCard key={movie.id} item={movie} />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ========================================================================= */
          /* CASE 4: STANDARD FULL HOME VIEW (All Platforms, Personalization & Rows)    */
          /* ========================================================================= */
          <>
            {/* 2. Trending Fanned Cards Deck */}
            {deduplicatedTopMovies.length > 0 && (
              <MovieTrendingFannedDeck movies={deduplicatedTopMovies} />
            )}

            {/* 3. Continue Watching */}
            {continueWatching.length > 0 && (
              <div className="continue-watching-section">
                <div className="section-title-wrap continue-head">
                  <h3 className="section-heading">Continue Watching</h3>
                </div>
                <div className="continue-cards-scroll">
                  {continueWatching.map(item => (
                    <MovieContinueCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )}

            {/* 3b. IN THEATERS ONLY (Strictly without OTT Releases) */}
            {deduplicatedTheaterReleases.length > 0 && (
              <MediaRow
                title="In Theaters Now • Cinema Exclusive"
                items={deduplicatedTheaterReleases}
              />
            )}

            {/* Top Picks For You - DESIGN: Spotlight Cards with IMDb pill & neon glow */}
            {deduplicatedForYou.length > 0 && (
              <MovieSectionRow title="Top Picks For You">
                {deduplicatedForYou.map(item => (
                  <MovieSpotlightCard key={item.id} item={item} />
                ))}
              </MovieSectionRow>
            )}

            {/* Because You Watched - DESIGN: 16:9 Landscape Cinematic Backdrop Cards */}
            {deduplicatedBecauseYouWatched.map((entry, idx) => (
              <MovieSectionRow
                key={`byw-${entry.anchor.id}-${idx}`}
                title={`Because You Watched "${entry.anchor.name}"`}
              >
                {entry.movies.map(movie => (
                  <MovieBackdropCard key={movie.id} item={movie} />
                ))}
              </MovieSectionRow>
            ))}

            {/* New Releases - DESIGN: #1, #2, #3 Podium Ranked Cards */}
            {deduplicatedNewReleases.length > 0 && (
              <MovieSectionRow title="New Releases">
                {deduplicatedNewReleases.map((movie, idx) => (
                  <MovieRankedCard key={movie.id} item={movie} rank={idx + 1} />
                ))}
              </MovieSectionRow>
            )}

            {/* Primary Language Blockbusters - DESIGN: 2-Row Horizontal Quick Tile Grid */}
            {deduplicatedPrimaryLang.length > 0 && (
              <MovieTwoRowSection title={`${primaryLanguage} Blockbusters`}>
                {deduplicatedPrimaryLang.map(movie => (
                  <MovieTileCard key={movie.id} item={movie} />
                ))}
              </MovieTwoRowSection>
            )}

            {/* Secondary Language Hits - DESIGN: MediaRow Poster Cards */}
            {deduplicatedSecondaryLang.length > 0 && (
              <MediaRow
                title={`${secondaryLanguage} Hits`}
                items={deduplicatedSecondaryLang}
              />
            )}

            {/* Exploration Picks: Anti-Filter-Bubble - DESIGN: Panorama Feature Banners */}
            {deduplicatedExploration.length > 0 && (
              <MovieSectionRow title="Discover Something New">
                {deduplicatedExploration.map(movie => (
                  <MoviePanoramaCard key={movie.id} item={movie} />
                ))}
              </MovieSectionRow>
            )}

            {/* OTT Brand Catalogs & Series */}
            <div className="ott-branded-sections">
              {deduplicatedSeries.length > 0 && <MediaRow title="Web Series" items={deduplicatedSeries} />}
              {deduplicatedHotstar.length > 0 && <MediaRow title="JioHotstar" items={deduplicatedHotstar} />}
              {deduplicatedNetflix.length > 0 && <MediaRow title="Netflix" items={deduplicatedNetflix} />}
              {deduplicatedPrime.length > 0 && <MediaRow title="Prime Video" items={deduplicatedPrime} />}
              {deduplicatedApple.length > 0 && <MediaRow title="Apple TV+" items={deduplicatedApple} />}
              {deduplicatedSony.length > 0 && <MediaRow title="Sony LIV" items={deduplicatedSony} />}
              {deduplicatedZee.length > 0 && <MediaRow title="Zee5" items={deduplicatedZee} />}
            </div>

            {/* Infinite Scrolling Dynamic Movie Categories */}
            {deduplicatedGenreRows.map((row, idx) => (
              <MediaRow
                key={idx}
                title={row.title}
                items={row.items}
              />
            ))}

            {/* Infinite Scroll Anchor & Loader */}
            <div ref={movieBottomRef} className="movie-bottom-loader-anchor">
              {isLoadingMore && (
                <div className="infinite-scroll-loading">
                  <div className="spinner cyan-spinner" />
                  <span>Loading categories...</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
