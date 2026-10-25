// src/config/mediaFallback.ts
import type React from 'react';

// High-performance, self-contained SVG Data URIs that never trigger network requests or 404s
export const DEFAULT_POSTER_FALLBACK =
  "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450' viewBox='0 0 300 450'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23111827'/%3E%3Cstop offset='100%25' stop-color='%23080b12'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23g)'/%3E%3Ccircle cx='150' cy='200' r='32' fill='%2300d2ff' fill-opacity='0.15'/%3E%3Cpolygon points='144,188 162,200 144,212' fill='%2300d2ff'/%3E%3Ctext x='150' y='265' font-family='system-ui,-apple-system,sans-serif' font-size='13' fill='%2364748b' text-anchor='middle' font-weight='600'%3EStreamPlay%3C/text%3E%3C/svg%3E";

export const DEFAULT_BACKDROP_FALLBACK =
  "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='450' viewBox='0 0 800 450'%3E%3Cdefs%3E%3ClinearGradient id='gb' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%230b0f19'/%3E%3Cstop offset='100%25' stop-color='%23030712'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23gb)'/%3E%3Ccircle cx='400' cy='210' r='40' fill='%2300d2ff' fill-opacity='0.12'/%3E%3Cpolygon points='394,195 414,210 394,225' fill='%2300d2ff'/%3E%3Ctext x='400' y='280' font-family='system-ui,-apple-system,sans-serif' font-size='15' fill='%2364748b' text-anchor='middle' font-weight='600'%3EStreamPlay%3C/text%3E%3C/svg%3E";

export const DEFAULT_SONG_COVER_FALLBACK =
  "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Cdefs%3E%3ClinearGradient id='g2' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%231e1b4b'/%3E%3Cstop offset='100%25' stop-color='%23080b12'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23g2)'/%3E%3Ccircle cx='150' cy='140' r='36' fill='%23a855f7' fill-opacity='0.2'/%3E%3Cpath d='M145 155 A 12 12 0 1 1 145 135 L 160 120 L 160 148 A 12 12 0 1 1 160 135' fill='%23a855f7'/%3E%3Ctext x='150' y='210' font-family='system-ui,-apple-system,sans-serif' font-size='13' fill='%2394a3b8' text-anchor='middle' font-weight='600'%3EStreamPlay Music%3C/text%3E%3C/svg%3E";

/**
 * Handles image loading failures safely.
 * Crucially clears `onerror` before applying the fallback to prevent infinite error loops.
 */
export function handlePosterError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallback = DEFAULT_POSTER_FALLBACK
): void {
  const target = e.currentTarget;
  target.onerror = null;
  target.src = fallback;
}

export function handleSongCoverError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallback = DEFAULT_SONG_COVER_FALLBACK
): void {
  const target = e.currentTarget;
  target.onerror = null;
  target.src = fallback;
}
