import './WatchLaterScreen.css';
import React from 'react';
import { Bookmark, Trash2 } from 'lucide-react';
import { TopAppHeader } from '../components/TopAppHeader';
import { useMedia } from '../context/MediaContext';
import { MediaCard } from '../components/MediaCard';

export const WatchLaterScreen: React.FC = () => {
  const { watchLater, toggleWatchLater } = useMedia();

  return (
    <div className="watchlater-screen-container">
      <TopAppHeader showBack title="Watch Later" />

      <div className="watchlater-scroll-body">
        <div className="watchlater-hero-summary">
          <div className="summary-left">
            <h2 className="summary-title">Watch Later</h2>
            <p className="summary-count">{watchLater.length} saved</p>
          </div>
        </div>

        {watchLater.length === 0 ? (
          <div className="watchlater-empty">
            <Bookmark size={48} className="empty-icon" />
            <h3>Your Watch Later list is empty</h3>
            <p>Tap the bookmark icon on any movie card or flip card to save it here.</p>
          </div>
        ) : (
          <div className="watchlater-grid">
            {watchLater.map(movie => (
              <div key={movie.id} className="watchlater-card-wrap">
                <MediaCard item={movie} />
                <button
                  className="remove-watchlater-btn"
                  onClick={() => toggleWatchLater(movie)}
                  title="Remove from Watch Later"
                >
                  <Trash2 size={14} />
                  <span>Remove</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
