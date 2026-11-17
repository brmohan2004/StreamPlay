import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:streamplay/models/media_item.dart';
import 'package:streamplay/models/video_playback_models.dart';
import 'package:streamplay/screens/video_player/source_selector_sheet.dart';

void main() {
  final sampleMovie = MovieItem(
    id: 'tt1727587',
    name: 'Sintel',
    poster: 'https://example.com/sintel.jpg',
    releaseInfo: '2010',
  );

  testWidgets('displays exact unavailable message when no authorized sources exist', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SourceSelectorSheet(
            movie: sampleMovie,
            isLoading: false,
            sources: const [],
            onSelectSource: (_) {},
            onRetry: () {},
          ),
        ),
      ),
    );

    expect(find.text('Currently unavailable for streaming.'), findsOneWidget);
  });

  testWidgets('displays available authorized sources and triggers selection callback', (tester) async {
    VideoSourceItem? picked;
    final future = DateTime.now().toUtc().add(const Duration(hours: 1));
    final sources = [
      VideoSourceItem(
        sourceId: 's-hls',
        providerId: 'open-media-catalog',
        providerName: 'Open Cinema (CC Licensed)',
        contentId: 'tt1727587',
        playbackUrl: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
        format: VideoFormat.hls,
        quality: '1080p',
        audioLanguages: const ['English'],
        subtitleLanguages: const ['English', 'Español'],
        expiresAt: future,
        authorizationStatus: AuthorizationStatus.authorized,
      ),
      VideoSourceItem(
        sourceId: 's-dash',
        providerId: 'open-media-catalog',
        providerName: 'Open Cinema (CC Licensed)',
        contentId: 'tt1727587',
        playbackUrl: 'https://storage.googleapis.com/shaka-demo-assets/sintel/dash.mpd',
        format: VideoFormat.dash,
        quality: '1080p',
        audioLanguages: const ['English'],
        subtitleLanguages: const ['English'],
        expiresAt: future,
        authorizationStatus: AuthorizationStatus.authorized,
      ),
    ];

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SourceSelectorSheet(
            movie: sampleMovie,
            isLoading: false,
            sources: sources,
            onSelectSource: (s) => picked = s,
            onRetry: () {},
          ),
        ),
      ),
    );

    expect(find.text('HLS'), findsOneWidget);
    expect(find.text('DASH'), findsOneWidget);
    expect(find.text('BEST'), findsOneWidget);

    await tester.tap(find.text('DASH'));
    await tester.pump();

    expect(picked?.sourceId, 's-dash');
  });
}
