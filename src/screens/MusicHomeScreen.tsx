import './MusicHomeScreen.css';
import React, { useState, useEffect, useRef } from 'react';
import { TopAppHeader } from '../components/TopAppHeader';
import { SongItem } from '../types/media';
import { useMedia } from '../context/MediaContext';
import { useNavigation } from '../context/NavigationContext';
import { Play, ArrowRight, Video, Sparkles, Clock, Globe, RotateCcw, Headphones, Compass } from 'lucide-react';
import { fetchVideoSongs, fetchGenreSongs, fetchInfiniteLanguageSongs } from '../services/musicService';
import { useRecommendations } from '../context/RecommendationContext';
import { RecommendationRow } from '../components/RecommendationRow';

interface MusicHomeScreenProps {
  trendingSongs: SongItem[];
  newSongs: SongItem[];
  recentSongs: SongItem[];
}

export const MusicHomeScreen: React.FC<MusicHomeScreenProps> = ({
  trendingSongs,
  recentSongs
}) => {
  const [activeCategory, setActiveCategory] = useState('All');
  const { playSong, openMusicPlayer, openVideoSong, primaryLanguage, secondaryLanguage } = useMedia();
  const { setActiveScreen } = useNavigation();
  const { dailyMix, forYouSongs, becauseYouListened, discoverWeekly, hasPersonalization } = useRecommendations();

  // Language Curated Songs State
  const [primaryLangSongs, setPrimaryLangSongs] = useState<SongItem[]>([]);
  const [secondaryLangSongs, setSecondaryLangSongs] = useState<SongItem[]>([]);
  const [videoSongs, setVideoSongs] = useState<SongItem[]>([]);

  // Dynamic Category Music State for Capsule-Based Listing
  const [categoryMusicCache, setCategoryMusicCache] = useState<Record<string, SongItem[]>>({});
  const [isCategoryMusicLoading, setIsCategoryMusicLoading] = useState(false);

  // Infinite Scroll State for Music Home
  const [infiniteMusicRows, setInfiniteMusicRows] = useState<{ title: string; songs: SongItem[] }[]>([]);
  const [infiniteBatchIndex, setInfiniteBatchIndex] = useState(0);
  const [isLoadingMoreMusic, setIsLoadingMoreMusic] = useState(false);
  const bottomObserverRef = useRef<HTMLDivElement>(null);

  const MUSIC_GENRE_BATCHES = [
    'Acoustic & Unplugged',
    'Chill Lo-Fi Cafe',
    'EDM & Dance Club',
    'Hip-Hop & Trap Heavy',
    'Romantic Melodies',
    'Devotional & Peace',
    '90s Golden Nostalgia',
    'Indie Pop & Alternative'
  ];

  // Select Categories pills matching Image 1
  const selectCategories = [
    'All',
    'Party',
    'Blues',
    'Sad',
    'Hip-Hop',
    'Rock',
    'Lofi',
    'Devotional',
    'Acoustic',
    'Romance'
  ];

  // New Collection Wide Cards dynamically using real music artwork
  const newCollections = [
    {
      id: 'coll-1',
      title: 'Top Songs Global',
      subtitle: 'Global viral hits',
      image: trendingSongs[0]?.image || '',
      gradient: 'linear-gradient(135deg, #0b1f36 0%, #06111f 100%)',
      query: 'Global Pop Hits'
    },
    {
      id: 'coll-2',
      title: `${primaryLanguage} Blockbusters`,
      subtitle: `Curated ${primaryLanguage} tracks`,
      image: primaryLangSongs[0]?.image || trendingSongs[1]?.image || '',
      gradient: 'linear-gradient(135deg, #1b2612 0%, #0c1407 100%)',
      query: `${primaryLanguage} Top Hits 2026`
    },
    {
      id: 'coll-3',
      title: 'Viral Club Classics',
      subtitle: 'High energy dance beats',
      image: secondaryLangSongs[0]?.image || trendingSongs[2]?.image || '',
      gradient: 'linear-gradient(135deg, #2b1238 0%, #15061c 100%)',
      query: 'Club Dance Hits'
    }
  ];

  // Load Language Specific Songs & Video Songs on mount / language change
  useEffect(() => {
    let isMounted = true;

    async function loadCuratedMusic() {
      try {
        const [primList, secList, vids] = await Promise.all([
          fetchInfiniteLanguageSongs(primaryLanguage, 0, 25),
          fetchInfiniteLanguageSongs(secondaryLanguage, 0, 20),
          fetchVideoSongs(primaryLanguage, 12)
        ]);
        if (isMounted) {
          setPrimaryLangSongs(primList);
          setSecondaryLangSongs(secList);
          setVideoSongs(vids);
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

  // Load Genre Songs when Category Capsule is selected
  useEffect(() => {
    if (activeCategory === 'All') return;

    if (!categoryMusicCache[activeCategory]) {
      setIsCategoryMusicLoading(true);
      fetchGenreSongs(activeCategory, 25)
        .then(items => {
          setCategoryMusicCache(prev => ({ ...prev, [activeCategory]: items }));
        })
        .catch(err => {
          console.error(`Failed to load music for ${activeCategory}:`, err);
        })
        .finally(() => setIsCategoryMusicLoading(false));
    }
  }, [activeCategory, categoryMusicCache]);

  // Load next infinite scroll batch (never-ending continuous music feed)
  const loadNextMusicBatch = async () => {
    if (isLoadingMoreMusic || activeCategory !== 'All') return;
    setIsLoadingMoreMusic(true);

    try {
      if (infiniteBatchIndex < MUSIC_GENRE_BATCHES.length) {
        const genre = MUSIC_GENRE_BATCHES[infiniteBatchIndex];
        const items = await fetchGenreSongs(genre, 15);
        if (items.length > 0) {
          setInfiniteMusicRows(prev => [...prev, { title: genre, songs: items }]);
        }
      } else {
        // Continue loading deep seed batches of user's primary language
        const langBatch = infiniteBatchIndex - MUSIC_GENRE_BATCHES.length + 1;
        const items = await fetchInfiniteLanguageSongs(primaryLanguage, langBatch, 20);
        if (items.length > 0) {
          const titles = [
            `${primaryLanguage} Retro Hits`,
            `${primaryLanguage} Indie Spotlight`,
            `${primaryLanguage} Acoustic Melodies`,
            `${primaryLanguage} Golden Era Classics`,
            `${primaryLanguage} Dance Anthems`
          ];
          const rowTitle = titles[(langBatch - 1) % titles.length];
          setInfiniteMusicRows(prev => [...prev, { title: `${rowTitle} Vol. ${langBatch}`, songs: items }]);
        }
      }
      setInfiniteBatchIndex(prev => prev + 1);
    } catch (err) {
      console.error('Failed to load next music batch:', err);
    } finally {
      setIsLoadingMoreMusic(false);
    }
  };

  // Automatic Infinite Scroll IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !isLoadingMoreMusic && activeCategory === 'All') {
          loadNextMusicBatch();
        }
      },
      { rootMargin: '300px' }
    );

    if (bottomObserverRef.current) {
      observer.observe(bottomObserverRef.current);
    }

    return () => observer.disconnect();
  }, [isLoadingMoreMusic, infiniteBatchIndex, activeCategory, primaryLanguage]);

  // Accent colors for vertical bars on song cards (matching Image 1)
  const ACCENT_BAR_COLORS = ['#ff9800', '#00e5ff', '#c8ff00', '#ff4081', '#7c4dff', '#00e676'];

  const currentCategorySongs = categoryMusicCache[activeCategory] || [];

  return (
    <div className="music-home-screen">
      {/* 1. Header: StreamPlay icon (left), Playlist icon & Profile icon (right) */}
      <TopAppHeader />

      <div className="music-home-scrollable">
        {/* 2. Select Categories Pills (Matching User Image 1) */}
        <div className="select-categories-section">
          <h3 className="music-section-title">Select Categories</h3>
          <div className="categories-pill-scroll">
            {selectCategories.map(cat => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  className={`category-pill-item ${isActive ? 'active-lime' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Capsule-Based Listing for Music */}
        {activeCategory !== 'All' ? (
          <div className="music-capsule-listing-view">
            <div className="music-capsule-hero">
              <div className="music-capsule-hero-left">
                <span className="music-capsule-badge">
                  <Sparkles size={13} className="text-lime" /> {activeCategory.toUpperCase()} COLLECTION
                </span>
                <h2 className="music-capsule-heading">{activeCategory} Vibes & Melodies</h2>
                <p className="music-capsule-sub">
                  {currentCategorySongs.length} Ultra-HD 320kbps CD-Quality tracks
                </p>

                {currentCategorySongs.length > 0 && (
                  <button
                    className="music-capsule-play-all-btn"
                    onClick={() => {
                      playSong(currentCategorySongs[0], currentCategorySongs);
                      openMusicPlayer();
                    }}
                    title="Play All Tracks"
                  >
                    <Play size={16} fill="#000000" color="#000000" />
                    <span>Play All ({currentCategorySongs.length} Tracks)</span>
                  </button>
                )}
              </div>

              <button
                className="music-capsule-reset-btn"
                onClick={() => setActiveCategory('All')}
                title="Return to full music catalog"
              >
                <RotateCcw size={14} />
                <span>Show All</span>
              </button>
            </div>

            {isCategoryMusicLoading && currentCategorySongs.length === 0 ? (
              <div className="music-capsule-loading">
                <div className="spinner lime-spinner" />
                <p>Loading 320kbps {activeCategory} tracks...</p>
              </div>
            ) : currentCategorySongs.length === 0 ? (
              <div className="music-capsule-empty">
                <p>No tracks found for {activeCategory}.</p>
                <button
                  className="music-capsule-back-btn"
                  onClick={() => setActiveCategory('All')}
                >
                  Browse All Music
                </button>
              </div>
            ) : (
              <div className="music-capsule-tracks-grid">
                {currentCategorySongs.map((song, idx) => (
                  <div
                    key={song.id || idx}
                    className="music-capsule-track-card"
                    onClick={() => {
                      playSong(song, currentCategorySongs);
                      openMusicPlayer();
                    }}
                  >
                    <div className="track-art-wrapper">
                      <img src={song.image} alt={song.title} className="track-art-img" />
                      <div className="track-play-hover-btn">
                        <Play size={18} fill="#000000" color="#000000" style={{ marginLeft: 2 }} />
                      </div>
                      <span className="track-card-badge">320kbps</span>
                    </div>

                    <div className="track-card-meta">
                      <h4 className="track-card-title" title={song.title}>
                        {song.title}
                      </h4>
                      <p className="track-card-artist" title={song.artist}>
                        {song.artist}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Default All Music Sections (when activeCategory === 'All') */
          <>
            {/* 1. Daily Mix (Personalized for Current Time of Day) */}
            {dailyMix.length > 0 && (
              <RecommendationRow
                title="Your Daily Mix"
                subtitle="Curated for this time of day based on your audio habits • 100% Free"
                badgeText="Daily Mix"
                items={dailyMix}
                type="song"
                icon={<Clock size={18} className="text-cyan" />}
              />
            )}

            {/* 2. Top Picks For You (Affinity & Language Match) */}
            {forYouSongs.length > 0 && (
              <RecommendationRow
                title="Top Picks For You"
                subtitle={
                  hasPersonalization
                    ? "Curated dynamically from your favorite artists & tracks • 100% Free"
                    : "Top viral tracks curated for your library • 100% Free"
                }
                badgeText={hasPersonalization ? "AI Match" : "Top Pick"}
                items={forYouSongs}
                type="song"
                icon={<Sparkles size={18} className="text-lime" />}
              />
            )}

            {/* 3. Because You Listened (Similar tracks) */}
            {becauseYouListened.map((entry, idx) => (
              <RecommendationRow
                key={`byl-${entry.anchor.id}-${idx}`}
                title={`Because You Listened to "${entry.anchor.title}"`}
                subtitle={`Similar artists and vibe to ${entry.anchor.artist || 'recent tracks'} • 100% Free`}
                badgeText="Similarity"
                items={entry.songs}
                type="song"
                icon={<Headphones size={18} className="text-cyan" />}
              />
            ))}

            {/* 4. Discover Weekly (Exploration Picks) */}
            {discoverWeekly.length > 0 && (
              <RecommendationRow
                title="Discover Weekly"
                subtitle="Fresh sounds & new artists outside your usual taste • 100% Free"
                badgeText="Explore"
                items={discoverWeekly}
                type="song"
                icon={<Compass size={18} className="text-lime" />}
              />
            )}

            {/* 5. Popular Songs Carousel (Matching User Image 1) */}
            <div className="popular-songs-section">
              <div className="section-head-split">
                <h3 className="music-section-title">Popular Songs</h3>
                <span className="see-all-link" onClick={() => setActiveScreen('search')}>
                  See all
                </span>
              </div>

              <div className="popular-songs-scroll">
                {(trendingSongs.length ? trendingSongs : primaryLangSongs).slice(0, 10).map((song, idx) => {
                  const accent = song.accentColor || ACCENT_BAR_COLORS[idx % ACCENT_BAR_COLORS.length];
                  return (
                    <div
                      key={song.id || idx}
                      className="popular-song-card"
                      onClick={() => {
                        playSong(song, trendingSongs);
                        openMusicPlayer();
                      }}
                    >
                      <div className="popular-card-art-wrap">
                        <img src={song.image} alt={song.title} className="popular-card-art" />
                        <div className="popular-card-play-btn">
                          <Play size={18} fill="#ffffff" color="#ffffff" style={{ marginLeft: 2 }} />
                        </div>
                      </div>

                      {/* Title with Vertical Color Accent Bar (Matches Image 1) */}
                      <div className="popular-song-info">
                        <div className="song-title-row">
                          <span className="vertical-accent-bar" style={{ background: accent }} />
                          <span className="popular-song-name">{song.title}</span>
                        </div>
                        <span className="popular-song-artist">{song.artist}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. New Collection Wide Cards (Matching User Image 1) */}
            <div className="new-collection-section">
              <h3 className="music-section-title">New Collection</h3>
              <div className="new-collection-scroll">
                {newCollections.map(coll => (
                  <div
                    key={coll.id}
                    className="collection-wide-card"
                    style={{ background: coll.gradient }}
                    onClick={() => setActiveScreen('search')}
                  >
                    <div className="collection-card-left">
                      <h4 className="collection-card-title">{coll.title}</h4>
                      <p className="collection-card-sub">{coll.subtitle}</p>
                      <button className="collection-arrow-btn" aria-label="Explore collection">
                        <ArrowRight size={17} />
                      </button>
                    </div>
                    <div className="collection-card-right">
                      {coll.image ? (
                        <img src={coll.image} alt={coll.title} className="collection-artist-img" />
                      ) : (
                        <div className="collection-artist-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.08)' }}>
                          <Sparkles size={24} style={{ opacity: 0.6 }} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Video Songs Section (Supported with 4K Video Playback) */}
            {videoSongs.length > 0 && (
              <div className="video-songs-section">
                <div className="section-head-split">
                  <div className="head-with-badge">
                    <Video size={18} className="text-lime" />
                    <h3 className="music-section-title">Video Songs</h3>
                  </div>
                  <span className="video-4k-badge">4K ULTRA HD</span>
                </div>

                <div className="video-songs-scroll">
                  {videoSongs.map(vs => (
                    <div
                      key={vs.id}
                      className="video-song-card-item"
                      onClick={() => openVideoSong(vs, videoSongs)}
                    >
                      <div className="video-thumb-container">
                        <img src={vs.image} alt={vs.title} className="video-thumb-img" />
                        <div className="video-play-overlay">
                          <div className="video-play-circle">
                            <Play size={18} fill="#ffffff" color="#ffffff" style={{ marginLeft: 2 }} />
                          </div>
                        </div>
                        <span className="video-duration-tag">MUSIC VIDEO</span>
                      </div>
                      <h4 className="video-song-title">{vs.title}</h4>
                      <p className="video-song-artist">{vs.artist}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. Language Curated Sections: Primary Language (${primaryLanguage}) */}
            {primaryLangSongs.length > 0 && (
              <div className="language-music-section">
                <div className="section-head-split">
                  <div className="head-with-badge">
                    <Globe size={18} className="text-lime" />
                    <h3 className="music-section-title">{primaryLanguage} Chartbusters</h3>
                  </div>
                  <span className="lang-tag-pill">Primary</span>
                </div>

                <div className="popular-songs-scroll">
                  {primaryLangSongs.map((song, i) => (
                    <div
                      key={song.id || i}
                      className="popular-song-card"
                      onClick={() => {
                        playSong(song, primaryLangSongs);
                        openMusicPlayer();
                      }}
                    >
                      <div className="popular-card-art-wrap">
                        <img src={song.image} alt={song.title} className="popular-card-art" />
                        <div className="popular-card-play-btn">
                          <Play size={18} fill="#fff" color="#fff" />
                        </div>
                      </div>
                      <div className="popular-song-info">
                        <div className="song-title-row">
                          <span className="vertical-accent-bar" style={{ background: '#c8ff00' }} />
                          <span className="popular-song-name">{song.title}</span>
                        </div>
                        <span className="popular-song-artist">{song.artist}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. Secondary Language (${secondaryLanguage}) */}
            {secondaryLangSongs.length > 0 && (
              <div className="language-music-section">
                <div className="section-head-split">
                  <div className="head-with-badge">
                    <Sparkles size={18} className="text-cyan" />
                    <h3 className="music-section-title">{secondaryLanguage} Melodies</h3>
                  </div>
                  <span className="lang-tag-pill">Secondary</span>
                </div>

                <div className="popular-songs-scroll">
                  {secondaryLangSongs.map((song, i) => (
                    <div
                      key={song.id || i}
                      className="popular-song-card"
                      onClick={() => {
                        playSong(song, secondaryLangSongs);
                        openMusicPlayer();
                      }}
                    >
                      <div className="popular-card-art-wrap">
                        <img src={song.image} alt={song.title} className="popular-card-art" />
                        <div className="popular-card-play-btn">
                          <Play size={18} fill="#fff" color="#fff" />
                        </div>
                      </div>
                      <div className="popular-song-info">
                        <div className="song-title-row">
                          <span className="vertical-accent-bar" style={{ background: '#00e5ff' }} />
                          <span className="popular-song-name">{song.title}</span>
                        </div>
                        <span className="popular-song-artist">{song.artist}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 8. Recently Played (if any) */}
            {recentSongs.length > 0 && (
              <div className="music-recent-section">
                <div className="section-title-wrap">
                  <Clock size={16} className="text-neon" />
                  <h3 className="music-section-title">Recently Played</h3>
                </div>
                <div className="recent-songs-row">
                  {recentSongs.slice(0, 6).map(song => (
                    <div
                      key={song.id}
                      className="recent-song-mini-card"
                      onClick={() => {
                        playSong(song, recentSongs);
                        openMusicPlayer();
                      }}
                    >
                      <img src={song.image} alt={song.title} className="recent-mini-thumb" />
                      <div className="recent-mini-text">
                        <span className="mini-title">{song.title}</span>
                        <span className="mini-artist">{song.artist}</span>
                      </div>
                      <button className="recent-mini-play">
                        <Play size={14} fill="#fff" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 9. Infinite Scrolling Music Category Rows */}
            {infiniteMusicRows.map((row, idx) => (
              <div key={idx} className="popular-songs-section">
                <div className="section-head-split">
                  <h3 className="music-section-title">{row.title}</h3>
                </div>
                <div className="popular-songs-scroll">
                  {row.songs.map((song, i) => (
                    <div
                      key={song.id || i}
                      className="popular-song-card"
                      onClick={() => {
                        playSong(song, row.songs);
                        openMusicPlayer();
                      }}
                    >
                      <div className="popular-card-art-wrap">
                        <img src={song.image} alt={song.title} className="popular-card-art" />
                        <div className="popular-card-play-btn">
                          <Play size={18} fill="#fff" color="#fff" />
                        </div>
                      </div>
                      <div className="popular-song-info">
                        <div className="song-title-row">
                          <span className="vertical-accent-bar" style={{ background: ACCENT_BAR_COLORS[i % ACCENT_BAR_COLORS.length] }} />
                          <span className="popular-song-name">{song.title}</span>
                        </div>
                        <span className="popular-song-artist">{song.artist}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Infinite Scroll Trigger Observer Anchor */}
            <div ref={bottomObserverRef} className="music-bottom-loader-anchor">
              {isLoadingMoreMusic && (
                <div className="infinite-scroll-loading">
                  <div className="spinner lime-spinner" />
                  <span>Loading more music categories...</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
