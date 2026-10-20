import './MediaCard.css';
import React from 'react';
import { motion } from 'framer-motion';
import { Play, Star } from 'lucide-react';
import { MovieItem } from '../types/media';
import { useMedia } from '../context/MediaContext';
import { useNavigation } from '../context/NavigationContext';

interface MediaCardProps {
  item: MovieItem;
  rank?: number;
}

export const MediaCard: React.FC<MediaCardProps> = ({ item, rank }) => {
  const { openMovieDetails } = useMedia();
  const { setActiveScreen } = useNavigation();

  const handleCardClick = () => {
    openMovieDetails(item);
    setActiveScreen('details');
  };

  return (
    <motion.div
      className="media-card-wrapper"
      whileHover={{ y: -6, scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
    >
      <div className="media-card" onClick={handleCardClick}>
        <div className="media-poster-container">
          <img
            src={item.poster}
            alt={item.name}
            className="media-poster"
            loading="lazy"
            onError={e => {
              (e.target as HTMLImageElement).src =
                'https://images.metahub.space/poster/small/default/img';
            }}
          />

          {rank && <div className="media-rank-badge">#{rank}</div>}

          {item.isTheaterPrint ? (
            <div className="theater-badge">THEATERS</div>
          ) : item.streamUrl ? (
            <div className="live-stream-badge">
              <span className="live-stream-dot" /> LIVE HD
            </div>
          ) : item.ottProvider && item.ottProvider !== 'All' ? (
            <div className={`ott-badge ${item.ottProvider.toLowerCase().replace(/[^a-z]/g, '')}`}>
              {item.ottProvider}
            </div>
          ) : null}

          <div className="card-overlay">
            <motion.button
              className="quick-play-btn"
              whileTap={{ scale: 0.9 }}
              onClick={e => {
                e.stopPropagation();
                handleCardClick();
              }}
              title="View Details & Watch"
            >
              <Play size={18} fill="#000000" color="#000000" style={{ marginLeft: 2 }} />
            </motion.button>
          </div>
        </div>


        <div className="media-info">
          <h4 className="media-title" title={item.name}>
            {item.name}
          </h4>
          <div className="media-meta">
            <span className="media-year">{item.releaseInfo || '2025'}</span>
            <span className="media-dot">•</span>
            <span className="media-rating">
              <Star size={13} fill="#ffffff" color="#ffffff" />
              {item.imdbRating || '8.2'}
            </span>
            <span className="media-badge">{item.type === 'series' ? 'SERIES' : 'MOVIE'}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
