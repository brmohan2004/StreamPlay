import { ProviderAdapter } from '../core/ProviderAdapter.js';
import { isSafePublicHttpsUrl } from '../core/SourceValidator.js';

/**
 * Authorized Provider #3: Configurable Licensed Partner / Self-Hosted Media Server Adapter
 * Connects to any external authorized catalog API using server-side credentials
 * (PARTNER_PROVIDER_BASE_URL + PARTNER_PROVIDER_API_KEY) without exposing secrets to Flutter.
 */
export class PartnerApiProviderAdapter extends ProviderAdapter {
  constructor({
    id = 'partner-licensed-api',
    name = 'Licensed Partner CDN',
    baseUrl = '',
    apiKey = '',
    enabled = false,
    priority = 20,
    fetchImpl = globalThis.fetch,
    requestTimeoutMs = 6000,
  } = {}) {
    super({
      id,
      name,
      description: 'Configurable external licensed partner or self-hosted authorized streaming API',
      priority,
      enabled: Boolean(enabled && baseUrl),
      supportedFormats: ['hls', 'dash', 'mp4'],
    });
    this.baseUrl = String(baseUrl ?? '').replace(/\/+$/, '');
    this.apiKey = String(apiKey ?? '');
    this.fetchImpl = fetchImpl;
    this.requestTimeoutMs = Number(requestTimeoutMs);
  }

  async _requestJson(pathWithQuery) {
    if (!this.baseUrl) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    try {
      const headers = { Accept: 'application/json' };
      if (this.apiKey) {
        headers.Authorization = `Bearer ${this.apiKey}`;
      }
      const response = await this.fetchImpl(`${this.baseUrl}${pathWithQuery}`, {
        headers,
        signal: controller.signal,
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  async searchContent(query) {
    if (!this.enabled || !query) return [];
    const data = await this._requestJson(`/search?q=${encodeURIComponent(query)}`);
    return Array.isArray(data?.items) ? data.items : [];
  }

  async getSources(request) {
    if (!this.enabled) return [];
    const mediaSegment = request.mediaType === 'series' ? 'series' : 'movies';
    const params = new URLSearchParams();
    if (request.season != null) params.set('season', String(request.season));
    if (request.episode != null) params.set('episode', String(request.episode));
    if (request.title) params.set('title', String(request.title));
    const qs = params.toString() ? `?${params.toString()}` : '';

    const data = await this._requestJson(
      `/${mediaSegment}/${encodeURIComponent(request.contentId)}/sources${qs}`
    );
    if (!Array.isArray(data?.sources)) return [];

    return data.sources.map((src) => ({
      ...src,
      providerId: this.id,
      providerName: this.name,
      contentId: request.contentId,
      mediaType: request.mediaType,
    }));
  }

  async validateSource(source) {
    const check = isSafePublicHttpsUrl(source?.playbackUrl);
    if (!check.ok) return { valid: false, reason: check.reason };
    if (source?.authorizationStatus !== 'authorized') {
      return { valid: false, reason: 'Partner source is not authorized.' };
    }
    return { valid: true };
  }

  async getSubtitles(contentId, options = {}) {
    if (Array.isArray(options?.source?.subtitles)) return options.source.subtitles;
    if (!this.enabled) return [];
    const data = await this._requestJson(`/content/${encodeURIComponent(contentId)}/subtitles`);
    return Array.isArray(data?.subtitles) ? data.subtitles : [];
  }

  async getAudioTracks(contentId, options = {}) {
    if (Array.isArray(options?.source?.audioTracks)) return options.source.audioTracks;
    if (!this.enabled) return [];
    const data = await this._requestJson(`/content/${encodeURIComponent(contentId)}/audio`);
    return Array.isArray(data?.audioTracks) ? data.audioTracks : [];
  }
}
