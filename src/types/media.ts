export interface EpisodeItem {
  id: string; // e.g. tt0903747:1:1
  name: string;
  season: number;
  number: number;
  overview?: string;
  thumbnail?: string;
  rating?: number;
  released?: string;
}

export interface MovieItem {
  id: string; // IMDb ID (e.g. tt22084616)
  name: string;
  type: 'movie' | 'series';
  poster: string;
  background?: string;
  description?: string;
  releaseInfo?: string;
  imdbRating?: string;
  genres?: string[];
  ottProvider?: OTTBrand;
  cast?: string[];
  director?: string[];
  runtime?: string;
  trailer?: string;
  videos?: EpisodeItem[];
  isTheaterPrint?: boolean;
  theaterPrint?: string;
  streamUrl?: string; // Direct HLS .m3u8 stream URL if available
  language?: string;
  released?: string; // ISO date string of theatrical/digital premiere
}


export interface SongItem {
  id: string;
  title: string;
  album: string;
  artist: string;
  year?: string;
  duration?: number;
  image: string;
  streamUrl: string;
  backupStreamUrls?: string[]; // Multi-CDN failover audio mirrors
  videoUrl?: string; // YouTube / MP4 video stream URL for video song mode
  isVideo?: boolean;
  language?: string;
  accentColor?: string; // e.g. orange, cyan, lime for card accent bar
  quality?: string;
  isShortClip?: boolean; // True for songs/teasers/hooks under 90 seconds
  source?: 'JioSaavn' | 'Audius' | 'Apple' | 'YouTube' | string; // Free music provider
}

export type OTTBrand =
  | 'All'
  | 'Netflix'
  | 'JioHotstar'
  | 'Prime Video'
  | 'Apple TV+'
  | 'Sony LIV'
  | 'Zee5';

export interface OTTMetadata {
  brand: OTTBrand;
  displayName: string;
  tagline: string;
  accentColor: string;
  logoText: string;
  popularQueries: string[];
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  songs: SongItem[];
  createdAt: string;
}

export interface WatchlistItem {
  movie: MovieItem;
  addedAt: string;
}

export interface UserSettings {
  preferredLanguages: string[];
  notificationsEnabled: boolean;
  autoPlayNext: boolean;
  audioQuality: '160kbps' | '320kbps';
  streamServerPreference: number;
}

