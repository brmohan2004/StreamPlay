import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigation, NavigationProvider, AppMode } from './context/NavigationContext';
import { MediaProvider, useMedia } from './context/MediaContext';
import { RecommendationProvider } from './context/RecommendationContext';
import { FloatingNavBar } from './components/FloatingNavBar';
import { FloatingFilterPill } from './components/FloatingFilterPill';
import { MoviesHomeScreen } from './screens/MoviesHomeScreen';
import { MusicHomeScreen } from './screens/MusicHomeScreen';
import { MovieSearchScreen } from './screens/MovieSearchScreen';
import { MusicSearchScreen } from './screens/MusicSearchScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { PlaylistScreen } from './screens/PlaylistScreen';
import { WatchLaterScreen } from './screens/WatchLaterScreen';
import { MovieDetailsScreen } from './screens/MovieDetailsScreen';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { MusicPlayerModal } from './components/MusicPlayerModal';
import { AddToPlaylistModal } from './components/AddToPlaylistModal';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { FilterSheetModal } from './components/FilterSheetModal';
import { MusicFilterSheetModal } from './components/MusicFilterSheetModal';
import { PartyProvider } from './context/PartyContext';
import { PartyRoomModal } from './components/PartyRoomModal';
import { FloatingReactionLayer } from './components/FloatingReactionLayer';
import { SplashScreen } from './components/SplashScreen';
import { OnboardingModal } from './components/OnboardingModal';
import { NetworkOfflineModal } from './components/NetworkOfflineModal';
import { UserLocation } from './services/locationService';
import { fetchDynamicMovieShelf } from './services/catalogEngine';
import {
  fetchTopMovies,
  fetchTopSeries,
  fetchByOTT,
  getCachedInitialMovies
} from './services/movieService';
import { searchSongs, getCachedInitialMusic, saveCachedInitialMusic } from './services/musicService';
import { MovieItem, SongItem } from './types/media';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { useBackButtonHandler } from './hooks/useBackButtonHandler';
import './App.css';

