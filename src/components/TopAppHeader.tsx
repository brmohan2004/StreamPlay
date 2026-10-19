import './TopAppHeader.css';
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';

interface TopAppHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export const TopAppHeader: React.FC<TopAppHeaderProps> = ({ title, showBack, onBack }) => {
  const { appMode, setActiveScreen } = useNavigation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      setActiveScreen('home');
    }
  };

  return (
    <header className={`mobile-top-header ${appMode === 'music' ? 'music-mode-header' : 'movies-mode-header'}`}>
      <div className="header-left">
        {showBack ? (
          <button className="header-icon-btn back-btn" onClick={handleBack} aria-label="Go Back">
            <ArrowLeft size={22} />
          </button>
        ) : (
          <div className="header-brand" onClick={() => setActiveScreen('home')} title="StreamPlay Home">
            <img src="/StreamPlay.png" alt="StreamPlay Logo" className="header-brand-logo-img" />
            <span className="brand-title-text">StreamPlay</span>
          </div>
        )}

        {title && <h2 className="header-custom-title">{title}</h2>}
      </div>

      {/* Header right side options removed as requested */}
    </header>
  );
};

