import 'package:flutter_test/flutter_test.dart';
import 'package:streamplay/models/video_playback_models.dart';

void main() {
  group('VideoSourceItem validation & parsing', () {
    test('accepts valid authorized non-expired HTTPS streams across MP4, HLS, DASH', () {
      final future = DateTime.now().toUtc().add(const Duration(hours: 1)).toIso8601String();

      for (final fmt in ['mp4', 'hls', 'dash']) {
        final item = VideoSourceItem.fromJson({
          'sourceId': 'src-$fmt',
          'providerId': 'open-media-catalog',
          'providerName': 'Open Cinema',
          'contentId': 'tt1727587',
          'mediaType': 'movie',
          'playbackUrl': 'https://cdn.example.com/sintel.$fmt',
          'format': fmt,
          'quality': '1080p',
          'audioLanguages': ['English', 'Spanish'],
          'subtitleLanguages': ['English', 'Français'],
          'expiresAt': future,
          'authorizationStatus': 'authorized',
        });

        expect(item.isHttps, isTrue);
        expect(item.isExpired, isFalse);
        expect(item.isAuthorizedAndValid, isTrue);
        expect(item.format, isNot(VideoFormat.unknown));
      }
    });

    test('rejects non-HTTPS, expired, or unauthorized sources', () {
      final future = DateTime.now().toUtc().add(const Duration(hours: 1)).toIso8601String();
      final past = DateTime.now().toUtc().subtract(const Duration(minutes: 5)).toIso8601String();

      final httpSource = VideoSourceItem.fromJson({
        'sourceId': 's1',
        'providerId': 'p1',
        'providerName': 'P1',
        'contentId': 'tt1254207',
        'playbackUrl': 'http://insecure.example.com/video.mp4',
        'format': 'mp4',
        'quality': '720p',
        'expiresAt': future,
        'authorizationStatus': 'authorized',
      });
      expect(httpSource.isHttps, isFalse);
      expect(httpSource.isAuthorizedAndValid, isFalse);

      final expiredSource = VideoSourceItem.fromJson({
        'sourceId': 's2',
        'providerId': 'p1',
        'providerName': 'P1',
        'contentId': 'tt1254207',
        'playbackUrl': 'https://cdn.example.com/video.mp4',
        'format': 'mp4',
        'quality': '720p',
        'expiresAt': past,
        'authorizationStatus': 'authorized',
      });
      expect(expiredSource.isExpired, isTrue);
      expect(expiredSource.isAuthorizedAndValid, isFalse);

      final unauthSource = VideoSourceItem.fromJson({
        'sourceId': 's3',
        'providerId': 'p1',
        'providerName': 'P1',
        'contentId': 'tt1254207',
        'playbackUrl': 'https://cdn.example.com/video.mp4',
        'format': 'mp4',
        'quality': '720p',
        'expiresAt': future,
        'authorizationStatus': 'unauthorized',
      });
      expect(unauthSource.isAuthorizedAndValid, isFalse);
    });
  });

  group('WatchProgress serialization & resume helpers', () {
    test('calculates progressRatio, canResume, and formats time cleanly', () {
      final wp = WatchProgress(
        contentId: 'tt1727587',
        mediaType: 'movie',
        title: 'Sintel',
        poster: 'https://example.com/poster.jpg',
        positionSeconds: 125,
        durationSeconds: 888,
        updatedAt: DateTime.utc(2026, 1, 1),
      );

      expect(wp.canResume, isTrue);
      expect(wp.isCompleted, isFalse);
      expect(wp.formattedPosition, '02:05');
      expect(wp.progressRatio, closeTo(125 / 888, 0.001));

      final restored = WatchProgress.fromJson(wp.toJson());
      expect(restored.contentId, wp.contentId);
      expect(restored.positionSeconds, 125);
      expect(restored.durationSeconds, 888);
    });

    test('builds distinct storage keys for series episodes', () {
      expect(WatchProgress.buildKey('tt12345'), 'tt12345');
      expect(WatchProgress.buildKey('tt12345', season: 2, episode: 5), 'tt12345:s2e5');
    });
  });
}