export function AppContent() {
  const { appMode, setAppMode, activeScreen } = useNavigation();
  const {
    primaryLanguage,
    secondaryLanguage,
    userLocation,
    changeUserLocation,
    setPrimaryLanguage,
    setSecondaryLanguage
  } = useMedia();

  // Active Android hardware back button & touch edge swipe navigation hook
  useBackButtonHandler();

  // Global toast state for Android back-to-exit feedback
  const [globalToast, setGlobalToast] = useState<string | null>(null);

  useEffect(() => {
    const handleToast = (e: any) => {
      if (e.detail?.message) {
        setGlobalToast(e.detail.message);
        setTimeout(() => setGlobalToast(null), 2000);
      }
    };
    window.addEventListener('streamplay-toast', handleToast);
    return () => window.removeEventListener('streamplay-toast', handleToast);
  }, []);

  // Synchronize device status bar and meta theme-color with active mode
  // Movie mode: light blue modern gradient matching Image 3 (#0077b6 / #0099ff)
  // Music mode: deep neon dark (#080b12)
  useEffect(() => {
    const isMovies = appMode === 'movies';
    const themeColor = isMovies ? '#0077b6' : '#080b12';

    // 1. Update HTML meta theme-color for mobile browsers & PWAs
    let metaTag = document.querySelector('meta[name="theme-color"]');
    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.setAttribute('name', 'theme-color');
      document.head.appendChild(metaTag);
    }
    metaTag.setAttribute('content', themeColor);

    // 2. Update Capacitor native status bar if running on Android/iOS
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      StatusBar.setBackgroundColor({ color: themeColor }).catch(() => {});
    }
  }, [appMode]);

  // Check if user has previously completed onboarding
  const isFirstTimeUser = useMemo<boolean>(() => {
    try {
      return !localStorage.getItem('streamplay_onboarding_completed');
    } catch {
      return false;
    }
  }, []);

  // For a NEW user: Onboarding shows first, splash screen loads AFTER onboarding!
  // For an OLD user: Splash screen loads immediately with saved default / last opened mode!
  const [showOnboarding, setShowOnboarding] = useState<boolean>(isFirstTimeUser);
  const [showSplash, setShowSplash] = useState<boolean>(!isFirstTimeUser);
  const [splashMode, setSplashMode] = useState<AppMode>(appMode);

  useEffect(() => {
    (window as any).replaySplash = (m?: AppMode) => {
      if (m) setSplashMode(m);
      setShowSplash(true);
    };
  }, []);

  const handleOnboardingComplete = (prefs: {
    mode: AppMode;
    location: UserLocation;
    primaryLang: string;
    secondaryLang: string;
  }) => {
    try {
      localStorage.setItem('streamplay_onboarding_completed', 'true');
    } catch {
      // ignore
    }
    // 1. Hide onboarding
    setShowOnboarding(false);
    // 2. Set user's chosen mode & preferences
    setAppMode(prefs.mode);
    setSplashMode(prefs.mode);
    changeUserLocation(prefs.location.id);
    setPrimaryLanguage(prefs.primaryLang);
    setSecondaryLanguage(prefs.secondaryLang);
    refreshLiveCatalogs();
    // 3. Load the splash screen AFTER onboarding with user's selected mode
    setShowSplash(true);
  };

  // 0ms Cold-Start Instant Cache: Initialize movies and songs from local persistent cache
  const [topMovies, setTopMovies] = useState<MovieItem[]>(() => getCachedInitialMovies('top_movies'));
  const [topSeries, setTopSeries] = useState<MovieItem[]>(() => getCachedInitialMovies('top_series'));
  const [netflixHits, setNetflixHits] = useState<MovieItem[]>([]);
  const [hotstarHits, setHotstarHits] = useState<MovieItem[]>([]);
  const [primeHits, setPrimeHits] = useState<MovieItem[]>([]);
  const [appleHits, setAppleHits] = useState<MovieItem[]>([]);
  const [sonyHits, setSonyHits] = useState<MovieItem[]>([]);
  const [zeeHits, setZeeHits] = useState<MovieItem[]>([]);

  // Music State initialized with 0ms local storage cache so skeleton never sticks
  const [trendingSongs, setTrendingSongs] = useState<SongItem[]>(() => getCachedInitialMusic('trending'));
  const [newSongs, setNewSongs] = useState<SongItem[]>(() => getCachedInitialMusic('new'));
  const [recentSongs, setRecentSongs] = useState<SongItem[]>(() => getCachedInitialMusic('recents'));

  // Infinite Scroll State
  const [loadedGenreRows, setLoadedGenreRows] = useState<{ title: string; subtitle: string; items: MovieItem[] }[]>([]);
  const [genreIndex, setGenreIndex] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);



  // Dynamic Content Fetcher: Tailored to user's primary/secondary language and location
  const refreshLiveCatalogs = useCallback(() => {
    let isMounted = true;

    // 1. Immediately fetch Top Movies (powers Trending Flip Cards) and Top Series
    fetchTopMovies().then(movies => {
      if (isMounted && movies.length > 0) setTopMovies(movies);
    });

    fetchTopSeries().then(series => {
      if (isMounted && series.length > 0) setTopSeries(series);
    });

    // 2. Concurrently load Music rows tailored to user preferences and location
    const primaryQuery = `${primaryLanguage || 'Tamil'} Top Hits 2026`;
    const secondaryQuery = `${secondaryLanguage || 'English'} Chartbusters`;

    const locationArtistMap: Record<string, string> = {
      chennai: 'Anirudh Ravichander',
      mumbai: 'Arijit Singh',
      hyderabad: 'Thaman S',
      bengaluru: 'Sid Sriram',
      kochi: 'Sushin Shyam',
      delhi: 'Arijit Singh',
      kolkata: 'Arijit Singh',
      global: 'The Weeknd'
    };
    const regionalArtist = (userLocation && locationArtistMap[userLocation.id]) || 'Anirudh Ravichander';

    searchSongs(primaryQuery, 16).then(trending => {
      if (isMounted && trending.length > 0) {
        setTrendingSongs(trending);
        saveCachedInitialMusic('trending', trending);
      }
    });

    searchSongs(secondaryQuery, 14).then(fresh => {
      if (isMounted && fresh.length > 0) {
        setNewSongs(fresh);
        saveCachedInitialMusic('new', fresh);
      }
    });

    searchSongs(regionalArtist, 10).then(recents => {
      if (isMounted && recents.length > 0) {
        setRecentSongs(recents);
        saveCachedInitialMusic('recents', recents);
      }
    });

    // 3. Concurrently load OTT brand catalog rows
    fetchByOTT('Netflix').then(data => isMounted && setNetflixHits(data));
    fetchByOTT('JioHotstar').then(data => isMounted && setHotstarHits(data));
    fetchByOTT('Prime Video').then(data => isMounted && setPrimeHits(data));
    fetchByOTT('Apple TV+').then(data => isMounted && setAppleHits(data));
    fetchByOTT('Sony LIV').then(data => isMounted && setSonyHits(data));
    fetchByOTT('Zee5').then(data => isMounted && setZeeHits(data));

    return () => {
      isMounted = false;
    };
  }, [primaryLanguage, secondaryLanguage, userLocation?.id]);

  useEffect(() => {
    const cleanup = refreshLiveCatalogs();
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, [refreshLiveCatalogs]);

  // Infinite Scroll Handler: 100% Dynamic data generation
  const loadNextGenres = async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);

    try {
      const nextBatch = await Promise.all([
        fetchDynamicMovieShelf(genreIndex),
        fetchDynamicMovieShelf(genreIndex + 1)
      ]);

      const validRows = nextBatch.filter(r => r.items.length > 0);
      if (validRows.length > 0) {
        setLoadedGenreRows(prev => [...prev, ...validRows]);
        setGenreIndex(prev => prev + 2);
      }
    } catch (err) {
      console.warn('Failed to load dynamic movie shelf:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (topMovies.length > 0 && loadedGenreRows.length === 0) {
      loadNextGenres();
    }
  }, [topMovies]);

  // Window Scroll Listener for Infinite Scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 500 &&
        !isLoadingMore
      ) {
        loadNextGenres();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoadingMore, genreIndex]);

  // Aggregate loaded content catalogs for the Recommendation Engine
  const combinedMovieCatalog = useMemo(() => {
    const list = [
      ...topMovies,
      ...topSeries,
      ...netflixHits,
      ...hotstarHits,
      ...primeHits,
      ...appleHits,
      ...sonyHits,
      ...zeeHits,
      ...loadedGenreRows.flatMap(r => r.items)
    ];
    const seen = new Set<string>();
    return list.filter(m => {
      if (!m.id || seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [topMovies, topSeries, netflixHits, hotstarHits, primeHits, appleHits, sonyHits, zeeHits, loadedGenreRows]);

  const combinedSongCatalog = useMemo(() => {
    const list = [...trendingSongs, ...newSongs, ...recentSongs];
    const seen = new Set<string>();
    return list.filter(s => {
      if (!s.id || seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  }, [trendingSongs, newSongs, recentSongs]);

  return (
    <RecommendationProvider movieCatalog={combinedMovieCatalog} songCatalog={combinedSongCatalog}>
      <div className={`streamplay-app pure-black-theme mode-${appMode}`}>
        {showSplash && (
          <SplashScreen
            onFinish={() => setShowSplash(false)}
            durationMs={2000}
            mode={splashMode || appMode}
            variant="split"
          />
        )}

        {/* First-Time User Onboarding Modal */}
        {showOnboarding && (
          <OnboardingModal
            isOpen={showOnboarding}
            onComplete={handleOnboardingComplete}
          />
        )}

        <main className="app-main-content">
          {/* Screen Routing */}
          {activeScreen === 'movie-search' || (activeScreen === 'search' && appMode === 'movies') ? (
            <MovieSearchScreen />
          ) : activeScreen === 'music-search' || (activeScreen === 'search' && appMode === 'music') ? (
            <MusicSearchScreen />
          ) : activeScreen === 'profile' ? (
            <ProfileScreen onOpenOnboarding={() => setShowOnboarding(true)} />
          ) : activeScreen === 'playlist' ? (
            <PlaylistScreen />
          ) : activeScreen === 'watchlater' ? (
            <WatchLaterScreen />
          ) : activeScreen === 'details' ? (
            <MovieDetailsScreen />
          ) : (
            <>
              {/* Dual-Mounted Home Screens: Keeps both views alive in memory for instant 0ms mode switching with zero skeleton flicker */}
              <div style={{ display: activeScreen === 'home' && appMode === 'movies' ? 'contents' : 'none' }}>
                <MoviesHomeScreen
                  topMovies={topMovies}
                  topSeries={topSeries}
                  netflixHits={netflixHits}
                  hotstarHits={hotstarHits}
                  primeHits={primeHits}
                  appleHits={appleHits}
                  sonyHits={sonyHits}
                  zeeHits={zeeHits}
                  loadedGenreRows={loadedGenreRows}
                  isLoadingMore={isLoadingMore}
                  onLoadMoreGenres={loadNextGenres}
                  hasMoreGenres={true}
                />
              </div>
              <div style={{ display: activeScreen === 'home' && appMode === 'music' ? 'contents' : 'none' }}>
                <MusicHomeScreen
                  trendingSongs={trendingSongs}
                  newSongs={newSongs}
                  recentSongs={recentSongs}
                />
              </div>
            </>
          )}
        </main>

        {/* Network Offline / Auto-Reconnect & Refresh Modal */}
        <NetworkOfflineModal onReconnect={refreshLiveCatalogs} />

        {/* Persistent Audio Player Bar */}
        <AudioPlayerBar />

        {/* Floating Filter Capsule Pill (Above Bottom Nav, Screenshot 2 Design) */}
        <FloatingFilterPill />

        {/* Bottom Center Floating Navigation Bar */}
        <FloatingNavBar />

        {/* Full-Screen In-App Video Player Modal */}
        <VideoPlayerModal />

        {/* Full-Screen Immersive Music Player Modal */}
        <MusicPlayerModal />

        {/* Global Add to Playlist Picker Modal */}
        <AddToPlaylistModal />

        {/* Slide-Up Filter & OTT Bottom Sheet Modals (Separate for Movie & Music Modes) */}
        {appMode === 'movies' ? <FilterSheetModal /> : <MusicFilterSheetModal />}

        {/* Friends Mode Watch & Listen Party Modal */}
        <PartyRoomModal />

        {/* Floating Real-Time Reaction Burst Layer */}
        <FloatingReactionLayer />

        {/* Global Android Back Feedback Banner */}
        {globalToast && (
          <div className="streamplay-global-toast">
            <span>{globalToast}</span>
          </div>
        )}
      </div>
    </RecommendationProvider>
  );
}

export default function App() {
  return (
    <NavigationProvider>
      <MediaProvider>
        <PartyProvider>
          <AppContent />
        </PartyProvider>
      </MediaProvider>
    </NavigationProvider>
  );
}
