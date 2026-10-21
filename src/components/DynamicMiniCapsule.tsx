import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward } from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import './DynamicMiniCapsule.css';

/**
 * DynamicMiniCapsule
 * Universal iOS Dynamic Island & Android Mini Capsule (supporting Realme, Samsung, Xiaomi, OnePlus, Pixel, and iOS Safari/PWA/Capacitor).
 */
export const DynamicMiniCapsule: React.FC = () => {
  const {
    currentSong,
    isPlayingSong,
    toggleSongPlay,
    nextSong,
    openMusicPlayer,
    isMusicPlayerOpen,
    songProgress,
    songDuration
  } = useMedia();

  // Only render when there is an active track and the full player modal is closed
  if (!currentSong || isMusicPlayerOpen) return null;

  const progressPercent = songDuration > 0 ? (songProgress / songDuration) * 100 : 0;

  return (
    <AnimatePresence>
      <motion.div
        className="dynamic-mini-capsule-wrapper"
        initial={{ y: -50, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -50, opacity: 0, scale: 0.8 }}
        transition={{ type: 'spring', damping: 20, stiffness: 320 }}
        onClick={openMusicPlayer}
        role="button"
        tabIndex={0}
        aria-label={`Playing ${currentSong.title} by ${currentSong.artist}. Tap to expand dynamic player`}
      >
        <div className={`dynamic-capsule-pill ${isPlayingSong ? 'is-playing' : ''}`}>
          {/* Left: Album Artwork with Spinning Vinyl Effect */}
          <div className="dynamic-capsule-left-artwork">
            <img
              src={currentSong.image || '/StreamPlay.png'}
              alt={currentSong.title}
              className={`dynamic-capsule-thumb ${isPlayingSong ? 'spin-record' : ''}`}
            />
            {isPlayingSong && (
              <span className="dynamic-capsule-active-dot" />
            )}
          </div>

          {/* Middle: Title & Equalizer Waveform */}
          <div className="dynamic-capsule-middle-content">
            <div className="dynamic-capsule-text-line">
              <span className="dynamic-capsule-track-title">{currentSong.title}</span>
              <span className="dynamic-capsule-separator">•</span>
              <span className="dynamic-capsule-artist">{currentSong.artist}</span>
            </div>

            {/* iOS Dynamic Island & Android Equalizer Waveform */}
            <div className="dynamic-capsule-waveform">
              <span className={`wave-bar bar-1 ${isPlayingSong ? 'wave-active' : ''}`} />
              <span className={`wave-bar bar-2 ${isPlayingSong ? 'wave-active' : ''}`} />
              <span className={`wave-bar bar-3 ${isPlayingSong ? 'wave-active' : ''}`} />
              <span className={`wave-bar bar-4 ${isPlayingSong ? 'wave-active' : ''}`} />
            </div>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="dynamic-capsule-right-controls" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              className="dynamic-capsule-btn play-btn"
              onClick={toggleSongPlay}
              aria-label={isPlayingSong ? 'Pause' : 'Play'}
              title={isPlayingSong ? 'Pause' : 'Play'}
            >
              {isPlayingSong ? (
                <Pause size={13} fill="#c8ff00" color="#c8ff00" />
              ) : (
                <Play size={13} fill="#c8ff00" color="#c8ff00" style={{ marginLeft: 1 }} />
              )}
            </button>

            <button
              type="button"
              className="dynamic-capsule-btn skip-btn"
              onClick={nextSong}
              aria-label="Skip Track"
              title="Skip Track"
            >
              <SkipForward size={13} color="rgba(255,255,255,0.7)" />
            </button>
          </div>

          {/* Bottom Micro-Progress Bar */}
          <div className="dynamic-capsule-progress-track">
            <div
              className="dynamic-capsule-progress-fill"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DynamicMiniCapsule;
