import './FilterSheetModal.css';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  RotateCcw,
  Video,
  Newspaper,
  Flame,
  Check,
  Disc3,
  Sparkles
} from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';
import { useMedia } from '../context/MediaContext';
import { OTTBrand } from '../types/media';

interface StudioItem {
  id: string;
  name: string;
  brand: OTTBrand;
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

interface ChannelItem {
  id: string;
  name: string;
  query: string;
  renderLogo: () => React.ReactNode;
}

interface GenreItem {
  id: string;
  name: string;
  image: string;
}

export const FilterSheetModal: React.FC = () => {
  const {
    appMode,
    isFilterSheetOpen,
    closeFilterSheet,
    selectedOTT,
    setSelectedOTT,
    selectedLanguage,
    setSelectedLanguage,
    activeCategory,
    setActiveCategory,
    setSearchQuery,
    setActiveScreen
  } = useNavigation();
  const { setPrimaryLanguage } = useMedia();

  if (!isFilterSheetOpen) return null;

  const handleReset = () => {
    setSelectedOTT('All');
    setSelectedLanguage('All');
    setActiveCategory('All');
  };

  const hasActiveFilters = selectedOTT !== 'All' || activeCategory !== 'All' || selectedLanguage !== 'All';

  // Navigation / Filter Actions
  const handleSelectBrowse = (type: string) => {
    setActiveCategory(type);
    closeFilterSheet();
  };

  const handleSelectStudio = (brand: OTTBrand) => {
    setSelectedOTT(brand);
    setSelectedLanguage('All');
    setActiveCategory('All');
    setActiveScreen('home');
    closeFilterSheet();
  };

  const handleSelectLanguage = (lang: LanguageItem) => {
    setSelectedLanguage(lang.englishTitle);
    setPrimaryLanguage(lang.englishTitle);
    setSelectedOTT('All');
    setActiveCategory('All');
    setActiveScreen('home');
    closeFilterSheet();
  };

  const handleSelectChannel = (channel: ChannelItem) => {
    setSearchQuery(channel.query);
    if (appMode === 'movies') {
      setActiveScreen('movie-search');
    } else {
      setActiveScreen('music-search');
    }
    closeFilterSheet();
  };

  const handleSelectGenre = (genreName: string) => {
    setActiveCategory(genreName);
    closeFilterSheet();
  };

  // 1. Movie Studios (Real Brand SVG Logos)
  const MOVIE_STUDIOS: StudioItem[] = [
    {
      id: 'hotstar-specials',
      name: 'Hotstar Specials',
      brand: 'JioHotstar',
      renderLogo: () => (
        <div className="logo-hotstar-specials">
          <span className="hotstar-white">hotstar</span>
          <span className="specials-cyan">specials</span>
        </div>
      )
    },
    {
      id: 'disney-plus',
      name: 'Disney+',
      brand: 'JioHotstar',
      renderLogo: () => (
        <div className="logo-disney-plus">
          <svg viewBox="0 0 100 42" className="disney-svg-logo">
            <path
              d="M12.5 32c4.2 0 7.8-2.6 9.2-6.5h-3.4c-.9 2.2-3.1 3.7-5.8 3.7-3.9 0-7.1-3.2-7.1-7.2s3.2-7.2 7.1-7.2c2.7 0 4.9 1.5 5.8 3.7h3.4C20.3 14.6 16.7 12 12.5 12 6.7 12 2 16.5 2 22s4.7 10 10.5 10z"
              fill="#ffffff"
            />
            <path
              d="M32 12.5h-4.5v19h4.5v-19zM42.2 17.5c-2.4 0-4.3 1.1-5.3 2.8v-2.5h-4.4v13.7h4.4v-7.2c0-2.3 1.5-3.9 3.6-3.9 2 0 3.3 1.4 3.3 3.6v7.5h4.4v-8.2c0-3.6-2.4-5.8-6-5.8z"
              fill="#ffffff"
            />
            <path
              d="M58 24.2c-2.2-.6-3.5-1.2-3.5-2.2 0-.9 1-1.6 2.4-1.6 1.6 0 2.9.7 3.5 1.8h4.2c-.8-3.1-3.9-4.8-7.7-4.8-4.2 0-7 2.4-7 5.7 0 2.8 2 4.4 5.2 5.2 2.4.6 3.8 1.3 3.8 2.4 0 1.1-1.2 1.8-2.8 1.8-2.1 0-3.5-.9-4.1-2.4h-4.3c.7 3.6 4.1 5.4 8.4 5.4 4.5 0 7.4-2.4 7.4-6 0-3.1-2.2-4.6-5.5-5.3z"
              fill="#ffffff"
            />
            <text x="72" y="27" fill="#00d2ff" fontSize="24" fontWeight="900" fontFamily="sans-serif">
              +
            </text>
          </svg>
        </div>
      )
    },
    {
      id: 'hbo-max',
      name: 'HBO Max',
      brand: 'JioHotstar',
      renderLogo: () => (
        <div className="logo-hbo-max">
          <span className="hbo-bold">
            HB<span className="hbo-o-dot">O</span>
          </span>
          <span className="max-purple">max</span>
        </div>
      )
    },
    {
      id: 'netflix',
      name: 'Netflix',
      brand: 'Netflix',
      renderLogo: () => (
        <div className="logo-netflix">
          <span className="netflix-red-wordmark">NETFLIX</span>
        </div>
      )
    },
    {
      id: 'prime-video',
      name: 'Prime Video',
      brand: 'Prime Video',
      renderLogo: () => (
        <div className="logo-prime-video">
          <span className="prime-text">prime video</span>
          <svg viewBox="0 0 65 14" className="prime-smile-svg">
            <path
              d="M3 4 C 18 14, 45 14, 60 4"
              fill="none"
              stroke="#00a8e1"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            <path d="M57 3 L 62 4 L 59 8 Z" fill="#00a8e1" />
          </svg>
        </div>
      )
    },
    {
      id: 'apple-tv',
      name: 'Apple TV+',
      brand: 'Apple TV+',
      renderLogo: () => (
        <div className="logo-apple-tv">
          <svg viewBox="0 0 24 24" className="apple-logo-icon">
            <path
              fill="#ffffff"
              d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 1.01-2.87-.96.04-2.07.65-2.73 1.41-.56.63-1.07 1.68-.96 2.7.02 0 .04 0 .06 0 1.06 0 2.01-.49 2.62-1.24z"
            />
          </svg>
          <span className="tv-plus-text">tv+</span>
        </div>
      )
    },
    {
      id: 'sony-liv',
      name: 'Sony LIV',
      brand: 'Sony LIV',
      renderLogo: () => (
        <div className="logo-sony-liv">
          <span className="sony-word">SONY</span>
          <span className="liv-word">LIV</span>
        </div>
      )
    },
    {
      id: 'zee5',
      name: 'Zee5',
      brand: 'Zee5',
      renderLogo: () => (
        <div className="logo-zee5">
          <span className="zee5-badge">ZEE5</span>
        </div>
      )
    }
  ];

  // 2. Popular Languages with Actor Portraits
  const POPULAR_LANGUAGES: LanguageItem[] = [
    {
      code: 'hi',
      nativeTitle: 'हिंदी',
      englishTitle: 'Hindi',
      query: 'Hindi Bollywood 2026',
      image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=320&auto=format&fit=crop&q=80',
      gradient: 'linear-gradient(90deg, #181d2f 0%, #202741 55%, rgba(32, 39, 65, 0.4) 100%)'
    },
    {
      code: 'en',
      nativeTitle: 'English',
      englishTitle: 'English',
      query: 'Hollywood Blockbuster 2026',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=320&auto=format&fit=crop&q=80',
      gradient: 'linear-gradient(90deg, #32201b 0%, #442a22 55%, rgba(68, 42, 34, 0.4) 100%)'
    },
    {
      code: 'ta',
      nativeTitle: 'தமிழ்',
      englishTitle: 'Tamil',
      query: 'Tamil Kollywood Hit',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=320&auto=format&fit=crop&q=80',
      gradient: 'linear-gradient(90deg, #2e1e1a 0%, #412822 55%, rgba(65, 40, 34, 0.4) 100%)'
    },
    {
      code: 'te',
      nativeTitle: 'తెలుగు',
      englishTitle: 'Telugu',
      query: 'Telugu Tollywood Blockbuster',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=320&auto=format&fit=crop&q=80',
      gradient: 'linear-gradient(90deg, #292119 0%, #3d3023 55%, rgba(61, 48, 35, 0.4) 100%)'
    },
    {
      code: 'ml',
      nativeTitle: 'മലയാളം',
      englishTitle: 'Malayalam',
      query: 'Malayalam Cinema Mollywood',
      image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=320&auto=format&fit=crop&q=80',
      gradient: 'linear-gradient(90deg, #172722 0%, #203932 55%, rgba(32, 57, 50, 0.4) 100%)'
    },
    {
      code: 'kn',
      nativeTitle: 'ಕನ್ನಡ',
      englishTitle: 'Kannada',
      query: 'Kannada Sandalwood Hit',
      image: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=320&auto=format&fit=crop&q=80',
      gradient: 'linear-gradient(90deg, #2c1a20 0%, #3e242d 55%, rgba(62, 36, 45, 0.4) 100%)'
    }
  ];

  // 3. Popular Channels
  const POPULAR_CHANNELS: ChannelItem[] = [
    {
      id: 'star-plus',
      name: 'StarPlus',
      query: 'StarPlus Serials Hindi Drama',
      renderLogo: () => (
        <div className="channel-starplus">
          <div className="starplus-icon-wrap">
            <svg viewBox="0 0 24 24" className="starplus-star-icon">
              <polygon
                points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9"
                fill="#e61e2b"
              />
            </svg>
            <Sparkles size={12} className="starplus-sparkle" />
          </div>
          <span className="starplus-text">StarPlus</span>
          <span className="starplus-sub">रिश्ता वही, बात नई</span>
        </div>
      )
    },
    {
      id: 'colors-tv',
      name: 'colors',
      query: 'Colors TV Serials Shows',
      renderLogo: () => (
        <div className="channel-colors">
          <div className="colors-petals">
            <span className="petal petal-1" />
            <span className="petal petal-2" />
            <span className="petal petal-3" />
            <span className="petal petal-4" />
          </div>
          <span className="colors-text">colors</span>
        </div>
      )
    },
    {
      id: 'star-vijay',
      name: 'Star Vijay',
      query: 'Star Vijay Tamil Serials Shows',
      renderLogo: () => (
        <div className="channel-vijay">
          <svg viewBox="0 0 24 24" className="vijay-star-icon">
            <polygon
              points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9"
              fill="#f5a623"
            />
          </svg>
          <span className="vijay-tamil-text">விஜய்</span>
        </div>
      )
    },
    {
      id: 'zee-tv',
      name: 'Zee TV',
      query: 'Zee TV Serials Drama',
      renderLogo: () => (
        <div className="channel-zeetv">
          <div className="zeetv-circle">
            <span className="zeetv-z">Z</span>
          </div>
          <span className="zeetv-label">ZEE TV</span>
        </div>
      )
    },
    {
      id: 'sony-set',
      name: 'Sony SET',
      query: 'Sony Entertainment Television SET shows',
      renderLogo: () => (
        <div className="channel-sonyset">
          <div className="sony-s-badge">
            <span className="bar bar-g" />
            <span className="bar bar-b" />
            <span className="bar bar-r" />
          </div>
          <span className="sony-label">SET</span>
        </div>
      )
    },
    {
      id: 'hbo-channel',
      name: 'HBO',
      query: 'HBO Original Series',
      renderLogo: () => (
        <div className="channel-hbo">
          <span className="hbo-channel-title">
            HB<span className="dot-o">O</span>
          </span>
        </div>
      )
    }
  ];

  // 4. Popular Genres with Cinema Backdrops
  const POPULAR_GENRES: GenreItem[] = [
    {
      id: 'romance',
      name: 'Romance',
      image: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&auto=format&fit=crop&q=80'
    },
    {
      id: 'drama',
      name: 'Drama',
      image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&auto=format&fit=crop&q=80'
    },
    {
      id: 'family',
      name: 'Family',
      image: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400&auto=format&fit=crop&q=80'
    },
    {
      id: 'action',
      name: 'Action',
      image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&auto=format&fit=crop&q=80'
    },
    {
      id: 'scifi',
      name: 'Sci-Fi',
      image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&auto=format&fit=crop&q=80'
    },
    {
      id: 'thriller',
      name: 'Thriller',
      image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&auto=format&fit=crop&q=80'
    },
    {
      id: 'horror',
      name: 'Horror',
      image: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=400&auto=format&fit=crop&q=80'
    },
    {
      id: 'comedy',
      name: 'Comedy',
      image: 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=400&auto=format&fit=crop&q=80'
    }
  ];

  // Music Mode Content:
  const MUSIC_STUDIOS: StudioItem[] = [
    {
      id: 't-series',
      name: 'T-Series',
      brand: 'All',
      renderLogo: () => (
        <div className="music-label-badge t-series-badge">
          <span className="t-box">T</span>
          <span className="label-name">T-Series</span>
        </div>
      )
    },
    {
      id: 'sony-music',
      name: 'Sony Music',
      brand: 'All',
      renderLogo: () => (
        <div className="music-label-badge sony-badge">
          <Disc3 size={18} className="text-neon" />
          <span className="label-name">Sony Music</span>
        </div>
      )
    },
    {
      id: 'yrf-music',
      name: 'YRF Music',
      brand: 'All',
      renderLogo: () => (
        <div className="music-label-badge yrf-badge">
          <span className="yrf-text">YRF</span>
          <span className="label-name">Music</span>
        </div>
      )
    },
    {
      id: 'warner-music',
      name: 'Warner',
      brand: 'All',
      renderLogo: () => (
        <div className="music-label-badge warner-badge">
          <span className="warner-w">W</span>
          <span className="label-name">Warner Music</span>
        </div>
      )
    },
    {
      id: 'universal-music',
      name: 'Universal',
      brand: 'All',
      renderLogo: () => (
        <div className="music-label-badge universal-badge">
          <span className="label-name">Universal</span>
        </div>
      )
    },
    {
      id: 'def-jam',
      name: 'Def Jam',
      brand: 'All',
      renderLogo: () => (
        <div className="music-label-badge defjam-badge">
          <span className="defjam-text">Def Jam</span>
        </div>
      )
    }
  ];

  return (
    <AnimatePresence>
      {isFilterSheetOpen && (
        <div className="filter-sheet-overlay" onClick={closeFilterSheet}>
          <motion.div
            className="filter-sheet-drawer"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Top Sheet Drag/Pull Handle matching Screenshot 1 */}
            <div className="sheet-drag-handle" />

            {/* Header bar */}
            <div className="sheet-header-bar">
              <div className="sheet-title-group">
                <h3 className="sheet-heading">
                  {appMode === 'movies' ? 'Browse & Filters' : 'Music Explore & Filters'}
                </h3>
              </div>

              <div className="sheet-header-actions">
                {hasActiveFilters && (
                  <button
                    type="button"
                    className="sheet-reset-btn"
                    onClick={handleReset}
                    title="Reset active filters"
                  >
                    <RotateCcw size={12} />
                    <span>Reset</span>
                  </button>
                )}

                <button
                  type="button"
                  className="sheet-close-btn"
                  onClick={closeFilterSheet}
                  aria-label="Close bottom sheet"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Content Body matching Screenshot 1 */}
            <div className="sheet-scroll-body">
              {/* SECTION 1: Browse */}
              <div className="sheet-section-block">
                <h4 className="sheet-section-title">Browse</h4>
                <div className="browse-cards-row">
                  {/* Card 1: Sparks */}
                  <div
                    className="browse-card browse-sparks"
                    onClick={() => handleSelectBrowse('Sparks')}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="browse-watermark-icon">
                      <Video size={42} strokeWidth={1.5} />
                    </div>
                    <span className="browse-card-label">Sparks</span>
                  </div>

                  {/* Card 2: News */}
                  <div
                    className="browse-card browse-news"
                    onClick={() => handleSelectBrowse('News')}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="browse-watermark-icon">
                      <Newspaper size={42} strokeWidth={1.5} />
                    </div>
                    <span className="browse-card-label">News</span>
                  </div>

                  {/* Card 3: New & Hot */}
                  <div
                    className="browse-card browse-newhot"
                    onClick={() => handleSelectBrowse('New & Hot')}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="browse-watermark-icon">
                      <Flame size={42} strokeWidth={1.5} />
                    </div>
                    <span className="browse-card-label">New & Hot</span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Studios / OTT Networks */}
              <div className="sheet-section-block">
                <h4 className="sheet-section-title">
                  {appMode === 'movies' ? 'Studios' : 'Record Labels & Studios'}
                </h4>
                <div className="studios-grid">
                  {(appMode === 'movies' ? MOVIE_STUDIOS : MUSIC_STUDIOS).map(studio => {
                    const isSelected = selectedOTT === studio.brand && studio.brand !== 'All';
                    return (
                      <div
                        key={studio.id}
                        className={`studio-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectStudio(studio.brand)}
                        role="button"
                        tabIndex={0}
                        title={studio.name}
                      >
                        {studio.renderLogo()}
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

              {/* SECTION 3: Popular Languages */}
              <div className="sheet-section-block">
                <h4 className="sheet-section-title">Popular Languages</h4>
                <div className="languages-grid">
                  {POPULAR_LANGUAGES.map(lang => (
                    <div
                      key={lang.code}
                      className="language-card"
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
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 4: Popular Channels / Networks */}
              {appMode === 'movies' && (
                <div className="sheet-section-block">
                  <h4 className="sheet-section-title">Popular Channels</h4>
                  <div className="channels-grid">
                    {POPULAR_CHANNELS.map(ch => (
                      <div
                        key={ch.id}
                        className="channel-card"
                        onClick={() => handleSelectChannel(ch)}
                        role="button"
                        tabIndex={0}
                        title={ch.name}
                      >
                        {ch.renderLogo()}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 5: Popular Genres */}
              <div className="sheet-section-block">
                <h4 className="sheet-section-title">
                  {appMode === 'movies' ? 'Popular Genres' : 'Popular Vibes & Moods'}
                </h4>
                <div className="genres-photo-grid">
                  {POPULAR_GENRES.map(genre => {
                    const isSelected = activeCategory === genre.name;
                    return (
                      <div
                        key={genre.id}
                        className={`genre-photo-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectGenre(genre.name)}
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
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
