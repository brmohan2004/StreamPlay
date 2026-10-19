import './MovieDetailsScreen.css';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Play,
  Bookmark,
  Share2,
  Star,
  Clock,
  Film,
  Tv,
  Users,
  Layers,
  Sparkles,
  Check,
  Video
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import { useNavigation } from '../context/NavigationContext';
import { MovieItem, EpisodeItem } from '../types/media';
import { fetchMovieDetails, fetchGenreMovies } from '../services/movieService';

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
  const [showTrailer, setShowTrailer] = useState(false);


  useEffect(() => {
    if (!selectedMovie) return;
    setMovieData(selectedMovie);
    setIsLoading(true);

    let isMounted = true;
    fetchMovieDetails(selectedMovie.id, selectedMovie.type)
      .then(fullDetails => {
        if (!isMounted) return;
        setMovieData(prev => ({
          ...prev,
          ...fullDetails,
          poster: fullDetails.poster || selectedMovie.poster,
          background: fullDetails.background || selectedMovie.background || selectedMovie.poster
        }));
        setIsLoading(false);

        // Fetch recommendations from main genre
        const mainGenre = fullDetails.genres?.[0] || 'Action';
        fetchGenreMovies(mainGenre).then(recs => {
          if (isMounted) {
            setRecommended(recs.filter(r => r.id !== selectedMovie.id).slice(0, 8));
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
      const s = v.season || 1;
      if (!seasonsMap[s]) seasonsMap[s] = [];
      seasonsMap[s].push(v);
    });
  }
  const availableSeasons = Object.keys(seasonsMap)
    .map(Number)
    .sort((a, b) => a - b);

  const currentEpisodes = seasonsMap[selectedSeason] || seasonsMap[1] || [];

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
    <div className="movie-details-screen">
      {/* 1. Sticky Navigation Header */}
      <header className="details-sticky-header">
        {isLoading && <div className="details-header-loading-bar" />}
        <button className="details-circle-btn" onClick={handleBack} aria-label="Go Back">
          <ArrowLeft size={20} />
        </button>

        <h3 className="details-header-title">{movieData.name}</h3>

        <div className="details-header-actions">
          <button
            className={`details-circle-btn ${isBookmarked ? 'active-bookmark' : ''}`}
            onClick={() => toggleWatchLater(movieData)}
            title="Add to Watch Later"
          >
            <Bookmark size={18} fill={isBookmarked ? '#ffffff' : 'none'} />
          </button>

          <button className="details-circle-btn" onClick={handleShare} title="Share Link">
            {copiedLink ? <Check size={18} color="#c8ff00" /> : <Share2 size={18} />}
          </button>
        </div>
      </header>

      {/* 2. Hero Cinematic Backdrop Section */}
      <div className="details-hero-stage">
        <div
          className="details-backdrop-img"
          style={{
            backgroundImage: `url(${movieData.background || movieData.poster})`
          }}
        >
          <div className="details-backdrop-vignette" />
        </div>

        {/* Floating Poster & Meta Stack */}
        <div className="details-hero-content-wrap">
          <div className="details-poster-wrap">
            <img
              src={movieData.poster}
              alt={movieData.name}
              className="details-main-poster"
              onError={e => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80';
              }}
            />
            {movieData.ottProvider && (
              <span className={`details-ott-tag ${movieData.ottProvider.toLowerCase().replace(/[^a-z]/g, '')}`}>
                {movieData.ottProvider}
              </span>
            )}
          </div>

          <div className="details-meta-column">
            <div className="details-badges-row">
              <span className="details-quality-badge">4K ULTRA HD</span>
              <span className="details-type-badge">
                {movieData.type === 'series' ? <Tv size={12} /> : <Film size={12} />}
                <span>{movieData.type.toUpperCase()}</span>
              </span>
              <div className="details-imdb-pill">
                <Star size={13} fill="#ffc107" color="#ffc107" />
                <span>{movieData.imdbRating || '8.4'}</span>
              </div>
            </div>

            <h1 className="details-main-title">{movieData.name}</h1>

            <div className="details-runtime-line">
              <span>{movieData.releaseInfo || '2025'}</span>
              <span>•</span>
              {movieData.runtime && (
                <>
                  <span className="details-duration">
                    <Clock size={13} /> {movieData.runtime}
                  </span>
                  <span>•</span>
                </>
              )}
              <span className="details-lang-pill">Dolby Atmos / 5.1</span>
            </div>

            <div className="details-genres-list">
              {movieData.genres?.map((g, idx) => (
                <span key={idx} className="details-genre-pill">
                  {g}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Primary Watch CTA Bar */}
      <div className="details-cta-deck">
        <motion.button
          className="details-primary-play-btn"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => openMoviePlayer(movieData, 1, 1)}
        >
          <Play size={20} fill="#000000" color="#000000" />
          <span>{movieData.type === 'series' ? 'Watch Season 1 : Ep 1' : 'Play Movie Full Screen'}</span>
        </motion.button>

        {movieData.trailer && (
          <button
            className="details-secondary-trailer-btn"
            onClick={() => setShowTrailer(prev => !prev)}
          >
            <Video size={18} />
            <span>Trailer</span>
          </button>
        )}

        <button
          className={`details-watchlist-btn ${isBookmarked ? 'saved' : ''}`}
          onClick={() => toggleWatchLater(movieData)}
        >
          <Bookmark size={18} fill={isBookmarked ? '#ffffff' : 'none'} />
          <span>{isBookmarked ? 'In Watchlist' : 'Watch Later'}</span>
        </button>
      </div>

      {/* Optional Trailer Modal / Embed */}
      {showTrailer && movieData.trailer && (
        <div className="details-trailer-embed-container">
          <div className="trailer-embed-header">
            <span>Official Trailer</span>
            <button onClick={() => setShowTrailer(false)}>Close ✕</button>
          </div>
          <iframe
            src={`${movieData.trailer}?autoplay=1`}
            title={`${movieData.name} Trailer`}
            className="details-trailer-iframe"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* 4. Storyline & Overview */}
      <section className="details-section storyline-section">
        <h3 className="details-sec-heading">Storyline</h3>
        <p className="details-synopsis-text">
          {movieData.description || 'Watch now in highest quality on StreamPlay.'}
        </p>
      </section>

      {/* 5. TV Series Season & Episode Navigator (If Series) */}
      {movieData.type === 'series' && availableSeasons.length > 0 && (
        <section className="details-section episodes-section">
          <div className="episodes-header-row">
            <h3 className="details-sec-heading">
              <Layers size={18} className="text-lime" />
              <span>Episodes</span>
            </h3>

            {/* Season Selector Tabs */}
            <div className="seasons-tab-pill-row">
              {availableSeasons.map(s => (
                <button
                  key={s}
                  className={`season-tab-btn ${selectedSeason === s ? 'active' : ''}`}
                  onClick={() => setSelectedSeason(s)}
                >
                  Season {s}
                </button>
              ))}
            </div>
          </div>

          {/* Episode Cards Grid */}
          <div className="episodes-cards-list">
            {currentEpisodes.map((ep, idx) => (
              <div
                key={ep.id || idx}
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

      {/* 6. Cast & Crew Section */}
      {movieData.cast && movieData.cast.length > 0 && (
        <section className="details-section cast-section">
          <h3 className="details-sec-heading">
            <Users size={18} className="text-cyan" />
            <span>Top Cast</span>
          </h3>
          <div className="cast-scroll-track">
            {movieData.cast.map((actor, idx) => (
              <div key={idx} className="cast-card-item">
                <div className="cast-avatar-circle">
                  <span className="cast-initials">{actor.charAt(0)}</span>
                </div>
                <span className="cast-actor-name">{actor}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7. Multi-Server Streaming Specs */}
      <section className="details-section server-specs-section">
        <h3 className="details-sec-heading">
          <Sparkles size={18} className="text-lime" />
          <span>Available Streaming Servers</span>
        </h3>
        <div className="server-chips-grid">
          <div className="server-chip-card active">
            <span className="server-pulse-dot" />
            <div className="server-info-text">
              <strong>Server 1 • VidLink Pro</strong>
              <span>4K Ultra HD • Fast CDN</span>
            </div>
          </div>
          <div className="server-chip-card">
            <span className="server-pulse-dot online" />
            <div className="server-info-text">
              <strong>Server 2 • NetMirror Cloud</strong>
              <span>1080p FHD • Multi-Audio</span>
            </div>
          </div>
          <div className="server-chip-card">
            <span className="server-pulse-dot online" />
            <div className="server-info-text">
              <strong>Server 3 • 2Embed Multi-Lang</strong>
              <span>Dual Audio • Subtitles</span>
            </div>
          </div>
          <div className="server-chip-card">
            <span className="server-pulse-dot online" />
            <div className="server-info-text">
              <strong>Server 4 • CineSrc Direct</strong>
              <span>Adaptive Bitrate • Low Latency</span>
            </div>
          </div>
        </div>
      </section>

      {/* 8. More Like This / Recommended */}
      {recommended.length > 0 && (
        <section className="details-section recommendations-section">
          <h3 className="details-sec-heading">More Like This</h3>
          <div className="recs-horizontal-scroll">
            {recommended.map(item => (
              <div
                key={item.id}
                className="rec-movie-card"
                onClick={() => {
                  setMovieData(item);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <img src={item.poster} alt={item.name} className="rec-card-poster" />
                <h4 className="rec-card-title">{item.name}</h4>
                <div className="rec-card-meta">
                  <span>{item.releaseInfo || '2025'}</span>
                  <span>★ {item.imdbRating || '8.0'}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
