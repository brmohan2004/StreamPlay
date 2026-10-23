import './MusicPlayerScreen.css';
import React, { useState } from 'react';
import {
  ChevronDown,
  MoreHorizontal,
  Video,
  Music2,
  ListPlus
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import { PlayerVisualStage } from '../components/music-player/PlayerVisualStage';
import { CurvedTrackDial } from '../components/music-player/CurvedTrackDial';
import { ArcScrubber } from '../components/music-player/ArcScrubber';
import { PlayerControlsDeck } from '../components/music-player/PlayerControlsDeck';

interface MusicPlayerScreenProps {
  onClose?: () => void;
}

export const MusicPlayerScreen: React.FC<MusicPlayerScreenProps> = ({ onClose }) => {
  const {
    currentSong,
    isPlayingSong,
    toggleSongPlay,
    nextSong,
    prevSong,
    songProgress,
    songDuration,
    seekSong,
    closeMusicPlayer,
    isShuffle,
    toggleShuffle,
    isRepeat,
    toggleRepeat,
    playbackMode,
    setPlaybackMode,
    toggleLikeSong,
    isLikedSong,
    songQueue,
    playSong,
    openAddToPlaylist
  } = useMedia();

  const [showOptions, setShowOptions] = useState(false);

  if (!currentSong) return null;

  const handleClose = onClose || closeMusicPlayer;
  const isLiked = isLikedSong(currentSong.id);
  const progressRatio = songDuration ? Math.min(1, Math.max(0, songProgress / songDuration)) : 0;

  // Track dial indices
  const currentIndex = songQueue.findIndex(s => String(s.id) === String(currentSong.id));
  const prevTrack = currentIndex > 0 ? songQueue[currentIndex - 1] : (songQueue.length > 0 ? songQueue[songQueue.length - 1] : null);
  const nextTrack = currentIndex >= 0 && currentIndex < songQueue.length - 1 ? songQueue[currentIndex + 1] : (songQueue.length > 0 ? songQueue[0] : null);

  return (
    <div className="music-player-container">
      {/* 1. Top Navigation Bar */}
      <div className="player-top-header">
        <button
          className="player-round-btn"
          onClick={handleClose}
          aria-label="Close Player"
          title="Minimize"
        >
          <ChevronDown size={22} />
        </button>

        {/* Audio / Video Song Mode Switcher */}
        <div className="audio-video-toggle-pill">
          <button
            className={`mode-pill-btn ${playbackMode === 'audio' ? 'active' : ''}`}
            onClick={() => setPlaybackMode('audio')}
          >
            <Music2 size={13} />
            <span>Audio</span>
          </button>
          <button
            className={`mode-pill-btn ${playbackMode === 'video' ? 'active' : ''}`}
            onClick={() => setPlaybackMode('video')}
          >
            <Video size={13} />
            <span>Video</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="player-round-btn"
            onClick={() => openAddToPlaylist(currentSong)}
            aria-label="Add to Playlist"
            title="Add to Playlist"
          >
            <ListPlus size={20} />
          </button>

          <button
            className="player-round-btn"
            onClick={() => setShowOptions(prev => !prev)}
            aria-label="Options"
            title="More Options"
          >
            <MoreHorizontal size={20} />
          </button>
        </div>
      </div>

      {/* Options Dropdown */}
      {showOptions && (
        <div className="player-options-menu">
          <div
            className="option-row"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              setShowOptions(false);
              openAddToPlaylist(currentSong);
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c8ff00' }}>
              <ListPlus size={16} /> Add to Playlist
            </span>
            <span className="text-lime font-bold">+</span>
          </div>
          <div className="option-row">
            <span>Lossless Quality</span>
            <span className="text-lime font-bold">320kbps CD Quality</span>
          </div>
          <div className="option-row">
            <span>Album</span>
            <span>{currentSong.album}</span>
          </div>
          <div className="option-row">
            <span>Language</span>
            <span>{currentSong.language || 'Multi-lingual'}</span>
          </div>
        </div>
      )}

      {/* 2. Visual Stage (Artwork or Video) */}
      <PlayerVisualStage currentSong={currentSong} playbackMode={playbackMode} />

      {/* 3. Curved Track Dial */}
      <CurvedTrackDial
        currentSong={currentSong}
        prevTrack={prevTrack}
        nextTrack={nextTrack}
        currentIndex={currentIndex >= 0 ? currentIndex : 0}
        totalQueue={songQueue.length || 1}
        onSelectTrack={track => playSong(track, songQueue)}
      />

      {/* 4. Interactive Semi-Circle Arc Scrubber */}
      <ArcScrubber
        progressRatio={progressRatio}
        songProgress={songProgress}
        songDuration={songDuration}
        isLiked={isLiked}
        onToggleLike={() => toggleLikeSong(currentSong.id)}
        onSeek={seekSong}
      />

      {/* 5. Controls Deck */}
      <PlayerControlsDeck
        isPlaying={isPlayingSong}
        isShuffle={isShuffle}
        isRepeat={isRepeat}
        onTogglePlay={toggleSongPlay}
        onNext={nextSong}
        onPrev={prevSong}
        onToggleShuffle={toggleShuffle}
        onToggleRepeat={toggleRepeat}
      />
    </div>
  );
};
