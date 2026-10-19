import './AudioPlayerBar.css';
import React from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';

export const AudioPlayerBar: React.FC = () => {
  const {
    currentSong,
    isPlayingSong,
    toggleSongPlay,
    nextSong,
    prevSong,
    songProgress,
    songDuration,
    seekSong,
    songVolume,
    setSongVolume,
    openMusicPlayer
  } = useMedia();

  if (!currentSong) return null;

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = songDuration ? (songProgress / songDuration) * 100 : 0;

  return (
    <motion.div
      className="audio-player-bar"
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 20 }}
    >
      <div className="audio-progress-bar-container">
        <input
          type="range"
          min={0}
          max={songDuration || 100}
          value={songProgress}
          onChange={e => seekSong(parseFloat(e.target.value))}
          className="audio-progress-slider"
        />
        <div className="audio-progress-filled" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="player-bar-content">
        {/* Track Info (Click to open full player) */}
        <div className="player-track-info" onClick={openMusicPlayer} title="Expand Player">
          <img
            src={currentSong.image}
            alt={currentSong.title}
            className="player-album-art"
            onError={e => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&q=80';
            }}
          />
          <div className="player-text-details">
            <h4 className="player-song-title" title={currentSong.title}>
              {currentSong.title}
            </h4>
            <p className="player-artist-name" title={currentSong.artist}>
              {currentSong.artist}
            </p>
          </div>
          <span className="audio-quality-badge">{currentSong.quality || '320kbps'}</span>
        </div>

        {/* Playback Controls */}
        <div className="player-controls-group">
          <div className="controls-buttons">
            <button className="ctrl-btn" onClick={prevSong} title="Previous Track">
              <SkipBack size={18} />
            </button>

            <motion.button
              className="ctrl-play-btn"
              whileTap={{ scale: 0.92 }}
              onClick={toggleSongPlay}
              title={isPlayingSong ? 'Pause' : 'Play'}
            >
              {isPlayingSong ? (
                <Pause size={20} fill="#090b13" color="#090b13" />
              ) : (
                <Play size={20} fill="#090b13" color="#090b13" />
              )}
            </motion.button>

            <button className="ctrl-btn" onClick={nextSong} title="Next Track">
              <SkipForward size={18} />
            </button>
          </div>

          <div className="time-display">
            <span>{formatTime(songProgress)}</span>
            <span>/</span>
            <span>{formatTime(songDuration)}</span>
          </div>
        </div>

        {/* Volume & Extras */}
        <div className="player-extra-controls">
          <div className="volume-control-box">
            <button
              className="vol-icon-btn"
              onClick={() => setSongVolume(songVolume > 0 ? 0 : 0.85)}
            >
              {songVolume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={songVolume}
              onChange={e => setSongVolume(parseFloat(e.target.value))}
              className="volume-slider"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};
