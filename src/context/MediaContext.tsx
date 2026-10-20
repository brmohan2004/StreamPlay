import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { MovieItem, SongItem } from '../types/media';
import { logSignal } from '../services/recommendationTracker';
import { AudioBufferWatchdog } from '../services/streamingWatchdog';

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

  // Video Songs Support
  openVideoSong: (song: SongItem, queue?: SongItem[]) => void;

  // Language Preferences (Primary & Secondary)
  primaryLanguage: string;
  setPrimaryLanguage: (lang: string) => void;
  secondaryLanguage: string;
  setSecondaryLanguage: (lang: string) => void;

  // Watch Later & History
  watchLater: MovieItem[];
  toggleWatchLater: (movie: MovieItem) => void;
  isWatchLater: (id: string) => boolean;
  continueWatching: MovieItem[];
  addToContinueWatching: (movie: MovieItem) => void;

  // Playlists
  playlists: { id: string; name: string; songs: SongItem[]; cover?: string }[];
  createPlaylist: (name: string) => void;
  editPlaylist: (playlistId: string, newName: string) => void;
  deletePlaylist: (playlistId: string) => void;
  removeSongFromPlaylist: (playlistId: string, songId: string) => void;
  addSongToPlaylist: (playlistId: string, song: SongItem) => void;
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
  const [currentSong, setCurrentSong] = useState<SongItem | null>(null);
  const [isPlayingSong, setIsPlayingSong] = useState(false);
  const [songQueue, setSongQueue] = useState<SongItem[]>([]);
  const [songProgress, setSongProgress] = useState(0);
  const [songDuration, setSongDuration] = useState(0);
  const [songVolume, setVolumeState] = useState(0.85);

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

  const openMusicPlayer = () => setIsMusicPlayerOpen(true);
  const closeMusicPlayer = () => setIsMusicPlayerOpen(false);
  const toggleShuffle = () => setIsShuffle(prev => !prev);
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
    const videoSongItem = {
      ...song,
      isVideo: true,
      videoUrl: song.videoUrl || `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(song.title + ' ' + song.artist + ' official video')}`
    };
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

  const createPlaylist = (name: string) => {
    if (!name.trim()) return;
    const newPl = {
      id: `pl-${Date.now()}`,
      name: name.trim(),
      songs: []
    };
    setPlaylists(prev => {
      const updated = [...prev, newPl];
      localStorage.setItem('streamplay_playlists', JSON.stringify(updated));
      return updated;
    });
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
  const isShuffleRef = useRef(false);
  const isRepeatRef = useRef(false);
  const nextSongRef = useRef<() => void>(() => {});

  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  useEffect(() => {
    songQueueRef.current = songQueue;
  }, [songQueue]);

  useEffect(() => {
    isShuffleRef.current = isShuffle;
  }, [isShuffle]);

  useEffect(() => {
    isRepeatRef.current = isRepeat;
  }, [isRepeat]);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const watchdog = new AudioBufferWatchdog(audio, [], (newUrl) => {
      setCurrentSong(prev => prev ? { ...prev, streamUrl: newUrl } : null);
    });
    audioWatchdogRef.current = watchdog;

    audio.volume = songVolume;

    const handleTimeUpdate = () => {
      setSongProgress(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration)) {
        setSongDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      if (nextSongRef.current) {
        nextSongRef.current();
      }
    };

    const handlePlay = () => setIsPlayingSong(true);
    const handlePause = () => setIsPlayingSong(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      watchdog.detach();
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  const openMoviePlayer = (movie: MovieItem, season = 1, episode = 1) => {
    setActiveMovie(movie);
    setActiveSeason(season);
    setActiveEpisode(episode);
    setVideoProviderIndex(0);
    setIsVideoModalOpen(true);
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

    setCurrentSong(song);
    currentSongRef.current = song;

    if (queue && queue.length > 0) {
      setSongQueue(queue);
      songQueueRef.current = queue;
    } else {
      setSongQueue(prev => {
        if (!prev.some(s => String(s.id) === String(song.id))) {
          const updated = [...prev, song];
          songQueueRef.current = updated;
          return updated;
        }
        return prev;
      });
    }

    if (audioRef.current) {
      if (audioWatchdogRef.current) {
        const mirrors = [song.streamUrl, ...(song.backupStreamUrls || [])];
        audioWatchdogRef.current.setMirrors(Array.from(new Set(mirrors)));
      }
      audioRef.current.src = song.streamUrl;
      audioRef.current
        .play()
        .then(() => setIsPlayingSong(true))
        .catch(err => {
          console.warn('Playback blocked or failed, retrying on interaction:', err);
        });
    }

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
    if (isPlayingSong) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error(e));
    }
  };

  const stopSong = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlayingSong(false);
    setCurrentSong(null);
  };

  const nextSong = () => {
    const queue = songQueueRef.current.length > 0 ? songQueueRef.current : songQueue;
    const current = currentSongRef.current || currentSong;
    if (!current || queue.length === 0) return;

    if (isRepeatRef.current && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.error);
      return;
    }

    if (isShuffleRef.current && queue.length > 1) {
      const candidates = queue.filter(s => String(s.id) !== String(current.id));
      const randomSong = candidates[Math.floor(Math.random() * candidates.length)];
      playSong(randomSong, queue);
      return;
    }

    const currentIndex = queue.findIndex(s => String(s.id) === String(current.id));
    if (currentIndex >= 0 && currentIndex < queue.length - 1) {
      playSong(queue[currentIndex + 1], queue);
    } else if (queue.length > 0) {
      // Loop to beginning
      playSong(queue[0], queue);
    }
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
        addSongToPlaylist
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
