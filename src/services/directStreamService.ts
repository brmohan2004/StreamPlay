// src/services/directStreamService.ts
// Secure stream resolver: calls /api/stream/:id and decrypts the bundle.

import { decryptStreamManifest } from '../lib/streamCrypto';
import { SecureStreamBundle } from '../types/stream';

export interface DirectStreamResult {
  url: string;
  bundle?: SecureStreamBundle;
}

export function getDirectStreamBase(): string {
  const envBase = (import.meta as any).env?.VITE_DIRECT_STREAM_BASE;
  if (typeof envBase === 'string' && envBase.trim().length > 0) return envBase.trim();
  if (typeof window !== 'undefined' && /^https?:/i.test(window.location.protocol)) {
    return window.location.origin;
  }
  return 'http://localhost:3001';
}

export async function resolveDirectStream(
  movieId: string,
  type: 'movie' | 'series',
  season = 1,
  episode = 1
): Promise<string | null> {
  const res = await resolveSecureStream(movieId, type, season, episode);
  return res?.url || null;
}

export async function resolveSecureStream(
  movieId: string,
  type: 'movie' | 'series',
  season = 1,
  episode = 1
): Promise<DirectStreamResult | null> {
  const base = getDirectStreamBase();
  const params = new URLSearchParams({
    type,
    season: String(season),
    episode: String(episode)
  });
  try {
    const response = await fetch(`${base.replace(/\/$/, '')}/api/stream/${encodeURIComponent(movieId)}?${params.toString()}`, {
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) return null;
    const encrypted = await response.json();
    if (!encrypted || typeof encrypted.data !== 'string' || typeof encrypted.iv !== 'string') return null;
    const plain = await decryptStreamManifest(encrypted);
    const bundle = JSON.parse(plain) as SecureStreamBundle;
    const url = bundle?.mirrors?.[0]?.url;
    if (typeof url !== 'string' || !url.startsWith('http')) return null;
    return { url, bundle };
  } catch {
    return null;
  }
}

export function isDirectStreamConfigured(): boolean {
  return true;
}