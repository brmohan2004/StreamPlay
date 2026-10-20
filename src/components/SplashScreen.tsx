import React, { useState, useEffect } from 'react';
import './SplashScreen.css';

interface SplashScreenProps {
  onFinish: () => void;
  durationMs?: number; // Defaults to 3200 (3.2 seconds)
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish, durationMs = 3200 }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Start fade out slightly before completion
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, Math.max(1000, durationMs - 500));

    const finishTimer = setTimeout(() => {
      onFinish();
    }, durationMs);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [durationMs, onFinish]);

  return (
    <div className={`splash-screen-overlay ${isFadingOut ? 'fading-out' : ''}`}>
      <div className="splash-ambient-glow" />

      <div className="splash-minimal-brand">
        <div className="splash-logo-container">
          <img
            src="/StreamPlay.png"
            alt="StreamPlay"
            className="splash-logo-img"
          />
        </div>

        <h1 className="splash-brand-title">STREAMPLAY</h1>
        <p className="splash-brand-sub">Stream &bull; Play &bull; Feel</p>
      </div>
    </div>
  );
};
