import React, { useState, useRef, useEffect } from 'react';
import { Film, Music, Check, Sparkles, ArrowLeft } from 'lucide-react';
import { SUPPORTED_LOCATIONS, UserLocation, setUserLocation, prefetchLocationImage } from '../services/locationService';
import { AppMode } from '../context/NavigationContext';
import './OnboardingModal.css';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (preferences: {
    mode: AppMode;
    location: UserLocation;
    primaryLang: string;
    secondaryLang: string;
  }) => void;
}

const AVAILABLE_LANGUAGES = [
  'Tamil',
  'Hindi',
  'Telugu',
  'English',
  'Malayalam',
  'Kannada',
  'Punjabi',
  'Bengali'
];

// Curated 12 posters expanded across 4 columns to cover 100% full-screen height
const FLOATING_POSTERS_COL1 = [
  '/onboarding/poster_1.jpg',
  '/onboarding/poster_2.jpg',
  '/onboarding/poster_3.jpg',
  '/onboarding/poster_4.jpg',
  '/onboarding/poster_5.jpg',
  '/onboarding/poster_6.jpg'
];

const FLOATING_POSTERS_COL2 = [
  '/onboarding/poster_7.jpg',
  '/onboarding/poster_8.jpg',
  '/onboarding/poster_9.jpg',
  '/onboarding/poster_10.jpg',
  '/onboarding/poster_11.jpg',
  '/onboarding/poster_12.jpg'
];

const FLOATING_POSTERS_COL3 = [
  '/onboarding/poster_2.jpg',
  '/onboarding/poster_5.jpg',
  '/onboarding/poster_8.jpg',
  '/onboarding/poster_11.jpg',
  '/onboarding/poster_1.jpg',
  '/onboarding/poster_4.jpg'
];

const FLOATING_POSTERS_COL4 = [
  '/onboarding/poster_3.jpg',
  '/onboarding/poster_6.jpg',
  '/onboarding/poster_9.jpg',
  '/onboarding/poster_12.jpg',
  '/onboarding/poster_7.jpg',
  '/onboarding/poster_10.jpg'
];

