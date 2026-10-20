import './TopAppHeader.css';
import React from 'react';
import { ArrowLeft, Bookmark, ListMusic, User, Users } from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';
import { useMedia } from '../context/MediaContext';
import { useParty } from '../context/PartyContext';

interface TopAppHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  hideRightActions?: boolean;
}

export const TopAppHeader: React.FC<TopAppHeaderProps> = ({
  title,
  showBack,
  onBack,
  hideRightActions = false
}) => {
  const { appMode, activeScreen, setActiveScreen } = useNavigation();
  const { watchLater, playlists } = useMedia();
  const { isInParty, memberCount, openPartyModal } = useParty();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      setActiveScreen('home');
    }
  };

  return (
    <header className={`mobile-top-header ${appMode === 'music' ? 'music-mode-header' : 'movies-mode-header'}`}>
      <div className="header-left">
        {showBack ? (
          <button className="header-icon-btn back-btn" onClick={handleBack} aria-label="Go Back">
            <ArrowLeft size={22} />
          </button>
        ) : (
          <div className="header-brand" onClick={() => setActiveScreen('home')} title="StreamPlay Home">
            <img src="/StreamPlay.png" alt="StreamPlay Logo" className="header-brand-logo-img" />
            <span className="brand-title-text">StreamPlay</span>
          </div>
        )}

        {title && <h2 className="header-custom-title">{title}</h2>}
      </div>

      {!hideRightActions && (
        <div className="header-right">
          {/* Friends Mode (Watch & Listen with Friends) */}
          <button
            className={`header-action-btn party-header-btn ${isInParty ? 'active in-party' : ''}`}
            onClick={openPartyModal}
            aria-label="Friends Mode"
            title={isInParty ? `Party Room Active (${memberCount} connected)` : 'Friends Mode (Watch & Listen Together)'}
          >
            <Users size={18} />
            {isInParty && (
              <span className="header-badge lime-badge">{memberCount}</span>
            )}
            <span className="desktop-btn-label">Friends</span>
          </button>

          {appMode === 'movies' ? (
            /* Movie Mode: Watch Later + Profile at header right side */
            <>
              <button
                className={`header-action-btn ${activeScreen === 'watchlater' ? 'active' : ''}`}
                onClick={() => setActiveScreen('watchlater')}
                aria-label="Watch Later"
                title="Watch Later"
              >
                <Bookmark size={19} />
                {watchLater.length > 0 && (
                  <span className="header-badge cyan-badge">{watchLater.length}</span>
                )}
                <span className="desktop-btn-label">Watch Later</span>
              </button>

              <button
                className={`header-action-btn ${activeScreen === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveScreen('profile')}
                aria-label="Profile"
                title="Profile"
              >
                <User size={19} />
                <span className="desktop-btn-label">Profile</span>
              </button>
            </>
          ) : (
            /* Music Mode: Playlist + Profile at header right side */
            <>
              <button
                className={`header-action-btn ${activeScreen === 'playlist' ? 'active' : ''}`}
                onClick={() => setActiveScreen('playlist')}
                aria-label="Playlists"
                title="Playlists"
              >
                <ListMusic size={19} />
                {playlists.length > 0 && (
                  <span className="header-badge lime-badge">{playlists.length}</span>
                )}
                <span className="desktop-btn-label">Playlists</span>
              </button>

              <button
                className={`header-action-btn ${activeScreen === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveScreen('profile')}
                aria-label="Profile"
                title="Profile"
              >
                <User size={19} />
                <span className="desktop-btn-label">Profile</span>
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
};

