import { registerPlugin, Capacitor } from '@capacitor/core';

interface BackgroundAudioPlugin {
  start(options: {
    title: string;
    artist: string;
    coverUrl?: string;
    isPlaying?: boolean;
    duration?: number;
    position?: number;
  }): Promise<{ success: boolean }>;
  update(options: {
    title: string;
    artist: string;
    coverUrl?: string;
    isPlaying?: boolean;
    duration?: number;
    position?: number;
  }): Promise<{ success: boolean }>;
  stop(): Promise<{ success: boolean }>;
  addListener(
    eventName: 'mediaAction',
    listenerFunc: (data: { action: string; position?: number }) => void
  ): Promise<any>;
}

const BackgroundAudio = registerPlugin<BackgroundAudioPlugin>('BackgroundAudio');
const isNative = Capacitor.isNativePlatform();

let silentAudioCtx: AudioContext | null = null;

/**
 * Keeps the browser's native audio pipeline active across track switches.
 * Uses lightweight AudioContext state check without heavy continuous oscillator spinning.
 */
export function enableAudioPipelineKeepAlive(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!silentAudioCtx) {
      silentAudioCtx = new AudioCtx({ latencyHint: 'playback' });
    }

    if (silentAudioCtx.state === 'suspended') {
      silentAudioCtx.resume().catch(() => {});
    }
  } catch (err) {
    console.warn('[AudioPipelineKeepAlive]', err);
  }
}

/**
 * Starts the native Android Foreground Service & MediaSession with a CPU WakeLock and WifiLock.
 * Powers System Control Panel, Dynamic Island, Lockscreen, and background audio playback.
 */
export async function startNativeBackgroundAudio(
  title: string,
  artist: string,
  coverUrl?: string,
  isPlaying: boolean = true,
  duration: number = 0,
  position: number = 0
): Promise<void> {
  enableAudioPipelineKeepAlive();
  if (!isNative) return;
  try {
    if (BackgroundAudio) {
      await BackgroundAudio.start({
        title: title || 'Playing Music',
        artist: artist || 'StreamPlay',
        coverUrl: coverUrl || '',
        isPlaying,
        duration: Math.floor((duration || 0) * 1000),
        position: Math.floor((position || 0) * 1000)
      });
    }
  } catch {
    // Graceful fallback for pure web environments
  }
}

/**
 * Updates the native Android Foreground Service & MediaSession with the next track details & playback state.
 */
export async function updateNativeBackgroundAudio(
  title: string,
  artist: string,
  coverUrl?: string,
  isPlaying: boolean = true,
  duration: number = 0,
  position: number = 0
): Promise<void> {
  if (!isNative) return;
  try {
    if (BackgroundAudio) {
      await BackgroundAudio.update({
        title: title || 'Playing Music',
        artist: artist || 'StreamPlay',
        coverUrl: coverUrl || '',
        isPlaying,
        duration: Math.floor((duration || 0) * 1000),
        position: Math.floor((position || 0) * 1000)
      });
    }
  } catch {
    // Graceful fallback
  }
}

/**
 * Stops the native Android Foreground Service and releases locks.
 */
export async function stopNativeBackgroundAudio(): Promise<void> {
  if (!isNative) return;
  try {
    if (BackgroundAudio) {
      await BackgroundAudio.stop();
    }
  } catch {
    // Graceful fallback
  }
}

/**
 * Listens for system media actions from Android System Control Panel, Notification, Lockscreen & Dynamic Island.
 */
export function listenToNativeMediaActions(callbacks: {
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (positionSec: number) => void;
}): void {
  if (!isNative) return;
  try {
    if (BackgroundAudio && typeof BackgroundAudio.addListener === 'function') {
      BackgroundAudio.addListener('mediaAction', (data: { action: string; position?: number }) => {
        if (data.action === 'play') callbacks.onPlay();
        else if (data.action === 'pause') callbacks.onPause();
        else if (data.action === 'next') callbacks.onNext();
        else if (data.action === 'previous') callbacks.onPrevious();
        else if (data.action === 'seek' && typeof data.position === 'number') {
          callbacks.onSeek(data.position / 1000);
        }
      });
    }
  } catch (err) {
    console.warn('[NativeMediaActions]', err);
  }
}
