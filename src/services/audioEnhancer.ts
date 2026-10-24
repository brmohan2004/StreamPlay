export type EnhancerPreset = 'balanced' | 'bass' | 'vocal' | 'spatial' | 'movie';
export type EnhancerMode = 'music' | 'movie';

const PRESET_GAINS: Record<EnhancerPreset, number[]> = {
  balanced: [2, 1, 0, 1, 2],
  bass: [8, 5, 0, -1, -2],
  vocal: [-2, 0, 6, 4, 1],
  spatial: [3, 1, 2, 5, 6],
  movie: [4, 2, 1, 3, 4],
};

const BAND_FREQS = [60, 250, 1000, 4000, 12000];

class AudioEnhancerEngine {
  private ctx: AudioContext | null = null;
  private sourceMap = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();
  private currentElement: HTMLMediaElement | null = null;
  private nodes: {
    inputGain: GainNode | null;
    filters: BiquadFilterNode[];
    compressor: DynamicsCompressorNode | null;
    outputGain: GainNode | null;
    analyser: AnalyserNode | null;
  } = { inputGain: null, filters: [], compressor: null, outputGain: null, analyser: null };
  private preset: EnhancerPreset = 'balanced';
  private mode: EnhancerMode = 'music';
  private enabled: boolean = true;

