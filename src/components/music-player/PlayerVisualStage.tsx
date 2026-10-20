import React, { useState, useEffect } from 'react';
import './PlayerVisualStage.css';
import { SongItem } from '../../types/media';
import { resolveSongVideoUrl } from '../../services/musicService';

interface PlayerVisualStageProps {
  currentSong: SongItem;
  playbackMode: 'audio' | 'video';
}

export const PlayerVisualStage: React.FC<PlayerVisualStageProps> = ({ currentSong, playbackMode }) => {
  const [resolvedVideo, setResolvedVideo] = useState<string>('');
  const [isVideoResolving, setIsVideoResolving] = useState<boolean>(false);

  useEffect(() => {
    if (playbackMode !== 'video' || !currentSong) return;

    if (currentSong.videoUrl && !currentSong.videoUrl.includes('listType=search')) {
      setResolvedVideo(currentSong.videoUrl);
      return;
    }

    let isMounted = true;
    setIsVideoResolving(true);
    resolveSongVideoUrl(currentSong).then(url => {
      if (isMounted) {
        setResolvedVideo(url);
        setIsVideoResolving(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentSong, playbackMode]);

  return (
    <div className="player-visual-stage">
      {playbackMode === 'video' ? (
        <div className="player-video-embed-frame">
          {isVideoResolving ? (
            <div className="video-resolving-loader">
              <div className="stream-glow-spinner small" />
              <span>Connecting official video stream...</span>
            </div>
          ) : resolvedVideo ? (
            resolvedVideo.includes('youtube') || resolvedVideo.includes('embed') ? (
              <iframe
                src={resolvedVideo}
                title={currentSong.title}
                className="music-video-iframe"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            ) : (
              <video
                src={resolvedVideo}
                controls
                autoPlay
                className="music-video-player"
              />
            )
          ) : (
            <div className="player-artwork-wrap">
              <img
                src={currentSong.image}
                alt={currentSong.title}
                className="player-artwork-image"
              />
              <div className="artwork-bokeh-overlay" />
              <div className="artwork-vignette" />
              <div className="video-fallback-notice">
                <span>Audio Only Stream (Video Unavailable)</span>
              </div>
            </div>
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
