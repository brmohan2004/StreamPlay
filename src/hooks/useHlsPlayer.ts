// src/hooks/useHlsPlayer.ts
import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

export interface UseHlsPlayerOptions {
  src: string | null;
  onError?: (error: unknown) => void;
}

export function useHlsPlayer(videoRef: React.RefObject<HTMLVideoElement | null>, options: UseHlsPlayerOptions) {
  const hlsRef = useRef<Hls | null>(null);
  const { src, onError } = options;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      let networkRetries = 0;
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch((e) => console.warn('Autoplay prevented:', e));
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          if (networkRetries < 2) {
            networkRetries += 1;
            setTimeout(() => hls.startLoad(), 1000 * networkRetries);
            return;
          }
          onError?.(data);
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        } else if (data.fatal) {
          onError?.(data);
        }
      });
      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      const handleLoaded = () => {
        video.play().catch((e) => console.warn('Autoplay prevented:', e));
      };
      video.addEventListener('loadedmetadata', handleLoaded, { once: true });
      return () => {
        video.removeEventListener('loadedmetadata', handleLoaded);
        video.removeAttribute('src');
        video.load();
      };
    }

    onError?.(new Error('HLS not supported'));
    return undefined;
  }, [src, videoRef, onError]);

  return hlsRef;
}