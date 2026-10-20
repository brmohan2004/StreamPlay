import './ProfileScreen.css';
import React, { useState } from 'react';
import {
  Bookmark,
  Bell,
  Globe,
  Sliders,
  Check,
  Shield,
  Smartphone,
  ChevronRight,
  Sparkles,
  RotateCcw,
  Gift,
  Cpu
} from 'lucide-react';
import { TopAppHeader } from '../components/TopAppHeader';
import { useMedia } from '../context/MediaContext';
import { useNavigation } from '../context/NavigationContext';
import { getProfile, getTopGenres, getTopArtists, resetProfile } from '../services/recommendationTracker';

export const ProfileScreen: React.FC = () => {
  const { watchLater, primaryLanguage, setPrimaryLanguage, secondaryLanguage, setSecondaryLanguage } = useMedia();
  const { setActiveScreen } = useNavigation();

  // Settings State
  const [notifications, setNotifications] = useState(true);
  const [autoPlay, setAutoPlay] = useState(true);
  const [highBitrate, setHighBitrate] = useState(true);
  const [recResetSuccess, setRecResetSuccess] = useState(false);
  const [recProfile, setRecProfile] = useState(() => getProfile());

  const handleResetRecommendations = () => {
    resetProfile();
    setRecProfile(getProfile());
    setRecResetSuccess(true);
    window.dispatchEvent(new CustomEvent('streamplay-rec-update'));
    setTimeout(() => setRecResetSuccess(false), 3000);
  };

  const topGenres = getTopGenres(3);
  const topArtists = getTopArtists(3);

  const availableLanguages = [
    'Tamil',
    'Hindi',
    'Telugu',
    'English',
    'Malayalam',
    'Kannada',
    'Bengali',
    'Punjabi',
    'Korean',
    'Japanese'
  ];

  return (
    <div className="profile-screen-container">
      {/* Header: Back button (left), Watch Later logo (right) */}
      <TopAppHeader showBack title="Profile & Preferences" />

      <div className="profile-scroll-body">
        {/* User Card */}
        <div className="profile-user-card">
          <div className="avatar-wrap">
            <div className="avatar-ring">
              <span className="avatar-initials">SP</span>
            </div>
            <div className="online-badge" />
          </div>

          <div className="user-meta-details">
            <h2 className="user-name">StreamPlay User</h2>
            <p className="user-email">guest.streamplay@local.app</p>
            <div className="membership-pill">
              <Sparkles size={14} />
              <span>Free VIP Access</span>
            </div>
          </div>
        </div>

        {/* Quick Watch Later Bar */}
        <div className="profile-quick-action" onClick={() => setActiveScreen('watchlater')}>
          <div className="action-left">
            <div className="action-icon-wrap gold">
              <Bookmark size={20} />
            </div>
            <div>
              <h4 className="action-title">Watch Later Library</h4>
              <p className="action-sub">{watchLater.length} saved movies & shows</p>
            </div>
          </div>
          <ChevronRight size={18} className="chevron-muted" />
        </div>

        {/* Settings Section */}
        <div className="profile-settings-group">
          <h3 className="group-heading">Content Language Preferences</h3>

          {/* Primary Language */}
          <div className="settings-card">
            <div className="card-top-row">
              <Globe size={18} className="text-lime" />
              <span className="card-title">Primary Language (Top Feeds)</span>
            </div>
            <div className="languages-pill-grid">
              {availableLanguages.map(lang => {
                const isSelected = primaryLanguage === lang;
                return (
                  <button
                    key={`prim-${lang}`}
                    className={`lang-pill ${isSelected ? 'selected' : ''}`}
                    onClick={() => setPrimaryLanguage(lang)}
                  >
                    {isSelected && <Check size={14} />}
                    <span>{lang}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Secondary Language */}
          <div className="settings-card">
            <div className="card-top-row">
              <Globe size={18} className="text-cyan" />
              <span className="card-title">Secondary Language (Featured Melodies)</span>
            </div>
            <div className="languages-pill-grid">
              {availableLanguages.map(lang => {
                const isSelected = secondaryLanguage === lang;
                return (
                  <button
                    key={`sec-${lang}`}
                    className={`lang-pill ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSecondaryLanguage(lang)}
                  >
                    {isSelected && <Check size={14} />}
                    <span>{lang}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <h3 className="group-heading">Playback & App Experience</h3>

          {/* Notifications Toggle */}
          <div className="settings-toggle-row">
            <div className="toggle-label-wrap">
              <Bell size={18} className="text-neon" />
              <div>
                <span className="toggle-title">New Releases & OTT Updates</span>
                <span className="toggle-sub">Notify when new movies drop on Netflix / Hotstar</span>
              </div>
            </div>
            <label className="switch-toggle">
              <input
                type="checkbox"
                checked={notifications}
                onChange={e => setNotifications(e.target.checked)}
              />
              <span className="slider-round" />
            </label>
          </div>

          {/* High Quality Audio Toggle */}
          <div className="settings-toggle-row">
            <div className="toggle-label-wrap">
              <Sliders size={18} className="text-cyan" />
              <div>
                <span className="toggle-title">Ultra HD 320kbps Audio</span>
                <span className="toggle-sub">Stream uncompressed CD-quality music</span>
              </div>
            </div>
            <label className="switch-toggle">
              <input
                type="checkbox"
                checked={highBitrate}
                onChange={e => setHighBitrate(e.target.checked)}
              />
              <span className="slider-round" />
            </label>
          </div>

          {/* Auto Play Next */}
          <div className="settings-toggle-row">
            <div className="toggle-label-wrap">
              <Smartphone size={18} />
              <div>
                <span className="toggle-title">Auto-Play Next Track</span>
                <span className="toggle-sub">Seamless infinite background queue</span>
              </div>
            </div>
            <label className="switch-toggle">
              <input
                type="checkbox"
                checked={autoPlay}
                onChange={e => setAutoPlay(e.target.checked)}
              />
              <span className="slider-round" />
            </label>
          </div>

          <h3 className="group-heading">AI Recommendation Profile</h3>

          {/* AI Recommendation Engine Card */}
          <div className="rec-profile-card">
            <div className="rec-profile-head">
              <div className="rec-profile-title">
                <Cpu size={18} className="text-cyan" />
                <span>Smart Taste Profile</span>
              </div>
              <span className="rec-free-pill">100% FREE</span>
            </div>

            <div className="rec-stat-grid">
              <div className="rec-stat-box">
                <span className="rec-stat-label">Top Genres</span>
                <span className="rec-stat-val" title={topGenres.join(', ')}>
                  {topGenres.length > 0 ? topGenres.join(', ') : 'Learning tastes'}
                </span>
              </div>

              <div className="rec-stat-box">
                <span className="rec-stat-label">Top Artists</span>
                <span className="rec-stat-val" title={topArtists.join(', ')}>
                  {topArtists.length > 0 ? topArtists.join(', ') : 'Learning artists'}
                </span>
              </div>

              <div className="rec-stat-box">
                <span className="rec-stat-label">Taste Signals Logged</span>
                <span className="rec-stat-val">
                  {recProfile.totalInteractions} interactions
                </span>
              </div>

              <div className="rec-stat-box">
                <span className="rec-stat-label">Storage & Privacy</span>
                <span className="rec-stat-val" style={{ color: '#c8ff00' }}>
                  Local Device Only
                </span>
              </div>
            </div>

            <button className="rec-reset-btn" onClick={handleResetRecommendations}>
              <RotateCcw size={14} />
              <span>{recResetSuccess ? 'Profile Reset Complete!' : 'Reset Taste History'}</span>
            </button>
          </div>

          {/* 100% Free Guarantee Banner */}
          <div className="free-guarantee-card">
            <Gift size={22} className="free-guarantee-icon" />
            <div className="free-guarantee-text">
              <h4>StreamPlay Free Forever</h4>
              <p>
                All movies, web series, songs, and 4K music videos are completely free. No subscriptions, no hidden paywalls, and no payment required ever.
              </p>
            </div>
          </div>

          {/* System & Privacy Details */}
          <div className="app-info-panel">
            <div className="info-row">
              <Shield size={16} />
              <span>Zero-Tracker Privacy Protection Active</span>
            </div>
            <p className="version-tag">StreamPlay Mobile Edition v2.0 • Pure Black OLED Theme</p>
          </div>
        </div>
      </div>
    </div>
  );
};
