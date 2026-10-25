// src/components/player/StreamPlayer.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useHlsPlayer } from '../../hooks/useHlsPlayer';
import { StreamMirror, StreamSubtitleTrack } from '../../types/stream';

export interface StreamPlayerProps {
  src?: string | null;
  mirrors?: StreamMirror[];
  subtitles?: StreamSubtitleTrack[];
  className?: string;
  style?: React.CSSProperties;
  onEnded?: () => void;
  onError?: (error: unknown) => void;
}

export const StreamPlayer: React.FC<StreamPlayerProps> = ({
  src,
  mirrors,
  subtitles,
  className,
  style,
  onEnded,
  onError
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mirrorUrls = (mirrors && mirrors.length > 0 ? mirrors.map((m) => m.url) : src ? [src] : []).filter(Boolean);
  const [mirrorIndex, setMirrorIndex] = useState(0);
  const [currentSrc, setCurrentSrc] = useState<string | null>(mirrorUrls[0] || null);

  useEffect(() => {
    setMirrorIndex(0);
    setCurrentSrc(mirrorUrls[0] || null);
  }, [src, mirrors]);

  const handleError = useCallback(() => {
    if (mirrorIndex < mirrorUrls.length - 1) {
      const next = mirrorIndex + 1;
      setMirrorIndex(next);
      setCurrentSrc(mirrorUrls[next]);
    } else {
      onError?.(new Error('All mirrors failed'));
    }
  }, [mirrorIndex, mirrorUrls, onError]);

  useHlsPlayer(videoRef, { src: currentSrc, onError: handleError });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleEnded = () => onEnded?.();
    video.addEventListener('ended', handleEnded);
    return () => video.removeEventListener('ended', handleEnded);
  }, [onEnded]);

  return (
    <div className={className} style={{ position: 'relative', width: '100%', height: '100%', ...style }}>
      <video
        ref={videoRef}
        controls
        playsInline
        style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
      />
      {subtitles && subtitles.length > 0 && (
        <track kind="subtitles" />
      )}
    </div>
  );
};