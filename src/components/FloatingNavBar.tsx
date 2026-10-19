import './FloatingNavBar.css';
import React from 'react';
import { motion } from 'framer-motion';
import { Home, Bookmark, ListMusic, Search, User, Music, Film } from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';

export const FloatingNavBar: React.FC = () => {
  const { appMode, setAppMode, activeScreen, setActiveScreen } = useNavigation();

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
          className={`floating-nav-btn ${activeScreen === 'search' ? 'active' : ''}`}
          onClick={() => setActiveScreen('search')}
          aria-label="Search"
          title="Search"
        >
          <Search size={21} />
          {activeScreen === 'search' && <span className="nav-glow-dot" />}
        </button>

        {/* 4. Profile Button */}
        <button
          className={`floating-nav-btn ${activeScreen === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveScreen('profile')}
          aria-label="Profile"
          title="Profile"
        >
          <User size={21} />
          {activeScreen === 'profile' && <span className="nav-glow-dot" />}
        </button>

        {/* 5. Mode Switch Button (Movies -> Music or Music -> Movies) */}
        {appMode === 'movies' ? (
          <button
            className="floating-nav-btn mode-switch-btn music-theme"
            onClick={() => {
              setAppMode('music');
              setActiveScreen('home');
            }}
            aria-label="Switch to Music Mode"
            title="Switch to Music"
          >
            <Music size={20} />
          </button>
        ) : (
          <button
            className="floating-nav-btn mode-switch-btn movie-theme"
            onClick={() => {
              setAppMode('movies');
              setActiveScreen('home');
            }}
            aria-label="Switch to Movies Mode"
            title="Switch to Movies"
          >
            <Film size={20} />
          </button>
        )}
      </motion.div>
    </div>
  );
};
