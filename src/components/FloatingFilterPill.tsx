import './FloatingFilterPill.css';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp } from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';

export const FloatingFilterPill: React.FC = () => {
  const {
    appMode,
    openFilterSheet,
    isFilterSheetOpen,
    setActiveCategory,
    activeCategory
  } = useNavigation();

  const [isScrolledPast50, setIsScrolledPast50] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setIsScrolledPast50(scrollY >= 50);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Show only after scrolling upward / down past 50px, and hide when filter sheet is open
  if (isFilterSheetOpen || !isScrolledPast50) return null;

  return (
    <AnimatePresence>
      <div className="floating-filter-pill-container">
        <motion.div
          className={`floating-filter-pill mode-${appMode}`}
          initial={{ y: 16, opacity: 0, scale: 0.92 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 16, opacity: 0, scale: 0.92 }}
          transition={{ type: 'spring', damping: 24, stiffness: 340 }}
          onClick={openFilterSheet}
          role="button"
          tabIndex={0}
          title="Open Filters & Categories"
        >
          {appMode === 'movies' ? (
            /* Movie Mode: TV | Movies | Sports / OTTs | ^ */
            <>
              <button
                type="button"
                className={`filter-pill-segment ${activeCategory === 'Series' ? 'active-seg' : ''}`}
                onClick={e => {
                  e.stopPropagation();
                  setActiveCategory(activeCategory === 'Series' ? 'All' : 'Series');
                }}
              >
                TV
              </button>

              <span className="pill-divider" />

              <button
                type="button"
                className={`filter-pill-segment ${activeCategory === 'Movies' ? 'active-seg' : ''}`}
                onClick={e => {
                  e.stopPropagation();
                  setActiveCategory(activeCategory === 'Movies' ? 'All' : 'Movies');
                }}
              >
                Movies
              </button>

              <span className="pill-divider" />

              <button
                type="button"
                className={`filter-pill-segment ${activeCategory === 'Sports' ? 'active-seg' : ''}`}
                onClick={e => {
                  e.stopPropagation();
                  setActiveCategory(activeCategory === 'Sports' ? 'All' : 'Sports');
                }}
              >
                Sports
              </button>

              <span className="pill-divider" />

              <button
                type="button"
                className="filter-pill-expand-btn"
                onClick={e => {
                  e.stopPropagation();
                  openFilterSheet();
                }}
                aria-label="Expand all filters sheet"
                title="Open all filters"
              >
                <ChevronUp size={14} strokeWidth={2.5} />
              </button>
            </>
          ) : (
            /* Music Mode: Tracks | Artists | Vibes | ^ */
            <>
              <button
                type="button"
                className={`filter-pill-segment ${activeCategory === 'Songs' ? 'active-seg-lime' : ''}`}
                onClick={e => {
                  e.stopPropagation();
                  setActiveCategory(activeCategory === 'Songs' ? 'All' : 'Songs');
                }}
              >
                Tracks
              </button>

              <span className="pill-divider" />

              <button
                type="button"
                className={`filter-pill-segment ${activeCategory === 'Artists' ? 'active-seg-lime' : ''}`}
                onClick={e => {
                  e.stopPropagation();
                  setActiveCategory(activeCategory === 'Artists' ? 'All' : 'Artists');
                }}
              >
                Artists
              </button>

              <span className="pill-divider" />

              <button
                type="button"
                className="filter-pill-segment"
                onClick={e => {
                  e.stopPropagation();
                  openFilterSheet();
                }}
              >
                Vibes
              </button>

              <span className="pill-divider" />

              <button
                type="button"
                className="filter-pill-expand-btn"
                onClick={e => {
                  e.stopPropagation();
                  openFilterSheet();
                }}
                aria-label="Expand all music filters sheet"
                title="Open all filters"
              >
                <ChevronUp size={14} strokeWidth={2.5} />
              </button>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
