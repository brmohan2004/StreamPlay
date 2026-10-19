import './FloatingNavBar.css';
import React from 'react';
import { motion } from 'framer-motion';
import { Home, Bookmark, ListMusic, Search, User, Music, Film } from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';

export const FloatingNavBar: React.FC = () => {
  const { appMode, setAppMode, activeScreen, setActiveScreen } = useNavigation();

  // Hide bottom nav bar on search screen and profile screen
  if (activeScreen === 'search' || activeScreen === 'profile') {
    return null;
  }

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
          className={`floating-nav-btn ${activeScreen === 'home' ? 'active' : ''}`}
          onClick={() => setActiveScreen('home')}
          aria-label="Home"
          title="Home"
        >
          <Home size={21} />
          {activeScreen === 'home' && <span className="nav-glow-dot" />}
        </button>

        {/* 2. Saved (Movies mode) OR Playlist (Music mode) */}
        {appMode === 'movies' ? (
          <button
            className={`floating-nav-btn ${activeScreen === 'watchlater' ? 'active' : ''}`}
            onClick={() => setActiveScreen('watchlater')}
            aria-label="Saved Watch Later"
            title="Saved"
          >
            <Bookmark size={21} />
            {activeScreen === 'watchlater' && <span className="nav-glow-dot" />}
          </button>
        ) : (
          <button
            className={`floating-nav-btn ${activeScreen === 'playlist' ? 'active' : ''}`}
            onClick={() => setActiveScreen('playlist')}
            aria-label="Playlists"
            title="Playlists"
          >
            <ListMusic size={21} />
            {activeScreen === 'playlist' && <span className="nav-glow-dot" />}
          </button>
        )}

        {/* 3. Search Button */}
        <button
          className="floating-nav-btn"
          onClick={() => setActiveScreen('search')}
          aria-label="Search"
          title="Search"
        >
          <Search size={21} />
        </button>

        {/* 4. Profile Button */}
        <button
          className="floating-nav-btn"
          onClick={() => setActiveScreen('profile')}
          aria-label="Profile"
          title="Profile"
        >
          <User size={21} />
        </button>

        {/* 5. Big Size Circular Mode Switch Button */}
        {appMode === 'movies' ? (
          <motion.button
            className="floating-nav-btn big-circular-mode-btn to-music"
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              setAppMode('music');
              setActiveScreen('home');
            }}
            aria-label="Switch to Music Mode"
            title="Switch to Music Mode"
          >
            <Music size={23} strokeWidth={2.4} />
            <span className="mode-btn-glow-ring" />
          </motion.button>
        ) : (
          <motion.button
            className="floating-nav-btn big-circular-mode-btn to-movies"
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              setAppMode('movies');
              setActiveScreen('home');
            }}
            aria-label="Switch to Movies Mode"
            title="Switch to Movies Mode"
          >
            <Film size={23} strokeWidth={2.4} />
            <span className="mode-btn-glow-ring" />
          </motion.button>
        )}
      </motion.div>
    </div>
  );
};

