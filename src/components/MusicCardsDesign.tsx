import React from 'react';
import { motion } from 'framer-motion';
import { Play, ArrowRight, Sparkles } from 'lucide-react';
import { SongItem } from '../types/media';
import './MusicCardsDesign.css';

/* ========================================================
   1. TWO-ROW HORIZONTAL SCROLL GRID (Popular & Recently Played)
   Lists cards vertically into 2 rows, scrolling horizontally
   ======================================================== */
export interface TwoRowScrollGridProps {
  children: React.ReactNode;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
}

export const TwoRowScrollGrid: React.FC<TwoRowScrollGridProps> = ({
  children,
  scrollRef,
  className = ''
}) => {
  return (
    <div className={`two-row-horizontal-scroll ${className}`} ref={scrollRef}>
      <div className="two-row-grid-stage">
        {children}
      </div>
    </div>
  );
};

/* ========================================================
   2. COMPACT TILE CARD (Pill Shape with Artwork, Title, Artist)
   Matches Spotify / Apple Music quick list tile layout
   Used for Popular Songs, Recently Played, and Quick Tile Rows
   ======================================================== */
export interface CompactTileCardProps {
  song: SongItem;
  queue?: SongItem[];
  onPlay: (song: SongItem, queue?: SongItem[]) => void;
  rank?: number;
  showPlayBtn?: boolean;
}

