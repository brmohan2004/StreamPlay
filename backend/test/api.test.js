import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlaybackApp } from '../src/app.js';
import { ProviderAdapter } from '../src/core/ProviderAdapter.js';

class DynamicTestProvider extends ProviderAdapter {
  constructor() {
    super({
      id: 'dynamic-test-provider',
      name: 'Dynamic Test Provider',
      priority: 10,
      enabled: true,
      supportedFormats: ['hls', 'dash', 'mp4'],
    });
  }

  async searchContent() {
    return [];
  }

  async getSources(request) {
    const future = new Date(Date.now() + 300_000).toISOString();
    if (request.mediaType === 'movie' && request.contentId === 'tt0063350') {
      return [
        {
          providerId: this.id,
          providerName: this.name,
          contentId: request.contentId,
          mediaType: 'movie',
          playbackUrl: 'https://cdn.authorized.example.com/notld/master.m3u8',
          format: 'hls',
          quality: '1080p',
          audioLanguages: ['English', 'Spanish'],
          subtitleLanguages: ['English', 'Français'],
          audioTracks: [
            { id: 'en-51', language: 'en', label: 'English (5.1)', channels: '5.1', isDefault: true },
            { id: 'es-20', language: 'es', label: 'Español', channels: '2.0', isDefault: false },
          ],
          subtitles: [
            {
              id: 'sub-en',
              language: 'en',
              label: 'English',
              url: 'https://cdn.authorized.example.com/notld/en.vtt',
              format: 'vtt',
              isDefault: true,
              isExternal: true,
            },
            {
              id: 'sub-fr',
              language: 'fr',
              label: 'Français',
              url: 'https://cdn.authorized.example.com/notld/fr.vtt',
              format: 'vtt',
              isDefault: false,
              isExternal: true,
            },
          ],
          expiresAt: future,
          authorizationStatus: 'authorized',
        },
        {
          providerId: this.id,
          providerName: this.name,
          contentId: request.contentId,
          mediaType: 'movie',
          playbackUrl: 'https://cdn.authorized.example.com/notld/manifest.mpd',
          format: 'dash',
          quality: '1080p',
          audioLanguages: ['English'],
          subtitleLanguages: ['English'],
          expiresAt: future,
          authorizationStatus: 'authorized',
        },
      ];
    }

    if (request.mediaType === 'series' && request.contentId === 'tt0052520' && request.season === 1 && request.episode === 2) {
      return [
        {
          providerId: this.id,
          providerName: this.name,
          contentId: request.contentId,
          mediaType: 'series',
          season: 1,
          episode: 2,
          playbackUrl: 'https://cdn.authorized.example.com/series/s01e02.mp4',
          format: 'mp4',
          quality: '720p',
          audioLanguages: ['English'],
          subtitleLanguages: [],
          expiresAt: future,
          authorizationStatus: 'authorized',
        },
      ];
    }

    return [];
  }

  async validateSource(source) {
    return { valid: source.authorizationStatus === 'authorized' };
  }
  async getSubtitles() {
    return [];
  }
  async getAudioTracks() {
    return [];
  }
}

