import React, { useState, useRef } from 'react';
import './ArcScrubber.css';
import { Heart } from 'lucide-react';

interface ArcScrubberProps {
  progressRatio: number;
  songProgress: number;
  songDuration: number;
  isLiked: boolean;
  onToggleLike: () => void;
  onSeek: (time: number) => void;
}

export const ArcScrubber: React.FC<ArcScrubberProps> = ({
  progressRatio,
  songProgress,
  songDuration,
  isLiked,
  onToggleLike,
  onSeek
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragRatio, setDragRatio] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const effectiveRatio = isDragging && dragRatio !== null ? dragRatio : progressRatio;
  const effectiveTime = isDragging && dragRatio !== null
    ? dragRatio * (songDuration || 180)
    : songProgress;

  // Exact semi-circle geometry:
  // Center: (160, 150), Radius: 130
  // Left point: (30, 150) -> Top point: (160, 20) -> Right point: (290, 150)
  const radius = 130;
  const arcLength = Math.PI * radius; // ~408.407

  // Angle theta: from Math.PI (left, ratio=0) to 0 (right, ratio=1)
  const angle = Math.PI * (1 - effectiveRatio);
  const knobX = 160 + radius * Math.cos(angle);
  const knobY = 150 - radius * Math.sin(angle);

  const calculateRatioFromEvent = (clientX: number, clientY: number): number => {
    if (!svgRef.current) return 0;
    const rect = svgRef.current.getBoundingClientRect();
    // Transform client coordinate to SVG viewBox space (320 x 180)
    const scaleX = 320 / rect.width;
    const scaleY = 180 / rect.height;
    const svgX = (clientX - rect.left) * scaleX;
    const svgY = (clientY - rect.top) * scaleY;

    // Vector from center (160, 150)
    const dx = svgX - 160;
    const dy = 150 - svgY; // Invert SVG y-axis so dy > 0 is above center

    let phi = Math.atan2(dy, dx);
    if (phi < 0) {
      phi = dx < 0 ? Math.PI : 0;
    }
    const clampedPhi = Math.max(0, Math.min(Math.PI, phi));
    const ratio = (Math.PI - clampedPhi) / Math.PI;
    return Math.max(0, Math.min(1, ratio));
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setIsDragging(true);
    const newRatio = calculateRatioFromEvent(e.clientX, e.clientY);
    setDragRatio(newRatio);
    if (songDuration > 0) {
      onSeek(newRatio * songDuration);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    const newRatio = calculateRatioFromEvent(e.clientX, e.clientY);
    setDragRatio(newRatio);
    if (songDuration > 0) {
      onSeek(newRatio * songDuration);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    const finalRatio = calculateRatioFromEvent(e.clientX, e.clientY);
    setIsDragging(false);
    setDragRatio(null);
    if (songDuration > 0) {
      onSeek(finalRatio * songDuration);
    }
  };

  const handlePointerCancel = () => {
    setIsDragging(false);
    setDragRatio(null);
  };

  return (
    <div className="arc-scrubber-deck">
      {/* Interactive SVG Arc Progress Scrubber */}
      <svg
        ref={svgRef}
        className="arc-progress-svg"
        viewBox="0 0 320 180"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {/* Invisible wide hit target for easy finger touch along the entire curve */}
        <path
          d="M 30 150 A 130 130 0 0 1 290 150"
          fill="none"
          stroke="transparent"
          strokeWidth="44"
          strokeLinecap="round"
          className="arc-hit-track"
        />

        {/* Background Inactive Arc */}
        <path
          d="M 30 150 A 130 130 0 0 1 290 150"
          fill="none"
          stroke="rgba(255, 255, 255, 0.14)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Glowing Filled Progress Arc */}
        <path
          d="M 30 150 A 130 130 0 0 1 290 150"
          fill="none"
          stroke="#c8ff00"
          strokeWidth="4.5"
          strokeDasharray={arcLength}
          strokeDashoffset={arcLength * (1 - effectiveRatio)}
          strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 8px #c8ff00)' }}
        />

        {/* Draggable Progress Knob Dot */}
        <g className={`arc-knob-group ${isDragging ? 'dragging' : ''}`}>
          {/* Subtle halo when dragging */}
          {isDragging && (
            <circle
              cx={knobX}
              cy={knobY}
              r="17"
              fill="rgba(200, 255, 0, 0.22)"
              style={{ filter: 'drop-shadow(0 0 12px #c8ff00)' }}
            />
          )}

          {/* Invisible enlarged hit circle for the dot */}
          <circle
            cx={knobX}
            cy={knobY}
            r="26"
            fill="transparent"
            className="arc-knob-hit"
          />

          {/* Main Glowing Dot Knob */}
          <circle
            cx={knobX}
            cy={knobY}
            r={isDragging ? 9 : 7.5}
            fill="#ffffff"
            stroke="#c8ff00"
            strokeWidth={isDragging ? 3.5 : 3}
            className="arc-knob-circle"
            style={{
              filter: isDragging
                ? 'drop-shadow(0 0 15px #c8ff00) drop-shadow(0 0 6px #ffffff)'
                : 'drop-shadow(0 0 10px #c8ff00)'
            }}
          />
        </g>
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
          <span>{formatTime(effectiveTime)}</span>
          <span className="time-divider">/</span>
          <span>{formatTime(songDuration || 180)}</span>
        </div>
      </div>

      {/* Neon Lime Arc Highlight Bar */}
      <div className="neon-lime-accent-arc" />
    </div>
  );
};
