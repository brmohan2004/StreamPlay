import './CommonSearchScreen.css';
import React, { useState } from 'react';
import { Search, Mic, MicOff, Film, Music, Play, History, X } from 'lucide-react';
import { CategoryCapsules } from '../components/CategoryCapsules';
import { searchMoviesAndShows } from '../services/movieService';
import { searchSongs } from '../services/musicService';
import { MovieItem, SongItem } from '../types/media';
import { useMedia } from '../context/MediaContext';
import { MediaCard } from '../components/MediaCard';

export const CommonSearchScreen: React.FC = () => {
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

  const searchCategories = [
    'All',
    'Movies',
    'Series',
    'Drama',
    'Comedy',
    'Horror',
    'Action',
    'Songs',
    'Artists',
    'Albums'
  ];

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

  // Filter results by selected capsule
  const filteredMovies = movieResults.filter(m => {
    if (searchCategory === 'All') return true;
    if (searchCategory === 'Movies') return m.type === 'movie';
    if (searchCategory === 'Series') return m.type === 'series';
    if (['Drama', 'Comedy', 'Horror', 'Action'].includes(searchCategory)) {
      return m.genres?.some(g => g.toLowerCase().includes(searchCategory.toLowerCase()));
    }
    return true;
  });

  const showMusic = ['All', 'Songs', 'Artists', 'Albums'].includes(searchCategory);
  const showMovies = ['All', 'Movies', 'Series', 'Drama', 'Comedy', 'Horror', 'Action'].includes(searchCategory);

  return (
    <div className="search-screen-container">
      {/* Header Search Bar with Mic Button */}
      <div className="search-header-panel">
        <form onSubmit={handleFormSubmit} className="search-input-wrapper">
          <Search size={20} className="search-field-icon" />
          <input
            type="text"
            placeholder="Search across all OTTs and Spotify..."
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
            >
              <X size={16} />
            </button>
          )}

          <button
            type="button"
            className={`search-mic-btn ${isListening ? 'listening' : ''}`}
            onClick={handleVoiceSearch}
            title={isListening ? 'Listening...' : 'Voice Search'}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        </form>

        {/* Category Capsules */}
        <div className="search-capsules-wrap">
          <CategoryCapsules
            categories={searchCategories}
            activeCategory={searchCategory}
            onSelectCategory={cat => setSearchCategory(cat)}
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
              <div key={i} className="recent-chip" onClick={() => {
                setQuery(term);
                triggerSearch(term);
              }}>
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
          <div className="spinner" />
          <p>Searching...</p>
        </div>
      )}

      {/* Results Content Area */}
      {!isSearching && (
        <div className="search-results-viewport">
          {/* Movie Results */}
          {showMovies && filteredMovies.length > 0 && (
            <div className="search-section-block">
              <div className="section-header-row">
                <Film size={18} className="text-cyan" />
                <h3 className="section-title-text">
                  Movies & Series
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
          {showMusic && songResults.length > 0 && (
            <div className="search-section-block">
              <div className="section-header-row">
                <Music size={18} className="text-neon" />
                <h3 className="section-title-text">
                  Music
                </h3>
              </div>
              <div className="search-songs-list">
                {songResults.map((song, i) => (
                  <div
                    key={song.id || i}
                    className="search-track-row"
                    onClick={() => playSong(song, songResults)}
                  >
                    <img src={song.image} alt={song.title} className="track-thumb" />
                    <div className="track-info">
                      <span className="track-title">{song.title}</span>
                      <span className="track-artist">{song.artist} • {song.album}</span>
                    </div>
                    <span className="badge-320">320kbps</span>
                    <button className="track-play-btn">
                      <Play size={16} fill="#ffffff" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
