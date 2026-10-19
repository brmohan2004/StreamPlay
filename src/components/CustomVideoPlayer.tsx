import './CustomVideoPlayer.css';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  FastForward,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Server,
  Settings,
  Languages,
  Activity,
  Layers,
  ChevronRight,
  Zap,
  Lock,
  Unlock,
  Check,
  List
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import { getStreamEmbedUrl } from '../services/movieService';


export const CustomVideoPlayer: React.FC = () => {
  const {
    activeMovie,
    activeSeason,
    activeEpisode,
    isVideoModalOpen,
    closeMoviePlayer,
    videoProviderIndex,
    setVideoProviderIndex,
    playNextEpisode,
    setEpisode
  } = useMedia();

  // Fullscreen container ref
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Player UI states
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Menus & Modals
  const [showServerMenu, setShowServerMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [showEpisodeDrawer, setShowEpisodeDrawer] = useState(false);

  // Player Settings
  const [selectedQuality, setSelectedQuality] = useState('1080p FHD');
  const [selectedAudioLang, setSelectedAudioLang] = useState('English (Original)');
  const [selectedSubtitles, setSelectedSubtitles] = useState('English [CC]');
  const [aspectRatioMode, setAspectRatioMode] = useState<'fit' | 'fill' | 'zoom' | '16-9'>('fit');

  // "Hold to 2x Play" state
  const [isHolding2X, setIsHolding2X] = useState(false);
  const holdTimeoutRef = useRef<any>(null);

  // Connection Health state (real-time simulated realistic telemetry)
  const [ping, setPing] = useState(24);
  const [bitrate, setBitrate] = useState(48.5);
  const [bufferHealth, setBufferHealth] = useState(98);

  const SERVERS = [
    { name: 'Server 1 • VidLink Pro', desc: 'Ultra HD 4K • Global CDN (Fastest)', speed: 'Fast' },
    { name: 'Server 2 • NetMirror Cloud', desc: '1080p FHD • Multi-Audio Tracks', speed: 'High Speed' },
    { name: 'Server 3 • 2Embed Stream', desc: 'Dual Audio • Global Subtitles', speed: 'Stable' },
    { name: 'Server 4 • CineSrc Direct', desc: 'Low Latency • Adaptive Stream', speed: 'Direct' },
    { name: 'Server 5 • EmbedMaster', desc: 'Backup 4K Stream', speed: 'Backup' }
  ];

  const QUALITIES = [
    { label: '4K Ultra HD (2160p)', badge: 'HDR' },
    { label: '1080p FHD (High Bitrate)', badge: '1080p' },
    { label: '720p HD', badge: '720p' },
    { label: '480p SD (Data Saver)', badge: 'SD' },
    { label: 'Auto (Adaptive)', badge: 'Auto' }
  ];

  const AUDIO_LANGUAGES = [
    'English (Original 5.1)',
    'Hindi (Dubbed)',
    'Tamil (Dubbed)',
    'Telugu (Dubbed)',
    'Spanish (Español)',
    'French (Français)',
    'Korean (한국어)'
  ];

  const SUBTITLES = [
    'Off',
    'English [CC]',
    'Hindi [CC]',
    'Tamil [CC]',
    'Telugu [CC]',
    'Spanish',
    'French'
  ];


  // Inactivity controls timer
  useEffect(() => {
    if (!isVideoModalOpen) return;
    let timer: any;
    const resetTimer = () => {
      setShowControls(true);
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!showServerMenu && !showQualityMenu && !showLangMenu && !showHealthModal && !showEpisodeDrawer) {
          setShowControls(false);
        }
      }, 3500);
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('touchstart', resetTimer);
    resetTimer();

    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
    };
  }, [isVideoModalOpen, showServerMenu, showQualityMenu, showLangMenu, showHealthModal, showEpisodeDrawer]);

  // Connection Health Heartbeat
  useEffect(() => {
    if (!isVideoModalOpen) return;
    const interval = setInterval(() => {
      setPing(Math.floor(20 + Math.random() * 10));
      setBitrate(parseFloat((45 + Math.random() * 8).toFixed(1)));
      setBufferHealth(Math.min(100, Math.floor(95 + Math.random() * 5)));
    }, 3000);
    return () => clearInterval(interval);
  }, [isVideoModalOpen]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!isVideoModalOpen || !activeMovie) return null;

  const currentEmbedUrl = getStreamEmbedUrl(
    activeMovie.id,
    activeMovie.type,
    videoProviderIndex,
    activeSeason,
    activeEpisode
  );

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen?.().catch(e => console.warn(e));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(e => console.warn(e));
      setIsFullscreen(false);
    }
  };

  // Hold to 2x Play Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isLocked) return;
    // Don't trigger if clicking buttons or menus
    if ((e.target as HTMLElement).closest('button, .player-menu-modal, .player-header-bar, .player-bottom-bar')) {
      return;
    }
    holdTimeoutRef.current = setTimeout(() => {
      setIsHolding2X(true);
    }, 250);
  };

  const handlePointerUp = () => {
    clearTimeout(holdTimeoutRef.current);
    if (isHolding2X) {
      setIsHolding2X(false);
    }
  };

  // Aspect ratio class helper
  const getAspectStyle = () => {
    switch (aspectRatioMode) {
      case 'fill':
        return { width: '100%', height: '100%', transform: 'scale(1.08)' };
      case 'zoom':
        return { width: '100%', height: '100%', transform: 'scale(1.28)' };
      case '16-9':
        return { width: '100%', height: '100%', aspectRatio: '16/9' };
      default:
        return { width: '100%', height: '100%' };
    }
  };

  const cycleAspectRatio = () => {
    const modes: ('fit' | 'fill' | 'zoom' | '16-9')[] = ['fit', 'fill', 'zoom', '16-9'];
    const nextIdx = (modes.indexOf(aspectRatioMode) + 1) % modes.length;
    setAspectRatioMode(modes[nextIdx]);
  };

  const handleSkipForward = () => {
    // Visual feedback for skip +10s
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 300);
  };

  const handleSkipBackward = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 300);
  };

  const handleSkipIntro = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 350);
  };

  return (
    <div
      ref={playerContainerRef}
      className={`custom-fullscreen-player-container ${isFullscreen ? 'is-fullscreen' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* 1. Main Streaming Frame Viewport */}
      <div className="player-viewport-stage" style={getAspectStyle()}>
        {isLoading && (
          <div className="stream-loading-curtain">
            <div className="stream-glow-spinner" />
            <div className="stream-loading-info">
              <p className="loading-server-title">Connecting to {SERVERS[videoProviderIndex % SERVERS.length].name}...</p>
              <span className="loading-speed-sub">Buffering {selectedQuality} • {ping}ms</span>
            </div>
          </div>
        )}

        <iframe
          ref={iframeRef}
          key={`${activeMovie.id}-${videoProviderIndex}-${activeSeason}-${activeEpisode}`}
          src={currentEmbedUrl}
          className="custom-stream-iframe"
          title={activeMovie.name}
          sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
          allowFullScreen
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          referrerPolicy="no-referrer"
          onLoad={() => setIsLoading(false)}
        />
      </div>

      {/* 2. "HOLD TO 2X PLAY" Floating Pill Indicator */}
      <AnimatePresence>
        {isHolding2X && (
          <motion.div
            className="hold-2x-pill-banner"
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Zap size={18} fill="#c8ff00" color="#c8ff00" className="animate-bounce" />
            <span>2X SPEED PLAYBACK &gt;&gt;</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. "SKIP INTRO" Floating Action Pill */}
      {showControls && !isLocked && (
        <motion.button
          className="skip-intro-floating-btn"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSkipIntro}
          title="Skip Intro (+85s)"
        >
          <FastForward size={16} />
          <span>Skip Intro (+85s)</span>
        </motion.button>
      )}

      {/* 4. Top Header Overlay Bar */}
      <div className={`player-header-bar ${showControls ? 'visible' : 'hidden'}`}>
        <div className="header-left-meta">
          <button className="player-ctrl-round-btn" onClick={closeMoviePlayer} title="Close Player">
            <X size={20} />
          </button>

          <div className="player-title-block">
            <h2 className="stream-movie-title">{activeMovie.name}</h2>
            <div className="stream-meta-chips">
              <span className="chip-badge quality-chip">{selectedQuality.split(' ')[0]}</span>
              {activeMovie.type === 'series' && (
                <span className="chip-badge episode-chip">
                  S{activeSeason}:E{activeEpisode}
                </span>
              )}
              <span className="chip-badge server-chip">
                Server {videoProviderIndex + 1}
              </span>
            </div>
          </div>
        </div>

        {/* Top Right Quick Controls */}
        <div className="header-right-tools">
          {/* Health of Connection Pill */}
          <button
            className="connection-health-pill-btn"
            onClick={() => setShowHealthModal(prev => !prev)}
            title="Connection Health"
          >
            <span className="health-dot-indicator green" />
            <Activity size={14} />
            <span className="health-ping-text">{ping}ms</span>
          </button>

          {/* Servers Switcher */}
          <button
            className={`player-tool-icon-btn ${showServerMenu ? 'active' : ''}`}
            onClick={() => setShowServerMenu(prev => !prev)}
            title="Switch Streaming Server"
          >
            <Server size={18} />
            <span className="btn-label-hide-mobile">Servers</span>
          </button>

          {/* Quality Selector */}
          <button
            className={`player-tool-icon-btn ${showQualityMenu ? 'active' : ''}`}
            onClick={() => setShowQualityMenu(prev => !prev)}
            title="Video Quality"
          >
            <Settings size={18} />
            <span className="btn-label-hide-mobile">Quality</span>
          </button>

          {/* Language / Audio / Subs */}
          <button
            className={`player-tool-icon-btn ${showLangMenu ? 'active' : ''}`}
            onClick={() => setShowLangMenu(prev => !prev)}
            title="Audio & Subtitles"
          >
            <Languages size={18} />
          </button>

          {/* Lock Controls Toggle */}
          <button
            className={`player-tool-icon-btn ${isLocked ? 'locked' : ''}`}
            onClick={() => setIsLocked(prev => !prev)}
            title={isLocked ? 'Unlock Screen' : 'Lock Screen'}
          >
            {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
          </button>
        </div>
      </div>

      {/* 5. Center Play/Pause & Skip Controls */}
      {showControls && !isLocked && (
        <div className="player-center-controls">
          <button className="center-skip-btn" onClick={handleSkipBackward} title="Skip 10s Backward">
            <RotateCcw size={26} />
            <span className="skip-time-tag">10</span>
          </button>

          <button
            className="center-big-play-btn"
            onClick={() => setIsPlaying(prev => !prev)}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={32} fill="#000000" color="#000000" />
            ) : (
              <Play size={32} fill="#000000" color="#000000" style={{ marginLeft: 4 }} />
            )}
          </button>

          <button className="center-skip-btn" onClick={handleSkipForward} title="Skip 10s Forward">
            <RotateCw size={26} />
            <span className="skip-time-tag">10</span>
          </button>
        </div>
      )}

      {/* 6. Bottom Controls Bar */}
      <div className={`player-bottom-bar ${showControls && !isLocked ? 'visible' : 'hidden'}`}>
        <div className="bottom-left-controls">
          {/* Mute toggle */}
          <button
            className="player-ctrl-round-btn small"
            onClick={() => setIsMuted(prev => !prev)}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          {/* Aspect Ratio Screen Size Adjustment */}
          <button
            className="screen-size-adjust-btn"
            onClick={cycleAspectRatio}
            title="Screen Size Adjustment (Fit, Stretch, Zoom 21:9)"
          >
            <Layers size={16} />
            <span>Size: {aspectRatioMode.toUpperCase()}</span>
          </button>
        </div>

        {/* Center / Right Bottom Controls */}
        <div className="bottom-right-controls">
          {/* Episodes List & Next Episode Buttons (Series only) */}
          {activeMovie.type === 'series' && (
            <>
              <button
                className="player-ctrl-round-btn small"
                onClick={() => setShowEpisodeDrawer(prev => !prev)}
                title="All Episodes"
              >
                <List size={18} />
              </button>

              <motion.button
                className="player-next-episode-btn"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={playNextEpisode}
                title={`Next Episode (S${activeSeason}:E${activeEpisode + 1})`}
              >
                <span>Next Episode</span>
                <ChevronRight size={18} />
              </motion.button>
            </>
          )}

          {/* Fullscreen Toggle Button */}
          <button
            className="player-ctrl-round-btn small"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>


      {/* 7. POPUP MODALS */}

      {/* Server Selection Popup */}
      <AnimatePresence>
        {showServerMenu && (
          <motion.div
            className="player-menu-modal server-menu"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
          >
            <div className="menu-modal-header">
              <Server size={18} className="text-lime" />
              <h4>Streaming Servers</h4>
              <button className="menu-close-x" onClick={() => setShowServerMenu(false)}>✕</button>
            </div>
            <div className="menu-options-list">
              {SERVERS.map((srv, idx) => (
                <div
                  key={idx}
                  className={`menu-option-item ${videoProviderIndex % SERVERS.length === idx ? 'active' : ''}`}
                  onClick={() => {
                    setIsLoading(true);
                    setVideoProviderIndex(idx);
                    setShowServerMenu(false);
                  }}
                >
                  <div className="option-main-text">
                    <span className="option-title">{srv.name}</span>
                    <span className="option-desc">{srv.desc}</span>
                  </div>
                  {videoProviderIndex % SERVERS.length === idx && <Check size={18} color="#c8ff00" />}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quality Selection Popup */}
      <AnimatePresence>
        {showQualityMenu && (
          <motion.div
            className="player-menu-modal quality-menu"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
          >
            <div className="menu-modal-header">
              <Settings size={18} className="text-cyan" />
              <h4>Playback Quality</h4>
              <button className="menu-close-x" onClick={() => setShowQualityMenu(false)}>✕</button>
            </div>
            <div className="menu-options-list">
              {QUALITIES.map((q, idx) => (
                <div
                  key={idx}
                  className={`menu-option-item ${selectedQuality === q.label ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedQuality(q.label);
                    setShowQualityMenu(false);
                  }}
                >
                  <span className="option-title">{q.label}</span>
                  <span className="option-badge-tag">{q.badge}</span>
                  {selectedQuality === q.label && <Check size={18} color="#00d2ff" />}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audio Language & Subtitles Popup */}
      <AnimatePresence>
        {showLangMenu && (
          <motion.div
            className="player-menu-modal lang-menu"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
          >
            <div className="menu-modal-header">
              <Languages size={18} className="text-lime" />
              <h4>Audio & Subtitles</h4>
              <button className="menu-close-x" onClick={() => setShowLangMenu(false)}>✕</button>
            </div>
            <div className="lang-split-sections">
              <div className="lang-col">
                <span className="lang-col-title">Audio Track</span>
                <div className="menu-options-list compact">
                  {AUDIO_LANGUAGES.map((lang, idx) => (
                    <div
                      key={idx}
                      className={`menu-option-item ${selectedAudioLang === lang ? 'active' : ''}`}
                      onClick={() => setSelectedAudioLang(lang)}
                    >
                      <span className="option-title">{lang}</span>
                      {selectedAudioLang === lang && <Check size={16} color="#c8ff00" />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="lang-col">
                <span className="lang-col-title">Subtitles</span>
                <div className="menu-options-list compact">
                  {SUBTITLES.map((sub, idx) => (
                    <div
                      key={idx}
                      className={`menu-option-item ${selectedSubtitles === sub ? 'active' : ''}`}
                      onClick={() => setSelectedSubtitles(sub)}
                    >
                      <span className="option-title">{sub}</span>
                      {selectedSubtitles === sub && <Check size={16} color="#00d2ff" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Health of Connection Modal */}
      <AnimatePresence>
        {showHealthModal && (
          <motion.div
            className="player-menu-modal health-modal"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
          >
            <div className="menu-modal-header">
              <Activity size={18} className="text-lime" />
              <h4>Connection Health Telemetry</h4>
              <button className="menu-close-x" onClick={() => setShowHealthModal(false)}>✕</button>
            </div>

            <div className="health-telemetry-content">
              <div className="health-stat-card">
                <span className="stat-label">Latency / Ping</span>
                <span className="stat-value text-lime">{ping} ms</span>
                <span className="stat-sub">Ultra Fast Response</span>
              </div>
              <div className="health-stat-card">
                <span className="stat-label">Bandwidth Speed</span>
                <span className="stat-value text-cyan">{bitrate} Mbps</span>
                <span className="stat-sub">4K HDR Capable</span>
              </div>
              <div className="health-stat-card">
                <span className="stat-label">Buffer Health</span>
                <span className="stat-value text-lime">{bufferHealth}%</span>
                <span className="stat-sub">0 Dropped Frames</span>
              </div>
            </div>

            <div className="health-status-badge">
              <span className="health-dot-indicator green" />
              <span>Connection Status: OPTIMAL (4K Streaming Ready)</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Episodes Drawer Modal */}
      <AnimatePresence>
        {showEpisodeDrawer && activeMovie.type === 'series' && (
          <motion.div
            className="player-menu-modal episodes-drawer-modal"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
          >
            <div className="menu-modal-header">
              <List size={18} className="text-lime" />
              <h4>Episodes & Seasons</h4>
              <button className="menu-close-x" onClick={() => setShowEpisodeDrawer(false)}>✕</button>
            </div>
            <div className="menu-options-list">
              {(activeMovie.videos && activeMovie.videos.length > 0
                ? activeMovie.videos
                : Array.from({ length: 12 }, (_, i) => ({
                    id: `ep-${i + 1}`,
                    name: `Episode ${i + 1}`,
                    season: 1,
                    number: i + 1
                  }))
              ).map(ep => (
                <div
                  key={ep.id}
                  className={`menu-option-item ${activeSeason === ep.season && activeEpisode === ep.number ? 'active' : ''}`}
                  onClick={() => {
                    setIsLoading(true);
                    setEpisode(ep.season, ep.number);
                    setShowEpisodeDrawer(false);
                  }}
                >
                  <div className="option-main-text">
                    <span className="option-title">S{ep.season} : E{ep.number} - {ep.name}</span>
                  </div>
                  {activeSeason === ep.season && activeEpisode === ep.number && <Check size={18} color="#c8ff00" />}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

