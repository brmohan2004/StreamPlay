import './FloatingNavBar.css';
import React from 'react';
import { motion } from 'framer-motion';
import { Home, Search, Music, Film } from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';

export const FloatingNavBar: React.FC = () => {
  const {
    appMode,
    setAppMode,
    activeScreen,
    setActiveScreen
  } = useNavigation();

  const isSearchActive =
    activeScreen === 'search' ||
    activeScreen === 'movie-search' ||
    activeScreen === 'music-search';
  const isHomeActive = activeScreen === 'home';

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
        {/* 1. Home Button */}
        <button
          className={`floating-nav-btn ${isHomeActive ? 'active' : ''}`}
          onClick={() => setActiveScreen('home')}
          aria-label="Home"
          title="Home"
        >
          <Home size={22} />
          {isHomeActive && <span className="nav-glow-dot" />}
        </button>

        {/* 2. Movie and Music Switch (Center Circular Button) */}
        {appMode === 'movies' ? (
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

