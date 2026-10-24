// src/services/securityLayer.ts
// Centralized client-side security helpers for StreamPlay.

import { STREAMING_SERVERS } from './movieService';

export interface SecurityPolicy {
  allowedProviderHosts: string[];
  allowedProtocols: string[];
  maxQueryLength: number;
}

const DEFAULT_POLICY: SecurityPolicy = {
  allowedProviderHosts: [],
  allowedProtocols: ['https:'],
  maxQueryLength: 120
};

let installed = false;

export function getAllowedProviderHosts(): string[] {
  const hosts = new Set<string>();
  for (const server of STREAMING_SERVERS) {
    try {
      const url = server.getUrl('tt0000000', '0000000', 'movie', 1, 1);
      const parsed = new URL(url);
      hosts.add(parsed.hostname.toLowerCase());
    } catch {
      // Ignore malformed server definitions.
    }
  }
  hosts.add('v3-cinemeta.strem.io');
  hosts.add('www.jiosaavn.com');
  return Array.from(hosts);
}

export function getSecurityPolicy(): SecurityPolicy {
  return {
    ...DEFAULT_POLICY,
    allowedProviderHosts: getAllowedProviderHosts()
  };
}

export function sanitizeText(input: string, maxLength = 200): string {
  if (typeof input !== 'string') return '';
  const withoutTags = input.replace(/<[^>]*>/g, '').replace(/[^\w\s\-.,!?@#&()]/g, '');
  return withoutTags.trim().slice(0, maxLength);
}

export function sanitizeMovieId(id: string): string {
  const value = String(id || '').trim();
  if (/^tt\d{5,12}$/.test(value)) return value;
  if (/^\d{1,12}$/.test(value)) return value;
  return '';
}

export function isSafeProviderUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const policy = getSecurityPolicy();
    return policy.allowedProviderHosts.includes(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function validateProviderIndex(index: number, total: number): number {
  if (!Number.isFinite(index) || total <= 0) return 0;
  const normalized = Math.trunc(index);
  return ((normalized % total) + total) % total;
}

export function secureStorageGet(key: string): string | null {
  try {
    return sessionStorage.getItem(`sp_sec_${key}`);
  } catch {
    return null;
  }
}

export function secureStorageSet(key: string, value: string): void {
  try {
    sessionStorage.setItem(`sp_sec_${key}`, value);
  } catch {
    // Storage may be unavailable in restricted contexts.
  }
}

export function secureStorageRemove(key: string): void {
  try {
    sessionStorage.removeItem(`sp_sec_${key}`);
  } catch {
    // Ignore.
  }
}

class RateLimiter {
  private timestamps: number[] = [];
  constructor(private readonly limit: number, private readonly windowMs: number) {}

  public canProceed(): boolean {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((ts) => now - ts < this.windowMs);
    if (this.timestamps.length >= this.limit) return false;
    this.timestamps.push(now);
    return true;
  }

  public reset(): void {
    this.timestamps = [];
  }
}

const searchRateLimiter = new RateLimiter(30, 60_000);

export function canSearchNow(): boolean {
  return searchRateLimiter.canProceed();
}

export function installSecurityLayer(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;

  const csp = [
    "default-src 'self' https: data: blob:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
    "style-src 'self' 'unsafe-inline' https:",
    "img-src 'self' data: https:",
    "media-src 'self' https: blob:",
    "font-src 'self' data: https:",
    `frame-src 'self' ${getAllowedProviderHosts().map((h) => `https://${h}`).join(' ')}`,
    "connect-src 'self' https: wss:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'self'"
  ].join('; ');

  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = csp;
  document.head.appendChild(meta);
}

export function isSecurityLayerInstalled(): boolean {
  return installed;
}
