// StreamPlay Advanced Web Audio DSP Engine
// Synthesizes algorithms from Tuna.js, weq8, and Web-Audio-Mastering for real-time media enhancement.

export type EnhancerPreset =
  | 'balanced'
  | 'bass'
  | 'bass_punch'
  | 'vocal'
  | 'vocal_clarity'
  | 'movie'
  | 'movie_cinema'
  | 'night_mode'
  | 'spatial'
  | 'spatial_3d'
  | 'rock'
  | 'electronic';

export type EnhancerMode = 'music' | 'movie';

export interface EnhancerSettings {
  enabled: boolean;
  preset: EnhancerPreset;
  mode: EnhancerMode;
  bassBoost: number;        // 0 to 100
  trebleBoost: number;      // 0 to 100
  dialogueClarity: number;  // 0 to 100
  virtualSurround: number;  // 0 to 100
  nightMode: boolean;       // on/off dynamic range leveling
  masterVolume: number;     // 0 to 2 (1 = 100%)
  eqGains: number[];        // 10 bands, -12dB to +12dB
}

export const EQ_FREQUENCIES: number[] = [31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export const PRESET_CONFIGS: Record<EnhancerPreset, {
  name: string;
  description: string;
  eq: number[];
  bassBoost: number;
  trebleBoost: number;
  dialogueClarity: number;
  virtualSurround: number;
  nightMode: boolean;
}> = {
  balanced: {
    name: 'Balanced Hi-Fi',
    description: 'Clean, natural sound reproduction with smooth frequency balance.',
    eq: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    bassBoost: 15,
    trebleBoost: 10,
    dialogueClarity: 10,
    virtualSurround: 15,
    nightMode: false,
  },
  bass: {
    name: 'Deep Bass Punch',
    description: 'Rich low-end rumble and punch for modern beats and bass-heavy tracks.',
    eq: [8, 6, 4, 1, 0, -1, 0, 2, 3, 2],
    bassBoost: 80,
    trebleBoost: 20,
    dialogueClarity: 0,
    virtualSurround: 25,
    nightMode: false,
  },
  bass_punch: {
    name: 'Deep Bass Punch',
    description: 'Rich low-end rumble and punch for modern beats, EDM, and hip-hop.',
    eq: [8, 6, 4, 1, 0, -1, 0, 2, 3, 2],
    bassBoost: 80,
    trebleBoost: 20,
    dialogueClarity: 0,
    virtualSurround: 25,
    nightMode: false,
  },
  vocal: {
    name: 'Vocal Clarity',
    description: 'Brings voices forward, boosting dialogue intelligibility in songs and podcasts.',
    eq: [-3, -2, 0, 2, 4, 6, 5, 3, 1, 0],
    bassBoost: 5,
    trebleBoost: 30,
    dialogueClarity: 85,
    virtualSurround: 10,
    nightMode: false,
  },
  vocal_clarity: {
    name: 'Vocal & Dialogue Clarity',
    description: 'Brings voices forward, boosting dialogue intelligibility in songs and podcasts.',
    eq: [-3, -2, 0, 2, 4, 6, 5, 3, 1, 0],
    bassBoost: 5,
    trebleBoost: 30,
    dialogueClarity: 85,
    virtualSurround: 10,
    nightMode: false,
  },
  movie: {
    name: 'Cinematic Movie',
    description: 'Cinema hall presence with intelligible speech, impactful bass, and wide surround.',
    eq: [5, 4, 2, 0, 1, 4, 5, 3, 4, 3],
    bassBoost: 50,
    trebleBoost: 40,
    dialogueClarity: 75,
    virtualSurround: 70,
    nightMode: false,
  },
  movie_cinema: {
    name: 'Cinematic Movie',
    description: 'Cinema hall presence with intelligible speech, impactful bass, and wide surround.',
    eq: [5, 4, 2, 0, 1, 4, 5, 3, 4, 3],
    bassBoost: 50,
    trebleBoost: 40,
    dialogueClarity: 75,
    virtualSurround: 70,
    nightMode: false,
  },
  night_mode: {
    name: 'Night Mode (DRC)',
    description: 'Leveler compressor: lifts quiet dialogue and prevents loud explosions from peaking.',
    eq: [-2, 0, 1, 3, 4, 4, 3, 1, 0, -1],
    bassBoost: 10,
    trebleBoost: 15,
    dialogueClarity: 70,
    virtualSurround: 20,
    nightMode: true,
  },
  spatial: {
    name: '3D Spatial Audio',
    description: 'Expanded panoramic soundstage with binaural Haas delay and room acoustics.',
    eq: [2, 1, 0, 0, 1, 2, 3, 5, 6, 5],
    bassBoost: 35,
    trebleBoost: 45,
    dialogueClarity: 30,
    virtualSurround: 95,
    nightMode: false,
  },
  spatial_3d: {
    name: '3D Spatial Audio',
    description: 'Expanded panoramic soundstage with binaural Haas delay and room acoustics.',
    eq: [2, 1, 0, 0, 1, 2, 3, 5, 6, 5],
    bassBoost: 35,
    trebleBoost: 45,
    dialogueClarity: 30,
    virtualSurround: 95,
    nightMode: false,
  },
  rock: {
    name: 'Rock & Live Stage',
    description: 'Aggressive mids and crunchy upper-treble for energetic instruments.',
    eq: [4, 3, 1, -1, -2, 1, 3, 5, 4, 3],
    bassBoost: 45,
    trebleBoost: 50,
    dialogueClarity: 20,
    virtualSurround: 30,
    nightMode: false,
  },
  electronic: {
    name: 'Electronic & Synth',
    description: 'Deep sub-bass sculpting with razor-sharp highs and immersive spatial width.',
    eq: [7, 6, 3, 0, -1, 1, 2, 4, 6, 7],
    bassBoost: 75,
    trebleBoost: 65,
    dialogueClarity: 15,
    virtualSurround: 60,
    nightMode: false,
  },
};

export class AudioEnhancerEngine {
  private ctx: AudioContext | null = null;
  private sourceMap = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();
  private currentElement: HTMLMediaElement | null = null;
  private listeners = new Set<() => void>();

  // Nodes graph
  private nodes: {
    inputGain: GainNode | null;
    bassFilter: BiquadFilterNode | null;
    trebleFilter: BiquadFilterNode | null;
    eqFilters: BiquadFilterNode[];
    // Mid/Side Dialogue Isolation
    splitter: ChannelSplitterNode | null;
    midGain: GainNode | null;
    midDialogueFilter: BiquadFilterNode | null;
    midCompressor: DynamicsCompressorNode | null;
    sideGain: GainNode | null;
    merger: ChannelMergerNode | null;
    // 3D Spatializer (Haas delay + Reverb)
    spatialSplitter: ChannelSplitterNode | null;
    haasDelay: DelayNode | null;
    spatialMerger: ChannelMergerNode | null;
    convolver: ConvolverNode | null;
    convolverGain: GainNode | null;
    dryGain: GainNode | null;
    spatialSumGain: GainNode | null;
    // Night Mode / Master DRC
    nightCompressor: DynamicsCompressorNode | null;
    outputGain: GainNode | null;
    analyser: AnalyserNode | null;
  } = {
    inputGain: null,
    bassFilter: null,
    trebleFilter: null,
    eqFilters: [],
    splitter: null,
    midGain: null,
    midDialogueFilter: null,
    midCompressor: null,
    sideGain: null,
    merger: null,
    spatialSplitter: null,
    haasDelay: null,
    spatialMerger: null,
    convolver: null,
    convolverGain: null,
    dryGain: null,
    spatialSumGain: null,
    nightCompressor: null,
    outputGain: null,
    analyser: null,
  };

  private settings: EnhancerSettings = {
    enabled: true,
    preset: 'balanced',
    mode: 'music',
    bassBoost: 15,
    trebleBoost: 10,
    dialogueClarity: 10,
    virtualSurround: 15,
    nightMode: false,
    masterVolume: 1,
    eqGains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };

  constructor() {
    this.loadPersistedSettings();
  }

  // --- Persistence ---
  private loadPersistedSettings(): void {
    try {
      const en = localStorage.getItem('streamplay_setting_audio_enhancer');
      if (en !== null) this.settings.enabled = en === 'true';

      const savedPreset = localStorage.getItem('streamplay_setting_eq_preset');
      if (savedPreset && Object.prototype.hasOwnProperty.call(PRESET_CONFIGS, savedPreset)) {
        this.settings.preset = savedPreset as EnhancerPreset;
        const config = PRESET_CONFIGS[this.settings.preset];
        this.settings.bassBoost = config.bassBoost;
        this.settings.trebleBoost = config.trebleBoost;
        this.settings.dialogueClarity = config.dialogueClarity;
        this.settings.virtualSurround = config.virtualSurround;
        this.settings.nightMode = config.nightMode;
        this.settings.eqGains = [...config.eq];
      }

      const customGains = localStorage.getItem('streamplay_setting_custom_eq');
      if (customGains) {
        try {
          const parsed = JSON.parse(customGains);
          if (Array.isArray(parsed) && parsed.length === 10) {
            this.settings.eqGains = parsed;
          }
        } catch {}
      }
    } catch {
      /* ignore storage access error */
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('streamplay_setting_audio_enhancer', String(this.settings.enabled));
      localStorage.setItem('streamplay_setting_eq_preset', this.settings.preset);
      localStorage.setItem('streamplay_setting_custom_eq', JSON.stringify(this.settings.eqGains));
    } catch {
      /* ignore */
    }
  }

  // --- Public Getters & Setters ---
  getSettings(): EnhancerSettings {
    return { ...this.settings, eqGains: [...this.settings.eqGains] };
  }

  isEnabled(): boolean {
    return this.settings.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.settings.enabled = enabled;
    this.saveSettings();
    this.applyAllParams();
    this.notify();

    if (!enabled) {
      if (this.currentElement) {
        const source = this.sourceMap.get(this.currentElement);
        try { source?.disconnect(); } catch {}
        try { if (source && this.ctx) source.connect(this.ctx.destination); } catch {}
      }
      return;
    }

    this.warmUp();
    if (this.currentElement) {
      const source = this.sourceMap.get(this.currentElement);
      try { source?.disconnect(); } catch {}
      try {
        if (source && this.nodes.inputGain) {
          source.connect(this.nodes.inputGain);
        }
      } catch {}
    }
  }

  getPreset(): EnhancerPreset {
    return this.settings.preset;
  }

  getCurrentPreset(): EnhancerPreset {
    return this.settings.preset;
  }

  setPreset(preset: EnhancerPreset | string, mode?: EnhancerMode): void {
    if (Object.prototype.hasOwnProperty.call(PRESET_CONFIGS, preset)) {
      this.settings.preset = preset as EnhancerPreset;
      const config = PRESET_CONFIGS[this.settings.preset];
      this.settings.bassBoost = config.bassBoost;
      this.settings.trebleBoost = config.trebleBoost;
      this.settings.dialogueClarity = config.dialogueClarity;
      this.settings.virtualSurround = config.virtualSurround;
      this.settings.nightMode = config.nightMode;
      this.settings.eqGains = [...config.eq];
    }
    if (mode) this.settings.mode = mode;
    this.saveSettings();
    this.applyAllParams();
    this.notify();
  }

  getMode(): EnhancerMode {
    return this.settings.mode;
  }

  setMode(mode: EnhancerMode): void {
    if (this.settings.mode === mode) return;
    this.settings.mode = mode;
    if (mode === 'movie') {
      this.setPreset('movie_cinema', 'movie');
    } else {
      this.setPreset('balanced', 'music');
    }
    this.notify();
  }

  updateSettings(partial: Partial<EnhancerSettings>): void {
    Object.assign(this.settings, partial);
    this.saveSettings();
    this.applyAllParams();
    this.notify();
  }

  setEQBand(bandIndex: number, gainDb: number): void {
    if (bandIndex >= 0 && bandIndex < 10) {
      this.settings.eqGains[bandIndex] = Math.max(-12, Math.min(12, gainDb));
      const filter = this.nodes.eqFilters[bandIndex];
      if (filter && this.ctx) {
        filter.gain.setTargetAtTime(this.settings.eqGains[bandIndex], this.ctx.currentTime, 0.05);
      }
      this.saveSettings();
      this.notify();
    }
  }

  resetEQ(): void {
    this.settings.eqGains = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.nodes.eqFilters.forEach(filter => {
      if (filter && this.ctx) {
        filter.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      }
    });
    this.saveSettings();
    this.notify();
  }

  setVolume(vol: number): void {
    this.settings.masterVolume = Math.max(0, Math.min(2, vol));
    const { outputGain } = this.nodes;
    if (outputGain && this.ctx) {
      outputGain.gain.setTargetAtTime(this.settings.masterVolume, this.ctx.currentTime, 0.02);
    }
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(fn => {
      try { fn(); } catch {}
    });
  }

  // --- Web Audio Graph Construction ---
  ensureContext(): AudioContext | null {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx({ latencyHint: 'interactive' });
      this.buildDSPGraph();
      return this.ctx;
    } catch (err) {
      console.warn('[AudioEnhancer] failed to initialize AudioContext:', err);
      return null;
    }
  }

  private buildDSPGraph(): void {
    const ctx = this.ctx;
    if (!ctx) return;

    try {
      // 1. Input Gain
      const inputGain = ctx.createGain();
      inputGain.gain.value = 1;

      // 2. Bass Low-Shelf Filter (80Hz, Q: 0.7)
      const bassFilter = ctx.createBiquadFilter();
      bassFilter.type = 'lowshelf';
      bassFilter.frequency.value = 80;
      bassFilter.gain.value = 0;

      // 3. Treble High-Shelf Filter (8000Hz, Q: 0.7)
      const trebleFilter = ctx.createBiquadFilter();
      trebleFilter.type = 'highshelf';
      trebleFilter.frequency.value = 8000;
      trebleFilter.gain.value = 0;

      inputGain.connect(bassFilter);
      bassFilter.connect(trebleFilter);

      // 4. 10-Band Graphic Equalizer
      const eqFilters = EQ_FREQUENCIES.map((freq, idx) => {
        const f = ctx.createBiquadFilter();
        if (idx === 0) {
          f.type = 'lowshelf';
        } else if (idx === EQ_FREQUENCIES.length - 1) {
          f.type = 'highshelf';
        } else {
          f.type = 'peaking';
          f.Q.value = 1.4;
        }
        f.frequency.value = freq;
        f.gain.value = this.settings.eqGains[idx] || 0;
        return f;
      });

      trebleFilter.connect(eqFilters[0]);
      for (let i = 0; i < eqFilters.length - 1; i++) {
        eqFilters[i].connect(eqFilters[i + 1]);
      }
      const lastEqNode = eqFilters[eqFilters.length - 1];

      // 5. Dialogue Clarity / Mid-Side Channel Processor (Zero-CPU Matrix)
      const splitter = ctx.createChannelSplitter(2);
      const merger = ctx.createChannelMerger(2);

      // Mid = 0.5 * (L + R)
      const midGain = ctx.createGain();
      midGain.gain.value = 0.5;

      // Side = 0.5 * (L - R)
      const sidePosGain = ctx.createGain();
      sidePosGain.gain.value = 0.5;
      const sideNegGain = ctx.createGain();
      sideNegGain.gain.value = -0.5;
      const sideSum = ctx.createGain();
      const sideInv = ctx.createGain();
      sideInv.gain.value = -1;

      const midDialogueFilter = ctx.createBiquadFilter();
      midDialogueFilter.type = 'peaking';
      midDialogueFilter.frequency.value = 2400; // Human vocal formant core
      midDialogueFilter.Q.value = 1.6;
      midDialogueFilter.gain.value = 0;

      const midCompressor = ctx.createDynamicsCompressor();
      midCompressor.threshold.value = -20;
      midCompressor.knee.value = 12;
      midCompressor.ratio.value = 3;
      midCompressor.attack.value = 0.005;
      midCompressor.release.value = 0.15;

      lastEqNode.connect(splitter);
      splitter.connect(midGain, 0);
      splitter.connect(midGain, 1);
      midGain.connect(midDialogueFilter);
      midDialogueFilter.connect(midCompressor);

      splitter.connect(sidePosGain, 0);
      splitter.connect(sideNegGain, 1);
      sidePosGain.connect(sideSum);
      sideNegGain.connect(sideSum);

      // Decode back to Stereo: L = Mid + Side, R = Mid - Side
      midCompressor.connect(merger, 0, 0);
      sideSum.connect(merger, 0, 0);

      midCompressor.connect(merger, 0, 1);
      sideSum.connect(sideInv);
      sideInv.connect(merger, 0, 1);

      // 6. 3D Spatial Audio & Surround Engine (Ultra-Lightweight Mobile Architecture)
      const spatialSplitter = ctx.createChannelSplitter(2);
      const spatialMerger = ctx.createChannelMerger(2);
      const haasDelay = ctx.createDelay(0.04);
      haasDelay.delayTime.value = 0.012;

      merger.connect(spatialSplitter);
      spatialSplitter.connect(spatialMerger, 0, 0);
      spatialSplitter.connect(haasDelay, 1);
      haasDelay.connect(spatialMerger, 0, 1);

      // Early-reflection room convolver: 0.16s (9,000 samples vs 115,000 samples)
      // Cuts continuous convolution CPU consumption by over 90% while keeping cinema acoustics
      const convolver = ctx.createConvolver();
      convolver.buffer = this.generateImpulseResponse(ctx, 0.16, 3.5);
      const convolverGain = ctx.createGain();
      convolverGain.gain.value = 0.12;
      const dryGain = ctx.createGain();
      dryGain.gain.value = 0.88;
      const spatialSumGain = ctx.createGain();

      spatialMerger.connect(convolver);
      convolver.connect(convolverGain);
      spatialMerger.connect(dryGain);
      convolverGain.connect(spatialSumGain);
      dryGain.connect(spatialSumGain);

      // 7. Night Mode Dynamic Range Compressor (DRC)
      const nightCompressor = ctx.createDynamicsCompressor();
      nightCompressor.threshold.value = -24;
      nightCompressor.knee.value = 24;
      nightCompressor.ratio.value = 4;
      nightCompressor.attack.value = 0.003;
      nightCompressor.release.value = 0.25;

      spatialSumGain.connect(nightCompressor);

      // 8. Master Output Gain & Analyser
      const outputGain = ctx.createGain();
      outputGain.gain.value = this.settings.masterVolume;
      nightCompressor.connect(outputGain);

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      outputGain.connect(analyser);
      analyser.connect(ctx.destination);

      this.nodes = {
        inputGain,
        bassFilter,
        trebleFilter,
        eqFilters,
        splitter,
        midGain,
        midDialogueFilter,
        midCompressor,
        sideGain: sideSum,
        merger,
        spatialSplitter,
        haasDelay,
        spatialMerger,
        convolver,
        convolverGain,
        dryGain,
        spatialSumGain,
        nightCompressor,
        outputGain,
        analyser,
      };

      this.applyAllParams();
    } catch (err) {
      console.warn('[AudioEnhancer] buildDSPGraph error:', err);
    }
  }

  // Mobile-optimized short impulse response: produces cinema hall reflections with near-zero CPU
  private generateImpulseResponse(ctx: AudioContext, duration = 0.16, decay = 3.5): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = Math.max(1024, Math.floor(sampleRate * duration));
    const impulse = ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = length - i;
      const env = Math.pow(n / length, decay);
      left[i] = (Math.random() * 2 - 1) * env;
      right[i] = (Math.random() * 2 - 1) * env;
    }
    return impulse;
  }

  // --- Parameter Application ---
  private applyAllParams(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    const {
      bassFilter,
      trebleFilter,
      eqFilters,
      midDialogueFilter,
      midGain,
      sideGain,
      haasDelay,
      convolverGain,
      dryGain,
      nightCompressor,
      outputGain,
    } = this.nodes;

    try {
      if (bassFilter) {
        const bassDb = (this.settings.bassBoost / 100) * 14;
        bassFilter.gain.setTargetAtTime(bassDb, now, 0.05);
      }

      if (trebleFilter) {
        const trebleDb = (this.settings.trebleBoost / 100) * 10;
        trebleFilter.gain.setTargetAtTime(trebleDb, now, 0.05);
      }

      eqFilters.forEach((filter, idx) => {
        if (filter) {
          const gain = this.settings.eqGains[idx] || 0;
          filter.gain.setTargetAtTime(gain, now, 0.05);
        }
      });

      if (midDialogueFilter && midGain && sideGain) {
        const vocalRatio = this.settings.dialogueClarity / 100;
        const dialogueDb = vocalRatio * 10;
        midDialogueFilter.gain.setTargetAtTime(dialogueDb, now, 0.05);
        midGain.gain.setTargetAtTime(0.5 + vocalRatio * 0.35, now, 0.05);
        sideGain.gain.setTargetAtTime(0.5 - vocalRatio * 0.15, now, 0.05);
      }

      if (haasDelay && convolverGain && dryGain) {
        const surroundRatio = this.settings.virtualSurround / 100;
        haasDelay.delayTime.setTargetAtTime(0.005 + surroundRatio * 0.015, now, 0.05);
        const wet = surroundRatio * 0.45;
        convolverGain.gain.setTargetAtTime(wet, now, 0.05);
        dryGain.gain.setTargetAtTime(1 - wet * 0.5, now, 0.05);
      }

      if (nightCompressor) {
        if (this.settings.nightMode) {
          nightCompressor.threshold.setTargetAtTime(-32, now, 0.05);
          nightCompressor.knee.setTargetAtTime(36, now, 0.05);
          nightCompressor.ratio.setTargetAtTime(6, now, 0.05);
          nightCompressor.attack.setTargetAtTime(0.002, now, 0.05);
          nightCompressor.release.setTargetAtTime(0.2, now, 0.05);
        } else if (this.settings.mode === 'movie') {
          nightCompressor.threshold.setTargetAtTime(-20, now, 0.05);
          nightCompressor.knee.setTargetAtTime(24, now, 0.05);
          nightCompressor.ratio.setTargetAtTime(3.5, now, 0.05);
          nightCompressor.attack.setTargetAtTime(0.005, now, 0.05);
          nightCompressor.release.setTargetAtTime(0.3, now, 0.05);
        } else {
          nightCompressor.threshold.setTargetAtTime(-24, now, 0.05);
          nightCompressor.knee.setTargetAtTime(30, now, 0.05);
          nightCompressor.ratio.setTargetAtTime(2.5, now, 0.05);
          nightCompressor.attack.setTargetAtTime(0.003, now, 0.05);
          nightCompressor.release.setTargetAtTime(0.25, now, 0.05);
        }
      }

      if (outputGain) {
        outputGain.gain.setTargetAtTime(this.settings.masterVolume, now, 0.05);
      }
    } catch (err) {
      console.warn('[AudioEnhancer] applyAllParams error:', err);
    }
  }

  // --- Analyser Data for UI Visualizer ---
  getFrequencyData(): Uint8Array | null {
    if (!this.nodes.analyser) return null;
    const data = new Uint8Array(this.nodes.analyser.frequencyBinCount);
    this.nodes.analyser.getByteFrequencyData(data);
    return data;
  }

  // --- HTMLMediaElement Attachment & Lifecycle ---
  attach(element: HTMLMediaElement | null, mode: EnhancerMode = 'music'): void {
    if (!element) return;
    this.setMode(mode);

    const ctx = this.ensureContext();
    if (!ctx || !this.nodes.inputGain) return;

    if (this.currentElement === element) {
      if (this.settings.enabled) {
        this.applyAllParams();
      } else {
        const source = this.sourceMap.get(element);
        try { source?.disconnect(); } catch {}
        try { if (source && this.ctx) source.connect(this.ctx.destination); } catch {}
      }
      return;
    }

    this.detach();

    if (!element.crossOrigin) {
      try {
        element.crossOrigin = 'anonymous';
      } catch {}
    }

    let source = this.sourceMap.get(element);
    if (!source) {
      try {
        source = ctx.createMediaElementSource(element);
        this.sourceMap.set(element, source);
      } catch (err) {
        console.warn('[AudioEnhancer] createMediaElementSource fallback:', err);
        return;
      }
    }

    try {
      try { source.disconnect(); } catch {}
      if (this.settings.enabled && this.nodes.inputGain) {
        source.connect(this.nodes.inputGain);
      } else if (this.ctx) {
        source.connect(this.ctx.destination);
      }
    } catch (err) {
      console.warn('[AudioEnhancer] source.connect error:', err);
      return;
    }

    this.currentElement = element;
    if (this.settings.enabled) this.applyAllParams();
  }

  detach(): void {
    if (this.currentElement) {
      const source = this.sourceMap.get(this.currentElement);
      try { source?.disconnect(); } catch {}
      this.currentElement = null;
    }
  }

  prime(element: HTMLMediaElement | null | undefined, mode: EnhancerMode = 'music'): void {
    void mode;
    void element;
    this.warmUp();
  }

  preEnhance(element?: HTMLMediaElement | null, mode: EnhancerMode = 'music'): void {
    this.prime(element ?? null, mode);
  }

  preEnhanceNextTrack(target?: HTMLMediaElement | string | null, mode: EnhancerMode = 'music'): void {
    if (target instanceof HTMLMediaElement) {
      this.prime(target, mode);
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
