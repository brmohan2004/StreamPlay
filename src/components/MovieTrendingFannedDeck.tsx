import './MovieTrendingFannedDeck.css';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MovieItem } from '../types/media';
import { useMedia } from '../context/MediaContext';
import { useNavigation } from '../context/NavigationContext';

/* Helper to format movie metadata e.g. "2008 • Action/Crime • 2h 32m" */
export const formatMovieMetadata = (movie: MovieItem): string => {
  const parts: string[] = [];
  if (movie.releaseInfo) parts.push(movie.releaseInfo);
  if (movie.genres && movie.genres.length > 0) {
    parts.push(movie.genres.slice(0, 2).join('/'));
  }
  if (movie.runtime) {
    parts.push(movie.runtime);
  } else if (movie.type) {
    parts.push(movie.type === 'series' ? 'Series' : 'Movie');
  }
  return parts.length > 0 ? parts.join(' • ') : 'Trending Hit';
};

export interface MovieTrendingFannedDeckProps {
  movies: MovieItem[];
  onPlayMovie?: (movie: MovieItem) => void;
}

export const MovieTrendingFannedDeck: React.FC<MovieTrendingFannedDeckProps> = ({
  movies,
  onPlayMovie
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const { openMoviePlayer, openMovieDetails } = useMedia();
  const { setActiveScreen } = useNavigation();

  if (!movies || movies.length === 0) return null;

  const totalCards = movies.length;

  const handleNext = () => {
    setActiveIndex(prev => (prev + 1) % totalCards);
  };

  const handlePrev = () => {
    setActiveIndex(prev => (prev - 1 + totalCards) % totalCards);
  };

  const handleCardClick = (movie: MovieItem) => {
    openMovieDetails(movie);
    setActiveScreen('details');
  };

  const handlePlayClick = (e: React.MouseEvent, movie: MovieItem) => {
    e.stopPropagation();
    if (onPlayMovie) {
      onPlayMovie(movie);
    } else {
      openMoviePlayer(movie);
    }
  };

  // Stack configuration: show up to 4 cards fanned in 3D
  const stackOffsets = [
    { x: 0, y: 0, scale: 1, rotate: 0, zIndex: 10, opacity: 1 },
    { x: -26, y: -8, scale: 0.94, rotate: -3.5, zIndex: 8, opacity: 0.88 },
    { x: 22, y: -16, scale: 0.88, rotate: 3, zIndex: 6, opacity: 0.72 },
    { x: -44, y: -22, scale: 0.82, rotate: -6.5, zIndex: 4, opacity: 0.5 }
  ];

  const visibleCount = Math.min(4, totalCards);
  const visibleCards = [];
  for (let i = 0; i < visibleCount; i++) {
    const cardIdx = (activeIndex + i) % totalCards;
    visibleCards.push({ movie: movies[cardIdx], stackPos: i, originalIdx: cardIdx });
  }

  // Render from back to front
  visibleCards.reverse();

  return (
    <div className="movie-fanned-deck-viewport">
      {/* Navigation Arrows (Desktop only, hidden on mobile) */}
      <button
        className="movie-fanned-nav-btn prev"
        onClick={handlePrev}
        aria-label="Previous movie"
      >
        <ChevronLeft size={24} />
      </button>

      <button
        className="movie-fanned-nav-btn next"
        onClick={handleNext}
        aria-label="Next movie"
      >
        <ChevronRight size={24} />
      </button>

      <div className="movie-fanned-stage">
        {visibleCards.map(({ movie, stackPos, originalIdx }) => {
          const cfg = stackOffsets[stackPos] || stackOffsets[stackOffsets.length - 1];
          const isCenter = stackPos === 0;

          return (
            <motion.div
              key={movie.id || originalIdx}
              className={`movie-fanned-card-wrapper stack-pos-${stackPos} ${isCenter ? 'is-center' : ''}`}
              animate={{
                x: cfg.x,
                y: cfg.y,
                scale: cfg.scale,
                rotate: cfg.rotate,
                opacity: cfg.opacity,
                zIndex: cfg.zIndex
              }}
              transition={{
                type: 'spring',
                stiffness: 320,
                damping: 28,
                mass: 0.8
              }}
              drag={isCenter ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(_, info) => {
                if (info.offset.x < -60) handleNext();
                else if (info.offset.x > 60) handlePrev();
              }}
              onClick={() => {
                if (isCenter) {
                  handleCardClick(movie);
                } else {
                  setActiveIndex(originalIdx);
                }
              }}
            >
              <div className="movie-fanned-card-inner">
                <img
                  src={movie.poster}
                  alt={movie.name}
                  className="movie-fanned-poster"
                  loading="lazy"
                  onError={e => {
                    (e.target as HTMLImageElement).src =
                      'https://images.metahub.space/poster/small/default/img';
                  }}
                />

                <div className="movie-fanned-vignette" />

                {/* Dark Dimmer on back cards */}
                {!isCenter && <div className="movie-fanned-dimmer" />}

                {/* Bottom Bar: Title, Meta & Glass Pill PLAY button */}
                {isCenter && (
                  <div className="movie-fanned-bottom-bar">
                    <div className="movie-fanned-info">
                      <h2 className="movie-fanned-title" title={movie.name}>
                        {movie.name}
                      </h2>
                      <p className="movie-fanned-meta">
                        {formatMovieMetadata(movie)}
                      </p>
                    </div>

                    <button
                      className="movie-fanned-play-pill"
                      onClick={e => handlePlayClick(e, movie)}
                      aria-label={`Play ${movie.name}`}
                    >
                      PLAY
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
