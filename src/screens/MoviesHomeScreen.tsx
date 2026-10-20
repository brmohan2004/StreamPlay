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
  fetchByOTT
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
            <MovieTrendingFannedDeck movies={topMovies} />

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

            {/* Top Picks For You - DESIGN: Spotlight Cards with IMDb pill & neon glow */}
            {forYouMovies.length > 0 && (
              <MovieSectionRow title="Top Picks For You">
                {forYouMovies.map(item => (
                  <MovieSpotlightCard key={item.id} item={item} />
                ))}
              </MovieSectionRow>
            )}

            {/* Because You Watched - DESIGN: 16:9 Landscape Cinematic Backdrop Cards */}
            {becauseYouWatched.map((entry, idx) => (
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
            <MovieSectionRow title="New Releases">
              {newMoviesWithTags.map((movie, idx) => (
                <MovieRankedCard key={movie.id} item={movie} rank={idx + 1} />
              ))}
            </MovieSectionRow>

            {/* Primary Language Blockbusters - DESIGN: 2-Row Horizontal Quick Tile Grid */}
            {primaryLangMovies.length > 0 && (
              <MovieTwoRowSection title={`${primaryLanguage} Blockbusters`}>
                {primaryLangMovies.map(movie => (
                  <MovieTileCard key={movie.id} item={movie} />
                ))}
              </MovieTwoRowSection>
            )}

            {/* Secondary Language Hits - DESIGN: MediaRow Poster Cards */}
            {secondaryLangMovies.length > 0 && (
              <MediaRow
                title={`${secondaryLanguage} Hits`}
                items={secondaryLangMovies}
              />
            )}

            {/* Exploration Picks: Anti-Filter-Bubble - DESIGN: Panorama Feature Banners */}
            {explorationMovies.length > 0 && (
              <MovieSectionRow title="Discover Something New">
                {explorationMovies.map(movie => (
                  <MoviePanoramaCard key={movie.id} item={movie} />
                ))}
              </MovieSectionRow>
            )}

            {/* OTT Brand Catalogs & Series */}
            <div className="ott-branded-sections">
              <MediaRow title="Web Series" items={topSeries} />
              <MediaRow title="JioHotstar" items={hotstarHits} />
              <MediaRow title="Netflix" items={netflixHits} />
              <MediaRow title="Prime Video" items={primeHits} />
              <MediaRow title="Apple TV+" items={appleHits} />
              <MediaRow title="Sony LIV" items={sonyHits} />
              <MediaRow title="Zee5" items={zeeHits} />
            </div>

            {/* Infinite Scrolling Dynamic Movie Categories */}
            {loadedGenreRows.map((row, idx) => (
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
