import React, { useState, useEffect } from 'react';
import { OTTBrand, MovieItem } from '../types/media';
import { OTT_PLATFORMS, fetchByOTT } from '../services/movieService';
import { useNavigation } from '../context/NavigationContext';
import { MediaCard } from './MediaCard';

export const OTTView: React.FC = () => {
  const { selectedOTT, setSelectedOTT } = useNavigation();
  const [items, setItems] = useState<MovieItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadOTTContent(selectedOTT);
  }, [selectedOTT]);

  const loadOTTContent = async (brand: OTTBrand) => {
    setIsLoading(true);
    const results = await fetchByOTT(brand);
    setItems(results);
    setIsLoading(false);
  };

  const currentPlatform = OTT_PLATFORMS.find(p => p.brand === selectedOTT) || OTT_PLATFORMS[0];

  return (
    <div className="ott-view-container">
      {/* Brand Header */}
      <div
        className="ott-view-header"
        style={{
          borderBottomColor: currentPlatform.accentColor
        }}
      >
        <div
          className="ott-view-glow"
          style={{
            background: `radial-gradient(circle at top, ${currentPlatform.accentColor}22, transparent 80%)`
          }}
        />

        <div className="ott-brand-info">
          <span
            className="ott-brand-badge"
            style={{ backgroundColor: `${currentPlatform.accentColor}22`, color: currentPlatform.accentColor }}
          >
            {currentPlatform.logoText}
          </span>
          <h1 className="ott-brand-name">{currentPlatform.displayName} Originals & Catalog</h1>
          <p className="ott-brand-desc">{currentPlatform.tagline}</p>
        </div>

        {/* Brand Selector Tabs */}
        <div className="ott-tabs-scroll">
          {OTT_PLATFORMS.map(p => (
            <button
              key={p.brand}
              className={`ott-filter-tab ${selectedOTT === p.brand ? 'active' : ''}`}
              style={{
                borderColor: selectedOTT === p.brand ? p.accentColor : 'transparent',
                color: selectedOTT === p.brand ? p.accentColor : '#9ca3af'
              }}
              onClick={() => setSelectedOTT(p.brand)}
            >
              {p.displayName}
            </button>
          ))}
        </div>
      </div>

      {/* Media Grid */}
      <div className="ott-content-grid-wrapper">
        <div className="ott-grid-header">
          <h3 className="grid-heading">
            {selectedOTT === 'All' ? 'Combined Streaming Highlights' : `${selectedOTT} Featured Series & Movies`}
          </h3>
          <span className="grid-count">{items.length} Titles Found</span>
        </div>

        {isLoading ? (
          <div className="ott-loading">
            <div className="spinner" />
            <p>Scanning {selectedOTT} network catalog...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="ott-empty">
            <p>No titles currently loaded for {selectedOTT}. Switching to All OTTs...</p>
            <button className="ott-retry-btn" onClick={() => setSelectedOTT('All')}>
              Show All OTTs
            </button>
          </div>
        ) : (
          <div className="ott-media-grid">
            {items.map((item, idx) => (
              <MediaCard key={item.id || idx} item={item} rank={idx + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
