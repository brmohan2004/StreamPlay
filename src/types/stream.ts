// src/types/stream.ts
export interface StreamMirror {
  id: string;
  name: string;
  url: string;
  health?: 'unknown' | 'healthy' | 'unhealthy';
}

export interface StreamSubtitleTrack {
  id: string;
  label: string;
  language?: string;
  url: string;
  format: 'vtt' | 'hls-cc';
}

export interface SecureStreamBundle {
  sessionId: string;
  expiresAt: number;
  mirrors: StreamMirror[];
  subtitles: StreamSubtitleTrack[];
  audioTracks?: { id: string; name: string; language?: string }[];
  qualities?: string[];
}