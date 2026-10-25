import React, { useEffect } from 'react';
import { useMedia } from '../context/MediaContext';
import { StreamPlayer } from './player/StreamPlayer';

export const VideoPlayerModal: React.FC = () => {
  const { isVideoModalOpen, activeMovie, closeMoviePlayer } = useMedia();

  useEffect(() => {
    if (!isVideoModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMoviePlayer();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVideoModalOpen, closeMoviePlayer]);

  if (!isVideoModalOpen || !activeMovie) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          color: '#fff',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.8), transparent)',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 2,
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{activeMovie.name}</h2>
        <button
          onClick={closeMoviePlayer}
          aria-label="Close player"
          style={{
            background: 'rgba(255,255,255,0.12)',
            border: 'none',
            color: '#fff',
            borderRadius: '50%',
            width: 36,
            height: 36,
            cursor: 'pointer',
            fontSize: 18,
          }}
        >
          ×
        </button>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        {activeMovie.streamUrl ? (
          <StreamPlayer
            src={activeMovie.streamUrl}
            mirrors={activeMovie.streamBundle?.mirrors}
            subtitles={activeMovie.streamBundle?.subtitles}
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            Loading stream…
          </div>
        )}
      </div>
    </div>
  );
};

