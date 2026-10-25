import './RecommendationRow.css';
import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { MovieItem, SongItem } from '../types/media';
import { MediaCard } from './MediaCard';
import { useMedia } from '../context/MediaContext';
import { motion } from 'framer-motion';
import { handleSongCoverError } from '../config/mediaFallback';

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
  items,
  type
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
        <h2 className="rec-row-title">{title}</h2>

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
                    onError={handleSongCoverError}
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
                </div>
              </motion.div>
            ))}
      </div>
    </div>
  );
};
