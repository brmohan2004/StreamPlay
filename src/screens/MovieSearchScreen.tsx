import './MovieSearchScreen.css';
import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Film, Music, X, ArrowLeft, History, Flame, Play } from 'lucide-react';
import { searchMoviesAndShowsPaged, fetchTopMovies } from '../services/movieService';
import { searchSongs } from '../services/musicService';
import { MovieItem, SongItem } from '../types/media';
import { useNavigation } from '../context/NavigationContext';
import { useMedia } from '../context/MediaContext';
import { MediaCard } from '../components/MediaCard';
import { logSignal } from '../services/recommendationTracker';
import { SkeletonGrid } from '../components/SkeletonLoader';

const MOVIE_GENRES = [
  'Action',
  'Sci-Fi',
  'Thriller',
  'Horror',
  'Comedy',
  'Romance',
  'Drama',
  'Animation',
  'Crime',
  'Adventure'
];

const SEARCH_CAPSULES = ['All', 'Latest', 'Dubbed', 'Series', 'Movies', 'Actors'];

export const MovieSearchScreen: React.FC = () => {
  const {
    setActiveScreen,
    selectedOTT,
    setSelectedOTT,
    activeCategory,
    setActiveCategory
  } = useNavigation();
  const { playSong } = useMedia();

  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [movieResults, setMovieResults] = useState<MovieItem[]>([]);
  const [relatedMusic, setRelatedMusic] = useState<SongItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 25-by-25 Pagination and Dynamic Capsule state
  const [searchFilter, setSearchFilter] = useState<string>('All');
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const searchBottomRef = useRef<HTMLDivElement>(null);

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('streamplay_recent_movie_searches') || '[]');
    } catch {
      return [];
    }
  });

  const [popularTags, setPopularTags] = useState<string[]>([
    'Spider-Man', 'Action', 'Thriller', 'Sci-Fi', 'Comedy', 'Drama'
  ]);

  const hasActiveFilters = selectedOTT !== 'All' || activeCategory !== 'All';

  // Focus input on mount & dynamically fetch top trending search tags
  useEffect(() => {
    inputRef.current?.focus();
    fetchTopMovies()
      .then(movies => {
        if (movies && movies.length > 0) {
          setPopularTags(movies.slice(0, 10).map(m => m.name));
        }
      })
      .catch(() => {});
  }, []);

  // Perform search (25-by-25 batching with new-to-old sorting)
  const triggerSearch = async (term: string, filterToUse = searchFilter) => {
    const trimmed = term.trim();
    if (!trimmed) {
      setMovieResults([]);
      setRelatedMusic([]);
      setPage(0);
      setHasMore(false);
      return;
    }
    setIsSearching(true);
    setPage(0);

    // Save to movie recents
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 8);
      try {
        localStorage.setItem('streamplay_recent_movie_searches', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save recent movie searches', e);
      }
      return updated;
    });

    try {
      const [{ items: movies }, songs] = await Promise.all([
        searchMoviesAndShowsPaged(trimmed, 0, 25, filterToUse),
        searchSongs(trimmed, 8)
      ]);
      setMovieResults(movies || []);
      setRelatedMusic(songs || []);
      setHasMore((movies || []).length >= 25);

      logSignal({
        type: 'search',
        itemId: `search-${trimmed}`,
        itemType: 'movie',
        timestamp: Date.now(),
        metadata: {
          query: trimmed,
        },
      });
      window.dispatchEvent(new CustomEvent('streamplay-rec-update'));
    } catch (err) {
      console.error('Movie search failed:', err);
      setMovieResults([]);
      setRelatedMusic([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Load next 25-by-25 batch of movies
  const loadNextPage = async () => {
    if (isLoadingMore || !hasMore || !query.trim()) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    try {
      const { items: more } = await searchMoviesAndShowsPaged(query, nextPage, 25, searchFilter);
      if (more.length === 0) {
        setHasMore(false);
      } else {
        setMovieResults(prev => {
          const seen = new Set(prev.map(p => p.id));
          const filtered = more.filter(m => !seen.has(m.id));
          return [...prev, ...filtered];
        });
        setPage(nextPage);
        if (more.length < 25) setHasMore(false);
      }
    } catch (err) {
      console.error('Load more search results failed:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Infinite Scroll Observer for Search Results
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isSearching && !isLoadingMore) {
          loadNextPage();
        }
      },
      { rootMargin: '300px' }
    );
    if (searchBottomRef.current) {
      observer.observe(searchBottomRef.current);
    }
    return () => observer.disconnect();
  }, [hasMore, isSearching, isLoadingMore, page, query, searchFilter]);

  // Real-time debounce search as user types
  useEffect(() => {
    if (!query.trim()) {
      setMovieResults([]);
      setRelatedMusic([]);
      return;
    }

    const timer = setTimeout(() => {
      triggerSearch(query);
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      triggerSearch(query);
    }
  };

  // Voice Search via Web Speech API
  const handleVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice search is not supported in this browser. Please type your query.');
      return;
    }

    try {
      // @ts-ignore
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        triggerSearch(transcript);
      };
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const clearRecent = (term: string) => {
    setRecentSearches(prev => {
      const updated = prev.filter(t => t !== term);
      localStorage.setItem('streamplay_recent_movie_searches', JSON.stringify(updated));
      return updated;
    });
  };

  const clearAllRecents = () => {
    setRecentSearches([]);
    localStorage.removeItem('streamplay_recent_movie_searches');
  };

  // Filter movie results by selected OTT and category
  const filteredMovies = movieResults.filter(m => {
    // 1. OTT filter from Filter Sheet
    if (selectedOTT !== 'All') {
      if (m.ottProvider && m.ottProvider.toLowerCase() !== selectedOTT.toLowerCase()) {
        return false;
      }
    }
    // 2. Format / Type filter
    if (activeCategory === 'Movies' && m.type !== 'movie') return false;
    if (activeCategory === 'Series' && m.type !== 'series') return false;
    // 3. Genre filter
    if (MOVIE_GENRES.includes(activeCategory)) {
      if (!m.genres?.some(g => g.toLowerCase().includes(activeCategory.toLowerCase()))) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="movie-search-screen pure-black-theme">
      {/* Sticky Minimalist Header without category capsules */}
      <div className="search-header-container">
        {/* Top Control Bar */}
        <div className="search-top-row">
          <button
            type="button"
            className="search-back-circle-btn"
            onClick={() => setActiveScreen('home')}
            aria-label="Back to Home"
            title="Back to Home"
          >
            <ArrowLeft size={20} />
          </button>

          {/* Minimalist Search Input Bar */}
          <form onSubmit={handleSubmit} className="minimal-search-bar movie-focus">
            <Film size={18} className="search-lead-icon text-cyan" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search movies, series, OTT originals..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="minimal-search-input"
            />

            {query && (
              <button
                type="button"
                className="search-clear-icon-btn"
                onClick={() => {
                  setQuery('');
                  setMovieResults([]);
                  setRelatedMusic([]);
                  inputRef.current?.focus();
                }}
                aria-label="Clear Search"
              >
                <X size={15} />
              </button>
            )}

            <button
              type="button"
              className={`search-mic-icon-btn ${isListening ? 'listening-pulse' : ''}`}
              onClick={handleVoiceSearch}
              title={isListening ? 'Listening...' : 'Voice Search'}
              aria-label="Voice Search"
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          </form>
        </div>

        {/* Dynamic Search Filter Capsules (All, Latest, Dubbed, Series, Movies, Actors) */}
        {query && (
          <div className="search-capsules-scroll">
            {SEARCH_CAPSULES.map(cap => (
              <button
                key={cap}
                type="button"
                className={`search-capsule-btn ${searchFilter === cap ? 'active' : ''}`}
                onClick={() => {
                  setSearchFilter(cap);
                  triggerSearch(query, cap);
                }}
              >
                {cap === 'Latest' ? '⚡ Latest (New to Old)' : cap}
              </button>
            ))}
          </div>
        )}

        {/* Active Filters Strip (when filters are chosen from sheet) */}
        {hasActiveFilters && (
          <div className="active-filter-strip">
            <span className="filter-strip-label">Filtered by:</span>
            {selectedOTT !== 'All' && (
              <button
                type="button"
                className="filter-pill-tag ott-tag"
                onClick={() => setSelectedOTT('All')}
                title="Remove OTT filter"
              >
                <span>{selectedOTT}</span>
                <X size={11} />
              </button>
            )}
            {activeCategory !== 'All' && (
              <button
                type="button"
                className="filter-pill-tag cat-tag"
                onClick={() => setActiveCategory('All')}
                title="Remove category filter"
              >
                <span>{activeCategory}</span>
                <X size={11} />
              </button>
            )}
            <button
              type="button"
              className="clear-filters-btn"
              onClick={() => {
                setSelectedOTT('All');
                setActiveCategory('All');
              }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Main Search Body */}
      <div className="search-content-body">
        {/* Recent Searches (when not searching and no results) */}
        {!query && recentSearches.length > 0 && (
          <div className="recent-search-section">
            <div className="recent-section-header">
              <div className="section-label">
                <History size={15} />
                <span>Recent Searches</span>
              </div>
              <button className="clear-all-text-btn" onClick={clearAllRecents}>
                Clear All
              </button>
            </div>
            <div className="recent-chips-flow">
              {recentSearches.map((term, i) => (
                <div
                  key={i}
                  className="recent-chip-bubble"
                  onClick={() => {
                    setQuery(term);
                    triggerSearch(term);
                  }}
                >
                  <span className="bubble-text">{term}</span>
                  <button
                    className="bubble-close-btn"
                    onClick={e => {
                      e.stopPropagation();
                      clearRecent(term);
                    }}
                    aria-label={`Remove ${term}`}
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Popular Trending Tags (when no query) */}
        {!query && popularTags.length > 0 && (
          <div className="popular-tags-section">
            <div className="section-label">
              <Flame size={15} className="text-cyan" />
              <span>Trending Cinema Searches</span>
            </div>
            <div className="popular-tags-flow">
              {popularTags.map(tag => (
                <button
                  key={tag}
                  className="popular-tag-btn"
                  onClick={() => {
                    setQuery(tag);
                    triggerSearch(tag);
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Skeleton Grid Loading */}
        {isSearching && (
          <div style={{ width: '100%', padding: '0.5rem 0' }}>
            <SkeletonGrid count={8} />
          </div>
        )}

        {/* Results Container */}
        {!isSearching && query && (
          <div className="search-results-container">
            {/* 1. Movies & Series Section */}
            <div className="results-header-info">
              <span className="results-count-title">
                {filteredMovies.length > 0
                  ? `Movies & Series (${filteredMovies.length})`
                  : `No movies or shows found for "${query}"`}
              </span>
              {selectedOTT !== 'All' && (
                <span className="active-filter-badge">{selectedOTT}</span>
              )}
            </div>

            {filteredMovies.length > 0 && (
              <>
                <div className="movies-results-grid">
                  {filteredMovies.map(movie => (
                    <MediaCard key={movie.id} item={movie} />
                  ))}
                </div>

                {/* Infinite Scroll Anchor & Loader (25-by-25) */}
                <div ref={searchBottomRef} className="search-infinite-anchor">
                  {isLoadingMore && (
                    <div className="search-more-spinner">
                      <span className="search-loading-dot" />
                      <span>Loading more titles (25-by-25)...</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {filteredMovies.length === 0 && relatedMusic.length === 0 && (
              <div className="search-no-results">
                <Film size={44} className="no-results-icon text-muted" />
                <h3>No titles found</h3>
                <p>Try searching for a different title, actor, or OTT keyword.</p>
              </div>
            )}

            {/* 2. Related Musics Section (in movies show the related musics) */}
            {relatedMusic.length > 0 && (
              <div className="movie-related-music-block">
                <div className="related-music-head">
                  <div className="related-title-wrap">
                    <Music size={18} className="text-neon" />
                    <h3 className="related-section-title">
                      Related Music & Soundtracks ({relatedMusic.length})
                    </h3>
                  </div>
                  <span className="badge-320kbps-hd">320kbps Master</span>
                </div>

                <div className="related-tracks-list">
                  {relatedMusic.map((song, i) => (
                    <div
                      key={song.id || i}
                      className="related-track-row"
                      onClick={() => playSong(song, relatedMusic)}
                    >
                      <img
                        src={song.image || '/StreamPlay.png'}
                        alt={song.title}
                        className="related-track-thumb"
                        loading="lazy"
                      />
                      <div className="related-track-info">
                        <span className="related-track-name">{song.title}</span>
                        <span className="related-track-sub">
                          {song.artist} {song.album ? `• ${song.album}` : ''}
                        </span>
                      </div>
                      <span className="related-320-tag">320kbps</span>
                      <button
                        type="button"
                        className="related-track-play-btn"
                        aria-label={`Play ${song.title}`}
                      >
                        <Play size={14} fill="#000000" color="#000000" style={{ marginLeft: 2 }} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
