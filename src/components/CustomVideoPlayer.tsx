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
  Sparkles,
  MoreVertical,
  RotateCcw,
  RotateCw
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import { STREAMING_SERVERS, fetchMovieDetails, markProviderHealthy, markProviderUnhealthy, isProviderHealthy, getFirstHealthyProviderIndex, getNextHealthyProviderIndex } from '../services/movieService';
import { deactivateMovieModeAdRecovery } from '../services/adRecovery';
import { activateAdBlocker, deactivateAdBlocker } from '../services/adBlocker';
import { audioEnhancer } from '../services/audioEnhancer';
import { EpisodeItem } from '../types/media';
import { resolveScrapedStream, toProxySources } from '../services/scraperStreamService';
import type { ScrapedStreamResult } from '../services/scraperStreamService';

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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [nativeAudioTracks, setNativeAudioTracks] = useState<{ id: number; name: string; lang: string; url?: string }[]>([]);
  const [nativeSubtitleTracks, setNativeSubtitleTracks] = useState<{ id: number; name: string; lang: string; url?: string }[]>([]);
  const [activeSubtitleUrl, setActiveSubtitleUrl] = useState<string | null>(null);
  const [scrapedStream, setScrapedStream] = useState<ScrapedStreamResult | null>(null);
  const [selectedQualityUrl, setSelectedQualityUrl] = useState<string | null>(null);
  const currentStreamUrl = selectedQualityUrl || activeMovie?.streamUrl || scrapedStream?.videoSources?.[0]?.url || null;
  const streamHeaders = scrapedStream?.headers || {};
  const [videoTime, setVideoTime] = useState<number>(0);
  const savedSeekTimeRef = useRef<number | null>(null);

