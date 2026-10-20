import './RecommendationRow.css';
import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Play } from 'lucide-react';
import { MovieItem, SongItem } from '../types/media';
import { MediaCard } from './MediaCard';
import { useMedia } from '../context/MediaContext';
import { motion } from 'framer-motion';

export interface RecommendationRowProps {
  title: string;
  subtitle?: string;
  badgeText?: string;
  items: (MovieItem & { _recReason?: string })[] | (SongItem & { _recReason?: string })[];
  type: 'movie' | 'song';
  icon?: React.ReactNode;
}

export const RecommendationRow: React.FC<RecommendationRowProps> = ({
  title,
  subtitle,
  badgeText = 'AI Pick',
  items,
  type,
  icon = <Sparkles size={16} className="text-cyan" />
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const { playSong, openMusicPlayer } = useMedia();

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = clientWidth * 0.75;
      rowRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="rec-row-container">
      <div className="rec-row-header">
        <div className="rec-row-title-wrap">
          <div className="rec-badge-row">
            <span className="rec-ai-pill">
              <Sparkles size={11} />
              {badgeText}
            </span>
            <span className="rec-free-pill">100% FREE</span>
          </div>

          <h2 className="rec-row-title">
            <span className="rec-row-title-icon">{icon}</span>
            <span>{title}</span>
          </h2>

          {subtitle && <p className="rec-row-subtitle">{subtitle}</p>}
        </div>

        <div className="rec-row-controls">
          <button className="rec-arrow-btn" onClick={() => scroll('left')} aria-label="Scroll left">
            <ChevronLeft size={18} />
          </button>
          <button className="rec-arrow-btn" onClick={() => scroll('right')} aria-label="Scroll right">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="rec-row-scroll" ref={rowRef}>
        {type === 'movie'
          ? (items as (MovieItem & { _recReason?: string })[]).map((movie, idx) => (
              <div key={movie.id || idx} className="rec-movie-item">
                <MediaCard item={movie} />
                {movie._recReason && (
                  <div className="rec-reason-tag" title={movie._recReason}>
                    <Sparkles size={10} />
                    <span>{movie._recReason}</span>
                  </div>
                )}
              </div>
            ))
          : (items as (SongItem & { _recReason?: string })[]).map((song, idx) => (
              <motion.div
                key={song.id || idx}
                className="rec-song-card"
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                onClick={() => {
                  playSong(song, items as SongItem[]);
                  openMusicPlayer();
                }}
              >
                <div className="rec-song-art-wrap">
                  <img
                    src={song.image}
                    alt={song.title}
                    className="rec-song-art"
                    loading="lazy"
                    onError={e => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop';
                    }}
                  />
                  <div className="rec-song-play-btn">
                    <Play size={18} fill="#000" color="#000" style={{ marginLeft: 2 }} />
                  </div>
                </div>

                <div className="rec-song-info">
                  <span className="rec-song-title" title={song.title}>
                    {song.title}
                  </span>
                  <span className="rec-song-artist" title={song.artist}>
                    {song.artist}
                  </span>
                  {song._recReason && (
                    <span className="rec-song-reason" title={song._recReason}>
                      <Sparkles size={9} />
                      {song._recReason}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
      </div>
    </div>
  );
};
