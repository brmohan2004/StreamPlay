import React from 'react';
import './PlayerVisualStage.css';
import { SongItem } from '../../types/media';

interface PlayerVisualStageProps {
  currentSong: SongItem;
  playbackMode: 'audio' | 'video';
}

export const PlayerVisualStage: React.FC<PlayerVisualStageProps> = ({ currentSong, playbackMode }) => {
  return (
    <div className="player-visual-stage">
      {playbackMode === 'video' ? (
        <div className="player-video-embed-frame">
          {currentSong.videoUrl?.includes('youtube') || currentSong.videoUrl?.includes('embed') ? (
            <iframe
              src={currentSong.videoUrl}
              title={currentSong.title}
              className="music-video-iframe"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              src={currentSong.videoUrl || currentSong.streamUrl}
              controls
              autoPlay
              className="music-video-player"
            />
          )}
        </div>
      ) : (
        <div className="player-artwork-wrap">
          <img
            src={currentSong.image}
            alt={currentSong.title}
            className="player-artwork-image"
          />
          <div className="artwork-bokeh-overlay" />
          <div className="artwork-vignette" />
        </div>
      )}
    </div>
  );
};
