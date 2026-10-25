import './AudioEnhancerModal.css';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
  Sliders,
  Sparkles,
  Power,
  X,
  Tv,
  Music2,
  RotateCcw,
  Headphones,
  Mic,
  Moon,
  Zap,
} from 'lucide-react';
import {
  audioEnhancer,
  PRESET_CONFIGS,
  EQ_FREQUENCIES,
  EnhancerPreset,
  EnhancerMode,
  EnhancerSettings,
} from '../services/audioEnhancer';
import { useMedia } from '../context/MediaContext';

export const AudioEnhancerModal: React.FC = () => {
  const { isAudioEnhancerOpen, closeAudioEnhancer } = useMedia();
  const [settings, setSettings] = useState<EnhancerSettings>(() => audioEnhancer.getSettings());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Sync state whenever audioEnhancer updates
  useEffect(() => {
    const unsub = audioEnhancer.subscribe(() => {
      setSettings(audioEnhancer.getSettings());
    });
    return unsub;
  }, []);

  // Real-time Audio Spectrum Visualizer
  useEffect(() => {
    if (!isAudioEnhancerOpen) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let idlePhase = 0;
    let lastDrawTime = 0;
    const targetInterval = 33; // 30fps throttled: cuts GPU/CPU load in half while looking buttery smooth

    const render = (timestamp: number) => {
      animFrameRef.current = requestAnimationFrame(render);
      if (document.hidden) return;

      if (timestamp - lastDrawTime < targetInterval) return;
      lastDrawTime = timestamp;

      const data = audioEnhancer.getFrequencyData();
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const isDataActive = data && Array.from(data).some((v: number) => v > 0);

      if (isDataActive && data) {
        // Draw real-time FFT bars
        const barCount = 28;
        const barWidth = (width / barCount) - 3;
        const step = Math.floor(data.length / barCount) || 1;

        for (let i = 0; i < barCount; i++) {
          const val = data[i * step] || 0;
          const barHeight = Math.max(3, (val / 255) * height * 0.9);
          const x = i * (barWidth + 3) + 2;
          const y = height - barHeight;

          // Gradient: Neon Cyan to Lime Green
          const gradient = ctx.createLinearGradient(0, height, 0, 0);
          gradient.addColorStop(0, '#00e5ff');
          gradient.addColorStop(0.7, '#00b4d8');
          gradient.addColorStop(1, '#c8ff00');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, [3, 3, 0, 0]);
          ctx.fill();

          // Glowing peak cap
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, Math.max(0, y - 2), barWidth, 1.5);
        }
      } else {
        // Idle ambient breathing wave when silent or paused
        idlePhase += 0.04;
        const barCount = 28;
        const barWidth = (width / barCount) - 3;

        for (let i = 0; i < barCount; i++) {
          const normalized = Math.sin(idlePhase + i * 0.25) * 0.5 + 0.5;
          const barHeight = 4 + normalized * 16;
          const x = i * (barWidth + 3) + 2;
          const y = height - barHeight;

          ctx.fillStyle = 'rgba(0, 229, 255, 0.22)';
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
          ctx.fill();
        }
      }
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isAudioEnhancerOpen]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 90 || info.velocity.y > 320) {
      closeAudioEnhancer();
    }
  };

  const handleTogglePower = () => {
    audioEnhancer.setEnabled(!settings.enabled);
  };

  const handleSelectPreset = (key: EnhancerPreset) => {
    audioEnhancer.setPreset(key);
  };

  const handleModeChange = (mode: EnhancerMode) => {
    audioEnhancer.setMode(mode);
  };

  const handleSliderChange = (param: keyof EnhancerSettings, value: number) => {
    audioEnhancer.updateSettings({ [param]: value });
  };

  const handleToggleNightMode = () => {
    audioEnhancer.updateSettings({ nightMode: !settings.nightMode });
  };

  const handleEQChange = (index: number, val: number) => {
    audioEnhancer.setEQBand(index, val);
  };

  const handleResetEQ = () => {
    audioEnhancer.resetEQ();
  };

  const formatFreq = (hz: number) => (hz >= 1000 ? `${hz / 1000}k` : `${hz}`);

  return (
    <AnimatePresence>
      {isAudioEnhancerOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="enhancer-backdrop"
            className="audio-enhancer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={closeAudioEnhancer}
          />

          {/* Swipeable Bottom Sheet */}
          <motion.div
            key="enhancer-sheet"
            className="audio-enhancer-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              damping: 28,
              stiffness: 280,
              mass: 0.85,
            }}
            drag="y"
            dragDirectionLock
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={handleDragEnd}
          >
            {/* Top Drag Handle */}
            <div
              className="audio-enhancer-handle-wrap"
              onClick={closeAudioEnhancer}
              role="button"
              tabIndex={0}
              aria-label="Swipe down to dismiss"
            >
              <div className="audio-enhancer-handle-pill" />
            </div>

            {/* Header */}
            <div className="audio-enhancer-header">
              <div className="audio-enhancer-title-box">
                <div className="audio-enhancer-icon-badge">
                  <Sliders size={20} />
                </div>
                <div className="audio-enhancer-title-text">
                  <h3>StreamPlay Audio DSP</h3>
                  <p>
                    <span
                      className={`enhancer-status-dot ${
                        !settings.enabled ? 'bypass' : ''
                      }`}
                    />
                    {settings.enabled ? 'Active • 48kHz 32-bit DSP' : 'Bypassed'}
                  </p>
                </div>
              </div>

              <div className="audio-enhancer-header-actions">
                <button
                  className={`enhancer-power-toggle ${
                    settings.enabled ? 'active' : ''
                  }`}
                  onClick={handleTogglePower}
                  title="Toggle Audio Engine"
                >
                  <Power size={14} />
                  <span>{settings.enabled ? 'ON' : 'OFF'}</span>
                </button>

                <button
                  className="enhancer-close-btn"
                  onClick={closeAudioEnhancer}
                  aria-label="Close Enhancer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="audio-enhancer-body">
              {/* Spectrum Visualizer Canvas */}
              <div className="spectrum-canvas-wrap">
                <canvas
                  ref={canvasRef}
                  className="spectrum-canvas"
                  width={560}
                  height={72}
                />
                <span className="spectrum-overlay-badge">Real-Time FFT</span>
              </div>

              {/* Mode Switcher Banner */}
              <div className="enhancer-mode-banner">
                <div className="enhancer-mode-label">
                  {settings.mode === 'movie' ? (
                    <>
                      <Tv size={16} color="#00e5ff" />
                      <span>Movie Mode Active</span>
                    </>
                  ) : (
                    <>
                      <Music2 size={16} color="#c8ff00" />
                      <span>Music Mode Active</span>
                    </>
                  )}
                </div>
                <div className="enhancer-mode-pills">
                  <button
                    className={`enhancer-mode-pill ${
                      settings.mode === 'music' ? 'active' : ''
                    }`}
                    onClick={() => handleModeChange('music')}
                  >
                    Music
                  </button>
                  <button
                    className={`enhancer-mode-pill ${
                      settings.mode === 'movie' ? 'active' : ''
                    }`}
                    onClick={() => handleModeChange('movie')}
                  >
                    Movie
                  </button>
                </div>
              </div>

              {/* Quick Presets Carousel */}
              <div>
                <div className="enhancer-section-title">
                  <span>DSP Presets</span>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    {PRESET_CONFIGS[settings.preset]?.name}
                  </span>
                </div>
                <div className="preset-chips-scroll">
                  {(Object.keys(PRESET_CONFIGS) as EnhancerPreset[]).map(
                    (key) => {
                      const cfg = PRESET_CONFIGS[key];
                      const isActive = settings.preset === key;
                      return (
                        <div
                          key={key}
                          className={`preset-chip ${isActive ? 'active' : ''}`}
                          onClick={() => handleSelectPreset(key)}
                          role="button"
                          tabIndex={0}
                        >
                          <span className="preset-chip-title">{cfg.name}</span>
                          <span className="preset-chip-desc">
                            {cfg.description}
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Core Enhancement Sliders */}
              <div>
                <div className="enhancer-section-title">
                  <span>Enhancement Sculpting</span>
                </div>

                <div className="enhancement-sliders-grid">
                  {/* Bass Boost */}
                  <div className="enhancer-card">
                    <div className="enhancer-card-header">
                      <span className="enhancer-card-title">
                        <Zap size={15} color="#c8ff00" />
                        Bass Boost
                      </span>
                      <span className="enhancer-card-value">
                        {settings.bassBoost}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={settings.bassBoost}
                      onChange={(e) =>
                        handleSliderChange('bassBoost', Number(e.target.value))
                      }
                      className="enhancer-range"
                      aria-label="Bass Boost Slider"
                    />
                  </div>

                  {/* Treble Sparkle */}
                  <div className="enhancer-card">
                    <div className="enhancer-card-header">
                      <span className="enhancer-card-title">
                        <Sparkles size={15} color="#00e5ff" />
                        Treble Sparkle
                      </span>
                      <span className="enhancer-card-value">
                        {settings.trebleBoost}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={settings.trebleBoost}
                      onChange={(e) =>
                        handleSliderChange('trebleBoost', Number(e.target.value))
                      }
                      className="enhancer-range"
                      aria-label="Treble Sparkle Slider"
                    />
                  </div>

                  {/* Dialogue Clarity (Mid/Side processing) */}
                  <div className="enhancer-card">
                    <div className="enhancer-card-header">
                      <span className="enhancer-card-title">
                        <Mic size={15} color="#38bdf8" />
                        Dialogue Clarity
                      </span>
                      <span className="enhancer-card-value">
                        {settings.dialogueClarity}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={settings.dialogueClarity}
                      onChange={(e) =>
                        handleSliderChange(
                          'dialogueClarity',
                          Number(e.target.value)
                        )
                      }
                      className="enhancer-range"
                      aria-label="Dialogue Clarity Slider"
                    />
                  </div>

                  {/* 3D Virtual Surround (Haas delay + Convolution) */}
                  <div className="enhancer-card">
                    <div className="enhancer-card-header">
                      <span className="enhancer-card-title">
                        <Headphones size={15} color="#a855f7" />
                        3D Virtual Surround
                      </span>
                      <span className="enhancer-card-value">
                        {settings.virtualSurround}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={settings.virtualSurround}
                      onChange={(e) =>
                        handleSliderChange(
                          'virtualSurround',
                          Number(e.target.value)
                        )
                      }
                      className="enhancer-range"
                      aria-label="3D Surround Slider"
                    />
                  </div>

                  {/* Night Mode DRC Toggle Card */}
                  <div className="enhancer-card nightmode-card">
                    <div className="nightmode-toggle-wrap">
                      <div>
                        <span className="enhancer-card-title">
                          <Moon size={15} color="#c8ff00" />
                          Night Mode (DRC Volume Leveler)
                        </span>
                        <p className="nightmode-desc">
                          Boosts soft voices & prevents loud explosions from peaking
                        </p>
                      </div>

                      <div
                        className={`switch-pill ${
                          settings.nightMode ? 'checked' : ''
                        }`}
                        onClick={handleToggleNightMode}
                        role="switch"
                        aria-checked={settings.nightMode}
                        tabIndex={0}
                      >
                        <div className="switch-knob" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 10-Band Graphic Equalizer */}
              <div className="eq-container">
                <div className="eq-header">
                  <span className="enhancer-section-title" style={{ margin: 0 }}>
                    10-Band Studio Equalizer
                  </span>
                  <button
                    className="eq-reset-btn"
                    onClick={handleResetEQ}
                    title="Reset EQ to flat (0 dB)"
                  >
                    <RotateCcw size={12} style={{ display: 'inline', marginRight: 4 }} />
                    Flat (0 dB)
                  </button>
                </div>

                <div className="eq-sliders-row">
                  {EQ_FREQUENCIES.map((freq: number, idx: number) => {
                    const gainVal = settings.eqGains[idx] || 0;
                    return (
                      <div key={freq} className="eq-band-col">
                        <span className="eq-band-val">
                          {gainVal > 0 ? `+${gainVal}` : gainVal}
                        </span>
                        <div className="eq-slider-vertical-wrap">
                          <input
                            type="range"
                            min={-12}
                            max={12}
                            step={1}
                            value={gainVal}
                            onChange={(e) =>
                              handleEQChange(idx, Number(e.target.value))
                            }
                            className="eq-slider-vertical"
                            aria-label={`EQ ${formatFreq(freq)} Hz`}
                          />
                        </div>
                        <span className="eq-band-label">{formatFreq(freq)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AudioEnhancerModal;
