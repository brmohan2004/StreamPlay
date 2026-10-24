import './MusicHomeScreen.css';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TopAppHeader } from '../components/TopAppHeader';
import { SongItem } from '../types/media';
import { useMedia } from '../context/MediaContext';
import { useNavigation } from '../context/NavigationContext';
import { ChevronLeft, ChevronRight, Mic2, Play, Pause, ListPlus } from 'lucide-react';
import { DailyMixFannedDeck } from '../components/DailyMixFannedDeck';
import {
  fetchVideoSongsPaged,
  fetchRecommendedEnglishSongsPaged,
  fetchInfiniteLanguageSongs,
  fetchArtistSongsPaged,
  fetchMusicFilterUniverseSongs,
  getCachedInitialMusic,
  saveCachedInitialMusic,
  getSongCoreKey
} from '../services/musicService';
import { fetchDynamicMusicShelf } from '../services/catalogEngine';
import { useRecommendations } from '../context/RecommendationContext';
import { SkeletonMusicHome, SkeletonMusicRow } from '../components/SkeletonLoader';
import {
  SquareMusicCard,
  VinylMusicCard,
  CompactTileCard,
  TwoRowScrollGrid,
  AuraMusicCard,
  CinematicVideoCard,
  PortraitMusicCard,
  CuratedMusicCard
} from '../components/MusicCardsDesign';

interface MusicHomeScreenProps {
  trendingSongs: SongItem[];
  newSongs: SongItem[];
  recentSongs: SongItem[];
}

