import './CommonSearchScreen.css';
import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Film, Music, Play, History, X, ArrowLeft, Sparkles } from 'lucide-react';
import { CategoryCapsules } from '../components/CategoryCapsules';
import { searchMoviesAndShows } from '../services/movieService';
import { searchSongs } from '../services/musicService';
import { MovieItem, SongItem } from '../types/media';
import { useMedia } from '../context/MediaContext';
import { useNavigation } from '../context/NavigationContext';
import { MediaCard } from '../components/MediaCard';

export const CommonSearchScreen: React.FC = () => {
  const { appMode, setActiveScreen, setAppMode } = useNavigation();
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [searchCategory, setSearchCategory] = useState('All');
  const [movieResults, setMovieResults] = useState<MovieItem[]>([]);
  const [songResults, setSongResults] = useState<SongItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('streamplay_recent_searches') || '[]');
    } catch {
      return [];
    }
  });

  const { playSong } = useMedia();

  const movieCategories = [
    'All',
    'Movies',
    'Series',
    'Action',
    'Sci-Fi',
    'Comedy',
    'Thriller',
    'Horror',
    'Romance',
    'Drama'
  ];

  const musicCategories = [
    'All',
    'Songs',
    'Artists',
    'Albums',
    'Trending',
    'Bollywood',
    'Pop',
    'Hip-Hop',
    'Lo-Fi',
    'Devotional'
  ];

  const searchCategories = appMode === 'movies' ? movieCategories : musicCategories;

  // Reset category filter when appMode changes
  useEffect(() => {
    setSearchCategory('All');
  }, [appMode]);

  // Perform search
  const triggerSearch = async (term: string) => {
    if (!term.trim()) return;
    setIsSearching(true);

    // Save to recents
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s.toLowerCase() !== term.toLowerCase());
      const updated = [term, ...filtered].slice(0, 8);
      localStorage.setItem('streamplay_recent_searches', JSON.stringify(updated));
      return updated;
    });

    const [movies, songs] = await Promise.all([
      searchMoviesAndShows(term),
      searchSongs(term, 15)
    ]);

    setMovieResults(movies);
    setSongResults(songs);
    setIsSearching(false);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerSearch(query);
  };

  const handleCategorySelect = (cat: string) => {
    setSearchCategory(cat);
    if (!query && cat !== 'All') {
      triggerSearch(cat);
    }
  };

  // Voice Search Simulation / Web Speech API
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
      localStorage.setItem('streamplay_recent_searches', JSON.stringify(updated));
      return updated;
    });
  };

  // Filter movie results by selected capsule
  const filteredMovies = movieResults.filter(m => {
    if (searchCategory === 'All') return true;
    if (searchCategory === 'Movies') return m.type === 'movie';
    if (searchCategory === 'Series') return m.type === 'series';
    if (['Drama', 'Comedy', 'Horror', 'Action', 'Sci-Fi', 'Thriller', 'Romance'].includes(searchCategory)) {
      return m.genres?.some(g => g.toLowerCase().includes(searchCategory.toLowerCase()));
    }
    return true;
  });

  // Filter music results
  const filteredSongs = songResults.filter(s => {
    if (searchCategory === 'All') return true;
    if (searchCategory === 'Songs' || searchCategory === 'Trending') return true;
    if (searchCategory === 'Artists') return s.artist.toLowerCase().includes(query.toLowerCase());
    if (searchCategory === 'Albums') return s.album.toLowerCase().includes(query.toLowerCase());
    return true;
  });

  const showMusic = appMode === 'music'
    ? true
    : ['All', 'Songs', 'Artists', 'Albums', 'Trending'].includes(searchCategory) && songResults.length > 0;

  const showMovies = appMode === 'movies'
    ? true
    : ['All', 'Movies', 'Series', 'Drama', 'Comedy', 'Horror', 'Action', 'Sci-Fi', 'Thriller', 'Romance'].includes(searchCategory) && movieResults.length > 0;

  return (
    <div className={`search-screen-container mode-${appMode}`}>
      {/* Header Search Bar with Left Back Button */}
      <div className="search-header-panel">
        <div className="search-top-nav-bar">
          <button
            type="button"
            className="search-back-btn"
            onClick={() => setActiveScreen('home')}
            aria-label="Back to Home"
            title="Back"
          >
            <ArrowLeft size={22} />
          </button>

          <form onSubmit={handleFormSubmit} className={`search-input-wrapper mode-${appMode}`}>
            {appMode === 'movies' ? (
              <Film size={20} className="search-field-icon text-cyan" />
            ) : (
              <Music size={20} className="search-field-icon text-neon" />
            )}

            <input
              type="text"
              placeholder={
                appMode === 'movies'
                  ? 'Search movies, series, OTT originals...'
                  : 'Search songs, artists, albums, playlists...'
              }
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="search-main-input"
              autoFocus
            />

            {query && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => {
                  setQuery('');
                  setMovieResults([]);
                  setSongResults([]);
                }}
                aria-label="Clear Search"
              >
                <X size={16} />
              </button>
            )}

            <button
              type="button"
              className={`search-mic-btn mode-${appMode} ${isListening ? 'listening' : ''}`}
              onClick={handleVoiceSearch}
              title={isListening ? 'Listening...' : 'Voice Search'}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          </form>
        </div>

        {/* Dynamic Mode Indicator & Switcher */}
        <div className="search-mode-indicator-bar">
          <div className="mode-indicator-left">
            {appMode === 'movies' ? (
              <span className="search-mode-badge movies-badge">
                <Film size={13} /> Cinema & OTT Mode
              </span>
            ) : (
              <span className="search-mode-badge music-badge">
                <Music size={13} /> Spotify 320kbps Mode
              </span>
            )}
          </div>

          <button
            className="search-switch-mode-btn"
            onClick={() => setAppMode(appMode === 'movies' ? 'music' : 'movies')}
            title={`Switch to ${appMode === 'movies' ? 'Music' : 'Movies'} Search`}
          >
            <Sparkles size={12} />
            <span>Switch to {appMode === 'movies' ? 'Music' : 'Movies'}</span>
          </button>
        </div>

        {/* Category Capsules */}
        <div className={`search-capsules-wrap mode-${appMode}`}>
          <CategoryCapsules
            categories={searchCategories}
            activeCategory={searchCategory}
            onSelectCategory={handleCategorySelect}
          />
        </div>
      </div>

      {/* Recent Searches */}
      {!movieResults.length && !songResults.length && !isSearching && (
        <div className="recent-searches-box">
          <div className="recent-header">
            <div className="recent-title">
              <History size={16} />
              <span>Recent Searches</span>
            </div>
            {recentSearches.length > 0 && (
              <button
                className="clear-all-recent"
                onClick={() => {
                  setRecentSearches([]);
                  localStorage.removeItem('streamplay_recent_searches');
                }}
              >
                Clear All
              </button>
            )}
          </div>

          <div className="recent-chips-list">
            {recentSearches.map((term, i) => (
              <div
                key={i}
                className={`recent-chip mode-${appMode}`}
                onClick={() => {
                  setQuery(term);
                  triggerSearch(term);
                }}
              >
                <span>{term}</span>
                <button
                  className="chip-remove"
                  onClick={e => {
                    e.stopPropagation();
                    clearRecent(term);
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isSearching && (
        <div className="search-loading-state">
          <div className={`spinner ${appMode === 'music' ? 'lime-spinner' : 'cyan-spinner'}`} />
          <p>Searching {appMode === 'movies' ? 'Cinema & OTT catalogs...' : '320kbps Music library...'}</p>
        </div>
      )}

      {/* Results Content Area */}
      {!isSearching && (
        <div className="search-results-viewport">
          {/* If Movies Mode: Render Movies First */}
          {appMode === 'movies' && showMovies && filteredMovies.length > 0 && (
            <div className="search-section-block">
              <div className="section-header-row">
                <Film size={18} className="text-cyan" />
                <h3 className="section-title-text">
                  Movies & Series ({filteredMovies.length})
                </h3>
              </div>
              <div className="search-movies-grid">
                {filteredMovies.map(movie => (
                  <MediaCard key={movie.id} item={movie} />
                ))}
              </div>
            </div>
          )}

          {/* Music Results */}
          {showMusic && filteredSongs.length > 0 && (
            <div className="search-section-block">
              <div className="section-header-row">
                <Music size={18} className="text-neon" />
                <h3 className="section-title-text">
                  Music Tracks ({filteredSongs.length})
                </h3>
              </div>
              <div className="search-songs-list">
                {filteredSongs.map((song, i) => (
                  <div
                    key={song.id || i}
                    className="search-track-row"
                    onClick={() => playSong(song, filteredSongs)}
                  >
                    <img src={song.image} alt={song.title} className="track-thumb" />
                    <div className="track-info">
                      <span className="track-title">{song.title}</span>
                      <span className="track-artist">{song.artist} • {song.album}</span>
                    </div>
                    <span className="badge-320">320kbps</span>
                    <button className="track-play-btn" aria-label="Play Track">
                      <Play size={16} fill="#ffffff" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* If Music Mode: Render Movies Second (if any) */}
          {appMode === 'music' && showMovies && filteredMovies.length > 0 && (
            <div className="search-section-block">
              <div className="section-header-row">
                <Film size={18} className="text-cyan" />
                <h3 className="section-title-text">
                  Related Movies & Series ({filteredMovies.length})
                </h3>
              </div>
              <div className="search-movies-grid">
                {filteredMovies.map(movie => (
                  <MediaCard key={movie.id} item={movie} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