export const CompactTileCard: React.FC<CompactTileCardProps> = ({
  song,
  queue,
  onPlay,
  rank,
  showPlayBtn = false
}) => {
  return (
    <motion.div
      className={`music-compact-tile-card ${rank ? `has-rank rank-${rank <= 3 ? rank : 'gen'}` : ''}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onPlay(song, queue)}
    >
      <div className="compact-tile-thumb-wrap">
        <img
          src={song.image}
          alt={song.title}
          className="compact-tile-thumb"
          loading="lazy"
        />
        {rank !== undefined && (
          <div className={`compact-tile-rank-tag rank-tag-${rank <= 3 ? rank : 'gen'}`}>
            #{rank}
          </div>
        )}
        <div className="compact-tile-hover-play">
          <Play size={13} fill="#000000" color="#000000" style={{ marginLeft: 1 }} />
        </div>
      </div>
      <div className="compact-tile-meta">
        <h4 className="compact-tile-title" title={song.title}>{song.title}</h4>
        <p className="compact-tile-artist" title={song.artist}>{song.artist}</p>
      </div>
      {showPlayBtn && (
        <button className="compact-tile-action-play" aria-label="Play song">
          <Play size={14} fill="#000000" color="#000000" style={{ marginLeft: 1 }} />
        </button>
      )}
    </motion.div>
  );
};

/* ========================================================
   3. SQUARE MINIMALIST CARD (Top Picks For You)
   Clean 146x146 square poster with sleek lime hover ring
   ======================================================== */
export interface SquareMusicCardProps {
  song: SongItem;
  queue?: SongItem[];
  onPlay: (song: SongItem, queue?: SongItem[]) => void;
}

export const SquareMusicCard: React.FC<SquareMusicCardProps> = ({
  song,
  queue,
  onPlay
}) => {
  return (
    <motion.div
      className="card-style-square"
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      onClick={() => onPlay(song, queue)}
    >
      <div className="square-art-wrap">
        <img
          src={song.image}
          alt={song.title}
          className="square-art-img"
          loading="lazy"
        />
        <div className="square-play-btn">
          <Play size={18} fill="#c8ff00" color="#c8ff00" style={{ marginLeft: 2 }} />
        </div>
      </div>
      <div className="square-meta">
        <h3 className="square-title" title={song.title}>{song.title}</h3>
        <p className="square-artist" title={song.artist}>{song.artist}</p>
      </div>
    </motion.div>
  );
};

/* ========================================================
   4. VINYL DISC RECORD CARD (Because You Listened)
   Realistic circular vinyl record disc sliding out of sleeve
   ======================================================== */
export interface VinylMusicCardProps {
  song: SongItem;
  queue?: SongItem[];
  onPlay: (song: SongItem, queue?: SongItem[]) => void;
}

export const VinylMusicCard: React.FC<VinylMusicCardProps> = ({
  song,
  queue,
  onPlay
}) => {
  return (
    <motion.div
      className="card-style-vinyl"
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      onClick={() => onPlay(song, queue)}
    >
      <div className="vinyl-art-wrapper">
        <div className="vinyl-record-disc">
          <div className="vinyl-groove-rings" />
          <div className="vinyl-center-hole" />
        </div>
        <img
          src={song.image}
          alt={song.title}
          className="vinyl-sleeve-img"
          loading="lazy"
        />
        <div className="vinyl-play-trigger">
          <Play size={18} fill="#ffffff" color="#ffffff" style={{ marginLeft: 2 }} />
        </div>
      </div>
      <div className="vinyl-meta">
        <h3 className="vinyl-title" title={song.title}>{song.title}</h3>
        <p className="vinyl-artist" title={song.artist}>{song.artist}</p>
      </div>
    </motion.div>
  );
};

/* ========================================================
   5. PANORAMA COLLECTION CARD (New Collection)
   Wide landscape card with duotone background & angled art
   ======================================================== */
export interface PanoramaCollectionItem {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  gradient: string;
  query: string;
}

export interface PanoramaCollectionCardProps {
  collection: PanoramaCollectionItem;
  onClick: (collection: PanoramaCollectionItem) => void;
}

export const PanoramaCollectionCard: React.FC<PanoramaCollectionCardProps> = ({
  collection,
  onClick
}) => {
  return (
    <div
      className="collection-wide-card"
      style={{ background: collection.gradient }}
      onClick={() => onClick(collection)}
    >
      <div className="collection-card-left">
        <h3 className="collection-card-title">{collection.title}</h3>
        <button className="collection-arrow-btn" aria-label="Explore collection">
          <ArrowRight size={17} />
        </button>
      </div>
      <div className="collection-card-right">
        {collection.image ? (
          <img src={collection.image} alt={collection.title} className="collection-artist-img" />
        ) : (
          <div className="collection-placeholder">
            <Sparkles size={24} style={{ opacity: 0.6 }} />
          </div>
        )}
      </div>
    </div>
  );
};

/* ========================================================
   6. AURA MUSIC CARD (Discover Weekly)
   Minimalist 146x146 square matching Movie Mode
   ======================================================== */
export interface AuraMusicCardProps {
  song: SongItem;
  queue?: SongItem[];
  onPlay: (song: SongItem, queue?: SongItem[]) => void;
}

export const AuraMusicCard: React.FC<AuraMusicCardProps> = ({
  song,
  queue,
  onPlay
}) => {
  return (
    <motion.div
      className="card-style-aura"
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      onClick={() => onPlay(song, queue)}
    >
      <div className="aura-art-wrap">
        <img
          src={song.image}
          alt={song.title}
          className="aura-art-img"
          loading="lazy"
        />
        <div className="aura-play-btn">
          <Play size={18} fill="#c8ff00" color="#c8ff00" style={{ marginLeft: 2 }} />
        </div>
      </div>
      <div className="aura-meta">
        <h3 className="aura-title" title={song.title}>{song.title}</h3>
        <p className="aura-artist" title={song.artist}>{song.artist}</p>
      </div>
    </motion.div>
  );
};

/* ========================================================
   7. CINEMATIC VIDEO CARD (Video Songs)
   16:9 widescreen video song card with cinematic overlay
   ======================================================== */
export interface CinematicVideoCardProps {
  song: SongItem;
  queue?: SongItem[];
  onPlay: (song: SongItem, queue?: SongItem[]) => void;
}

export const CinematicVideoCard: React.FC<CinematicVideoCardProps> = ({
  song,
  queue,
  onPlay
}) => {
  return (
    <div
      className="card-style-cinematic"
      onClick={() => onPlay(song, queue)}
    >
      <div className="cinematic-thumb-wrap">
        <img src={song.image} alt={song.title} className="cinematic-thumb-img" loading="lazy" />
        <div className="cinematic-play-overlay">
          <div className="cinematic-play-circle">
            <Play size={20} fill="#ffffff" color="#ffffff" style={{ marginLeft: 2 }} />
          </div>
        </div>
      </div>
      <div className="cinematic-meta">
        <h3 className="cinematic-title" title={song.title}>{song.title}</h3>
        <p className="cinematic-artist" title={song.artist}>{song.artist}</p>
      </div>
    </div>
  );
};

/* ========================================================
   8. PORTRAIT GLASS CARD (Secondary Language Melodies)
   Tall 4:5 vertical poster card with glass highlights
   ======================================================== */
export interface PortraitMusicCardProps {
  song: SongItem;
  queue?: SongItem[];
  onPlay: (song: SongItem, queue?: SongItem[]) => void;
}

export const PortraitMusicCard: React.FC<PortraitMusicCardProps> = ({
  song,
  queue,
  onPlay
}) => {
  return (
    <motion.div
      className="card-style-portrait"
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      onClick={() => onPlay(song, queue)}
    >
      <div className="portrait-art-wrap">
        <img src={song.image} alt={song.title} className="portrait-art-img" loading="lazy" />
        <div className="portrait-play-btn">
          <Play size={18} fill="#ffffff" color="#ffffff" style={{ marginLeft: 2 }} />
        </div>
      </div>
      <div className="portrait-meta">
        <h3 className="portrait-title" title={song.title}>{song.title}</h3>
        <p className="portrait-artist" title={song.artist}>{song.artist}</p>
      </div>
    </motion.div>
  );
};

/* ========================================================
   9. CURATED MUSIC CARD (Infinite Genre Batches)
   Square card with subtle accent color line
   ======================================================== */
export interface CuratedMusicCardProps {
  song: SongItem;
  queue?: SongItem[];
  onPlay: (song: SongItem, queue?: SongItem[]) => void;
}

export const CuratedMusicCard: React.FC<CuratedMusicCardProps> = ({
  song,
  queue,
  onPlay
}) => {
  return (
    <motion.div
      className="card-style-curated"
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      onClick={() => onPlay(song, queue)}
    >
      <div className="curated-art-wrap">
        <img src={song.image} alt={song.title} className="curated-art-img" loading="lazy" />
        <div className="curated-play-btn">
          <Play size={18} fill="#ffffff" color="#ffffff" style={{ marginLeft: 2 }} />
        </div>
      </div>
      <div className="curated-meta">
        <h3 className="curated-title" title={song.title}>{song.title}</h3>
        <p className="curated-artist" title={song.artist}>{song.artist}</p>
      </div>
    </motion.div>
  );
};
