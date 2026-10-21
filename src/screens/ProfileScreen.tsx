import React, { useState } from 'react';
import {
  Film,
  Music,
  Check,
  Globe,
  MapPin,
  Trash2,
  Bell,
  Sparkles,
  Zap,
  Bookmark,
  ListMusic,
  CheckCircle2,
  RefreshCw,
  Volume2,
  Tv,
  HardDrive
} from 'lucide-react';
import { TopAppHeader } from '../components/TopAppHeader';
import { useMedia } from '../context/MediaContext';
import { useNavigation, AppMode } from '../context/NavigationContext';
import { SUPPORTED_LOCATIONS, prefetchLocationImage } from '../services/locationService';
import { OTTBrand } from '../types/media';
import { AudioQualitySetting } from '../services/musicService';
import './ProfileScreen.css';

interface ProfileScreenProps {
  onOpenOnboarding?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onOpenOnboarding }) => {
  const {
    watchLater,
    playlists,
    likedSongs,
    primaryLanguage,
    setPrimaryLanguage,
    secondaryLanguage,
    setSecondaryLanguage,
    userLocation,
    changeUserLocation,
    videoQuality,
    setVideoQuality,
    defaultLaunchMode,
    setDefaultLaunchMode,
    audioQuality,
    setAudioQuality,
    playbackMode,
    setPlaybackMode,
    videoProviderIndex,
    setVideoProviderIndex
  } = useMedia();

  const { setActiveScreen, setAppMode, selectedOTT, setSelectedOTT } = useNavigation();

  // Active Category Tab: 'common' | 'movies' | 'music'
  const [activeTab, setActiveTab] = useState<'common' | 'movies' | 'music'>('common');

  // Common Settings State
  const [notifications, setNotifications] = useState<boolean>(() => {
    return localStorage.getItem('streamplay_setting_notifications') !== 'false';
  });

  // Movie Settings State
  const [autoPlayEpisode, setAutoPlayEpisode] = useState<boolean>(() => {
    return localStorage.getItem('streamplay_setting_autoplay_episode') !== 'false';
  });

  const [subtitlePref, setSubtitlePref] = useState<string>(() => {
    return localStorage.getItem('streamplay_setting_subtitles') || 'auto';
  });

  // Music Settings State
  const [eqPreset, setEqPreset] = useState<string>(() => {
    return localStorage.getItem('streamplay_setting_eq_preset') || 'balanced';
  });

  const [gaplessPlayback, setGaplessPlayback] = useState<boolean>(() => {
    return localStorage.getItem('streamplay_setting_gapless') !== 'false';
  });

  const [infiniteRadio, setInfiniteRadio] = useState<boolean>(() => {
    return localStorage.getItem('streamplay_setting_infinite_radio') !== 'false';
  });

  // Storage dialog states
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2400);
  };

  const handleLaunchModeChange = (mode: AppMode) => {
    setDefaultLaunchMode(mode);
    setAppMode(mode);
    showToast(`Default launch mode: ${mode === 'movies' ? 'Movies & Series' : 'Music & Audio'}`);
  };

  const handleLocationChange = (locId: string) => {
    changeUserLocation(locId);
    const loc = SUPPORTED_LOCATIONS.find(l => l.id === locId);
    if (loc) {
      prefetchLocationImage(loc.image);
      showToast(`Hub updated: ${loc.name} (${loc.cinemaHub})`);
    }
  };

  const handleNotificationsToggle = (val: boolean) => {
    setNotifications(val);
    localStorage.setItem('streamplay_setting_notifications', String(val));
    showToast(val ? 'Release alerts enabled' : 'Release alerts disabled');
  };

  const handleAutoPlayEpisodeToggle = (val: boolean) => {
    setAutoPlayEpisode(val);
    localStorage.setItem('streamplay_setting_autoplay_episode', String(val));
    showToast(`Episode auto-play ${val ? 'enabled' : 'disabled'}`);
  };

  const handleSubtitleChange = (pref: string) => {
    setSubtitlePref(pref);
    localStorage.setItem('streamplay_setting_subtitles', pref);
    showToast(`Subtitles: ${pref.toUpperCase()}`);
  };

  const handleEqPresetChange = (preset: string) => {
    setEqPreset(preset);
    localStorage.setItem('streamplay_setting_eq_preset', preset);
    showToast(`Equalizer: ${preset.toUpperCase()}`);
  };

  const handleGaplessToggle = (val: boolean) => {
    setGaplessPlayback(val);
    localStorage.setItem('streamplay_setting_gapless', String(val));
    showToast(`Gapless audio preloading ${val ? 'enabled' : 'disabled'}`);
  };

  const handleInfiniteRadioToggle = (val: boolean) => {
    setInfiniteRadio(val);
    localStorage.setItem('streamplay_setting_infinite_radio', String(val));
    showToast(`Infinite radio ${val ? 'enabled' : 'disabled'}`);
  };

  const handleClearAppCache = () => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('streamplay_cached_') || k.startsWith('cinemeta_') || k.startsWith('saavn_'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      sessionStorage.clear();
      showToast('Cache & buffers cleared');
    } catch {
      showToast('Cache cleared');
    }
  };

  const handleFactoryReset = () => {
    setIsResetting(true);
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const AVAILABLE_LANGUAGES = [
    'Tamil',
    'Hindi',
    'Telugu',
    'English',
    'Malayalam',
    'Kannada',
    'Punjabi',
    'Bengali'
  ];

  const OTT_PLATFORMS_LIST: OTTBrand[] = [
    'All',
    'Netflix',
    'JioHotstar',
    'Prime Video',
    'Apple TV+',
    'Sony LIV',
    'Zee5'
  ];

  return (
    <div className="profile-screen-container">
      <TopAppHeader showBack title="Settings & Engine" />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="settings-toast-banner animate-slide-down">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="profile-scroll-body">
        {/* ─────────────────────────────────────────────────────────────
            VISUAL HERO STATUS BANNER (Visuals Heavy)
        ───────────────────────────────────────────────────────────── */}
        <div className="profile-visual-hero-banner">
          <img
            src={userLocation.image}
            alt={userLocation.name}
            className="hero-banner-backdrop"
          />
          <div className="hero-banner-gradient-mask" />

          <div className="hero-banner-content">
            <div className="hero-badges-top">
              <span className="hero-hub-badge">
                <MapPin size={12} />
                <span>{userLocation.name} • {userLocation.cinemaHub}</span>
              </span>
              <span className={`hero-mode-badge ${defaultLaunchMode}`}>
                {defaultLaunchMode === 'movies' ? <Film size={12} /> : <Music size={12} />}
                <span>{defaultLaunchMode === 'movies' ? 'Movies Mode' : 'Music Mode'}</span>
              </span>
            </div>

            {/* Quick Interactive Stat Chips */}
            <div className="hero-stats-deck">
              <button
                type="button"
                className="hero-stat-chip"
                onClick={() => setActiveScreen('watchlater')}
              >
                <Bookmark size={14} className="text-gold" />
                <span className="stat-num">{watchLater.length}</span>
                <span className="stat-label">Watchlist</span>
              </button>

              <button
                type="button"
                className="hero-stat-chip"
                onClick={() => setActiveScreen('playlist')}
              >
                <ListMusic size={14} className="text-lime" />
                <span className="stat-num">{playlists.length}</span>
                <span className="stat-label">Playlists</span>
              </button>

              <div className="hero-stat-chip">
                <Sparkles size={14} className="text-cyan" />
                <span className="stat-num">{likedSongs.length}</span>
                <span className="stat-label">Liked</span>
              </div>
            </div>

            {/* Visual Preferences Re-Launch Button */}
            {onOpenOnboarding && (
              <button
                type="button"
                className="hero-relaunch-btn"
                onClick={onOpenOnboarding}
              >
                <Sparkles size={14} />
                <span>Relaunch Setup Wizard</span>
              </button>
            )}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            SEGMENTED MODE TABS (Minimalistic & Sleek)
        ───────────────────────────────────────────────────────────── */}
        <div className="settings-segmented-nav">
          <button
            type="button"
            className={`settings-nav-tab ${activeTab === 'common' ? 'active' : ''}`}
            onClick={() => setActiveTab('common')}
          >
            <Zap size={15} />
            <span>General</span>
          </button>
          <button
            type="button"
            className={`settings-nav-tab ${activeTab === 'movies' ? 'active' : ''}`}
            onClick={() => setActiveTab('movies')}
          >
            <Film size={15} />
            <span>Movies & OTT</span>
          </button>
          <button
            type="button"
            className={`settings-nav-tab ${activeTab === 'music' ? 'active' : ''}`}
            onClick={() => setActiveTab('music')}
          >
            <Music size={15} />
            <span>Music & Hi-Fi</span>
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            1. GENERAL / COMMON SETTINGS (Visuals Heavy)
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'common' && (
          <div className="settings-tab-section animate-tab-in">
            {/* Launch Mode: Visual Cards */}
            <div className="visual-section-block">
              <span className="visual-section-title">Default Startup Mode</span>
              <div className="visual-mode-cards-grid">
                <div
                  className={`visual-launch-card ${defaultLaunchMode === 'movies' ? 'active' : ''}`}
                  onClick={() => handleLaunchModeChange('movies')}
                >
                  <div className="visual-card-bg-layer movies" />
                  <div className="visual-card-front">
                    <div className="visual-icon-ring">
                      <Film size={22} />
                    </div>
                    <span className="visual-card-name">Movies & Series</span>
                    <span className="visual-card-tag">OTT & 4K Cinema</span>
                    {defaultLaunchMode === 'movies' && <Check size={16} className="visual-card-check" />}
                  </div>
                </div>

                <div
                  className={`visual-launch-card ${defaultLaunchMode === 'music' ? 'active' : ''}`}
                  onClick={() => handleLaunchModeChange('music')}
                >
                  <div className="visual-card-bg-layer music" />
                  <div className="visual-card-front">
                    <div className="visual-icon-ring">
                      <Music size={22} />
                    </div>
                    <span className="visual-card-name">Music & Audio</span>
                    <span className="visual-card-tag">Hi-Fi & Official Videos</span>
                    {defaultLaunchMode === 'music' && <Check size={16} className="visual-card-check" />}
                  </div>
                </div>
              </div>
            </div>

            {/* Regional Cinema Hub: Visual Photo Grid */}
            <div className="visual-section-block">
              <div className="visual-section-title-row">
                <span className="visual-section-title">Regional Cinema Hub</span>
                <span className="active-hub-pill">{userLocation.name} ({userLocation.cinemaHub})</span>
              </div>

              <div className="visual-hubs-grid">
                {SUPPORTED_LOCATIONS.map(loc => {
                  const isSelected = userLocation.id === loc.id;
                  return (
                    <div
                      key={loc.id}
                      className={`visual-hub-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleLocationChange(loc.id)}
                    >
                      <img src={loc.image} alt={loc.name} loading="lazy" />
                      <div className="hub-card-shade" />
                      <span className="hub-tag">{loc.cinemaHub}</span>
                      <div className="hub-bottom-bar">
                        <span>{loc.name}</span>
                        {isSelected && <Check size={12} className="hub-check-dot" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Content Languages: Visual Pill Badges */}
            <div className="visual-section-block">
              <span className="visual-section-title">Languages</span>
              <div className="visual-langs-card">
                <div className="lang-tier-row">
                  <span className="lang-tier-label">Primary (Spotlight & Feeds)</span>
                  <div className="lang-pills-cluster">
                    {AVAILABLE_LANGUAGES.map(lang => (
                      <button
                        key={`prim-${lang}`}
                        type="button"
                        className={`lang-badge-pill ${primaryLanguage === lang ? 'active-primary' : ''}`}
                        onClick={() => {
                          setPrimaryLanguage(lang);
                          showToast(`Primary: ${lang}`);
                        }}
                      >
                        {primaryLanguage === lang && <Check size={12} />}
                        <span>{lang}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="lang-tier-row divider">
                  <span className="lang-tier-label">Secondary (Discovery Rows)</span>
                  <div className="lang-pills-cluster">
                    {AVAILABLE_LANGUAGES.map(lang => (
                      <button
                        key={`sec-${lang}`}
                        type="button"
                        className={`lang-badge-pill ${secondaryLanguage === lang ? 'active-secondary' : ''}`}
                        onClick={() => {
                          setSecondaryLanguage(lang);
                          showToast(`Secondary: ${lang}`);
                        }}
                      >
                        {secondaryLanguage === lang && <Check size={12} />}
                        <span>{lang}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Sleek Toggles */}
            <div className="visual-toggles-cluster">
              <div className="visual-toggle-item">
                <div className="toggle-left">
                  <Bell size={18} className="text-neon" />
                  <span className="toggle-title">New Releases & OTT Updates</span>
                </div>
                <label className="switch-toggle">
                  <input
                    type="checkbox"
                    checked={notifications}
                    onChange={e => handleNotificationsToggle(e.target.checked)}
                  />
                  <span className="slider-round" />
                </label>
              </div>
            </div>

            {/* Storage & Memory Gauge */}
            <div className="visual-storage-card">
              <div className="storage-top-row">
                <div className="storage-icon-title">
                  <HardDrive size={18} className="text-cyan" />
                  <span>Engine Cache & Storage</span>
                </div>
                <span className="storage-status-pill">Active Cache</span>
              </div>

              {/* Visual Storage Progress Meter */}
              <div className="storage-meter-track">
                <div className="storage-meter-fill" />
              </div>

              <div className="storage-actions-cluster">
                <button
                  type="button"
                  className="storage-btn safe"
                  onClick={handleClearAppCache}
                >
                  <RefreshCw size={14} />
                  <span>Clear Cache Buffers</span>
                </button>

                {clearConfirmOpen ? (
                  <div className="confirm-reset-box">
                    <span>Erase all user data and reset?</span>
                    <div className="confirm-btn-row">
                      <button
                        type="button"
                        className="confirm-reset-btn"
                        onClick={handleFactoryReset}
                      >
                        <Trash2 size={13} />
                        <span>{isResetting ? 'Resetting...' : 'Yes, Reset'}</span>
                      </button>
                      <button
                        type="button"
                        className="cancel-reset-btn"
                        onClick={() => setClearConfirmOpen(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="storage-btn danger"
                    onClick={() => setClearConfirmOpen(true)}
                  >
                    <Trash2 size={14} />
                    <span>Reset StreamPlay</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            2. MOVIES & OTT SETTINGS (Visuals Heavy)
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'movies' && (
          <div className="settings-tab-section animate-tab-in">
            {/* Visual Resolution Selector */}
            <div className="visual-section-block">
              <span className="visual-section-title">Video Quality</span>
              <div className="visual-quality-grid">
                {[
                  { id: 'auto', label: 'Adaptive', badge: 'Auto 4K', color: 'cyan' },
                  { id: '4k', label: '2160p UHD', badge: 'Ultra 4K', color: 'gold' },
                  { id: '1080p', label: '1080p FHD', badge: 'Crisp', color: 'lime' },
                  { id: '720p', label: '720p HD', badge: 'Saver', color: 'blue' }
                ].map(opt => {
                  const isSel = videoQuality === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className={`visual-quality-card ${isSel ? 'active ' + opt.color : ''}`}
                      onClick={() => {
                        setVideoQuality(opt.id);
                        showToast(`Quality: ${opt.label}`);
                      }}
                    >
                      <span className="quality-badge">{opt.badge}</span>
                      <span className="quality-name">{opt.label}</span>
                      {isSel && <Check size={14} className="quality-check" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Video Server Mirror Cluster */}
            <div className="visual-section-block">
              <span className="visual-section-title">Streaming Server Node</span>
              <div className="visual-server-grid">
                {[
                  { idx: 0, name: 'Server 1: SuperStream Ultra', ping: '12ms' },
                  { idx: 1, name: 'Server 2: VidSrc VIP Mirror', ping: '24ms' },
                  { idx: 2, name: 'Server 3: Multi-CDN Resolver', ping: '18ms' }
                ].map(srv => {
                  const isSel = videoProviderIndex === srv.idx;
                  return (
                    <button
                      key={srv.idx}
                      type="button"
                      className={`visual-server-card ${isSel ? 'active' : ''}`}
                      onClick={() => {
                        setVideoProviderIndex(srv.idx);
                        showToast(`Active Server: ${srv.name}`);
                      }}
                    >
                      <div className="server-status-dot" />
                      <div className="server-info">
                        <span className="server-name">{srv.name}</span>
                        <span className="server-ping">{srv.ping} CDN</span>
                      </div>
                      {isSel && <Check size={14} className="server-check" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* OTT Platform Catalog Filter */}
            <div className="visual-section-block">
              <span className="visual-section-title">OTT Catalog Filter</span>
              <div className="visual-ott-deck">
                {OTT_PLATFORMS_LIST.map(ott => {
                  const isSel = selectedOTT === ott;
                  return (
                    <button
                      key={ott}
                      type="button"
                      className={`visual-ott-badge ${isSel ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedOTT(ott);
                        showToast(`OTT: ${ott}`);
                      }}
                    >
                      {isSel && <Check size={12} />}
                      <span>{ott}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subtitles & Series Toggles */}
            <div className="visual-toggles-cluster">
              <div className="visual-toggle-item">
                <div className="toggle-left">
                  <Tv size={18} className="text-cyan" />
                  <span className="toggle-title">Auto-Play Next Episode</span>
                </div>
                <label className="switch-toggle">
                  <input
                    type="checkbox"
                    checked={autoPlayEpisode}
                    onChange={e => handleAutoPlayEpisodeToggle(e.target.checked)}
                  />
                  <span className="slider-round" />
                </label>
              </div>

              <div className="visual-toggle-item">
                <div className="toggle-left">
                  <Globe size={18} className="text-neon" />
                  <span className="toggle-title">Subtitles & Captions</span>
                </div>
                <div className="mini-segmented-pill">
                  {['auto', 'always', 'off'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      className={`mini-pill-btn ${subtitlePref === opt ? 'active' : ''}`}
                      onClick={() => handleSubtitleChange(opt)}
                    >
                      {opt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            3. MUSIC & HI-FI SETTINGS (Visuals Heavy)
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'music' && (
          <div className="settings-tab-section animate-tab-in">
            {/* Audio Bitrate Cards */}
            <div className="visual-section-block">
              <span className="visual-section-title">Audio Bitrate</span>
              <div className="visual-bitrate-grid">
                {[
                  { id: '320kbps', label: '320 kbps', badge: 'Ultra Hi-Fi Lossless', color: 'lime' },
                  { id: '160kbps', label: '160 kbps', badge: 'High Quality', color: 'cyan' },
                  { id: '96kbps', label: '96 kbps', badge: 'Data Saver', color: 'amber' }
                ].map(opt => {
                  const isSel = audioQuality === opt.id || (opt.id === '320kbps' && audioQuality === 'lossless');
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className={`visual-bitrate-card ${isSel ? 'active ' + opt.color : ''}`}
                      onClick={() => {
                        setAudioQuality(opt.id as AudioQualitySetting);
                        showToast(`Audio Bitrate: ${opt.label}`);
                      }}
                    >
                      <span className="bitrate-badge">{opt.badge}</span>
                      <span className="bitrate-value">{opt.label}</span>
                      {isSel && <Check size={14} className="bitrate-check" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visual Graphic Equalizer Presets */}
            <div className="visual-section-block">
              <span className="visual-section-title">Graphic Equalizer Tuning</span>
              <div className="visual-eq-grid">
                {[
                  { id: 'balanced', label: 'Studio Balanced', bars: [45, 60, 55, 50, 48] },
                  { id: 'bass', label: 'Sub-Bass Boost', bars: [90, 80, 50, 40, 35] },
                  { id: 'vocal', label: 'Vocal Clarity', bars: [35, 65, 88, 70, 50] },
                  { id: 'spatial', label: 'Spatial Immersion', bars: [50, 45, 60, 85, 95] }
                ].map(eq => {
                  const isSel = eqPreset === eq.id;
                  return (
                    <button
                      key={eq.id}
                      type="button"
                      className={`visual-eq-card ${isSel ? 'active' : ''}`}
                      onClick={() => handleEqPresetChange(eq.id)}
                    >
                      <div className="eq-bars-visual">
                        {eq.bars.map((h, bi) => (
                          <div
                            key={bi}
                            className="eq-single-bar"
                            style={{ height: `${h}%` }}
                          />
                        ))}
                      </div>
                      <div className="eq-label-row">
                        <span className="eq-title">{eq.label}</span>
                        {isSel && <Check size={12} className="eq-check" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Playback Mode (Audio vs Video Music) */}
            <div className="visual-section-block">
              <span className="visual-section-title">Default Music Mode</span>
              <div className="visual-mode-cards-grid">
                <button
                  type="button"
                  className={`visual-launch-card mini ${playbackMode === 'audio' ? 'active' : ''}`}
                  onClick={() => {
                    setPlaybackMode('audio');
                    showToast('Playback: Audio Only');
                  }}
                >
                  <Volume2 size={20} />
                  <span>Hi-Fi Audio Stream</span>
                  {playbackMode === 'audio' && <Check size={14} className="visual-card-check" />}
                </button>

                <button
                  type="button"
                  className={`visual-launch-card mini ${playbackMode === 'video' ? 'active' : ''}`}
                  onClick={() => {
                    setPlaybackMode('video');
                    showToast('Playback: 4K Video Music');
                  }}
                >
                  <Film size={20} />
                  <span>4K Official Music Video</span>
                  {playbackMode === 'video' && <Check size={14} className="visual-card-check" />}
                </button>
              </div>
            </div>

            {/* Audio Toggles: Gapless & Infinite Radio */}
            <div className="visual-toggles-cluster">
              <div className="visual-toggle-item">
                <div className="toggle-left">
                  <Zap size={18} className="text-neon" />
                  <span className="toggle-title">Gapless Preload (0ms Transition)</span>
                </div>
                <label className="switch-toggle">
                  <input
                    type="checkbox"
                    checked={gaplessPlayback}
                    onChange={e => handleGaplessToggle(e.target.checked)}
                  />
                  <span className="slider-round" />
                </label>
              </div>

              <div className="visual-toggle-item">
                <div className="toggle-left">
                  <Sparkles size={18} className="text-cyan" />
                  <span className="toggle-title">Auto-Play Infinite Radio</span>
                </div>
                <label className="switch-toggle">
                  <input
                    type="checkbox"
                    checked={infiniteRadio}
                    onChange={e => handleInfiniteRadioToggle(e.target.checked)}
                  />
                  <span className="slider-round" />
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
