import { normalizeAudioTrack, normalizeSource, normalizeSubtitleTrack } from '../models/sourceSchema.js';

function withTimeout(promise, timeoutMs, label) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

export class SourceResolver {
  constructor({
    registry,
    validator,
    selector,
    providerTimeoutMs = 8000,
    cacheTtlSeconds = 300,
  }) {
    this.registry = registry;
    this.validator = validator;
    this.selector = selector;
    this.providerTimeoutMs = Number(providerTimeoutMs);
    this.cacheTtlMs = Number(cacheTtlSeconds) * 1000;

    // Cache: key -> { sources, cachedAt, expiresAt }
    this._cache = new Map();
    // Server-side registry of validated sources by sourceId so sessions cannot accept arbitrary URLs
    this._knownSources = new Map();
  }

  _buildCacheKey({ contentId, mediaType, season, episode, title, year, preferredProvider }) {
    return JSON.stringify([
      String(contentId ?? '').trim().toLowerCase(),
      String(mediaType ?? 'movie').trim().toLowerCase(),
      season ?? null,
      episode ?? null,
      String(title ?? '').trim().toLowerCase(),
      year ?? null,
      String(preferredProvider ?? 'auto').trim().toLowerCase(),
    ]);
  }

  getValidatedSourceById(sourceId) {
    const entry = this._knownSources.get(String(sourceId));
    if (!entry) return null;
    if (Date.parse(entry.expiresAt) <= Date.now()) {
      this._knownSources.delete(String(sourceId));
      return null;
    }
    return entry;
  }

  clearCache() {
    this._cache.clear();
  }

  async resolve(request, preferences = {}) {
    const normalizedRequest = {
      contentId: String(request.contentId ?? '').trim(),
      mediaType: String(request.mediaType ?? 'movie').toLowerCase().trim(),
      title: request.title ? String(request.title).trim() : '',
      year: request.year ? Number(request.year) : null,
      season: request.season !== undefined && request.season !== null ? Number(request.season) : null,
      episode: request.episode !== undefined && request.episode !== null ? Number(request.episode) : null,
    };

    const cacheKey = this._buildCacheKey({
      ...normalizedRequest,
      preferredProvider: preferences.preferredProvider,
    });

    const cached = this._cache.get(cacheKey);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      const stillValid = cached.sources.filter((s) => Date.parse(s.expiresAt) > now);
      if (stillValid.length === cached.sources.length) {
        return {
          sources: this.selector.selectAndRank(stillValid, preferences, this._providerPriorityMap()),
          fromCache: true,
          providerErrors: cached.providerErrors,
        };
      }
      this._cache.delete(cacheKey);
    }

    const enabledProviders = this.registry.getEnabledProviders();
    const providerErrors = [];

    const settled = await Promise.allSettled(
      enabledProviders.map(async (provider) => {
        const rawSources = await withTimeout(
          provider.getSources(normalizedRequest),
          this.providerTimeoutMs,
          `Provider ${provider.id}`
        );

        if (!Array.isArray(rawSources) || rawSources.length === 0) {
          return [];
        }

        const validatedForProvider = [];
        for (const raw of rawSources) {
          let subtitles = raw.subtitles;
          let audioTracks = raw.audioTracks;

          if (!Array.isArray(subtitles) || subtitles.length === 0) {
            try {
              const fetchedSubs = await withTimeout(
                provider.getSubtitles(normalizedRequest.contentId, {
                  ...normalizedRequest,
                  source: raw,
                }),
                Math.min(this.providerTimeoutMs, 3000),
                `Provider ${provider.id} subtitles`
              );
              if (Array.isArray(fetchedSubs) && fetchedSubs.length > 0) {
                subtitles = fetchedSubs.map((s, idx) => normalizeSubtitleTrack(s, idx));
              }
            } catch {
              // Subtitles enrichment is non-fatal
            }
          }

          if (!Array.isArray(audioTracks) || audioTracks.length === 0) {
            try {
              const fetchedAudio = await withTimeout(
                provider.getAudioTracks(normalizedRequest.contentId, {
                  ...normalizedRequest,
                  source: raw,
                }),
                Math.min(this.providerTimeoutMs, 3000),
                `Provider ${provider.id} audioTracks`
              );
              if (Array.isArray(fetchedAudio) && fetchedAudio.length > 0) {
                audioTracks = fetchedAudio.map((a, idx) => normalizeAudioTrack(a, idx));
              }
            } catch {
              // Audio track enrichment is non-fatal
            }
          }

          const normalized = normalizeSource(
            {
              ...raw,
              subtitles,
              audioTracks,
            },
            {
              providerId: provider.id,
              providerName: provider.name,
              contentId: normalizedRequest.contentId,
              mediaType: normalizedRequest.mediaType,
              season: normalizedRequest.season,
              episode: normalizedRequest.episode,
            }
          );

          const providerCheck = await provider.validateSource(normalized);
          if (!providerCheck || providerCheck.valid === false) {
            continue;
          }

          const globalCheck = await this.validator.validate(normalized);
          if (!globalCheck.valid) {
            continue;
          }

          this._knownSources.set(normalized.sourceId, normalized);
          validatedForProvider.push(normalized);
        }

        return validatedForProvider;
      })
    );

    const allValidSources = [];
    settled.forEach((outcome, idx) => {
      const provider = enabledProviders[idx];
      if (outcome.status === 'fulfilled') {
        allValidSources.push(...outcome.value);
      } else {
        providerErrors.push({
          providerId: provider.id,
          message: outcome.reason?.message ?? 'Provider lookup failed',
        });
      }
    });

    const ranked = this.selector.selectAndRank(
      allValidSources,
      preferences,
      this._providerPriorityMap()
    );

    // Cache only up to min(cacheTtlMs, earliest source expiry)
    let earliestExpiry = now + this.cacheTtlMs;
    for (const s of ranked) {
      const exp = Date.parse(s.expiresAt);
      if (Number.isFinite(exp) && exp < earliestExpiry) {
        earliestExpiry = exp;
      }
    }

    if (earliestExpiry > now) {
      this._cache.set(cacheKey, {
        sources: ranked,
        cachedAt: now,
        expiresAt: earliestExpiry,
        providerErrors,
      });
    }

    return {
      sources: ranked,
      fromCache: false,
      providerErrors,
    };
  }

  _providerPriorityMap() {
    const map = new Map();
    for (const provider of this.registry.listProviders()) {
      map.set(provider.id, provider.priority);
    }
    return map;
  }
}
