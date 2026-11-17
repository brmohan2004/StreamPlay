import crypto from 'node:crypto';

export class PlaybackSessionError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.name = 'PlaybackSessionError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class PlaybackSessionManager {
  constructor({ signingSecret, sessionTtlSeconds = 1800, validator }) {
    if (!signingSecret || signingSecret.length < 16) {
      throw new Error('PlaybackSessionManager requires a signingSecret of at least 16 characters.');
    }
    this.signingSecret = signingSecret;
    this.sessionTtlMs = Number(sessionTtlSeconds) * 1000;
    this.validator = validator;
    this._sessions = new Map();

    // Periodic cleanup of expired sessions without keeping Node event loop alive
    this._cleanupTimer = setInterval(() => this.pruneExpired(), 60_000);
    if (typeof this._cleanupTimer.unref === 'function') {
      this._cleanupTimer.unref();
    }
  }

  _signToken({ sessionId, sourceId, contentId, expiresAt }) {
    const payload = `${sessionId}.${sourceId}.${contentId}.${expiresAt}`;
    return crypto
      .createHmac('sha256', this.signingSecret)
      .update(payload)
      .digest('base64url');
  }

  _timingSafeEqual(a, b) {
    const bufA = Buffer.from(String(a ?? ''), 'utf8');
    const bufB = Buffer.from(String(b ?? ''), 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }

  async createSession({ source }) {
    if (!source) {
      throw new PlaybackSessionError(
        'SOURCE_NOT_FOUND',
        'Requested authorized video source was not found or has expired.',
        404
      );
    }

    if (this.validator) {
      const check = await this.validator.validate(source, { checkUpstream: false });
      if (!check.valid) {
        throw new PlaybackSessionError(
          'SOURCE_UNAUTHORIZED',
          `Source failed authorization validation: ${check.errors.join(' ')}`,
          403
        );
      }
    }

    const now = Date.now();
    const sourceExpiryMs = Date.parse(source.expiresAt);
    if (Number.isNaN(sourceExpiryMs) || sourceExpiryMs <= now) {
      throw new PlaybackSessionError('SOURCE_EXPIRED', 'Source playback URL has expired.', 410);
    }

    const sessionId = crypto.randomUUID();
    const effectiveExpiryMs = Math.min(now + this.sessionTtlMs, sourceExpiryMs);
    const expiresAt = new Date(effectiveExpiryMs).toISOString();
    const createdAt = new Date(now).toISOString();

    const token = this._signToken({
      sessionId,
      sourceId: source.sourceId,
      contentId: source.contentId,
      expiresAt,
    });

    const record = {
      sessionId,
      token,
      source,
      subtitles: source.subtitles ?? [],
      audioTracks: source.audioTracks ?? [],
      expiresAt,
      createdAt,
      revoked: false,
    };

    this._sessions.set(sessionId, record);

    return {
      sessionId: record.sessionId,
      token: record.token,
      source: record.source,
      subtitles: record.subtitles,
      audioTracks: record.audioTracks,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
    };
  }

  verifyAndGetSession(sessionId, token) {
    const record = this._sessions.get(String(sessionId));
    if (!record) {
      throw new PlaybackSessionError('SESSION_NOT_FOUND', 'Playback session not found.', 404);
    }

    if (record.revoked) {
      throw new PlaybackSessionError('SESSION_REVOKED', 'Playback session has been revoked.', 403);
    }

    if (!token) {
      throw new PlaybackSessionError('UNAUTHORIZED', 'Missing playback authorization token.', 401);
    }

    const expectedToken = this._signToken({
      sessionId: record.sessionId,
      sourceId: record.source.sourceId,
      contentId: record.source.contentId,
      expiresAt: record.expiresAt,
    });

    if (!this._timingSafeEqual(token, expectedToken)) {
      throw new PlaybackSessionError('UNAUTHORIZED', 'Invalid playback authorization token.', 401);
    }

    const now = Date.now();
    if (Date.parse(record.expiresAt) <= now) {
      this._sessions.delete(record.sessionId);
      throw new PlaybackSessionError('SESSION_EXPIRED', 'Playback session has expired.', 410);
    }

    if (Date.parse(record.source.expiresAt) <= now) {
      this._sessions.delete(record.sessionId);
      throw new PlaybackSessionError('SOURCE_EXPIRED', 'Authorized stream URL has expired.', 410);
    }

    return record;
  }

  getSession(sessionId, token) {
    const record = this.verifyAndGetSession(sessionId, token);
    return {
      sessionId: record.sessionId,
      source: record.source,
      subtitles: record.subtitles,
      audioTracks: record.audioTracks,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
    };
  }

  getSubtitles(sessionId, token) {
    const record = this.verifyAndGetSession(sessionId, token);
    return {
      sessionId: record.sessionId,
      contentId: record.source.contentId,
      subtitles: record.subtitles,
    };
  }

  getAudioTracks(sessionId, token) {
    const record = this.verifyAndGetSession(sessionId, token);
    return {
      sessionId: record.sessionId,
      contentId: record.source.contentId,
      audioTracks: record.audioTracks,
    };
  }

  revokeSession(sessionId) {
    const record = this._sessions.get(String(sessionId));
    if (!record) return false;
    record.revoked = true;
    this._sessions.delete(String(sessionId));
    return true;
  }

  pruneExpired() {
    const now = Date.now();
    for (const [id, record] of this._sessions.entries()) {
      if (Date.parse(record.expiresAt) <= now || Date.parse(record.source.expiresAt) <= now) {
        this._sessions.delete(id);
      }
    }
  }

  dispose() {
    clearInterval(this._cleanupTimer);
  }
}
