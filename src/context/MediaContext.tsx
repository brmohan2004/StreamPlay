import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { MovieItem, SongItem } from '../types/media';
import { audioEnhancer } from '../services/audioEnhancer';
import { logSignal } from '../services/recommendationTracker';
import { AudioBufferWatchdog } from '../services/streamingWatchdog';
import { getAudioStreamForQuality, fetchInfiniteLanguageSongs, AudioQualitySetting } from '../services/musicService';
import {
  startNativeBackgroundAudio,
  updateNativeBackgroundAudio,
  stopNativeBackgroundAudio,
  listenToNativeMediaActions,
  enableAudioPipelineKeepAlive
} from '../services/nativeBackgroundAudio';
import { getUserLocation, setUserLocation, UserLocation } from '../services/locationService';
import { resolveSecureStream } from '../services/directStreamService';
import { STREAMING_SERVERS, getFirstHealthyProviderIndex } from '../services/movieService';

// Helper: fire a custom event so RecommendationContext knows to refresh
function notifyRecUpdate() {
  window.dispatchEvent(new CustomEvent('streamplay-rec-update'));
}

interface MediaContextType {
  // Movie Details state
  selectedMovie: MovieItem | null;
  openMovieDetails: (movie: MovieItem) => void;
  closeMovieDetails: () => void;

  // Video Player state
  activeMovie: MovieItem | null;
  activeSeason: number;
  activeEpisode: number;
  isVideoModalOpen: boolean;
  videoProviderIndex: number;
  openMoviePlayer: (movie: MovieItem, season?: number, episode?: number) => void;
  closeMoviePlayer: () => void;
  cycleVideoProvider: () => void;
  setVideoProviderIndex: (idx: number) => void;
  playNextEpisode: () => void;
  setEpisode: (season: number, episode: number) => void;

  // Audio / Music Player state
  currentSong: SongItem | null;
  isPlayingSong: boolean;
  songQueue: SongItem[];
  songProgress: number;
  songDuration: number;
  songVolume: number;
  playSong: (song: SongItem, queue?: SongItem[]) => void;
  toggleSongPlay: () => void;
  stopSong: () => void;
  nextSong: () => void;
  prevSong: () => void;
  seekSong: (timeInSeconds: number) => void;
  setSongVolume: (vol: number) => void;

  // Recently Played Songs History
  recentlyPlayed: SongItem[];
  watchedVideoSongs: SongItem[];

  // Fullscreen Music Player Modal
  isMusicPlayerOpen: boolean;
  openMusicPlayer: () => void;
  closeMusicPlayer: () => void;
  isShuffle: boolean;
  toggleShuffle: () => void;
  isRepeat: boolean;
  toggleRepeat: () => void;
  playbackMode: 'audio' | 'video';
  setPlaybackMode: (mode: 'audio' | 'video') => void;
  likedSongs: string[];
  toggleLikeSong: (id: string) => void;
  isLikedSong: (id: string) => boolean;

  // Multi-Provider Audio Quality
  audioQuality: AudioQualitySetting;
  setAudioQuality: (q: AudioQualitySetting) => void;

  // Video Songs Support
  openVideoSong: (song: SongItem, queue?: SongItem[]) => void;

  // Language Preferences (Primary & Secondary)
  primaryLanguage: string;
  setPrimaryLanguage: (lang: string) => void;
  secondaryLanguage: string;
  setSecondaryLanguage: (lang: string) => void;

  // User Location & Regional Personalization
  userLocation: UserLocation;
  changeUserLocation: (locationId: string) => void;

  // Video Streaming Quality
  videoQuality: string;
  setVideoQuality: (q: string) => void;

  // Default Launch Mode
  defaultLaunchMode: 'movies' | 'music';
  setDefaultLaunchMode: (mode: 'movies' | 'music') => void;

  // Watch Later & History
  watchLater: MovieItem[];
  toggleWatchLater: (movie: MovieItem) => void;
  isWatchLater: (id: string) => boolean;
  continueWatching: MovieItem[];
  addToContinueWatching: (movie: MovieItem) => void;

  // Playlists
  playlists: { id: string; name: string; songs: SongItem[]; cover?: string }[];
  createPlaylist: (name: string, initialSong?: SongItem) => void;
  editPlaylist: (playlistId: string, newName: string) => void;
  deletePlaylist: (playlistId: string) => void;
  removeSongFromPlaylist: (playlistId: string, songId: string) => void;
  addSongToPlaylist: (playlistId: string, song: SongItem) => void;
  isSongInPlaylist: (playlistId: string, songId: string | number) => boolean;

  // Add to Playlist Modal state
  songToAddToPlaylist: SongItem | null;
  openAddToPlaylist: (song: SongItem) => void;
  closeAddToPlaylist: () => void;

  // Audio Enhancer Modal state
  isAudioEnhancerOpen: boolean;
  openAudioEnhancer: (mode?: 'music' | 'movie') => void;
  closeAudioEnhancer: () => void;
  toggleAudioEnhancer: (mode?: 'music' | 'movie') => void;
}

const MediaContext = createContext<MediaContextType | undefined>(undefined);

