import './AudioPlayerBar.css';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  X
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';

export const AudioPlayerBar: React.FC = () => {
  const {
    currentSong,
    isPlayingSong,
    toggleSongPlay,
    stopSong,
    nextSong,
    prevSong,
    songProgress,
    songDuration,
    seekSong,
    openMusicPlayer
  } = useMedia();

  if (!currentSong) return null;

  const progressPercent = songDuration ? Math.min(100, Math.max(0, (songProgress / songDuration) * 100)) : 0;

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    stopSong();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="audio-player-bar"
        initial={{ y: 90, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 90, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 22, stiffness: 300 }}
      >
        {/* Top Progress Track */}
        <div className="audio-progress-bar-container">
          <input
            type="range"
            min={0}
            max={songDuration || 100}
            value={songProgress}
            onChange={e => seekSong(parseFloat(e.target.value))}
            className="audio-progress-slider"
          />
          <div className="audio-progress-filled" style={{ width: `${progressPercent}%` }}>
            <span className="audio-progress-knob" />
          </div>
        </div>

        <div className="player-bar-content">
          {/* Track Info (Click opens full player) */}
          <div className="player-track-info" onClick={openMusicPlayer} title="Tap to open full player">
            <div className="player-album-art-wrap">
              <img
                src={currentSong.image}
                alt={currentSong.title}
                className="player-album-art"
                onError={e => {
                  (e.target as HTMLImageElement).src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M9 18V5l12-2v13'%3E%3C/path%3E%3Ccircle cx='6' cy='18' r='3'%3E%3C/circle%3E%3Ccircle cx='18' cy='16' r='3'%3E%3C/circle%3E%3C/svg%3E";
                }}
              />
            </div>

            <div className="player-text-details">
              <h4 className="player-song-title" title={currentSong.title}>
                {currentSong.title}
              </h4>
              <p className="player-artist-name" title={currentSong.artist}>
                {currentSong.artist}
              </p>
            </div>

            <div className="audio-badge-stack">
              <span className="audio-quality-num">320kbps</span>
              <span className="audio-quality-type">Ultra-HD</span>
            </div>
          </div>

          {/* Right Playback Controls + Cancel Button */}
          <div className="player-controls-group">
            <div className="controls-buttons">
              <button
                className="ctrl-skip-btn-mini"
                onClick={e => {
                  e.stopPropagation();
                  prevSong();
                }}
                title="Previous Track"
              >
                <SkipBack size={18} />
              </button>

              <motion.button
                className="ctrl-play-btn-mini"
                whileTap={{ scale: 0.9 }}
                onClick={e => {
                  e.stopPropagation();
                  toggleSongPlay();
                }}
                title={isPlayingSong ? 'Pause' : 'Play'}
              >
                {isPlayingSong ? (
                  <Pause size={18} fill="#000000" color="#000000" />
                ) : (
                  <Play size={18} fill="#000000" color="#000000" style={{ marginLeft: 2 }} />
                )}
              </motion.button>

              <button
                className="ctrl-skip-btn-mini"
                onClick={e => {
                  e.stopPropagation();
                  nextSong();
                }}
                title="Next Track"
              >
                <SkipForward size={18} />
              </button>
            </div>

            {/* Cancel / Dismiss Button */}
            <button
              className="player-cancel-dismiss-btn"
              onClick={handleCancel}
              title="Close Player"
              aria-label="Close Music Player"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

