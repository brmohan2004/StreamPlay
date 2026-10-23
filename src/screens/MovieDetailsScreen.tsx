import './MovieDetailsScreen.css';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Share2,
  Star,
  Clock,
  Check,
  Globe,
  ChevronDown,
  Plus
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import { useNavigation } from '../context/NavigationContext';
import { MovieItem, EpisodeItem } from '../types/media';
import { fetchMovieDetails, fetchGenreMovies } from '../services/movieService';
import { SkeletonDetails, SkeletonRow } from '../components/SkeletonLoader';

/* Dynamic Movie Color Theme Generator */
interface MovieColorTheme {
  primary: string;
  accentGlow: string;
  bgGradient: string;
  badgeBg: string;
  badgeBorder: string;
}

const getMovieColorTheme = (movie: MovieItem): MovieColorTheme => {
  if (movie.ottProvider) {
    const ott = movie.ottProvider.toLowerCase();
    if (ott.includes('netflix')) {
      return {
        primary: '#e50914',
        accentGlow: 'rgba(229, 9, 20, 0.4)',
        bgGradient: 'radial-gradient(circle at 50% 0%, #290407 0%, #120103 40%, #000000 100%)',
        badgeBg: 'rgba(229, 9, 20, 0.16)',
        badgeBorder: 'rgba(229, 9, 20, 0.4)'
      };
    }
    if (ott.includes('hotstar') || ott.includes('disney')) {
      return {
        primary: '#1288ff',
        accentGlow: 'rgba(18, 136, 255, 0.4)',
        bgGradient: 'radial-gradient(circle at 50% 0%, #061d3e 0%, #020d1c 40%, #000000 100%)',
        badgeBg: 'rgba(18, 136, 255, 0.16)',
        badgeBorder: 'rgba(18, 136, 255, 0.4)'
      };
    }
    if (ott.includes('prime')) {
      return {
        primary: '#00a8e1',
        accentGlow: 'rgba(0, 168, 225, 0.4)',
        bgGradient: 'radial-gradient(circle at 50% 0%, #032133 0%, #010f17 40%, #000000 100%)',
        badgeBg: 'rgba(0, 168, 225, 0.16)',
        badgeBorder: 'rgba(0, 168, 225, 0.4)'
      };
    }
    if (ott.includes('apple')) {
      return {
        primary: '#00d2ff',
        accentGlow: 'rgba(0, 210, 255, 0.35)',
        bgGradient: 'radial-gradient(circle at 50% 0%, #081d2c 0%, #030d14 40%, #000000 100%)',
        badgeBg: 'rgba(0, 210, 255, 0.16)',
        badgeBorder: 'rgba(0, 210, 255, 0.4)'
      };
    }
  }

  const g = movie.genres?.[0]?.toLowerCase() || '';
  if (g.includes('action') || g.includes('adventure') || g.includes('crime')) {
    return {
      primary: '#00e5ff',
      accentGlow: 'rgba(0, 229, 255, 0.4)',
      bgGradient: 'radial-gradient(circle at 50% 0%, #062633 0%, #02121a 40%, #000000 100%)',
      badgeBg: 'rgba(0, 229, 255, 0.16)',
      badgeBorder: 'rgba(0, 229, 255, 0.4)'
    };
  }
  if (g.includes('horror') || g.includes('thriller')) {
    return {
      primary: '#ef4444',
      accentGlow: 'rgba(239, 68, 68, 0.4)',
      bgGradient: 'radial-gradient(circle at 50% 0%, #2b080a 0%, #150304 40%, #000000 100%)',
      badgeBg: 'rgba(239, 68, 68, 0.16)',
      badgeBorder: 'rgba(239, 68, 68, 0.4)'
    };
  }
  if (g.includes('comedy') || g.includes('animation')) {
    return {
      primary: '#f59e0b',
      accentGlow: 'rgba(245, 158, 11, 0.4)',
      bgGradient: 'radial-gradient(circle at 50% 0%, #2b1b02 0%, #140c00 40%, #000000 100%)',
      badgeBg: 'rgba(245, 158, 11, 0.16)',
      badgeBorder: 'rgba(245, 158, 11, 0.4)'
    };
  }

  return {
    primary: '#10b981',
    accentGlow: 'rgba(16, 185, 129, 0.4)',
    bgGradient: 'radial-gradient(circle at 50% 0%, #05261b 0%, #02130d 40%, #000000 100%)',
    badgeBg: 'rgba(16, 185, 129, 0.16)',
    badgeBorder: 'rgba(16, 185, 129, 0.4)'
  };
};

