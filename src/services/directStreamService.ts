// src/services/directStreamService.ts
// NetMirror-style direct stream resolver contract.

export interface DirectStreamResult {
  url: string;
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
  const base = getDirectStreamBase();

  const params = new URLSearchParams({
    id: String(movieId),
    type,
    season: String(season),
    episode: String(episode)
  });

  try {
    const response = await fetch(`${base.replace(/\/$/, '')}/stream?${params.toString()}`, {
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) return null;
    const data = await response.json();
    const url = data?.url || data?.streamUrl || data?.hls || null;
    if (typeof url !== 'string' || !url.startsWith('http')) return null;
    return url;
  } catch {
    return null;
  }
}

export function isDirectStreamConfigured(): boolean {
  return true;
}
