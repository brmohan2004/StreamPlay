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
  const [topAlbums, setTopAlbums] = useState<{ title: string; artist: string; image: string; songs: SongItem[] }[]>([]);
  const [genrePlaylists, setGenrePlaylists] = useState<{ title: string; desc: string; image: string; songs: SongItem[] }[]>([]);

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

  // Initial Content Load
  useEffect(() => {
    async function loadInitialData() {
      const [
        movies,
        series,
        netflix,
        hotstar,
        prime,
        apple,
        sony,
        zee,
        trending,
        fresh,
        recents
      ] = await Promise.all([
        fetchTopMovies(),
        fetchTopSeries(),
        fetchByOTT('Netflix'),
        fetchByOTT('JioHotstar'),
        fetchByOTT('Prime Video'),
        fetchByOTT('Apple TV+'),
        fetchByOTT('Sony LIV'),
        fetchByOTT('Zee5'),
        searchSongs('Top Bollywood Hits 2026', 15),
        searchSongs('Global Pop Hits', 12),
        searchSongs('Arijit Singh', 8)
      ]);

      setTopMovies(movies);
      setTopSeries(series);
      setNetflixHits(netflix);
      setHotstarHits(hotstar);
      setPrimeHits(prime);
      setAppleHits(apple);
      setSonyHits(sony);
      setZeeHits(zee);

      setTrendingSongs(trending);
      setNewSongs(fresh);
      setRecentSongs(recents);

      // Preload sample featured albums
      setTopAlbums([
        {
          title: 'Arijit Singh: All Time Hits',
          artist: 'Arijit Singh',
          image: trending[0]?.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
          songs: trending.slice(0, 5)
        },
        {
          title: 'Midnight Lofi Chill',
          artist: 'Various Artists',
          image: fresh[0]?.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80',
          songs: fresh.slice(0, 5)
        },
        {
          title: 'Global Top 50 Dance',
          artist: 'EDM World',
          image: recents[0]?.image || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&q=80',
          songs: recents.slice(0, 5)
        }
      ]);

      // Preload curated playlists
      setGenrePlaylists([
        {
          title: 'Party & Dance Vibes',
          desc: 'High energy tracks to get you moving',
          image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=500&q=80',
          songs: fresh.slice(0, 6)
        },
        {
          title: 'Acoustic & Coffee',
          desc: 'Calm unplugged acoustic sounds',
          image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=500&q=80',
          songs: trending.slice(0, 6)
        }
      ]);
    }

    loadInitialData();
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
            topAlbums={topAlbums}
            genrePlaylists={genrePlaylists}
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
