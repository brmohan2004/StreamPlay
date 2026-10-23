import './MusicSearchScreen.css';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Mic,
  MicOff,
  Music,
  X,
  ArrowLeft,
  History,
  Play,
  Pause,
  Heart,
  ListPlus,
  Sparkles,
  Loader2,
  Clapperboard,
  User,
  ListMusic,
  Zap,
  Headphones,
  Mic2
} from 'lucide-react';
import {
  searchSongsPaged,
  fetchInfiniteSearchSongs,
  searchArtists,
  searchPlaylists,
  fetchPlaylistTracks,
  extractArtistsFromSongs,
  deduplicateArtists,
  deduplicateSongs,
  ArtistResultItem,
  PlaylistResultItem
} from '../services/musicService';
import { SongItem } from '../types/media';
import { useMedia } from '../context/MediaContext';
import { useNavigation } from '../context/NavigationContext';
import { logSignal } from '../services/recommendationTracker';
import { SkeletonTrackList } from '../components/SkeletonLoader';

const POPULAR_ARTISTS = [
  'Arijit Singh',
  'Taylor Swift',
  'Diljit Dosanjh',
  'Anirudh',
  'Coldplay',
  'The Weeknd',
  'Shreya Ghoshal',
  'Pritam',
  'Sid Sriram',
  'Billie Eilish'
];

export type CapsuleType = 'All' | 'FullSongs' | 'Songs' | 'Videos' | 'Artists' | 'Playlists' | 'Hooks' | 'Audius' | 'Apple';

