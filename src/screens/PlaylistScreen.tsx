import './PlaylistScreen.css';
import React, { useState } from 'react';
import { Plus, Play, Music2 } from 'lucide-react';
import { TopAppHeader } from '../components/TopAppHeader';
import { useMedia } from '../context/MediaContext';
import { SongItem } from '../types/media';

export const PlaylistScreen: React.FC = () => {
  const { playlists, createPlaylist, playSong } = useMedia();
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setIsCreating(false);
    }
  };

  const selectedPlaylist = playlists.find(p => p.id === selectedPlaylistId);

  return (
    <div className="playlist-screen-container">
      {/* Header: Back button (left), Profile button (right) */}
      <TopAppHeader showBack title={selectedPlaylist ? selectedPlaylist.name : 'Playlists'} />

      <div className="playlist-scroll-body">
        {selectedPlaylist ? (
          /* Detailed Playlist View */
          <div className="playlist-detail-view">
            <button className="back-to-all-playlists" onClick={() => setSelectedPlaylistId(null)}>
              ← Back
            </button>

            <div className="playlist-hero-card">
              <img
                src={selectedPlaylist.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80'}
                alt={selectedPlaylist.name}
                className="playlist-hero-img"
              />
              <div className="playlist-hero-info">
                <span className="playlist-badge">PLAYLIST</span>
                <h2 className="playlist-title">{selectedPlaylist.name}</h2>
                <p className="playlist-tracks-count">{selectedPlaylist.songs.length} Tracks</p>
                {selectedPlaylist.songs.length > 0 && (
                  <button
                    className="playlist-play-all-btn"
                    onClick={() => playSong(selectedPlaylist.songs[0], selectedPlaylist.songs)}
                  >
                    <Play size={18} fill="#000" />
                    <span>Play All</span>
                  </button>
                )}
              </div>
            </div>

            {/* Song List in Playlist */}
            {selectedPlaylist.songs.length === 0 ? (
              <div className="playlist-empty-state">
                <Music2 size={36} />
                <p>No tracks added yet.</p>
              </div>
            ) : (
              <div className="playlist-songs-list">
                {selectedPlaylist.songs.map((song: SongItem, idx: number) => (
                  <div
                    key={song.id || idx}
                    className="playlist-song-row"
                    onClick={() => playSong(song, selectedPlaylist.songs)}
                  >
                    <span className="song-idx">{idx + 1}</span>
                    <img src={song.image} alt={song.title} className="song-row-thumb" />
                    <div className="song-row-text">
                      <span className="song-row-title">{song.title}</span>
                      <span className="song-row-artist">{song.artist}</span>
                    </div>
                    <span className="badge-320">320kbps</span>
                    <button className="song-row-play">
                      <Play size={16} fill="#fff" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* All Playlists Overview */
          <div className="all-playlists-view">
            <div className="playlists-header-action">
              <div>
                <h2 className="screen-main-title">Playlists</h2>
              </div>

              <button className="new-playlist-toggle-btn" onClick={() => setIsCreating(prev => !prev)}>
                <Plus size={18} />
                <span>Create</span>
              </button>
            </div>

            {/* Create Playlist Modal / Form */}
            {isCreating && (
              <form onSubmit={handleCreate} className="create-playlist-form">
                <input
                  type="text"
                  placeholder="Give your playlist a name..."
                  value={newPlaylistName}
                  onChange={e => setNewPlaylistName(e.target.value)}
                  className="create-playlist-input"
                  autoFocus
                />
                <div className="create-form-btns">
                  <button type="button" className="btn-cancel" onClick={() => setIsCreating(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit">
                    Save Playlist
                  </button>
                </div>
              </form>
            )}

            {/* Playlists Grid */}
            <div className="playlists-grid">
              {playlists.map(pl => (
                <div key={pl.id} className="playlist-card" onClick={() => setSelectedPlaylistId(pl.id)}>
                  <div className="playlist-card-cover-wrap">
                    <img
                      src={pl.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80'}
                      alt={pl.name}
                      className="playlist-card-cover"
                    />
                    <div className="playlist-hover-play">
                      <Play size={20} fill="#fff" />
                    </div>
                  </div>
                  <h4 className="playlist-card-title">{pl.name}</h4>
                  <p className="playlist-card-sub">{pl.songs.length} Tracks</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
