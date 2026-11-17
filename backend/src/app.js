import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { loadConfig } from './config/env.js';
import { ProviderRegistry } from './core/ProviderRegistry.js';
import { SourceValidator } from './core/SourceValidator.js';
import { SourceSelector } from './core/SourceSelector.js';
import { SourceResolver } from './core/SourceResolver.js';
import { PlaybackSessionManager } from './core/PlaybackSessionManager.js';
import { ArchiveOrgProviderAdapter } from './providers/ArchiveOrgProviderAdapter.js';
import { WikimediaCommonsProviderAdapter } from './providers/WikimediaCommonsProviderAdapter.js';
import { PartnerApiProviderAdapter } from './providers/PartnerApiProviderAdapter.js';
import { createPlaybackRouter } from './routes/playbackRoutes.js';

export function createPlaybackApp({ configOverrides = {}, customProviders = null, fetchImpl } = {}) {
  const config = loadConfig(configOverrides);

  const registry = new ProviderRegistry();
  if (Array.isArray(customProviders)) {
    for (const adapter of customProviders) {
      registry.register(adapter);
    }
  } else {
    registry.register(
      new ArchiveOrgProviderAdapter({
        enabled: config.enableArchiveOrg,
        priority: 10,
        fetchImpl,
        requestTimeoutMs: config.providerTimeoutMs,
      })
    );

    registry.register(
      new WikimediaCommonsProviderAdapter({
        enabled: config.enableWikimediaCommons,
        priority: 20,
        fetchImpl,
        requestTimeoutMs: config.providerTimeoutMs,
      })
    );

    registry.register(
      new PartnerApiProviderAdapter({
        name: config.partnerProviderName,
        baseUrl: config.partnerProviderBaseUrl,
        apiKey: config.partnerProviderApiKey,
        enabled: config.enablePartnerProvider,
        priority: 5,
        fetchImpl,
        requestTimeoutMs: config.providerTimeoutMs,
      })
    );
  }

  const validator = new SourceValidator({
    validateUpstreamHead: config.validateUpstreamHead,
    upstreamHeadTimeoutMs: config.upstreamHeadTimeoutMs,
    fetchImpl,
  });

  const selector = new SourceSelector();

  const resolver = new SourceResolver({
    registry,
    validator,
    selector,
    providerTimeoutMs: config.providerTimeoutMs,
    cacheTtlSeconds: config.sourceCacheTtlSeconds,
  });

  const sessionManager = new PlaybackSessionManager({
    signingSecret: config.signingSecret,
    sessionTtlSeconds: config.sessionTtlSeconds,
    validator,
  });

  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '64kb' }));

  app.use('/api', createPlaybackRouter({ registry, resolver, sessionManager }));

  app.use((_req, res) => {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Endpoint not found.' });
  });

  app.use((err, _req, res, _next) => {
    res.status(err?.statusCode || 500).json({
      error: err?.code || 'INTERNAL_SERVER_ERROR',
      message: err?.message || 'Unexpected backend error.',
    });
  });

  return {
    app,
    config,
    registry,
    validator,
    selector,
    resolver,
    sessionManager,
  };
}