export const MusicSearchScreen: React.FC = () => {
  const {
    setActiveScreen
  } = useNavigation();
  const {
    playSong,
    openVideoSong,
    currentSong,
    isPlayingSong,
    toggleSongPlay,
    toggleLikeSong,
    isLikedSong,
    openAddToPlaylist,
    primaryLanguage
  } = useMedia();

  const [query, setQuery] = useState('');
  const [selectedCapsule, setSelectedCapsule] = useState<CapsuleType>('All');
  const [isListening, setIsListening] = useState(false);
  const [voiceHint, setVoiceHint] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const [songResults, setSongResults] = useState<SongItem[]>([]);
  const [artistResults, setArtistResults] = useState<ArtistResultItem[]>([]);
  const [playlistResults, setPlaylistResults] = useState<PlaylistResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingPlaylistId, setLoadingPlaylistId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const bottomObserverRef = useRef<HTMLDivElement>(null);
  const seenSongKeysRef = useRef<Set<string>>(new Set());

  // Clean up SpeechRecognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('streamplay_recent_music_searches') || '[]');
    } catch {
      return [];
    }
  });

  // Categorize songs dynamically
  const fullSongs = useMemo(() => {
    return songResults.filter(s => !s.isShortClip && (!s.duration || s.duration >= 90));
  }, [songResults]);

  const shortHooks = useMemo(() => {
    return songResults.filter(s => s.isShortClip || (s.duration ? s.duration < 90 && s.duration > 0 : false));
  }, [songResults]);

  const videoSongs = useMemo(() => {
    return songResults.filter(s => s.isVideo || (s.title && s.title.toLowerCase().includes('video')));
  }, [songResults]);

  const audiusSongs = useMemo(() => {
    return songResults.filter(s => s.source === 'Audius');
  }, [songResults]);

  const appleSongs = useMemo(() => {
    return songResults.filter(s => s.source === 'Apple');
  }, [songResults]);

  // Dynamic capsules based on available results for this search
  const availableCapsules = useMemo(() => {
    const list: { id: CapsuleType; label: string; count: number; icon?: React.ReactNode }[] = [
      { id: 'All', label: 'All', count: songResults.length + artistResults.length + playlistResults.length },
      { id: 'FullSongs', label: 'Full Songs', count: fullSongs.length },
      { id: 'Songs', label: 'Songs', count: songResults.length },
      { id: 'Videos', label: '🎬 Video Songs', count: videoSongs.length > 0 ? videoSongs.length : songResults.length },
      { id: 'Artists', label: 'Artists', count: artistResults.length },
      { id: 'Playlists', label: 'Playlists', count: playlistResults.length }
    ];

    // Dynamically show 1-Min Hooks capsule if short clips are present
    if (shortHooks.length > 0) {
      list.push({ id: 'Hooks', label: '⚡ 1-Min Hooks', count: shortHooks.length });
    }

    if (audiusSongs.length > 0) {
      list.push({ id: 'Audius', label: '🎵 Audius Free', count: audiusSongs.length });
    }

    if (appleSongs.length > 0) {
      list.push({ id: 'Apple', label: '🍎 Apple Music', count: appleSongs.length });
    }

    return list;
  }, [songResults, artistResults, playlistResults, fullSongs, shortHooks, videoSongs, audiusSongs, appleSongs]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Compute final search query string based on active capsule
  const getCapsuleQuery = (rawQuery: string, _capsule: CapsuleType) => {
    const trimmed = rawQuery.trim();
    if (!trimmed) return '';
    // Retain clean query to avoid corrupting backend search tokens
    return trimmed;
  };

  // Perform parallel initial search with dynamic infinite seed loader
  const triggerSearch = async (term: string, capsule = selectedCapsule) => {
    const trimmed = term.trim();
    if (!trimmed) {
      setSongResults([]);
      setArtistResults([]);
      setPlaylistResults([]);
      seenSongKeysRef.current.clear();
      setHasMore(false);
      return;
    }

    setIsSearching(true);
    setPage(1);
    setHasMore(true);
    seenSongKeysRef.current.clear();

    // Save to recents
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 8);
      try {
        localStorage.setItem('streamplay_recent_music_searches', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save recent music searches', e);
      }
      return updated;
    });

    try {
      const targetQuery = getCapsuleQuery(trimmed, capsule);

      // Run parallel queries across infinite songs, artists, and playlists
      const [songsOutcome, artistsOutcome, playlistsOutcome] = await Promise.allSettled([
        fetchInfiniteSearchSongs(targetQuery, 1, seenSongKeysRef.current, 30),
        searchArtists(trimmed, 30),
        searchPlaylists(trimmed, 30)
      ]);

      const songsResult = songsOutcome.status === 'fulfilled' ? songsOutcome.value : { songs: [], hasMore: false, nextPage: 2 };
      const rawSongs = songsResult.songs || [];
      const rawArtists = artistsOutcome.status === 'fulfilled' ? artistsOutcome.value || [] : [];
      const rawPlaylists = playlistsOutcome.status === 'fulfilled' ? playlistsOutcome.value || [] : [];

      const harvestedStars = extractArtistsFromSongs(rawSongs);
      const combinedArtists = deduplicateArtists([...rawArtists, ...harvestedStars]);

      const processed = rawSongs.map(s => {
        if (capsule === 'Videos' || trimmed.toLowerCase().includes('video')) {
          return { ...s, isVideo: true };
        }
        return s;
      });

      setSongResults(deduplicateSongs(processed));
      setArtistResults(combinedArtists);
      setPlaylistResults(rawPlaylists);
      setPage(songsResult.nextPage || 2);
      setHasMore(songsResult.hasMore);

      // Track: music search intent signal
      logSignal({
        type: 'search',
        itemId: `search-music-${trimmed}`,
        itemType: 'song',
        timestamp: Date.now(),
        metadata: {
          query: trimmed,
        },
      });
      window.dispatchEvent(new CustomEvent('streamplay-rec-update'));
    } catch (err) {
      console.error('Music search failed:', err);
      setSongResults([]);
      setArtistResults([]);
      setPlaylistResults([]);
      setHasMore(false);
    } finally {
      setIsSearching(false);
    }
  };

  // Dynamically auto-pick songs based on search content as user scrolls
  const loadNextBatch = async () => {
    if (isLoadingMore || !hasMore || !query.trim() || isSearching) return;
    setIsLoadingMore(true);

    try {
      const targetQuery = getCapsuleQuery(query, selectedCapsule);
      const { songs: moreSongs, hasMore: moreAvailable, nextPage: nextApiPage } = await fetchInfiniteSearchSongs(
        targetQuery,
        page,
        seenSongKeysRef.current,
        30
      );

      if (!moreSongs || moreSongs.length === 0) {
        setHasMore(false);
      } else {
        const processed = moreSongs.map(s => {
          if (selectedCapsule === 'Videos' || query.toLowerCase().includes('video')) {
            return { ...s, isVideo: true };
          }
          return s;
        });
        setSongResults(prev => deduplicateSongs([...prev, ...processed]));
        const moreHarvested = extractArtistsFromSongs(moreSongs);
        if (moreHarvested.length > 0) {
          setArtistResults(prev => deduplicateArtists([...prev, ...moreHarvested]));
        }
        setPage(nextApiPage || (page + 1));
        setHasMore(moreAvailable);
      }
    } catch (err) {
      console.warn('Failed to load next music batch:', err);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // IntersectionObserver for dynamic auto-picking while scrolling (triggers 450px early)
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isSearching) {
          loadNextBatch();
        }
      },
      { rootMargin: '450px' }
    );

    if (bottomObserverRef.current) {
      observer.observe(bottomObserverRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, isSearching, page, query, selectedCapsule]);

  // Real-time debounce search as user types
  useEffect(() => {
    if (!query.trim()) {
      setSongResults([]);
      setArtistResults([]);
      setPlaylistResults([]);
      setHasMore(false);
      return;
    }

    const timer = setTimeout(() => {
      triggerSearch(query);
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      triggerSearch(query);
    }
  };

  // Speech recognition language mapper
  const getSpeechLang = (lang?: string) => {
    switch (lang?.toLowerCase()) {
      case 'tamil':
        return 'ta-IN';
      case 'hindi':
        return 'hi-IN';
      case 'telugu':
        return 'te-IN';
      case 'malayalam':
        return 'ml-IN';
      case 'kannada':
        return 'kn-IN';
      case 'punjabi':
        return 'pa-IN';
      case 'bengali':
        return 'bn-IN';
      default:
        return 'en-IN';
    }
  };

  // Robust Voice Search with Web Speech API and live transcription
  const handleVoiceSearch = async () => {
    // 1. Toggle off if already listening
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      setVoiceHint(null);
      return;
    }

    // 2. Check browser SpeechRecognition support
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Voice search is not supported in this browser. Please use Google Chrome, Edge, or Safari.');
      return;
    }

    try {
      // 3. Request microphone access and immediately release stream so SpeechRecognition can access device hardware
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
        } catch (permErr: any) {
          console.warn('Microphone permission query:', permErr);
          if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
            alert('Microphone permission was denied. Please allow microphone permissions in your browser or device settings.');
            return;
          }
        }
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.lang = getSpeechLang(primaryLanguage);
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceHint(`Listening in ${primaryLanguage || 'English'}... Speak a song or artist name`);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const recognizedText = (finalTranscript || interimTranscript).trim();
        if (recognizedText) {
          setQuery(recognizedText);
          if (finalTranscript) {
            setVoiceHint(`Searching: "${finalTranscript}"`);
            triggerSearch(finalTranscript, selectedCapsule);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          alert('Microphone access was denied. Please allow microphone permissions in your browser or device settings.');
        } else if (event.error === 'no-speech') {
          setVoiceHint('No speech detected. Tap microphone and try again.');
          setTimeout(() => setVoiceHint(null), 3000);
        } else {
          setVoiceHint(null);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setTimeout(() => setVoiceHint(null), 2500);
      };

      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      setVoiceHint(null);
    }
  };

  const clearRecent = (term: string) => {
    setRecentSearches(prev => {
      const updated = prev.filter(t => t !== term);
      localStorage.setItem('streamplay_recent_music_searches', JSON.stringify(updated));
      return updated;
    });
  };

  const clearAllRecents = () => {
    setRecentSearches([]);
    localStorage.removeItem('streamplay_recent_music_searches');
  };

  const handleSelectArtist = (artist: ArtistResultItem | string) => {
    const artistName = typeof artist === 'string' ? artist : artist.name;
    const category = typeof artist !== 'string' ? artist.category : undefined;

    let targetQuery = artistName;
    if (category === 'actress' || category === 'actor') {
      targetQuery = `${artistName} dance songs`;
    } else if (category === 'composer') {
      targetQuery = `${artistName} kuthu hits`;
    }

    setQuery(targetQuery);
    setSelectedCapsule('Songs');
    triggerSearch(targetQuery, 'Songs');
  };

  const renderArtistCard = (artist: ArtistResultItem, idx: number) => {
    const isStar = artist.category === 'actress' || artist.category === 'actor';
    const isComposer = artist.category === 'composer';

    let roleTag = artist.role || 'Artist';
    if (artist.category === 'actress') roleTag = '💃 Starring Actress';
    else if (artist.category === 'actor') roleTag = '🕺 Starring Actor';
    else if (artist.category === 'composer') roleTag = '🎧 Music Director';
    else if (artist.category === 'singer') roleTag = '🎤 Playback Singer';

    return (
      <div
        key={artist.id || idx}
        className={`artist-card-item ${isStar ? 'star-card-glow' : ''} ${isComposer ? 'composer-card-glow' : ''}`}
        onClick={() => handleSelectArtist(artist)}
      >
        <div className="artist-avatar-wrap">
          <img
            src={artist.image}
            alt={artist.name}
            className={`artist-card-avatar ${isStar ? 'avatar-star' : ''} ${isComposer ? 'avatar-composer' : ''}`}
            loading="lazy"
            onError={e => {
              const bg = isStar ? '3b1828' : isComposer ? '1c2b18' : '152535';
              const text = isStar ? 'ff4081' : isComposer ? 'c8ff00' : '00e5ff';
              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                artist.name
              )}&background=${bg}&color=${text}&size=200&bold=true`;
            }}
          />
        </div>
        <span className="artist-card-name">{artist.name}</span>
        <span className={`artist-card-role ${isStar ? 'role-star' : ''} ${isComposer ? 'role-composer' : ''}`}>
          {roleTag}
        </span>
      </div>
    );
  };

  const handleSelectPlaylist = async (playlist: PlaylistResultItem) => {
    try {
      setLoadingPlaylistId(playlist.id);
      const tracks = await fetchPlaylistTracks(playlist.id);
      if (tracks.length > 0) {
        playSong(tracks[0], tracks);
      } else {
        const fallbackTracks = await searchSongsPaged(`${playlist.title} songs`, 1, 20);
        if (fallbackTracks.length > 0) {
          playSong(fallbackTracks[0], fallbackTracks);
        }
      }
    } catch (err) {
      console.warn('Failed to load playlist:', err);
    } finally {
      setLoadingPlaylistId(null);
    }
  };

  const formatDuration = (sec?: number) => {
    if (!sec || isNaN(sec)) return '';
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Render individual track row
  const renderTrackRow = (song: SongItem, queue: SongItem[], index: number) => {
    const isCurrent = currentSong?.id === song.id;
    const isPlayingThis = isCurrent && isPlayingSong;
    const isLiked = isLikedSong(song.id);
    const isHook = song.isShortClip || (song.duration ? song.duration < 90 && song.duration > 0 : false);

    return (
      <div
        key={song.id || index}
        className={`minimal-track-row ${isCurrent ? 'track-current' : ''}`}
        onClick={() => playSong(song, queue)}
      >
        <div className="track-left-cover">
          <img
            src={song.image || '/StreamPlay.png'}
            alt={song.title}
            className="track-cover-thumb"
            loading="lazy"
          />
          <div className={`track-cover-overlay ${isPlayingThis ? 'playing' : ''}`}>
            {isPlayingThis ? (
              <Pause size={16} fill="#000000" color="#000000" />
            ) : (
              <Play size={16} fill="#000000" color="#000000" style={{ marginLeft: 2 }} />
            )}
          </div>
        </div>

        <div className="track-middle-meta">
          <div className="track-title-row-item">
            <span className={`track-main-title ${isCurrent ? 'title-playing-lime' : ''}`}>
              {song.title}
            </span>
            {isHook && <span className="short-hook-tag">⚡ 1-Min</span>}
          </div>
          <div className="track-sub-row-item">
            <span className="track-artist-line">
              {song.artist} {song.album ? `• ${song.album}` : ''}
            </span>
            {song.duration ? (
              <span className="track-duration-dot">• {formatDuration(song.duration)}</span>
            ) : null}
            {song.source && (
              <span className={`track-source-badge badge-${song.source.toLowerCase()}`}>
                {song.source === 'JioSaavn' ? '320k' : song.source}
              </span>
            )}
          </div>
        </div>

        <div className="track-right-actions">
          <button
            type="button"
            className={`track-like-btn ${isLiked ? 'liked' : ''}`}
            onClick={e => {
              e.stopPropagation();
              toggleLikeSong(song.id);
            }}
            aria-label={isLiked ? 'Unlike track' : 'Like track'}
          >
            <Heart size={16} fill={isLiked ? '#c8ff00' : 'none'} color={isLiked ? '#c8ff00' : 'rgba(255,255,255,0.45)'} />
          </button>

          <button
            type="button"
            className="track-playlist-btn"
            onClick={e => {
              e.stopPropagation();
              openAddToPlaylist(song);
            }}
            title="Add to Playlist"
            aria-label="Add to Playlist"
          >
            <ListPlus size={16} color="rgba(255,255,255,0.7)" />
          </button>

          <button
            type="button"
            className="track-circle-play-btn"
            onClick={e => {
              e.stopPropagation();
              if (isCurrent) {
                toggleSongPlay();
              } else {
                playSong(song, queue);
              }
            }}
            aria-label={isPlayingThis ? 'Pause' : 'Play'}
          >
            {isPlayingThis ? (
              <Pause size={15} fill="#000000" color="#000000" />
            ) : (
              <Play size={15} fill="#000000" color="#000000" style={{ marginLeft: 1 }} />
            )}
          </button>
        </div>
      </div>
    );
  };

  // Render individual video card
  const renderVideoCard = (song: SongItem, queue: SongItem[], index: number) => {
    return (
      <div
        key={song.id || index}
        className="search-video-song-card"
        onClick={() => openVideoSong(song, queue)}
      >
        <div className="video-card-thumb-container">
          <img
            src={song.image || '/StreamPlay.png'}
            alt={song.title}
            className="video-card-thumb-img"
            loading="lazy"
          />
          <div className="video-card-gradient-scrim" />
          <div className="video-card-pill-tag">
            <Clapperboard size={11} color="#00e5ff" />
            <span>4K VIDEO SONG</span>
          </div>
          <div className="video-card-center-play">
            <div className="video-play-pulse-btn">
              <Play size={18} fill="#000000" color="#000000" style={{ marginLeft: 2 }} />
            </div>
          </div>
          {song.duration && (
            <span className="video-card-duration-badge">
              {formatDuration(song.duration)}
            </span>
          )}
        </div>

        <div className="video-card-details">
          <div className="video-card-title-row">
            <span className="video-card-heading">{song.title}</span>
            <span className="video-card-label-badge">Official Video</span>
          </div>
          <span className="video-card-artist-line">
            {song.artist} {song.album ? `• ${song.album}` : ''}
          </span>
        </div>
      </div>
    );
  };

  // Render dynamic main results body based on capsule
  const renderCapsuleContent = () => {
    if (selectedCapsule === 'All') {
      const starArtists = artistResults.filter(a => a.category === 'actress' || a.category === 'actor');
      const composerAndSingers = artistResults.filter(a => a.category !== 'actress' && a.category !== 'actor');

      return (
        <div className="all-in-one-results">
          {/* Starring Actresses & Actors Section (if present) */}
          {starArtists.length > 0 && (
            <div className="search-category-section">
              <div className="category-section-title-row">
                <span className="category-section-title" style={{ color: '#ff4081' }}>
                  <Sparkles size={15} color="#ff4081" /> ✨ Starring Actresses & Actors ({starArtists.length})
                </span>
                <button
                  type="button"
                  className="view-all-capsule-link"
                  onClick={() => setSelectedCapsule('Artists')}
                >
                  View All
                </button>
              </div>
              <div className="horizontal-scroll-row">
                {starArtists.map((artist, idx) => renderArtistCard(artist, idx))}
              </div>
            </div>
          )}

          {/* Music Directors & Creators Section (if present) */}
          {composerAndSingers.length > 0 && (
            <div className="search-category-section">
              <div className="category-section-title-row">
                <span className="category-section-title">
                  <User size={15} color="#c8ff00" /> Composers & Artists ({composerAndSingers.length})
                </span>
                <button
                  type="button"
                  className="view-all-capsule-link"
                  onClick={() => setSelectedCapsule('Artists')}
                >
                  View All
                </button>
              </div>
              <div className="horizontal-scroll-row">
                {composerAndSingers.map((artist, idx) => renderArtistCard(artist, idx))}
              </div>
            </div>
          )}

          {/* Songs & Tracks Infinite List */}
          <div className="search-category-section">
            <div className="category-section-title-row">
              <span className="category-section-title">
                <Music size={15} color="#c8ff00" /> Songs & Tracks ({songResults.length})
              </span>
            </div>
            <div className="music-results-list">
              {(fullSongs.length > 0 ? fullSongs : songResults).map((song, i) =>
                renderTrackRow(song, fullSongs.length > 0 ? fullSongs : songResults, i)
              )}
            </div>
          </div>

          {/* Curated Playlists & Albums Section (if present) */}
          {playlistResults.length > 0 && (
            <div className="search-category-section">
              <div className="category-section-title-row">
                <span className="category-section-title">
                  <ListMusic size={15} color="#00e5ff" /> Playlists & Albums ({playlistResults.length})
                </span>
                <button
                  type="button"
                  className="view-all-capsule-link"
                  onClick={() => setSelectedCapsule('Playlists')}
                >
                  View All
                </button>
              </div>
              <div className="horizontal-scroll-row">
                {playlistResults.map((playlist, idx) => (
                  <div
                    key={playlist.id || idx}
                    className="playlist-card-item"
                    onClick={() => handleSelectPlaylist(playlist)}
                  >
                    <div className="playlist-cover-wrap">
                      <img
                        src={playlist.image}
                        alt={playlist.title}
                        className="playlist-cover-img"
                        loading="lazy"
                      />
                      <span className="playlist-count-pill">{playlist.songCount} Songs</span>
                      {loadingPlaylistId === playlist.id && (
                        <div className="loading-playlist-overlay">
                          <Loader2 size={24} className="music-spin-icon text-neon" />
                        </div>
                      )}
                    </div>
                    <div className="playlist-card-info">
                      <span className="playlist-card-title">{playlist.title}</span>
                      {playlist.subtitle && (
                        <span className="playlist-card-sub">{playlist.subtitle}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 1-Min Hooks & Teasers (Dedicated Separate Capsule Preview if present) */}
          {shortHooks.length > 0 && (
            <div className="search-category-section">
              <div className="category-section-title-row">
                <span className="category-section-title">
                  <Zap size={15} color="#ffab00" /> 1-Min Hooks & Teasers ({shortHooks.length})
                </span>
                <button
                  type="button"
                  className="view-all-capsule-link"
                  onClick={() => setSelectedCapsule('Hooks')}
                >
                  View All
                </button>
              </div>
              <div className="music-results-list">
                {shortHooks.map((song, i) => renderTrackRow(song, shortHooks, i))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (selectedCapsule === 'FullSongs') {
      return (
        <div className="music-results-list">
          {fullSongs.length > 0 ? (
            fullSongs.map((song, i) => renderTrackRow(song, fullSongs, i))
          ) : (
            <div className="empty-category-msg">No full-length songs found for "{query}".</div>
          )}
        </div>
      );
    }

    if (selectedCapsule === 'Songs') {
      return (
        <div className="music-results-list">
          {songResults.map((song, i) => renderTrackRow(song, songResults, i))}
        </div>
      );
    }

    if (selectedCapsule === 'Videos') {
      const vQueue = videoSongs.length > 0 ? videoSongs : songResults.map(s => ({ ...s, isVideo: true }));
      return (
        <div className="music-results-list">
          {vQueue.length > 0 ? (
            vQueue.map((song, i) => renderVideoCard(song, vQueue, i))
          ) : (
            <div className="empty-category-msg">No video songs found for "{query}".</div>
          )}
        </div>
      );
    }

    if (selectedCapsule === 'Artists') {
      const starArtists = artistResults.filter(a => a.category === 'actress' || a.category === 'actor');
      const composerArtists = artistResults.filter(a => a.category === 'composer');
      const vocalists = artistResults.filter(a => a.category === 'singer' || (!a.category && a.role?.toLowerCase().includes('singer')));
      const otherArtists = artistResults.filter(a =>
        a.category !== 'actress' &&
        a.category !== 'actor' &&
        a.category !== 'composer' &&
        a.category !== 'singer' &&
        (!a.role || !a.role.toLowerCase().includes('singer'))
      );

      return (
        <div className="artists-capsule-content">
          {starArtists.length > 0 && (
            <div className="search-category-section" style={{ marginBottom: '1.25rem' }}>
              <div className="category-section-title-row">
                <span className="category-section-title" style={{ color: '#ff4081' }}>
                  <Sparkles size={16} color="#ff4081" /> ✨ Starring Actresses & Actors ({starArtists.length})
                </span>
              </div>
              <div className="search-artists-grid">
                {starArtists.map((artist, idx) => renderArtistCard(artist, idx))}
              </div>
            </div>
          )}

          {composerArtists.length > 0 && (
            <div className="search-category-section" style={{ marginBottom: '1.25rem' }}>
              <div className="category-section-title-row">
                <span className="category-section-title" style={{ color: '#c8ff00' }}>
                  <Headphones size={16} color="#c8ff00" /> 🎧 Music Directors & Composers ({composerArtists.length})
                </span>
              </div>
              <div className="search-artists-grid">
                {composerArtists.map((artist, idx) => renderArtistCard(artist, idx))}
              </div>
            </div>
          )}

          {vocalists.length > 0 && (
            <div className="search-category-section" style={{ marginBottom: '1.25rem' }}>
              <div className="category-section-title-row">
                <span className="category-section-title" style={{ color: '#00e5ff' }}>
                  <Mic2 size={16} color="#00e5ff" /> 🎤 Playback Singers & Vocalists ({vocalists.length})
                </span>
              </div>
              <div className="search-artists-grid">
                {vocalists.map((artist, idx) => renderArtistCard(artist, idx))}
              </div>
            </div>
          )}

          {otherArtists.length > 0 && (
            <div className="search-category-section" style={{ marginBottom: '1.25rem' }}>
              <div className="category-section-title-row">
                <span className="category-section-title">
                  <User size={16} color="#ffffff" /> Featured Artists ({otherArtists.length})
                </span>
              </div>
              <div className="search-artists-grid">
                {otherArtists.map((artist, idx) => renderArtistCard(artist, idx))}
              </div>
            </div>
          )}

          {artistResults.length === 0 && (
            <div className="empty-category-msg">No artists found for "{query}".</div>
          )}
        </div>
      );
    }

    if (selectedCapsule === 'Playlists') {
      return (
        <div>
          {playlistResults.length > 0 ? (
            <div className="search-playlists-grid">
              {playlistResults.map((playlist, idx) => (
                <div
                  key={playlist.id || idx}
                  className="playlist-card-item"
                  onClick={() => handleSelectPlaylist(playlist)}
                >
                  <div className="playlist-cover-wrap">
                    <img
                      src={playlist.image}
                      alt={playlist.title}
                      className="playlist-cover-img"
                      loading="lazy"
                    />
                    <span className="playlist-count-pill">{playlist.songCount} Songs</span>
                    {loadingPlaylistId === playlist.id && (
                      <div className="loading-playlist-overlay">
                        <Loader2 size={24} className="music-spin-icon text-neon" />
                      </div>
                    )}
                  </div>
                  <div className="playlist-card-info">
                    <span className="playlist-card-title">{playlist.title}</span>
                    {playlist.subtitle && (
                      <span className="playlist-card-sub">{playlist.subtitle}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-category-msg">No playlists found for "{query}".</div>
          )}
        </div>
      );
    }

    if (selectedCapsule === 'Hooks') {
      return (
        <div className="music-results-list">
          {shortHooks.length > 0 ? (
            shortHooks.map((song, i) => renderTrackRow(song, shortHooks, i))
          ) : (
            <div className="empty-category-msg">No 1-minute hooks found for "{query}".</div>
          )}
        </div>
      );
    }

    if (selectedCapsule === 'Audius') {
      return (
        <div className="music-results-list">
          {audiusSongs.length > 0 ? (
            audiusSongs.map((song, i) => renderTrackRow(song, audiusSongs, i))
          ) : (
            <div className="empty-category-msg">No Audius free creator tracks found for "{query}".</div>
          )}
        </div>
      );
    }

    if (selectedCapsule === 'Apple') {
      return (
        <div className="music-results-list">
          {appleSongs.length > 0 ? (
            appleSongs.map((song, i) => renderTrackRow(song, appleSongs, i))
          ) : (
            <div className="empty-category-msg">No Apple Music tracks found for "{query}".</div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="music-search-screen pure-black-theme">
      {/* Floating Controls Bar (No Solid Header Box) */}
      <div className="floating-music-controls-container">
        {/* Floating Top Control Row */}
        <div className="floating-search-top-row">
          <button
            type="button"
            className="floating-back-circle-btn"
            onClick={() => setActiveScreen('home')}
            aria-label="Back to Home"
            title="Back to Home"
          >
            <ArrowLeft size={20} />
          </button>

          {/* Floating Pill Search Bar */}
          <form onSubmit={handleSubmit} className="floating-minimal-search-bar">
            <Music size={18} className="search-lead-icon text-neon" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search JioSaavn, Audius, Apple Music..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="minimal-search-input"
            />

            {query && (
              <button
                type="button"
                className="search-clear-icon-btn"
                onClick={() => {
                  setQuery('');
                  setSongResults([]);
                  setArtistResults([]);
                  setPlaylistResults([]);
                  setHasMore(false);
                  inputRef.current?.focus();
                }}
                aria-label="Clear Search"
              >
                <X size={15} />
              </button>
            )}

            <button
              type="button"
              className={`search-mic-icon-btn music-mic ${isListening ? 'listening-pulse' : ''}`}
              onClick={handleVoiceSearch}
              title={isListening ? 'Listening... Tap to stop' : 'Voice Search'}
              aria-label="Voice Search"
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          </form>
        </div>

        {/* Live Voice Search Transcription Status Pill */}
        {isListening && (
          <div className="voice-listening-pill">
            <span className="voice-wave-dot" />
            <span>{voiceHint || 'Listening... Speak song or artist name'}</span>
          </div>
        )}

        {/* Floating Category Capsules Bar */}
        {query.trim() && (
          <div className="floating-capsules-bar">
            {availableCapsules.map(cap => (
              <button
                key={cap.id}
                type="button"
                className={`floating-capsule ${selectedCapsule === cap.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedCapsule(cap.id);
                }}
              >
                <span>{cap.label}</span>
                <span className="capsule-badge-count">{cap.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Body */}
      <div className="search-content-body">
        {/* Recent Searches (when not searching and no results) */}
        {!query && recentSearches.length > 0 && (
          <div className="recent-search-section">
            <div className="recent-section-header">
              <div className="section-label">
                <History size={15} />
                <span>Recent Music Searches</span>
              </div>
              <button className="clear-all-text-btn lime-text" onClick={clearAllRecents}>
                Clear All
              </button>
            </div>
            <div className="recent-chips-flow">
              {recentSearches.map((term, i) => (
                <div
                  key={i}
                  className="recent-chip-bubble music-bubble"
                  onClick={() => {
                    setQuery(term);
                    triggerSearch(term);
                  }}
                >
                  <span className="bubble-text">{term}</span>
                  <button
                    className="bubble-close-btn"
                    onClick={e => {
                      e.stopPropagation();
                      clearRecent(term);
                    }}
                    aria-label={`Remove ${term}`}
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Popular Artists & Hits (when no query) */}
        {!query && (
          <div className="popular-tags-section">
            <div className="section-label">
              <Sparkles size={15} className="text-neon" />
              <span>Trending Artists & Creators</span>
            </div>
            <div className="popular-tags-flow">
              {POPULAR_ARTISTS.map(artist => (
                <button
                  key={artist}
                  className="popular-tag-btn music-artist-tag"
                  onClick={() => {
                    setQuery(artist);
                    triggerSearch(artist);
                  }}
                >
                  {artist}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Skeleton Track List Loading */}
        {isSearching && (
          <div style={{ width: '100%', padding: '0.5rem 0' }}>
            <SkeletonTrackList count={8} />
          </div>
        )}

        {/* Results Container */}
        {!isSearching && query && (
          <div className="search-results-container">
            <div className="results-header-info">
              <span className="results-count-title">
                {songResults.length > 0 || artistResults.length > 0 || playlistResults.length > 0
                  ? `Showing results for "${query}"`
                  : `No results found for "${query}"`}
              </span>
              <span className="badge-320kbps-hd">320kbps Master</span>
            </div>

            {songResults.length > 0 || artistResults.length > 0 || playlistResults.length > 0 ? (
              <>
                {renderCapsuleContent()}

                {/* Infinite Scroll Loader */}
                {selectedCapsule !== 'Artists' && selectedCapsule !== 'Playlists' && hasMore && (
                  <div className="music-search-load-bar">
                    <button
                      type="button"
                      className="music-search-load-btn"
                      onClick={loadNextBatch}
                      disabled={isLoadingMore}
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 size={16} className="music-spin-icon text-neon" />
                          <span>Loading more tracks...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} color="#c8ff00" />
                          <span>Load more tracks</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* All available contents reached indicator */}
                {!hasMore && songResults.length > 0 && selectedCapsule !== 'Artists' && selectedCapsule !== 'Playlists' && (
                  <div className="all-contents-loaded-pill">
                    <span>✓ All available tracks loaded ({songResults.length} tracks)</span>
                  </div>
                )}

                {/* Continuous Infinite Scroll Intersection Observer Anchor */}
                <div ref={bottomObserverRef} className="infinite-scroll-anchor" style={{ height: 28, width: '100%' }} />
              </>
            ) : (
              <div className="search-no-results">
                <Music size={44} className="no-results-icon text-muted" />
                <h3>No music tracks found</h3>
                <p>Try searching for a different song name, artist, or music genre.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
