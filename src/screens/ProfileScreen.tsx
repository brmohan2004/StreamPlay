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
  Sparkles
} from 'lucide-react';
import { TopAppHeader } from '../components/TopAppHeader';
import { useMedia } from '../context/MediaContext';
import { useNavigation } from '../context/NavigationContext';

export const ProfileScreen: React.FC = () => {
  const { watchLater, primaryLanguage, setPrimaryLanguage, secondaryLanguage, setSecondaryLanguage } = useMedia();
  const { setActiveScreen } = useNavigation();

  // Settings State
  const [notifications, setNotifications] = useState(true);
  const [autoPlay, setAutoPlay] = useState(true);
  const [highBitrate, setHighBitrate] = useState(true);

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