  constructor() {
    try {
      const stored = localStorage.getItem('streamplay_setting_eq_preset');
      if (stored && Object.prototype.hasOwnProperty.call(PRESET_GAINS, stored)) {
        this.preset = stored as EnhancerPreset;
      }
      const en = localStorage.getItem('streamplay_setting_audio_enhancer');
      if (en === 'false') this.enabled = false;
    } catch {
      /* ignore */
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    try {
      localStorage.setItem('streamplay_setting_audio_enhancer', String(enabled));
    } catch {
      /* ignore */
    }
    if (!enabled) {
      // Bypass the graph instead of disconnecting the source entirely, otherwise
      // media elements using createMediaElementSource would become silent.
      if (this.currentElement) {
        const source = this.sourceMap.get(this.currentElement);
        try { source?.disconnect(); } catch { /* ignore */ }
        try { if (source && this.ctx) source.connect(this.ctx.destination); } catch { /* ignore */ }
      }
      return;
    }
    this.warmUp();
    if (this.currentElement) {
      const source = this.sourceMap.get(this.currentElement);
      try { source?.disconnect(); } catch { /* ignore */ }
      try { if (source && this.nodes.inputGain) source.connect(this.nodes.inputGain); } catch { /* ignore */ }
      this.applyPreset(this.preset, this.mode);
    }
  }

  getPreset(): EnhancerPreset {
    return this.preset;
  }

  setPreset(preset: EnhancerPreset | string, mode?: EnhancerMode): void {
    if (Object.prototype.hasOwnProperty.call(PRESET_GAINS, preset)) {
      this.preset = preset as EnhancerPreset;
    }
    if (mode) this.mode = mode;
    try {
      localStorage.setItem('streamplay_setting_eq_preset', this.preset);
    } catch {
      /* ignore */
    }
    this.applyPreset(this.preset, this.mode);
  }

  getMode(): EnhancerMode {
    return this.mode;
  }

  setMode(mode: EnhancerMode): void {
    this.mode = mode;
  }

  ensureContext(): AudioContext | null {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return this.ctx;
    }
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.buildGraph();
      return this.ctx;
    } catch (err) {
      console.warn('[AudioEnhancer] failed to create AudioContext:', err);
      return null;
    }
  }

  private buildGraph(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    try {
      const inputGain = ctx.createGain();
      inputGain.gain.value = 1;
      const filters = BAND_FREQS.map((freq, idx) => {
        const f = ctx.createBiquadFilter();
        f.type = idx === 0 ? 'lowshelf' : idx === BAND_FREQS.length - 1 ? 'highshelf' : 'peaking';
        f.frequency.value = freq;
        f.Q.value = 1;
        f.gain.value = 0;
        return f;
      });
      inputGain.connect(filters[0]);
      for (let i = 0; i < filters.length - 1; i++) filters[i].connect(filters[i + 1]);
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 30;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;
      filters[filters.length - 1].connect(compressor);
      const outputGain = ctx.createGain();
      outputGain.gain.value = 1;
      compressor.connect(outputGain);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      outputGain.connect(analyser);
      analyser.connect(ctx.destination);
      this.nodes = { inputGain, filters, compressor, outputGain, analyser };
      this.applyPreset(this.preset);
    } catch (err) {
      console.warn('[AudioEnhancer] buildGraph failed:', err);
    }
  }

  applyPreset(preset: EnhancerPreset, mode?: EnhancerMode): void {
    const gains = PRESET_GAINS[preset] || PRESET_GAINS.balanced;
    if (mode) this.mode = mode;
    this.nodes.filters.forEach((filter, idx) => {
      if (filter && gains[idx] !== undefined) {
        filter.gain.value = gains[idx];
      }
    });
    const { compressor } = this.nodes;
    if (compressor) {
      try {
        if (this.mode === 'movie') {
          compressor.threshold.value = -18;
          compressor.knee.value = 24;
          compressor.ratio.value = 3;
          compressor.attack.value = 0.005;
          compressor.release.value = 0.3;
        } else {
          compressor.threshold.value = -24;
          compressor.knee.value = 30;
          compressor.ratio.value = 4;
          compressor.attack.value = 0.003;
          compressor.release.value = 0.25;
        }
      } catch {
        /* ignore */
      }
    }
  }

  attach(element: HTMLMediaElement | null, mode: EnhancerMode = 'music'): void {
    if (!element || !this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.nodes.inputGain) return;

    if (this.currentElement === element) {
      this.mode = mode;
      if (this.enabled) this.applyPreset(this.preset, mode);
      else {
        const source = this.sourceMap.get(element);
        try { source?.disconnect(); } catch { /* ignore */ }
        try { if (source && this.ctx) source.connect(this.ctx.destination); } catch { /* ignore */ }
      }
      return;
    }

    this.detach();

    if (!element.crossOrigin) {
      try {
        element.crossOrigin = 'anonymous';
      } catch {
        /* ignore */
      }
    }

    let source = this.sourceMap.get(element);
    if (!source) {
      try {
        source = ctx.createMediaElementSource(element);
        this.sourceMap.set(element, source);
      } catch (err) {
        console.warn('[AudioEnhancer] createMediaElementSource failed:', err);
        return;
      }
    }

    try {
      try {
        source.disconnect();
      } catch {
        /* ignore */
      }
      if (this.enabled && this.nodes.inputGain) {
        source.connect(this.nodes.inputGain);
      } else if (this.ctx) {
        source.connect(this.ctx.destination);
      }
    } catch (err) {
      console.warn('[AudioEnhancer] source.connect failed:', err);
      return;
    }

    this.currentElement = element;
    this.mode = mode;
    if (this.enabled) this.applyPreset(this.preset, mode);
  }

  detach(): void {
    if (this.currentElement) {
      const source = this.sourceMap.get(this.currentElement);
      try {
        source?.disconnect();
      } catch {
        /* ignore */
      }
      this.currentElement = null;
    }
  }

  setVolume(vol: number): void {
    const { outputGain } = this.nodes;
    if (outputGain) {
      try {
        outputGain.gain.value = Math.max(0, Math.min(2, vol));
      } catch {
        /* ignore */
      }
    }
  }

  getCurrentPreset(): EnhancerPreset {
    return this.preset;
  }
  prime(element: HTMLMediaElement | null | undefined, mode: EnhancerMode = 'music'): void {
    void mode;
    if (!element) {
      this.warmUp();
      return;
    }
    if (element === this.currentElement) {
      this.warmUp();
      return;
    }
    if (!this.enabled) {
      this.warmUp();
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (!element.crossOrigin) {
      try {
        element.crossOrigin = 'anonymous';
      } catch {
        /* ignore */
      }
    }

    let source = this.sourceMap.get(element);
    if (!source) {
      try {
        source = ctx.createMediaElementSource(element);
        this.sourceMap.set(element, source);
      } catch (err) {
        console.warn('[AudioEnhancer] createMediaElementSource failed:', err);
        return;
      }
    }

    try {
      try {
        source.disconnect();
      } catch {
        /* ignore */
      }
      if (this.nodes.inputGain) {
        source.connect(this.nodes.inputGain);
      } else {
        source.connect(ctx.destination);
      }
    } catch (err) {
      console.warn('[AudioEnhancer] prime connect failed:', err);
      return;
    }

    // Do not change the active element, mode, preset, or filter state. The next
    // track is prepared in the background so its source node exists and is
    // connected before playback starts.
  }

  preEnhance(element?: HTMLMediaElement | null, mode: EnhancerMode = 'music'): void {
    this.prime(element ?? null, mode);
  }

  preEnhanceNextTrack(target?: HTMLMediaElement | string | null, mode: EnhancerMode = 'music'): void {
    if (target instanceof HTMLMediaElement) {
      this.prime(target, mode);
      return;
    }
    if (typeof target === 'string' && target) {
      try {
        const audio = new Audio();
        audio.preload = 'auto';
        audio.volume = 0;
        audio.muted = true;
        try {
          audio.crossOrigin = 'anonymous';
        } catch {
          /* ignore */
        }
        audio.src = target;
        try {
          audio.load();
        } catch {
          /* ignore */
        }
        this.prime(audio, mode);
      } catch (err) {
        console.warn('[AudioEnhancer] preEnhanceNextTrack failed:', err);
      }
      return;
    }
    this.warmUp();
  }

  prepareNext(element?: HTMLMediaElement | null, mode: EnhancerMode = 'music'): void {
    this.prime(element ?? null, mode);
  }

  prepareNextTrack(target?: HTMLMediaElement | string | null, mode: EnhancerMode = 'music'): void {
    this.preEnhanceNextTrack(target, mode);
  }

  prewarm(element?: HTMLMediaElement | null, mode: EnhancerMode = 'music'): void {
    this.prime(element ?? null, mode);
  }

  warmUp(): void {
    this.ensureContext();
  }
}
export const audioEnhancer = new AudioEnhancerEngine();
export default audioEnhancer;
