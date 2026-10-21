import './TopAppHeader.css';
import React from 'react';
import { ArrowLeft, Bookmark, ListMusic, User, Users, Film, Headphones } from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';
import { useMedia } from '../context/MediaContext';
import { useParty } from '../context/PartyContext';

interface TopAppHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  hideRightActions?: boolean;
}

/**
 * TopAppHeader
 * Replaces the old rectangular header bar with modern Floating Glass Buttons.
 * Screen background ambient theme gradients flow completely behind without any solid header barrier.
 */
export const TopAppHeader: React.FC<TopAppHeaderProps> = ({
  title,
  showBack,
  onBack,
  hideRightActions = false
}) => {
  const { appMode, activeScreen, setActiveScreen } = useNavigation();
  const { watchLater, playlists } = useMedia();
  const { isInParty, memberCount, openPartyModal } = useParty();

  // Mode home page check: Only home page without a custom subpage title
  const isModeHomePage = activeScreen === 'home' && !title;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      setActiveScreen('home');
    }
  };

  return (
    <div className="mobile-floating-top-bar" role="navigation" aria-label="Top Navigation">
      {/* Left Floating Section */}
      <div className="floating-bar-left">
        {showBack ? (
          <button
            type="button"
            className="floating-circle-btn back-btn"
            onClick={handleBack}
            aria-label="Go Back"
            title="Go Back"
          >
            <ArrowLeft size={20} />
          </button>
        ) : isModeHomePage ? (
          /* Mode Home: Floating Glass Brand Capsule with Mode Badge */
          <div
            className="floating-brand-pill"
            onClick={() => setActiveScreen('home')}
            title="StreamPlay Home"
            role="button"
            tabIndex={0}
          >
            <img src="/StreamPlay.png" alt="StreamPlay Logo" className="floating-brand-logo" />
            <div className={`header-mode-badge mode-${appMode}`}>
              <span className="mode-badge-glow" />
              {appMode === 'movies' ? (
                <>
                  <Film size={11} className="mode-badge-icon cyan-icon" />
                  <span className="mode-badge-name">CINEMA MAX</span>
                </>
              ) : (
                <>
                  <Headphones size={11} className="mode-badge-icon lime-icon" />
                  <span className="mode-badge-name">SOUND WAVE</span>
                </>
              )}
            </div>
          </div>
        ) : (
          /* Subpage without explicit back button: Floating Circular Back Button */
          <button
            type="button"
            className="floating-circle-btn back-btn"
            onClick={handleBack}
            aria-label="Go Back"
            title="Go Back"
          >
            <ArrowLeft size={20} />
          </button>
        )}

        {/* Floating Glass Title Pill on Subpages */}
        {title && <span className="floating-title-pill">{title}</span>}
      </div>

      {/* Right Floating Section */}
      {!hideRightActions && (
        <div className="floating-bar-right">
          {/* Friends Mode Floating Circle Button */}
          <button
            type="button"
            className={`floating-circle-btn party-btn ${isInParty ? 'active in-party' : ''}`}
            onClick={openPartyModal}
            aria-label="Friends Mode"
            title={isInParty ? `Party Room Active (${memberCount} connected)` : 'Friends Mode (Watch & Listen Together)'}
          >
            <Users size={19} />
            {isInParty && (
              <span className="floating-badge lime-badge">{memberCount}</span>
            )}
          </button>

          {appMode === 'movies' ? (
            /* Movie Mode: Watch Later + Profile Floating Buttons */
            <>
              <button
                type="button"
                className={`floating-circle-btn ${activeScreen === 'watchlater' ? 'active' : ''}`}
                onClick={() => setActiveScreen('watchlater')}
                aria-label="Watch Later"
                title="Watch Later"
              >
                <Bookmark size={19} />
                {watchLater.length > 0 && (
                  <span className="floating-badge cyan-badge">{watchLater.length}</span>
                )}
              </button>

              <button
                type="button"
                className={`floating-circle-btn ${activeScreen === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveScreen('profile')}
                aria-label="Profile"
                title="Profile & Preferences"
              >
                <User size={19} />
              </button>
            </>
          ) : (
            /* Music Mode: Playlists + Profile Floating Buttons */
            <>
              <button
                type="button"
                className={`floating-circle-btn ${activeScreen === 'playlist' ? 'active' : ''}`}
                onClick={() => setActiveScreen('playlist')}
                aria-label="Playlists"
                title="Your Playlists"
              >
                <ListMusic size={19} />
                {playlists.length > 0 && (
                  <span className="floating-badge lime-badge">{playlists.length}</span>
                )}
              </button>

              <button
                type="button"
                className={`floating-circle-btn ${activeScreen === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveScreen('profile')}
                aria-label="Profile"
                title="Profile & Preferences"
              >
                <User size={19} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TopAppHeader;
