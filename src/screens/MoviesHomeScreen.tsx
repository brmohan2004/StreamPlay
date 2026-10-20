import './MoviesHomeScreen.css';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TopAppHeader } from '../components/TopAppHeader';
import { SkeletonHome, SkeletonRow } from '../components/SkeletonLoader';
import {
  MovieTrendingFannedDeck,
  MovieSpotlightCard,
  MovieBackdropCard,
  MovieRankedCard,
  MovieTileCard,
  MoviePanoramaCard,
  MovieContinueCard,
  MovieSectionRow,
  MovieTwoRowSection
} from '../components/MovieCardsDesign';
import { MediaRow } from '../components/MediaRow';
import { MovieItem } from '../types/media';
import { useMedia } from '../context/MediaContext';
import { useNavigation } from '../context/NavigationContext';
import { useRecommendations } from '../context/RecommendationContext';
import {
  fetchLanguageMovies,
  fetchInfiniteLanguageMovies,
  fetchGenreMovies,
  fetchGenreSeries,
  fetchByOTT,
  fetchTheaterReleases,
  fetchCuratedTrendingDeck,
  fetchChannelContent
} from '../services/movieService';

interface MoviesHomeScreenProps {
  topMovies: MovieItem[];
  topSeries: MovieItem[];
  netflixHits: MovieItem[];
  hotstarHits: MovieItem[];
  primeHits: MovieItem[];
  appleHits: MovieItem[];
  sonyHits: MovieItem[];
  zeeHits: MovieItem[];
  loadedGenreRows: { title: string; subtitle: string; items: MovieItem[] }[];
  isLoadingMore: boolean;
  onLoadMoreGenres: () => void;
  hasMoreGenres: boolean;
}

