import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:streamplay/models/video_playback_models.dart';
import 'package:streamplay/services/video_source_service.dart';

void main() {
  final futureIso = DateTime.now().toUtc().add(const Duration(hours: 1)).toIso8601String();

  test('fetchMovieSources filters out non-HTTPS sources and caches valid responses', () async {
    var callCount = 0;
    final mockClient = MockClient((request) async {
      callCount++;
      expect(request.url.path, '/api/movies/tt1727587/sources');
      return http.Response(
        json.encode({
          'contentId': 'tt1727587',
          'mediaType': 'movie',
          'available': true,
          'sources': [
            {
              'sourceId': 'valid-hls',
              'providerId': 'open-media-catalog',
              'providerName': 'Open Cinema',
              'contentId': 'tt1727587',
              'mediaType': 'movie',
              'playbackUrl': 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
              'format': 'hls',
              'quality': '1080p',
              'audioLanguages': ['English'],
              'subtitleLanguages': ['English', 'Español'],
              'expiresAt': futureIso,
              'authorizationStatus': 'authorized',
            },
            {
              'sourceId': 'blocked-http',
              'providerId': 'bad-provider',
              'providerName': 'Bad',
              'contentId': 'tt1727587',
              'mediaType': 'movie',
              'playbackUrl': 'http://insecure.example.com/sintel.mp4',
              'format': 'mp4',
              'quality': '720p',
              'expiresAt': futureIso,
              'authorizationStatus': 'authorized',
            },
          ],
        }),
        200,
      );
    });

    final service = VideoSourceService(baseUrl: 'http://127.0.0.1:4100', client: mockClient);

    final first = await service.fetchMovieSources(movieId: 'tt1727587', title: 'Sintel');
    expect(first.isAvailable, isTrue);
    expect(first.sources.length, 1);
    expect(first.sources.first.sourceId, 'valid-hls');
    expect(first.fromCache, isFalse);

    final second = await service.fetchMovieSources(movieId: 'tt1727587', title: 'Sintel');
    expect(second.fromCache, isTrue);
    expect(callCount, 1);
  });

  test('createPlaybackSession, fetchSessionSubtitles, and fetchSessionAudioTracks pass auth headers', () async {
    final mockClient = MockClient((request) async {
      if (request.method == 'POST' && request.url.path == '/api/playback/session') {
        final body = json.decode(request.body) as Map<String, dynamic>;
        expect(body['sourceId'], 'src-hls-1');
        expect(body.containsKey('playbackUrl'), isFalse);
        return http.Response(
          json.encode({
            'sessionId': 'sess-123',
            'token': 'signed-token-abc',
            'expiresAt': futureIso,
            'createdAt': DateTime.now().toUtc().toIso8601String(),
            'source': {
              'sourceId': 'src-hls-1',
              'providerId': 'open-media-catalog',
              'providerName': 'Open Cinema',
              'contentId': 'tt1727587',
              'mediaType': 'movie',
              'playbackUrl': 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
              'format': 'hls',
              'quality': '1080p',
              'expiresAt': futureIso,
              'authorizationStatus': 'authorized',
            },
            'subtitles': [],
            'audioTracks': [],
          }),
          201,
        );
      }

      if (request.url.path == '/api/playback/sess-123/subtitles') {
        expect(request.headers['Authorization'], 'Bearer signed-token-abc');
        return http.Response(
          json.encode({
            'sessionId': 'sess-123',
            'subtitles': [
              {
                'id': 'sub-en',
                'language': 'en',
                'label': 'English',
                'url': 'https://bitdash-a.akamaihd.net/content/sintel/subtitles/subtitles_en.vtt',
                'format': 'vtt',
                'isDefault': true,
                'isExternal': true,
              },
            ],
          }),
          200,
        );
      }

      if (request.url.path == '/api/playback/sess-123/audio') {
        expect(request.headers['Authorization'], 'Bearer signed-token-abc');
        return http.Response(
          json.encode({
            'sessionId': 'sess-123',
            'audioTracks': [
              {
                'id': 'aud-en',
                'language': 'en',
                'label': 'English (5.1)',
                'channels': '5.1',
                'codec': 'AAC',
                'isDefault': true,
              },
            ],
          }),
          200,
        );
      }

      return http.Response('{"error":"NOT_FOUND"}', 404);
    });

    final service = VideoSourceService(baseUrl: 'http://127.0.0.1:4100', client: mockClient);
    final source = VideoSourceItem(
      sourceId: 'src-hls-1',
      providerId: 'open-media-catalog',
      providerName: 'Open Cinema',
      contentId: 'tt1727587',
      playbackUrl: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
      format: VideoFormat.hls,
      quality: '1080p',
      expiresAt: DateTime.parse(futureIso),
      authorizationStatus: AuthorizationStatus.authorized,
    );

    final session = await service.createPlaybackSession(source: source, title: 'Sintel');
    expect(session.sessionId, 'sess-123');

    final subs = await service.fetchSessionSubtitles(
      sessionId: session.sessionId,
      token: session.token,
    );
    expect(subs.length, 1);
    expect(subs.first.language, 'en');

    final audio = await service.fetchSessionAudioTracks(
      sessionId: session.sessionId,
      token: session.token,
    );
    expect(audio.length, 1);
    expect(audio.first.channels, '5.1');
  });

  test('throws VideoSourceException with isExpired=true on HTTP 410', () async {
    final mockClient = MockClient((_) async {
      return http.Response(
        json.encode({'error': 'SESSION_EXPIRED', 'message': 'Playback session has expired.'}),
        410,
      );
    });

    final service = VideoSourceService(baseUrl: 'http://127.0.0.1:4100', client: mockClient);
    await expectLater(
      service.getPlaybackSession(sessionId: 'old-id', token: 'tok'),
      throwsA(isA<VideoSourceException>().having((e) => e.isExpired, 'isExpired', isTrue)),
    );
  });
}
