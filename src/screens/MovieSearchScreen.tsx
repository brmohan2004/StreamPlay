import './MovieSearchScreen.css';
import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Film, Music, X, ArrowLeft, History, Flame, Play, SlidersHorizontal } from 'lucide-react';
import { searchMoviesAndShows } from '../services/movieService';
import { searchSongs } from '../services/musicService';
import { MovieItem, SongItem } from '../types/media';
import { useNavigation } from '../context/NavigationContext';
import { useMedia } from '../context/MediaContext';
import { MediaCard } from '../components/MediaCard';
import { logSignal } from '../services/recommendationTracker';

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

const POPULAR_MOVIE_TAGS = [
  'Oppenheimer',
  'Stranger Things',
  'Squid Game',
  'The Batman',
  'Interstellar',
  'Avatar',
  'Breaking Bad',
  'Game of Thrones'
];

export const MovieSearchScreen: React.FC = () => {
  const {
    setActiveScreen,
    selectedOTT,
    setSelectedOTT,
    activeCategory,
    setActiveCategory,
    openFilterSheet
  } = useNavigation();
  const { playSong } = useMedia();

  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [movieResults, setMovieResults] = useState<MovieItem[]>([]);
  const [relatedMusic, setRelatedMusic] = useState<SongItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('streamplay_recent_movie_searches') || '[]');
    } catch {
      return [];
    }
  });

  const hasActiveFilters = selectedOTT !== 'All' || activeCategory !== 'All';

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Perform search (Dedicated movie search engine + related music)
  const triggerSearch = async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) {
      setMovieResults([]);
      setRelatedMusic([]);
      return;
    }
    setIsSearching(true);

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
      const [movies, songs] = await Promise.all([
        searchMoviesAndShows(trimmed),
        searchSongs(trimmed, 8)
      ]);
      setMovieResults(movies || []);
      setRelatedMusic(songs || []);

      // Track: search intent signal
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

            {/* Quick Filter Sheet Trigger Button */}
            <button
              type="button"
              className={`search-filter-icon-btn ${hasActiveFilters ? 'has-filter' : ''}`}
              onClick={openFilterSheet}
              title="Filters & OTT Networks"
              aria-label="Open Filters & OTT Networks"
            >
              <SlidersHorizontal size={16} />
              {hasActiveFilters && <span className="filter-badge-dot cyan-dot" />}
            </button>
          </form>
        </div>

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
        {!query && (
          <div className="popular-tags-section">
            <div className="section-label">
              <Flame size={15} className="text-cyan" />
              <span>Trending Cinema Searches</span>
            </div>
            <div className="popular-tags-flow">
              {POPULAR_MOVIE_TAGS.map(tag => (
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

        {/* Loading Spinner */}
        {isSearching && (
          <div className="minimal-search-loading">
            <div className="minimal-spinner cyan-spin" />
            <p>Searching cinema catalogs & related soundtracks...</p>
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
              <div className="movies-results-grid">
                {filteredMovies.map(movie => (
                  <MediaCard key={movie.id} item={movie} />
                ))}
              </div>
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