export const MoviesHomeScreen: React.FC<MoviesHomeScreenProps> = ({
  topMovies,
  topSeries,
  netflixHits,
  hotstarHits,
  primeHits,
  appleHits,
  sonyHits,
  zeeHits,
  loadedGenreRows,
  isLoadingMore,
  onLoadMoreGenres,
  hasMoreGenres
}) => {
  const {
    activeCategory,
    selectedOTT,
    selectedLanguage,
    selectedChannel
  } = useNavigation();
  const { continueWatching, primaryLanguage, secondaryLanguage } = useMedia();
  const { forYouMovies, becauseYouWatched, explorationMovies } = useRecommendations();

  const [primaryLangMovies, setPrimaryLangMovies] = useState<MovieItem[]>([]);
  const [secondaryLangMovies, setSecondaryLangMovies] = useState<MovieItem[]>([]);
  const movieBottomRef = useRef<HTMLDivElement>(null);

  // Curated Trending Deck state (combining 2025/2026 Theater, OTT, primary/secondary lang, high IMDb)
  const [curatedTrending, setCuratedTrending] = useState<MovieItem[]>([]);

  // OTT Top 20 Language Filter Capsule state
  const [selectedOttLang, setSelectedOttLang] = useState<string>('All');

  // New Releases Category Filter Capsule state ('All' | 'Movies' | 'Series')
  const [newReleasesCategory, setNewReleasesCategory] = useState<'All' | 'Movies' | 'Series'>('All');

  // Channel Universe State (StarPlus, Colors, Star Vijay, Zee TV, Sony SET, Asianet)
  const [channelMovies, setChannelMovies] = useState<MovieItem[]>([]);
  const [isLoadingChannel, setIsLoadingChannel] = useState(false);

  // Dynamic Genre Movies Cache for Capsule Listing
  const [genreCache, setGenreCache] = useState<Record<string, MovieItem[]>>({});
  const [isGenreLoading, setIsGenreLoading] = useState(false);

  // Regional Language Universe State
  const [languageUniverseMovies, setLanguageUniverseMovies] = useState<MovieItem[]>([]);
  const [langBatchIndex, setLangBatchIndex] = useState(0);
  const [isLoadingLangMore, setIsLoadingLangMore] = useState(false);

  // OTT Universe State
  const [ottUniverseMovies, setOttUniverseMovies] = useState<MovieItem[]>([]);
  const [isLoadingOtt, setIsLoadingOtt] = useState(false);

  // Theatrical Releases
  const [theaterReleases, setTheaterReleases] = useState<MovieItem[]>([]);

  // Filter flags
  const isTVFilter = activeCategory === 'Series' || activeCategory === 'Shows' || activeCategory === 'TV';
  const isMoviesFilter = activeCategory === 'Movies';
  const isGenreFilter = !isTVFilter && !isMoviesFilter && activeCategory !== 'All';

  // Dedicated TV Series Genre Rows for TV Mode
  const [seriesGenreRows, setSeriesGenreRows] = useState<{ title: string; subtitle: string; items: MovieItem[] }[]>([]);
  const [isLoadingSeriesGenres, setIsLoadingSeriesGenres] = useState(false);

  useEffect(() => {
    if (!isTVFilter) return;
    if (seriesGenreRows.length > 0) return;

    let isMounted = true;
    setIsLoadingSeriesGenres(true);

    const initialGenres = [
      { name: 'Action', desc: 'High-octane action & superhero web series' },
      { name: 'Crime', desc: 'True crime, detective thrillers & mob sagas' },
      { name: 'Drama', desc: 'Award-winning prestige drama & stories' },
      { name: 'Sci-Fi', desc: 'Mind-bending sci-fi & futuristic universes' },
      { name: 'Comedy', desc: 'Hilarious sitcoms & comedy favorites' },
      { name: 'Animation', desc: 'Popular anime & animated web series' },
      { name: 'Thriller', desc: 'Edge-of-your-seat suspense & mysteries' }
    ];

    Promise.all(
      initialGenres.map(async g => {
        const items = await fetchGenreSeries(g.name);
        return {
          title: `${g.name} Series`,
          subtitle: g.desc,
          items
        };
      })
    ).then(rows => {
      if (isMounted) {
        setSeriesGenreRows(rows.filter(r => r.items.length > 0));
        setIsLoadingSeriesGenres(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isTVFilter, seriesGenreRows.length]);

  useEffect(() => {
    let isMounted = true;
    fetchTheaterReleases().then(res => {
      if (isMounted) setTheaterReleases(res);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Curated Trending Deck: Theater & OTT 2025/2026, language affinity, high IMDb, popular series
  useEffect(() => {
    let isMounted = true;
    fetchCuratedTrendingDeck(primaryLanguage, secondaryLanguage).then(res => {
      if (isMounted && res.length > 0) {
        setCuratedTrending(res);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [primaryLanguage, secondaryLanguage]);

  // Dynamic Channel Content Catalog (StarPlus, Colors, Star Vijay, Zee TV, Sony SET, Asianet)
  useEffect(() => {
    if (!selectedChannel || selectedChannel === 'All') {
      setChannelMovies([]);
      return;
    }
    let isMounted = true;
    setIsLoadingChannel(true);
    fetchChannelContent(selectedChannel).then(res => {
      if (isMounted) {
        setChannelMovies(res);
        setIsLoadingChannel(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [selectedChannel]);

  // Fetch OTT Universe Catalog when selectedOTT changes
  useEffect(() => {
    if (selectedOTT === 'All') return;
    let isMounted = true;
    setIsLoadingOtt(true);
    fetchByOTT(selectedOTT).then(res => {
      if (isMounted) {
        setOttUniverseMovies(res);
        setIsLoadingOtt(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [selectedOTT]);

  // Fetch Language Universe Catalog when selectedLanguage changes
  useEffect(() => {
    if (selectedLanguage === 'All') return;
    let isMounted = true;
    setIsLoadingLangMore(true);
    setLangBatchIndex(0);
    fetchInfiniteLanguageMovies(selectedLanguage, 0, 35).then(res => {
      if (isMounted) {
        setLanguageUniverseMovies(res);
        setIsLoadingLangMore(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [selectedLanguage]);

  // Infinite Scroll loader for language batches
  const loadNextLanguageBatch = async () => {
    if (isLoadingLangMore) return;
    setIsLoadingLangMore(true);
    try {
      const nextBatch = langBatchIndex + 1;
      const more = await fetchInfiniteLanguageMovies(selectedLanguage, nextBatch, 20);
      setLanguageUniverseMovies(prev => {
        const seen = new Set(prev.map(p => p.id));
        const filtered = more.filter(m => !seen.has(m.id));
        return [...prev, ...filtered];
      });
      setLangBatchIndex(nextBatch);
    } catch (err) {
      console.error('Failed to load next language batch:', err);
    } finally {
      setIsLoadingLangMore(false);
    }
  };

  // Automatic Infinite Scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (!entries[0].isIntersecting) return;
        if (selectedLanguage !== 'All') {
          loadNextLanguageBatch();
        } else if (activeCategory === 'All' && selectedOTT === 'All') {
          if (!isLoadingMore && hasMoreGenres) {
            onLoadMoreGenres();
          }
        }
      },
      { rootMargin: '300px' }
    );

    if (movieBottomRef.current) {
      observer.observe(movieBottomRef.current);
    }

    return () => observer.disconnect();
  }, [isLoadingMore, hasMoreGenres, onLoadMoreGenres, activeCategory, selectedLanguage, selectedOTT, langBatchIndex, isLoadingLangMore]);

  // Load language-based movies for standard home
  useEffect(() => {
    let isMounted = true;
    async function loadLangMovies() {
      try {
        const [primList, secList] = await Promise.all([
          fetchLanguageMovies(primaryLanguage),
          fetchLanguageMovies(secondaryLanguage)
        ]);
        if (isMounted) {
          setPrimaryLangMovies(primList);
          setSecondaryLangMovies(secList);
        }
      } catch (err) {
        console.error('Failed to load language movies:', err);
      }
    }
    loadLangMovies();
    return () => {
      isMounted = false;
    };
  }, [primaryLanguage, secondaryLanguage]);

  // Horizontal auto-pitching state for primary & secondary language rows
  const [primBatch, setPrimBatch] = useState(1);
  const [secBatch, setSecBatch] = useState(1);
  const [isLoadingPrimMore, setIsLoadingPrimMore] = useState(false);
  const [isLoadingSecMore, setIsLoadingSecMore] = useState(false);

  const loadMorePrimaryMovies = async () => {
    if (isLoadingPrimMore) return;
    setIsLoadingPrimMore(true);
    try {
      const nextBatch = primBatch + 1;
      const more = await fetchInfiniteLanguageMovies(primaryLanguage, nextBatch, 15);
      if (more.length > 0) {
        setPrimaryLangMovies(prev => {
          const seen = new Set(prev.map(p => p.id));
          return [...prev, ...more.filter(m => !seen.has(m.id))];
        });
        setPrimBatch(nextBatch);
      }
    } finally {
      setIsLoadingPrimMore(false);
    }
  };

  const loadMoreSecondaryMovies = async () => {
    if (isLoadingSecMore) return;
    setIsLoadingSecMore(true);
    try {
      const nextBatch = secBatch + 1;
      const more = await fetchInfiniteLanguageMovies(secondaryLanguage, nextBatch, 15);
      if (more.length > 0) {
        setSecondaryLangMovies(prev => {
          const seen = new Set(prev.map(p => p.id));
          return [...prev, ...more.filter(m => !seen.has(m.id))];
        });
        setSecBatch(nextBatch);
      }
    } finally {
      setIsLoadingSecMore(false);
    }
  };

  // Fetch Genre Movies when capsule is clicked
  useEffect(() => {
    if (activeCategory === 'All' || activeCategory === 'Series' || activeCategory === 'Shows' || activeCategory === 'Movies') {
      return;
    }

    if (!genreCache[activeCategory]) {
      setIsGenreLoading(true);
      fetchGenreMovies(activeCategory)
        .then((items: MovieItem[]) => {
          setGenreCache(prev => ({ ...prev, [activeCategory]: items }));
        })
        .catch((err: unknown) => {
          console.error(`Failed to load genre movies for ${activeCategory}:`, err);
        })
        .finally(() => setIsGenreLoading(false));
    }
  }, [activeCategory, genreCache]);

  // Derive New Movies (Simulate releases with OTT tags)
  const newMoviesWithTags = [...netflixHits.slice(0, 4), ...hotstarHits.slice(0, 4), ...primeHits.slice(0, 4)].map(
    (item, index) => {
      const otts = ['Netflix', 'JioHotstar', 'Prime Video', 'Apple TV+'];
      return {
        ...item,
        ottProvider: item.ottProvider || (otts[index % otts.length] as any)
      };
    }
  );

  // Compute movies for category capsule listing
  const getCategoryMovies = (): MovieItem[] => {
    if (activeCategory === 'All') return [];

    let pool = [
      ...topMovies,
      ...topSeries,
      ...netflixHits,
      ...hotstarHits,
      ...primeHits,
      ...appleHits,
      ...sonyHits,
      ...zeeHits
    ];

    if (activeCategory === 'Series' || activeCategory === 'Shows') {
      return Array.from(new Map(pool.filter(m => m.type === 'series').map(m => [m.id, m])).values());
    }

    if (activeCategory === 'Movies') {
      return Array.from(new Map(pool.filter(m => m.type !== 'series').map(m => [m.id, m])).values());
    }

    const apiItems = genreCache[activeCategory] || [];
    const poolFiltered = pool.filter(m =>
      m.genres?.some(g => g.toLowerCase().includes(activeCategory.toLowerCase()))
    );
    const merged = [...apiItems, ...poolFiltered];
    return Array.from(new Map(merged.map(m => [m.id, m])).values());
  };

  const categoryFilteredMovies = getCategoryMovies();

  // =========================================================================
  // GLOBAL CROSS-SECTION DEDUPLICATION
  // Guarantees that NO movie ever repeats across any section on the Home screen!
  // =========================================================================
  const globalSeenIds = new Set<string>();

  // 1. Trending Fanned Deck
  const deduplicatedTopMovies: MovieItem[] = [];
  for (const m of topMovies) {
    if (m && m.id && !globalSeenIds.has(m.id)) {
      globalSeenIds.add(m.id);
      deduplicatedTopMovies.push(m);
    }
  }

  // 2. In Theaters Now
  const deduplicatedTheaterReleases: MovieItem[] = [];
  for (const m of theaterReleases) {
    if (m && m.id && !globalSeenIds.has(m.id)) {
      globalSeenIds.add(m.id);
      deduplicatedTheaterReleases.push(m);
    }
  }

  // 3. Top Picks For You
  const deduplicatedForYou: MovieItem[] = [];
  for (const m of forYouMovies) {
    if (m && m.id && !globalSeenIds.has(m.id)) {
      globalSeenIds.add(m.id);
      deduplicatedForYou.push(m);
    }
  }

  // 4. Because You Watched Rows
  const deduplicatedBecauseYouWatched = becauseYouWatched
    .map(entry => {
      if (
        !entry ||
        !entry.anchor ||
        !entry.anchor.name ||
        entry.anchor.name === 'Untitled' ||
        entry.anchor.id.startsWith('sports-') ||
        entry.anchor.genres?.some(g => g.toLowerCase() === 'sports')
      ) {
        return null;
      }
      const uniqueMovies: MovieItem[] = [];
      for (const m of entry.movies) {
        if (m && m.id && !globalSeenIds.has(m.id)) {
          globalSeenIds.add(m.id);
          uniqueMovies.push(m);
        }
      }
      return {
        ...entry,
        movies: uniqueMovies
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null && entry.movies.length >= 2);

  // 5. New Releases: Dynamic 2025/2026 releases prioritized by primary & secondary languages + OTT tags
  const newReleasesCandidatePool: MovieItem[] = [
    ...primaryLangMovies.filter(m => (parseInt(m.releaseInfo || '0') || 0) >= 2025),
    ...secondaryLangMovies.filter(m => (parseInt(m.releaseInfo || '0') || 0) >= 2025),
    ...newMoviesWithTags,
    ...theaterReleases.slice(0, 4),
    ...netflixHits.slice(0, 4),
    ...hotstarHits.slice(0, 4),
    ...primeHits.slice(0, 4)
  ];

  const deduplicatedNewReleases: MovieItem[] = [];
  for (const m of newReleasesCandidatePool) {
    if (m && m.id && !globalSeenIds.has(m.id)) {
      globalSeenIds.add(m.id);
      deduplicatedNewReleases.push(m);
    }
  }

  // Filtered New Releases based on selected category capsule ('All' | 'Movies' | 'Series')
  const filteredNewReleases = useMemo(() => {
    return deduplicatedNewReleases.filter(m => {
      if (newReleasesCategory === 'Movies') return m.type !== 'series';
      if (newReleasesCategory === 'Series') return m.type === 'series';
      return true;
    });
  }, [deduplicatedNewReleases, newReleasesCategory]);

  // OTT Languages capsules: 1st Primary, 2nd Secondary, remaining languages
  const ottLanguageCapsules = useMemo(() => {
    return Array.from(
      new Set([
        primaryLanguage,
        secondaryLanguage,
        'All',
        'Hindi',
        'Telugu',
        'Malayalam',
        'Kannada',
        'Korean',
        'English'
      ].filter(Boolean))
    );
  }, [primaryLanguage, secondaryLanguage]);

  // OTT Top 20 picks filtered by language capsule
  const filteredOttPicks = useMemo(() => {
    if (selectedOttLang === 'All') return ottUniverseMovies.slice(0, 20);
    const langLower = selectedOttLang.toLowerCase();
    const matched = ottUniverseMovies.filter(m =>
      (m.language && m.language.toLowerCase().includes(langLower)) ||
      ((m as any).originalLanguage && (m as any).originalLanguage.toLowerCase().includes(langLower)) ||
      (m.genres && m.genres.some(g => g.toLowerCase().includes(langLower)))
    );
    return (matched.length > 0 ? matched : ottUniverseMovies).slice(0, 20);
  }, [ottUniverseMovies, selectedOttLang]);

  // 6. Regional Languages
  const deduplicatedPrimaryLang: MovieItem[] = [];
  for (const m of primaryLangMovies) {
    if (m && m.id && !globalSeenIds.has(m.id)) {
      globalSeenIds.add(m.id);
      deduplicatedPrimaryLang.push(m);
    }
  }

  const deduplicatedSecondaryLang: MovieItem[] = [];
  for (const m of secondaryLangMovies) {
    if (m && m.id && !globalSeenIds.has(m.id)) {
      globalSeenIds.add(m.id);
      deduplicatedSecondaryLang.push(m);
    }
  }

  // 7. Exploration Picks
  const deduplicatedExploration: MovieItem[] = [];
  for (const m of explorationMovies) {
    if (m && m.id && !globalSeenIds.has(m.id)) {
      globalSeenIds.add(m.id);
      deduplicatedExploration.push(m);
    }
  }

  // Helper for OTT and Genre rows
  const deduplicateRow = (items: MovieItem[]): MovieItem[] => {
    const unique: MovieItem[] = [];
    for (const m of items) {
      if (m && m.id && !globalSeenIds.has(m.id)) {
        globalSeenIds.add(m.id);
        unique.push(m);
      }
    }
    return unique;
  };

  // 8. OTT Brand Rows & Series
  const deduplicatedSeries = deduplicateRow(topSeries);
  const deduplicatedHotstar = deduplicateRow(hotstarHits);
  const deduplicatedNetflix = deduplicateRow(netflixHits);
  const deduplicatedPrime = deduplicateRow(primeHits);
  const deduplicatedApple = deduplicateRow(appleHits);
  const deduplicatedSony = deduplicateRow(sonyHits);
  const deduplicatedZee = deduplicateRow(zeeHits);

  // 9. Infinite Scrolling Genre Rows
  const deduplicatedGenreRows = loadedGenreRows
    .map(row => ({
      ...row,
      items: deduplicateRow(row.items)
    }))
    .filter(row => row.items.length >= 2);

  // Show Skeleton shimmer loading if initial content has not loaded
  if (topMovies.length === 0 && topSeries.length === 0) {
    return (
      <div className="movies-home-screen">
        <TopAppHeader />
        <SkeletonHome />
      </div>
    );
  }

  return (
    <div className="movies-home-screen">
      {/* 1. Top Header */}
      <TopAppHeader />

      <div className="movies-home-scrollable">
        {selectedChannel && selectedChannel !== 'All' ? (
          /* ========================================================================= */
          /* CASE 0: DEDICATED CHANNEL UNIVERSE (StarPlus, Colors, Zee TV, etc.)        */
          /* ========================================================================= */
          <>
            {/* Trending Channel Deck */}
            {channelMovies.length > 0 && (
              <MovieTrendingFannedDeck movies={channelMovies.slice(0, 8)} />
            )}

            {isLoadingChannel ? (
              <div style={{ width: '100%', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <SkeletonRow cardCount={6} titleWidth={220} />
                <SkeletonRow cardCount={6} titleWidth={180} />
              </div>
            ) : (
              <>
                <MovieSectionRow title={`Top Serials on ${selectedChannel}`}>
                  {channelMovies.slice(0, 10).map(item => (
                    <MovieSpotlightCard key={item.id} item={item} />
                  ))}
                </MovieSectionRow>

                {channelMovies.length > 10 && (
                  <MovieSectionRow title="Primetime Drama & Popular Shows">
                    {channelMovies.slice(10, 20).map(movie => (
                      <MovieBackdropCard key={movie.id} item={movie} />
                    ))}
                  </MovieSectionRow>
                )}

                {channelMovies.length > 20 && (
                  <MediaRow title={`All Shows on ${selectedChannel}`} items={channelMovies.slice(20, 40)} />
                )}
              </>
            )}
          </>
        ) : selectedLanguage !== 'All' ? (
          <>
            {/* Trending Cards for this language */}
            <MovieTrendingFannedDeck
              movies={languageUniverseMovies.length > 0 ? languageUniverseMovies.slice(0, 8) : topMovies.slice(0, 5)}
            />

            {/* Continue Watching */}
            {continueWatching.length > 0 && (
              <div className="continue-watching-section">
                <div className="section-title-wrap continue-head">
                  <h3 className="section-heading">Continue Watching</h3>
                </div>
                <div className="continue-cards-scroll">
                  {continueWatching.map(item => (
                    <MovieContinueCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )}

            {/* Language Curated Media Rows */}
            <MediaRow title={`Trending in ${selectedLanguage} Today`} items={languageUniverseMovies.slice(0, 10)} />
            <MediaRow title={`${selectedLanguage} Action Blockbusters`} items={languageUniverseMovies.slice(10, 20)} />
            <MediaRow title={`Top Picks in ${selectedLanguage}`} items={languageUniverseMovies.slice(20, 30)} />
            <MediaRow title={`New Releases in ${selectedLanguage}`} items={languageUniverseMovies.slice(30, 40)} />
            {languageUniverseMovies.length > 40 && (
              <MediaRow
                title={`Critically Acclaimed ${selectedLanguage} Cinema`}
                items={languageUniverseMovies.slice(40, 55)}
              />
            )}

            {/* Infinite Scroll Anchor & Loader */}
            <div ref={movieBottomRef} className="movie-bottom-loader-anchor">
              {isLoadingLangMore && (
                <div style={{ width: '100%', marginTop: '1rem' }}>
                  <SkeletonRow cardCount={6} titleWidth={200} />
                </div>
              )}
            </div>
          </>
        ) : selectedOTT !== 'All' ? (
          /* ========================================================================= */
          /* CASE 2: DEDICATED OTT UNIVERSE (e.g. Netflix Crimson Universe)            */
          /* ========================================================================= */
          <>
            {/* Trending Cards for this OTT - NO EXIT BANNER CARD */}
            <MovieTrendingFannedDeck
              movies={ottUniverseMovies.length > 0 ? ottUniverseMovies.slice(0, 8) : topMovies.slice(0, 5)}
            />

            {/* Continue Watching */}
            {continueWatching.length > 0 && (
              <div className="continue-watching-section">
                <div className="section-title-wrap continue-head">
                  <h3 className="section-heading">Continue Watching on {selectedOTT}</h3>
                </div>
                <div className="continue-cards-scroll">
                  {continueWatching.map(item => (
                    <MovieContinueCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )}

            {isLoadingOtt ? (
              <div style={{ width: '100%', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <SkeletonRow cardCount={6} titleWidth={220} />
                <SkeletonRow cardCount={6} titleWidth={180} />
              </div>
            ) : (
              <>
                {/* OTT Language Capsules */}
                <div className="ott-language-capsules-bar">
                  <span className="capsules-bar-title">Languages</span>
                  <div className="capsules-scroll-list">
                    {ottLanguageCapsules.map(lang => (
                      <button
                        key={lang}
                        className={`ott-lang-capsule ${selectedOttLang === lang ? 'active' : ''}`}
                        onClick={() => setSelectedOttLang(lang)}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Top Pick 20 for this OTT */}
                <MovieSectionRow title={selectedOttLang === 'All' ? `Top Pick 20 on ${selectedOTT}` : `Top Pick 20 in ${selectedOttLang} • ${selectedOTT}`}>
                  {filteredOttPicks.map((movie, idx) => (
                    <MovieRankedCard key={movie.id} item={movie} rank={idx + 1} />
                  ))}
                </MovieSectionRow>

                <MediaRow title={`Trending on ${selectedOTT}`} items={ottUniverseMovies.slice(0, 10)} />
                <MediaRow title={`${selectedOTT} Originals & Blockbusters`} items={ottUniverseMovies.slice(20, 30)} />
                {ottUniverseMovies.filter(m => m.type === 'series').length > 0 && (
                  <MediaRow
                    title={`${selectedOTT} Binge-Worthy Series`}
                    items={ottUniverseMovies.filter(m => m.type === 'series')}
                  />
                )}
                <MediaRow title={`${selectedOTT} Suspense & Thrillers`} items={ottUniverseMovies.slice(5, 18)} />
              </>
            )}
          </>
        ) : isTVFilter ? (
          /* ========================================================================= */
          /* CASE 3A: TV SHOWS & WEB SERIES UNIVERSE                                   */
          /* ========================================================================= */
          <>

            {/* Trending Series Deck */}
            {deduplicatedSeries.length > 0 && (
              <MovieTrendingFannedDeck movies={deduplicatedSeries.slice(0, 8)} />
            )}

            {/* Continue Watching Series */}
            {continueWatching.filter(m => m.type === 'series').length > 0 && (
              <div className="continue-watching-section">
                <div className="section-title-wrap continue-head">
                  <h3 className="section-heading">Continue Watching Series</h3>
                </div>
                <div className="continue-cards-scroll">
                  {continueWatching
                    .filter(m => m.type === 'series')
                    .map(item => (
                      <MovieContinueCard key={item.id} item={item} />
                    ))}
                </div>
              </div>
            )}

            {/* Top Picks in TV Shows */}
            {deduplicatedSeries.length > 0 && (
              <MovieSectionRow title="Top Picks For You • Web Series">
                {deduplicatedSeries.slice(0, 8).map(item => (
                  <MovieSpotlightCard key={item.id} item={item} />
                ))}
              </MovieSectionRow>
            )}

            {/* Binge-Worthy Series on OTT */}
            {[...netflixHits, ...primeHits, ...hotstarHits].filter(m => m.type === 'series').length > 0 && (
              <MovieSectionRow title="Binge-Worthy OTT Series">
                {[...netflixHits, ...primeHits, ...hotstarHits]
                  .filter(m => m.type === 'series')
                  .slice(0, 10)
                  .map(movie => (
                    <MovieBackdropCard key={movie.id} item={movie} />
                  ))}
              </MovieSectionRow>
            )}

            {/* Top 10 Trending Shows */}
            {topSeries.length > 0 && (
              <MovieSectionRow title="Top 10 Trending Shows Today">
                {topSeries.slice(0, 10).map((movie, idx) => (
                  <MovieRankedCard key={movie.id} item={movie} rank={idx + 1} />
                ))}
              </MovieSectionRow>
            )}

            {/* Drama & Prestige Web Series */}
            {deduplicatedSeries.length > 8 && (
              <MovieTwoRowSection title="Prestige Drama & Thriller Series">
                {deduplicatedSeries.slice(8, 22).map(movie => (
                  <MovieTileCard key={movie.id} item={movie} />
                ))}
              </MovieTwoRowSection>
            )}

            {/* OTT Branded Series Rows */}
            <div className="ott-branded-sections">
              {netflixHits.filter(m => m.type === 'series').length > 0 && (
                <MediaRow title="Netflix Original Series" items={netflixHits.filter(m => m.type === 'series')} />
              )}
              {primeHits.filter(m => m.type === 'series').length > 0 && (
                <MediaRow title="Prime Video Originals" items={primeHits.filter(m => m.type === 'series')} />
              )}
              {hotstarHits.filter(m => m.type === 'series').length > 0 && (
                <MediaRow title="JioHotstar Specials & HBO" items={hotstarHits.filter(m => m.type === 'series')} />
              )}
              {appleHits.filter(m => m.type === 'series').length > 0 && (
                <MediaRow title="Apple TV+ Series" items={appleHits.filter(m => m.type === 'series')} />
              )}
              {sonyHits.filter(m => m.type === 'series').length > 0 && (
                <MediaRow title="Sony LIV Series" items={sonyHits.filter(m => m.type === 'series')} />
              )}
            </div>

            {/* Dynamic Genre Series Rows */}
            {seriesGenreRows.map((row, idx) => (
              <MediaRow key={idx} title={row.title} items={row.items} />
            ))}

            {/* Infinite Scroll Anchor & Loader */}
            <div ref={movieBottomRef} className="movie-bottom-loader-anchor">
              {isLoadingSeriesGenres && (
                <div style={{ width: '100%', marginTop: '1rem' }}>
                  <SkeletonRow cardCount={6} titleWidth={200} />
                </div>
              )}
            </div>
          </>
        ) : isMoviesFilter ? (
          /* ========================================================================= */
          /* CASE 3B: MOVIES ONLY UNIVERSE                                             */
          /* ========================================================================= */
          <>
            {/* Trending Movies Deck */}
            {deduplicatedTopMovies.length > 0 && (
              <MovieTrendingFannedDeck movies={deduplicatedTopMovies} />
            )}

            {/* In Theaters Now */}
            {deduplicatedTheaterReleases.length > 0 && (
              <MediaRow
                title="In Theaters Now • Cinema Exclusive"
                items={deduplicatedTheaterReleases}
              />
            )}

            {/* Continue Watching Movies */}
            {continueWatching.filter(m => m.type !== 'series').length > 0 && (
              <div className="continue-watching-section">
                <div className="section-title-wrap continue-head">
                  <h3 className="section-heading">Continue Watching Movies</h3>
                </div>
                <div className="continue-cards-scroll">
                  {continueWatching
                    .filter(m => m.type !== 'series')
                    .map(item => (
                      <MovieContinueCard key={item.id} item={item} />
                    ))}
                </div>
              </div>
            )}

            {/* Top Picks in Movies */}
            {deduplicatedForYou.filter(m => m.type !== 'series').length > 0 && (
              <MovieSectionRow title="Top Picks For You • Movies">
                {deduplicatedForYou.filter(m => m.type !== 'series').map(item => (
                  <MovieSpotlightCard key={item.id} item={item} />
                ))}
              </MovieSectionRow>
            )}

            {/* Because You Watched */}
            {deduplicatedBecauseYouWatched.map((entry, idx) => (
              <MovieSectionRow
                key={`byw-mov-${entry.anchor.id}-${idx}`}
                title={`Because You Watched "${entry.anchor.name}"`}
              >
                {entry.movies.map(movie => (
                  <MovieBackdropCard key={movie.id} item={movie} />
                ))}
              </MovieSectionRow>
            ))}

            {/* New Movie Releases */}
            {deduplicatedNewReleases.filter(m => m.type !== 'series').length > 0 && (
              <MovieSectionRow title="New Movie Releases">
                {deduplicatedNewReleases.filter(m => m.type !== 'series').map((movie, idx) => (
                  <MovieRankedCard key={movie.id} item={movie} rank={idx + 1} />
                ))}
              </MovieSectionRow>
            )}

            {/* Regional Language Blockbusters */}
            {deduplicatedPrimaryLang.filter(m => m.type !== 'series').length > 0 && (
              <MovieTwoRowSection title={`${primaryLanguage} Blockbusters`}>
                {deduplicatedPrimaryLang.filter(m => m.type !== 'series').map(movie => (
                  <MovieTileCard key={movie.id} item={movie} />
                ))}
              </MovieTwoRowSection>
            )}

            {/* Secondary Language Hits */}
            {deduplicatedSecondaryLang.filter(m => m.type !== 'series').length > 0 && (
              <MediaRow
                title={`${secondaryLanguage} Hits`}
                items={deduplicatedSecondaryLang.filter(m => m.type !== 'series')}
              />
            )}

            {/* OTT Movie Premieres */}
            <div className="ott-branded-sections">
              {netflixHits.filter(m => m.type !== 'series').length > 0 && (
                <MediaRow title="Netflix Movies" items={netflixHits.filter(m => m.type !== 'series')} />
              )}
              {primeHits.filter(m => m.type !== 'series').length > 0 && (
                <MediaRow title="Prime Video Movies" items={primeHits.filter(m => m.type !== 'series')} />
              )}
              {hotstarHits.filter(m => m.type !== 'series').length > 0 && (
                <MediaRow title="JioHotstar Movies" items={hotstarHits.filter(m => m.type !== 'series')} />
              )}
              {appleHits.filter(m => m.type !== 'series').length > 0 && (
                <MediaRow title="Apple TV+ Films" items={appleHits.filter(m => m.type !== 'series')} />
              )}
              {sonyHits.filter(m => m.type !== 'series').length > 0 && (
                <MediaRow title="Sony LIV Movies" items={sonyHits.filter(m => m.type !== 'series')} />
              )}
              {zeeHits.filter(m => m.type !== 'series').length > 0 && (
                <MediaRow title="Zee5 Movies" items={zeeHits.filter(m => m.type !== 'series')} />
              )}
            </div>

            {/* Infinite Scrolling Movie Categories */}
            {deduplicatedGenreRows.map((row, idx) => (
              <MediaRow
                key={idx}
                title={row.title}
                items={row.items.filter(m => m.type !== 'series')}
              />
            ))}

            {/* Infinite Scroll Anchor & Loader */}
            <div ref={movieBottomRef} className="movie-bottom-loader-anchor">
              {isLoadingMore && (
                <div style={{ width: '100%', marginTop: '1rem' }}>
                  <SkeletonRow cardCount={6} titleWidth={200} />
                </div>
              )}
            </div>
          </>
        ) : isGenreFilter ? (
          /* ========================================================================= */
          /* CASE 3C: GENRE UNIVERSE (e.g. Action / Sci-Fi / Thriller)                  */
          /* ========================================================================= */
          <>
            {/* Trending in Genre Deck */}
            {categoryFilteredMovies.length > 0 && (
              <MovieTrendingFannedDeck movies={categoryFilteredMovies.slice(0, 8)} />
            )}

            {/* Top Picks in Genre */}
            {categoryFilteredMovies.length > 0 && (
              <MovieSectionRow title={`Top Picks in ${activeCategory}`}>
                {categoryFilteredMovies.slice(0, 8).map(item => (
                  <MovieSpotlightCard key={item.id} item={item} />
                ))}
              </MovieSectionRow>
            )}

            {/* Trending Releases in Genre */}
            {categoryFilteredMovies.length > 8 && (
              <MovieSectionRow title={`Trending ${activeCategory} Releases`}>
                {categoryFilteredMovies.slice(8, 16).map(movie => (
                  <MovieBackdropCard key={movie.id} item={movie} />
                ))}
              </MovieSectionRow>
            )}

            {/* Top 10 in Genre */}
            {categoryFilteredMovies.length > 16 && (
              <MovieSectionRow title={`Top 10 ${activeCategory} Hits`}>
                {categoryFilteredMovies.slice(16, 26).map((movie, idx) => (
                  <MovieRankedCard key={movie.id} item={movie} rank={idx + 1} />
                ))}
              </MovieSectionRow>
            )}

            {/* Two-Row Tile Grid */}
            {categoryFilteredMovies.length > 26 && (
              <MovieTwoRowSection title={`More ${activeCategory} Blockbusters`}>
                {categoryFilteredMovies.slice(26, 40).map(movie => (
                  <MovieTileCard key={movie.id} item={movie} />
                ))}
              </MovieTwoRowSection>
            )}

            {/* Web Series in Genre */}
            {categoryFilteredMovies.filter(m => m.type === 'series').length > 0 && (
              <MediaRow
                title={`${activeCategory} Web Series & Shows`}
                items={categoryFilteredMovies.filter(m => m.type === 'series')}
              />
            )}

            {/* All Titles in Genre */}
            {categoryFilteredMovies.length > 40 && (
              <MediaRow
                title={`All ${activeCategory} Titles`}
                items={categoryFilteredMovies.slice(40, 60)}
              />
            )}

            {/* Infinite Scroll Anchor & Loader */}
            <div ref={movieBottomRef} className="movie-bottom-loader-anchor">
              {isGenreLoading && (
                <div style={{ width: '100%', marginTop: '1rem' }}>
                  <SkeletonRow cardCount={6} titleWidth={200} />
                </div>
              )}
            </div>
          </>
        ) : (
          /* ========================================================================= */
          /* CASE 4: STANDARD FULL HOME VIEW (All Platforms, Personalization & Rows)    */
          /* ========================================================================= */
          <>
            {/* 2. Trending Fanned Cards Deck (2025/2026 Theater/OTT, Language-weighted, High IMDb >= 7.5, Popular TV) */}
            {(curatedTrending.length > 0 ? curatedTrending : deduplicatedTopMovies).length > 0 && (
              <MovieTrendingFannedDeck movies={curatedTrending.length > 0 ? curatedTrending : deduplicatedTopMovies} />
            )}

            {/* 3. Continue Watching */}
            {continueWatching.length > 0 && (
              <div className="continue-watching-section">
                <div className="section-title-wrap continue-head">
                  <h3 className="section-heading">Continue Watching</h3>
                </div>
                <div className="continue-cards-scroll">
                  {continueWatching.map(item => (
                    <MovieContinueCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )}

            {/* 3b. IN THEATERS ONLY (Strictly without OTT Releases) */}
            {deduplicatedTheaterReleases.length > 0 && (
              <MediaRow
                title="In Theaters Now • Cinema Exclusive"
                items={deduplicatedTheaterReleases}
              />
            )}

            {/* Top Picks For You - DESIGN: Spotlight Cards with IMDb pill & neon glow */}
            {deduplicatedForYou.length > 0 && (
              <MovieSectionRow title="Top Picks For You">
                {deduplicatedForYou.map(item => (
                  <MovieSpotlightCard key={item.id} item={item} />
                ))}
              </MovieSectionRow>
            )}

            {/* Because You Watched - DESIGN: 16:9 Landscape Cinematic Backdrop Cards */}
            {deduplicatedBecauseYouWatched.map((entry, idx) => (
              <MovieSectionRow
                key={`byw-${entry.anchor.id}-${idx}`}
                title={`Because You Watched "${entry.anchor.name}"`}
              >
                {entry.movies.map(movie => (
                  <MovieBackdropCard key={movie.id} item={movie} />
                ))}
              </MovieSectionRow>
            ))}

            {/* New Releases - DESIGN: #1, #2, #3 Podium Ranked Cards with OTT Badges & Category Capsules */}
            {filteredNewReleases.length > 0 && (
              <div className="new-releases-section-wrapper">
                <div className="new-releases-header-capsules">
                  <div className="section-title-wrap">
                    <h3 className="section-heading">New Releases</h3>
                  </div>
                  <div className="new-releases-category-capsules">
                    {(['All', 'Movies', 'Series'] as const).map(cat => (
                      <button
                        key={cat}
                        className={`nr-category-capsule ${newReleasesCategory === cat ? 'active' : ''}`}
                        onClick={() => setNewReleasesCategory(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <MovieSectionRow title="">
                  {filteredNewReleases.map((movie, idx) => (
                    <MovieRankedCard key={movie.id} item={movie} rank={idx + 1} />
                  ))}
                </MovieSectionRow>
              </div>
            )}

            {/* Primary Language Blockbusters - DESIGN: 2-Row Horizontal Quick Tile Grid with Auto-Pitch */}
            {deduplicatedPrimaryLang.length > 0 && (
              <MovieTwoRowSection
                title={`${primaryLanguage} Blockbusters`}
                onLoadMore={loadMorePrimaryMovies}
                isLoadingMore={isLoadingPrimMore}
              >
                {deduplicatedPrimaryLang.map(movie => (
                  <MovieTileCard key={movie.id} item={movie} />
                ))}
              </MovieTwoRowSection>
            )}

            {/* Secondary Language Hits - DESIGN: MediaRow Poster Cards with Auto-Pitch */}
            {deduplicatedSecondaryLang.length > 0 && (
              <MediaRow
                title={`${secondaryLanguage} Hits`}
                items={deduplicatedSecondaryLang}
                onLoadMore={loadMoreSecondaryMovies}
                isLoadingMore={isLoadingSecMore}
              />
            )}

            {/* Exploration Picks: Anti-Filter-Bubble - DESIGN: Panorama Feature Banners */}
            {deduplicatedExploration.length > 0 && (
              <MovieSectionRow title="Discover Something New">
                {deduplicatedExploration.map(movie => (
                  <MoviePanoramaCard key={movie.id} item={movie} />
                ))}
              </MovieSectionRow>
            )}

            {/* OTT Brand Catalogs & Series */}
            <div className="ott-branded-sections">
              {deduplicatedSeries.length > 0 && <MediaRow title="Web Series" items={deduplicatedSeries} />}
              {deduplicatedHotstar.length > 0 && <MediaRow title="JioHotstar" items={deduplicatedHotstar} />}
              {deduplicatedNetflix.length > 0 && <MediaRow title="Netflix" items={deduplicatedNetflix} />}
              {deduplicatedPrime.length > 0 && <MediaRow title="Prime Video" items={deduplicatedPrime} />}
              {deduplicatedApple.length > 0 && <MediaRow title="Apple TV+" items={deduplicatedApple} />}
              {deduplicatedSony.length > 0 && <MediaRow title="Sony LIV" items={deduplicatedSony} />}
              {deduplicatedZee.length > 0 && <MediaRow title="Zee5" items={deduplicatedZee} />}
            </div>

            {/* Infinite Scrolling Dynamic Movie Categories */}
            {deduplicatedGenreRows.map((row, idx) => (
              <MediaRow
                key={idx}
                title={row.title}
                items={row.items}
              />
            ))}

            {/* Infinite Scroll Anchor & Loader */}
            <div ref={movieBottomRef} className="movie-bottom-loader-anchor">
              {isLoadingMore && (
                <div style={{ width: '100%', marginTop: '1rem' }}>
                  <SkeletonRow cardCount={6} titleWidth={200} />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
