import { useEffect, useRef } from 'react';
import { useNavigation } from '../context/NavigationContext';

/**
 * useSwipeNavigation
 * Implements intuitive gesture navigation:
 * 1. In Movies mode:
 *    - Swipe right from Home -> moves to 'watchlater' screen
 *    - Swipe left from Watch Later -> returns to 'home' screen
 * 2. In Music mode:
 *    - Swipe right from Home -> moves to 'playlist' screen
 *    - Swipe left from Playlist -> returns to 'home' screen
 */
export function useSwipeNavigation() {
  const { appMode, activeScreen, setActiveScreen, isFilterSheetOpen } = useNavigation();

  const touchStartRef = useRef<{ x: number; y: number; time: number; target: EventTarget | null } | null>(null);

  useEffect(() => {
    // If the modal bottom sheet is open, do not trigger screen navigation
    if (isFilterSheetOpen) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
        target: e.target
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current || e.changedTouches.length !== 1) return;
      const start = touchStartRef.current;
      touchStartRef.current = null;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;
      const deltaTime = Date.now() - start.time;

      // Gesture criteria:
      // Minimum horizontal distance: 55px
      // Must be predominantly horizontal: Math.abs(deltaX) > Math.abs(deltaY) * 1.3
      // Fast flick/swipe: deltaTime < 550ms
      if (Math.abs(deltaX) < 55 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.3 || deltaTime > 550) {
        return;
      }

      // Check if touch originated inside a horizontal scroll container
      if (start.target instanceof HTMLElement) {
        let el: HTMLElement | null = start.target;
        let isInsideHorizontalScroll = false;

        while (el && el !== document.body) {
          const overflowX = window.getComputedStyle(el).overflowX;
          if (
            (overflowX === 'auto' || overflowX === 'scroll') &&
            el.scrollWidth > el.clientWidth + 10
          ) {
            // If user swiped right (deltaX > 0), but the container was scrolled right (scrollLeft > 10),
            // the user was scrolling the container itself, so don't navigate
            if (deltaX > 0 && el.scrollLeft > 10) {
              isInsideHorizontalScroll = true;
              break;
            }
            // If user swiped left (deltaX < 0), but the container can still scroll right
            if (deltaX < 0 && el.scrollLeft + el.clientWidth < el.scrollWidth - 10) {
              isInsideHorizontalScroll = true;
              break;
            }
          }
          el = el.parentElement;
        }

        if (isInsideHorizontalScroll) {
          return;
        }
      }

      // 1. Movies Mode Swipe Gestures
      if (appMode === 'movies') {
        // Swipe Right (deltaX > 0): Home -> Watch Later
        if (deltaX > 0 && activeScreen === 'home') {
          setActiveScreen('watchlater');
          return;
        }
        // Swipe Left (deltaX < 0): Watch Later -> Home
        if (deltaX < 0 && activeScreen === 'watchlater') {
          setActiveScreen('home');
          return;
        }
      }

      // 2. Music Mode Swipe Gestures
      if (appMode === 'music') {
        // Swipe Right (deltaX > 0): Home -> Playlist
        if (deltaX > 0 && activeScreen === 'home') {
          setActiveScreen('playlist');
          return;
        }
        // Swipe Left (deltaX < 0): Playlist -> Home
        if (deltaX < 0 && activeScreen === 'playlist') {
          setActiveScreen('home');
          return;
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Desktop mouse drag simulation for testing gestures
    let mouseStart: { x: number; y: number; time: number; target: EventTarget | null } | null = null;
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      mouseStart = { x: e.clientX, y: e.clientY, time: Date.now(), target: e.target };
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!mouseStart) return;
      const start = mouseStart;
      mouseStart = null;

      const deltaX = e.clientX - start.x;
      const deltaY = e.clientY - start.y;
      const deltaTime = Date.now() - start.time;

      if (Math.abs(deltaX) < 65 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.3 || deltaTime > 600) {
        return;
      }

      // Check if mouse drag was on an input or button
      if (start.target instanceof HTMLElement) {
        const tag = start.target.tagName.toLowerCase();
        if (tag === 'input' || tag === 'button' || tag === 'textarea' || start.target.closest('button')) {
          return;
        }
      }

      if (appMode === 'movies') {
        if (deltaX > 0 && activeScreen === 'home') {
          setActiveScreen('watchlater');
          return;
        }
        if (deltaX < 0 && activeScreen === 'watchlater') {
          setActiveScreen('home');
          return;
        }
      }

      if (appMode === 'music') {
        if (deltaX > 0 && activeScreen === 'home') {
          setActiveScreen('playlist');
          return;
        }
        if (deltaX < 0 && activeScreen === 'playlist') {
          setActiveScreen('home');
          return;
        }
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [appMode, activeScreen, setActiveScreen, isFilterSheetOpen]);
}
