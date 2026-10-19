import React from 'react';
import './PlayerControlsDeck.css';
import {
  Shuffle,
  Repeat,
  SkipBack,
  SkipForward,
  Play,
  Pause
} from 'lucide-react';

interface PlayerControlsDeckProps {
  isPlaying: boolean;
  isShuffle: boolean;
  isRepeat: boolean;
  songDuration: number;
  songProgress: number;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onSeek: (time: number) => void;
}

export const PlayerControlsDeck: React.FC<PlayerControlsDeckProps> = ({
  isPlaying,
  isShuffle,
  isRepeat,
  songDuration,
  songProgress,
  onTogglePlay,
  onNext,
  onPrev,
  onToggleShuffle,
  onToggleRepeat,
  onSeek
}) => {
  return (
    <div className="player-controls-deck">
      {/* Top row: Shuffle & Repeat */}
      <div className="controls-aux-row">
        <button
          className={`ctrl-icon-btn ${isShuffle ? 'active-lime' : ''}`}
          onClick={onToggleShuffle}
          title="Shuffle"
        >
          <Shuffle size={19} />
        </button>

        <button
          className={`ctrl-icon-btn ${isRepeat ? 'active-lime' : ''}`}
          onClick={onToggleRepeat}
          title="Repeat"
        >
          <Repeat size={19} />
        </button>
      </div>

      {/* Main row: Previous, Center Concentric Play/Pause, Next */}
      <div className="controls-main-row">
        <button className="ctrl-skip-btn" onClick={onPrev} title="Previous Track">
          <SkipBack size={24} />
        </button>

        {/* Glowing Concentric Play Button Deck */}
        <div className="concentric-play-wrap">
          <div className={`concentric-ring ring-outer ${isPlaying ? 'pulsing' : ''}`} />
          <div className={`concentric-ring ring-mid ${isPlaying ? 'pulsing' : ''}`} />
          <button
            className="center-white-play-btn"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={26} fill="#000000" color="#000000" />
            ) : (
              <Play size={26} fill="#000000" color="#000000" style={{ marginLeft: 3 }} />
            )}
          </button>
        </div>

        <button className="ctrl-skip-btn" onClick={onNext} title="Next Track">
          <SkipForward size={24} />
        </button>
      </div>

      {/* Scrubber slider fallback for touch scrubbing */}
      <div className="player-hidden-scrub-input">
        <input
          type="range"
          min={0}
          max={songDuration || 100}
          value={songProgress}
          onChange={e => onSeek(parseFloat(e.target.value))}
          className="modal-scrub-slider"
        />
      </div>
    </div>
  );
};
