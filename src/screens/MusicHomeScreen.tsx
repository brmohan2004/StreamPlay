import './MusicHomeScreen.css';
import React, { useState, useEffect, useRef } from 'react';
import { TopAppHeader } from '../components/TopAppHeader';
import { SongItem } from '../types/media';
import { useMedia } from '../context/MediaContext';
import { useNavigation } from '../context/NavigationContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DailyMixFannedDeck } from '../components/DailyMixFannedDeck';
import { fetchVideoSongs, fetchGenreSongs, fetchInfiniteLanguageSongs } from '../services/musicService';
import { useRecommendations } from '../context/RecommendationContext';
import { SkeletonMusicHome, SkeletonMusicRow } from '../components/SkeletonLoader';
import {
  SquareMusicCard,
  VinylMusicCard,
  CompactTileCard,
  TwoRowScrollGrid,
  PanoramaCollectionCard,
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
  const { playSong, openMusicPlayer, openVideoSong, primaryLanguage, secondaryLanguage } = useMedia();
  const { setActiveScreen } = useNavigation();
  const { dailyMix, forYouSongs, becauseYouListened, discoverWeekly } = useRecommendations();

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

  // Load next infinite scroll batch
  const loadNextMusicBatch = async () => {
    if (isLoadingMoreMusic) return;
    setIsLoadingMoreMusic(true);

    try {
      if (infiniteBatchIndex < MUSIC_GENRE_BATCHES.length) {
        const genre = MUSIC_GENRE_BATCHES[infiniteBatchIndex];
        const items = await fetchGenreSongs(genre, 15);
        if (items.length > 0) {
          setInfiniteMusicRows(prev => [...prev, { title: genre, songs: items }]);
        }
      } else {
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

  // IntersectionObserver for Infinite Scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !isLoadingMoreMusic) {
          loadNextMusicBatch();
        }
      },
      { rootMargin: '300px' }
    );

    if (bottomObserverRef.current) {
      observer.observe(bottomObserverRef.current);
    }

    return () => observer.disconnect();
  }, [isLoadingMoreMusic, infiniteBatchIndex, primaryLanguage]);

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

  // Show Skeleton shimmer loading if initial music content has not loaded
  if (trendingSongs.length === 0) {
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
            SECTION 1: YOUR DAILY MIX (3D Fanned Stacked Card Deck Animation)
            ======================================================== */}
        {dailyMix.length > 0 && (
          <div className="music-section-block section-daily-mix">
            <DailyMixFannedDeck
              songs={dailyMix}
              onPlaySong={handlePlaySong}
            />
          </div>
        )}

        {/* ========================================================
            SECTION 2: TOP PICKS FOR YOU (Square Minimalist Cards)
            ======================================================== */}
        {forYouSongs.length > 0 && (
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

            <div className="music-scroll-row style-square-row" ref={forYouRef}>
              {forYouSongs.map((song, idx) => (
                <SquareMusicCard
                  key={song.id || idx}
                  song={song}
                  queue={forYouSongs}
                  onPlay={handlePlaySong}
                />
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            SECTION 3: BECAUSE YOU LISTENED (Vinyl Disc Record Cards)
            ======================================================== */}
        {becauseYouListened.map((entry, bIdx) => (
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
            SECTION 4: POPULAR SONGS (2 Rows Vertically Listed, Horizontally Scrollable)
            Compact tile pill cards with ranking tags #1, #2, #3, etc.
            ======================================================== */}
        <div className="music-section-block section-popular-ranked">
          <div className="music-section-head">
            <div className="section-title-wrap">
              <h2 className="music-section-title">Popular Songs</h2>
            </div>
            <div className="section-right-actions">
              <span className="see-all-link" onClick={() => setActiveScreen('search')}>
                See all
              </span>
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

          <TwoRowScrollGrid scrollRef={popularRef}>
            {(trendingSongs.length ? trendingSongs : primaryLangSongs).slice(0, 12).map((song, idx) => (
              <CompactTileCard
                key={song.id || idx}
                song={song}
                queue={trendingSongs}
                rank={idx + 1}
                onPlay={handlePlaySong}
              />
            ))}
          </TwoRowScrollGrid>
        </div>

        {/* ========================================================
            SECTION 5: NEW COLLECTION (Panorama Wide Cards)
            ======================================================== */}
        <div className="music-section-block section-new-collection">
          <div className="music-section-head">
            <div className="section-title-wrap">
              <h2 className="music-section-title">New Collection</h2>
            </div>
          </div>

          <div className="music-scroll-row style-collection-row">
            {newCollections.map(coll => (
              <PanoramaCollectionCard
                key={coll.id}
                collection={coll}
                onClick={() => setActiveScreen('search')}
              />
            ))}
          </div>
        </div>

        {/* ========================================================
            SECTION 6: DISCOVER WEEKLY (Clean Minimalist Aura Cards)
            ======================================================== */}
        {discoverWeekly.length > 0 && (
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
              {discoverWeekly.map((song, idx) => (
                <AuraMusicCard
                  key={song.id || idx}
                  song={song}
                  queue={discoverWeekly}
                  onPlay={handlePlaySong}
                />
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            SECTION 7: VIDEO SONGS (16:9 Cinematic Video Cards)
            ======================================================== */}
        {videoSongs.length > 0 && (
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

            <div className="music-scroll-row style-cinematic-row" ref={videoRef}>
              {videoSongs.map(vs => (
                <CinematicVideoCard
                  key={vs.id}
                  song={vs}
                  queue={videoSongs}
                  onPlay={(song, queue) => openVideoSong(song, queue || videoSongs)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            SECTION 8: PRIMARY LANGUAGE (2-Row Horizontal Quick-Play Tile Grid)
            ======================================================== */}
        {primaryLangSongs.length > 0 && (
          <div className="music-section-block section-lang-tiles">
            <div className="music-section-head">
              <div className="section-title-wrap">
                <h2 className="music-section-title">{primaryLanguage} Chartbusters</h2>
              </div>
            </div>

            <TwoRowScrollGrid>
              {primaryLangSongs.slice(0, 12).map((song, i) => (
                <CompactTileCard
                  key={song.id || i}
                  song={song}
                  queue={primaryLangSongs}
                  showPlayBtn={true}
                  onPlay={handlePlaySong}
                />
              ))}
            </TwoRowScrollGrid>
          </div>
        )}

        {/* ========================================================
            SECTION 9: SECONDARY LANGUAGE (Tall 4:5 Portrait Glass Cards)
            ======================================================== */}
        {secondaryLangSongs.length > 0 && (
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

            <div className="music-scroll-row style-portrait-row" ref={secondaryLangRef}>
              {secondaryLangSongs.map((song, i) => (
                <PortraitMusicCard
                  key={song.id || i}
                  song={song}
                  queue={secondaryLangSongs}
                  onPlay={handlePlaySong}
                />
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            SECTION 10: RECENTLY PLAYED (2 Rows Vertically Listed, Horizontally Scrollable)
            Matches user specification with compact tile pill cards
            ======================================================== */}
        {recentSongs.length > 0 && (
          <div className="music-section-block section-recent">
            <div className="music-section-head">
              <div className="section-title-wrap">
                <h2 className="music-section-title">Recently Played</h2>
              </div>
            </div>
            <TwoRowScrollGrid>
              {recentSongs.slice(0, 12).map((song, idx) => (
                <CompactTileCard
                  key={song.id || idx}
                  song={song}
                  queue={recentSongs}
                  onPlay={handlePlaySong}
                />
              ))}
            </TwoRowScrollGrid>
          </div>
        )}

        {/* ========================================================
            SECTION 11: INFINITE CATEGORY ROWS (Curated Color-Themed Cards)
            ======================================================== */}
        {infiniteMusicRows.map((row, idx) => (
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
      </div>
    </div>
  );
};
