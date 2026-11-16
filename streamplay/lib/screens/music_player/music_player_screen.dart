import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../models/media_item.dart';
import '../../providers/media_provider.dart';
import 'components/player_header.dart';
import 'components/player_disk_stage.dart';
import 'components/player_info_section.dart';
import 'components/player_arc_scrubber.dart';
import 'components/player_playback_controls.dart';
import 'components/player_bottom_nav_bar.dart';
import 'components/player_options_modal.dart';
import 'components/player_sleep_timer_modal.dart';
import 'components/player_queue_sheet.dart';
import 'components/player_lyrics_stage.dart';

class MusicPlayerScreen extends StatefulWidget {
  final VoidCallback? onDismiss;

  const MusicPlayerScreen({super.key, this.onDismiss});

  @override
  State<MusicPlayerScreen> createState() => _MusicPlayerScreenState();
}

class _MusicPlayerScreenState extends State<MusicPlayerScreen> {
  bool _isVideoMode = false;
  bool _isDriveMode = false;
  bool _showLyrics = false;

  void _handleClose(MediaProvider media) {
    if (widget.onDismiss != null) {
      widget.onDismiss!();
    } else {
      media.closeMusicPlayer();
    }
  }

  void _openOptionsMenu(BuildContext context, SongItem song, MediaProvider media) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => PlayerOptionsModal(
        song: song,
        media: media,
        onActivateDriveMode: () => setState(() => _isDriveMode = true),
      ),
    );
  }

  void _openSleepTimerSheet(BuildContext context, MediaProvider media) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => PlayerSleepTimerModal(media: media),
    );
  }

  void _openQueueSheet(BuildContext context, MediaProvider media) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => PlayerQueueSheet(media: media),
    );
  }

  @override
  Widget build(BuildContext context) {
    final media = context.watch<MediaProvider>();
    final song = media.currentSong;

    if (song == null) {
      return const SizedBox.shrink();
    }

    final isPlaying = media.isPlayingSong;
    final isLiked = media.isLikedSong(song.id);
    final queue = media.currentQueue;
    final currentIndex = queue.indexWhere((s) => s.id == song.id);

    SongItem? prevSong;
    SongItem? nextSong;
    if (queue.isNotEmpty && currentIndex != -1) {
      if (currentIndex > 0) prevSong = queue[currentIndex - 1];
      if (currentIndex < queue.length - 1) nextSong = queue[currentIndex + 1];
    }

    // Drive Mode View
    if (_isDriveMode) {
      return Scaffold(
        backgroundColor: Colors.black,
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: Colors.white, size: 28),
                      onPressed: () => setState(() => _isDriveMode = false),
                    ),
                    const Text('DRIVE MODE', style: TextStyle(color: AppTheme.musicLime, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
                    const SizedBox(width: 48),
                  ],
                ),
                Column(
                  children: [
                    Text(song.title, maxLines: 2, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    Text(song.artist, style: const TextStyle(color: AppTheme.textMuted, fontSize: 18)),
                  ],
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    IconButton(
                      iconSize: 48,
                      icon: const Icon(Icons.skip_previous_rounded, color: Colors.white),
                      onPressed: () => media.prevSong(),
                    ),
                    GestureDetector(
                      onTap: () => media.togglePlay(),
                      child: Container(
                        width: 90,
                        height: 90,
                        decoration: const BoxDecoration(
                          color: AppTheme.musicLime,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded, color: Colors.black, size: 52),
                      ),
                    ),
                    IconButton(
                      iconSize: 48,
                      icon: const Icon(Icons.skip_next_rounded, color: Colors.white),
                      onPressed: () => media.nextSong(),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      );
    }

    return GestureDetector(
      onVerticalDragEnd: (details) {
        if ((details.primaryVelocity ?? 0) > 250) {
          _handleClose(media);
        }
      },
      behavior: HitTestBehavior.translucent,
      child: Scaffold(
        backgroundColor: AppTheme.pureBlack,
        body: SafeArea(
          top: true,
          bottom: true,
          child: Column(
          children: [
            // 1. Top Header Bar (Screenshot 12)
            PlayerHeader(
              isVideoMode: _isVideoMode,
              onToggleVideoMode: () {
                setState(() {
                  _isVideoMode = !_isVideoMode;
                  if (_isVideoMode) {
                    media.pauseSong();
                  } else {
                    media.resumeSong();
                  }
                });
              },
              onClose: () => _handleClose(media),
              onOpenQueue: () => _openQueueSheet(context, media),
              onOpenOptions: () => _openOptionsMenu(context, song, media),
            ),

            const Spacer(flex: 1),

            // 2. Center Stage: In-Poster Synced Lyrics OR Video Mode OR Disc Stage
            if (_showLyrics)
              PlayerLyricsStage(
                song: song,
                currentPosition: media.songPosition,
                songDuration: media.songDuration,
                onSeek: (pos) => media.seek(pos),
                onClose: () => setState(() => _showLyrics = false),
              )
            else
              PlayerDiskStage(
                song: song,
                isVideoMode: _isVideoMode,
                onSwipeLeft: () => media.nextSong(),
                onSwipeRight: () => media.prevSong(),
              ),

            const Spacer(flex: 1),

                  // 3. Track Info (Track #, non-overlapping titles, artist/album)
                  PlayerInfoSection(
                    song: song,
                    prevSong: prevSong,
                    nextSong: nextSong,
                    trackNumber: currentIndex >= 0 ? currentIndex + 1 : 1,
                  ),

                  const SizedBox(height: 10),

                  // 4. Arc Scrubber with glowing progress dot & time counters
                  StreamBuilder<Duration>(
                    stream: media.positionStream,
                    builder: (context, posSnap) {
                      final pos = posSnap.data ?? Duration.zero;
                      return StreamBuilder<Duration?>(
                        stream: media.durationStream,
                        builder: (context, durSnap) {
                          final dur = durSnap.data ?? (song.duration > 0 ? Duration(seconds: song.duration) : Duration.zero);
                          return PlayerArcScrubber(
                            position: pos,
                            duration: dur,
                            isLiked: isLiked,
                            onSeek: (newPos) => media.seek(newPos),
                            onToggleLike: () => media.toggleLikeSong(song.id),
                          );
                        },
                      );
                    },
                  ),

                  const SizedBox(height: 4),

                  // 5s Transition Delay Pill Indicator (with instant tap-to-play)
                  if (media.isSwitchingSong)
                    GestureDetector(
                      onTap: () => media.skipDelayAndPlay(),
                      child: Container(
                        margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 4),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFB703).withValues(alpha: 0.16),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFFFFB703).withValues(alpha: 0.5)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.timer_outlined, size: 14, color: Color(0xFFFFB703)),
                            const SizedBox(width: 6),
                            Text(
                              'Next track in ${media.switchDelaySecondsRemaining}s • Tap to play now',
                              style: const TextStyle(
                                color: Color(0xFFFFB703),
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                  // 5. Primary Playback Controls
                  PlayerPlaybackControls(
                    isPlaying: isPlaying,
                    isShuffle: media.isShuffle,
                    loopMode: media.loopMode,
                    onToggleShuffle: () => media.toggleShuffle(),
                    onPrev: () => media.prevSong(),
                    onTogglePlay: () => media.togglePlay(),
                    onNext: () => media.nextSong(),
                    onToggleRepeat: () => media.toggleRepeat(),
                  ),

                  const SizedBox(height: 10),

            // 6. Floating Bottom Navigation Bar (Logos Only, Elevated Center Button)
            PlayerBottomNavBar(
              remainingTimerSec: media.remainingSleepTimerSeconds,
              isLyricsActive: _showLyrics,
              onToggleLyrics: () => setState(() => _showLyrics = !_showLyrics),
              onOpenQueue: () => _openQueueSheet(context, media),
              onOpenSleepTimer: () => _openSleepTimerSheet(context, media),
            ),

                  const SizedBox(height: 8),
                ],
              ),
            ),
          ),
        );
  }
}
