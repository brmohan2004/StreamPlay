import { registerPlugin } from '@capacitor/core';

interface BackgroundAudioPlugin {
  start(options: { title: string; artist: string }): Promise<{ success: boolean }>;
  update(options: { title: string; artist: string }): Promise<{ success: boolean }>;
  stop(): Promise<{ success: boolean }>;
}

const BackgroundAudio = registerPlugin<BackgroundAudioPlugin>('BackgroundAudio');

let silentAudioCtx: AudioContext | null = null;

/**
 * Keeps the browser's native audio pipeline active across track switches.
 * When a song ends and the next begins, an active AudioContext prevents the OS
 * audio session from dropping or entering an idle state when the screen is turned off.
 */
export function enableAudioPipelineKeepAlive(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!silentAudioCtx) {
      silentAudioCtx = new AudioCtx();
      const osc = silentAudioCtx.createOscillator();
      const gain = silentAudioCtx.createGain();
      // Near-zero gain: mathematically inaudible, but keeps the OS hardware DAC active
      gain.gain.value = 0.00001;
      osc.connect(gain);
      gain.connect(silentAudioCtx.destination);
      osc.start();
    }

    if (silentAudioCtx.state === 'suspended') {
      silentAudioCtx.resume().catch(() => {});
    }
  } catch (err) {
    console.warn('[AudioPipelineKeepAlive]', err);
  }
}

/**
 * Starts the native Android Foreground Service with a CPU WakeLock and WifiLock.
 * Ensures infinite background audio playback when the app is minimized and the screen is turned off.
 */
export async function startNativeBackgroundAudio(title: string, artist: string): Promise<void> {
  enableAudioPipelineKeepAlive();
  try {
    if (BackgroundAudio) {
      await BackgroundAudio.start({
        title: title || 'Playing Music',
        artist: artist || 'StreamPlay'
      });
    }
  } catch {
    // Graceful fallback for pure web environments
  }
}

/**
 * Updates the native Android Foreground Service with the next track details.
 */
export async function updateNativeBackgroundAudio(title: string, artist: string): Promise<void> {
  try {
    if (BackgroundAudio) {
      await BackgroundAudio.update({
        title: title || 'Playing Music',
        artist: artist || 'StreamPlay'
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
  try {
    if (BackgroundAudio) {
      await BackgroundAudio.stop();
    }
  } catch {
    // Graceful fallback
  }
}
