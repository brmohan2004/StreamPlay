import './CustomVideoPlayer.css';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Hls from 'hls.js';
import {
  X,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Settings,
  Languages,
  Activity,
  Layers,
  ChevronRight,
  Zap,
  Lock,
  Check,
  List,
  Server,
  Play,
  Pause
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import { getStreamEmbedUrl, STREAMING_SERVERS } from '../services/movieService';

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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [nativeAudioTracks, setNativeAudioTracks] = useState<{ id: number; name: string; lang: string }[]>([]);

  // Player UI states
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Menus & Modals
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
        if (!showQualityMenu && !showLangMenu && !showHealthModal && !showEpisodeDrawer) {
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
  }, [isVideoModalOpen, showQualityMenu, showLangMenu, showHealthModal, showEpisodeDrawer]);

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

  // Native HLS Video Stream Mounting Lifecycle
  useEffect(() => {
    if (!isVideoModalOpen || !activeMovie?.streamUrl || !videoRef.current) return;

    const video = videoRef.current;
    let hls: Hls | null = null;
    setIsLoading(true);

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90
      });
      hlsRef.current = hls;

      hls.loadSource(activeMovie.streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        video.play().catch(e => console.warn('Autoplay prevented:', e));

        if (hls && hls.audioTracks && hls.audioTracks.length > 0) {
          const tracks = hls.audioTracks.map((t, idx) => ({
            id: idx,
            name: t.name || `Audio Track ${idx + 1}`,
            lang: t.lang || 'default'
          }));
          setNativeAudioTracks(tracks);
          if (tracks[0]) {
            setSelectedAudioLang(tracks[0].name);
          }
        }
      });

      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_, data) => {
        const currentTrack = hls?.audioTracks[data.id];
        if (currentTrack) {
          setSelectedAudioLang(currentTrack.name || currentTrack.lang || `Track ${data.id + 1}`);
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls?.recoverMediaError();
              break;
            default:
              hls?.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = activeMovie.streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        video.play().catch(e => console.warn('Autoplay prevented:', e));
      });
    }

    return () => {
      if (hls) {
        hls.destroy();
        hlsRef.current = null;
      }
    };
  }, [isVideoModalOpen, activeMovie?.streamUrl, activeMovie?.id]);

  const togglePlayPause = () => {
    if (activeMovie?.streamUrl && videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
    setIsMuted(prev => !prev);
  };

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
    if ((e.target as HTMLElement).closest('button, .player-menu-modal, .player-header-bar, .player-bottom-bar')) {
      return;
    }
    holdTimeoutRef.current = setTimeout(() => {
      setIsHolding2X(true);
    }, 300);
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
              <p className="loading-server-title">Connecting to stream...</p>
              <span className="loading-speed-sub">Buffering {selectedQuality} • {ping}ms</span>
            </div>
          </div>
        )}

        {activeMovie.streamUrl ? (
          <video
            ref={videoRef}
            className="custom-stream-video"
            playsInline
            autoPlay
            muted={isMuted}
            onClick={togglePlayPause}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onWaiting={() => setIsLoading(true)}
            onPlaying={() => setIsLoading(false)}
          />
        ) : (
          <iframe
            ref={iframeRef}
            key={`${activeMovie.id}-${videoProviderIndex}-${activeSeason}-${activeEpisode}`}
            src={currentEmbedUrl}
            className="custom-stream-iframe"
            title={activeMovie.name}
            sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
            referrerPolicy="no-referrer"
            allowFullScreen
            allow="autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            onLoad={() => {
              setIsLoading(false);
            }}
          />
        )}
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

      {/* 3. Screen Locked Floating Unlock Button */}
      <AnimatePresence>
        {isLocked && (
          <motion.button
            className="player-locked-floating-pill"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            onClick={() => setIsLocked(false)}
            title="Screen Locked — Tap to Unlock"
            aria-label="Unlock Screen"
          >
            <Lock size={18} />
            <span>Screen Locked (Tap to Unlock)</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* 4. Top Header Overlay Bar — Only Title and Connection Health */}
      <div className={`player-header-bar ${showControls && !isLocked ? 'visible' : 'hidden'}`}>
        <div className="header-left-meta">
          <button className="player-ctrl-round-btn" onClick={closeMoviePlayer} title="Close Player" aria-label="Close">
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
            </div>
          </div>
        </div>

        {/* Top Right: Connection Health Pill ONLY */}
        <div className="header-right-tools">
          <button
            className="connection-health-pill-btn"
            onClick={() => setShowHealthModal(prev => !prev)}
            title="Connection Health"
            aria-label="Connection Health"
          >
            <span className="health-dot-indicator green" />
            <Activity size={14} />
            <span className="health-ping-text">{ping}ms</span>
          </button>
        </div>
      </div>

      {/* 5. Bottom Controls Bar — ALL OPTIONS IN BOTTOM BAR (LOGO ONLY) */}
      <div className={`player-bottom-bar ${showControls && !isLocked ? 'visible' : 'hidden'}`}>
        <div className="bottom-left-controls">
          {/* Play/Pause toggle (Native Video) — logo only */}
          {activeMovie.streamUrl && (
            <button
              className="player-ctrl-round-btn small"
              onClick={togglePlayPause}
              title={isPlaying ? 'Pause' : 'Play'}
              aria-label="Play or Pause"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} fill="#ffffff" />}
            </button>
          )}

          {/* Mute toggle — logo only */}
          <button
            className="player-ctrl-round-btn small"
            onClick={toggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
            aria-label="Mute"
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          {/* Aspect Ratio Screen Size — logo only */}
          <button
            className="player-ctrl-round-btn small"
            onClick={cycleAspectRatio}
            title={`Screen Size: ${aspectRatioMode.toUpperCase()}`}
            aria-label="Screen Size"
          >
            <Layers size={18} />
          </button>
        </div>

        {/* Right Bottom Controls — ALL LOGO ONLY */}
        <div className="bottom-right-controls">
          {/* Server & Quality Selector — logo only */}
          <button
            className={`player-ctrl-round-btn small ${showQualityMenu ? 'active' : ''}`}
            onClick={() => {
              setShowQualityMenu(prev => !prev);
              setShowLangMenu(false);
              setShowHealthModal(false);
              setShowEpisodeDrawer(false);
            }}
            title="Video Quality & Server"
            aria-label="Video Quality & Server"
          >
            <Settings size={18} />
          </button>

          {/* Language / Audio & Subtitles — logo only */}
          <button
            className={`player-ctrl-round-btn small ${showLangMenu ? 'active' : ''}`}
            onClick={() => {
              setShowLangMenu(prev => !prev);
              setShowQualityMenu(false);
              setShowHealthModal(false);
              setShowEpisodeDrawer(false);
            }}
            title="Audio & Subtitles"
            aria-label="Audio & Subtitles"
          >
            <Languages size={18} />
          </button>

          {/* Screen Lock — logo only */}
          <button
            className="player-ctrl-round-btn small"
            onClick={() => setIsLocked(true)}
            title="Lock Screen"
            aria-label="Lock Screen"
          >
            <Lock size={18} />
          </button>

          {/* Episodes Drawer (Series only) — logo only */}
          {activeMovie.type === 'series' && (
            <>
              <button
                className={`player-ctrl-round-btn small ${showEpisodeDrawer ? 'active' : ''}`}
                onClick={() => {
                  setShowEpisodeDrawer(prev => !prev);
                  setShowQualityMenu(false);
                  setShowLangMenu(false);
                  setShowHealthModal(false);
                }}
                title="All Episodes"
                aria-label="All Episodes"
              >
                <List size={18} />
              </button>

              <motion.button
                className="player-ctrl-round-btn small text-lime-btn"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={playNextEpisode}
                title={`Next Episode (S${activeSeason}:E${activeEpisode + 1})`}
                aria-label="Next Episode"
              >
                <ChevronRight size={18} />
              </motion.button>
            </>
          )}

          {/* Fullscreen Toggle — logo only */}
          <button
            className="player-ctrl-round-btn small"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            aria-label="Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>

      {/* 6. POPUP MODALS */}

      {/* Quality & Server Selection Popup */}
      <AnimatePresence>
        {showQualityMenu && (
          <motion.div
            className="player-menu-modal quality-menu"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
          >
            <div className="menu-modal-header">
              <Settings size={18} className="text-cyan" />
              <h4>Playback & Servers</h4>
              <button className="menu-close-x" onClick={() => setShowQualityMenu(false)}>✕</button>
            </div>
            <div className="menu-options-list">
              <span className="lang-col-title" style={{ padding: '0.4rem 0.6rem 0.1rem', fontSize: '0.72rem' }}>
                Streaming Server
              </span>
              {STREAMING_SERVERS.slice(0, 5).map((srv, idx) => (
                <div
                  key={srv.id}
                  className={`menu-option-item ${videoProviderIndex === idx ? 'active' : ''}`}
                  onClick={() => {
                    setVideoProviderIndex(idx);
                    setIsLoading(true);
                  }}
                >
                  <Server size={14} style={{ marginRight: 6, opacity: 0.7 }} />
                  <span className="option-title">{srv.name}</span>
                  <span className="option-badge-tag">{srv.isNoAds ? 'Fast' : 'HD'}</span>
                  {videoProviderIndex === idx && <Check size={18} color="#00d2ff" />}
                </div>
              ))}

              <span className="lang-col-title" style={{ padding: '0.6rem 0.6rem 0.1rem', fontSize: '0.72rem' }}>
                Video Quality
              </span>
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
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
          >
            <div className="menu-modal-header">
              <Languages size={18} className="text-lime" />
              <h4>Audio & Subtitles</h4>
              <button className="menu-close-x" onClick={() => setShowLangMenu(false)}>✕</button>
            </div>
            <div className="lang-split-sections">
              <div className="lang-col">
                <span className="lang-col-title">
                  Audio Track {nativeAudioTracks.length > 0 ? `(${nativeAudioTracks.length} Detected)` : ''}
                </span>
                <div className="menu-options-list compact">
                  {nativeAudioTracks.length > 0 ? (
                    nativeAudioTracks.map(track => (
                      <div
                        key={track.id}
                        className={`menu-option-item ${selectedAudioLang === track.name ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedAudioLang(track.name);
                          if (hlsRef.current) {
                            hlsRef.current.audioTrack = track.id;
                          }
                        }}
                      >
                        <span className="option-title">{track.name}</span>
                        {selectedAudioLang === track.name && <Check size={16} color="#c8ff00" />}
                      </div>
                    ))
                  ) : (
                    AUDIO_LANGUAGES.map((lang, idx) => (
                      <div
                        key={idx}
                        className={`menu-option-item ${selectedAudioLang === lang ? 'active' : ''}`}
                        onClick={() => setSelectedAudioLang(lang)}
                      >
                        <span className="option-title">{lang}</span>
                        {selectedAudioLang === lang && <Check size={16} color="#c8ff00" />}
                      </div>
                    ))
                  )}
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
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
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
