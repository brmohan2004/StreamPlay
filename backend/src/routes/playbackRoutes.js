import express from 'express';
import { PlaybackSessionError } from '../core/PlaybackSessionManager.js';

function extractBearerToken(req) {
  const header = req.headers.authorization;
  if (typeof header === 'string' && header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }
  if (typeof req.query.token === 'string' && req.query.token.trim()) {
    return req.query.token.trim();
  }
  return '';
}

function parseOptionalInt(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function createPlaybackRouter({ registry, resolver, sessionManager }) {
  const router = express.Router();

  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'streamplay-playback-backend',
      timestamp: new Date().toISOString(),
      enabledProviders: registry.getEnabledProviders().length,
    });
  });

  router.get('/providers', (_req, res) => {
    res.json({
      providers: registry.listProviders(),
    });
  });

  // GET /api/movies/:id/sources
  router.get('/movies/:id/sources', async (req, res, next) => {
    try {
      const contentId = String(req.params.id ?? '').trim();
      if (!contentId) {
        return res.status(400).json({ error: 'INVALID_CONTENT_ID', message: 'Movie ID is required.' });
      }

      const result = await resolver.resolve(
        {
          contentId,
          mediaType: 'movie',
          title: req.query.title ? String(req.query.title) : '',
          year: parseOptionalInt(req.query.year),
        },
        {
          preferredQuality: req.query.quality ? String(req.query.quality) : 'auto',
          preferredFormat: req.query.format ? String(req.query.format) : '',
          preferredLanguage: req.query.language ? String(req.query.language) : '',
          preferredProvider: req.query.provider ? String(req.query.provider) : 'auto',
        }
      );

      res.json({
        contentId,
        mediaType: 'movie',
        available: result.sources.length > 0,
        message: result.sources.length > 0 ? null : 'Currently unavailable for streaming.',
        fromCache: result.fromCache,
        sources: result.sources,
      });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/series/:id/sources
  router.get('/series/:id/sources', async (req, res, next) => {
    try {
      const contentId = String(req.params.id ?? '').trim();
      if (!contentId) {
        return res.status(400).json({ error: 'INVALID_CONTENT_ID', message: 'Series ID is required.' });
      }

      const season = parseOptionalInt(req.query.season) ?? 1;
      const episode = parseOptionalInt(req.query.episode) ?? 1;

      const result = await resolver.resolve(
        {
          contentId,
          mediaType: 'series',
          title: req.query.title ? String(req.query.title) : '',
          year: parseOptionalInt(req.query.year),
          season,
          episode,
        },
        {
          preferredQuality: req.query.quality ? String(req.query.quality) : 'auto',
          preferredFormat: req.query.format ? String(req.query.format) : '',
          preferredLanguage: req.query.language ? String(req.query.language) : '',
          preferredProvider: req.query.provider ? String(req.query.provider) : 'auto',
        }
      );

      res.json({
        contentId,
        mediaType: 'series',
        season,
        episode,
        available: result.sources.length > 0,
        message: result.sources.length > 0 ? null : 'Currently unavailable for streaming.',
        fromCache: result.fromCache,
        sources: result.sources,
      });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/playback/session
  // Security rule: NEVER accepts arbitrary client-submitted playback URLs.
  // Sessions can ONLY be created for server-resolved, validated sourceIds.
  router.post('/playback/session', async (req, res, next) => {
    try {
      const { sourceId, contentId, mediaType = 'movie', title, year, season, episode } = req.body ?? {};

      if (req.body?.playbackUrl) {
        return res.status(400).json({
          error: 'ARBITRARY_URL_FORBIDDEN',
          message: 'Arbitrary playback URLs are not accepted. Provide a server-resolved sourceId.',
        });
      }

      if (!sourceId || typeof sourceId !== 'string') {
        return res.status(400).json({
          error: 'MISSING_SOURCE_ID',
          message: 'A validated sourceId is required to create a playback session.',
        });
      }

      let source = resolver.getValidatedSourceById(sourceId);

      // If cache was cold (e.g. server restart), re-resolve by contentId & match sourceId safely
      if (!source && contentId) {
        const resolved = await resolver.resolve({
          contentId: String(contentId),
          mediaType: String(mediaType),
          title: title ? String(title) : '',
          year: parseOptionalInt(year),
          season: parseOptionalInt(season),
          episode: parseOptionalInt(episode),
        });
        source = resolved.sources.find((s) => s.sourceId === sourceId) ?? null;
      }

      if (!source) {
        return res.status(404).json({
          error: 'SOURCE_NOT_FOUND',
          message: 'Selected authorized source was not found or has expired. Refresh sources and retry.',
        });
      }

      const session = await sessionManager.createSession({ source });
      return res.status(201).json(session);
    } catch (err) {
      if (err instanceof PlaybackSessionError) {
        return res.status(err.statusCode).json({ error: err.code, message: err.message });
      }
      return next(err);
    }
  });

  // GET /api/playback/:sessionId
  router.get('/playback/:sessionId', (req, res) => {
    try {
      const token = extractBearerToken(req);
      const session = sessionManager.getSession(req.params.sessionId, token);
      return res.json(session);
    } catch (err) {
      if (err instanceof PlaybackSessionError) {
        return res.status(err.statusCode).json({ error: err.code, message: err.message });
      }
      return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to read playback session.' });
    }
  });

  // GET /api/playback/:sessionId/subtitles
  router.get('/playback/:sessionId/subtitles', (req, res) => {
    try {
      const token = extractBearerToken(req);
      const payload = sessionManager.getSubtitles(req.params.sessionId, token);
      return res.json(payload);
    } catch (err) {
      if (err instanceof PlaybackSessionError) {
        return res.status(err.statusCode).json({ error: err.code, message: err.message });
      }
      return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to load subtitles.' });
    }
  });

  // GET /api/playback/:sessionId/audio
  router.get('/playback/:sessionId/audio', (req, res) => {
    try {
      const token = extractBearerToken(req);
      const payload = sessionManager.getAudioTracks(req.params.sessionId, token);
      return res.json(payload);
    } catch (err) {
      if (err instanceof PlaybackSessionError) {
        return res.status(err.statusCode).json({ error: err.code, message: err.message });
      }
      return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to load audio tracks.' });
    }
  });

  return router;
}
