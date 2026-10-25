import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Play, Music, Flame } from 'lucide-react';
import { SongItem } from '../types/media';
import { searchSongs } from '../services/musicService';
import { useMedia } from '../context/MediaContext';
import { handleSongCoverError } from '../config/mediaFallback';

export const MusicView: React.FC = () => {
  const [songs, setSongs] = useState<SongItem[]>([]);
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Trending Hits');
  const { playSong, currentSong, isPlayingSong } = useMedia();

  const musicCategories = [
    'Trending Hits',
    'Arijit Singh Essentials',
    'Global Top 50',
    'Chill & Lofi',
    'EDM Party',
    'Bollywood Beats'
  ];

  useEffect(() => {
    loadCategorySongs('Trending Hits');
  }, []);

  const loadCategorySongs = async (category: string) => {
    setIsSearching(true);
    setActiveCategory(category);
    const searchTerms: Record<string, string> = {
      'Trending Hits': 'Top Hits',
      'Arijit Singh Essentials': 'Arijit Singh',
      'Global Top 50': 'Pop 2026',
      'Chill & Lofi': 'Lofi Beats',
      'EDM Party': 'Alan Walker Martin Garrix',
      'Bollywood Beats': 'Bollywood Party Hits'
    };

    const term = searchTerms[category] || category;
    const results = await searchSongs(term, 20);
    setSongs(results);
    setIsSearching(false);
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    const results = await searchSongs(query, 25);
    setSongs(results);
    setActiveCategory(`Search: "${query}"`);
    setIsSearching(false);
  };

  return (
    <div className="music-view-container">
      {/* Spotify style Header */}
      <div className="music-header-banner">
        <div className="music-header-content">
          <div className="music-tag">
            <Flame size={18} className="text-neon" />
            <span>SPOTIFY PREMIUM EXPERIENCE — 100% FREE</span>
          </div>
          <h1 className="music-main-title">Unlimited High-Bitrate Music</h1>
          <p className="music-subtitle">
            Direct 320kbps CD-quality audio streaming. No subscriptions, ads, or account required.
          </p>

          <form onSubmit={handleSearchSubmit} className="music-search-bar">
            <Search size={18} className="music-search-icon" />
            <input
              type="text"
              placeholder="Search songs, artists, albums, or lyrics..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="music-search-input"
            />
            <button type="submit" className="music-search-btn">
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Category Pills */}
      <div className="music-category-pills">
        {musicCategories.map(cat => (
          <button
            key={cat}
            className={`music-pill ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => loadCategorySongs(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Song List */}
      <div className="song-catalog-section">
        <div className="catalog-header">
          <h3 className="catalog-title">{activeCategory}</h3>
          <span className="catalog-count">{songs.length} Tracks Available</span>
        </div>

        {isSearching ? (
          <div className="music-loading">
            <div className="spinner" />
            <p>Fetching real 320kbps audio streams...</p>
          </div>
        ) : songs.length === 0 ? (
          <div className="music-empty">
            <Music size={40} />
            <p>No tracks found. Try searching for an artist like 'Arijit Singh' or 'Taylor Swift'.</p>
          </div>
        ) : (
          <div className="songs-table">
            <div className="table-header-row">
              <span className="col-num">#</span>
              <span className="col-title">Title & Artist</span>
              <span className="col-album">Album</span>
              <span className="col-quality">Audio Quality</span>
              <span className="col-action">Play</span>
            </div>

            {songs.map((song, idx) => {
              const isCurrent = currentSong?.id === song.id;
              return (
                <motion.div
                  key={song.id || idx}
                  className={`song-row ${isCurrent ? 'playing-row' : ''}`}
                  whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                  onClick={() => playSong(song, songs)}
                >
                  <span className="col-num">
                    {isCurrent && isPlayingSong ? (
                      <span className="sound-wave-anim">♪</span>
                    ) : (
                      idx + 1
                    )}
                  </span>

                  <div className="col-title song-title-cell">
                    <img
                      src={song.image}
                      alt={song.title}
                      className="song-thumb"
                      onError={handleSongCoverError}
                    />
                    <div className="title-text-group">
                      <span className="track-name">{song.title}</span>
                      <span className="track-artist">{song.artist}</span>
                    </div>
                  </div>

                  <span className="col-album track-album">{song.album}</span>

                  <span className="col-quality">
                    <span className="badge-320">{song.quality || '320kbps'}</span>
                  </span>

                  <div className="col-action">
                    <motion.button
                      className="row-play-btn"
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={e => {
                        e.stopPropagation();
                        playSong(song, songs);
                      }}
                    >
                      <Play size={16} fill="#ffffff" color="#ffffff" />
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
