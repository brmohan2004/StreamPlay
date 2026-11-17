import test from 'node:test';
import assert from 'node:assert/strict';
import { ProviderAdapter } from '../src/core/ProviderAdapter.js';
import { ProviderRegistry } from '../src/core/ProviderRegistry.js';
import { SourceValidator, isSafePublicHttpsUrl } from '../src/core/SourceValidator.js';
import { SourceSelector } from '../src/core/SourceSelector.js';
import { SourceResolver } from '../src/core/SourceResolver.js';
import { PlaybackSessionManager } from '../src/core/PlaybackSessionManager.js';
import { ArchiveOrgProviderAdapter } from '../src/providers/ArchiveOrgProviderAdapter.js';
import { WikimediaCommonsProviderAdapter } from '../src/providers/WikimediaCommonsProviderAdapter.js';
import { PartnerApiProviderAdapter } from '../src/providers/PartnerApiProviderAdapter.js';

class MockAuthorizedProvider extends ProviderAdapter {
  constructor(id, sources, priority = 50) {
    super({ id, name: `Mock ${id}`, priority, enabled: true });
    this._sources = sources;
  }
  async searchContent() {
    return [];
  }
  async getSources() {
    return this._sources;
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

test('SourceValidator enforces HTTPS-only, rejects SSRF, embeds, unauthorized and expired URLs', async () => {
  const validator = new SourceValidator({ validateUpstreamHead: false });
  const future = new Date(Date.now() + 60_000).toISOString();
  const past = new Date(Date.now() - 60_000).toISOString();

  assert.equal(isSafePublicHttpsUrl('http://cdn.example.com/video.mp4').ok, false);
  assert.equal(isSafePublicHttpsUrl('https://127.0.0.1/video.mp4').ok, false);
  assert.equal(isSafePublicHttpsUrl('https://localhost/video.mp4').ok, false);
  assert.equal(isSafePublicHttpsUrl('https://192.168.1.5/video.mp4').ok, false);
  assert.equal(isSafePublicHttpsUrl('https://cdn.example.com/video.mp4').ok, true);

  const embedCheck = await validator.validate({
    providerId: 'p1',
    contentId: 'tt0063350',
    playbackUrl: 'https://player.example.com/embed/12345',
    format: 'hls',
    expiresAt: future,
    authorizationStatus: 'authorized',
  });
  assert.equal(embedCheck.valid, false);

  const expiredCheck = await validator.validate({
    providerId: 'p1',
    contentId: 'tt0063350',
    playbackUrl: 'https://cdn.example.com/video.mp4',
    format: 'mp4',
    expiresAt: past,
    authorizationStatus: 'authorized',
  });
  assert.equal(expiredCheck.valid, false);

  const unauthorizedCheck = await validator.validate({
    providerId: 'p1',
    contentId: 'tt0063350',
    playbackUrl: 'https://cdn.example.com/video.mp4',
    format: 'mp4',
    expiresAt: future,
    authorizationStatus: 'unauthorized',
  });
  assert.equal(unauthorizedCheck.valid, false);

  const validCheck = await validator.validate({
    providerId: 'p1',
    contentId: 'tt0063350',
    playbackUrl: 'https://cdn.example.com/stream/master.m3u8',
    format: 'hls',
    expiresAt: future,
    authorizationStatus: 'authorized',
  });
  assert.equal(validCheck.valid, true);
});

test('ArchiveOrgProviderAdapter dynamically discovers public-domain MP4 & VTT subtitles for clicked title', async () => {
  const mockFetch = async (url) => {
    const s = String(url);
    if (s.includes('advancedsearch.php')) {
      return {
        ok: true,
        json: async () => ({
          response: {
            docs: [
              {
                identifier: 'night_of_the_living_dead_1968',
                title: 'Night of the Living Dead',
                year: 1968,
              },
            ],
          },
        }),
      };
    }
    if (s.includes('/metadata/night_of_the_living_dead_1968')) {
      return {
        ok: true,
        json: async () => ({
          metadata: {
            collection: ['feature_films'],
            licenseurl: 'https://creativecommons.org/publicdomain/mark/1.0/',
            language: 'English',
          },
          files: [
            { name: 'night_hd.mp4', format: 'MPEG4', height: '720', size: '500000000' },
            { name: 'night_en.vtt', format: 'WebVTT', size: '45000' },
          ],
        }),
      };
    }
    return { ok: false };
  };

  const adapter = new ArchiveOrgProviderAdapter({ fetchImpl: mockFetch });
  const sources = await adapter.getSources({
    contentId: 'tt0063350',
    mediaType: 'movie',
    title: 'Night of the Living Dead',
    year: 1968,
  });

  assert.equal(sources.length, 1);
  assert.equal(sources[0].format, 'mp4');
  assert.equal(sources[0].quality, '720p');
  assert.ok(sources[0].playbackUrl.startsWith('https://archive.org/download/'));
  assert.equal(sources[0].subtitles.length, 1);
  assert.equal(sources[0].subtitles[0].format, 'vtt');
});

test('WikimediaCommonsProviderAdapter dynamically resolves open-licensed MP4 films', async () => {
  const mockFetch = async () => ({
    ok: true,
    json: async () => ({
      query: {
        pages: {
          101: {
            title: 'File:Charade (1963).mp4',
            imageinfo: [
              {
                url: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Charade_%281963%29.mp4',
                mime: 'video/mp4',
                size: 850000000,
                height: 720,
                duration: 6780,
                extmetadata: {
                  LicenseShortName: { value: 'Public domain' },
                },
              },
            ],
          },
        },
      },
    }),
  });

  const adapter = new WikimediaCommonsProviderAdapter({ fetchImpl: mockFetch });
  const sources = await adapter.getSources({
    contentId: 'tt0056923',
    mediaType: 'movie',
    title: 'Charade',
  });

  assert.equal(sources.length, 1);
  assert.equal(sources[0].format, 'mp4');
  assert.equal(sources[0].quality, '720p');
  assert.ok(sources[0].playbackUrl.startsWith('https://upload.wikimedia.org/'));
});

test('PartnerApiProviderAdapter forwards server-side API key and resolves HLS/DASH/MP4', async () => {
  const future = new Date(Date.now() + 120_000).toISOString();
  let capturedAuth = '';
  const mockFetch = async (_url, init) => {
    capturedAuth = init?.headers?.Authorization ?? '';
    return {
      ok: true,
      json: async () => ({
        sources: [
          {
            playbackUrl: 'https://partner-cdn.example.com/hls/master.m3u8',
            format: 'hls',
            quality: '2160p',
            audioLanguages: ['English', 'Tamil'],
            subtitleLanguages: ['English'],
            expiresAt: future,
            authorizationStatus: 'authorized',
          },
        ],
      }),
    };
  };

  const adapter = new PartnerApiProviderAdapter({
    baseUrl: 'https://partner-api.example.com',
    apiKey: 'secret-partner-token',
    enabled: true,
    fetchImpl: mockFetch,
  });

  const sources = await adapter.getSources({ contentId: 'tt1234567', mediaType: 'movie' });
  assert.equal(capturedAuth, 'Bearer secret-partner-token');
  assert.equal(sources.length, 1);
  assert.equal(sources[0].format, 'hls');
  assert.equal(sources[0].quality, '2160p');
});

test('SourceResolver aggregates multiple providers, filters invalid sources, caches, and ranks', async () => {
  const registry = new ProviderRegistry();
  const future = new Date(Date.now() + 120_000).toISOString();

  registry.register(
    new MockAuthorizedProvider(
      'primary-authorized',
      [
        {
          contentId: 'tt0063350',
          mediaType: 'movie',
          playbackUrl: 'https://cdn.primary.example.com/film/master.m3u8',
          format: 'hls',
          quality: '2160p',
          audioLanguages: ['English', 'Spanish'],
          subtitleLanguages: ['English'],
          expiresAt: future,
          authorizationStatus: 'authorized',
        },
        {
          // Must be filtered out because HTTP (not HTTPS)
          contentId: 'tt0063350',
          mediaType: 'movie',
          playbackUrl: 'http://insecure.example.com/film.mp4',
          format: 'mp4',
          quality: '1080p',
          expiresAt: future,
          authorizationStatus: 'authorized',
        },
      ],
      10
    )
  );

  registry.register(
    new MockAuthorizedProvider(
      'secondary-authorized',
      [
        {
          contentId: 'tt0063350',
          mediaType: 'movie',
          playbackUrl: 'https://cdn.secondary.example.com/film/manifest.mpd',
          format: 'dash',
          quality: '1080p',
          audioLanguages: ['English'],
          subtitleLanguages: ['English'],
          expiresAt: future,
          authorizationStatus: 'authorized',
        },
      ],
      20
    )
  );

  const resolver = new SourceResolver({
    registry,
    validator: new SourceValidator({ validateUpstreamHead: false }),
    selector: new SourceSelector(),
    providerTimeoutMs: 4000,
    cacheTtlSeconds: 60,
  });

  const first = await resolver.resolve(
    { contentId: 'tt0063350', mediaType: 'movie', title: 'Night of the Living Dead' },
    { preferredQuality: '4k' }
  );

  assert.equal(first.fromCache, false);
  assert.equal(first.sources.length, 2);
  assert.equal(first.sources[0].providerId, 'primary-authorized');
  assert.equal(first.sources[0].quality, '2160p');

  const second = await resolver.resolve(
    { contentId: 'tt0063350', mediaType: 'movie', title: 'Night of the Living Dead' },
    { preferredQuality: '4k' }
  );
  assert.equal(second.fromCache, true);
});

test('PlaybackSessionManager signs, verifies, and rejects invalid/expired sessions', async () => {
  const validator = new SourceValidator({ validateUpstreamHead: false });
  const manager = new PlaybackSessionManager({
    signingSecret: 'super-secret-signing-key-for-tests-1234',
    sessionTtlSeconds: 60,
    validator,
  });

  const validSource = {
    sourceId: 'src-1',
    providerId: 'partner-licensed-api',
    providerName: 'Partner CDN',
    contentId: 'tt0063350',
    mediaType: 'movie',
    playbackUrl: 'https://cdn.example.com/movie/hls/playlist.m3u8',
    format: 'hls',
    quality: '1080p',
    subtitles: [
      {
        id: 'en',
        language: 'en',
        label: 'English',
        url: 'https://cdn.example.com/movie/subtitles/en.vtt',
        format: 'vtt',
        isExternal: true,
      },
    ],
    audioTracks: [{ id: 'a1', language: 'en', label: 'English', channels: '5.1' }],
    expiresAt: new Date(Date.now() + 120_000).toISOString(),
    authorizationStatus: 'authorized',
  };

  const session = await manager.createSession({ source: validSource });
  assert.ok(session.sessionId);
  assert.ok(session.token);

  const fetched = manager.getSession(session.sessionId, session.token);
  assert.equal(fetched.source.sourceId, 'src-1');

  const subs = manager.getSubtitles(session.sessionId, session.token);
  assert.equal(subs.subtitles.length, 1);

  const audio = manager.getAudioTracks(session.sessionId, session.token);
  assert.equal(audio.audioTracks.length, 1);

  assert.throws(() => manager.getSession(session.sessionId, 'wrong-token'), /Invalid playback authorization token/);

  const expiredSource = { ...validSource, expiresAt: new Date(Date.now() - 1000).toISOString() };
  await assert.rejects(() => manager.createSession({ source: expiredSource }), /expired/i);

  manager.dispose();
});
