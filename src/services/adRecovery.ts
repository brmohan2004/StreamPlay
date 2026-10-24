// src/services/adRecovery.ts
// Movie-mode ad recovery: when an ad URL is triggered, wait a configurable
// number of milliseconds, then trigger the browser back button (return to the
// player) and auto-close any tab/window that the ad opened.

import { isAdUrl, isExternalNavigation } from './adBlocker';

let active = false;
let restoreOpen: (() => void) | null = null;

export interface AdRecoveryOptions {
  /** Delay in milliseconds before triggering back + closing tabs. */
  delayMs?: number;
}

export function activateMovieModeAdRecovery(options: AdRecoveryOptions = {}): () => void {
  if (active) {
    return () => deactivateMovieModeAdRecovery();
  }
  active = true;
  const delayMs = Math.max(0, options.delayMs ?? 1200);
  const originalOpen = window.open;
  const openedWindows: Window[] = [];

  const recover = (win: Window | null) => {
    window.setTimeout(() => {
      try {
        if (win && !win.closed) {
          win.close();
        }
      } catch {
        // Cross-origin windows may not be closable; ignore.
      }
      try {
        window.history.back();
      } catch {
        // Ignore navigation errors.
      }
    }, delayMs);
  };

  window.open = function (...args: any[]): Window | null {
    const targetUrl = args[0] ? String(args[0]) : '';
    const win = originalOpen ? originalOpen.apply(window, args as any) : null;
    if (win) openedWindows.push(win);

    const isAd = !!targetUrl && (isAdUrl(targetUrl) || isExternalNavigation(targetUrl));
    if (isAd) {
      recover(win);
    }
    return win;
  } as any;

  // Also handle anchor clicks that open a new tab to an ad URL.
  const clickHandler = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const anchor = target.closest('a') as HTMLAnchorElement | null;
    if (!anchor) return;
    const href = anchor.getAttribute('href') || anchor.href || '';
    const opensNewTab = anchor.target === '_blank' || e.ctrlKey || e.metaKey;
    if (href && opensNewTab && (isAdUrl(href) || isExternalNavigation(href))) {
      // Let the browser open it, then recover after the delay.
      window.setTimeout(() => {
        try {
          window.history.back();
        } catch {}
      }, delayMs);
    }
  };
  document.addEventListener('click', clickHandler, true);

  restoreOpen = () => {
    window.open = originalOpen;
    document.removeEventListener('click', clickHandler, true);
    // Best-effort close any windows still open.
    openedWindows.forEach((w) => {
      try {
        if (w && !w.closed) w.close();
      } catch {}
    });
    active = false;
    restoreOpen = null;
  };

  return restoreOpen;
}

export function deactivateMovieModeAdRecovery(): void {
  if (restoreOpen) restoreOpen();
}