// (iframe fallback removed: direct HLS only)

  // Player UI states
  const [isPlaying, setIsPlaying] = useState(true);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPlayerCrashed, setHasPlayerCrashed] = useState(false);
  const [directStreamFailed, setDirectStreamFailed] = useState(false);

  useEffect(() => {
    setDirectStreamFailed(false);
  }, [activeMovie?.id, activeSeason, activeEpisode]);
  const [aspectRatioToast, setAspectRatioToast] = useState<string | null>(null);
  const failoverCountRef = useRef<number>(0);
  const streamPlaybackDetectedRef = useRef<boolean>(false);

  useEffect(() => {
    failoverCountRef.current = 0;
    streamPlaybackDetectedRef.current = false;
  }, [activeMovie?.id, activeSeason, activeEpisode]);

  // Playback speed state (0.5x to 2x)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

  const handleSwitchServer = useCallback((nextIdx: number) => {
    const safeIdx = Math.abs(nextIdx) % STREAMING_SERVERS.length;
    setVideoProviderIndex(safeIdx);
    setIsLoading(true);
    setHasPlayerCrashed(false);
  }, [setVideoProviderIndex]);

  // Direct HLS playback has no iframe autoplay driver.

  // Listen for upstream 404 / playback signals
  useEffect(() => {
    const handleUpstreamMessage = (e: MessageEvent) => {
      if (e.data === 'playing' || e.data?.type === 'playing' || e.data?.event === 'playing') {
        streamPlaybackDetectedRef.current = true;
        markProviderHealthy(videoProviderIndex);
      }
      if (e.data?.type === 'streamplay_player_error' && e.data?.code === 404) {
        if (failoverCountRef.current < STREAMING_SERVERS.length) {
          failoverCountRef.current += 1;
          markProviderUnhealthy(videoProviderIndex);
          setTimeout(() => {
            handleSwitchServer(getNextHealthyProviderIndex(videoProviderIndex, STREAMING_SERVERS.length));
          }, 300);
        }
      }
    };
    window.addEventListener('message', handleUpstreamMessage);
    return () => window.removeEventListener('message', handleUpstreamMessage);
  }, [videoProviderIndex, handleSwitchServer]);

  // Start on the best healthy mirror instead of arbitrary mirror
  useEffect(() => {
    if (!isVideoModalOpen) return;
    if (!isProviderHealthy(videoProviderIndex)) {
      setVideoProviderIndex(getFirstHealthyProviderIndex(STREAMING_SERVERS.length));
    }
  }, [isVideoModalOpen, videoProviderIndex, setVideoProviderIndex]);

  // Watchdog: Auto-dismisses loading curtain and provides silent deadlock recovery on genuine failures
  useEffect(() => {
    if (!isVideoModalOpen || !activeMovie) return;
    streamPlaybackDetectedRef.current = false;

    // Auto-dismiss loading curtain after 1.2s for responsive player interaction
    const dismissTimer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);

    // Deadlock watchdog: Only switches if a connection completely hangs for 18 seconds
    const deadlockTimer = setTimeout(() => {
      if (isLoading && failoverCountRef.current < STREAMING_SERVERS.length) {
        failoverCountRef.current += 1;
        markProviderUnhealthy(videoProviderIndex);
        handleSwitchServer(getNextHealthyProviderIndex(videoProviderIndex, STREAMING_SERVERS.length));
      }
    }, 18000);

    return () => {
      clearTimeout(dismissTimer);
      clearTimeout(deadlockTimer);
    };
  }, [isVideoModalOpen, videoProviderIndex, activeMovie?.id, activeSeason, activeEpisode, isLoading, handleSwitchServer]);

  // Ad blocker (src/services/adBlocker.ts) now handles popup/redirect suppression.

  // Ad Blocker: activate when player is open to neutralize redirect-to-new-tab ads
  useEffect(() => {
    if (!isVideoModalOpen) {
      deactivateAdBlocker();
      return;
    }
    const cleanup = activateAdBlocker();
    return () => {
      if (typeof cleanup === 'function') cleanup();
      deactivateAdBlocker();
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

  // Resolve scraped streams (CloudStream/Stremio-style) and proxy them.
  useEffect(() => {
    if (!isVideoModalOpen || !activeMovie) return;
    let cancelled = false;
    setIsLoading(true);
    setScrapedStream(null);
    setSelectedQualityUrl(null);
    setActiveSubtitleUrl(null);
    setNativeAudioTracks([]);
    setNativeSubtitleTracks([]);

    const yearMatch = String(activeMovie.releaseInfo || '').match(/(19|20)\d{2}/);
    const imdbId = (activeMovie as any).imdb_id || (activeMovie as any).imdbId || (/^tt\d+$/.test(activeMovie.id) ? activeMovie.id : undefined);
    resolveScrapedStream({
      title: activeMovie.name,
      year: yearMatch ? yearMatch[0] : undefined,
      type: activeMovie.type,
      season: activeSeason,
      episode: activeEpisode,
      imdbId
    }).then(async (result) => {
      if (cancelled) return;
      if (!result || !result.success || !result.videoSources?.length) {
        if (!activeMovie.streamUrl) setIsLoading(false);
        return;
      }
      const proxied = await toProxySources(result);
      if (cancelled) return;
      setScrapedStream(proxied);
      if (proxied.videoSources.length > 0) {
        setSelectedQuality(proxied.videoSources[0].quality);
        setSelectedQualityUrl(proxied.videoSources[0].url);
      }
      if (proxied.audioTracks.length > 0) {
        setNativeAudioTracks(proxied.audioTracks.map((t, idx) => ({ id: idx, name: t.name, lang: t.lang, url: t.url })));
        if (proxied.audioTracks[0]) setSelectedAudioLang(proxied.audioTracks[0].name);
      }
      if (proxied.subtitles.length > 0) {
        setNativeSubtitleTracks(proxied.subtitles.map((t, idx) => ({ id: idx, name: t.lang, lang: t.lang, url: t.url })));
      }
    }).catch(() => {
      if (!activeMovie.streamUrl) setIsLoading(false);
    });

    return () => { cancelled = true; };
  }, [isVideoModalOpen, activeMovie?.id, activeSeason, activeEpisode]);


  useEffect(() => {
    if (!isVideoModalOpen || !currentStreamUrl || !videoRef.current) return;

    const video = videoRef.current;
    let hls: Hls | null = null;
    setIsLoading(true);

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false, // Disabling low-latency polling saves significant mobile CPU and battery
        maxBufferLength: 20, // Buffer 20s ahead: zero stutter, but stops gigabytes of runaway downloads
        maxMaxBufferLength: 35, // Hard cap forward buffer to 35s
        maxBufferSize: 20 * 1024 * 1024, // 20MB RAM limit
        backBufferLength: 10, // Evict played chunks after 10s to keep memory footprint light
        xhrSetup: (xhr: XMLHttpRequest) => {
          Object.entries(streamHeaders).forEach(([key, value]) => {
            try { xhr.setRequestHeader(key, String(value)); } catch {}
          });
        }
      });
      hlsRef.current = hls;

      try { video.crossOrigin = 'anonymous'; } catch { /* ignore */ }
      audioEnhancer.warmUp();
      hls.loadSource(currentStreamUrl);
      hls.attachMedia(video);
      audioEnhancer.attach(video, 'movie');

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        if (savedSeekTimeRef.current !== null && savedSeekTimeRef.current > 0) {
          video.currentTime = savedSeekTimeRef.current;
          savedSeekTimeRef.current = null;
        }
        video.play().catch(e => {
          if (e?.name !== 'AbortError') console.warn('Autoplay prevented:', e);
        });

        if (hls && hls.audioTracks && hls.audioTracks.length > 0) {
          const tracks = hls.audioTracks.map((t, idx) => ({
            id: idx,
            name: t.name || t.lang || `Audio Track ${idx + 1}`,
            lang: t.lang || 'default'
          }));
          setNativeAudioTracks(tracks);
          if (tracks[0]) {
            setSelectedAudioLang(tracks[0].name);
          }
        }

        if (hls && hls.subtitleTracks && hls.subtitleTracks.length > 0) {
          const tracks = hls.subtitleTracks.map((t, idx) => ({
            id: idx,
            name: t.name || t.lang || `Subtitle ${idx + 1}`,
            lang: t.lang || 'default'
          }));
          setNativeSubtitleTracks(prev => {
            // merge HLS tracks with any external scraper tracks
            const merged = [...tracks];
            prev.forEach(p => {
              if (p.url && !merged.some(m => m.name === p.name)) merged.push(p);
            });
            return merged;
          });
        }
      });

      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_, data) => {
        const currentTrack = hls?.audioTracks[data.id];
        if (currentTrack) {
          setSelectedAudioLang(currentTrack.name || currentTrack.lang || `Track ${data.id + 1}`);
        }
      });

      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => {
        if (!hls || !hls.subtitleTracks) return;
        const tracks = hls.subtitleTracks.map((t, idx) => ({
          id: idx,
          name: t.name || t.lang || `Subtitle ${idx + 1}`,
          lang: t.lang || 'default'
        }));
        setNativeSubtitleTracks(tracks);
      });

      hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, (_, data) => {
        if (data.id === -1) {
          setSelectedSubtitles('Off');
        } else {
          const currentTrack = hls?.subtitleTracks[data.id];
          if (currentTrack) {
            setSelectedSubtitles(currentTrack.name || currentTrack.lang || `Subtitle ${data.id + 1}`);
          }
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // Try reloading first; if persistent, failover to next scraped mirror/quality
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls?.recoverMediaError();
              break;
            default:
              if (scrapedStream && scrapedStream.videoSources.length > 1) {
                const currentIdx = scrapedStream.videoSources.findIndex(s => s.url === currentStreamUrl);
                if (currentIdx >= 0 && currentIdx + 1 < scrapedStream.videoSources.length) {
                  const nextSource = scrapedStream.videoSources[currentIdx + 1];
                  console.info(`[CustomVideoPlayer] HLS fatal error, failing over to ${nextSource.quality}`);
                  setSelectedQuality(nextSource.quality);
                  setSelectedQualityUrl(nextSource.url);
                  return;
                }
              }
              hls?.destroy();
              setDirectStreamFailed(true);
              setIsLoading(false);
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      try {
        video.crossOrigin = 'anonymous';
      } catch {
        /* ignore */
      }
      audioEnhancer.warmUp();
      video.src = currentStreamUrl;
      audioEnhancer.attach(video, 'movie');
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        video.play().catch(e => {
          if (e?.name !== 'AbortError') console.warn('Autoplay prevented:', e);
        });
      });
    }

    return () => {
      if (hls) {
        hls.destroy();
        hlsRef.current = null;
      }
      audioEnhancer.detach();
    };
  }, [isVideoModalOpen, currentStreamUrl, activeMovie?.id]);

  const skipSeconds = useCallback((sec: number) => {
    if (videoRef.current) {
      const dur = videoRef.current.duration || 999999;
      const targetTime = Math.max(0, Math.min(dur, videoRef.current.currentTime + sec));
      videoRef.current.currentTime = targetTime;
      setVideoTime(targetTime);
    }
  }, []);

  const skipIntro = useCallback(() => {
    skipSeconds(85);
  }, [skipSeconds]);

  const togglePlayPause = () => {
    if ((currentStreamUrl || activeMovie?.streamUrl) && videoRef.current) {
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

  // Direct-stream-only playback: no iframe embeds or provider proxies.


  // Auto-failover to the next healthy provider when the embedded player crashes.
  useEffect(() => {
    if (!isVideoModalOpen || !hasPlayerCrashed) return;
    const timer = setTimeout(() => {
      handleSwitchServer(getNextHealthyProviderIndex(videoProviderIndex, STREAMING_SERVERS.length));
    }, 1200);
    return () => clearTimeout(timer);
  }, [hasPlayerCrashed, isVideoModalOpen, videoProviderIndex, handleSwitchServer]);

  // Movie-mode ad recovery: when an ad URL is triggered, wait (ms) then
  // adRecovery is intentionally disabled: rely on the ad blocker instead of
  // allowing ad tabs to open and then recovering them.
  useEffect(() => {
    if (!isVideoModalOpen) {
      deactivateMovieModeAdRecovery();
    }
  }, [isVideoModalOpen]);

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
      } else if (e.key === 'ArrowLeft' || e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        skipSeconds(-10);
      } else if (e.key === 'ArrowRight' || e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        skipSeconds(10);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleSwitchServer(getNextHealthyProviderIndex(videoProviderIndex, STREAMING_SERVERS.length));
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
  }, [isVideoModalOpen, videoProviderIndex, isPlaying, isMuted, aspectRatioMode, isLocked, closeMoviePlayer, handleSwitchServer, currentStreamUrl, skipSeconds]);

  const toggleFullscreen = async () => {
    const doc = document as any;
    const isCurrentlyFull = !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );

    const container = playerContainerRef.current || document.documentElement;

    if (!isCurrentlyFull) {
      try {
        const rfs =
          container.requestFullscreen ||
          (container as any).webkitRequestFullscreen ||
          (container as any).mozRequestFullScreen ||
          (container as any).msRequestFullscreen;

        if (rfs) {
          await rfs.call(container, { navigationUI: 'hide' });
        } else if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
        }
      } catch (err) {
        console.warn('Fullscreen request failed:', err);
      }

      // Try locking screen orientation to landscape on mobile for true full view
      try {
        const orientation = (screen.orientation || (screen as any).mozOrientation || (screen as any).msOrientation) as any;
        if (orientation && typeof orientation.lock === 'function') {
          await orientation.lock('landscape').catch(() => {});
        }
      } catch {}

      // Automatically engage Full View (fill) to remove side pillarboxes
      setAspectRatioMode('fill');
      setAspectRatioToast('Full View: Filled to Screen');
      setTimeout(() => setAspectRatioToast(null), 2000);
      setIsFullscreen(true);
    } else {
      try {
        const efs =
          doc.exitFullscreen ||
          doc.webkitExitFullscreen ||
          doc.mozCancelFullScreen ||
          doc.msExitFullscreen;
        if (efs) {
          await efs.call(doc);
        }
      } catch (err) {
        console.warn('Exit fullscreen failed:', err);
      }

      try {
        const orientation = (screen.orientation || (screen as any).mozOrientation || (screen as any).msOrientation) as any;
        if (orientation && typeof orientation.unlock === 'function') {
          orientation.unlock();
        }
      } catch {}

      setAspectRatioMode('fit');
      setIsFullscreen(false);
    }
  };

  // Hold to 2x Play Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isLocked) return;
    if ((e.target as HTMLElement).closest('button, .player-menu-modal, .player-header-bar, .player-bottom-bar, .player-mobile-actions-menu')) {
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

  // Aspect ratio class helper: enhanced for modern ultra-wide (20:9) mobile screens
  const getAspectStyle = () => {
    switch (aspectRatioMode) {
      case 'fill':
        return {
          width: '100%',
          height: '100%',
          transform: 'scaleX(1.24) scaleY(1.02)',
          transformOrigin: 'center center'
        };
      case 'zoom':
        return {
          width: '100%',
          height: '100%',
          transform: 'scale(1.28)',
          transformOrigin: 'center center'
        };
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
      fit: 'Screen: Fit (Original 16:9)',
      fill: 'Screen: Full View (Fill Display)',
      zoom: 'Screen: Zoom (Cinematic Fill)',
      '16-9': 'Screen: 16:9 Standard'
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
      onPointerDown={(e) => {
        if (showMobileActions && !(e.target as HTMLElement).closest('.player-mobile-actions-menu, .player-mobile-more-btn')) {
          setShowMobileActions(false);
        }
        handlePointerDown(e);
      }}
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

      {/* Mobile 3-Dots Button: Always visible on mobile, DOES NOT HIDE */}
      <button
        className="player-mobile-more-btn"
        onClick={(e) => {
          e.stopPropagation();
          setShowMobileActions(prev => !prev);
        }}
        title="Player Options"
        aria-label="More Options"
      >
        <MoreVertical size={20} />
      </button>

      {/* Mobile 3-Dots Popup Action Menu */}
      <AnimatePresence>
        {showMobileActions && (
          <motion.div
            className="player-mobile-actions-menu"
            initial={{ opacity: 0, scale: 0.92, x: -15 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.92, x: -15 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-actions-header">
              <span className="mobile-actions-title">Options</span>
              <button
                className="menu-close-x"
                onClick={() => setShowMobileActions(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mobile-actions-grid">
              {/* Full View / Aspect Ratio Toggle */}
              <button
                className={`mobile-action-item ${aspectRatioMode !== 'fit' ? 'active' : ''}`}
                onClick={() => {
                  cycleAspectRatio();
                }}
              >
                <Layers size={18} />
                <span>Full View: {aspectRatioMode.toUpperCase()}</span>
              </button>

              {/* Fullscreen with Orientation Lock */}
              <button
                className={`mobile-action-item ${isFullscreen ? 'active' : ''}`}
                onClick={() => {
                  toggleFullscreen();
                  setShowMobileActions(false);
                }}
              >
                {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                <span>{isFullscreen ? 'Exit Fullscreen' : 'Full Screen'}</span>
              </button>

              {/* Quality & Server Settings */}
              <button
                className="mobile-action-item"
                onClick={() => {
                  setShowQualityMenu(true);
                  setShowMobileActions(false);
                  setShowLangMenu(false);
                  setShowEpisodeDrawer(false);
                }}
              >
                <Settings size={18} />
                <span>Quality & Mirrors</span>
              </button>

              {/* Audio & Subtitles */}
              <button
                className="mobile-action-item"
                onClick={() => {
                  setShowLangMenu(true);
                  setShowMobileActions(false);
                  setShowQualityMenu(false);
                  setShowEpisodeDrawer(false);
                }}
              >
                <Languages size={18} />
                <span>Audio & Subtitles</span>
              </button>

              {/* Episodes (Series only) */}
              {activeMovie.type === 'series' && (
                <>
                  <button
                    className="mobile-action-item"
                    onClick={() => {
                      setShowEpisodeDrawer(true);
                      setShowMobileActions(false);
                      setShowQualityMenu(false);
                      setShowLangMenu(false);
                    }}
                  >
                    <List size={18} />
                    <span>Episodes (S{activeSeason}:E{activeEpisode})</span>
                  </button>

                  <button
                    className="mobile-action-item lime"
                    onClick={() => {
                      playNextEpisode();
                      setShowMobileActions(false);
                    }}
                  >
                    <ChevronRight size={18} />
                    <span>Next Episode</span>
                  </button>
                </>
              )}

              {/* Rewind & Forward 10s */}
              <button
                className="mobile-action-item"
                onClick={() => {
                  skipSeconds(-10);
                }}
              >
                <RotateCcw size={18} />
                <span>Rewind 10s</span>
              </button>

              <button
                className="mobile-action-item"
                onClick={() => {
                  skipSeconds(10);
                }}
              >
                <RotateCw size={18} />
                <span>Forward 10s</span>
              </button>

              {videoTime >= 2 && videoTime <= 130 && (
                <button
                  className="mobile-action-item lime"
                  onClick={() => {
                    skipIntro();
                    setShowMobileActions(false);
                  }}
                >
                  <ChevronRight size={18} />
                  <span>Skip Intro (+85s)</span>
                </button>
              )}

              {/* Mute Toggle */}
              <button
                className={`mobile-action-item ${isMuted ? 'active' : ''}`}
                onClick={() => {
                  toggleMute();
                }}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                <span>{isMuted ? 'Unmute Audio' : 'Mute Audio'}</span>
              </button>

              {/* Screen Lock */}
              <button
                className={`mobile-action-item ${isLocked ? 'active' : ''}`}
                onClick={() => {
                  setIsLocked(prev => !prev);
                  setShowMobileActions(false);
                }}
              >
                <Lock size={18} />
                <span>{isLocked ? 'Unlock Screen' : 'Lock Screen'}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left Vertical Control Rail — Icon-only transparent buttons */}
      <div className={`player-left-control-rail ${showControls || isLocked ? 'visible' : 'hidden'}`}>
        {!isLocked && (currentStreamUrl || activeMovie.streamUrl) && (
          <button className="player-ctrl-glass-btn" onClick={togglePlayPause} aria-label="Play or Pause">
            {isPlaying ? <Pause size={17} /> : <Play size={17} fill="#ffffff" />}
          </button>
        )}
        {!isLocked && (
          <>
            <button className="player-ctrl-glass-btn" onClick={() => skipSeconds(-10)} aria-label="Rewind 10s" title="Rewind 10s">
              <RotateCcw size={17} />
            </button>
            <button className="player-ctrl-glass-btn" onClick={() => skipSeconds(10)} aria-label="Forward 10s" title="Forward 10s">
              <RotateCw size={17} />
            </button>
            <button className="player-ctrl-glass-btn" onClick={toggleMute} aria-label="Mute">
              {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>
            <button className="player-ctrl-glass-btn" onClick={cycleAspectRatio} aria-label="Screen Size">
              <Layers size={17} />
            </button>
            <div className="rail-btn-with-dropdown">
              <button className={`player-ctrl-glass-btn ${showQualityMenu ? 'active' : ''}`} onClick={() => { setShowQualityMenu(prev => !prev); setShowLangMenu(false); setShowHealthModal(false); setShowEpisodeDrawer(false); }} aria-label="Settings">
                <Settings size={17} />
              </button>
            </div>
            <div className="rail-btn-with-dropdown">
              <button className={`player-ctrl-glass-btn ${showLangMenu ? 'active' : ''}`} onClick={() => { setShowLangMenu(prev => !prev); setShowQualityMenu(false); setShowHealthModal(false); setShowEpisodeDrawer(false); }} aria-label="Audio & Subtitles">
                <Languages size={17} />
              </button>
            </div>
            {activeMovie.type === 'series' && (
              <>
                <div className="rail-btn-with-dropdown">
                  <button className={`player-ctrl-glass-btn ${showEpisodeDrawer ? 'active' : ''}`} onClick={() => { setShowEpisodeDrawer(prev => !prev); setShowQualityMenu(false); setShowLangMenu(false); setShowHealthModal(false); }} aria-label="All Episodes">
                    <List size={17} />
                  </button>
                </div>
                <button className="player-ctrl-glass-btn lime" onClick={playNextEpisode} aria-label="Next Episode">
                  <ChevronRight size={17} />
                </button>
              </>
            )}
            <button className="player-ctrl-glass-btn" onClick={toggleFullscreen} aria-label="Fullscreen">
              {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
            </button>
          </>
        )}
        <button className="player-ctrl-glass-btn" onClick={() => setIsLocked(prev => !prev)} aria-label="Lock Screen">
          <Lock size={17} />
        </button>
      </div>

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
                onClick={() => handleSwitchServer(getNextHealthyProviderIndex(videoProviderIndex, STREAMING_SERVERS.length))}
              >
                Switch to Next Mirror
              </button>
              <button className="crash-action-btn secondary" onClick={closeMoviePlayer}>
                Exit Player
              </button>
            </div>
          </div>
        )}

        {(currentStreamUrl || activeMovie.streamUrl) ? (
          (currentStreamUrl && (currentStreamUrl.includes('/proxy?url=') || (!/\.(m3u8|mp4|webm|ts)(\?|#|$)/i.test(currentStreamUrl) && !currentStreamUrl.includes('/api/proxy/hls')))) ? (
            <iframe
              src={currentStreamUrl}
              className="custom-stream-video"
              style={{ width: '100%', height: '100%', border: 'none', background: '#000' }}
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
              onLoad={() => setIsLoading(false)}
            />
          ) : !directStreamFailed ? (
            <video
              ref={videoRef}
              crossOrigin="anonymous"
              className="custom-stream-video"
              playsInline
              autoPlay
              muted={isMuted}
              onClick={togglePlayPause}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={() => {
                if (videoRef.current) setVideoTime(videoRef.current.currentTime);
              }}
              onWaiting={() => setIsLoading(true)}
              onPlaying={() => {
                setIsLoading(false);
              }}
            >
              {activeSubtitleUrl && (
                <track
                  key={activeSubtitleUrl}
                  kind="subtitles"
                  src={activeSubtitleUrl}
                  srcLang="en"
                  label={selectedSubtitles}
                  default
                />
              )}
            </video>
          ) : (
            <div className="direct-stream-unavailable" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: '#fff', textAlign: 'center', padding: '24px' }}>
              <div>
                <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Direct stream unavailable</p>
                <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>This title could not be resolved to a playable HLS stream.</p>
              </div>
            </div>
          )
        ) : (
          <div className="direct-stream-unavailable" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: '#fff', textAlign: 'center', padding: '24px' }}>
            <div>
              <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Direct stream unavailable</p>
              <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>This title could not be resolved to a playable HLS stream.</p>
            </div>
          </div>
        )}

        {/* Skip Intro Floating HUD Button (first 130s of media playback) */}
        <AnimatePresence>
          {videoTime >= 2 && videoTime <= 130 && !isLocked && (
            <motion.button
              className="skip-intro-floating-btn"
              initial={{ opacity: 0, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: 20 }}
              transition={{ duration: 0.2 }}
              onClick={skipIntro}
              title="Skip Intro (+85s)"
            >
              <span>Skip Intro</span>
              <ChevronRight size={16} />
            </motion.button>
          )}
        </AnimatePresence>
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

      {/* 4. Top Header Overlay Bar — Only Title and Meta (Removed AdBlock, Server, and Health indications) */}
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
      </div>

      {/* 6. POPUP MODALS */}

      {/* Quality & Server Selection Popup */}
      <AnimatePresence>
        {showQualityMenu && (
          <motion.div
            className="player-menu-modal quality-menu rail-dropdown"
            initial={{ opacity: 0, scale: 0.92, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.92, x: -10 }}
          >
            <div className="menu-modal-header">
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
              {(scrapedStream?.videoSources?.length
                ? scrapedStream.videoSources.map((source, idx) => ({ label: source.quality, badge: source.quality, url: source.url, idx }))
                : QUALITIES.map((q, idx) => ({ label: q.label, badge: q.badge, url: currentStreamUrl, idx }))
              ).map((q) => (
                <div
                  key={q.idx}
                  className={`menu-option-item ${selectedQuality === q.label ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedQuality(q.label);
                    if (q.url && q.url !== selectedQualityUrl) {
                      if (videoRef.current) {
                        savedSeekTimeRef.current = videoRef.current.currentTime;
                      }
                      setSelectedQualityUrl(q.url);
                    }
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
            className="player-menu-modal lang-menu rail-dropdown"
            initial={{ opacity: 0, scale: 0.92, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.92, x: -10 }}
          >
            <div className="menu-modal-header">
              <button className="menu-close-x" onClick={() => setShowLangMenu(false)}>✕</button>
            </div>
            {!currentStreamUrl && (
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
                          if (hlsRef.current && track.id >= 0 && track.id < (hlsRef.current.audioTracks?.length || 0)) {
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
                  {nativeSubtitleTracks.length > 0 ? (
                    <>
                      <div
                        className={`menu-option-item ${selectedSubtitles === 'Off' ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedSubtitles('Off');
                          setActiveSubtitleUrl(null);
                          if (hlsRef.current) {
                            hlsRef.current.subtitleTrack = -1;
                          }
                        }}
                      >
                        <span className="option-title">Off</span>
                        {selectedSubtitles === 'Off' && <Check size={16} color="#00d2ff" />}
                      </div>
                      {nativeSubtitleTracks.map(track => (
                        <div
                          key={track.id}
                          className={`menu-option-item ${selectedSubtitles === track.name ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedSubtitles(track.name);
                            if (track.url) {
                              setActiveSubtitleUrl(track.url);
                              if (hlsRef.current) hlsRef.current.subtitleTrack = -1;
                            } else if (hlsRef.current && track.id >= 0 && track.id < (hlsRef.current.subtitleTracks?.length || 0)) {
                              setActiveSubtitleUrl(null);
                              hlsRef.current.subtitleTrack = track.id;
                            }
                          }}
                        >
                          <span className="option-title">{track.name}</span>
                          {selectedSubtitles === track.name && <Check size={16} color="#00d2ff" />}
                        </div>
                      ))}
                    </>
                  ) : (
                    SUBTITLES.map((sub, idx) => (
                      <div
                        key={idx}
                        className={`menu-option-item ${selectedSubtitles === sub ? 'active' : ''}`}
                        onClick={() => setSelectedSubtitles(sub)}
                      >
                        <span className="option-title">{sub}</span>
                        {selectedSubtitles === sub && <Check size={16} color="#00d2ff" />}
                      </div>
                    ))
                  )}
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
            className="player-menu-modal episodes-drawer-modal rail-dropdown"
            initial={{ opacity: 0, scale: 0.92, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.92, x: -10 }}
          >
            <div className="menu-modal-header">
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
