import React from 'react';
import './ArcScrubber.css';
import { Heart } from 'lucide-react';

interface ArcScrubberProps {
  progressRatio: number;
  songProgress: number;
  songDuration: number;
  isLiked: boolean;
  onToggleLike: () => void;
}

export const ArcScrubber: React.FC<ArcScrubberProps> = ({
  progressRatio,
  songProgress,
  songDuration,
  isLiked,
  onToggleLike
}) => {
  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Radius R = 135
  const radius = 135;
  const startAngle = Math.PI * 0.85; // ~153 deg
  const endAngle = Math.PI * 0.15; // ~27 deg
  const currentAngle = startAngle + (endAngle - startAngle) * progressRatio;

  return (
    <div className="arc-scrubber-deck">
      {/* SVG Arc Progress Line */}
      <svg className="arc-progress-svg" viewBox="0 0 320 180">
        {/* Background Arc */}
        <path
          d="M 30 150 A 135 135 0 0 1 290 150"
          fill="none"
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Glowing Progress Arc */}
        <path
          d="M 30 150 A 135 135 0 0 1 290 150"
          fill="none"
          stroke="#c8ff00"
          strokeWidth="4"
          strokeDasharray="400"
          strokeDashoffset={400 - 400 * progressRatio}
          strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 8px #c8ff00)' }}
        />

        {/* Progress Knob */}
        <circle
          cx={160 + radius * Math.cos(currentAngle)}
          cy={150 - radius * Math.sin(currentAngle)}
          r="7"
          fill="#ffffff"
          stroke="#c8ff00"
          strokeWidth="3"
          style={{ filter: 'drop-shadow(0 0 10px #c8ff00)' }}
        />
      </svg>

      {/* Center Heart & Digital Time Display */}
      <div className="arc-center-meta">
        <button
          className={`arc-heart-btn ${isLiked ? 'liked' : ''}`}
          onClick={onToggleLike}
          aria-label="Like Track"
        >
          <Heart size={22} fill={isLiked ? '#c8ff00' : 'none'} color={isLiked ? '#c8ff00' : '#fff'} />
        </button>

        <div className="arc-time-counter">
          <span>{formatTime(songProgress)}</span>
          <span className="time-divider">/</span>
          <span>{formatTime(songDuration || 180)}</span>
        </div>
      </div>

      {/* Neon Lime Arc Highlight Bar */}
      <div className="neon-lime-accent-arc" />
    </div>
  );
};
