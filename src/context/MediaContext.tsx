import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { MovieItem, SongItem } from '../types/media';

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
  openVideoSong: (song: SongItem) => void;

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
      const updated = prev.includes(songId) ? prev.filter(id => id !== songId) : [...prev, songId];
      localStorage.setItem('streamplay_liked_songs', JSON.stringify(updated));
      return updated;
    });
  };

  const isLikedSong = (songId: string) => likedSongs.includes(songId);

  const openVideoSong = (song: SongItem) => {
    // If song has no videoUrl, assign a high-def video stream embed or fallback
    const videoSongItem = {
      ...song,
      isVideo: true,
      videoUrl: song.videoUrl || `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(song.title + ' ' + song.artist + ' official video')}`
    };
    setPlaybackMode('video');
    playSong(videoSongItem);
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

  const addSongToPlaylist = (playlistId: string, song: SongItem) => {
    setPlaylists(prev => {
      const updated = prev.map(p => {
        if (p.id === playlistId && !p.songs.some(s => s.id === song.id)) {
          return { ...p, songs: [...p.songs, song], cover: song.image || p.cover };
        }
        return p;
      });
      localStorage.setItem('streamplay_playlists', JSON.stringify(updated));
      return updated;
    });
  };

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    audio.volume = songVolume;

    const handleTimeUpdate = () => {
      setSongProgress(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration)) {
        setSongDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      nextSong();
    };

    const handlePlay = () => setIsPlayingSong(true);
    const handlePause = () => setIsPlayingSong(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
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
    setCurrentSong(song);
    if (queue && queue.length > 0) {
      setSongQueue(queue);
    } else if (!songQueue.some(s => s.id === song.id)) {
      setSongQueue(prev => [song, ...prev]);
    }

    if (audioRef.current) {
      audioRef.current.src = song.streamUrl;
      audioRef.current
        .play()
        .then(() => setIsPlayingSong(true))
        .catch(err => {
          console.warn('Playback blocked or failed, retrying on interaction:', err);
        });
    }
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
    if (!currentSong || songQueue.length === 0) return;
    const currentIndex = songQueue.findIndex(s => s.id === currentSong.id);
    if (currentIndex >= 0 && currentIndex < songQueue.length - 1) {
      playSong(songQueue[currentIndex + 1]);
    } else if (songQueue.length > 0) {
      // Loop to beginning
      playSong(songQueue[0]);
    }
  };

  const prevSong = () => {
    if (!currentSong || songQueue.length === 0) return;
    const currentIndex = songQueue.findIndex(s => s.id === currentSong.id);
    if (currentIndex > 0) {
      playSong(songQueue[currentIndex - 1]);
    }
  };

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
