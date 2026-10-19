import './MusicHomeScreen.css';
import React, { useState, useEffect, useRef } from 'react';
import { TopAppHeader } from '../components/TopAppHeader';
import { SongItem } from '../types/media';
import { useMedia } from '../context/MediaContext';
import { useNavigation } from '../context/NavigationContext';
import { Play, ArrowRight, Video, Sparkles, Clock, Globe } from 'lucide-react';
import { fetchLanguageSongs, fetchVideoSongs, fetchGenreSongs } from '../services/musicService';

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

  // Language Curated Songs State
  const [primaryLangSongs, setPrimaryLangSongs] = useState<SongItem[]>([]);
  const [secondaryLangSongs, setSecondaryLangSongs] = useState<SongItem[]>([]);
  const [videoSongs, setVideoSongs] = useState<SongItem[]>([]);

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
          fetchLanguageSongs(primaryLanguage, 12),
          fetchLanguageSongs(secondaryLanguage, 12),
          fetchVideoSongs(primaryLanguage, 8)
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

  // Load next infinite scroll batch
  const loadNextMusicBatch = async () => {
    if (isLoadingMoreMusic || infiniteBatchIndex >= MUSIC_GENRE_BATCHES.length) return;
    setIsLoadingMoreMusic(true);

    try {
      const genre = MUSIC_GENRE_BATCHES[infiniteBatchIndex];
      const items = await fetchGenreSongs(genre, 10);
      setInfiniteMusicRows(prev => [...prev, { title: genre, songs: items }]);
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
        if (entries[0].isIntersecting && !isLoadingMoreMusic && infiniteBatchIndex < MUSIC_GENRE_BATCHES.length) {
          loadNextMusicBatch();
        }
      },
      { rootMargin: '300px' }
    );

    if (bottomObserverRef.current) {
      observer.observe(bottomObserverRef.current);
    }

    return () => observer.disconnect();
  }, [isLoadingMoreMusic, infiniteBatchIndex]);

  // Accent colors for vertical bars on song cards (matching Image 1)
  const ACCENT_BAR_COLORS = ['#ff9800', '#00e5ff', '#c8ff00', '#ff4081', '#7c4dff', '#00e676'];

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

        {/* 3. Popular Songs Carousel (Matching User Image 1) */}
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
                  onClick={() => openVideoSong(vs)}
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
              <div className="spinner" />
              <span>Loading more music categories...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