async function startTestServer(options = {}) {
  const { app, sessionManager } = createPlaybackApp({
    customProviders: [new DynamicTestProvider()],
    configOverrides: {
      signingSecret: 'test-signing-secret-at-least-32-chars!!',
      sessionTtlSeconds: options.sessionTtlSeconds ?? 300,
    },
  });

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    baseUrl,
    close: async () => {
      sessionManager.dispose();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

test('Full Playback API lifecycle: dynamic movie, series, session creation, auth, subtitles, audio, and unavailable titles', async () => {
  const srv = await startTestServer();
  try {
    const healthRes = await fetch(`${srv.baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    const health = await healthRes.json();
    assert.equal(health.status, 'ok');

    const provRes = await fetch(`${srv.baseUrl}/api/providers`);
    assert.equal(provRes.status, 200);
    const provBody = await provRes.json();
    assert.ok(provBody.providers.length >= 1);

    const movieRes = await fetch(`${srv.baseUrl}/api/movies/tt0063350/sources?quality=1080p`);
    assert.equal(movieRes.status, 200);
    const movieData = await movieRes.json();
    assert.equal(movieData.available, true);
    assert.equal(movieData.sources.length, 2);
    const hlsSource = movieData.sources.find((s) => s.format === 'hls');
    assert.ok(hlsSource);

    // Reject arbitrary playbackUrl submitted by client
    const arbitraryRes = await fetch(`${srv.baseUrl}/api/playback/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceId: hlsSource.sourceId,
        playbackUrl: 'https://evil.example.com/fake.mp4',
      }),
    });
    assert.equal(arbitraryRes.status, 400);

    // Create signed playback session
    const sessionRes = await fetch(`${srv.baseUrl}/api/playback/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceId: hlsSource.sourceId,
        contentId: 'tt0063350',
        mediaType: 'movie',
      }),
    });
    assert.equal(sessionRes.status, 201);
    const session = await sessionRes.json();
    assert.ok(session.sessionId);
    assert.ok(session.token);

    // Unauthorized without Bearer token
    const unauthRes = await fetch(`${srv.baseUrl}/api/playback/${session.sessionId}`);
    assert.equal(unauthRes.status, 401);

    const authHeaders = { Authorization: `Bearer ${session.token}` };
    const activeRes = await fetch(`${srv.baseUrl}/api/playback/${session.sessionId}`, {
      headers: authHeaders,
    });
    assert.equal(activeRes.status, 200);
    const activeSession = await activeRes.json();
    assert.equal(activeSession.source.format, 'hls');

    const subRes = await fetch(`${srv.baseUrl}/api/playback/${session.sessionId}/subtitles`, {
      headers: authHeaders,
    });
    assert.equal(subRes.status, 200);
    const subData = await subRes.json();
    assert.equal(subData.subtitles.length, 2);

    const audioRes = await fetch(`${srv.baseUrl}/api/playback/${session.sessionId}/audio`, {
      headers: authHeaders,
    });
    assert.equal(audioRes.status, 200);
    const audioData = await audioRes.json();
    assert.equal(audioData.audioTracks.length, 2);

    // Series episode lookup
    const seriesRes = await fetch(
      `${srv.baseUrl}/api/series/tt0052520/sources?season=1&episode=2`
    );
    assert.equal(seriesRes.status, 200);
    const seriesData = await seriesRes.json();
    assert.equal(seriesData.available, true);
    assert.equal(seriesData.sources.length, 1);

    // Unavailable title returns exact message & zero fake sources
    const unavailRes = await fetch(
      `${srv.baseUrl}/api/movies/tt0000001/sources?title=Unlicensed%20Blockbuster`
    );
    assert.equal(unavailRes.status, 200);
    const unavailData = await unavailRes.json();
    assert.equal(unavailData.available, false);
    assert.equal(unavailData.sources.length, 0);
    assert.equal(unavailData.message, 'Currently unavailable for streaming.');
  } finally {
    await srv.close();
  }
});

test('Expired playback sessions return HTTP 410 Gone', async () => {
  const srv = await startTestServer({ sessionTtlSeconds: 1 });
  try {
    const movieRes = await fetch(`${srv.baseUrl}/api/movies/tt0063350/sources`);
    const movieData = await movieRes.json();
    const src = movieData.sources[0];

    const sessionRes = await fetch(`${srv.baseUrl}/api/playback/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId: src.sourceId, contentId: 'tt0063350' }),
    });
    const session = await sessionRes.json();

    await new Promise((r) => setTimeout(r, 1150));

    const expiredRes = await fetch(`${srv.baseUrl}/api/playback/${session.sessionId}`, {
      headers: { Authorization: `Bearer ${session.token}` },
    });
    assert.equal(expiredRes.status, 410);
  } finally {
    await srv.close();
  }
});
