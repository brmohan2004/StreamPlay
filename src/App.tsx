import { useState, useEffect } from 'react';
import { useNavigation, NavigationProvider } from './context/NavigationContext';
import { MediaProvider } from './context/MediaContext';
import { FloatingNavBar } from './components/FloatingNavBar';
import { MoviesHomeScreen } from './screens/MoviesHomeScreen';
import { MusicHomeScreen } from './screens/MusicHomeScreen';
import { CommonSearchScreen } from './screens/CommonSearchScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { PlaylistScreen } from './screens/PlaylistScreen';
import { WatchLaterScreen } from './screens/WatchLaterScreen';
import { MovieDetailsScreen } from './screens/MovieDetailsScreen';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { MusicPlayerModal } from './components/MusicPlayerModal';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import {
  fetchTopMovies,
  fetchTopSeries,
  fetchByOTT,
  fetchGenreMovies
} from './services/movieService';
import { searchSongs } from './services/musicService';
import { MovieItem, SongItem } from './types/media';
import './App.css';

export function AppContent() {
  const { appMode, activeScreen } = useNavigation();

  // Movies State
  const [topMovies, setTopMovies] = useState<MovieItem[]>([]);
  const [topSeries, setTopSeries] = useState<MovieItem[]>([]);
  const [netflixHits, setNetflixHits] = useState<MovieItem[]>([]);
  const [hotstarHits, setHotstarHits] = useState<MovieItem[]>([]);
  const [primeHits, setPrimeHits] = useState<MovieItem[]>([]);
  const [appleHits, setAppleHits] = useState<MovieItem[]>([]);
  const [sonyHits, setSonyHits] = useState<MovieItem[]>([]);
  const [zeeHits, setZeeHits] = useState<MovieItem[]>([]);

  // Music State
  const [trendingSongs, setTrendingSongs] = useState<SongItem[]>([]);
  const [newSongs, setNewSongs] = useState<SongItem[]>([]);
  const [recentSongs, setRecentSongs] = useState<SongItem[]>([]);

  // Infinite Scroll State
  const [loadedGenreRows, setLoadedGenreRows] = useState<{ title: string; subtitle: string; items: MovieItem[] }[]>([]);
  const [genreIndex, setGenreIndex] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const GENRE_LIST = [
    { name: 'Action', desc: 'Explosive action and superhero sagas' },
    { name: 'Sci-Fi', desc: 'Futuristic universes and mind-bending thrillers' },
    { name: 'Thriller', desc: 'Edge-of-your-seat suspense and mystery' },
    { name: 'Animation', desc: 'Critically acclaimed animated adventures' },
    { name: 'Comedy', desc: 'Laugh-out-loud favorites and comedies' },
    { name: 'Crime', desc: 'Heists, detectives, and underworld drama' },
    { name: 'Horror', desc: 'Chilling tales and supernatural mysteries' },
    { name: 'Romance', desc: 'Heartwarming love stories and romance' },
    { name: 'Adventure', desc: 'Epic journeys across uncharted worlds' }
  ];

  // Initial Content Load: Fast progressive loading so Trending cards render within ~200ms
  useEffect(() => {
    let isMounted = true;

    // 1. Immediately fetch Top Movies (powers Trending Flip Cards) and Top Series
    fetchTopMovies().then(movies => {
      if (isMounted) setTopMovies(movies);
    });

    fetchTopSeries().then(series => {
      if (isMounted) setTopSeries(series);
    });

    // 2. Concurrently load Music rows
    searchSongs('Top Bollywood Hits 2026', 15).then(trending => {
      if (isMounted) setTrendingSongs(trending);
    });

    searchSongs('Global Pop Hits', 12).then(fresh => {
      if (isMounted) setNewSongs(fresh);
    });

    searchSongs('Arijit Singh', 8).then(recents => {
      if (isMounted) setRecentSongs(recents);
    });

    // 3. Concurrently load OTT brand catalog rows without blocking the Trending section
    fetchByOTT('Netflix').then(data => isMounted && setNetflixHits(data));
    fetchByOTT('JioHotstar').then(data => isMounted && setHotstarHits(data));
    fetchByOTT('Prime Video').then(data => isMounted && setPrimeHits(data));
    fetchByOTT('Apple TV+').then(data => isMounted && setAppleHits(data));
    fetchByOTT('Sony LIV').then(data => isMounted && setSonyHits(data));
    fetchByOTT('Zee5').then(data => isMounted && setZeeHits(data));

    return () => {
      isMounted = false;
    };
  }, []);

  // Infinite Scroll Handler
  const loadNextGenres = async () => {
    if (isLoadingMore || genreIndex >= GENRE_LIST.length) return;
    setIsLoadingMore(true);

    const nextBatch = GENRE_LIST.slice(genreIndex, genreIndex + 2);
    const newRows = await Promise.all(
      nextBatch.map(async g => {
        const items = await fetchGenreMovies(g.name);
        return {
          title: `${g.name} Blockbusters`,
          subtitle: g.desc,
          items
        };
      })
    );

    setLoadedGenreRows(prev => [...prev, ...newRows]);
    setGenreIndex(prev => prev + nextBatch.length);
    setIsLoadingMore(false);
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
        !isLoadingMore &&
        genreIndex < GENRE_LIST.length
      ) {
        loadNextGenres();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoadingMore, genreIndex, loadedGenreRows]);

  return (
    <div className={`streamplay-app pure-black-theme mode-${appMode}`}>
      <main className="app-main-content">
        {/* Screen Routing */}
        {activeScreen === 'search' ? (
          <CommonSearchScreen />
        ) : activeScreen === 'profile' ? (
          <ProfileScreen />
        ) : activeScreen === 'playlist' ? (
          <PlaylistScreen />
        ) : activeScreen === 'watchlater' ? (
          <WatchLaterScreen />
        ) : activeScreen === 'details' ? (
          <MovieDetailsScreen />
        ) : appMode === 'movies' ? (
          /* Movies Home Mode */
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
            hasMoreGenres={genreIndex < GENRE_LIST.length}
          />
        ) : (
          /* Music Home Mode */
          <MusicHomeScreen
            trendingSongs={trendingSongs}
            newSongs={newSongs}
            recentSongs={recentSongs}
          />
        )}
      </main>

      {/* Persistent Audio Player Bar */}
      <AudioPlayerBar />

      {/* Bottom Center Floating Navigation Bar */}
      <FloatingNavBar />

      {/* Full-Screen In-App Video Player Modal */}
      <VideoPlayerModal />

      {/* Full-Screen Immersive Music Player Modal */}
      <MusicPlayerModal />
    </div>
  );
}

export default function App() {
  return (
    <NavigationProvider>
      <MediaProvider>
        <AppContent />
      </MediaProvider>
    </NavigationProvider>
  );
}
