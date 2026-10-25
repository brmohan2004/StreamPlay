// src/services/scraperStreamService.ts
import { signStreamToken } from '../lib/streamCrypto';

export interface ScrapedVideoSource {
  quality: string;
  url: string;
}

export interface ScrapedAudioTrack {
  name: string;
  lang: string;
  url: string;
  default?: boolean;
}

export interface ScrapedSubtitle {
  lang: string;
  url: string;
  default?: boolean;
}

export interface ScrapedStreamResult {
  success: boolean;
  title?: string;
  year?: string;
  imdbId?: string | null;
  videoSources: ScrapedVideoSource[];
  headers: Record<string, string>;
  audioTracks: ScrapedAudioTrack[];
  subtitles: ScrapedSubtitle[];
  error?: string;
}

export function getScraperBase(): string {
  const envBase = (import.meta as any).env?.VITE_SCRAPER_BASE;
  if (typeof envBase === 'string' && envBase.trim().length > 0) return envBase.trim();
  if (typeof window !== 'undefined' && /^https?:/i.test(window.location.protocol)) {
    return window.location.origin;
  }
  return 'http://localhost:3002';
}

export async function resolveScrapedStream(params: {
  title: string;
  year?: string | number;
  type: 'movie' | 'series';
  season?: number;
  episode?: number;
  imdbId?: string;
}): Promise<ScrapedStreamResult | null> {
  const base = getScraperBase().replace(/\/$/, '');
  const query = new URLSearchParams({
    title: params.title || '',
    year: String(params.year ?? ''),
    type: params.type || 'movie',
    season: String(params.season ?? 1),
    episode: String(params.episode ?? 1)
  });
  if (params.imdbId) {
    query.set('imdbId', params.imdbId);
  }

  try {
    const res = await fetch(`${base}/api/resolve-stream?${query.toString()}`, {
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json || typeof json !== 'object') return null;
    return {
      success: !!json.success,
      title: json.title,
      year: json.year,
      imdbId: json.imdbId,
      videoSources: Array.isArray(json.videoSources) ? json.videoSources : [],
      headers: json.headers || {},
      audioTracks: Array.isArray(json.audioTracks) ? json.audioTracks : [],
      subtitles: Array.isArray(json.subtitles) ? json.subtitles : [],
      error: json.error
    };
  } catch (err) {
    console.warn('[ScraperStreamService] Failed to resolve stream:', err);
    return null;
  }
}

export async function toProxyUrl(rawUrl: string, headers: Record<string, string> = {}): Promise<string> {
  const base = (typeof window !== 'undefined' && /^https?:/i.test(window.location.protocol))
    ? window.location.origin
    : 'http://localhost:3001';
  try {
    const token = await signStreamToken({
      url: rawUrl,
      headers,
      exp: Date.now() + 60 * 60 * 1000
    });
    return `${base.replace(/\/$/, '')}/api/proxy/hls?token=${encodeURIComponent(token)}`;
  } catch {
    return rawUrl;
  }
}

export async function toProxySources(result: ScrapedStreamResult): Promise<ScrapedStreamResult> {
  const headers = result.headers || {};
  const videoSources = await Promise.all(
    result.videoSources.map(async (s) => ({ quality: s.quality, url: await toProxyUrl(s.url, headers) }))
  );
  const subtitles = await Promise.all(
    result.subtitles.map(async (s) => ({ ...s, url: await toProxyUrl(s.url, headers) }))
  );
  const audioTracks = await Promise.all(
    result.audioTracks.map(async (a) => ({ ...a, url: await toProxyUrl(a.url, headers) }))
  );
  return { ...result, videoSources, subtitles, audioTracks };
}
