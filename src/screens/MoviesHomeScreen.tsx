import './MoviesHomeScreen.css';
import React, { useState, useEffect, useRef } from 'react';
import { TopAppHeader } from '../components/TopAppHeader';
import { CategoryCapsules } from '../components/CategoryCapsules';
import { TrendingFlipCards } from '../components/TrendingFlipCards';
import { MediaRow } from '../components/MediaRow';
import { MediaCard } from '../components/MediaCard';
import { MovieItem } from '../types/media';
import { useMedia } from '../context/MediaContext';
import { History, Play, Sparkles, RotateCcw } from 'lucide-react';
import { fetchLanguageMovies, fetchGenreMovies } from '../services/movieService';

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
  const [activeCategory, setActiveCategory] = useState('All');
  const { continueWatching, openMoviePlayer, primaryLanguage, secondaryLanguage } = useMedia();

  const [primaryLangMovies, setPrimaryLangMovies] = useState<MovieItem[]>([]);
  const [secondaryLangMovies, setSecondaryLangMovies] = useState<MovieItem[]>([]);
  const movieBottomRef = useRef<HTMLDivElement>(null);

  // Dynamic Genre Movies Cache for Capsule Listing
  const [genreCache, setGenreCache] = useState<Record<string, MovieItem[]>>({});
  const [isGenreLoading, setIsGenreLoading] = useState(false);

  // Automatic Infinite Scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !isLoadingMore && hasMoreGenres && activeCategory === 'All') {
          onLoadMoreGenres();
        }
      },
      { rootMargin: '300px' }
    );

    if (movieBottomRef.current) {
      observer.observe(movieBottomRef.current);
    }

    return () => observer.disconnect();
  }, [isLoadingMore, hasMoreGenres, onLoadMoreGenres, activeCategory]);

  // Load language-based movies
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

  const movieCategories = [
    'All',
    'Series',
    'Movies',
    'Shows',
    'Drama',
    'Comedy',
    'Action',
    'Horror',
    'Romance',
    'Sci-Fi'
  ];

  // Derive New Movies (Simulate releases within 1 month with OTT tags)
  const newMoviesWithTags = [...netflixHits.slice(0, 4), ...hotstarHits.slice(0, 4), ...primeHits.slice(0, 4)].map(
    (item, index) => {
      const otts = ['Netflix', 'JioHotstar', 'Prime Video', 'Apple TV+'];
      return {
        ...item,
        ottProvider: item.ottProvider || (otts[index % otts.length] as any)
      };
    }
  );

  // Compute movies for capsule-based listing
  const getCategoryMovies = (): MovieItem[] => {
    if (activeCategory === 'All') return [];

    if (activeCategory === 'Series' || activeCategory === 'Shows') {
      const allSeries = [
        ...topSeries,
        ...netflixHits.filter(m => m.type === 'series'),
        ...hotstarHits.filter(m => m.type === 'series'),
        ...primeHits.filter(m => m.type === 'series')
      ];
      return Array.from(new Map(allSeries.map(m => [m.id, m])).values());
    }

    if (activeCategory === 'Movies') {
      const allMovies = [
        ...topMovies,
        ...netflixHits.filter(m => m.type !== 'series'),
        ...hotstarHits.filter(m => m.type !== 'series'),
        ...primeHits.filter(m => m.type !== 'series'),
        ...appleHits.filter(m => m.type !== 'series')
      ];
      return Array.from(new Map(allMovies.map(m => [m.id, m])).values());
    }

    // Genre-based category
    const apiItems = genreCache[activeCategory] || [];
    const pool = [
      ...topMovies,
      ...topSeries,
      ...netflixHits,
      ...hotstarHits,
      ...primeHits,
      ...appleHits,
      ...sonyHits,
      ...zeeHits
    ];
    const poolFiltered = pool.filter(m =>
      m.genres?.some(g => g.toLowerCase().includes(activeCategory.toLowerCase()))
    );

    const merged = [...apiItems, ...poolFiltered];
    return Array.from(new Map(merged.map(m => [m.id, m])).values());
  };

  const categoryFilteredMovies = getCategoryMovies();

  return (
    <div className="movies-home-screen">
      {/* 1. Header: Streamplay logo (left), Watch later logo, profile logo (right) */}
      <TopAppHeader />

      <div className="movies-home-scrollable">
        {/* 2. Trending Flip Cards (Placed above Category Capsules) */}
        <TrendingFlipCards movies={topMovies} />

        {/* 3. Category capsules: series, movies, shows, drama, comedy, etc. */}
        <div className="capsules-header-wrapper">
          <CategoryCapsules
            categories={movieCategories}
            activeCategory={activeCategory}
            onSelectCategory={cat => setActiveCategory(cat)}
          />
        </div>

        {/* 4. Capsule-Based Dynamic Listing View */}
        {activeCategory !== 'All' ? (
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
                onClick={() => setActiveCategory('All')}
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
          /* Full Multi-Row Home View (when activeCategory === 'All') */
          <>
            {/* 4. Continue Watching */}
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
                        {/* Simulated resume progress bar */}
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

            {/* 5. New Releases with OTT tags */}
            <div className="new-movies-section">
              <MediaRow
                title="New Releases"
                items={newMoviesWithTags}
              />
            </div>

            {/* 6. Language Curated Movies (Primary & Secondary Languages) */}
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

            {/* 7. OTT Brand Catalogs & Series */}
            <div className="ott-branded-sections">
              <MediaRow title="Web Series" items={topSeries} />
              <MediaRow title="JioHotstar" items={hotstarHits} />
              <MediaRow title="Netflix" items={netflixHits} />
              <MediaRow title="Prime Video" items={primeHits} />
              <MediaRow title="Apple TV+" items={appleHits} />
              <MediaRow title="Sony LIV" items={sonyHits} />
              <MediaRow title="Zee5" items={zeeHits} />
            </div>

            {/* 8. Infinite Scrolling Dynamic Movie Categories */}
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
