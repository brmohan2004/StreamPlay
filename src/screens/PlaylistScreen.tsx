import './PlaylistScreen.css';
import React, { useState } from 'react';
import { Plus, Play, Music2, Edit3, Trash2, X, ArrowLeft } from 'lucide-react';
import { TopAppHeader } from '../components/TopAppHeader';
import { useMedia } from '../context/MediaContext';
import { SongItem } from '../types/media';

export const PlaylistScreen: React.FC = () => {
  const {
    playlists,
    createPlaylist,
    editPlaylist,
    deletePlaylist,
    removeSongFromPlaylist,
    playSong
  } = useMedia();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  // Edit State
  const [editingPlaylist, setEditingPlaylist] = useState<{ id: string; name: string } | null>(null);
  const [editName, setEditName] = useState('');

  // Delete Confirmation State
  const [deletingPlaylist, setDeletingPlaylist] = useState<{ id: string; name: string } | null>(null);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setIsCreateOpen(false);
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPlaylist && editName.trim()) {
      editPlaylist(editingPlaylist.id, editName.trim());
      setEditingPlaylist(null);
    }
  };

  const handleConfirmDelete = () => {
    if (deletingPlaylist) {
      deletePlaylist(deletingPlaylist.id);
      if (selectedPlaylistId === deletingPlaylist.id) {
        setSelectedPlaylistId(null);
      }
      setDeletingPlaylist(null);
    }
  };

  const selectedPlaylist = playlists.find(p => p.id === selectedPlaylistId);

  return (
    <div className="playlist-screen-container">
      {/* Header: No back button on all playlists screen; back button only when viewing inside a specific playlist */}
      <TopAppHeader
        showBack={!!selectedPlaylist}
        onBack={() => setSelectedPlaylistId(null)}
        title={selectedPlaylist ? selectedPlaylist.name : 'Playlists'}
      />

      <div className="playlist-scroll-body">
        {selectedPlaylist ? (
          /* Detailed Playlist View */
          <div className="playlist-detail-view">
            <button className="back-to-all-playlists" onClick={() => setSelectedPlaylistId(null)}>
              <ArrowLeft size={16} />
              <span>All Playlists</span>
            </button>

            <div className="playlist-hero-card">
              {selectedPlaylist.cover ? (
                <img
                  src={selectedPlaylist.cover}
                  alt={selectedPlaylist.name}
                  className="playlist-hero-img"
                />
              ) : (
                <div className="playlist-hero-img placeholder-hero-cover">
                  <Music2 size={44} style={{ opacity: 0.6 }} />
                </div>
              )}

              <div className="playlist-hero-info">
                <span className="playlist-badge">PLAYLIST</span>
                <h2 className="playlist-title">{selectedPlaylist.name}</h2>
                <p className="playlist-tracks-count">{selectedPlaylist.songs.length} Tracks</p>

                <div className="playlist-action-btns-row">
                  {selectedPlaylist.songs.length > 0 && (
                    <button
                      className="playlist-play-all-btn"
                      onClick={() => playSong(selectedPlaylist.songs[0], selectedPlaylist.songs)}
                      title="Play All Tracks"
                    >
                      <Play size={16} fill="#000" color="#000" />
                      <span>Play All</span>
                    </button>
                  )}

                  <button
                    className="playlist-icon-action-btn"
                    onClick={() => {
                      setEditingPlaylist({ id: selectedPlaylist.id, name: selectedPlaylist.name });
                      setEditName(selectedPlaylist.name);
                    }}
                    title="Rename Playlist"
                  >
                    <Edit3 size={16} />
                    <span>Rename</span>
                  </button>

                  <button
                    className="playlist-icon-action-btn danger"
                    onClick={() => setDeletingPlaylist({ id: selectedPlaylist.id, name: selectedPlaylist.name })}
                    title="Delete Playlist"
                  >
                    <Trash2 size={16} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Song List in Playlist */}
            {selectedPlaylist.songs.length === 0 ? (
              <div className="playlist-empty-state">
                <Music2 size={36} />
                <p>No tracks added yet.</p>
                <span className="playlist-empty-sub">
                  Browse songs on Home or Search and tap any track to listen.
                </span>
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

                    <button
                      className="song-row-play"
                      onClick={e => {
                        e.stopPropagation();
                        playSong(song, selectedPlaylist.songs);
                      }}
                      title="Play"
                    >
                      <Play size={16} fill="#fff" />
                    </button>

                    <button
                      className="song-row-remove"
                      onClick={e => {
                        e.stopPropagation();
                        removeSongFromPlaylist(selectedPlaylist.id, song.id);
                      }}
                      title="Remove from Playlist"
                    >
                      <Trash2 size={15} />
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
                <h2 className="screen-main-title">Your Playlists</h2>
                <span className="screen-sub">{playlists.length} playlists created</span>
              </div>

              {/* Create button opens popup modal */}
              <button
                className="new-playlist-toggle-btn"
                onClick={() => {
                  setNewPlaylistName('');
                  setIsCreateOpen(true);
                }}
              >
                <Plus size={18} />
                <span>Create</span>
              </button>
            </div>

            {/* Playlists Grid */}
            {playlists.length === 0 ? (
              <div className="playlist-empty-state">
                <Music2 size={44} style={{ opacity: 0.4 }} />
                <p>No playlists yet.</p>
                <span className="playlist-empty-sub">
                  Create your first playlist to organize your favorite tracks.
                </span>
                <button
                  className="create-first-playlist-btn"
                  onClick={() => setIsCreateOpen(true)}
                >
                  <Plus size={16} />
                  <span>Create Playlist</span>
                </button>
              </div>
            ) : (
              <div className="playlists-grid">
                {playlists.map(pl => (
                  <div key={pl.id} className="playlist-card-container">
                    <div
                      className="playlist-card"
                      onClick={() => setSelectedPlaylistId(pl.id)}
                    >
                      <div className="playlist-card-cover-wrap">
                        {pl.cover ? (
                          <img
                            src={pl.cover}
                            alt={pl.name}
                            className="playlist-card-cover"
                          />
                        ) : (
                          <div className="playlist-card-cover placeholder-card-cover">
                            <Music2 size={32} style={{ opacity: 0.5 }} />
                          </div>
                        )}
                        <div className="playlist-hover-play">
                          <Play size={18} fill="#000" color="#000" />
                        </div>
                      </div>

                      <div className="playlist-card-text-row">
                        <div className="card-info-wrap">
                          <h4 className="playlist-card-title">{pl.name}</h4>
                          <p className="playlist-card-sub">{pl.songs.length} Tracks</p>
                        </div>
                      </div>
                    </div>

                    {/* Quick action buttons for edit and delete */}
                    <div className="playlist-card-actions-bar">
                      <button
                        className="card-action-btn"
                        onClick={e => {
                          e.stopPropagation();
                          setEditingPlaylist({ id: pl.id, name: pl.name });
                          setEditName(pl.name);
                        }}
                        title="Edit Playlist Name"
                      >
                        <Edit3 size={14} />
                      </button>

                      <button
                        className="card-action-btn danger"
                        onClick={e => {
                          e.stopPropagation();
                          setDeletingPlaylist({ id: pl.id, name: pl.name });
                        }}
                        title="Delete Playlist"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 1. Create Playlist Modal Popup */}
      {isCreateOpen && (
        <div className="playlist-modal-overlay" onClick={() => setIsCreateOpen(false)}>
          <div className="playlist-modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-top-bar">
              <h3 className="modal-title">Create Playlist</h3>
              <button className="modal-close-btn" onClick={() => setIsCreateOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <p className="modal-description">
              Give your playlist a title to start adding your favorite tracks.
            </p>

            <form onSubmit={handleCreateSubmit} className="modal-form">
              <input
                type="text"
                placeholder="e.g. Late Night Vibes, Workout 2026..."
                value={newPlaylistName}
                onChange={e => setNewPlaylistName(e.target.value)}
                className="modal-text-input"
                autoFocus
              />

              <div className="modal-actions-row">
                <button
                  type="button"
                  className="modal-btn-cancel"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal-btn-primary"
                  disabled={!newPlaylistName.trim()}
                >
                  Create Playlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit Playlist Modal Popup */}
      {editingPlaylist && (
        <div className="playlist-modal-overlay" onClick={() => setEditingPlaylist(null)}>
          <div className="playlist-modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-top-bar">
              <h3 className="modal-title">Rename Playlist</h3>
              <button className="modal-close-btn" onClick={() => setEditingPlaylist(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="modal-form">
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="modal-text-input"
                autoFocus
              />

              <div className="modal-actions-row">
                <button
                  type="button"
                  className="modal-btn-cancel"
                  onClick={() => setEditingPlaylist(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal-btn-primary"
                  disabled={!editName.trim()}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Delete Confirmation Modal Popup */}
      {deletingPlaylist && (
        <div className="playlist-modal-overlay" onClick={() => setDeletingPlaylist(null)}>
          <div className="playlist-modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-top-bar">
              <h3 className="modal-title text-danger">Delete Playlist?</h3>
              <button className="modal-close-btn" onClick={() => setDeletingPlaylist(null)}>
                <X size={18} />
              </button>
            </div>

            <p className="modal-description">
              Are you sure you want to delete <strong>"{deletingPlaylist.name}"</strong>? This action cannot be undone.
            </p>

            <div className="modal-actions-row">
              <button
                type="button"
                className="modal-btn-cancel"
                onClick={() => setDeletingPlaylist(null)}
              >
                Keep Playlist
              </button>
              <button
                type="button"
                className="modal-btn-danger"
                onClick={handleConfirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
