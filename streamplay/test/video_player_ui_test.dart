import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:streamplay/models/media_item.dart';
import 'package:streamplay/screens/movie_details/components/movie_episodes_section.dart';
import 'package:streamplay/screens/video_player/components/player_error_overlay.dart';

void main() {
  testWidgets('PlayerErrorOverlay shows Retry for network error and Refresh Session for expiry', (tester) async {
    var retried = false;
    var refreshed = false;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: PlayerErrorOverlay(
            message: 'Network interruption while loading video stream.',
            isExpired: false,
            hasAlternateSources: true,
            isRecovering: false,
            onRetry: () => retried = true,
            onRefreshSession: () => refreshed = true,
            onSwitchSource: () {},
            onClose: () {},
          ),
        ),
      ),
    );

    expect(find.text('Playback Interrupted'), findsOneWidget);
    expect(find.text('Retry Stream'), findsOneWidget);
    expect(find.text('Switch Source'), findsOneWidget);

    await tester.tap(find.text('Retry Stream'));
    expect(retried, isTrue);

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: PlayerErrorOverlay(
            message: 'Authorized playback URL expired.',
            isExpired: true,
            hasAlternateSources: false,
            isRecovering: false,
            onRetry: () {},
            onRefreshSession: () => refreshed = true,
            onClose: () {},
          ),
        ),
      ),
    );

    expect(find.text('Playback Session Expired'), findsOneWidget);
    expect(find.text('Refresh Session'), findsOneWidget);

    await tester.tap(find.text('Refresh Session'));
    expect(refreshed, isTrue);
  });

  testWidgets('MovieEpisodesSection switches seasons and invokes onPlayEpisode', (tester) async {
    EpisodeItem? played;
    final episodes = [
      EpisodeItem(id: 'ep1', name: 'Pilot', season: 1, number: 1, overview: 'First episode'),
      EpisodeItem(id: 'ep2', name: 'Second', season: 1, number: 2, overview: 'Second episode'),
      EpisodeItem(id: 'ep3', name: 'Return', season: 2, number: 1, overview: 'Season 2 premiere'),
    ];

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: MovieEpisodesSection(
              episodes: episodes,
              getProgress: (_) => null,
              onPlayEpisode: (ep) => played = ep,
            ),
          ),
        ),
      ),
    );

    expect(find.text('E1 • Pilot'), findsOneWidget);
    expect(find.text('E2 • Second'), findsOneWidget);

    await tester.tap(find.text('E2 • Second'));
    await tester.pump();
    expect(played?.id, 'ep2');
  });
}
