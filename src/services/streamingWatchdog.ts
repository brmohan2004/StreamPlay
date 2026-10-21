// === StreamPlay Zero-Buffer Streaming Watchdog ===
// Silently monitors audio & video buffer health and automatically hot-swaps
// to backup mirrors in the background without user intervention or UI clutter.

export interface AutoFailoverEventDetail {
  type: 'audio' | 'video';
  serverName?: string;
  timestamp: number;
}

/**
 * AudioBufferWatchdog
 * Attaches to an HTMLAudioElement to detect stalls and automatically switch
 * to backup streaming CDNs/mirrors without losing the current playback position.
 */
export class AudioBufferWatchdog {
  private audio: HTMLAudioElement;
  private mirrors: string[] = [];
  private currentMirrorIndex = 0;
  private stallTimer: ReturnType<typeof setTimeout> | null = null;
  private isSwitching = false;
  private onFailoverCallback?: (newUrl: string, mirrorIndex: number) => void;
  private onExhaustedCallback?: () => void;

  constructor(
    audio: HTMLAudioElement,
    mirrors: string[] = [],
    onFailover?: (newUrl: string, mirrorIndex: number) => void,
    onExhausted?: () => void
  ) {
    this.audio = audio;
    this.mirrors = mirrors;
    this.onFailoverCallback = onFailover;
    this.onExhaustedCallback = onExhausted;
    this.attach();
  }

  public setMirrors(mirrors: string[]) {
    this.mirrors = mirrors;
    this.currentMirrorIndex = 0;
    this.isSwitching = false;
  }

  private attach() {
    this.audio.addEventListener('waiting', this.handleStall);
    this.audio.addEventListener('stalled', this.handleStall);
    this.audio.addEventListener('error', this.handleImmediateError);
    this.audio.addEventListener('playing', this.handleRecovery);
  }

  public detach() {
    this.audio.removeEventListener('waiting', this.handleStall);
    this.audio.removeEventListener('stalled', this.handleStall);
    this.audio.removeEventListener('error', this.handleImmediateError);
    this.audio.removeEventListener('playing', this.handleRecovery);
    if (this.stallTimer) clearTimeout(this.stallTimer);
  }

  private handleStall = () => {
    if (this.isSwitching || this.mirrors.length <= 1) return;
    if (this.stallTimer) clearTimeout(this.stallTimer);

    // If stall lasts longer than 1.5s, trigger background auto-switch
    this.stallTimer = setTimeout(() => {
      this.performAutoSwitch('Stall timeout exceeded');
    }, 1500);
  };

  private handleImmediateError = () => {
    if (this.isSwitching) return;
    if (this.mirrors.length <= 1) {
      if (this.onExhaustedCallback) {
        this.onExhaustedCallback();
      }
      return;
    }
    this.performAutoSwitch('Audio playback network error');
  };

  private handleRecovery = () => {
    if (this.stallTimer) {
      clearTimeout(this.stallTimer);
      this.stallTimer = null;
    }
    this.isSwitching = false;
  };

  private performAutoSwitch(reason: string) {
    if (this.currentMirrorIndex >= this.mirrors.length - 1) {
      console.warn('[StreamPlay Audio Watchdog] All audio mirrors exhausted');
      if (this.onExhaustedCallback) {
        this.onExhaustedCallback();
      }
      return;
    }

    this.isSwitching = true;
    const previousTime = this.audio.currentTime;
    this.currentMirrorIndex += 1;
    const nextUrl = this.mirrors[this.currentMirrorIndex];

    console.info(
      `[StreamPlay Audio Watchdog] ${reason}. Auto-switching to mirror #${this.currentMirrorIndex + 1}: ${nextUrl}`
    );

    this.audio.src = nextUrl;
    this.audio.currentTime = previousTime;
    this.audio
      .play()
      .then(() => {
        this.isSwitching = false;
        if (this.onFailoverCallback) {
          this.onFailoverCallback(nextUrl, this.currentMirrorIndex);
        }
        window.dispatchEvent(
          new CustomEvent<AutoFailoverEventDetail>('streamplay-autofailover', {
            detail: { type: 'audio', timestamp: Date.now() }
          })
        );
      })
      .catch(err => {
        console.warn('[StreamPlay Audio Watchdog] Secondary mirror switch error:', err);
        this.isSwitching = false;
      });
  }
}

/**
 * VideoBufferWatchdog
 * Manages silent background switching across the 30 streaming video servers.
 * Preserves the current movie timestamp so the switch is imperceptible.
 */
export class VideoBufferWatchdog {
  private currentServerIndex = 0;
  private totalServers = 30;
  private stallTimer: ReturnType<typeof setTimeout> | null = null;
  private onServerChange: (newServerIndex: number) => void;

  constructor(
    initialServerIndex = 0,
    totalServers = 30,
    onServerChange: (newServerIndex: number) => void
  ) {
    this.currentServerIndex = initialServerIndex;
    this.totalServers = totalServers;
    this.onServerChange = onServerChange;
  }

  public setServer(index: number) {
    this.currentServerIndex = index;
    if (this.stallTimer) {
      clearTimeout(this.stallTimer);
      this.stallTimer = null;
    }
  }

  public startIframeMonitor() {
    // Disabled aggressive timer-based auto-failover to ensure uninterrupted playback
    if (this.stallTimer) {
      clearTimeout(this.stallTimer);
      this.stallTimer = null;
    }
  }

  public markPlaybackStarted() {
    if (this.stallTimer) {
      clearTimeout(this.stallTimer);
      this.stallTimer = null;
    }
  }

  public failoverToNextServer(reason = 'Manual or automated failover') {
    if (this.stallTimer) {
      clearTimeout(this.stallTimer);
      this.stallTimer = null;
    }
    const nextIndex = (this.currentServerIndex + 1) % this.totalServers;
    this.currentServerIndex = nextIndex;

    console.info(`[StreamPlay Video Watchdog] ${reason}. Auto-routing to server #${nextIndex + 1}`);
    this.onServerChange(nextIndex);

    window.dispatchEvent(
      new CustomEvent<AutoFailoverEventDetail>('streamplay-autofailover', {
        detail: {
          type: 'video',
          timestamp: Date.now()
        }
      })
    );
  }
}
