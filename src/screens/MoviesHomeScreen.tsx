import './MoviesHomeScreen.css';
import React, { useState, useEffect, useRef } from 'react';
import { TopAppHeader } from '../components/TopAppHeader';
import { TrendingFlipCards } from '../components/TrendingFlipCards';
import { MediaRow } from '../components/MediaRow';
import { MediaCard } from '../components/MediaCard';
import { MovieItem } from '../types/media';
import { useMedia } from '../context/MediaContext';
import { useNavigation } from '../context/NavigationContext';
import { useRecommendations } from '../context/RecommendationContext';
import { RecommendationRow } from '../components/RecommendationRow';
import { History, Play, Sparkles, RotateCcw, Film, Compass } from 'lucide-react';
import {
  fetchLanguageMovies,
  fetchInfiniteLanguageMovies,
  fetchGenreMovies,
  fetchByOTT,
  OTT_PLATFORMS
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
    setSelectedOTT,
    selectedLanguage,
    setSelectedLanguage
  } = useNavigation();
  const { continueWatching, openMoviePlayer, primaryLanguage, secondaryLanguage } = useMedia();
  const { forYouMovies, becauseYouWatched, explorationMovies, hasPersonalization } = useRecommendations();

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
        .then(items => {
          setGenreCache(prev => ({ ...prev, [activeCategory]: items }));
        })
        .catch(err => {
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

  const ottMeta = OTT_PLATFORMS.find(p => p.brand === selectedOTT);
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
            <div className="universe-banner language-universe">
              <div className="universe-meta">
                <span className="universe-pill lang-pill">
                  🔥 {selectedLanguage.toUpperCase()} CINEMA UNIVERSE
                </span>
                <h2 className="universe-title">{selectedLanguage} Blockbusters & Hits</h2>
                <p className="universe-sub">
                  Infinite catalog curated across all streaming platforms • 100% Free
                </p>
              </div>
              <button
                className="capsule-reset-btn"
                onClick={() => {
                  setSelectedLanguage('All');
                  setActiveCategory('All');
                }}
                title="Return to All Content"
              >
                <RotateCcw size={14} />
                <span>Exit {selectedLanguage}</span>
              </button>
            </div>

            {/* Trending Flip Cards for this language */}
            <TrendingFlipCards
              movies={languageUniverseMovies.length > 0 ? languageUniverseMovies.slice(0, 8) : topMovies.slice(0, 5)}
            />

            {/* Continue Watching */}
            {continueWatching.length > 0 && (
              <div className="continue-watching-section">
                <div className="section-title-wrap continue-head">
                  <History size={18} className="text-cyan" />
                  <h3 className="section-heading">Continue Watching</h3>
                </div>
                <div className="continue-cards-scroll">
                  {continueWatching.map(item => (
                    <div
                      key={item.id}
                      className="continue-card-item"
                      onClick={() => openMoviePlayer(item)}
                    >
                      <div className="continue-thumb-wrap">
                        <img src={item.poster} alt={item.name} className="continue-thumb" />
                        <div className="continue-play-hover">
                          <Play size={20} fill="#fff" />
                        </div>
                        <div className="continue-progress-bar">
                          <div className="progress-fill" style={{ width: '45%' }} />
                        </div>
                      </div>
                      <span className="continue-name">{item.name}</span>
                    </div>
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
            <div
              className="universe-banner ott-universe"
              style={{ borderColor: ottMeta?.accentColor || '#00d2ff' }}
            >
              <div className="universe-meta">
                <span
                  className="universe-pill"
                  style={{
                    background: `${ottMeta?.accentColor || '#00d2ff'}25`,
                    color: ottMeta?.accentColor || '#00d2ff',
                    border: `1px solid ${ottMeta?.accentColor || '#00d2ff'}40`
                  }}
                >
                  {selectedOTT.toUpperCase()} UNIVERSE
                </span>
                <h2 className="universe-title">{ottMeta?.displayName || selectedOTT}</h2>
                <p className="universe-sub">
                  {ottMeta?.tagline || 'Streaming original series & films • 100% Free'}
                </p>
              </div>
              <button
                className="capsule-reset-btn"
                onClick={() => {
                  setSelectedOTT('All');
                  setActiveCategory('All');
                }}
                title="Return to All Platforms"
              >
                <RotateCcw size={14} />
                <span>Exit {selectedOTT}</span>
              </button>
            </div>

            {/* Trending Flip Cards for this OTT */}
            <TrendingFlipCards
              movies={ottUniverseMovies.length > 0 ? ottUniverseMovies.slice(0, 8) : topMovies.slice(0, 5)}
            />

            {/* Continue Watching */}
            {continueWatching.length > 0 && (
              <div className="continue-watching-section">
                <div className="section-title-wrap continue-head">
                  <History size={18} className="text-cyan" />
                  <h3 className="section-heading">Continue Watching on {selectedOTT}</h3>
                </div>
                <div className="continue-cards-scroll">
                  {continueWatching.map(item => (
                    <div
                      key={item.id}
                      className="continue-card-item"
                      onClick={() => openMoviePlayer(item)}
                    >
                      <div className="continue-thumb-wrap">
                        <img src={item.poster} alt={item.name} className="continue-thumb" />
                        <div className="continue-play-hover">
                          <Play size={20} fill="#fff" />
                        </div>
                        <div className="continue-progress-bar">
                          <div className="progress-fill" style={{ width: '45%' }} />
                        </div>
                      </div>
                      <span className="continue-name">{item.name}</span>
                    </div>
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
          /* CASE 3: CATEGORY / GENRE CAPSULE LISTING                                   */
          /* ========================================================================= */
          <div className="capsule-filtered-section">
            <div className="capsule-filtered-header">
              <div>
                <span className="capsule-eyebrow">
                  <Sparkles size={13} className="text-cyan" /> {activeCategory.toUpperCase()} COLLECTION
                </span>
                <h2 className="capsule-section-heading">
                  {activeCategory === 'Series' || activeCategory === 'Shows'
                    ? 'All Web Series & Shows'
                    : activeCategory === 'Movies'
                    ? 'All Blockbuster Movies'
                    : `${activeCategory} Movies & Hits`}
                </h2>
                <p className="capsule-section-sub">
                  Showing {categoryFilteredMovies.length} curated titles across OTT platforms
                </p>
              </div>

              <button
                className="capsule-reset-btn"
                onClick={() => {
                  setActiveCategory('All');
                  setSelectedOTT('All');
                }}
                title="Return to full home catalog"
              >
                <RotateCcw size={14} />
                <span>Show All</span>
              </button>
            </div>

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
            {/* 2. Trending Flip Cards */}
            <TrendingFlipCards movies={topMovies} />

            {/* 3. Continue Watching */}
            {continueWatching.length > 0 && (
              <div className="continue-watching-section">
                <div className="section-title-wrap continue-head">
                  <History size={18} className="text-cyan" />
                  <h3 className="section-heading">Continue Watching</h3>
                </div>
                <div className="continue-cards-scroll">
                  {continueWatching.map(item => (
                    <div
                      key={item.id}
                      className="continue-card-item"
                      onClick={() => openMoviePlayer(item)}
                    >
                      <div className="continue-thumb-wrap">
                        <img src={item.poster} alt={item.name} className="continue-thumb" />
                        <div className="continue-play-hover">
                          <Play size={20} fill="#fff" />
                        </div>
                        <div className="continue-progress-bar">
                          <div className="progress-fill" style={{ width: '45%' }} />
                        </div>
                      </div>
                      <span className="continue-name">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Personalized Recommendation Engine Rows */}
            {forYouMovies.length > 0 && (
              <RecommendationRow
                title="Top Picks For You"
                subtitle={
                  hasPersonalization
                    ? "Curated from your viewing patterns & preferences • 100% Free"
                    : "Trending blockbusters tailored for you • 100% Free"
                }
                badgeText={hasPersonalization ? "AI Match" : "Top Pick"}
                items={forYouMovies}
                type="movie"
                icon={<Sparkles size={18} className="text-cyan" />}
              />
            )}

            {becauseYouWatched.map((entry, idx) => (
              <RecommendationRow
                key={`byw-${entry.anchor.id}-${idx}`}
                title={`Because You Watched "${entry.anchor.name}"`}
                subtitle="Similar genres & cast alignment • 100% Free"
                badgeText="Similarity"
                items={entry.movies}
                type="movie"
                icon={<Film size={18} className="text-cyan" />}
              />
            ))}

            {/* New Releases with OTT tags */}
            <div className="new-movies-section">
              <MediaRow
                title="New Releases"
                items={newMoviesWithTags}
              />
            </div>

            {/* Language Curated Movies (Primary & Secondary Languages) */}
            {primaryLangMovies.length > 0 && (
              <MediaRow
                title={`${primaryLanguage} Blockbusters`}
                items={primaryLangMovies}
              />
            )}

            {secondaryLangMovies.length > 0 && (
              <MediaRow
                title={`${secondaryLanguage} Hits`}
                items={secondaryLangMovies}
              />
            )}

            {/* Exploration Picks: Anti-Filter-Bubble Discovery */}
            {explorationMovies.length > 0 && (
              <RecommendationRow
                title="Discover Something New"
                subtitle="High-rated gems beyond your usual genres • 100% Free"
                badgeText="Explore"
                items={explorationMovies}
                type="movie"
                icon={<Compass size={18} className="text-lime" />}
              />
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