/* Curated trailer IDs for popular blockbusters when Cinemeta doesn't provide one */
const POPULAR_TRAILERS: Record<string, string> = {
  'tt0903747': 'HhesaQXLuRY', // Breaking Bad
  'tt0111161': 'PLl99DlL6b4', // The Shawshank Redemption
  'tt0944947': 'KPLWWIOCOOQ', // Game of Thrones
  'tt0468569': 'EXeTwQWrcwY', // The Dark Knight
  'tt0068646': 'sY1S34973zA', // The Godfather
  'tt1375666': 'YoHD9XEInc0', // Inception
  'tt0816692': 'zSWdZVtXT7E', // Interstellar
  'tt0137523': 'qtRKDV93gkQ', // Fight Club
  'tt0109830': 'bLvqoHBptjg', // Forrest Gump
  'tt0133093': 'vKQi3bBA1y8', // The Matrix
  'tt0120737': 'V75dMMIW2B4', // Lord of the Rings
  'tt7286456': 'zAGVQLHvwOY', // Joker
  'tt1877830': 'mqqft2x_Aa4', // The Batman
  'tt15398776': 'uYPbbksJxIg', // Oppenheimer
  'tt1160419': 'Way9Dexny3w'  // Dune
};

export const MovieDetailsScreen: React.FC = () => {
  const {
    selectedMovie,
    closeMovieDetails,
    openMoviePlayer,
    toggleWatchLater,
    isWatchLater
  } = useMedia();
  const { setActiveScreen } = useNavigation();

  const [movieData, setMovieData] = useState<MovieItem | null>(selectedMovie);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [recommended, setRecommended] = useState<MovieItem[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showFullStoryline, setShowFullStoryline] = useState(false);
  const [showAllAudio, setShowAllAudio] = useState(false);

  // Minimalist Autoplay Trailer Controls State
  const [isTrailerPaused, setIsTrailerPaused] = useState(false);
  const [isTrailerMuted, setIsTrailerMuted] = useState(true);
  const trailerIframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!selectedMovie) return;
    setMovieData(selectedMovie);
    setIsLoading(true);
    setIsTrailerPaused(false);
    setIsTrailerMuted(true);
    setShowFullStoryline(false);
    setShowAllAudio(false);

    let isMounted = true;
    fetchMovieDetails(selectedMovie.id, selectedMovie.type)
      .then(fullDetails => {
        if (!isMounted) return;
        setMovieData(prev => ({
          ...prev,
          ...fullDetails,
          poster: fullDetails.poster || selectedMovie.poster,
          background: fullDetails.background || selectedMovie.background || selectedMovie.poster,
          trailer: fullDetails.trailer || selectedMovie.trailer
        }));
        setIsLoading(false);

        // Fetch all related category movies across genres
        const movieGenres =
          fullDetails.genres && fullDetails.genres.length > 0
            ? fullDetails.genres
            : ['Action', 'Thriller'];

        Promise.all(movieGenres.slice(0, 3).map(g => fetchGenreMovies(g))).then(genreResults => {
          if (isMounted) {
            const allRecs = genreResults.flat();
            const seen = new Set<string>();
            const filtered = allRecs.filter(r => {
              if (!r.id || r.id === selectedMovie.id || seen.has(r.id)) return false;
              seen.add(r.id);
              return true;
            });
            setRecommended(filtered);
          }
        });
      })
      .catch(err => {
        console.error('Details fetch error:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedMovie]);

  // Extract YouTube ID for autoplay
  const trailerYtId = useMemo(() => {
    if (movieData?.trailer) {
      const match = movieData.trailer.match(/(?:embed\/|v\/|watch\?v=|watch\?.+&v=)([\w-]{11})/);
      if (match) return match[1];
      if (movieData.trailer.length === 11) return movieData.trailer;
    }
    if (movieData?.id && POPULAR_TRAILERS[movieData.id]) {
      return POPULAR_TRAILERS[movieData.id];
    }
    return null;
  }, [movieData?.trailer, movieData?.id]);

  // Trailer Player Actions
  const toggleTrailerPlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!trailerIframeRef.current?.contentWindow) return;
    const nextPaused = !isTrailerPaused;
    trailerIframeRef.current.contentWindow.postMessage(
      JSON.stringify({ event: 'command', func: nextPaused ? 'pauseVideo' : 'playVideo' }),
      '*'
    );
    setIsTrailerPaused(nextPaused);
  };

  const toggleTrailerMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!trailerIframeRef.current?.contentWindow) return;
    const nextMuted = !isTrailerMuted;
    trailerIframeRef.current.contentWindow.postMessage(
      JSON.stringify({ event: 'command', func: nextMuted ? 'mute' : 'unMute' }),
      '*'
    );
    if (!nextMuted) {
      trailerIframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'setVolume', args: [100] }),
        '*'
      );
    }
    setIsTrailerMuted(nextMuted);
  };

  const theme = useMemo(() => {
    if (!movieData) {
      return {
        primary: '#00d2ff',
        accentGlow: 'rgba(0, 210, 255, 0.35)',
        bgGradient: '#000000',
        badgeBg: 'rgba(0, 210, 255, 0.15)',
        badgeBorder: 'rgba(0, 210, 255, 0.35)'
      };
    }
    return getMovieColorTheme(movieData);
  }, [movieData]);

  if (isLoading && !movieData) {
    return <SkeletonDetails />;
  }

  if (!movieData) {
    return (
      <div className="movie-details-empty">
        <p>No movie selected.</p>
        <button className="details-back-home-btn" onClick={() => setActiveScreen('home')}>
          Return to Home
        </button>
      </div>
    );
  }

  const isBookmarked = isWatchLater(movieData.id);

  // Group episodes by season if series
  const seasonsMap: Record<number, EpisodeItem[]> = {};
  if (movieData.videos && movieData.videos.length > 0) {
    movieData.videos.forEach(v => {
      const s = typeof v.season === 'number' ? v.season : 1;
      if (!seasonsMap[s]) seasonsMap[s] = [];
      seasonsMap[s].push(v);
    });
  }

  // Deduplicate and sort episodes within each season strictly by episode number
  Object.keys(seasonsMap).forEach(sKey => {
    const s = Number(sKey);
    const seenNumbers = new Set<number>();
    seasonsMap[s] = seasonsMap[s]
      .filter(ep => {
        if (seenNumbers.has(ep.number)) return false;
        seenNumbers.add(ep.number);
        return true;
      })
      .sort((a, b) => a.number - b.number);
  });

  // Regular seasons first (1, 2, 3...), and specials (season 0) at the end
  const availableSeasons = Object.keys(seasonsMap)
    .map(Number)
    .sort((a, b) => {
      if (a === 0) return 1;
      if (b === 0) return -1;
      return a - b;
    });

  const currentEpisodes =
    seasonsMap[selectedSeason] ||
    seasonsMap[1] ||
    (availableSeasons.length > 0 ? seasonsMap[availableSeasons[0]] : []);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleBack = () => {
    closeMovieDetails();
    setActiveScreen('home');
  };

  return (
    <div
      className="movie-details-screen"
      style={
        {
          background: theme.bgGradient,
          '--theme-color': theme.primary,
          '--theme-glow': theme.accentGlow,
          '--badge-bg': theme.badgeBg,
          '--badge-border': theme.badgeBorder
        } as React.CSSProperties
      }
    >
      {/* Dynamic Ambient Blurred Backdrop Canvas */}
      <div
        className="details-ambient-backdrop-canvas"
        style={{
          backgroundImage: `url(${movieData.background || movieData.poster})`
        }}
      />
      <div className="details-ambient-mesh-overlay" />
      {isLoading && <div className="details-top-progress-bar" />}

      {/* 1. Dedicated Cinematic Trailer / Hero Video Deck */}
      <div className="details-trailer-hero-deck">
        {trailerYtId ? (
          <div className="details-trailer-viewport">
            <iframe
              ref={trailerIframeRef}
              src={`https://www.youtube-nocookie.com/embed/${trailerYtId}?enablejsapi=1&autoplay=1&mute=1&controls=0&loop=1&playlist=${trailerYtId}&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&fs=0`}
              title={`${movieData.name} Official Trailer`}
              className="details-trailer-iframe-layer"
              allow="autoplay; encrypted-media; picture-in-picture"
            />
            <div className="details-trailer-vignette-scrim" />

            {/* Floating Trailer Controls: ONLY Pause and Mute */}
            <div className="details-trailer-floating-ctrls">
              <button
                className="trailer-pill-btn"
                onClick={toggleTrailerPlay}
                title={isTrailerPaused ? 'Play Trailer' : 'Pause Trailer'}
                aria-label={isTrailerPaused ? 'Play Trailer' : 'Pause Trailer'}
              >
                {isTrailerPaused ? (
                  <Play size={16} fill="#ffffff" color="#ffffff" style={{ marginLeft: 2 }} />
                ) : (
                  <Pause size={16} fill="#ffffff" color="#ffffff" />
                )}
              </button>

              <button
                className="trailer-pill-btn"
                onClick={toggleTrailerMute}
                title={isTrailerMuted ? 'Unmute Audio' : 'Mute Audio'}
                aria-label={isTrailerMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {isTrailerMuted ? (
                  <VolumeX size={16} color="#ffffff" />
                ) : (
                  <Volume2 size={16} color="#ffffff" />
                )}
              </button>
            </div>
          </div>
        ) : (
          <div
            className="details-trailer-fallback-poster"
            style={{
              backgroundImage: `url(${movieData.background || movieData.poster})`
            }}
          >
            <div className="details-trailer-vignette-scrim" />
          </div>
        )}

        {/* Floating Circle Navigation Overlay (Top Left: Back, Top Right: Share) */}
        <div className="details-top-circle-nav">
          <button className="details-nav-circle-btn back" onClick={handleBack} aria-label="Go Back">
            <ArrowLeft size={20} />
          </button>

          <button
            className="details-nav-circle-btn share"
            onClick={handleShare}
            title="Share Link"
            aria-label="Share Link"
          >
            {copiedLink ? <Check size={18} color="#c8ff00" /> : <Share2 size={18} />}
          </button>
        </div>
      </div>

      {/* 2. Fluid Minimalist Content Column */}
      <div className="details-main-content-flow">
        {/* Title, Year, Rating, Quality Header */}
        <div className="details-title-header-block">
          <h1 className="details-clean-title">{movieData.name}</h1>

          {/* Minimalist 1-Line Meta Row */}
          <div className="details-clean-meta-line">
            <span className="meta-highlight-year">{movieData.releaseInfo || '2025'}</span>
            <span className="meta-sep">•</span>
            {movieData.runtime && (
              <>
                <span className="meta-duration">
                  <Clock size={12} /> {movieData.runtime}
                </span>
                <span className="meta-sep">•</span>
              </>
            )}
            <div className="meta-rating-chip">
              <Star size={11} fill="#ffc107" color="#ffc107" />
              <span>{movieData.imdbRating || '8.2'}</span>
            </div>
            <span className="meta-sep">•</span>
            <span className="meta-quality-chip">4K UHD</span>
            <span className="meta-sep">•</span>
            <span className="meta-audio-chip">5.1</span>
            {movieData.ottProvider && movieData.ottProvider !== 'All' && (
              <>
                <span className="meta-sep">•</span>
                <span className={`meta-ott-chip ${movieData.ottProvider.toLowerCase().replace(/[^a-z]/g, '')}`}>
                  {movieData.ottProvider}
                </span>
              </>
            )}
          </div>

          {/* Subtle Clean Genres Row */}
          {movieData.genres && movieData.genres.length > 0 && (
            <div className="details-clean-genres-row">
              {movieData.genres.map((g, idx) => (
                <span key={idx} className="clean-genre-dot-pill">
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 3. Primary Full-Width Action Button */}
        <div className="details-clean-action-section">
          {movieData.isTheaterPrint && (
            <div className="details-theater-warning-pill">
              <span className="theater-pill-icon">⚡</span>
              <div className="theater-pill-text">
                <strong>IN THEATERS EARLY ACCESS (CAM-HD)</strong>
                <p>Cinema audio recorded live. Official 4K Digital Master will automatically update when released by studio.</p>
              </div>
            </div>
          )}

          {movieData.streamUrl && (
            <div className="details-live-stream-pill">
              <span className="live-stream-dot" />
              <div className="theater-pill-text">
                <strong>DIRECT LIVE STREAM FEED (ZERO ADS)</strong>
                <p>Instant low-latency HLS stream with adaptive bitrate and in-player audio selection.</p>
              </div>
            </div>
          )}

          <motion.button
            className="details-bold-play-btn"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => openMoviePlayer(movieData, selectedSeason, 1)}
          >
            <Play size={20} fill="#000000" color="#000000" style={{ marginLeft: 2 }} />
            <span>
              {movieData.streamUrl
                ? 'Watch Live Stream Now'
                : movieData.type === 'series'
                ? `Watch Season ${selectedSeason} : Ep 1`
                : 'Play Movie Full Screen'}
            </span>
          </motion.button>

          {/* Clean Secondary Action Bar: Watchlist & Share */}
          <div className="details-sub-actions-bar">
            <button
              className={`details-sub-action-pill ${isBookmarked ? 'saved' : ''}`}
              onClick={() => toggleWatchLater(movieData)}
            >
              {isBookmarked ? (
                <>
                  <Check size={16} color="#c8ff00" />
                  <span>In Watchlist</span>
                </>
              ) : (
                <>
                  <Plus size={16} />
                  <span>Watch Later</span>
                </>
              )}
            </button>

            <button className="details-sub-action-pill" onClick={handleShare}>
              <Share2 size={16} />
              <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
            </button>
          </div>
        </div>

        {/* 4. Streamlined Storyline (3-Line Clamped with 'more') */}
        <section className="details-streamlined-section">
          <h3 className="streamlined-sec-title">Storyline</h3>
          <p className={`streamlined-synopsis ${showFullStoryline ? 'expanded' : 'clamped'}`}>
            {movieData.description || 'Watch now on StreamPlay in highest quality streaming.'}
          </p>
          {movieData.description && movieData.description.length > 150 && (
            <button
              className="streamlined-more-toggle"
              onClick={() => setShowFullStoryline(prev => !prev)}
            >
              {showFullStoryline ? 'Show Less' : 'Read More'}
            </button>
          )}
        </section>

        {/* 5. Minimalist Compact Audio & Subtitles Disclosure Strip */}
        <section className="details-streamlined-section">
          <div
            className="compact-audio-disclosure-bar"
            onClick={() => setShowAllAudio(prev => !prev)}
            role="button"
            tabIndex={0}
            title="Click to view all languages"
          >
            <div className="audio-disclosure-left">
              <Globe size={16} className="audio-globe-icon" />
              <div className="audio-disclosure-summary">
                <span className="audio-summary-line">
                  <strong>Audio:</strong> English (5.1), Hindi, Tamil, Telugu {movieData.type === 'movie' ? '+4 more' : ''}
                </span>
                <span className="sub-summary-line">
                  <strong>Subs:</strong> English [CC], Hindi, Spanish
                </span>
              </div>
            </div>
            <ChevronDown size={16} className={`audio-disclosure-chevron ${showAllAudio ? 'expanded' : ''}`} />
          </div>

          {/* Expanded View if User Toggles */}
          {showAllAudio && (
            <motion.div
              className="audio-lang-expanded-tray"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="audio-group-row">
                <span className="audio-group-tag">Audio:</span>
                <div className="audio-pill-wrap">
                  <span className="mini-audio-pill highlight">English (Original 5.1)</span>
                  <span className="mini-audio-pill">Hindi</span>
                  <span className="mini-audio-pill">Tamil</span>
                  <span className="mini-audio-pill">Telugu</span>
                  <span className="mini-audio-pill">Malayalam</span>
                  <span className="mini-audio-pill">Kannada</span>
                  <span className="mini-audio-pill">Spanish</span>
                  <span className="mini-audio-pill">French</span>
                </div>
              </div>
              <div className="audio-group-row">
                <span className="audio-group-tag">Subtitles:</span>
                <div className="audio-pill-wrap">
                  <span className="mini-sub-pill">English [CC]</span>
                  <span className="mini-sub-pill">Hindi [CC]</span>
                  <span className="mini-sub-pill">Tamil</span>
                  <span className="mini-sub-pill">Telugu</span>
                  <span className="mini-sub-pill">Spanish</span>
                </div>
              </div>
            </motion.div>
          )}
        </section>

        {/* 6. TV Series Season & Episode Navigator (If Series) */}
        {movieData.type === 'series' && availableSeasons.length > 0 && (
          <section className="details-streamlined-section">
            <div className="episodes-header-row">
              <h3 className="streamlined-sec-title">Episodes</h3>

              <div className="seasons-tab-pill-row">
                {availableSeasons.map(s => (
                  <button
                    key={s}
                    className={`season-tab-btn ${selectedSeason === s ? 'active' : ''}`}
                    onClick={() => setSelectedSeason(s)}
                  >
                    {s === 0 ? 'Specials' : `Season ${s}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="episodes-cards-list">
              {currentEpisodes.map((ep, idx) => (
                <div
                  key={`${ep.season}-${ep.number}-${ep.id || idx}`}
                  className="episode-card-item"
                  onClick={() => openMoviePlayer(movieData, ep.season, ep.number)}
                >
                  <div className="episode-thumb-wrap">
                    <img
                      src={ep.thumbnail || movieData.poster}
                      alt={ep.name}
                      className="episode-thumb-img"
                      onError={e => {
                        (e.target as HTMLImageElement).src = movieData.poster;
                      }}
                    />
                    <div className="episode-play-badge">
                      <Play size={16} fill="#ffffff" color="#ffffff" />
                    </div>
                    <span className="episode-index-tag">EP {ep.number}</span>
                  </div>

                  <div className="episode-info-column">
                    <div className="episode-title-row">
                      <h4 className="episode-name">
                        {ep.number}. {ep.name}
                      </h4>
                      {ep.rating && (
                        <span className="ep-rating">
                          <Star size={11} fill="#ffc107" color="#ffc107" /> {ep.rating}
                        </span>
                      )}
                    </div>
                    <p className="episode-overview-snippet">
                      {ep.overview || `Watch Episode ${ep.number} of ${movieData.name} in 4K HDR streaming.`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 7. More Like This / All Related Category Movies in 3 Rows */}
        {recommended.length > 0 ? (
          <section className="details-streamlined-section">
            <h3 className="streamlined-sec-title">More Like This</h3>
            <div className="details-more-like-three-rows">
              {recommended.map(item => (
                <div
                  key={item.id}
                  className="three-row-rec-card"
                  onClick={() => {
                    setMovieData(item);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <div className="three-row-poster-wrap">
                    <img
                      src={item.poster}
                      alt={item.name}
                      className="three-row-poster-img"
                      loading="lazy"
                      onError={e => {
                        (e.target as HTMLImageElement).src =
                          'https://images.metahub.space/poster/small/default/img';
                      }}
                    />
                    <div className="three-row-rating-badge">
                      <Star size={10} fill="#ffc107" color="#ffc107" />
                      <span>{item.imdbRating || '8.2'}</span>
                    </div>
                  </div>
                  <div className="three-row-card-meta">
                    <h4 className="three-row-card-title" title={item.name}>
                      {item.name}
                    </h4>
                    <span className="three-row-card-sub">{item.releaseInfo || '2025'}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="details-streamlined-section" style={{ width: '100%', marginTop: '1rem' }}>
            <SkeletonRow cardCount={5} titleWidth={160} />
          </section>
        )}
      </div>
    </div>
  );
};
