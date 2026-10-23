import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useNavigation } from '../context/NavigationContext';
import { useMedia } from '../context/MediaContext';

/**
 * useBackButtonHandler
 * Comprehensive Android Back Gesture & Hardware Button Handler for StreamPlay.
 * 
 * Handles:
 * 1. Native Android gesture navigation (swipe from left/right edge) via @capacitor/app 'backButton'
 * 2. On-screen touch swipe gestures (left edge swipe & quick swipe left/back)
 * 3. Graceful hierarchical navigation:
 *    - Close inner video player drawers/menus/fullscreen first
 *    - Close Video Player Modal
 *    - Close Movie Details Screen/Modal
 *    - Close Fullscreen Music Player Modal
 *    - Close Filter Bottom Sheets
 *    - Navigate back from sub-screens (Search, Profile, Playlist, WatchLater) to Home
 *    - Double-tap back on Home to safely exit the app with a feedback toast
 */
export function useBackButtonHandler() {
  const { activeScreen, setActiveScreen, isFilterSheetOpen, closeFilterSheet } = useNavigation();
  const {
    isVideoModalOpen,
    closeMoviePlayer,
    selectedMovie,
    closeMovieDetails,
    isMusicPlayerOpen,
    closeMusicPlayer,
    songToAddToPlaylist,
    closeAddToPlaylist
  } = useMedia();

  const stateRef = useRef({
    activeScreen,
    isFilterSheetOpen,
    isVideoModalOpen,
    selectedMovie,
    isMusicPlayerOpen,
    songToAddToPlaylist
  });

  useEffect(() => {
    stateRef.current = {
      activeScreen,
      isFilterSheetOpen,
      isVideoModalOpen,
      selectedMovie,
      isMusicPlayerOpen,
      songToAddToPlaylist
    };
  }, [activeScreen, isFilterSheetOpen, isVideoModalOpen, selectedMovie, isMusicPlayerOpen, songToAddToPlaylist]);

  useEffect(() => {
    let lastBackTimestamp = 0;

    const executeBackAction = () => {
      const state = stateRef.current;

      // 0. If Add to Playlist modal is open, close it
      if (state.songToAddToPlaylist) {
        closeAddToPlaylist();
        return;
      }

      // 1. Dispatch custom event for nested components (like CustomVideoPlayer to close its own menus first)
      const backEvt = new CustomEvent('streamplay-back-action', { cancelable: true });
      const dispatched = window.dispatchEvent(backEvt);
      if (!dispatched || backEvt.defaultPrevented) {
        // Handled by active inner modal/drawer
        return;
      }

      // 2. If Video Player is open, close it
      if (state.isVideoModalOpen) {
        closeMoviePlayer();
        return;
      }

      // 3. If Movie Details is open, close details
      if (state.selectedMovie || state.activeScreen === 'details') {
        closeMovieDetails();
        if (state.activeScreen === 'details') {
          setActiveScreen('home');
        }
        return;
      }

      // 4. If Fullscreen Music Player is open, close music player
      if (state.isMusicPlayerOpen) {
        closeMusicPlayer();
        return;
      }

      // 5. If Filter Bottom Sheet is open, close it
      if (state.isFilterSheetOpen) {
        closeFilterSheet();
        return;
      }

      // 6. If on any sub-screen, return to Home
      if (state.activeScreen !== 'home') {
        setActiveScreen('home');
        return;
      }

      // 7. If on Home screen: Double-tap back within 2 seconds to exit app
      const now = Date.now();
      if (now - lastBackTimestamp < 2000) {
        if (Capacitor.isNativePlatform()) {
          App.exitApp();
        }
      } else {
        lastBackTimestamp = now;
        window.dispatchEvent(
          new CustomEvent('streamplay-toast', {
            detail: { message: 'Press back again to exit' }
          })
        );
      }
    };

    // 1. Listen for native Android back button & edge swipe gesture
    let backListenerHandle: any = null;
    if (Capacitor.isNativePlatform()) {
      App.addListener('backButton', () => {
        executeBackAction();
      }).then(handle => {
        backListenerHandle = handle;
      }).catch(err => {
        console.warn('[StreamPlay Back] Error registering backButton listener:', err);
      });
    }

    // 2. Touch Edge Swipe Listener for touchscreens & mobile browsers
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length === 1) {
        const deltaX = e.changedTouches[0].clientX - touchStartX;
        const deltaY = e.changedTouches[0].clientY - touchStartY;
        const timeElapsed = Date.now() - touchStartTime;

        // Quick horizontal flick (< 400ms, mostly horizontal)
        if (timeElapsed < 400 && Math.abs(deltaY) < 55) {
          // A: Edge swipe from left margin inward (> 65px)
          const isLeftEdgeSwipe = touchStartX <= 40 && deltaX > 65;
          // B: Swipe left from right edge or general swipe back gesture
          const isRightEdgeSwipe = touchStartX >= window.innerWidth - 40 && deltaX < -65;
          // C: In video player or details, a prominent swipe back
          const isProminentBackSwipe =
            (stateRef.current.isVideoModalOpen || stateRef.current.selectedMovie) &&
            Math.abs(deltaX) > 120 &&
            timeElapsed < 300;

          if (isLeftEdgeSwipe || isRightEdgeSwipe || isProminentBackSwipe) {
            executeBackAction();
          }
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      if (backListenerHandle && backListenerHandle.remove) {
        backListenerHandle.remove();
      }
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [closeMoviePlayer, closeMovieDetails, closeMusicPlayer, closeFilterSheet, setActiveScreen]);
}
