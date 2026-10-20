import React from 'react';
import './SkeletonLoader.css';

/* -------------------------------------------------------------------------
   1. MOVIE COMPONENTS & HOME SKELETON
   ------------------------------------------------------------------------- */
export const SkeletonCard: React.FC = () => {
  return (
    <div className="skeleton-media-card">
      <div className="skeleton-card-poster skeleton-shimmer-base" />
      <div className="skeleton-card-title skeleton-shimmer-base" />
      <div className="skeleton-card-sub skeleton-shimmer-base" />
    </div>
  );
};

interface SkeletonRowProps {
  cardCount?: number;
  titleWidth?: number;
}

export const SkeletonRow: React.FC<SkeletonRowProps> = ({ cardCount = 6, titleWidth = 180 }) => {
  return (
    <div className="skeleton-row-container">
      <div className="skeleton-row-header">
        <div className="skeleton-row-title skeleton-shimmer-base" style={{ width: titleWidth }} />
        <div className="skeleton-row-subtitle skeleton-shimmer-base" />
      </div>
      <div className="skeleton-row-cards-track">
        {Array.from({ length: cardCount }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
};

export const SkeletonHero: React.FC = () => {
  return (
    <div className="skeleton-hero-deck">
      <div className="skeleton-hero-card card-back-left skeleton-shimmer-base" />
      <div className="skeleton-hero-card card-front-center skeleton-shimmer-base" />
      <div className="skeleton-hero-card card-back-right skeleton-shimmer-base" />
    </div>
  );
};

export const SkeletonHome: React.FC = () => {
  return (
    <div className="skeleton-home-container">
      {/* Category Capsules Placeholder */}
      <div className="skeleton-pills-row">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton-pill-item skeleton-shimmer-base" />
        ))}
      </div>

      {/* Hero Fanned Deck Placeholder */}
      <SkeletonHero />

      {/* Content Rows Placeholders */}
      <SkeletonRow cardCount={6} titleWidth={200} />
      <SkeletonRow cardCount={6} titleWidth={160} />
      <SkeletonRow cardCount={6} titleWidth={220} />
    </div>
  );
};

/* -------------------------------------------------------------------------
   2. MUSIC COMPONENTS & HOME SKELETON
   ------------------------------------------------------------------------- */
export const SkeletonMusicCard: React.FC = () => {
  return (
    <div className="skeleton-music-card">
      <div className="skeleton-music-cover skeleton-shimmer-base" />
      <div className="skeleton-card-title skeleton-shimmer-base" style={{ width: '85%' }} />
      <div className="skeleton-card-sub skeleton-shimmer-base" style={{ width: '55%' }} />
    </div>
  );
};

export const SkeletonMusicRow: React.FC<SkeletonRowProps> = ({ cardCount = 6, titleWidth = 190 }) => {
  return (
    <div className="skeleton-music-row-container">
      <div className="skeleton-row-header">
        <div className="skeleton-row-title skeleton-shimmer-base" style={{ width: titleWidth }} />
        <div className="skeleton-row-subtitle skeleton-shimmer-base" />
      </div>
      <div className="skeleton-row-cards-track">
        {Array.from({ length: cardCount }).map((_, i) => (
          <SkeletonMusicCard key={i} />
        ))}
      </div>
    </div>
  );
};

export const SkeletonMusicHome: React.FC = () => {
  return (
    <div className="skeleton-music-home-container">
      {/* Music Hero Stacked Deck Placeholder */}
      <div className="skeleton-music-hero">
        <div className="skeleton-music-hero-card left skeleton-shimmer-base" />
        <div className="skeleton-music-hero-card center skeleton-shimmer-base" />
        <div className="skeleton-music-hero-card right skeleton-shimmer-base" />
      </div>

      {/* Music Content Rows */}
      <SkeletonMusicRow cardCount={6} titleWidth={210} />
      <SkeletonMusicRow cardCount={6} titleWidth={170} />
      <SkeletonMusicRow cardCount={6} titleWidth={230} />
    </div>
  );
};

/* -------------------------------------------------------------------------
   3. SEARCH RESULTS SKELETONS (GRID & TRACK LIST)
   ------------------------------------------------------------------------- */
export const SkeletonGrid: React.FC<{ count?: number }> = ({ count = 8 }) => {
  return (
    <div className="skeleton-grid-container">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-grid-card">
          <div className="skeleton-card-poster skeleton-shimmer-base" />
          <div className="skeleton-card-title skeleton-shimmer-base" />
          <div className="skeleton-card-sub skeleton-shimmer-base" />
        </div>
      ))}
    </div>
  );
};

export const SkeletonTrackList: React.FC<{ count?: number }> = ({ count = 8 }) => {
  return (
    <div className="skeleton-tracklist-container">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-track-row">
          <div className="skeleton-track-thumb skeleton-shimmer-base" />
          <div className="skeleton-track-meta">
            <div className="skeleton-track-title skeleton-shimmer-base" />
            <div className="skeleton-track-artist skeleton-shimmer-base" />
          </div>
          <div className="skeleton-track-dur skeleton-shimmer-base" />
        </div>
      ))}
    </div>
  );
};

/* -------------------------------------------------------------------------
   4. MOVIE DETAILS SCREEN SKELETON
   ------------------------------------------------------------------------- */
export const SkeletonDetails: React.FC = () => {
  return (
    <div className="skeleton-details-container">
      {/* Hero Backdrop */}
      <div className="skeleton-details-backdrop skeleton-shimmer-base" />

      {/* Content Details */}
      <div className="skeleton-details-content">
        <div className="skeleton-details-title skeleton-shimmer-base" />

        <div className="skeleton-details-badges">
          <div className="skeleton-details-badge skeleton-shimmer-base" />
          <div className="skeleton-details-badge skeleton-shimmer-base" />
          <div className="skeleton-details-badge skeleton-shimmer-base" />
        </div>

        <div className="skeleton-details-actions">
          <div className="skeleton-details-playbtn skeleton-shimmer-base" />
          <div className="skeleton-details-iconbtn skeleton-shimmer-base" />
          <div className="skeleton-details-iconbtn skeleton-shimmer-base" />
        </div>

        <div className="skeleton-details-synopsis">
          <div className="skeleton-details-textline skeleton-shimmer-base" />
          <div className="skeleton-details-textline skeleton-shimmer-base" />
          <div className="skeleton-details-textline short skeleton-shimmer-base" />
        </div>

        {/* Cast circles */}
        <div className="skeleton-cast-row">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton-cast-circle skeleton-shimmer-base" />
          ))}
        </div>

        {/* Similar recommendations */}
        <SkeletonRow cardCount={5} titleWidth={220} />
      </div>
    </div>
  );
};
