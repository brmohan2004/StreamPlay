import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Check,
  Music2,
  FolderPlus
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import { handleSongCoverError } from '../config/mediaFallback';
import './AddToPlaylistModal.css';

export const AddToPlaylistModal: React.FC = () => {
  const {
    playlists,
    createPlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
    isSongInPlaylist,
    songToAddToPlaylist,
    closeAddToPlaylist
  } = useMedia();

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  if (!songToAddToPlaylist) return null;

  const handleToggleSongInPlaylist = (playlistId: string, playlistName: string) => {
    const alreadyIn = isSongInPlaylist(playlistId, songToAddToPlaylist.id);

    if (alreadyIn) {
      removeSongFromPlaylist(playlistId, String(songToAddToPlaylist.id));
      window.dispatchEvent(
        new CustomEvent('streamplay-toast', {
          detail: { message: `Removed from "${playlistName}"` }
        })
      );
    } else {
      addSongToPlaylist(playlistId, songToAddToPlaylist);
      window.dispatchEvent(
        new CustomEvent('streamplay-toast', {
          detail: { message: `Added to "${playlistName}" 🎵` }
        })
      );
      // Brief pause to show checkmark animation, then close
      setTimeout(() => {
        closeAddToPlaylist();
      }, 350);
    }
  };

  const handleCreateAndAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPlaylistName.trim();
    if (!trimmed) return;

    createPlaylist(trimmed, songToAddToPlaylist);
    setNewPlaylistName('');
    setIsCreatingNew(false);

    window.dispatchEvent(
      new CustomEvent('streamplay-toast', {
        detail: { message: `Created "${trimmed}" & added song! 🚀` }
      })
    );

    setTimeout(() => {
      closeAddToPlaylist();
    }, 400);
  };

  return (
    <AnimatePresence>
      <div className="add-to-playlist-overlay" onClick={closeAddToPlaylist}>
        <motion.div
          className="add-to-playlist-modal"
          initial={{ y: '100%', opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 27, stiffness: 290 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Mobile Grab Bar */}
          <div className="add-playlist-grab-bar" />

          {/* Modal Header */}
          <div className="add-playlist-header">
            <div className="add-playlist-title-block">
              <FolderPlus size={19} color="#c8ff00" />
              <h3>Add to Playlist</h3>
            </div>
            <button
              className="add-playlist-close-btn"
              onClick={closeAddToPlaylist}
              aria-label="Close"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Selected Song Preview Capsule */}
          <div className="add-playlist-song-preview">
            <img
              src={songToAddToPlaylist.image || '/StreamPlay.png'}
              alt={songToAddToPlaylist.title}
              className="add-playlist-song-thumb"
              onError={handleSongCoverError}
            />
            <div className="add-playlist-song-info">
              <span className="add-playlist-song-title">{songToAddToPlaylist.title}</span>
              <span className="add-playlist-song-artist">
                {songToAddToPlaylist.artist} {songToAddToPlaylist.album ? `• ${songToAddToPlaylist.album}` : ''}
              </span>
            </div>
          </div>

          {/* Quick Create New Playlist Action */}
          <div className="add-playlist-create-section">
            {!isCreatingNew ? (
              <button
                type="button"
                className="new-playlist-trigger-btn"
                onClick={() => setIsCreatingNew(true)}
              >
                <Plus size={17} />
                <span>Create New Playlist</span>
              </button>
            ) : (
              <form onSubmit={handleCreateAndAdd} className="new-playlist-form">
                <div className="new-playlist-input-wrap">
                  <input
                    type="text"
                    value={newPlaylistName}
                    onChange={e => setNewPlaylistName(e.target.value)}
                    placeholder="Enter playlist name..."
                    className="new-playlist-input"
                    autoFocus
                    maxLength={40}
                  />
                </div>
                <div className="new-playlist-actions">
                  <button
                    type="button"
                    className="new-playlist-cancel-btn"
                    onClick={() => {
                      setIsCreatingNew(false);
                      setNewPlaylistName('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="new-playlist-submit-btn"
                    disabled={!newPlaylistName.trim()}
                  >
                    Create &amp; Add
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Scrollable Playlist Choices */}
          <div className="add-playlist-list-scroll">
            {playlists.length === 0 ? (
              <div className="add-playlist-empty-state">
                <div className="add-playlist-empty-icon">
                  <Music2 size={26} />
                </div>
                <p>No playlists yet. Tap "Create New Playlist" above to start your collection!</p>
              </div>
            ) : (
              playlists.map(pl => {
                const isAdded = isSongInPlaylist(pl.id, songToAddToPlaylist.id);

                return (
                  <button
                    key={pl.id}
                    type="button"
                    className={`playlist-choice-row ${isAdded ? 'is-added' : ''}`}
                    onClick={() => handleToggleSongInPlaylist(pl.id, pl.name)}
                  >
                    {pl.cover ? (
                      <img
                        src={pl.cover}
                        alt={pl.name}
                        className="playlist-choice-thumb"
                        onError={e => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="playlist-choice-placeholder">
                        <Music2 size={20} />
                      </div>
                    )}

                    <div className="playlist-choice-meta">
                      <span className="playlist-choice-name">{pl.name}</span>
                      <span className="playlist-choice-count">
                        {pl.songs.length} {pl.songs.length === 1 ? 'track' : 'tracks'}
                      </span>
                    </div>

                    <div className={`playlist-status-pill ${isAdded ? 'added' : 'add-btn'}`}>
                      {isAdded ? (
                        <>
                          <Check size={13} />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <Plus size={13} />
                          <span>Add</span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
