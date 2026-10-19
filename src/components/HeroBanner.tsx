import React from 'react';
import { motion } from 'framer-motion';
import { Play, Info, Star } from 'lucide-react';
import { MovieItem } from '../types/media';
import { useMedia } from '../context/MediaContext';
import { useNavigation } from '../context/NavigationContext';

interface HeroBannerProps {
  item: MovieItem | null;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ item }) => {
  const { openMoviePlayer, openMovieDetails } = useMedia();
  const { setActiveScreen } = useNavigation();

  if (!item) return null;

  const handleShowDetails = () => {
    openMovieDetails(item);
    setActiveScreen('details');
  };

  return (
    <div className="hero-banner" onClick={handleShowDetails}>
      <div
        className="hero-backdrop"
        style={{
          backgroundImage: `url(${item.background || item.poster})`
        }}
      >
        <div className="hero-gradient-overlay" />
      </div>

      <div className="hero-content">
        <div className="hero-badges">
          <span className="hero-tag">🔥 FEATURED BLOCKBUSTER</span>
          {item.ottProvider && <span className="hero-ott">{item.ottProvider}</span>}
          <span className="hero-rating">
            <Star size={14} fill="#ffffff" color="#ffffff" />
            {item.imdbRating || '8.8'} IMDB
          </span>
        </div>

        <h1 className="hero-title">{item.name}</h1>

        <p className="hero-description">{item.description}</p>

        <div className="hero-genres">
          {item.genres?.slice(0, 3).map((g, idx) => (
            <span key={idx} className="genre-pill">
              {g}
            </span>
          ))}
          <span className="genre-pill">{item.type === 'series' ? 'Web Series' : 'Movie'}</span>
        </div>

        <div className="hero-actions" onClick={e => e.stopPropagation()}>
          <motion.button
            className="hero-btn primary-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => openMoviePlayer(item)}
          >
            <Play size={20} fill="#090b13" color="#090b13" />
            <span>Watch Now Free</span>
          </motion.button>

          <motion.button
            className="hero-btn secondary-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleShowDetails}
          >
            <Info size={20} />
            <span>Details</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
};

