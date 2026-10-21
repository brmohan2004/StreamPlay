import React, { createContext, useContext, useState } from 'react';
import { OTTBrand } from '../types/media';

export type AppMode = 'movies' | 'music';
export type ScreenName = 'home' | 'search' | 'movie-search' | 'music-search' | 'playlist' | 'profile' | 'watchlater' | 'details';


interface NavigationContextType {
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  activeScreen: ScreenName;
  setActiveScreen: (screen: ScreenName) => void;
  selectedOTT: OTTBrand;
  setSelectedOTT: (brand: OTTBrand) => void;
  selectedLanguage: string;
  setSelectedLanguage: (lang: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  selectedChannel: string;
  setSelectedChannel: (channel: string) => void;
  isFilterSheetOpen: boolean;
  setIsFilterSheetOpen: (open: boolean) => void;
  openFilterSheet: () => void;
  closeFilterSheet: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appMode, setAppModeState] = useState<AppMode>(() => {
    try {
      const defaultLaunch = localStorage.getItem('streamplay_default_launch_mode');
      if (defaultLaunch === 'movies' || defaultLaunch === 'music') {
        return defaultLaunch;
      }
      const saved = localStorage.getItem('streamplay_app_mode');
      if (saved === 'movies' || saved === 'music') {
        return saved;
      }
    } catch {
      // Fallback if localStorage is inaccessible
    }
    return 'movies';
  });

  const setAppMode = (mode: AppMode) => {
    setAppModeState(mode);
    try {
      localStorage.setItem('streamplay_app_mode', mode);
    } catch (e) {
      console.warn('Failed to persist streamplay_app_mode:', e);
    }
  };

  const [activeScreen, setActiveScreen] = useState<ScreenName>('home');
  const [selectedOTT, setSelectedOTT] = useState<OTTBrand>('All');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedChannel, setSelectedChannel] = useState<string>('All');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const openFilterSheet = () => setIsFilterSheetOpen(true);
  const closeFilterSheet = () => setIsFilterSheetOpen(false);

  return (
    <NavigationContext.Provider
      value={{
        appMode,
        setAppMode,
        activeScreen,
        setActiveScreen,
        selectedOTT,
        setSelectedOTT,
        selectedLanguage,
        setSelectedLanguage,
        searchQuery,
        setSearchQuery,
        activeCategory,
        setActiveCategory,
        selectedChannel,
        setSelectedChannel,
        isFilterSheetOpen,
        setIsFilterSheetOpen,
        openFilterSheet,
        closeFilterSheet
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNavigation must be used within NavigationProvider');
  return ctx;
};
