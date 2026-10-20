import './MusicFilterSheetModal.css';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  RotateCcw,
  Check,
  Disc3,
  Flame,
  Radio,
  Sparkles
} from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';
import { useMedia } from '../context/MediaContext';

interface PlatformItem {
  id: string;
  name: string;
  query: string;
  renderLogo: () => React.ReactNode;
}

interface LanguageItem {
  code: string;
  nativeTitle: string;
  englishTitle: string;
  query: string;
  image: string;
  gradient: string;
}

interface GenrePhotoItem {
  id: string;
  name: string;
  query: string;
  image: string;
}

interface EraItem {
  id: string;
  label: string;
  years: string;
  query: string;
}

export const MusicFilterSheetModal: React.FC = () => {
  const {
    appMode,
    isFilterSheetOpen,
    closeFilterSheet,
    activeCategory,
    setActiveCategory,
    setSearchQuery,
    setActiveScreen
  } = useNavigation();

  const { primaryLanguage, setPrimaryLanguage } = useMedia();
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All');
  const [selectedQuality, setSelectedQuality] = useState<string>('320kbps');

  if (!isFilterSheetOpen || appMode !== 'music') return null;

  const handleResetFilters = () => {
    setActiveCategory('All');
    setSelectedPlatform('All');
  };

  const hasActiveFilters = activeCategory !== 'All' || selectedPlatform !== 'All';

  // Quick Browse Action
  const handleSelectBrowse = (category: string, query: string) => {
    setSearchQuery(query);
    setActiveCategory(category);
    setActiveScreen('music-search');
    closeFilterSheet();
  };

  // Select Platform / Label
  const handleSelectPlatform = (platform: PlatformItem) => {
    setSelectedPlatform(platform.id);
    setSearchQuery(platform.query);
    setActiveCategory(platform.name);
    setActiveScreen('music-search');
    closeFilterSheet();
  };

  // Select Language
  const handleSelectLanguage = (lang: LanguageItem) => {
    setPrimaryLanguage(lang.englishTitle);
    setActiveCategory('All');
    setActiveScreen('home');
    closeFilterSheet();
  };

  // Select Genre
  const handleSelectGenre = (genre: GenrePhotoItem) => {
    setSearchQuery(genre.query);
    setActiveCategory(genre.name);
    setActiveScreen('music-search');
    closeFilterSheet();
  };

  // Select Era
  const handleSelectEra = (era: EraItem) => {
    setSearchQuery(era.query);
    setActiveCategory(era.label);
    setActiveScreen('music-search');
    closeFilterSheet();
  };

  // 1. Curated Streaming Platforms & Labels (Vector Brand Logos)
  const MUSIC_PLATFORMS: PlatformItem[] = [
    {
      id: 'spotify',
      name: 'Spotify Hits',
      query: 'Spotify Top 50 Global Hits',
      renderLogo: () => (
        <div className="logo-spotify-brand">
          <svg viewBox="0 0 24 24" className="brand-svg-icon spotify-green">
            <path
              fill="#1db954"
              d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.627.627 0 0 1-.86.208c-2.355-1.439-5.32-1.765-8.814-.967a.628.628 0 1 1-.278-1.226c3.824-.874 7.106-.502 9.744 1.115.29.176.385.56.208.87zm1.226-2.723a.786.786 0 0 1-1.08.26c-2.695-1.657-6.804-2.136-9.99-1.168a.786.786 0 1 1-.468-1.5c3.64-1.107 8.18-.577 11.278 1.328a.786.786 0 0 1 .26 1.08zm.106-2.835c-3.23-1.918-8.56-2.095-11.64-1.16a.944.944 0 1 1-.548-1.808c3.54-1.074 9.426-.867 13.125 1.328a.943.943 0 0 1-.937 1.64z"
            />
          </svg>
          <span className="platform-wordmark">Spotify</span>
        </div>
      )
    },
    {
      id: 'apple',
      name: 'Apple Music',
      query: 'Apple Music Essentials Top 100',
      renderLogo: () => (
        <div className="logo-apple-music">
          <svg viewBox="0 0 24 24" className="brand-svg-icon apple-pink">
            <path
              fill="#fa2d48"
              d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 1.01-2.87-.96.04-2.07.65-2.73 1.41-.56.63-1.07 1.68-.96 2.7.02 0 .04 0 .06 0 1.06 0 2.01-.49 2.62-1.24z"
            />
          </svg>
          <span className="platform-wordmark">Music</span>
        </div>
      )
    },
    {
      id: 'ytmusic',
      name: 'YouTube Music',
      query: 'YouTube Music Viral Trending Hits',
      renderLogo: () => (
        <div className="logo-yt-music">
          <svg viewBox="0 0 24 24" className="brand-svg-icon yt-red">
            <path
              fill="#ff0000"
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm-2-6.5v4l3.5-2-3.5-2z"
            />
          </svg>
          <span className="platform-wordmark">YT Music</span>
        </div>
      )
    },
    {
      id: 'amazon',
      name: 'Amazon Music',
      query: 'Amazon Music Prime Unlimited Best Hits',
      renderLogo: () => (
        <div className="logo-amazon-music">
          <span className="amazon-txt">amazon</span>
          <span className="amazon-accent">music</span>
        </div>
      )
    },
    {
      id: 'coke-studio',
      name: 'Coke Studio',
      query: 'Coke Studio All Seasons Songs',
      renderLogo: () => (
        <div className="logo-coke-studio">
          <span className="coke-badge">Coke Studio</span>
        </div>
      )
    },
    {
      id: 'mtv-unplugged',
      name: 'MTV Unplugged',
      query: 'MTV Unplugged Live Acoustic',
      renderLogo: () => (
        <div className="logo-mtv">
          <span className="mtv-m">M</span>
          <span className="mtv-sub">unplugged</span>
        </div>
      )
    },
    {
      id: 'billboard',
      name: 'Billboard Hot 100',
      query: 'Billboard Hot 100 Top Songs',
      renderLogo: () => (
        <div className="logo-billboard">
          <span className="bb-black">billboard</span>
          <span className="bb-cyan">100</span>
        </div>
      )
    },
    {
      id: 'sony-music',
      name: 'Sony Music',
      query: 'Sony Music India Global Hits',
      renderLogo: () => (
        <div className="logo-sony-music">
          <Disc3 size={15} color="#00e5ff" />
          <span className="sony-text">SONY</span>
        </div>
      )
    }
  ];

  // 2. Popular Languages with Singer / Musician Portraits
  const POPULAR_LANGUAGES: LanguageItem[] = [
    {
      code: 'Hindi',
      nativeTitle: 'हिंदी',
      englishTitle: 'Hindi',
      query: 'Hindi Songs 2026',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=320&auto=format&fit=crop&q=80',
      gradient: 'linear-gradient(90deg, #181d2f 0%, #202741 55%, rgba(32, 39, 65, 0.4) 100%)'
    },
    {
      code: 'English',
      nativeTitle: 'Global',
      englishTitle: 'English',
      query: 'English Global Hits 2026',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=320&auto=format&fit=crop&q=80',
      gradient: 'linear-gradient(90deg, #32201b 0%, #442a22 55%, rgba(68, 42, 34, 0.4) 100%)'
    },
    {
      code: 'Punjabi',
      nativeTitle: 'ਪੰਜਾਬੀ',
      englishTitle: 'Punjabi',
      query: 'Punjabi Songs 2026',
      image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=320&auto=format&fit=crop&q=80',
      gradient: 'linear-gradient(90deg, #2b181a 0%, #442125 55%, rgba(68, 33, 37, 0.4) 100%)'
    },
    {
      code: 'Tamil',
      nativeTitle: 'தமிழ்',
      englishTitle: 'Tamil',
      query: 'Tamil Songs 2026',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=320&auto=format&fit=crop&q=80',
      gradient: 'linear-gradient(90deg, #2e1e1a 0%, #412822 55%, rgba(65, 40, 34, 0.4) 100%)'
    },
    {
      code: 'Telugu',
      nativeTitle: 'తెలుగు',
      englishTitle: 'Telugu',
      query: 'Telugu Songs 2026',
      image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=320&auto=format&fit=crop&q=80',
      gradient: 'linear-gradient(90deg, #292119 0%, #3d3023 55%, rgba(61, 48, 35, 0.4) 100%)'
    },
    {
      code: 'Malayalam',
      nativeTitle: 'മലയാളം',
      englishTitle: 'Malayalam',
      query: 'Malayalam Songs 2026',
      image: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=320&auto=format&fit=crop&q=80',
      gradient: 'linear-gradient(90deg, #172722 0%, #203932 55%, rgba(32, 57, 50, 0.4) 100%)'
    },
    {
      code: 'Kannada',
      nativeTitle: 'ಕನ್ನಡ',
      englishTitle: 'Kannada',
      query: 'Kannada Songs 2026',
      image: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=320&auto=format&fit=crop&q=80',
      gradient: 'linear-gradient(90deg, #2c1a20 0%, #3e242d 55%, rgba(62, 36, 45, 0.4) 100%)'
    },
    {
      code: 'Korean',
      nativeTitle: '한국어',
      englishTitle: 'K-Pop',
      query: 'K-Pop Hits BTS Blackpink',
      image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=320&auto=format&fit=crop&q=80',
      gradient: 'linear-gradient(90deg, #28192a 0%, #3f2244 55%, rgba(63, 34, 68, 0.4) 100%)'
    },
    {
      code: 'Spanish',
      nativeTitle: 'Español',
      englishTitle: 'Latin',
      query: 'Latin Reggaeton Pop Hits',
      image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=320&auto=format&fit=crop&q=80',
      gradient: 'linear-gradient(90deg, #2c1e14 0%, #462c1d 55%, rgba(70, 44, 29, 0.4) 100%)'
    }
  ];

  // 3. Popular Genres with Real Stage & Sound Photography Backdrops
  const POPULAR_GENRES: GenrePhotoItem[] = [
    {
      id: 'pop',
      name: 'Pop Hits',
      query: 'Pop Hits 2026',
      image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80'
    },
    {
      id: 'bollywood',
      name: 'Bollywood',
      query: 'Bollywood Top Hits',
      image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&auto=format&fit=crop&q=80'
    },
    {
      id: 'hiphop',
      name: 'Hip-Hop & Rap',
      query: 'Hip Hop Rap Beats',
      image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&auto=format&fit=crop&q=80'
    },
    {
      id: 'lofi',
      name: 'Chill Lo-Fi',
      query: 'Chill Lo-Fi Beats Study',
      image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&auto=format&fit=crop&q=80'
    },
    {
      id: 'edm',
      name: 'EDM & Dance',
      query: 'EDM Dance Festival Beats',
      image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=80'
    },
    {
      id: 'romance',
      name: 'Romance',
      query: 'Romantic Love Melodies',
      image: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&auto=format&fit=crop&q=80'
    },
    {
      id: 'rock',
      name: 'Rock & Indie',
      query: 'Rock Alternative Indie Classics',
      image: 'https://images.unsplash.com/photo-1464375117522-1311d6a5b81f?w=400&auto=format&fit=crop&q=80'
    },
    {
      id: 'devotional',
      name: 'Devotional',
      query: 'Devotional Spiritual Songs',
      image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&auto=format&fit=crop&q=80'
    },
    {
      id: 'nostalgia',
      name: '90s Nostalgia',
      query: '90s Golden Hits Evergreen',
      image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80'
    },
    {
      id: 'workout',
      name: 'Workout Energy',
      query: 'Workout Gym Motivation EDM',
      image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&auto=format&fit=crop&q=80'
    }
  ];

  // 4. Decades & Eras
  const MUSIC_ERAS: EraItem[] = [
    { id: 'era-2020s', label: '2020s Viral Era', years: '2020 - 2026', query: 'Top Viral Hits 2020s' },
    { id: 'era-2010s', label: '2010s Golden Hits', years: '2010 - 2019', query: 'Best Hits 2010s Decade' },
    { id: 'era-2000s', label: '2000s Nostalgia', years: '2000 - 2009', query: 'Y2K 2000s Nostalgia Songs' },
    { id: 'era-1990s', label: '90s Golden Era', years: '1990 - 1999', query: '90s Golden Melodies' },
    { id: 'era-1980s', label: '80s Retro Synth', years: '1980 - 1989', query: '80s Retro Synthwave Classics' },
    { id: 'era-classics', label: 'Vintage Classics', years: 'Pre-1980', query: 'Old Evergreen Classic Songs' }
  ];

  // 5. Sound Quality
  const AUDIO_QUALITIES = [
    { id: '320kbps', label: 'Ultra-HD 320kbps', badge: 'STUDIO' },
    { id: 'atmos', label: 'Dolby Atmos Spatial', badge: '3D AUDIO' },
    { id: 'lossless', label: 'Lossless Hi-Fi', badge: 'LOSSLESS' }
  ];

  return (
    <AnimatePresence>
      <div className="music-filter-overlay" onClick={closeFilterSheet}>
        <motion.div
          className="music-filter-drawer"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Pull Handle Bar - Identical to Movie Filter Sheet */}
          <div className="sheet-drag-handle" />

          {/* Minimalist Header Bar */}
          <div className="sheet-header-bar">
            <div className="sheet-title-group">
              <h3 className="sheet-heading">Filters</h3>
            </div>

            <div className="sheet-header-actions">
              {hasActiveFilters && (
                <button
                  className="sheet-reset-btn"
                  onClick={handleResetFilters}
                  title="Reset active music filters"
                >
                  <RotateCcw size={13} />
                  <span>Reset</span>
                </button>
              )}
              <button
                className="sheet-close-btn"
                onClick={closeFilterSheet}
                aria-label="Close music filters"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Scrollable Sheet Body */}
          <div className="sheet-scroll-body">
            {/* SECTION 1: Browse Cards (Matches movie mode Sparks / News / New & Hot) */}
            <div className="sheet-section-block">
              <div className="browse-cards-row">
                <div
                  className="browse-card browse-charts"
                  onClick={() => handleSelectBrowse('Top Charts', 'Top 50 Global Viral Charts')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="browse-watermark-icon">
                    <Flame size={40} strokeWidth={1.5} />
                  </div>
                  <span className="browse-card-label">Top Charts</span>
                </div>

                <div
                  className="browse-card browse-soundscapes"
                  onClick={() => handleSelectBrowse('Soundscapes', 'Ambient Chill Soundscapes')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="browse-watermark-icon">
                    <Radio size={40} strokeWidth={1.5} />
                  </div>
                  <span className="browse-card-label">Soundscapes</span>
                </div>

                <div
                  className="browse-card browse-fresh"
                  onClick={() => handleSelectBrowse('New Releases', 'New Music Releases 2026')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="browse-watermark-icon">
                    <Sparkles size={40} strokeWidth={1.5} />
                  </div>
                  <span className="browse-card-label">Fresh Drops</span>
                </div>
              </div>
            </div>

            {/* SECTION 2: Streaming Platforms & Record Labels (Matches Movie Studios) */}
            <div className="sheet-section-block">
              <h4 className="sheet-section-title">Studios & Platforms</h4>
              <div className="studios-grid">
                {MUSIC_PLATFORMS.map(platform => {
                  const isSelected = selectedPlatform === platform.id;
                  return (
                    <div
                      key={platform.id}
                      className={`studio-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectPlatform(platform)}
                      role="button"
                      tabIndex={0}
                      title={platform.name}
                    >
                      {platform.renderLogo()}
                      {isSelected && (
                        <div className="studio-check-dot">
                          <Check size={10} color="#000000" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 3: Popular Languages with Artist Portraits (Matches Movie Languages) */}
            <div className="sheet-section-block">
              <h4 className="sheet-section-title">Popular Languages</h4>
              <div className="languages-grid">
                {POPULAR_LANGUAGES.map(lang => {
                  const isCurrent = primaryLanguage.toLowerCase() === lang.englishTitle.toLowerCase();
                  return (
                    <div
                      key={lang.code}
                      className={`language-card ${isCurrent ? 'selected-lang' : ''}`}
                      style={{ background: lang.gradient }}
                      onClick={() => handleSelectLanguage(lang)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="language-card-info">
                        <span className="lang-native">{lang.nativeTitle}</span>
                        <span className="lang-english">{lang.englishTitle}</span>
                      </div>
                      <div className="language-card-img-wrap">
                        <img
                          src={lang.image}
                          alt={lang.englishTitle}
                          className="language-actor-img"
                          loading="lazy"
                        />
                        <div className="language-fade-mask" />
                      </div>
                      {isCurrent && (
                        <div className="lang-active-dot">
                          <Check size={11} color="#000000" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 4: Popular Genres & Vibes with Photography Backdrops (Matches Movie Genres) */}
            <div className="sheet-section-block">
              <h4 className="sheet-section-title">Popular Genres & Vibes</h4>
              <div className="genres-photo-grid">
                {POPULAR_GENRES.map(genre => {
                  const isSelected = activeCategory === genre.name;
                  return (
                    <div
                      key={genre.id}
                      className={`genre-photo-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectGenre(genre)}
                      role="button"
                      tabIndex={0}
                    >
                      <img
                        src={genre.image}
                        alt={genre.name}
                        className="genre-photo-bg"
                        loading="lazy"
                      />
                      <div className="genre-photo-overlay" />
                      <span className="genre-photo-name">{genre.name}</span>
                      {isSelected && (
                        <div className="genre-selected-badge">
                          <Check size={11} color="#000000" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 5: Eras & Decades */}
            <div className="sheet-section-block">
              <h4 className="sheet-section-title">Eras & Decades</h4>
              <div className="music-eras-grid">
                {MUSIC_ERAS.map(era => {
                  const isSelected = activeCategory === era.label;
                  return (
                    <button
                      key={era.id}
                      className={`music-era-chip ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectEra(era)}
                    >
                      <span className="era-chip-label">{era.label}</span>
                      <span className="era-chip-years">{era.years}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECTION 6: Audio Quality */}
            <div className="sheet-section-block">
              <h4 className="sheet-section-title">Audio Quality</h4>
              <div className="music-quality-row">
                {AUDIO_QUALITIES.map(q => {
                  const isSelected = selectedQuality === q.id;
                  return (
                    <button
                      key={q.id}
                      className={`music-quality-pill ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedQuality(q.id)}
                    >
                      <span className="quality-pill-label">{q.label}</span>
                      <span className="quality-pill-badge">{q.badge}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
