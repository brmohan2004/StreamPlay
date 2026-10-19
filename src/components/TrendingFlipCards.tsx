import './TrendingFlipCards.css';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Bookmark, Star, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { MovieItem } from '../types/media';
import { useMedia } from '../context/MediaContext';
import { useNavigation } from '../context/NavigationContext';

interface TrendingFlipCardsProps {
  movies: MovieItem[];
}

export const TrendingFlipCards: React.FC<TrendingFlipCardsProps> = ({ movies }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  const { openMoviePlayer, openMovieDetails, toggleWatchLater, isWatchLater } = useMedia();
  const { setActiveScreen } = useNavigation();

  if (movies.length === 0) {
    return (
      <div className="trending-flip-card-section">
        <div className="section-title-wrap">
          <h2 className="section-heading">Trending</h2>
        </div>
        <div className="flip-card-viewport">
          <div className="flip-card-perspective-container">
            <div className="flip-card-inner">
              <div className="flip-card-face card-front" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))', animation: 'pulse 1.5s infinite ease-in-out' }}>
                <div className="card-face-gradient" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentMovie = movies[currentIndex] || movies[0];

  const handleShowDetails = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    openMovieDetails(currentMovie);
    setActiveScreen('details');
  };


  const handleNext = () => {
    setDirection('right');
    setIsFlipped(false);
    setCurrentIndex(prev => (prev + 1) % movies.length);
  };

  const handlePrev = () => {
    setDirection('left');
    setIsFlipped(false);
    setCurrentIndex(prev => (prev - 1 + movies.length) % movies.length);
  };

  return (
    <div className="trending-flip-card-section">
      <div className="section-title-wrap">
        <h2 className="section-heading">Trending</h2>
      </div>

      <div className="flip-card-viewport">
        {/* Navigation Arrows */}
        <button className="flip-nav-arrow left" onClick={handlePrev} aria-label="Previous">
          <ChevronLeft size={22} />
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentMovie.id || currentIndex}
            className="flip-card-perspective-container"
            initial={{ opacity: 0, x: direction === 'right' ? 80 : -80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: direction === 'right' ? -80 : 80, scale: 0.9 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) handleNext();
              else if (info.offset.x > 60) handlePrev();
            }}
          >
            <motion.div
              className={`flip-card-inner ${isFlipped ? 'flipped' : ''}`}
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.6, type: 'spring', damping: 20 }}
            >
              {/* Card FRONT: Matching the uploaded design (Rich poster, OTT badge, Watch Now Button) */}
              <div className="flip-card-face card-front" onClick={() => setIsFlipped(true)}>
                <img
                  src={currentMovie.poster}
                  alt={currentMovie.name}
                  className="flip-card-img"
                  onError={e => {
                    (e.target as HTMLImageElement).src =
                      'https://images.metahub.space/poster/small/default/img';
                  }}
                />

                <div className="card-face-gradient" />

                {/* Top Badges */}
                <div className="flip-card-top-bar">
                  <span className="card-genre-tag">
                    {currentMovie.genres?.[0] || (currentMovie.type === 'series' ? 'Series' : 'Movie')}
                  </span>

                  <button
                    className={`card-bookmark-btn ${isWatchLater(currentMovie.id) ? 'bookmarked' : ''}`}
                    onClick={e => {
                      e.stopPropagation();
                      toggleWatchLater(currentMovie);
                    }}
                    title="Watch Later"
                  >
                    <Bookmark size={18} fill={isWatchLater(currentMovie.id) ? '#ffffff' : 'none'} />
                  </button>
                </div>

                {/* Bottom Content Area */}
                <div className="flip-card-bottom-content">
                  <div className="card-title-row" onClick={handleShowDetails} style={{ cursor: 'pointer' }} title="View Movie Details">
                    <h3 className="card-title-text">{currentMovie.name}</h3>
                    <div className="card-rating-pill">
                      <Star size={13} fill="#ffffff" color="#ffffff" />
                      <span>{currentMovie.imdbRating || '8.5'}</span>
                    </div>
                  </div>

                  <p className="card-meta-line" onClick={handleShowDetails} style={{ cursor: 'pointer' }}>
                    <span>{currentMovie.releaseInfo || '2025'}</span>
                    <span>•</span>
                    <span className="card-ott-tag">{currentMovie.ottProvider || 'Netflix & Hotstar'}</span>
                  </p>

                  {/* Golden Yellow "Watch Now" Button matching the uploaded design */}
                  <div className="card-cta-row">
                    <motion.button
                      className="pill-watch-now-btn"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleShowDetails}
                    >
                      <Play size={18} fill="#000000" color="#000000" />
                      <span>Watch & Details</span>
                    </motion.button>

                    <button
                      className="flip-prompt-btn"
                      onClick={e => {
                        e.stopPropagation();
                        setIsFlipped(true);
                      }}
                    >
                      <Layers size={16} />
                      <span>Story & Cast</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Card BACK: Story, Cast, OTT info & Flip back */}
              <div className="flip-card-face card-back" onClick={() => setIsFlipped(false)}>
                <div className="card-back-header">
                  <span className="card-back-badge">OVERVIEW & DETAILS</span>
                  <button
                    className="card-back-close"
                    onClick={e => {
                      e.stopPropagation();
                      setIsFlipped(false);
                    }}
                  >
                    Flip Back ⤺
                  </button>
                </div>

                <h3 className="back-title">{currentMovie.name}</h3>

                <p className="back-desc">{currentMovie.description}</p>

                <div className="back-genres">
                  {currentMovie.genres?.map((g, i) => (
                    <span key={i} className="back-genre-pill">
                      {g}
                    </span>
                  ))}
                </div>

                <div className="back-specs">
                  <div className="spec-item">
                    <span className="spec-label">Format</span>
                    <span className="spec-val">{currentMovie.type.toUpperCase()} 4K HDR</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">Available On</span>
                    <span className="spec-val text-cyan">{currentMovie.ottProvider || 'Universal OTT'}</span>
                  </div>
                </div>

                <motion.button
                  className="pill-watch-now-btn back-play-btn"
                  whileTap={{ scale: 0.95 }}
                  onClick={e => {
                    e.stopPropagation();
                    openMoviePlayer(currentMovie);
                  }}
                >
                  <Play size={18} fill="#000000" color="#000000" />
                  <span>Start Streaming In-App</span>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>

        <button className="flip-nav-arrow right" onClick={handleNext} aria-label="Next">
          <ChevronRight size={22} />
        </button>
      </div>

      {/* Pagination Indicator Dots */}
      <div className="flip-card-dots">
        {movies.slice(0, 7).map((_, i) => (
          <span
            key={i}
            className={`flip-dot ${i === currentIndex % 7 ? 'active' : ''}`}
            onClick={() => {
              setIsFlipped(false);
              setCurrentIndex(i);
            }}
          />
        ))}
      </div>
    </div>
  );
};
