import './MusicSearchScreen.css';
import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Music, X, ArrowLeft, History, Play, Pause, Heart, Sparkles, SlidersHorizontal } from 'lucide-react';
import { searchSongs } from '../services/musicService';
import { SongItem } from '../types/media';
import { useMedia } from '../context/MediaContext';
import { useNavigation } from '../context/NavigationContext';
import { logSignal } from '../services/recommendationTracker';
import { SkeletonTrackList } from '../components/SkeletonLoader';

const MUSIC_GENRES = [
  'Bollywood',
  'Pop',
  'Lo-Fi',
  'Hip-Hop',
  'Party',
  'Devotional',
  'Acoustic',
  'Romance',
  'Rock'
];

const POPULAR_ARTISTS = [
  'Arijit Singh',
  'Taylor Swift',
  'Diljit Dosanjh',
  'Anirudh',
  'Coldplay',
  'The Weeknd',
  'Shreya Ghoshal',
  'Pritam',
  'Sid Sriram',
  'Billie Eilish'
];

export const MusicSearchScreen: React.FC = () => {
  const {
    setActiveScreen,
    activeCategory,
    setActiveCategory,
    openFilterSheet
  } = useNavigation();
  const { playSong, currentSong, isPlayingSong, toggleSongPlay, toggleLikeSong, isLikedSong } = useMedia();

  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [songResults, setSongResults] = useState<SongItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('streamplay_recent_music_searches') || '[]');
    } catch {
      return [];
    }
  });

  const hasActiveFilters = activeCategory !== 'All';

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Perform search
  const triggerSearch = async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) {
      setSongResults([]);
      return;
    }
    setIsSearching(true);

    // Save to music recents
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 8);
      try {
        localStorage.setItem('streamplay_recent_music_searches', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save recent music searches', e);
      }
      return updated;
    });

    try {
      const songs = await searchSongs(trimmed, 25);
      setSongResults(songs || []);

      // Track: music search intent signal
      logSignal({
        type: 'search',
        itemId: `search-music-${trimmed}`,
        itemType: 'song',
        timestamp: Date.now(),
        metadata: {
          query: trimmed,
        },
      });
      window.dispatchEvent(new CustomEvent('streamplay-rec-update'));
    } catch (err) {
      console.error('Music search failed:', err);
      setSongResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Real-time debounce search as user types
  useEffect(() => {
    if (!query.trim()) {
      setSongResults([]);
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
      localStorage.setItem('streamplay_recent_music_searches', JSON.stringify(updated));
      return updated;
    });
  };

  const clearAllRecents = () => {
    setRecentSearches([]);
    localStorage.removeItem('streamplay_recent_music_searches');
  };

  // Filter songs based on category from Filter Sheet
  const filteredSongs = songResults.filter(s => {
    if (activeCategory === 'All' || activeCategory === 'Songs') return true;
    if (activeCategory === 'Artists') return s.artist.toLowerCase().includes(query.toLowerCase());
    if (activeCategory === 'Albums') return s.album.toLowerCase().includes(query.toLowerCase());
    if (MUSIC_GENRES.includes(activeCategory)) {
      return (
        s.title.toLowerCase().includes(activeCategory.toLowerCase()) ||
        s.artist.toLowerCase().includes(activeCategory.toLowerCase()) ||
        s.album.toLowerCase().includes(activeCategory.toLowerCase())
      );
    }
    return true;
  });

  return (
    <div className="music-search-screen pure-black-theme">
      {/* Sticky Minimalist Header without category capsules */}
      <div className="search-header-container music-header">
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
          <form onSubmit={handleSubmit} className="minimal-search-bar music-focus">
            <Music size={18} className="search-lead-icon text-neon" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search songs, artists, albums, playlists..."
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
                  setSongResults([]);
                  inputRef.current?.focus();
                }}
                aria-label="Clear Search"
              >
                <X size={15} />
              </button>
            )}

            <button
              type="button"
              className={`search-mic-icon-btn music-mic ${isListening ? 'listening-pulse' : ''}`}
              onClick={handleVoiceSearch}
              title={isListening ? 'Listening...' : 'Voice Search'}
              aria-label="Voice Search"
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            {/* Quick Filter Sheet Trigger Button */}
            <button
              type="button"
              className={`search-filter-icon-btn music-filter ${hasActiveFilters ? 'has-filter' : ''}`}
              onClick={openFilterSheet}
              title="Open Music Filters"
              aria-label="Open Music Filters"
            >
              <SlidersHorizontal size={16} />
              {hasActiveFilters && <span className="filter-badge-dot lime-dot" />}
            </button>
          </form>
        </div>

        {/* Active Filter Strip */}
        {hasActiveFilters && (
          <div className="active-filter-strip">
            <span className="filter-strip-label">Filtered by:</span>
            <button
              type="button"
              className="filter-pill-tag lime-cat-tag"
              onClick={() => setActiveCategory('All')}
              title="Remove filter"
            >
              <span>{activeCategory}</span>
              <X size={11} />
            </button>
            <button
              type="button"
              className="clear-filters-btn lime-clear"
              onClick={() => setActiveCategory('All')}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Main Content Body */}
      <div className="search-content-body">
        {/* Recent Searches (when not searching and no results) */}
        {!query && recentSearches.length > 0 && (
          <div className="recent-search-section">
            <div className="recent-section-header">
              <div className="section-label">
                <History size={15} />
                <span>Recent Music Searches</span>
              </div>
              <button className="clear-all-text-btn lime-text" onClick={clearAllRecents}>
                Clear All
              </button>
            </div>
            <div className="recent-chips-flow">
              {recentSearches.map((term, i) => (
                <div
                  key={i}
                  className="recent-chip-bubble music-bubble"
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

        {/* Popular Artists & Hits (when no query) */}
        {!query && (
          <div className="popular-tags-section">
            <div className="section-label">
              <Sparkles size={15} className="text-neon" />
              <span>Trending Artists & Creators</span>
            </div>
            <div className="popular-tags-flow">
              {POPULAR_ARTISTS.map(artist => (
                <button
                  key={artist}
                  className="popular-tag-btn music-artist-tag"
                  onClick={() => {
                    setQuery(artist);
                    triggerSearch(artist);
                  }}
                >
                  {artist}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Skeleton Track List Loading */}
        {isSearching && (
          <div style={{ width: '100%', padding: '0.5rem 0' }}>
            <SkeletonTrackList count={8} />
          </div>
        )}

        {/* Results List */}
        {!isSearching && query && (
          <div className="search-results-container">
            <div className="results-header-info">
              <span className="results-count-title">
                {filteredSongs.length > 0
                  ? `Found ${filteredSongs.length} tracks for "${query}"`
                  : `No tracks found for "${query}"`}
              </span>
              <span className="badge-320kbps-hd">320kbps Master</span>
            </div>

            {filteredSongs.length > 0 ? (
              <div className="music-results-list">
                {filteredSongs.map((song, i) => {
                  const isCurrent = currentSong?.id === song.id;
                  const isPlayingThis = isCurrent && isPlayingSong;
                  const isLiked = isLikedSong(song.id);

                  return (
                    <div
                      key={song.id || i}
                      className={`minimal-track-row ${isCurrent ? 'track-current' : ''}`}
                      onClick={() => playSong(song, filteredSongs)}
                    >
                      <div className="track-left-cover">
                        <img
                          src={song.image || '/StreamPlay.png'}
                          alt={song.title}
                          className="track-cover-thumb"
                          loading="lazy"
                        />
                        <div className={`track-cover-overlay ${isPlayingThis ? 'playing' : ''}`}>
                          {isPlayingThis ? (
                            <Pause size={16} fill="#000000" color="#000000" />
                          ) : (
                            <Play size={16} fill="#000000" color="#000000" style={{ marginLeft: 2 }} />
                          )}
                        </div>
                      </div>

                      <div className="track-middle-meta">
                        <span className={`track-main-title ${isCurrent ? 'title-playing-lime' : ''}`}>
                          {song.title}
                        </span>
                        <span className="track-artist-album">
                          {song.artist} {song.album ? `• ${song.album}` : ''}
                        </span>
                      </div>

                      <div className="track-right-actions">
                        <button
                          type="button"
                          className={`track-like-btn ${isLiked ? 'liked' : ''}`}
                          onClick={e => {
                            e.stopPropagation();
                            toggleLikeSong(song.id);
                          }}
                          aria-label={isLiked ? 'Unlike track' : 'Like track'}
                        >
                          <Heart size={16} fill={isLiked ? '#c8ff00' : 'none'} color={isLiked ? '#c8ff00' : 'rgba(255,255,255,0.45)'} />
                        </button>

                        <button
                          type="button"
                          className="track-circle-play-btn"
                          onClick={e => {
                            e.stopPropagation();
                            if (isCurrent) {
                              toggleSongPlay();
                            } else {
                              playSong(song, filteredSongs);
                            }
                          }}
                          aria-label={isPlayingThis ? 'Pause' : 'Play'}
                        >
                          {isPlayingThis ? (
                            <Pause size={15} fill="#000000" color="#000000" />
                          ) : (
                            <Play size={15} fill="#000000" color="#000000" style={{ marginLeft: 1 }} />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="search-no-results">
                <Music size={44} className="no-results-icon text-muted" />
                <h3>No music tracks found</h3>
                <p>Try searching for a different song name, artist, or music genre.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
