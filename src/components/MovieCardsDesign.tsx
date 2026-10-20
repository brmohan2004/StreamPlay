import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, Star, ArrowRight } from 'lucide-react';
import { MovieItem } from '../types/media';
import { useMedia } from '../context/MediaContext';
import { useNavigation } from '../context/NavigationContext';
import './MovieCardsDesign.css';

// Re-export the standalone Trending Fanned Deck
export { MovieTrendingFannedDeck, formatMovieMetadata } from './MovieTrendingFannedDeck';

/* ========================================================
   1. MOVIE SPOTLIGHT CARD (Top Picks For You)
   Clean 150px curved card with ambient cyan neon elevation
   ======================================================== */
export interface MovieSpotlightCardProps {
  item: MovieItem;
  onClick?: () => void;
}

export const MovieSpotlightCard: React.FC<MovieSpotlightCardProps> = ({ item, onClick }) => {
  const { openMovieDetails } = useMedia();
  const { setActiveScreen } = useNavigation();

  const handleClick = () => {
    if (onClick) onClick();
    else {
      openMovieDetails(item);
      setActiveScreen('details');
    }
  };

  return (
    <motion.div
      className="movie-card-spotlight"
      whileHover={{ y: -6, scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      onClick={handleClick}
    >
      <div className="spotlight-poster-wrap">
        <img
          src={item.poster}
          alt={item.name}
          className="spotlight-poster-img"
          loading="lazy"
          onError={e => {
            (e.target as HTMLImageElement).src =
              'https://images.metahub.space/poster/small/default/img';
          }}
        />

        <div className="spotlight-rating-pill">
          <Star size={11} fill="#ffc107" color="#ffc107" />
          <span>{item.imdbRating || '8.4'}</span>
        </div>

        <div className="spotlight-play-overlay">
          <Play size={18} fill="#000000" color="#000000" style={{ marginLeft: 2 }} />
        </div>
      </div>

      <div className="spotlight-meta">
        <h4 className="spotlight-title" title={item.name}>
          {item.name}
        </h4>
        <p className="spotlight-sub">
          {item.releaseInfo || '2025'} • {item.genres?.[0] || 'Blockbuster'}
        </p>
      </div>
    </motion.div>
  );
};

/* ========================================================
   2. MOVIE BACKDROP CARD (Because You Watched)
   16:9 widescreen landscape panorama scene card
   ======================================================== */
export interface MovieBackdropCardProps {
  item: MovieItem;
  onClick?: () => void;
}

export const MovieBackdropCard: React.FC<MovieBackdropCardProps> = ({ item, onClick }) => {
  const { openMovieDetails } = useMedia();
  const { setActiveScreen } = useNavigation();

  const handleClick = () => {
    if (onClick) onClick();
    else {
      openMovieDetails(item);
      setActiveScreen('details');
    }
  };

  return (
    <div className="movie-card-backdrop" onClick={handleClick}>
      <div className="backdrop-media-wrap">
        <img
          src={item.background || item.poster}
          alt={item.name}
          className="backdrop-media-img"
          loading="lazy"
          onError={e => {
            (e.target as HTMLImageElement).src =
              'https://images.metahub.space/poster/small/default/img';
          }}
        />
        <div className="backdrop-play-circle">
          <div className="backdrop-play-btn-inner">
            <Play size={18} fill="#ffffff" color="#ffffff" style={{ marginLeft: 2 }} />
          </div>
        </div>
      </div>

      <div className="backdrop-meta">
        <h4 className="backdrop-title" title={item.name}>
          {item.name}
        </h4>
        <p className="backdrop-sub">
          {item.releaseInfo || '2025'} • {item.genres?.slice(0, 2).join(' / ') || 'Action'}
        </p>
      </div>
    </div>
  );
};

/* ========================================================
   3. MOVIE RANKED CARD (New Releases)
   148px card with bold #1, #2, #3 podium badges
   ======================================================== */
export interface MovieRankedCardProps {
  item: MovieItem;
  rank: number;
  onClick?: () => void;
}

export const MovieRankedCard: React.FC<MovieRankedCardProps> = ({ item, rank, onClick }) => {
  const { openMovieDetails } = useMedia();
  const { setActiveScreen } = useNavigation();

  const handleClick = () => {
    if (onClick) onClick();
    else {
      openMovieDetails(item);
      setActiveScreen('details');
    }
  };

  const podiumClass =
    rank === 1 ? 'podium-1' : rank === 2 ? 'podium-2' : rank === 3 ? 'podium-3' : 'podium-other';

  return (
    <motion.div
      className="movie-card-ranked"
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      onClick={handleClick}
    >
      <div className="ranked-movie-wrap">
        <img
          src={item.poster}
          alt={item.name}
          className="ranked-movie-img"
          loading="lazy"
          onError={e => {
            (e.target as HTMLImageElement).src =
              'https://images.metahub.space/poster/small/default/img';
          }}
        />

        <div className={`ranked-movie-badge ${podiumClass}`}>#{rank}</div>
      </div>

      <div className="ranked-movie-meta">
        <h4 className="ranked-movie-title" title={item.name}>
          {item.name}
        </h4>
        <p className="ranked-movie-sub">
          {item.releaseInfo || '2025'} • {item.type === 'series' ? 'Series' : 'Movie'}
        </p>
      </div>
    </motion.div>
  );
};

/* ========================================================
   4. MOVIE 2-ROW QUICK TILE GRID (Language Blockbusters)
   2 rows vertically stacked, scrolling horizontally
   ======================================================== */
export interface MovieTwoRowGridProps {
  children: React.ReactNode;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
}

export const MovieTwoRowGrid: React.FC<MovieTwoRowGridProps> = ({ children, scrollRef }) => {
  return (
    <div className="movie-two-row-scroll" ref={scrollRef}>
      <div className="movie-two-row-stage">{children}</div>
    </div>
  );
};

export interface MovieTileCardProps {
  item: MovieItem;
  onClick?: () => void;
}

export const MovieTileCard: React.FC<MovieTileCardProps> = ({ item, onClick }) => {
  const { openMovieDetails } = useMedia();
  const { setActiveScreen } = useNavigation();

  const handleClick = () => {
    if (onClick) onClick();
    else {
      openMovieDetails(item);
      setActiveScreen('details');
    }
  };

  return (
    <motion.div
      className="movie-compact-tile-card"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
    >
      <img
        src={item.poster}
        alt={item.name}
        className="movie-tile-thumb"
        loading="lazy"
        onError={e => {
          (e.target as HTMLImageElement).src =
            'https://images.metahub.space/poster/small/default/img';
        }}
      />
      <div className="movie-tile-meta">
        <h4 className="movie-tile-title" title={item.name}>
          {item.name}
        </h4>
        <p className="movie-tile-sub">
          {item.releaseInfo || '2025'} • {item.genres?.[0] || 'Hit'}
        </p>
      </div>
      <button className="movie-tile-play-btn" aria-label="Play">
        <Play size={13} fill="#000000" color="#000000" style={{ marginLeft: 1 }} />
      </button>
    </motion.div>
  );
};

/* ========================================================
   5. MOVIE PANORAMA FEATURE CARD (Discover Something New)
   Wide banner duotone card with angled poster
   ======================================================== */
export interface MoviePanoramaCardProps {
  item: MovieItem;
  onClick?: () => void;
}

export const MoviePanoramaCard: React.FC<MoviePanoramaCardProps> = ({ item, onClick }) => {
  const { openMovieDetails } = useMedia();
  const { setActiveScreen } = useNavigation();

  const handleClick = () => {
    if (onClick) onClick();
    else {
      openMovieDetails(item);
      setActiveScreen('details');
    }
  };

  return (
    <div className="movie-card-panorama" onClick={handleClick}>
      <div className="panorama-left">
        <h3 className="panorama-title">{item.name}</h3>
        <button className="panorama-btn" aria-label="Explore movie">
          <ArrowRight size={17} />
        </button>
      </div>
      <div className="panorama-right">
        <img
          src={item.poster}
          alt={item.name}
          className="panorama-img"
          loading="lazy"
          onError={e => {
            (e.target as HTMLImageElement).src =
              'https://images.metahub.space/poster/small/default/img';
          }}
        />
      </div>
    </div>
  );
};

/* ========================================================
   6. MOVIE POSTER CARD (Standard Media Card)
   ======================================================== */
export interface MoviePosterCardProps {
  item: MovieItem;
  rank?: number;
  onClick?: () => void;
}

export const MoviePosterCard: React.FC<MoviePosterCardProps> = ({ item, rank, onClick }) => {
  const { openMovieDetails } = useMedia();
  const { setActiveScreen } = useNavigation();

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    } else {
      openMovieDetails(item);
      setActiveScreen('details');
    }
  };

  return (
    <motion.div
      className="movie-poster-card-wrapper"
      whileHover={{ y: -6, scale: 1.04 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      onClick={handleCardClick}
    >
      <div className="movie-poster-container">
        <img
          src={item.poster}
          alt={item.name}
          className="movie-poster-img"
          loading="lazy"
          onError={e => {
            (e.target as HTMLImageElement).src =
              'https://images.metahub.space/poster/small/default/img';
          }}
        />

        {rank !== undefined && <div className="movie-rank-badge">#{rank}</div>}

        {item.ottProvider && item.ottProvider !== 'All' && (
          <div className={`movie-ott-badge ${item.ottProvider.toLowerCase().replace(/[^a-z]/g, '')}`}>
            {item.ottProvider}
          </div>
        )}

        <div className="movie-card-overlay">
          <button className="movie-quick-play-btn" aria-label="Play">
            <Play size={20} fill="#000000" color="#000000" style={{ marginLeft: 2 }} />
          </button>
        </div>
      </div>

      <div className="movie-poster-info">
        <h4 className="movie-poster-title" title={item.name}>
          {item.name}
        </h4>
        <div className="movie-poster-meta">
          <span>{item.releaseInfo || '2025'}</span>
          <span>•</span>
          <span className="movie-poster-rating">
            <Star size={12} fill="#ffffff" color="#ffffff" />
            {item.imdbRating || '8.2'}
          </span>
          <span className="movie-poster-type-badge">{item.type === 'series' ? 'SERIES' : 'MOVIE'}</span>
        </div>
      </div>
    </motion.div>
  );
};

/* ========================================================
   7. MOVIE CONTINUE CARD (Continue Watching)
   ======================================================== */
export interface MovieContinueCardProps {
  item: MovieItem;
  progressPercent?: number;
  onClick?: () => void;
}

export const MovieContinueCard: React.FC<MovieContinueCardProps> = ({
  item,
  progressPercent = 45,
  onClick
}) => {
  const { openMoviePlayer } = useMedia();

  const handleClick = () => {
    if (onClick) onClick();
    else openMoviePlayer(item);
  };

  return (
    <div className="movie-continue-card" onClick={handleClick}>
      <div className="movie-continue-thumb-wrap">
        <img src={item.poster} alt={item.name} className="movie-continue-thumb" loading="lazy" />
        <div className="movie-continue-play-hover">
          <Play size={22} fill="#ffffff" color="#ffffff" style={{ marginLeft: 2 }} />
        </div>
        <div className="movie-continue-progress-bar">
          <div
            className="movie-continue-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
      <span className="movie-continue-name" title={item.name}>
        {item.name}
      </span>
    </div>
  );
};

/* ========================================================
   8. MOVIE SCROLL ROW
   ======================================================== */
export interface MovieScrollRowProps {
  title: string;
  items: MovieItem[];
  showRank?: boolean;
}

export const MovieScrollRow: React.FC<MovieScrollRowProps> = ({
  title,
  items,
  showRank = false
}) => {
  const rowRef = React.useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const scrollAmount = rowRef.current.clientWidth * 0.75;
      rowRef.current.scrollTo({
        left: direction === 'left' ? rowRef.current.scrollLeft - scrollAmount : rowRef.current.scrollLeft + scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="movie-row-container">
      <div className="movie-row-header">
        <h2 className="movie-row-title">{title}</h2>

        <div className="movie-row-controls">
          <button className="movie-row-arrow-btn" onClick={() => scroll('left')} aria-label="Scroll left">
            <ChevronLeft size={18} />
          </button>
          <button className="movie-row-arrow-btn" onClick={() => scroll('right')} aria-label="Scroll right">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="movie-row-scroll" ref={rowRef}>
        {items.map((item, index) => (
          <MoviePosterCard
            key={item.id || index}
            item={item}
            rank={showRank ? index + 1 : undefined}
          />
        ))}
      </div>
    </div>
  );
};

/* ========================================================
   9. GENERIC MOVIE SECTION ROW (Custom Children)
   ======================================================== */
export interface MovieSectionRowProps {
  title: string;
  children: React.ReactNode;
}

export const MovieSectionRow: React.FC<MovieSectionRowProps> = ({ title, children }) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.75;
      scrollRef.current.scrollTo({
        left: direction === 'left' ? scrollRef.current.scrollLeft - scrollAmount : scrollRef.current.scrollLeft + scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="movie-row-container">
      <div className="movie-row-header">
        <h2 className="movie-row-title">{title}</h2>
        <div className="movie-row-controls">
          <button className="movie-row-arrow-btn" onClick={() => scroll('left')} aria-label="Scroll left">
            <ChevronLeft size={18} />
          </button>
          <button className="movie-row-arrow-btn" onClick={() => scroll('right')} aria-label="Scroll right">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div className="movie-row-scroll" ref={scrollRef}>
        {children}
      </div>
    </div>
  );
};

export const MovieTwoRowSection: React.FC<MovieSectionRowProps> = ({ title, children }) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.75;
      scrollRef.current.scrollTo({
        left: direction === 'left' ? scrollRef.current.scrollLeft - scrollAmount : scrollRef.current.scrollLeft + scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="movie-row-container">
      <div className="movie-row-header">
        <h2 className="movie-row-title">{title}</h2>
        <div className="movie-row-controls">
          <button className="movie-row-arrow-btn" onClick={() => scroll('left')} aria-label="Scroll left">
            <ChevronLeft size={18} />
          </button>
          <button className="movie-row-arrow-btn" onClick={() => scroll('right')} aria-label="Scroll right">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div className="movie-two-row-scroll" ref={scrollRef}>
        <div className="movie-two-row-stage">{children}</div>
      </div>
    </div>
  );
};

