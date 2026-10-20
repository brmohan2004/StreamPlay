import './FloatingNavBar.css';
import React from 'react';
import { motion } from 'framer-motion';
import { Home, Search, Music, Film, RotateCcw } from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';

export const FloatingNavBar: React.FC = () => {
  const {
    appMode,
    setAppMode,
    activeScreen,
    setActiveScreen,
    selectedOTT,
    setSelectedOTT,
    activeCategory,
    setActiveCategory,
    selectedLanguage,
    setSelectedLanguage
  } = useNavigation();

  // Hide on Movie Details Screen (full-bleed immersive details view)
  if (activeScreen === 'details') {
    return null;
  }

  const isSearchActive =
    activeScreen === 'search' ||
    activeScreen === 'movie-search' ||
    activeScreen === 'music-search';
  const isHomeActive = activeScreen === 'home';

  // Check if any filter (OTT, TV/category, or regional language) is currently active
  const isFiltered =
    selectedOTT !== 'All' ||
    activeCategory !== 'All' ||
    selectedLanguage !== 'All';

  const handleResetFiltersAndGoHome = () => {
    setSelectedOTT('All');
    setActiveCategory('All');
    setSelectedLanguage('All');
    setActiveScreen('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleModeSwitch = () => {
    if (appMode === 'movies') {
      setAppMode('music');
      if (isSearchActive) {
        setActiveScreen('music-search');
      }
    } else {
      setAppMode('movies');
      if (isSearchActive) {
        setActiveScreen('movie-search');
      }
    }
  };

  const handleSearchClick = () => {
    if (appMode === 'movies') {
      setActiveScreen('movie-search');
    } else {
      setActiveScreen('music-search');
    }
  };

  return (
    <div className="floating-navbar-container">
      <motion.div
        className="floating-navbar-pill"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 280 }}
      >
        {/* 1. Home Button (Resets any active filters and navigates to clean Home) */}
        <button
          className={`floating-nav-btn ${isHomeActive && !isFiltered ? 'active' : ''}`}
          onClick={handleResetFiltersAndGoHome}
          aria-label="Home"
          title="Home (All Movies & TV Shows)"
        >
          <Home size={22} />
          {isHomeActive && !isFiltered && <span className="nav-glow-dot" />}
        </button>

        {/* 2. Center Button: Changes to Exit button when any filter/OTT/TV is active, otherwise Mode Switch */}
        {isFiltered ? (
          <motion.button
            className="floating-nav-btn big-circular-mode-btn exit-ott-mode-btn"
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleResetFiltersAndGoHome}
            aria-label="Exit Filter"
            title={
              selectedOTT !== 'All'
                ? `Exit ${selectedOTT} & Return to Home`
                : activeCategory !== 'All'
                ? `Exit ${activeCategory === 'Series' ? 'TV' : activeCategory} & Return to Home`
                : `Exit ${selectedLanguage} & Return to Home`
            }
          >
            <RotateCcw size={21} strokeWidth={2.6} />
            <span className="mode-btn-glow-ring ott-exit-ring" />
          </motion.button>
        ) : appMode === 'movies' ? (
          <motion.button
            className="floating-nav-btn big-circular-mode-btn to-music"
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleModeSwitch}
            aria-label="Switch to Music Mode"
            title="Switch to Music Mode"
          >
            <Music size={22} strokeWidth={2.4} />
            <span className="mode-btn-glow-ring" />
          </motion.button>
        ) : (
          <motion.button
            className="floating-nav-btn big-circular-mode-btn to-movies"
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleModeSwitch}
            aria-label="Switch to Movies Mode"
            title="Switch to Movies Mode"
          >
            <Film size={22} strokeWidth={2.4} />
            <span className="mode-btn-glow-ring" />
          </motion.button>
        )}

        {/* 3. Search Button */}
        <button
          className={`floating-nav-btn ${isSearchActive ? 'active' : ''}`}
          onClick={handleSearchClick}
          aria-label={appMode === 'movies' ? 'Movie Search' : 'Music Search'}
          title={appMode === 'movies' ? 'Movie Search' : 'Music Search'}
        >
          <Search size={22} />
          {isSearchActive && <span className="nav-glow-dot" />}
        </button>
      </motion.div>
    </div>
  );
};