export const MediaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Movie Details
  const [selectedMovie, setSelectedMovie] = useState<MovieItem | null>(null);

  // Video Player
  const [activeMovie, setActiveMovie] = useState<MovieItem | null>(null);
  const [activeSeason, setActiveSeason] = useState(1);
  const [activeEpisode, setActiveEpisode] = useState(1);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [videoProviderIndex, setVideoProviderIndex] = useState(0);

  const openMovieDetails = (movie: MovieItem) => {
    setSelectedMovie(movie);
    // Track: user opened movie details
    logSignal({
      type: 'detail_view',
      itemId: movie.id,
      itemType: movie.type || 'movie',
      timestamp: Date.now(),
      metadata: {
        genres: movie.genres,
        ottProvider: movie.ottProvider,
        query: movie.name,
      },
    });
    notifyRecUpdate();
  };

  const closeMovieDetails = () => {
    setSelectedMovie(null);
  };


  // Audio Player
  const [currentSong, setCurrentSong] = useState<SongItem | null>(() => {
    try {
      const saved = localStorage.getItem('streamplay_last_played_song');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isPlayingSong, setIsPlayingSong] = useState(false);
  const [songQueue, setSongQueue] = useState<SongItem[]>(() => {
    try {
      const saved = localStorage.getItem('streamplay_song_queue');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [songProgress, setSongProgress] = useState(0);
  const [songDuration, setSongDuration] = useState(0);
  const [songVolume, setVolumeState] = useState(0.85);

  // Recently Played Songs History (Persisted to localStorage)
  const [recentlyPlayed, setRecentlyPlayed] = useState<SongItem[]>(() => {
    try {
      const stored = localStorage.getItem('streamplay_recently_played_songs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Watched Video Songs History (Persisted to localStorage)
  const [watchedVideoSongs, setWatchedVideoSongs] = useState<SongItem[]>(() => {
    try {
      const stored = localStorage.getItem('streamplay_watched_video_songs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Fullscreen Music Player Modal & Playback options
  const [isMusicPlayerOpen, setIsMusicPlayerOpen] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [playbackMode, setPlaybackMode] = useState<'audio' | 'video'>('audio');

  // Liked Songs
  const [likedSongs, setLikedSongs] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('streamplay_liked_songs') || '[]');
    } catch {
      return [];
    }
  });

  // Language Preferences (Primary & Secondary)
  const [primaryLanguage, setPrimaryLanguageState] = useState<string>(() => {
    return localStorage.getItem('streamplay_primary_lang') || 'Tamil';
  });

  const [secondaryLanguage, setSecondaryLanguageState] = useState<string>(() => {
    return localStorage.getItem('streamplay_secondary_lang') || 'English';
  });

  const setPrimaryLanguage = (lang: string) => {
    setPrimaryLanguageState(lang);
    localStorage.setItem('streamplay_primary_lang', lang);
  };

  const setSecondaryLanguage = (lang: string) => {
    setSecondaryLanguageState(lang);
    localStorage.setItem('streamplay_secondary_lang', lang);
  };

  // User Location & Regional Personalization
  const [userLocation, setUserLocationState] = useState<UserLocation>(() => getUserLocation());
  const changeUserLocation = (locationId: string) => {
    const updated = setUserLocation(locationId);
    setUserLocationState(updated);
    notifyRecUpdate();
  };

  // Video Streaming Quality
  const [videoQuality, setVideoQualityState] = useState<string>(() => {
    return localStorage.getItem('streamplay_setting_video_quality') || 'auto';
  });
  const setVideoQuality = (q: string) => {
    setVideoQualityState(q);
    localStorage.setItem('streamplay_setting_video_quality', q);
  };

  // Default Launch Mode
  const [defaultLaunchMode, setDefaultLaunchModeState] = useState<'movies' | 'music'>(() => {
    const saved = localStorage.getItem('streamplay_default_launch_mode');
    return (saved === 'movies' || saved === 'music') ? saved : 'movies';
  });
  const setDefaultLaunchMode = (mode: 'movies' | 'music') => {
    setDefaultLaunchModeState(mode);
    localStorage.setItem('streamplay_default_launch_mode', mode);
  };

  const openMusicPlayer = () => setIsMusicPlayerOpen(true);
  const closeMusicPlayer = () => setIsMusicPlayerOpen(false);
  const toggleShuffle = () => {
    setIsShuffle(prev => {
      const nextVal = !prev;
      if (nextVal && songQueue.length > 1) {
        const current = currentSongRef.current;
        const rest = songQueue.filter(s => String(s.id) !== String(current?.id));
        for (let i = rest.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [rest[i], rest[j]] = [rest[j], rest[i]];
        }
        const shuffled = current ? [current, ...rest] : rest;
        setSongQueue(shuffled);
        songQueueRef.current = shuffled;
      }
      return nextVal;
    });
  };
  const toggleRepeat = () => setIsRepeat(prev => !prev);

  const toggleLikeSong = (songId: string) => {
    setLikedSongs(prev => {
      const wasLiked = prev.includes(songId);
      const updated = wasLiked ? prev.filter(id => id !== songId) : [...prev, songId];
      localStorage.setItem('streamplay_liked_songs', JSON.stringify(updated));

      // Track: like or unlike
      const song = currentSongRef.current;
      logSignal({
        type: wasLiked ? 'unlike' : 'like',
        itemId: songId,
        itemType: 'song',
        timestamp: Date.now(),
        metadata: {
          artist: song?.artist,
          language: song?.language,
          query: song?.title,
        },
      });
      notifyRecUpdate();

      return updated;
    });
  };

  const isLikedSong = (songId: string) => likedSongs.includes(songId);

  const openVideoSong = (song: SongItem, queue?: SongItem[]) => {
    // If song has no videoUrl, assign a high-def video stream embed or fallback
    const videoSongItem: SongItem = {
      ...song,
      isVideo: true,
      videoUrl: song.videoUrl || `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(song.title + ' ' + song.artist + ' official video')}`
    };

    setWatchedVideoSongs(prev => {
      const idKey = String(song.id || '');
      const filtered = prev.filter(s => String(s.id || '') !== idKey);
      const updated = [videoSongItem, ...filtered].slice(0, 30);
      try {
        localStorage.setItem('streamplay_watched_video_songs', JSON.stringify(updated));
      } catch (err) {
        console.warn('Failed to save watched video songs:', err);
      }
      return updated;
    });

    setPlaybackMode('video');
    playSong(videoSongItem, queue);
    setIsMusicPlayerOpen(true);
  };

  // Watch Later & Playlists State (persisted to localStorage)
  const [watchLater, setWatchLater] = useState<MovieItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('streamplay_watchlater') || '[]');
    } catch {
      return [];
    }
  });

  const [continueWatching, setContinueWatching] = useState<MovieItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('streamplay_continuewatching') || '[]');
    } catch {
      return [];
    }
  });

  const [playlists, setPlaylists] = useState<{ id: string; name: string; songs: SongItem[]; cover?: string }[]>(() => {
    try {
      const stored = localStorage.getItem('streamplay_playlists');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Add to Playlist modal state
  const [songToAddToPlaylist, setSongToAddToPlaylist] = useState<SongItem | null>(null);

  const openAddToPlaylist = (song: SongItem) => {
    setSongToAddToPlaylist(song);
  };

  const closeAddToPlaylist = () => {
    setSongToAddToPlaylist(null);
  };

  // Audio Enhancer Modal state
  const [isAudioEnhancerOpen, setIsAudioEnhancerOpen] = useState(false);

  const openAudioEnhancer = (mode?: 'music' | 'movie') => {
    if (mode) audioEnhancer.setMode(mode);
    audioEnhancer.warmUp();
    setIsAudioEnhancerOpen(true);
  };

  const closeAudioEnhancer = () => {
    setIsAudioEnhancerOpen(false);
  };

  const toggleAudioEnhancer = (mode?: 'music' | 'movie') => {
    if (isAudioEnhancerOpen) {
      closeAudioEnhancer();
    } else {
      openAudioEnhancer(mode);
    }
  };

  const isSongInPlaylist = (playlistId: string, songId: string | number) => {
    const pl = playlists.find(p => p.id === playlistId);
    return pl ? pl.songs.some(s => String(s.id) === String(songId)) : false;
  };

  const toggleWatchLater = (movie: MovieItem) => {
    setWatchLater(prev => {
      const exists = prev.some(m => m.id === movie.id);
      const updated = exists ? prev.filter(m => m.id !== movie.id) : [movie, ...prev];
      localStorage.setItem('streamplay_watchlater', JSON.stringify(updated));

      // Track: add to watchlist (only on add, not remove)
      if (!exists) {
        logSignal({
          type: 'add_watchlist',
          itemId: movie.id,
          itemType: movie.type || 'movie',
          timestamp: Date.now(),
          metadata: {
            genres: movie.genres,
            ottProvider: movie.ottProvider,
            query: movie.name,
          },
        });
        notifyRecUpdate();
      }

      return updated;
    });
  };

  const isWatchLater = (id: string) => watchLater.some(m => m.id === id);

  const addToContinueWatching = (movie: MovieItem) => {
    setContinueWatching(prev => {
      const filtered = prev.filter(m => m.id !== movie.id);
      const updated = [movie, ...filtered].slice(0, 10);
      localStorage.setItem('streamplay_continuewatching', JSON.stringify(updated));
      return updated;
    });
  };

  const createPlaylist = (name: string, initialSong?: SongItem) => {
    if (!name.trim()) return;
    const newPl = {
      id: `pl-${Date.now()}`,
      name: name.trim(),
      songs: initialSong ? [initialSong] : [],
      cover: initialSong?.image
    };
    setPlaylists(prev => {
      const updated = [...prev, newPl];
      localStorage.setItem('streamplay_playlists', JSON.stringify(updated));
      return updated;
    });

    if (initialSong) {
      logSignal({
        type: 'add_playlist',
        itemId: initialSong.id,
        itemType: 'song',
        timestamp: Date.now(),
        metadata: {
          artist: initialSong.artist,
          language: initialSong.language,
          query: initialSong.title,
        },
      });
      notifyRecUpdate();
    }
  };

  const editPlaylist = (playlistId: string, newName: string) => {
    if (!newName.trim()) return;
    setPlaylists(prev => {
      const updated = prev.map(p => (p.id === playlistId ? { ...p, name: newName.trim() } : p));
      localStorage.setItem('streamplay_playlists', JSON.stringify(updated));
      return updated;
    });
  };

  const deletePlaylist = (playlistId: string) => {
    setPlaylists(prev => {
      const updated = prev.filter(p => p.id !== playlistId);
      localStorage.setItem('streamplay_playlists', JSON.stringify(updated));
      return updated;
    });
  };

  const removeSongFromPlaylist = (playlistId: string, songId: string) => {
    setPlaylists(prev => {
      const updated = prev.map(p => {
        if (p.id === playlistId) {
          const filteredSongs = p.songs.filter(s => String(s.id) !== String(songId));
          const newCover = filteredSongs.length > 0 ? (filteredSongs[0].image || p.cover) : undefined;
          return { ...p, songs: filteredSongs, cover: newCover };
        }
        return p;
      });
      localStorage.setItem('streamplay_playlists', JSON.stringify(updated));
      return updated;
    });
  };

  const addSongToPlaylist = (playlistId: string, song: SongItem) => {
    setPlaylists(prev => {
      const updated = prev.map(p => {
        if (p.id === playlistId && !p.songs.some(s => String(s.id) === String(song.id))) {
          return { ...p, songs: [...p.songs, song], cover: song.image || p.cover };
        }
        return p;
      });
      localStorage.setItem('streamplay_playlists', JSON.stringify(updated));
      return updated;
    });

    // Track: song added to playlist
    logSignal({
      type: 'add_playlist',
      itemId: song.id,
      itemType: 'song',
      timestamp: Date.now(),
      metadata: {
        artist: song.artist,
        language: song.language,
        query: song.title,
      },
    });
    notifyRecUpdate();
  };

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioWatchdogRef = useRef<AudioBufferWatchdog | null>(null);
  const currentSongRef = useRef<SongItem | null>(null);
  const songQueueRef = useRef<SongItem[]>([]);
  const isPlayingSongRef = useRef(false);
  const isShuffleRef = useRef(false);
  const isRepeatRef = useRef(false);
  const nextSongRef = useRef<() => void>(() => {});
  const preloadAudioRef = useRef<HTMLAudioElement | null>(null);
  const preloadedUrlRef = useRef<string | null>(null);
  const isPrefetchingBatchRef = useRef(false);

  // Helper to find the next candidate song for proactive preloading and seamless transition
  const getNextCandidateSong = (): SongItem | null => {
    const queue = songQueueRef.current.length > 0 ? songQueueRef.current : songQueue;
    const current = currentSongRef.current || currentSong;
    if (!current || queue.length === 0) return null;

    // Prune session history if it gets too large to prevent memory growth and starvation
    if (sessionPlayedSongIds.current.size > 80) {
      const arr = Array.from(sessionPlayedSongIds.current);
      sessionPlayedSongIds.current = new Set(arr.slice(arr.length - 40));
    }

    const currentIndex = queue.findIndex(s => String(s.id) === String(current.id));
    let candidate: SongItem | null = null;

    if (isShuffleRef.current) {
      const unplayed = queue.filter(s =>
        String(s.id) !== String(current.id) &&
        !sessionPlayedSongIds.current.has(String(s.id)) &&
        !sessionPlayedSongIds.current.has(`${s.title.toLowerCase().trim()} - ${s.artist.toLowerCase().trim()}`) &&
        !s.isShortClip
      );
      if (unplayed.length > 0) {
        candidate = unplayed[Math.floor(Math.random() * unplayed.length)];
      }
    } else {
      for (let i = currentIndex + 1; i < queue.length; i++) {
        const s = queue[i];
        if (
          !sessionPlayedSongIds.current.has(String(s.id)) &&
          !sessionPlayedSongIds.current.has(`${s.title.toLowerCase().trim()} - ${s.artist.toLowerCase().trim()}`) &&
          !s.isShortClip
        ) {
          candidate = s;
          break;
        }
      }
    }

    if (!candidate && currentIndex >= 0 && currentIndex < queue.length - 1) {
      candidate = queue[currentIndex + 1];
    } else if (!candidate && queue.length > 0) {
      candidate = queue[0];
    }
    return candidate;
  };

  // Session-wide played song tracking to avoid repeating played songs (infinite songs playing)
  const sessionPlayedSongIds = useRef<Set<string>>(new Set());
  const autoNextBatchIndexRef = useRef(1);

  // Proactive background queue replenishment: ensures endless infinite tracks
  const replenishQueueIfNeeded = (force = false) => {
    const queue = songQueueRef.current;
    const current = currentSongRef.current;
    const currentIndex = queue.findIndex(s => String(s.id) === String(current?.id));
    const remainingInQueue = queue.length - (currentIndex >= 0 ? currentIndex : 0);

    if ((force || remainingInQueue <= 8) && !isPrefetchingBatchRef.current) {
      isPrefetchingBatchRef.current = true;
      const nextBatch = autoNextBatchIndexRef.current + 1;
      autoNextBatchIndexRef.current = nextBatch;
      const lang = current?.language || localStorage.getItem('streamplay_primary_lang') || 'Tamil';
      fetchInfiniteLanguageSongs(lang, nextBatch, 25)
        .then(moreSongs => {
          const existingIds = new Set(songQueueRef.current.map(s => String(s.id)));
          const freshSongs = moreSongs.filter(s =>
            !existingIds.has(String(s.id)) &&
            !s.isShortClip &&
            !sessionPlayedSongIds.current.has(String(s.id)) &&
            !sessionPlayedSongIds.current.has(`${s.title.toLowerCase().trim()} - ${s.artist.toLowerCase().trim()}`)
          );
          if (freshSongs.length > 0) {
            const updatedQueue = [...songQueueRef.current, ...freshSongs];
            setSongQueue(updatedQueue);
            songQueueRef.current = updatedQueue;
          }
        })
        .catch(console.warn)
        .finally(() => {
          isPrefetchingBatchRef.current = false;
        });
    }
  };

  // Warm up the audio enhancer on first user interaction (unlocks AudioContext)
  useEffect(() => {
    const warm = () => {
      audioEnhancer.warmUp();
      window.removeEventListener('pointerdown', warm);
      window.removeEventListener('keydown', warm);
      window.removeEventListener('touchstart', warm);
    };
    window.addEventListener('pointerdown', warm, { once: true });
    window.addEventListener('keydown', warm, { once: true });
    window.addEventListener('touchstart', warm, { once: true });
    return () => {
      window.removeEventListener('pointerdown', warm);
      window.removeEventListener('keydown', warm);
      window.removeEventListener('touchstart', warm);
    };
  }, []);

  const [audioQuality, setAudioQualityState] = useState<AudioQualitySetting>(() => {
    return (localStorage.getItem('streamplay_audio_quality') as AudioQualitySetting) || '320kbps';
  });

  const setAudioQuality = (q: AudioQualitySetting) => {
    setAudioQualityState(q);
    localStorage.setItem('streamplay_audio_quality', q);
    if (currentSongRef.current && audioRef.current) {
      const updatedUrl = getAudioStreamForQuality(currentSongRef.current.streamUrl, q);
      const currentTime = audioRef.current.currentTime;
      audioRef.current.src = updatedUrl;
      audioRef.current.currentTime = currentTime;
      if (isPlayingSong) {
        audioRef.current.play().catch(console.warn);
      }
    }
  };

  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  useEffect(() => {
    songQueueRef.current = songQueue;
  }, [songQueue]);

  useEffect(() => {
    isPlayingSongRef.current = isPlayingSong;
  }, [isPlayingSong]);

  useEffect(() => {
    isShuffleRef.current = isShuffle;
  }, [isShuffle]);

  useEffect(() => {
    isRepeatRef.current = isRepeat;
  }, [isRepeat]);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    try { audio.crossOrigin = 'anonymous'; } catch { /* ignore */ }
    audioEnhancer.attach(audio, 'music');

    // Restore last played stream URL to audio element without autoplaying
    if (currentSongRef.current?.streamUrl) {
      audio.src = currentSongRef.current.streamUrl;
    }

    // Invisible secondary audio preloader to pre-warm the next song's buffer in the background
    const preloadAudio = new Audio();
    preloadAudio.preload = 'auto';
    preloadAudio.volume = 0;
    preloadAudio.muted = true;
    preloadAudioRef.current = preloadAudio;

    let isTransitioning = false;
    const triggerNextSong = () => {
      if (isTransitioning) return;
      isTransitioning = true;
      if (nextSongRef.current) {
        nextSongRef.current();
      }
      setTimeout(() => {
        isTransitioning = false;
      }, 800);
    };

    const watchdog = new AudioBufferWatchdog(
      audio,
      [],
      (newUrl: string) => {
        setCurrentSong(prev => prev ? { ...prev, streamUrl: newUrl } : null);
      },
      () => {
        // Fallback: mirrors exhausted or dead stream URL, auto-advance
        triggerNextSong();
      }
    );
    audioWatchdogRef.current = watchdog;

    audio.volume = songVolume;

    const handleEnded = () => {
      triggerNextSong();
    };

    const handleTimeUpdate = () => {
      setSongProgress(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration)) {
        setSongDuration(audio.duration);

        // Screen-off / background auto next fallback: if audio reached the end within 0.3s and is not paused
        const remaining = audio.duration - audio.currentTime;
        if (remaining <= 0.3 && !audio.paused && audio.duration > 3) {
          triggerNextSong();
          return;
        }

        // Gapless background audio preloader:
        // Respects user setting 'streamplay_setting_gapless'.
        // Only preloads within 10 seconds of song end, saving massive cellular data on skipped tracks
        const isGaplessEnabled = localStorage.getItem('streamplay_setting_gapless') !== 'false';
        if (isGaplessEnabled && remaining <= 10 && remaining > 1) {
          const candidate = getNextCandidateSong();
          if (candidate && candidate.streamUrl && preloadAudioRef.current) {
            if (preloadedUrlRef.current !== candidate.streamUrl) {
              preloadedUrlRef.current = candidate.streamUrl;
              preloadAudioRef.current.src = candidate.streamUrl;
              preloadAudioRef.current.load();
            }
          }

          // Proactive background queue replenishment
          replenishQueueIfNeeded();
        }
      }
    };

    const handlePlay = () => {
      setIsPlayingSong(true);
      isPlayingSongRef.current = true;
      enableAudioPipelineKeepAlive();
    };

    const handlePause = () => {
      setIsPlayingSong(false);
      isPlayingSongRef.current = false;
    };

    const handleError = (e: Event) => {
      console.warn('[Audio Player] Audio element error encountered, auto-advancing:', e);
      triggerNextSong();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    // Independent screen-off watchdog: ticks every 1 second
    // Detects when the song has reached duration or stalled at EOF without firing ended
    const watchdogTimer = setInterval(() => {
      if (!audioRef.current || !isPlayingSongRef.current) return;
      const a = audioRef.current;
      if (a.duration && !isNaN(a.duration) && a.duration > 3) {
        const remaining = a.duration - a.currentTime;
        if ((remaining <= 0.35 || a.currentTime >= a.duration) && !a.paused) {
          triggerNextSong();
        }
      }
    }, 1000);

    return () => {
      clearInterval(watchdogTimer);
      watchdog.detach();
      audio.pause();
      if (preloadAudioRef.current) {
        preloadAudioRef.current.src = '';
      }
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  const openMoviePlayer = (movie: MovieItem, season = 1, episode = 1) => {
    setActiveMovie(movie);
    setActiveSeason(season);
    setActiveEpisode(episode);
    setVideoProviderIndex(getFirstHealthyProviderIndex(STREAMING_SERVERS.length));
    setIsVideoModalOpen(true);
    audioEnhancer.warmUp();

    // Secure stream path: resolve an encrypted bundle from /api/stream/:id.
    if (!movie.streamUrl) {
      resolveSecureStream(movie.id, movie.type, season, episode)
        .then((result) => {
          if (result && result.url) {
            setActiveMovie((prev) =>
              prev && prev.id === movie.id ? { ...prev, streamUrl: result.url, streamBundle: result.bundle } : prev
            );
          }
        })
        .catch(() => {
          // Keep provider fallback.
        });
    }

    addToContinueWatching(movie);
    // Pause audio if video starts playing
    if (audioRef.current && isPlayingSong) {
      audioRef.current.pause();
    }
    // Track: user started watching a movie/series
    logSignal({
      type: 'watch_start',
      itemId: movie.id,
      itemType: movie.type || 'movie',
      timestamp: Date.now(),
      metadata: {
        genres: movie.genres,
        ottProvider: movie.ottProvider,
        query: movie.name,
      },
    });
    notifyRecUpdate();
  };

  const closeMoviePlayer = () => {
    setIsVideoModalOpen(false);
    if (audioRef.current) {
      audioEnhancer.warmUp();
      audioEnhancer.attach(audioRef.current, 'music');
    }
  };

  const cycleVideoProvider = () => {
    setVideoProviderIndex(prev => prev + 1);
  };

  const playNextEpisode = () => {
    if (!activeMovie || activeMovie.type !== 'series') return;
    setActiveEpisode(prev => prev + 1);
  };

  const setEpisode = (season: number, episode: number) => {
    setActiveSeason(season);
    setActiveEpisode(episode);
  };

  const playSong = (song: SongItem, queue?: SongItem[]) => {
    // Track skip/completion of previous song before switching
    const prevSongForTracking = currentSongRef.current;
    if (prevSongForTracking && audioRef.current && audioRef.current.duration > 0) {
      const progress = audioRef.current.currentTime / audioRef.current.duration;
      if (progress < 0.15 && audioRef.current.currentTime < 30) {
        logSignal({
          type: 'skip',
          itemId: prevSongForTracking.id,
          itemType: 'song',
          timestamp: Date.now(),
          metadata: {
            artist: prevSongForTracking.artist,
            language: prevSongForTracking.language,
            progress,
          },
        });
      } else if (progress > 0.75) {
        logSignal({
          type: 'watch_complete',
          itemId: prevSongForTracking.id,
          itemType: 'song',
          timestamp: Date.now(),
          metadata: {
            artist: prevSongForTracking.artist,
            language: prevSongForTracking.language,
            query: prevSongForTracking.title,
            progress,
          },
        });
      }
    }

    // Mark song as played in session to avoid repeating
    sessionPlayedSongIds.current.add(String(song.id));
    sessionPlayedSongIds.current.add(`${song.title.toLowerCase().trim()} - ${song.artist.toLowerCase().trim()}`);

    const qualityStreamUrl = getAudioStreamForQuality(song.streamUrl, audioQuality);
    const updatedSong: SongItem = {
      ...song,
      streamUrl: qualityStreamUrl,
      quality: `${audioQuality.toUpperCase()} • Free High-Res Audio`
    };

    setCurrentSong(updatedSong);
    currentSongRef.current = updatedSong;

    if (queue && queue.length > 0) {
      setSongQueue(queue);
      songQueueRef.current = queue;
    } else {
      setSongQueue(prev => {
        if (!prev.some(s => String(s.id) === String(song.id))) {
          const updated = [...prev, updatedSong];
          songQueueRef.current = updated;
          return updated;
        }
        return prev;
      });
    }

    // Persist last played song and queue to localStorage for app recovery on launch
    try {
      localStorage.setItem('streamplay_last_played_song', JSON.stringify(updatedSong));
      const qToSave = (queue && queue.length > 0) ? queue : songQueueRef.current;
      if (qToSave && qToSave.length > 0) {
        localStorage.setItem('streamplay_song_queue', JSON.stringify(qToSave.slice(0, 50)));
      }
    } catch (e) {
      console.warn('Failed to persist last played song:', e);
    }

    // Dynamically update Recently Played history and persist
    setRecentlyPlayed(prev => {
      const idKey = String(updatedSong.id || '');
      const titleArtistKey = `${(updatedSong.title || '').toLowerCase().trim()} - ${(updatedSong.artist || '').toLowerCase().trim()}`;
      const filtered = prev.filter(s => {
        const sid = String(s.id || '');
        const stKey = `${(s.title || '').toLowerCase().trim()} - ${(s.artist || '').toLowerCase().trim()}`;
        return sid !== idKey && stKey !== titleArtistKey;
      });
      const updated = [updatedSong, ...filtered].slice(0, 30);
      try {
        localStorage.setItem('streamplay_recently_played_songs', JSON.stringify(updated));
      } catch (err) {
        console.warn('Failed to save recently played songs:', err);
      }
      return updated;
    });

    const coverImage = updatedSong.image || '';
    // Start native background audio (Foreground Service + MediaSession)
    startNativeBackgroundAudio(
      updatedSong.title,
      updatedSong.artist,
      coverImage,
      true,
      audioRef.current?.duration || 0,
      audioRef.current?.currentTime || 0
    );

    if (audioRef.current) {
      audioEnhancer.warmUp();
      audioEnhancer.attach(audioRef.current, 'music');
      if (audioWatchdogRef.current) {
        const mirrors = [updatedSong.streamUrl, ...(updatedSong.backupStreamUrls || [])];
        audioWatchdogRef.current.setMirrors(Array.from(new Set(mirrors)));
      }
      audioRef.current.src = updatedSong.streamUrl;
      audioRef.current
        .play()
        .then(() => {
          setIsPlayingSong(true);
          isPlayingSongRef.current = true;
          updateNativeMediaSession(updatedSong, true);
          updateNativeBackgroundAudio(
            updatedSong.title,
            updatedSong.artist,
            coverImage,
            true,
            audioRef.current?.duration || 0,
            audioRef.current?.currentTime || 0
          );
        })
        .catch(err => {
          console.warn('Playback blocked or failed, auto-advancing to next playable track:', err);
          // If playback failed immediately (e.g. 403 or corrupted stream URL), auto-advance
          if (nextSongRef.current) {
            nextSongRef.current();
          }
        });
    }

    // Immediately update OS-level Dynamic Island & Notification MediaSession
    updateNativeMediaSession(updatedSong, true);

    // Proactively top up queue with fresh songs so playback never terminates
    replenishQueueIfNeeded(queue ? queue.length <= 5 : true);

    // Track: user started playing a song
    logSignal({
      type: 'watch_start',
      itemId: song.id,
      itemType: 'song',
      timestamp: Date.now(),
      metadata: {
        artist: song.artist,
        language: song.language,
        query: song.title,
      },
    });
    notifyRecUpdate();
  };

  const toggleSongPlay = () => {
    if (!audioRef.current || !currentSong) return;
    const coverImage = currentSong.image || '';
    if (isPlayingSong) {
      audioRef.current.pause();
      setIsPlayingSong(false);
      isPlayingSongRef.current = false;
      updateNativeBackgroundAudio(
        currentSong.title,
        currentSong.artist,
        coverImage,
        false,
        audioRef.current.duration || 0,
        audioRef.current.currentTime || 0
      );
      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    } else {
      if (audioRef.current && (!audioRef.current.src || audioRef.current.src === '' || audioRef.current.src === window.location.href)) {
        audioRef.current.src = currentSong.streamUrl;
      }
      startNativeBackgroundAudio(
        currentSong.title,
        currentSong.artist,
        coverImage,
        true,
        audioRef.current.duration || 0,
        audioRef.current.currentTime || 0
      );
      audioRef.current.play().then(() => {
        setIsPlayingSong(true);
        isPlayingSongRef.current = true;
        if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'playing';
        }
      }).catch(e => console.error(e));
    }
  };

  const stopSong = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlayingSong(false);
    isPlayingSongRef.current = false;
    setCurrentSong(null);
    stopNativeBackgroundAudio();
    updateNativeMediaSession(null, false);
  };

  // Synchronous next track transition: prevents background audio suspension when screen is turned off
  const nextSong = () => {
    const queue = songQueueRef.current.length > 0 ? songQueueRef.current : songQueue;
    const current = currentSongRef.current || currentSong;
    if (!current || queue.length === 0) return;

    if (isRepeatRef.current && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.error);
      return;
    }

    let nextCandidate = getNextCandidateSong();

    // If nextCandidate not found, immediately and synchronously pick next item or loop to first in queue
    if (!nextCandidate && queue.length > 0) {
      const currentIndex = queue.findIndex(s => String(s.id) === String(current.id));
      if (currentIndex >= 0 && currentIndex < queue.length - 1) {
        nextCandidate = queue[currentIndex + 1];
      } else {
        nextCandidate = queue[0];
      }
    }

    // Play next candidate IMMEDIATELY and SYNCHRONOUSLY without any async delay
    if (nextCandidate) {
      playSong(nextCandidate, songQueueRef.current);
    }

    // Asynchronously replenish queue in background without blocking audio thread
    replenishQueueIfNeeded();
  };

  const prevSong = () => {
    const queue = songQueueRef.current.length > 0 ? songQueueRef.current : songQueue;
    const current = currentSongRef.current || currentSong;
    if (!current || queue.length === 0) return;

    // If more than 3s in, restart the song
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setSongProgress(0);
      return;
    }

    const currentIndex = queue.findIndex(s => String(s.id) === String(current.id));
    if (currentIndex > 0) {
      playSong(queue[currentIndex - 1], queue);
    } else if (queue.length > 0) {
      // Loop to last song
      playSong(queue[queue.length - 1], queue);
    }
  };

  useEffect(() => {
    nextSongRef.current = nextSong;
  });

  useEffect(() => {
    listenToNativeMediaActions({
      onPlay: () => {
        if (audioRef.current && currentSongRef.current && !isPlayingSongRef.current) {
          audioRef.current.play().then(() => {
            setIsPlayingSong(true);
            isPlayingSongRef.current = true;
            updateNativeMediaSession(currentSongRef.current, true);
          }).catch(console.error);
        }
      },
      onPause: () => {
        if (audioRef.current && currentSongRef.current && isPlayingSongRef.current) {
          audioRef.current.pause();
          setIsPlayingSong(false);
          isPlayingSongRef.current = false;
          updateNativeMediaSession(currentSongRef.current, false);
        }
      },
      onNext: () => {
        if (nextSongRef.current) {
          nextSongRef.current();
        }
      },
      onPrevious: () => {
        prevSong();
      },
      onSeek: (posSec) => {
        if (audioRef.current) {
          audioRef.current.currentTime = posSec;
        }
      }
    });
  }, []);

  const seekSong = (timeInSeconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = timeInSeconds;
      setSongProgress(timeInSeconds);
    }
  };

  const setSongVolume = (vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
  };

  // Native MediaSession Updater for Default OS Dynamic Island & Notification Center
  function updateNativeMediaSession(song: SongItem | null, isPlaying: boolean) {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    if (!song) {
      navigator.mediaSession.playbackState = 'none';
      return;
    }
    try {
      const rawImage = song.image || '/StreamPlay.png';
      const absoluteImage = rawImage.startsWith('http')
        ? rawImage
        : `${window.location.origin}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`;

      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.artist || 'StreamPlay Music',
        album: song.album || 'StreamPlay Master',
        artwork: [
          { src: absoluteImage, sizes: '96x96' },
          { src: absoluteImage, sizes: '128x128' },
          { src: absoluteImage, sizes: '192x192' },
          { src: absoluteImage, sizes: '256x256' },
          { src: absoluteImage, sizes: '384x384' },
          { src: absoluteImage, sizes: '512x512' }
        ]
      });
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch (err) {
      console.warn('[MediaSession Update]', err);
    }
  }

  // Default OS Dynamic Island, Notification Center, Bluetooth & Lockscreen Controls
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    if (currentSong) {
      try {
        updateNativeMediaSession(currentSong, isPlayingSong);

        navigator.mediaSession.setActionHandler('play', () => {
          if (audioRef.current) {
            audioRef.current.play().then(() => {
              setIsPlayingSong(true);
              if (navigator.mediaSession) navigator.mediaSession.playbackState = 'playing';
            }).catch(console.warn);
          }
        });

        navigator.mediaSession.setActionHandler('pause', () => {
          if (audioRef.current) {
            audioRef.current.pause();
            setIsPlayingSong(false);
            if (navigator.mediaSession) navigator.mediaSession.playbackState = 'paused';
          }
        });

        navigator.mediaSession.setActionHandler('previoustrack', () => {
          prevSong();
        });

        navigator.mediaSession.setActionHandler('nexttrack', () => {
          nextSong();
        });

        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
          const skip = details.seekOffset || 10;
          if (audioRef.current) {
            audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - skip);
            setSongProgress(audioRef.current.currentTime);
          }
        });

        navigator.mediaSession.setActionHandler('seekforward', (details) => {
          const skip = details.seekOffset || 10;
          if (audioRef.current) {
            audioRef.current.currentTime = Math.min(songDuration || 9999, audioRef.current.currentTime + skip);
            setSongProgress(audioRef.current.currentTime);
          }
        });

        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined && audioRef.current) {
            audioRef.current.currentTime = details.seekTime;
            setSongProgress(details.seekTime);
          }
        });

        navigator.mediaSession.setActionHandler('stop', () => {
          stopSong();
        });

        if ('setPositionState' in navigator.mediaSession && songDuration > 0) {
          navigator.mediaSession.setPositionState({
            duration: Math.max(songDuration, 1),
            playbackRate: 1,
            position: Math.min(songProgress, songDuration)
          });
        }
      } catch (err) {
        console.warn('[MediaSession Setup]', err);
      }
    } else {
      navigator.mediaSession.playbackState = 'none';
    }
  }, [currentSong, isPlayingSong, songDuration]);

  return (
    <MediaContext.Provider
      value={{
        selectedMovie,
        openMovieDetails,
        closeMovieDetails,
        activeMovie,
        activeSeason,
        activeEpisode,
        isVideoModalOpen,
        videoProviderIndex,
        openMoviePlayer,
        closeMoviePlayer,
        cycleVideoProvider,
        setVideoProviderIndex,
        playNextEpisode,
        setEpisode,
        currentSong,
        isPlayingSong,
        songQueue,
        songProgress,
        songDuration,
        songVolume,
        playSong,
        toggleSongPlay,
        stopSong,
        nextSong,
        prevSong,
        seekSong,
        setSongVolume,
        recentlyPlayed,
        watchedVideoSongs,

        isMusicPlayerOpen,
        openMusicPlayer,
        closeMusicPlayer,
        isShuffle,
        toggleShuffle,
        isRepeat,
        toggleRepeat,
        playbackMode,
        setPlaybackMode,
        likedSongs,
        toggleLikeSong,
        isLikedSong,
        audioQuality,
        setAudioQuality,
        openVideoSong,
        primaryLanguage,
        setPrimaryLanguage,
        secondaryLanguage,
        setSecondaryLanguage,
        watchLater,
        toggleWatchLater,
        isWatchLater,
        continueWatching,
        addToContinueWatching,
        playlists,
        createPlaylist,
        editPlaylist,
        deletePlaylist,
        removeSongFromPlaylist,
        addSongToPlaylist,
        isSongInPlaylist,
        songToAddToPlaylist,
        openAddToPlaylist,
        closeAddToPlaylist,
        isAudioEnhancerOpen,
        openAudioEnhancer,
        closeAudioEnhancer,
        toggleAudioEnhancer,
        userLocation,
        changeUserLocation,
        videoQuality,
        setVideoQuality,
        defaultLaunchMode,
        setDefaultLaunchMode
      }}
    >
      {children}
    </MediaContext.Provider>
  );
};


export const useMedia = () => {
  const ctx = useContext(MediaContext);
  if (!ctx) throw new Error('useMedia must be used within MediaProvider');
  return ctx;
};