export const MusicHomeScreen: React.FC<MusicHomeScreenProps> = ({
  trendingSongs,
  recentSongs
}) => {
  const { playSong, openMusicPlayer, openVideoSong, primaryLanguage, secondaryLanguage, userLocation, currentSong, isPlayingSong, toggleSongPlay, openAddToPlaylist, recentlyPlayed, watchedVideoSongs } = useMedia();
  const { activeCategory, setActiveCategory } = useNavigation();
  const { dailyMix, forYouSongs, becauseYouListened, discoverWeekly } = useRecommendations();

  // Language Curated Songs State initialized with local persistent cache
  const [primaryLangSongs, setPrimaryLangSongs] = useState<SongItem[]>(() => getCachedInitialMusic('primary_lang'));
  const [secondaryLangSongs, setSecondaryLangSongs] = useState<SongItem[]>(() => getCachedInitialMusic('secondary_lang'));
  const [videoSongs, setVideoSongs] = useState<SongItem[]>(() => getCachedInitialMusic('video_songs'));

  // 1. Top Picks 15-by-15 Infinite Scrolling State
  const [topPicksState, setTopPicksState] = useState<SongItem[]>([]);
  const [topPicksPage, setTopPicksPage] = useState(1);
  const [isLoadingMoreTopPicks, setIsLoadingMoreTopPicks] = useState(false);
  const [hasMoreTopPicks, setHasMoreTopPicks] = useState(true);

  // Sync initial forYouSongs into topPicksState
  useEffect(() => {
    if (forYouSongs.length > 0 && topPicksState.length === 0) {
      setTopPicksState(forYouSongs);
    }
  }, [forYouSongs]);

  // Load next 15 recommended Top Picks
  const loadNextTopPicksBatch = async () => {
    if (isLoadingMoreTopPicks || !hasMoreTopPicks) return;
    setIsLoadingMoreTopPicks(true);
    try {
      const nextPage = topPicksPage + 1;
      const batch = await fetchInfiniteLanguageSongs(primaryLanguage, nextPage, 15);
      if (batch.length === 0) {
        setHasMoreTopPicks(false);
      } else {
        setTopPicksState(prev => {
          const seen = new Set(prev.map(s => s.id));
          const unique = batch.filter(s => !seen.has(s.id));
          return [...prev, ...unique];
        });
        setTopPicksPage(nextPage);
      }
    } catch (e) {
      console.warn('Failed to load more top picks:', e);
    } finally {
      setIsLoadingMoreTopPicks(false);
    }
  };

  // 2. Popular 20 Songs with Language Capsules
  const popularLanguages = useMemo(() => {
    return Array.from(
      new Set([
        primaryLanguage,
        secondaryLanguage,
        'Hindi',
        'Telugu',
        'Malayalam',
        'Kannada',
        'English',
        'All'
      ].filter(Boolean))
    );
  }, [primaryLanguage, secondaryLanguage]);

  const [selectedPopularLang, setSelectedPopularLang] = useState<string>(primaryLanguage || 'All');
  const [popularLangSongs, setPopularLangSongs] = useState<SongItem[]>([]);

  // Fetch or filter 20 popular songs for the selected language capsule
  useEffect(() => {
    if (selectedPopularLang === 'All') {
      setPopularLangSongs(trendingSongs.slice(0, 20));
      return;
    }
    if (selectedPopularLang === primaryLanguage && primaryLangSongs.length >= 20) {
      setPopularLangSongs(primaryLangSongs.slice(0, 20));
      return;
    }
    if (selectedPopularLang === secondaryLanguage && secondaryLangSongs.length >= 20) {
      setPopularLangSongs(secondaryLangSongs.slice(0, 20));
      return;
    }

    let isMounted = true;
    fetchInfiniteLanguageSongs(selectedPopularLang, 0, 25).then(res => {
      if (isMounted && res.length > 0) {
        setPopularLangSongs(res);
      }
    }).catch(() => {
      // fallback
    });

    return () => {
      isMounted = false;
    };
  }, [selectedPopularLang, primaryLanguage, secondaryLanguage, primaryLangSongs, secondaryLangSongs, trendingSongs]);

  // 3. Featured Artists & Discographies (Continuous infinite pagination)
  const featuredArtists = useMemo(() => {
    const langArtistsMap: Record<string, string[]> = {
      Tamil: ['Anirudh Ravichander', 'A.R. Rahman', 'Yuvan Shankar Raja', 'Sid Sriram', 'Harris Jayaraj', 'Ilayaraja', 'Santhosh Narayanan'],
      Telugu: ['Thaman S', 'Devi Sri Prasad', 'Sid Sriram', 'Anirudh', 'M.M. Keeravaani', 'Ram Miriyala'],
      Hindi: ['Arijit Singh', 'Pritam', 'Shreya Ghoshal', 'Badshah', 'Sachin-Jigar', 'Atif Aslam', 'Neha Kakkar'],
      Malayalam: ['Sushin Shyam', 'Hesham Abdul Wahab', 'Jakes Bejoy', 'Job Kurian', 'Vineeth Sreenivasan'],
      Kannada: ['Ravi Basrur', 'Arjun Janya', 'Charan Raj', 'Vasuki Vaibhav', 'B. Ajaneesh Loknath'],
      English: ['The Weeknd', 'Taylor Swift', 'Coldplay', 'Billie Eilish', 'Bruno Mars', 'Ed Sheeran', 'Drake']
    };
    const prim = langArtistsMap[primaryLanguage] || langArtistsMap['Tamil'];
    const sec = langArtistsMap[secondaryLanguage] || langArtistsMap['English'];
    return Array.from(new Set([...prim.slice(0, 4), ...sec.slice(0, 3), 'A.R. Rahman', 'Anirudh Ravichander']));
  }, [primaryLanguage, secondaryLanguage]);

  const [selectedArtist, setSelectedArtist] = useState<string>('');
  const [artistSongs, setArtistSongs] = useState<SongItem[]>([]);
  const artistPageRef = useRef(1);
  const [isLoadingArtistSongs, setIsLoadingArtistSongs] = useState(false);
  const isLoadingArtistRef = useRef(false);
  const hasMoreArtistRef = useRef(true);

  // Initialize selected artist once featuredArtists is resolved
  useEffect(() => {
    if (!selectedArtist && featuredArtists.length > 0) {
      setSelectedArtist(featuredArtists[0]);
    }
  }, [featuredArtists, selectedArtist]);

  // Load artist discography songs (pitch 15-20 by 15-20)
  useEffect(() => {
    if (!selectedArtist) return;
    let isMounted = true;
    setIsLoadingArtistSongs(true);
    isLoadingArtistRef.current = true;
    artistPageRef.current = 1;
    hasMoreArtistRef.current = true;

    fetchArtistSongsPaged(selectedArtist, 1, 20).then(res => {
      if (isMounted) {
        setArtistSongs(res);
        setIsLoadingArtistSongs(false);
        isLoadingArtistRef.current = false;
        if (!res || res.length === 0) {
          hasMoreArtistRef.current = false;
        }
      }
    }).catch(() => {
      if (isMounted) {
        setIsLoadingArtistSongs(false);
        isLoadingArtistRef.current = false;
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedArtist]);

  const loadMoreArtistSongs = async () => {
    if (isLoadingArtistRef.current || !hasMoreArtistRef.current || !selectedArtist) return;
    isLoadingArtistRef.current = true;
    setIsLoadingArtistSongs(true);
    try {
      const nextPage = artistPageRef.current + 1;
      const batch = await fetchArtistSongsPaged(selectedArtist, nextPage, 15);
      if (!batch || batch.length === 0) {
        hasMoreArtistRef.current = false;
      } else {
        setArtistSongs(prev => {
          const seen = new Set(prev.map(s => String(s.id)));
          const unique = batch.filter(s => !seen.has(String(s.id)));
          return [...prev, ...unique];
        });
        artistPageRef.current = nextPage;
      }
    } catch (e) {
      console.warn('Failed to load more artist tracks:', e);
    } finally {
      isLoadingArtistRef.current = false;
      setIsLoadingArtistSongs(false);
    }
  };

  // Video Songs Infinite Horizontal Scrolling State
  const videoPageRef = useRef(1);
  const isLoadingVideoRef = useRef(false);
  const [isLoadingMoreVideo, setIsLoadingMoreVideo] = useState(false);
  const hasMoreVideoRef = useRef(true);

  const loadMoreVideoSongs = async () => {
    if (isLoadingVideoRef.current || !hasMoreVideoRef.current) return;
    isLoadingVideoRef.current = true;
    setIsLoadingMoreVideo(true);
    try {
      const nextPage = videoPageRef.current + 1;
      const batch = await fetchVideoSongsPaged(primaryLanguage, secondaryLanguage, nextPage, 10, watchedVideoSongs);
      if (!batch || batch.length === 0) {
        hasMoreVideoRef.current = false;
      } else {
        setVideoSongs(prev => {
          const seen = new Set(prev.map(s => String(s.id)));
          const unique = batch.filter(s => !seen.has(String(s.id)));
          return [...prev, ...unique];
        });
        videoPageRef.current = nextPage;
      }
    } catch (e) {
      console.warn('Failed to load more video tracks:', e);
    } finally {
      isLoadingVideoRef.current = false;
      setIsLoadingMoreVideo(false);
    }
  };

  // Secondary Language Melodies Infinite Horizontal Scrolling State
  const secLangPageRef = useRef(1);
  const isLoadingSecLangRef = useRef(false);
  const [isLoadingMoreSecLang, setIsLoadingMoreSecLang] = useState(false);
  const hasMoreSecLangRef = useRef(true);

  const loadMoreSecondaryLangSongs = async () => {
    if (isLoadingSecLangRef.current || !hasMoreSecLangRef.current || !secondaryLanguage) return;
    isLoadingSecLangRef.current = true;
    setIsLoadingMoreSecLang(true);
    try {
      const nextPage = secLangPageRef.current + 1;
      const isEnglish = (secondaryLanguage || '').toLowerCase() === 'english';
      const batch = isEnglish
        ? await fetchRecommendedEnglishSongsPaged(recentlyPlayed, nextPage, 10)
        : await fetchInfiniteLanguageSongs(secondaryLanguage, nextPage, 10);
      if (!batch || batch.length === 0) {
        hasMoreSecLangRef.current = false;
      } else {
        setSecondaryLangSongs(prev => {
          const seen = new Set(prev.map(s => String(s.id)));
          const unique = batch.filter(s => !seen.has(String(s.id)));
          return [...prev, ...unique];
        });
        secLangPageRef.current = nextPage;
      }
    } catch (e) {
      console.warn('Failed to load more secondary language tracks:', e);
    } finally {
      isLoadingSecLangRef.current = false;
      setIsLoadingMoreSecLang(false);
    }
  };

  // 4. Filter Universe Mode (when activeCategory !== 'All')
  const isFilterUniverse = activeCategory !== 'All';
  const [universeSongs, setUniverseSongs] = useState<SongItem[]>([]);
  const [universePage, setUniversePage] = useState(1);
  const [isLoadingUniverse, setIsLoadingUniverse] = useState(false);
  const [hasMoreUniverse, setHasMoreUniverse] = useState(true);

  useEffect(() => {
    if (!isFilterUniverse) {
      setUniverseSongs([]);
      return;
    }
    let isMounted = true;
    setIsLoadingUniverse(true);
    setUniversePage(1);
    setHasMoreUniverse(true);

    fetchMusicFilterUniverseSongs(activeCategory, 1, 15).then(res => {
      if (isMounted) {
        setUniverseSongs(res);
        setIsLoadingUniverse(false);
        if (res.length < 15) setHasMoreUniverse(false);
      }
    }).catch(() => {
      if (isMounted) setIsLoadingUniverse(false);
    });

    return () => {
      isMounted = false;
    };
  }, [isFilterUniverse, activeCategory]);

  const loadMoreUniverseSongs = async () => {
    if (isLoadingUniverse || !hasMoreUniverse || !isFilterUniverse) return;
    setIsLoadingUniverse(true);
    try {
      const nextPage = universePage + 1;
      const batch = await fetchMusicFilterUniverseSongs(activeCategory, nextPage, 15);
      if (batch.length === 0) {
        setHasMoreUniverse(false);
      } else {
        setUniverseSongs(prev => {
          const seen = new Set(prev.map(s => s.id));
          const unique = batch.filter(s => !seen.has(s.id));
          return [...prev, ...unique];
        });
        setUniversePage(nextPage);
        if (batch.length < 15) setHasMoreUniverse(false);
      }
    } catch (e) {
      console.warn('Failed to load more universe tracks:', e);
    } finally {
      setIsLoadingUniverse(false);
    }
  };

  // Infinite Scroll State for Music Home bottom rows
  const [infiniteMusicRows, setInfiniteMusicRows] = useState<{ title: string; songs: SongItem[] }[]>([]);
  const [infiniteBatchIndex, setInfiniteBatchIndex] = useState(0);
  const [isLoadingMoreMusic, setIsLoadingMoreMusic] = useState(false);
  const bottomObserverRef = useRef<HTMLDivElement>(null);



  // Load Language Specific Songs & Video Songs on mount / language change
  useEffect(() => {
    let isMounted = true;
    videoPageRef.current = 1;
    hasMoreVideoRef.current = true;
    secLangPageRef.current = 1;
    hasMoreSecLangRef.current = true;

    async function loadCuratedMusic() {
      try {
        const isEnglish = (secondaryLanguage || '').toLowerCase() === 'english';
        const [primList, secList, vids] = await Promise.all([
          fetchInfiniteLanguageSongs(primaryLanguage, 0, 25),
          isEnglish
            ? fetchRecommendedEnglishSongsPaged(recentlyPlayed, 1, 20)
            : fetchInfiniteLanguageSongs(secondaryLanguage, 0, 25),
          fetchVideoSongsPaged(primaryLanguage, secondaryLanguage, 1, 15, watchedVideoSongs)
        ]);
        if (isMounted) {
          if (primList && primList.length > 0) {
            setPrimaryLangSongs(primList);
            saveCachedInitialMusic('primary_lang', primList);
          }
          if (secList && secList.length > 0) {
            setSecondaryLangSongs(secList);
            saveCachedInitialMusic('secondary_lang', secList);
          }
          if (vids && vids.length > 0) {
            setVideoSongs(vids);
            saveCachedInitialMusic('video_songs', vids);
          }
        }
      } catch (err) {
        console.error('Failed to load language/video music:', err);
      }
    }

    loadCuratedMusic();
    return () => {
      isMounted = false;
    };
  }, [primaryLanguage, secondaryLanguage]);

  // Load next infinite scroll batch: 100% Dynamic music data
  const loadNextMusicBatch = async () => {
    if (isLoadingMoreMusic || isFilterUniverse) return;
    setIsLoadingMoreMusic(true);

    try {
      const shelf = await fetchDynamicMusicShelf(infiniteBatchIndex);
      if (shelf.songs.length > 0) {
        setInfiniteMusicRows(prev => [...prev, { title: shelf.title, songs: shelf.songs }]);
      }
      setInfiniteBatchIndex(prev => prev + 1);
    } catch (err) {
      console.error('Failed to load next dynamic music batch:', err);
    } finally {
      setIsLoadingMoreMusic(false);
    }
  };


  // IntersectionObserver for Infinite Scroll (both Standard Home and Filter Universe)
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          if (isFilterUniverse) {
            if (!isLoadingUniverse && hasMoreUniverse) {
              loadMoreUniverseSongs();
            }
          } else {
            if (!isLoadingMoreMusic) {
              loadNextMusicBatch();
            }
          }
        }
      },
      { rootMargin: '350px' }
    );

    if (bottomObserverRef.current) {
      observer.observe(bottomObserverRef.current);
    }

    return () => observer.disconnect();
  }, [isLoadingMoreMusic, infiniteBatchIndex, primaryLanguage, isFilterUniverse, isLoadingUniverse, hasMoreUniverse, universePage]);

  // General Play Helper
  const handlePlaySong = (song: SongItem, queue?: SongItem[]) => {
    playSong(song, queue);
    openMusicPlayer();
  };

  // Scroll helper
  const scrollContainer = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = ref.current.clientWidth * 0.75;
      ref.current.scrollTo({
        left: direction === 'left' ? ref.current.scrollLeft - scrollAmount : ref.current.scrollLeft + scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Section Refs for Arrow Navigation
  const forYouRef = useRef<HTMLDivElement>(null);
  const discoverRef = useRef<HTMLDivElement>(null);
  const popularRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const secondaryLangRef = useRef<HTMLDivElement>(null);
  const artistRef = useRef<HTMLDivElement>(null);

  // =========================================================================
  // DEDUPLICATION ENGINE (Avoid duplicate items within each section)
  // =========================================================================
  const deduplicateSection = (items: SongItem[]): SongItem[] => {
    const seen = new Set<string>();
    const unique: SongItem[] = [];
    for (const item of items) {
      if (!item || !item.title) continue;
      const idKey = String(item.id || '');
      const coreKey = getSongCoreKey(item.title, item.artist, item.streamUrl);
      if (!seen.has(idKey) && !seen.has(coreKey)) {
        seen.add(idKey);
        seen.add(coreKey);
        unique.push(item);
      }
    }
    return unique;
  };

  // 1. Daily Mix
  const dedupDailyMix = deduplicateSection(dailyMix);

  // 2. Top Picks For You (15-by-15)
  const dedupTopPicks = deduplicateSection(topPicksState.length > 0 ? topPicksState : forYouSongs);

  // 3. Because You Listened
  const dedupBecauseYouListened = becauseYouListened.map(entry => ({
    ...entry,
    songs: deduplicateSection(entry.songs)
  })).filter(entry => entry.songs.length > 0);

  // 4. Popular 20 Songs (Guaranteed full 20 songs)
  const rawPopular = popularLangSongs.length >= 20
    ? popularLangSongs
    : (popularLangSongs.length > 0 ? [...popularLangSongs, ...trendingSongs, ...primaryLangSongs] : trendingSongs);
  const dedupPopularSongs = deduplicateSection(rawPopular).slice(0, 20);

  // 5. Recently Played (Dynamically loaded from user history; fallback to initial recents if empty)
  const dedupRecent = useMemo(() => {
    if (recentlyPlayed && recentlyPlayed.length > 0) {
      return deduplicateSection(recentlyPlayed).slice(0, 20);
    }
    return deduplicateSection(recentSongs).slice(0, 12);
  }, [recentlyPlayed, recentSongs]);

  // 6. Featured Artist Songs (Continuous discography)
  const dedupArtistSongs = deduplicateSection(artistSongs);

  // 7. Discover Weekly (Enriched so it always renders a rich playlist, never only 1 song)
  const rawDiscover = discoverWeekly.length >= 10
    ? discoverWeekly
    : [...discoverWeekly, ...secondaryLangSongs, ...primaryLangSongs];
  const dedupDiscoverWeekly = deduplicateSection(rawDiscover).slice(0, 16);

  // 8. Video Songs
  const dedupVideoSongs = deduplicateSection(videoSongs);

  // 9. Secondary Language Melodies
  const dedupSecondaryLang = deduplicateSection(secondaryLangSongs);

  // 10. Dynamic Infinite Genre Rows
  const dedupInfiniteMusicRows = infiniteMusicRows.map(row => ({
    ...row,
    songs: deduplicateSection(row.songs)
  })).filter(row => row.songs.length > 0);

  // Show Skeleton shimmer loading if initial music content has not loaded
  if (trendingSongs.length === 0 && !isFilterUniverse) {
    return (
      <div className="music-home-screen">
        <TopAppHeader />
        <SkeletonMusicHome />
      </div>
    );
  }

  return (
    <div className="music-home-screen">
      {/* 1. Header: StreamPlay icon, Playlists & Profile */}
      <TopAppHeader />

      <div className="music-home-scrollable">
        {/* ========================================================
            BRANCH A: DYNAMIC FILTER UNIVERSE (activeCategory !== 'All')
            Changes the entire music home based on chosen filter
            ======================================================== */}
        {isFilterUniverse ? (
          <div className="music-section-block section-universe-view">
            <div className="music-universe-header">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h1 className="music-universe-title">{activeCategory} Universe</h1>
                <button
                  type="button"
                  className="music-paged-load-btn"
                  style={{ fontSize: '0.75rem', padding: '5px 12px' }}
                  onClick={() => setActiveCategory('All')}
                >
                  Exit Filter
                </button>
              </div>
              <p className="music-universe-sub">
                Curated dynamic music catalog, popular hits & 15-by-15 tracks for {activeCategory}
              </p>
            </div>

            {/* Universe Top 15 Quick Tile Grid */}
            {universeSongs.length > 0 && (
              <div className="music-section-block">
                <div className="music-section-head">
                  <div className="section-title-wrap">
                    <h2 className="music-section-title">Top 15 {activeCategory} Tracks</h2>
                  </div>
                </div>
                <TwoRowScrollGrid>
                  {universeSongs.slice(0, 15).map((song, idx) => (
                    <CompactTileCard
                      key={song.id || idx}
                      song={song}
                      queue={universeSongs}
                      rank={idx + 1}
                      onPlay={handlePlaySong}
                      showPlayBtn={true}
                    />
                  ))}
                </TwoRowScrollGrid>
              </div>
            )}

            {/* Universe All Tracks (15-by-15 pagination) */}
            <div className="music-section-block">
              <div className="music-section-head">
                <div className="section-title-wrap">
                  <h2 className="music-section-title">All {activeCategory} Music Tracks</h2>
                </div>
              </div>

              <div className="universe-tracks-list">
                {universeSongs.map((song, idx) => {
                  const isCurrent = currentSong?.id === song.id;
                  const isPlayingThis = isCurrent && isPlayingSong;

                  return (
                    <div
                      key={song.id || idx}
                      className={`minimal-track-row ${isCurrent ? 'track-current' : ''}`}
                      onClick={() => handlePlaySong(song, universeSongs)}
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
                        <span className={`track-main-title ${isCurrent ? 'title-playing-lime' : ''}`}>
                          {song.title}
                        </span>
                        <span className="track-artist-album">
                          {song.artist} {song.album ? `• ${song.album}` : ''}
                        </span>
                      </div>

                      <div className="track-right-actions">
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
                              handlePlaySong(song, universeSongs);
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
                })}
              </div>

              {/* Auto-pitch bottom observer anchor for Filter Universe */}
              <div ref={bottomObserverRef} className="music-bottom-loader-anchor">
                {isLoadingUniverse && (
                  <div style={{ width: '100%', marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
                    <div className="stream-glow-spinner" style={{ width: 28, height: 28 }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================
             BRANCH B: STANDARD FULL MUSIC HOME
             ======================================================== */
          <>
            {/* ========================================================
                SECTION 1: YOUR DAILY MIX (3D Fanned Stacked Deck)
                Curated by primary & secondary languages, daily trending, albums
                ======================================================== */}
            {dedupDailyMix.length > 0 && (
              <div className="music-section-block section-daily-mix">
                <DailyMixFannedDeck
                  songs={dedupDailyMix}
                  onPlaySong={handlePlaySong}
                />
              </div>
            )}

            {/* ========================================================
                SECTION 2: TOP PICKS FOR YOU (15-by-15 Infinite Scroll)
                Based on Recommendation Engine (language, vibes, eras)
                ======================================================== */}
            {dedupTopPicks.length > 0 && (
              <div className="music-section-block section-top-picks">
                <div className="music-section-head">
                  <div className="section-title-wrap">
                    <h2 className="music-section-title">Top Picks For You</h2>
                  </div>
                  <div className="section-scroll-arrows">
                    <button
                      className="music-arrow-btn"
                      onClick={() => scrollContainer(forYouRef, 'left')}
                      aria-label="Scroll left"
                    >
                      <ChevronLeft size={17} />
                    </button>
                    <button
                      className="music-arrow-btn"
                      onClick={() => scrollContainer(forYouRef, 'right')}
                      aria-label="Scroll right"
                    >
                      <ChevronRight size={17} />
                    </button>
                  </div>
                </div>

                <div
                  className="music-scroll-row style-square-row"
                  ref={forYouRef}
                  onScroll={(e) => {
                    const el = e.currentTarget;
                    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 300) {
                      loadNextTopPicksBatch();
                    }
                  }}
                >
                  {dedupTopPicks.map((song, idx) => (
                    <SquareMusicCard
                      key={song.id || idx}
                      song={song}
                      queue={dedupTopPicks}
                      onPlay={handlePlaySong}
                    />
                  ))}
                  {isLoadingMoreTopPicks && (
                    <div className="row-auto-pitch-loader" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 80, height: '100%' }}>
                      <div className="stream-glow-spinner" style={{ width: 24, height: 24 }} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================
                SECTION 3: BECAUSE YOU LISTENED (Vinyl Disc Record Cards)
                ======================================================== */}
            {dedupBecauseYouListened.map((entry, bIdx) => (
              <div key={`byl-${entry.anchor.id}-${bIdx}`} className="music-section-block section-vinyl">
                <div className="music-section-head">
                  <div className="section-title-wrap">
                    <h2 className="music-section-title">
                      Because You Listened to "{entry.anchor.title}"
                    </h2>
                  </div>
                </div>

                <div className="music-scroll-row style-vinyl-row">
                  {entry.songs.map((song, idx) => (
                    <VinylMusicCard
                      key={song.id || idx}
                      song={song}
                      queue={entry.songs}
                      onPlay={handlePlaySong}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* ========================================================
                SECTION 3.5: REGIONAL LOCATION SOUND & HITS
                ======================================================== */}
            {userLocation && dedupPopularSongs.length > 0 && (
              <div className="music-section-block section-aura">
                <div className="music-section-head">
                  <div className="section-title-wrap">
                    <h2 className="music-section-title">
                      Trending in {userLocation.name}
                    </h2>
                  </div>
                </div>

                <div className="music-scroll-row style-aura-row">
                  {dedupPopularSongs.slice(0, 10).map((song, idx) => (
                    <AuraMusicCard
                      key={`loc-music-${song.id}-${idx}`}
                      song={song}
                      queue={dedupPopularSongs}
                      onPlay={handlePlaySong}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ========================================================
                SECTION 4: POPULAR 20 SONGS
                - Language capsules: 1st Primary, 2nd Secondary, remaining
                - 2 Rows Vertically Listed, Horizontally Scrollable
                - Ranks #1 to #20
                ======================================================== */}
            <div className="music-section-block section-popular-ranked">
              <div className="music-section-head">
                <div className="section-title-wrap">
                  <h2 className="music-section-title">Popular 20 Songs</h2>
                </div>
                <div className="section-right-actions">
                  <div className="section-scroll-arrows">
                    <button
                      className="music-arrow-btn"
                      onClick={() => scrollContainer(popularRef, 'left')}
                      aria-label="Scroll left"
                    >
                      <ChevronLeft size={17} />
                    </button>
                    <button
                      className="music-arrow-btn"
                      onClick={() => scrollContainer(popularRef, 'right')}
                      aria-label="Scroll right"
                    >
                      <ChevronRight size={17} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Language Capsules Bar (1st Primary, 2nd Secondary, remaining) */}
              <div className="music-lang-capsules-bar">
                {popularLanguages.map(lang => (
                  <button
                    key={lang}
                    className={`music-lang-capsule ${selectedPopularLang === lang ? 'active' : ''}`}
                    onClick={() => setSelectedPopularLang(lang)}
                  >
                    {lang === 'All' ? 'All Languages' : lang}
                  </button>
                ))}
              </div>

              <TwoRowScrollGrid scrollRef={popularRef}>
                {dedupPopularSongs.map((song, idx) => (
                  <CompactTileCard
                    key={song.id || idx}
                    song={song}
                    queue={dedupPopularSongs}
                    rank={idx + 1}
                    onPlay={handlePlaySong}
                  />
                ))}
              </TwoRowScrollGrid>
            </div>

            {/* ========================================================
                SECTION 5: RECENTLY PLAYED (Moved directly ABOVE New Collection)
                ======================================================== */}
            {dedupRecent.length > 0 && (
              <div className="music-section-block section-recent">
                <div className="music-section-head">
                  <div className="section-title-wrap">
                    <h2 className="music-section-title">Recently Played</h2>
                  </div>
                </div>
                <TwoRowScrollGrid>
                  {dedupRecent.map((song, idx) => (
                    <CompactTileCard
                      key={song.id || idx}
                      song={song}
                      queue={dedupRecent}
                      onPlay={handlePlaySong}
                      showPlayBtn={true}
                    />
                  ))}
                </TwoRowScrollGrid>
              </div>
            )}


            {/* ========================================================
                SECTION 7: FEATURED ARTISTS & DISCOGRAPHIES (NEW SECTION)
                Pitches 25 by 25 songs until entire discography is loaded
                ======================================================== */}
            <div className="music-section-block section-featured-artists">
              <div className="music-section-head">
                <div className="section-title-wrap">
                  <h2 className="music-section-title">Featured Artists & Discographies</h2>
                </div>
                <div className="section-scroll-arrows">
                  <button
                    className="music-arrow-btn"
                    onClick={() => scrollContainer(artistRef, 'left')}
                    aria-label="Scroll left"
                  >
                    <ChevronLeft size={17} />
                  </button>
                  <button
                    className="music-arrow-btn"
                    onClick={() => scrollContainer(artistRef, 'right')}
                    aria-label="Scroll right"
                  >
                    <ChevronRight size={17} />
                  </button>
                </div>
              </div>

              {/* Artist Selection Capsules */}
              <div className="artist-capsules-scroll">
                {featuredArtists.map(artist => (
                  <button
                    key={artist}
                    className={`artist-capsule-chip ${selectedArtist === artist ? 'active' : ''}`}
                    onClick={() => setSelectedArtist(artist)}
                  >
                    <Mic2 size={13} style={{ marginRight: 6, display: 'inline', verticalAlign: 'middle' }} />
                    {artist}
                  </button>
                ))}
              </div>

              {/* 25-by-25 Artist Discography Row */}
              {/* 25-by-25 Artist Discography Row with Auto-Pitch */}
              <div
                className="music-scroll-row style-square-row"
                ref={artistRef}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 450) {
                    loadMoreArtistSongs();
                  }
                }}
              >
                {dedupArtistSongs.map((song, idx) => (
                  <SquareMusicCard
                    key={song.id || idx}
                    song={song}
                    queue={dedupArtistSongs}
                    onPlay={handlePlaySong}
                  />
                ))}
                {isLoadingArtistSongs && (
                  <div className="row-auto-pitch-loader" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 80, height: '100%' }}>
                    <div className="stream-glow-spinner" style={{ width: 24, height: 24 }} />
                  </div>
                )}
              </div>
            </div>

            {/* ========================================================
                SECTION 8: DISCOVER WEEKLY (Clean Minimalist Aura Cards)
                ======================================================== */}
            {dedupDiscoverWeekly.length > 0 && (
              <div className="music-section-block section-discover-weekly">
                <div className="music-section-head">
                  <div className="section-title-wrap">
                    <h2 className="music-section-title">Discover Weekly</h2>
                  </div>
                  <div className="section-scroll-arrows">
                    <button
                      className="music-arrow-btn"
                      onClick={() => scrollContainer(discoverRef, 'left')}
                      aria-label="Scroll left"
                    >
                      <ChevronLeft size={17} />
                    </button>
                    <button
                      className="music-arrow-btn"
                      onClick={() => scrollContainer(discoverRef, 'right')}
                      aria-label="Scroll right"
                    >
                      <ChevronRight size={17} />
                    </button>
                  </div>
                </div>

                <div className="music-scroll-row style-aura-row" ref={discoverRef}>
                  {dedupDiscoverWeekly.map((song, idx) => (
                    <AuraMusicCard
                      key={song.id || idx}
                      song={song}
                      queue={dedupDiscoverWeekly}
                      onPlay={handlePlaySong}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ========================================================
                SECTION 9: VIDEO SONGS (16:9 Cinematic Video Cards)
                ======================================================== */}
            {dedupVideoSongs.length > 0 && (
              <div className="music-section-block section-video-songs">
                <div className="music-section-head">
                  <div className="section-title-wrap">
                    <h2 className="music-section-title">Video Songs</h2>
                  </div>
                  <div className="section-scroll-arrows">
                    <button
                      className="music-arrow-btn"
                      onClick={() => scrollContainer(videoRef, 'left')}
                      aria-label="Scroll left"
                    >
                      <ChevronLeft size={17} />
                    </button>
                    <button
                      className="music-arrow-btn"
                      onClick={() => scrollContainer(videoRef, 'right')}
                      aria-label="Scroll right"
                    >
                      <ChevronRight size={17} />
                    </button>
                  </div>
                </div>

                <div
                  className="music-scroll-row style-cinematic-row"
                  ref={videoRef}
                  onScroll={(e) => {
                    const el = e.currentTarget;
                    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 450) {
                      loadMoreVideoSongs();
                    }
                  }}
                >
                  {dedupVideoSongs.map(vs => (
                    <CinematicVideoCard
                      key={vs.id}
                      song={vs}
                      queue={dedupVideoSongs}
                      onPlay={(song, queue) => openVideoSong(song, queue || dedupVideoSongs)}
                    />
                  ))}
                  {isLoadingMoreVideo && (
                    <div className="row-auto-pitch-loader" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 80, height: '100%' }}>
                      <div className="stream-glow-spinner" style={{ width: 24, height: 24 }} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================
                SECTION 10: SECONDARY LANGUAGE (Tall 4:5 Portrait Glass Cards)
                ======================================================== */}
            {dedupSecondaryLang.length > 0 && (
              <div className="music-section-block section-portrait">
                <div className="music-section-head">
                  <div className="section-title-wrap">
                    <h2 className="music-section-title">{secondaryLanguage} Melodies</h2>
                  </div>
                  <div className="section-scroll-arrows">
                    <button
                      className="music-arrow-btn"
                      onClick={() => scrollContainer(secondaryLangRef, 'left')}
                      aria-label="Scroll left"
                    >
                      <ChevronLeft size={17} />
                    </button>
                    <button
                      className="music-arrow-btn"
                      onClick={() => scrollContainer(secondaryLangRef, 'right')}
                      aria-label="Scroll right"
                    >
                      <ChevronRight size={17} />
                    </button>
                  </div>
                </div>

                <div
                  className="music-scroll-row style-portrait-row"
                  ref={secondaryLangRef}
                  onScroll={(e) => {
                    const el = e.currentTarget;
                    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 450) {
                      loadMoreSecondaryLangSongs();
                    }
                  }}
                >
                  {dedupSecondaryLang.map((song, i) => (
                    <PortraitMusicCard
                      key={song.id || i}
                      song={song}
                      queue={dedupSecondaryLang}
                      onPlay={handlePlaySong}
                    />
                  ))}
                  {isLoadingMoreSecLang && (
                    <div className="row-auto-pitch-loader" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 80, height: '100%' }}>
                      <div className="stream-glow-spinner" style={{ width: 24, height: 24 }} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================
                SECTION 11: INFINITE CATEGORY ROWS (Curated Color-Themed Cards)
                ======================================================== */}
            {dedupInfiniteMusicRows.map((row, idx) => (
              <div key={idx} className="music-section-block section-curated-genre">
                <div className="music-section-head">
                  <div className="section-title-wrap">
                    <h2 className="music-section-title">{row.title}</h2>
                  </div>
                </div>
                <div className="music-scroll-row style-curated-row">
                  {row.songs.map((song, i) => (
                    <CuratedMusicCard
                      key={song.id || i}
                      song={song}
                      queue={row.songs}
                      onPlay={handlePlaySong}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Infinite Scroll Trigger Observer Anchor */}
            <div ref={bottomObserverRef} className="music-bottom-loader-anchor">
              {isLoadingMoreMusic && (
                <div style={{ width: '100%', marginTop: '1rem' }}>
                  <SkeletonMusicRow cardCount={6} titleWidth={210} />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
