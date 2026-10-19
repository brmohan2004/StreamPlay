import React from 'react';
import { motion } from 'framer-motion';
import { OTT_PLATFORMS } from '../services/movieService';
import { OTTBrand } from '../types/media';
import { useNavigation } from '../context/NavigationContext';

export const OTTSelector: React.FC = () => {
  const { selectedOTT, setSelectedOTT, setActiveScreen } = useNavigation();

  const handleSelect = (brand: OTTBrand) => {
    setSelectedOTT(brand);
    setActiveScreen('home');
  };

  return (
    <div className="ott-selector-section">
      <div className="section-header">
        <h3 className="section-title">Stream by OTT Networks</h3>
        <span className="section-caption">Explore direct content catalogs</span>
      </div>

      <div className="ott-brands-grid">
        {OTT_PLATFORMS.map(platform => {
          const isSelected = selectedOTT === platform.brand;
          return (
            <motion.div
              key={platform.brand}
              className={`ott-brand-card ${isSelected ? 'active' : ''}`}
              whileHover={{ scale: 1.06, y: -4 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleSelect(platform.brand)}
              style={{
                borderColor: isSelected ? platform.accentColor : 'rgba(255, 255, 255, 0.08)'
              }}
            >
              <div
                className="ott-card-glow"
                style={{
                  background: `radial-gradient(circle at center, ${platform.accentColor}33, transparent 70%)`
                }}
              />
              <span className="ott-logo-text" style={{ color: platform.accentColor }}>
                {platform.logoText}
              </span>
              <span className="ott-sub">{platform.displayName}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