// Split 8 locations into 2 stacked columns (Kollywood, Tollywood, Mollywood, Bangla vs Bollywood, Sandalwood, North, World)
const COLUMN_1_LOCATIONS = SUPPORTED_LOCATIONS.filter((_, idx) => idx % 2 === 0);
const COLUMN_2_LOCATIONS = SUPPORTED_LOCATIONS.filter((_, idx) => idx % 2 === 1);

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Selections: Default to null (no pre-selection until user selects)
  const [selectedMode, setSelectedMode] = useState<AppMode | null>(null);
  const [selectedLocation, setSelectedLocationState] = useState<UserLocation | null>(null);
  const [primaryLang, setPrimaryLang] = useState<string | null>(null);
  const [secondaryLang, setSecondaryLang] = useState<string>('English');

  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  // Step 1: Mode chosen -> highlight & auto-advance to step 2 after brief delay
  const handleSelectMode = (mode: AppMode) => {
    setSelectedMode(mode);
    if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
    autoAdvanceTimeoutRef.current = setTimeout(() => {
      setStep(2);
    }, 360);
  };

  // Step 2: Location chosen -> trigger upward card reveal animation & auto-advance to step 3
  const handleSelectLocation = (loc: UserLocation) => {
    setSelectedLocationState(loc);
    prefetchLocationImage(loc.image);
    if (loc.defaultLang && !primaryLang) {
      setPrimaryLang(loc.defaultLang);
    }
    if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
    autoAdvanceTimeoutRef.current = setTimeout(() => {
      setStep(3);
    }, 650);
  };

  // Back button (available from Step 2 onwards)
  const handleBack = () => {
    if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
    if (step > 1) {
      setStep((step - 1) as 1 | 2);
    }
  };

  // Save settings and launch app
  const isStartStreamingDisabled = step === 3 && primaryLang === null;

  const saveAndExit = () => {
    if (!selectedMode || !selectedLocation || !primaryLang) return;

    try {
      localStorage.setItem('streamplay_onboarding_completed', 'true');
      localStorage.setItem('streamplay_app_mode', selectedMode);
      localStorage.setItem('streamplay_default_launch_mode', selectedMode);
      localStorage.setItem('streamplay_primary_lang', primaryLang);
      localStorage.setItem('streamplay_secondary_lang', secondaryLang || 'English');
      setUserLocation(selectedLocation.id);
    } catch (e) {
      console.warn('Failed to save onboarding settings:', e);
    }

    onComplete({
      mode: selectedMode,
      location: selectedLocation,
      primaryLang,
      secondaryLang: secondaryLang || 'English'
    });
  };

  // Dynamic style calculation for stacked card animation in Step 2:
  // When a card is selected, it elevates with high z-index and moves UPWARD to reveal its full content!
  const getCardStyle = (loc: UserLocation, colIdx: number, rowIdx: number): React.CSSProperties => {
    const isSelected = selectedLocation?.id === loc.id;
    if (!selectedLocation) {
      return {
        zIndex: rowIdx + 1,
        transform: 'translateY(0)',
        opacity: 1
      };
    }

    // This card is selected: elevate, scale and move upward
    if (isSelected) {
      const upwardDistances = [-24, -30, -36, -28];
      const upDist = upwardDistances[rowIdx] ?? -28;
      return {
        zIndex: 50,
        transform: `translateY(${upDist}px) scale(1.04)`,
        opacity: 1
      };
    }

    // Check if the selected card is in the SAME column
    const isCol1Selected = COLUMN_1_LOCATIONS.some(l => l.id === selectedLocation.id);
    const isThisColSelected = (colIdx === 0 && isCol1Selected) || (colIdx === 1 && !isCol1Selected);

    if (isThisColSelected) {
      const list = colIdx === 0 ? COLUMN_1_LOCATIONS : COLUMN_2_LOCATIONS;
      const selectedRow = list.findIndex(l => l.id === selectedLocation.id);

      if (rowIdx < selectedRow) {
        // Cards above the selected card move slightly up and dim
        return {
          zIndex: rowIdx + 1,
          transform: 'translateY(-10px)',
          opacity: 0.55
        };
      } else {
        // Cards below the selected card slide down to reveal the selected card's full content!
        return {
          zIndex: rowIdx + 1,
          transform: 'translateY(24px)',
          opacity: 0.55
        };
      }
    }

    // Cards in the opposite column subtly dim to emphasize the user's choice
    return {
      zIndex: rowIdx + 1,
      transform: 'translateY(0)',
      opacity: 0.45
    };
  };

  return (
    <div className="onboarding-fullscreen-container">
      {/* ─────────────────────────────────────────────────────────────
          1. FULL-SCREEN FLOATING POSTER COLLAGE (Covers 100% viewport)
      ───────────────────────────────────────────────────────────── */}
      <div className="onboarding-collage-viewport" aria-hidden="true">
        <div className="onboarding-collage-grid">
          {/* Column 1 */}
          <div className="collage-column col-1">
            {FLOATING_POSTERS_COL1.map((src, i) => (
              <div key={`col1-${i}`} className="collage-card">
                <img src={src} alt="Poster" loading="eager" />
              </div>
            ))}
          </div>

          {/* Column 2 */}
          <div className="collage-column col-2">
            {FLOATING_POSTERS_COL2.map((src, i) => (
              <div key={`col2-${i}`} className="collage-card">
                <img src={src} alt="Poster" loading="eager" />
              </div>
            ))}
          </div>

          {/* Column 3 */}
          <div className="collage-column col-3">
            {FLOATING_POSTERS_COL3.map((src, i) => (
              <div key={`col3-${i}`} className="collage-card">
                <img src={src} alt="Poster" loading="eager" />
              </div>
            ))}
          </div>

          {/* Column 4 */}
          <div className="collage-column col-4">
            {FLOATING_POSTERS_COL4.map((src, i) => (
              <div key={`col4-${i}`} className="collage-card">
                <img src={src} alt="Poster" loading="eager" />
              </div>
            ))}
          </div>
        </div>

        {/* Full-Screen Cinematic Vignette (Posters show through; no block card) */}
        <div className="onboarding-collage-gradient-mask" />
        <div className="onboarding-streamplay-aura" />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. STEP CONTENT & CONTROLS (Floating directly above posters)
      ───────────────────────────────────────────────────────────── */}
      <div className="onboarding-content-container">
        {/* STEP 1: Launch Mode Selection (No Next button; auto-advances on select) */}
        {step === 1 && (
          <div className="onboarding-step-body animate-step-in">
            <h1 className="onboarding-hero-title">
              Stream the magic of<br />every story
            </h1>
            <p className="onboarding-hero-desc">
              Enjoy a huge library of movies, series, and exclusive content—all in one convenient place.
            </p>

            {/* Visual Mode Choices */}
            <div className="onboarding-visual-mode-row">
              <button
                type="button"
                className={`visual-mode-pill movies-pill ${selectedMode === 'movies' ? 'active' : ''}`}
                onClick={() => handleSelectMode('movies')}
              >
                <Film size={18} />
                <span>Movies & Series</span>
                {selectedMode === 'movies' && <Check size={14} className="check-badge movies-badge" />}
              </button>

              <button
                type="button"
                className={`visual-mode-pill music-pill ${selectedMode === 'music' ? 'active' : ''}`}
                onClick={() => handleSelectMode('music')}
              >
                <Music size={18} />
                <span>Music & Audio</span>
                {selectedMode === 'music' && <Check size={14} className="check-badge music-badge" />}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Regional Hub Selection (2-Column Stacked Deck; Selected Card Moves Upward) */}
        {step === 2 && (
          <div className="onboarding-step-body animate-step-in">
            <h1 className="onboarding-hero-title">
              Curated for your<br />cinema hub
            </h1>
            <p className="onboarding-hero-desc">
              Theatrical releases, box office buzz and regional chartbusters for your region.
            </p>

            {/* 2-Column Vertically Cascading Stacked Deck */}
            <div className="onboarding-location-visual-deck">
              {/* Left Column */}
              <div className="location-stack-column">
                {COLUMN_1_LOCATIONS.map((loc, rowIdx) => {
                  const isSelected = selectedLocation?.id === loc.id;
                  return (
                    <div
                      key={loc.id}
                      className={`visual-loc-card ${isSelected ? 'selected' : ''}`}
                      style={getCardStyle(loc, 0, rowIdx)}
                      onClick={() => handleSelectLocation(loc)}
                      role="button"
                      tabIndex={0}
                    >
                      <img src={loc.image} alt={loc.name} loading="lazy" />
                      <div className="loc-card-overlay" />
                      
                      {/* Top Bar: Hub tag & glowing check badge */}
                      <div className="loc-card-header">
                        <span className="loc-hub-tag">{loc.cinemaHub}</span>
                        {isSelected && (
                          <div className="loc-check-badge">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}
                      </div>

                      {/* Bottom Bar: City name and region */}
                      <div className="loc-name-badge">
                        <div className="loc-name-group">
                          <span className="loc-city-title">{loc.name}</span>
                          <span className="loc-region-sub">{loc.region}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column */}
              <div className="location-stack-column">
                {COLUMN_2_LOCATIONS.map((loc, rowIdx) => {
                  const isSelected = selectedLocation?.id === loc.id;
                  return (
                    <div
                      key={loc.id}
                      className={`visual-loc-card ${isSelected ? 'selected' : ''}`}
                      style={getCardStyle(loc, 1, rowIdx)}
                      onClick={() => handleSelectLocation(loc)}
                      role="button"
                      tabIndex={0}
                    >
                      <img src={loc.image} alt={loc.name} loading="lazy" />
                      <div className="loc-card-overlay" />
                      
                      {/* Top Bar: Hub tag & glowing check badge */}
                      <div className="loc-card-header">
                        <span className="loc-hub-tag">{loc.cinemaHub}</span>
                        {isSelected && (
                          <div className="loc-check-badge">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}
                      </div>

                      {/* Bottom Bar: City name and region */}
                      <div className="loc-name-badge">
                        <div className="loc-name-group">
                          <span className="loc-city-title">{loc.name}</span>
                          <span className="loc-region-sub">{loc.region}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Language Selection */}
        {step === 3 && (
          <div className="onboarding-step-body animate-step-in">
            <h1 className="onboarding-hero-title">
              Entertainment in<br />your language
            </h1>
            <p className="onboarding-hero-desc">
              Personalized feeds and dual-audio recommendations crafted for your taste.
            </p>

            {/* Visual Language Chips */}
            <div className="onboarding-lang-visual-wrap">
              <div className="lang-group">
                <span className="lang-group-label">Primary Language</span>
                <div className="lang-chips-deck">
                  {AVAILABLE_LANGUAGES.map(lang => (
                    <button
                      key={`prim-${lang}`}
                      type="button"
                      className={`lang-chip ${primaryLang === lang ? 'active-primary' : ''}`}
                      onClick={() => setPrimaryLang(lang)}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              <div className="lang-group">
                <span className="lang-group-label">Secondary Language</span>
                <div className="lang-chips-deck">
                  {AVAILABLE_LANGUAGES.map(lang => (
                    <button
                      key={`sec-${lang}`}
                      type="button"
                      className={`lang-chip ${secondaryLang === lang ? 'active-secondary' : ''}`}
                      onClick={() => setSecondaryLang(lang)}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            3. CAROUSEL DOTS INDICATOR (Cyan to Lime Glow)
        ───────────────────────────────────────────────────────────── */}
        <div className="onboarding-carousel-indicators" role="tablist">
          <div
            className={`carousel-dot ${step === 1 ? 'active-pill' : ''}`}
            onClick={() => setStep(1)}
          />
          <div
            className={`carousel-dot ${step === 2 ? 'active-pill' : ''}`}
            onClick={() => {
              if (selectedMode) setStep(2);
            }}
          />
          <div
            className={`carousel-dot ${step === 3 ? 'active-pill' : ''}`}
            onClick={() => {
              if (selectedMode && selectedLocation) setStep(3);
            }}
          />
        </div>

        {/* ─────────────────────────────────────────────────────────────
            4. BOTTOM ACTION BUTTONS:
            - Step 1: No next button (auto-advances on select)
            - Step 2: Back button only (auto-advances on card select)
            - Step 3: Back button + "Start Streaming" button
        ───────────────────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="onboarding-bottom-actions single-action">
            <p className="onboarding-step-hint">Select a streaming mode to continue</p>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-bottom-actions single-action">
            <button type="button" className="onboarding-back-btn" onClick={handleBack}>
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="onboarding-bottom-actions">
            <button type="button" className="onboarding-back-btn" onClick={handleBack}>
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>

            <button
              type="button"
              className={`onboarding-primary-btn ${isStartStreamingDisabled ? 'btn-disabled' : 'btn-active'}`}
              onClick={saveAndExit}
              disabled={isStartStreamingDisabled}
            >
              <span>Start Streaming</span>
              <Sparkles size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
