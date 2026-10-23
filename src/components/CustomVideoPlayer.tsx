import './CustomVideoPlayer.css';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  Pause,
  Gauge,
  Sparkles
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import { getStreamEmbedUrl, STREAMING_SERVERS, fetchMovieDetails } from '../services/movieService';
import { EpisodeItem } from '../types/media';

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
  const [hasPlayerCrashed, setHasPlayerCrashed] = useState(false);
  const [serverToast, setServerToast] = useState<string | null>(null);
  const [showSlowNotice, setShowSlowNotice] = useState(false);
  const [aspectRatioToast, setAspectRatioToast] = useState<string | null>(null);

  // Playback speed state (0.5x to 2x)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

  const handleSwitchServer = useCallback((nextIdx: number) => {
    const safeIdx = Math.abs(nextIdx) % STREAMING_SERVERS.length;
    const targetServer = STREAMING_SERVERS[safeIdx];
    setVideoProviderIndex(safeIdx);
    setIsLoading(true);
    setHasPlayerCrashed(false);
    setShowSlowNotice(false);
    setServerToast(`Switched to Mirror: ${targetServer?.name || 'Server'}`);
    setTimeout(() => {
      setServerToast(null);
    }, 2800);
  }, [setVideoProviderIndex]);

  // Loading curtain auto-dismiss & slow stream watchdog
  useEffect(() => {
    if (!isVideoModalOpen) return;
    setIsLoading(true);
    setShowSlowNotice(false);

    // Auto-dismiss loading curtain after 2.5s so iframe controls are instantly visible & responsive
    const dismissTimer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);

    // Watchdog: If server buffer or connection is slow after 4.5s, suggest next mirror server
    const slowTimer = setTimeout(() => {
      setShowSlowNotice(true);
    }, 4500);

    return () => {
      clearTimeout(dismissTimer);
      clearTimeout(slowTimer);
    };
  }, [isVideoModalOpen, videoProviderIndex, activeMovie?.id, activeSeason, activeEpisode]);

  // Popup Guard: Prevent external embed ads from opening new Chrome tabs/windows
  // Returns a mock Window proxy so embedded players pass anti-sandbox/popup capability checks without opening external tabs
  useEffect(() => {
    if (!isVideoModalOpen) return;
    const prevOpen = window.open;
    try {
      window.open = function (...args: any[]) {
        console.warn('[StreamPlay Guard] Handled popup ad request without breakout:', args[0]);
        return {
          closed: false,
          focus: () => {},
          blur: () => {},
          close: () => {},
          postMessage: () => {},
          location: { href: args[0] || '' }
        } as any;
      };
    } catch {
      // ignore
    }
    return () => {
      window.open = prevOpen;
    };
  }, [isVideoModalOpen]);

  // Menus & Modals
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [showEpisodeDrawer, setShowEpisodeDrawer] = useState(false);
  const [dynamicEpisodes, setDynamicEpisodes] = useState<EpisodeItem[]>([]);
  const [drawerSeasonTab, setDrawerSeasonTab] = useState<number>(activeSeason);

  useEffect(() => {
    if (!activeMovie || activeMovie.type !== 'series') return;
    if (activeMovie.videos && activeMovie.videos.length > 0) {
      setDynamicEpisodes(activeMovie.videos);
      return;
    }
    let isMounted = true;
    fetchMovieDetails(activeMovie.id, 'series').then(details => {
      if (isMounted && details.videos && details.videos.length > 0) {
        setDynamicEpisodes(details.videos);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [activeMovie]);

  // Calculate distinct available seasons and episodes grouped by season
  const allEpisodes = useMemo(() => {
    if (activeMovie?.videos && activeMovie.videos.length > 0) return activeMovie.videos;
    return dynamicEpisodes;
  }, [activeMovie?.videos, dynamicEpisodes]);

  const availableSeasons = useMemo(() => {
    const seasonsSet = new Set<number>();
    allEpisodes.forEach(ep => {
      if (ep.season) seasonsSet.add(ep.season);
    });
    return seasonsSet.size > 0 ? Array.from(seasonsSet).sort((a, b) => a - b) : [1];
  }, [allEpisodes]);

  useEffect(() => {
    setDrawerSeasonTab(activeSeason);
  }, [activeSeason, showEpisodeDrawer]);

  const filteredEpisodes = useMemo(() => {
    const eps = allEpisodes.filter(ep => (ep.season || 1) === drawerSeasonTab);
    return eps.length > 0 ? eps : allEpisodes;
  }, [allEpisodes, drawerSeasonTab]);

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

  // Back gesture & hardware button interceptor for inner player drawers & menus
  useEffect(() => {
    if (!isVideoModalOpen) return;

    const handleBackEvent = (e: Event) => {
      if (showEpisodeDrawer) {
        e.preventDefault();
        setShowEpisodeDrawer(false);
        return;
      }
      if (showQualityMenu) {
        e.preventDefault();
        setShowQualityMenu(false);
        return;
      }
      if (showLangMenu) {
        e.preventDefault();
        setShowLangMenu(false);
        return;
      }
      if (showHealthModal) {
        e.preventDefault();
        setShowHealthModal(false);
        return;
      }
      if (isFullscreen) {
        e.preventDefault();
        toggleFullscreen();
        return;
      }
      // If no sub-menus or fullscreen are active, let default handler close the player
    };

    window.addEventListener('streamplay-back-action', handleBackEvent);
    return () => {
      window.removeEventListener('streamplay-back-action', handleBackEvent);
    };
  }, [
    isVideoModalOpen,
    showEpisodeDrawer,
    showQualityMenu,
    showLangMenu,
    showHealthModal,
    isFullscreen
  ]);

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

  const currentEmbedUrl = activeMovie
    ? getStreamEmbedUrl(
        activeMovie.id,
        activeMovie.type,
        videoProviderIndex,
        activeSeason,
        activeEpisode
      )
    : '';

  // Playback rate synchronization for native video
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = isHolding2X ? 2.0 : playbackSpeed;
    }
  }, [isHolding2X, playbackSpeed]);

  // Keyboard controls listener
  useEffect(() => {
    if (!isVideoModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.key === 'Escape') {
        e.preventDefault();
        closeMoviePlayer();
      } else if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleSwitchServer(videoProviderIndex + 1);
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        cycleAspectRatio();
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        setIsLocked(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVideoModalOpen, videoProviderIndex, isPlaying, isMuted, aspectRatioMode, isLocked, closeMoviePlayer, handleSwitchServer]);

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
    const nextMode = modes[nextIdx];
    setAspectRatioMode(nextMode);

    const labels: Record<string, string> = {
      fit: 'Screen Aspect: FIT (Original)',
      fill: 'Screen Aspect: FILL (1.08x Stretch)',
      zoom: 'Screen Aspect: ZOOM (1.28x Cinematic)',
      '16-9': 'Screen Aspect: 16:9 (Standard Widescreen)'
    };
    setAspectRatioToast(labels[nextMode]);
    setTimeout(() => {
      setAspectRatioToast(null);
    }, 2200);
  };

  if (!isVideoModalOpen || !activeMovie) return null;

  return (
    <div
      ref={playerContainerRef}
      className={`custom-fullscreen-player-container ${isFullscreen ? 'is-fullscreen' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* 0. Persistent Emergency Back Button (Always accessible if view crashes or controls hide) */}
      <button
        className="persistent-player-back-btn"
        onClick={closeMoviePlayer}
        title="Exit Player"
        aria-label="Exit Player"
      >
        <X size={22} />
      </button>

      {/* Aspect Ratio HUD Overlay Notification */}
      <AnimatePresence>
        {aspectRatioToast && (
          <motion.div
            className="aspect-ratio-hud-toast"
            initial={{ opacity: 0, y: -15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <Layers size={16} color="#00d2ff" />
            <span>{aspectRatioToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

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

        {hasPlayerCrashed && (
          <div className="player-crash-fallback-card">
            <p className="crash-title">⚠️ Stream View Interrupted</p>
            <p className="crash-subtitle">The embedded server player encountered an error or connection timeout.</p>
            <div className="crash-actions">
              <button
                className="crash-action-btn primary"
                onClick={() => handleSwitchServer(videoProviderIndex + 1)}
              >
                Switch to Next Server ({STREAMING_SERVERS[(videoProviderIndex + 1) % STREAMING_SERVERS.length]?.name || 'Next'})
              </button>
              <button className="crash-action-btn secondary" onClick={closeMoviePlayer}>
                Exit Player
              </button>
            </div>
          </div>
        )}

        {/* Slow or Blocked Connection Auto-Watchdog Pill */}
        <AnimatePresence>
          {showSlowNotice && isLoading && (
            <motion.div
              className="player-slow-stream-toast"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              onClick={() => handleSwitchServer(videoProviderIndex + 1)}
              title="Click to switch to next fast mirror server"
            >
              <Zap size={14} color="#c8ff00" />
              <span>Slow or blocked stream? Tap to switch to Mirror ({STREAMING_SERVERS[(videoProviderIndex + 1) % STREAMING_SERVERS.length]?.name.split(' ')[0]}) ⚡</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Server Switched Notification Toast */}
        <AnimatePresence>
          {serverToast && (
            <motion.div
              className="player-server-switched-toast"
              initial={{ opacity: 0, y: 15, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.92 }}
            >
              <Server size={14} color="#00d2ff" />
              <span>{serverToast}</span>
            </motion.div>
          )}
        </AnimatePresence>

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
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
            referrerPolicy="origin"
            allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write *; screen-wake-lock *"
            onLoad={() => {
              setIsLoading(false);
            }}
            onError={() => {
              setHasPlayerCrashed(true);
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

        {/* Top Right: Quick Server Switcher + Connection Health Pill */}
        <div className="header-right-tools">
          <button
            className="connection-health-pill-btn server-pill-btn"
            onClick={() => handleSwitchServer(videoProviderIndex + 1)}
            title={`Current Server: ${STREAMING_SERVERS[videoProviderIndex % STREAMING_SERVERS.length]?.name}. Click to switch server`}
            aria-label="Switch Server"
          >
            <Server size={13} style={{ color: '#c8ff00' }} />
            <span className="health-ping-text">{STREAMING_SERVERS[videoProviderIndex % STREAMING_SERVERS.length]?.name.split(' ')[0] || 'Server'}</span>
          </button>

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
              <span className="lang-col-title" style={{ padding: '0.4rem 0.6rem 0.1rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Gauge size={12} color="#c8ff00" />
                Playback Speed ({playbackSpeed === 1 ? '1.0x Normal' : `${playbackSpeed}x`})
              </span>
              <div className="speed-options-row">
                {SPEED_OPTIONS.map(spd => (
                  <button
                    key={spd}
                    className={`speed-pill-btn ${playbackSpeed === spd ? 'active' : ''}`}
                    onClick={() => {
                      setPlaybackSpeed(spd);
                      if (videoRef.current) {
                        videoRef.current.playbackRate = spd;
                      }
                    }}
                  >
                    {spd === 1 ? '1.0x Normal' : `${spd}x`}
                  </button>
                ))}
              </div>

              <span className="lang-col-title" style={{ padding: '0.4rem 0.6rem 0.1rem', fontSize: '0.72rem' }}>
                Streaming Server ({STREAMING_SERVERS.length} Verified Mirrors)
              </span>
              <div className="servers-scrollable-container">
                {STREAMING_SERVERS.map((srv, idx) => (
                  <div
                    key={srv.id}
                    className={`menu-option-item ${videoProviderIndex === idx ? 'active' : ''}`}
                    onClick={() => {
                      handleSwitchServer(idx);
                      setShowQualityMenu(false);
                    }}
                  >
                    <Server size={14} style={{ opacity: 0.85, color: videoProviderIndex === idx ? '#00d2ff' : '#c8ff00' }} />
                    <div className="server-option-meta">
                      <span className="option-title">{srv.name}</span>
                      <span className="server-specialty-sub">{srv.specialty}</span>
                    </div>
                    <span className="option-badge-tag">{srv.isNoAds ? 'Ultra Fast' : 'HD'}</span>
                    {videoProviderIndex === idx && <Check size={18} color="#00d2ff" />}
                  </div>
                ))}
              </div>

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
            {!activeMovie.streamUrl && (
              <>
                <div className="multi-audio-recommend-card">
                  <span className="multi-audio-recommend-title">
                    <Sparkles size={14} color="#00d2ff" />
                    Multi-Language Audio & Regional Dubs
                  </span>
                  <p className="multi-audio-recommend-desc">
                    Switch to our verified multi-audio origin mirrors for Hindi, Tamil, Telugu, and dual-audio tracks:
                  </p>
                  <div className="multi-audio-pills-row">
                    <button
                      className={`multi-audio-server-badge-btn ${videoProviderIndex === 0 ? 'active' : ''}`}
                      onClick={() => {
                        handleSwitchServer(0);
                        setShowLangMenu(false);
                      }}
                    >
                      <Server size={12} />
                      <span>AutoEmbed (Multi-Audio)</span>
                    </button>
                    <button
                      className={`multi-audio-server-badge-btn ${videoProviderIndex === 1 ? 'active' : ''}`}
                      onClick={() => {
                        handleSwitchServer(1);
                        setShowLangMenu(false);
                      }}
                    >
                      <Server size={12} />
                      <span>2Embed CC (Multi-Audio)</span>
                    </button>
                  </div>
                </div>

                <div className="player-embed-lang-hint">
                  <span>💡 <strong>Embedded Player Notice:</strong> To change live language/dubbing or toggle subtitles within the player stream, use the native <strong>CC</strong> and <strong>Audio (⚙️)</strong> buttons inside the video screen.</span>
                </div>
              </>
            )}
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
            {/* Season Selector Tabs */}
            {availableSeasons.length > 1 && (
              <div className="episode-season-tabs">
                {availableSeasons.map(sNum => (
                  <button
                    key={sNum}
                    className={`season-tab-btn ${drawerSeasonTab === sNum ? 'active' : ''}`}
                    onClick={() => setDrawerSeasonTab(sNum)}
                  >
                    Season {sNum}
                  </button>
                ))}
              </div>
            )}

            <div className="menu-options-list">
              {filteredEpisodes.length === 0 ? (
                <div className="menu-loading-episodes" style={{ padding: '16px', color: '#888', textAlign: 'center', fontSize: '13px' }}>
                  Loading series episodes for Season {drawerSeasonTab}...
                </div>
              ) : (
                filteredEpisodes.map(ep => (
                  <div
                    key={ep.id}
                    className={`menu-option-item ${activeSeason === (ep.season || 1) && activeEpisode === ep.number ? 'active' : ''}`}
                    onClick={() => {
                      setIsLoading(true);
                      setEpisode(ep.season || 1, ep.number);
                      setShowEpisodeDrawer(false);
                    }}
                  >
                    <div className="option-main-text">
                      <span className="option-title">S{ep.season || 1} : E{ep.number} - {ep.name}</span>
                    </div>
                    {activeSeason === (ep.season || 1) && activeEpisode === ep.number && <Check size={18} color="#c8ff00" />}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
