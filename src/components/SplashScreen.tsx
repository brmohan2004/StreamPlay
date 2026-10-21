import React, { useState, useEffect, useMemo } from 'react';
import './SplashScreen.css';

export interface SplashScreenProps {
  /** Callback fired when the splash sequence finishes or is skipped */
  onFinish?: () => void;
  /** Total animation duration in milliseconds. Defaults to 2000ms */
  durationMs?: number;
  /** Active mode accent: 'movies' (#00B4FF), 'music' (#C0F000), or 'dual' (initial launch) */
  mode?: 'movies' | 'music' | 'dual';
  /** Title typography style: 'split' ("Stream" in #00B4FF, "Play" in #C0F000) or 'white' (#FFFFFF) */
  variant?: 'split' | 'white';
}

/**
 * StreamPlay 2-Second Animated Splash Screen Component
 *
 * Replicates the ease-out transition benchmark (JioHotstar / premium OTTs):
 * - 0ms – 200ms: Black screen
 * - 0ms – 300ms: Logo centered at 1.8x scale with subtle 0.5x circular ripple
 * - 600ms – 2000ms: Logo scales 1.8x -> 1.0x & shifts -24px Y; ripple expands 0.5x -> 2.2x & fades
 * - 700ms – 1400ms: "StreamPlay" text reveals below logo (opacity 0 -> 1, translateY +16px -> 0px)
 * - 1400ms – 2000ms: Holds final lockup for 600ms before smooth handover
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  durationMs = 2000,
  mode: propMode,
  variant = 'split'
}) => {
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Determine active mode accent: prop override > localStorage > 'dual' for initial launch
  const effectiveMode = useMemo<'movies' | 'music' | 'dual'>(() => {
    if (propMode) return propMode;
    try {
      const saved = localStorage.getItem('streamplay_app_mode');
      if (saved === 'movies' || saved === 'music') {
        return saved;
      }
    } catch {
      // ignore storage error
    }
    return 'dual'; // Dual cyan (#00B4FF) & lime (#C0F000) gradient on initial launch
  }, [propMode]);

  useEffect(() => {
    // At total duration (2000ms), begin smooth exit transition
    const exitTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, durationMs);

    // After quick exit dissolve, trigger unmount callback
    const finishTimer = setTimeout(() => {
      onFinish?.();
    }, durationMs + 280);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [durationMs, onFinish]);

  // Allow instant skip on tap / click
  const handleSkip = () => {
    if (isFadingOut) return;
    setIsFadingOut(true);
    setTimeout(() => {
      onFinish?.();
    }, 120);
  };

  return (
    <div
      className={`streamplay-splash-screen mode-${effectiveMode} ${isFadingOut ? 'fading-out' : ''}`}
      onClick={handleSkip}
      role="banner"
      aria-label="StreamPlay Splash Screen"
      style={{ '--splash-duration': `${durationMs}ms` } as React.CSSProperties}
    >
      <div className="splash-stage">
        {/* Subtle Ambient Backlight */}
        <div className="splash-ambient-aura" aria-hidden="true" />

        {/* Dynamic Mode Circular Radial Ripple Disc */}
        <div className="splash-ripple" aria-hidden="true" />

        {/* StreamPlay Logo (Centered at 1.8x, scales down to 1.0x & translates -24px) */}
        <div className="splash-logo-box">
          <img
            src="/StreamPlay.png"
            alt="StreamPlay"
            className="splash-logo-img"
            loading="eager"
            decoding="sync"
          />
        </div>

        {/* Brand Title (Fades in from 700ms - 1400ms directly below logo) */}
        <div className="splash-title-box">
          <h1 className="splash-title-text">
            {variant === 'white' ? (
              <span className="splash-title-white">StreamPlay</span>
            ) : (
              <>
                <span className="splash-title-stream">Stream</span>
                <span className="splash-title-play">Play</span>
              </>
            )}
          </h1>
        </div>
      </div>
    </div>
  );
};
