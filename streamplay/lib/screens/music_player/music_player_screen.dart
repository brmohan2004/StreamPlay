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
import 'components/player_lyrics_modal.dart';
import 'components/player_sleep_timer_modal.dart';
import 'components/player_queue_sheet.dart';

class MusicPlayerScreen extends StatefulWidget {
  const MusicPlayerScreen({super.key});

  @override
  State<MusicPlayerScreen> createState() => _MusicPlayerScreenState();
}

class _MusicPlayerScreenState extends State<MusicPlayerScreen> {
  bool _isVideoMode = false;
  bool _isDriveMode = false;

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

  void _openLyricsSheet(BuildContext context, SongItem song) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => PlayerLyricsModal(song: song),
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
          media.closeMusicPlayer();
        }
      },
      behavior: HitTestBehavior.translucent,
      child: Container(
        decoration: BoxDecoration(
          color: AppTheme.pureBlack,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
          border: Border(
            top: BorderSide(
              color: Colors.white.withValues(alpha: 0.12),
              width: 1,
            ),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.8),
              blurRadius: 36,
              spreadRadius: 4,
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
          child: Scaffold(
            backgroundColor: Colors.transparent,
            body: SafeArea(
              child: Column(
                children: [
                  // Top Pull-Down Pill Indicator (Sheet Handle)
                  GestureDetector(
                    onTap: () => media.closeMusicPlayer(),
                    child: Container(
                      color: Colors.transparent,
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Center(
                        child: Container(
                          width: 40,
                          height: 4.5,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.32),
                            borderRadius: BorderRadius.circular(3),
                          ),
                        ),
                      ),
                    ),
                  ),

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
                    onClose: () => media.closeMusicPlayer(),
                    onOpenQueue: () => _openQueueSheet(context, media),
                    onOpenOptions: () => _openOptionsMenu(context, song, media),
                  ),

                  const Spacer(flex: 1),

                  // 2. Center Disk Stage / Video Mode with horizontal swipe gestures & swipe down to minimize
                  PlayerDiskStage(
                    song: song,
                    isVideoMode: _isVideoMode,
                    onSwipeLeft: () => media.nextSong(),
                    onSwipeRight: () => media.prevSong(),
                    onSwipeDown: () => media.closeMusicPlayer(),
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
                      onTap: () => media.togglePlay(),
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

                  // 6. Bottom Navigation Bar (Lyrics, Up Next, Sleep Timer)
                  PlayerBottomNavBar(
                    remainingTimerSec: media.remainingSleepTimerSeconds,
                    onOpenLyrics: () => _openLyricsSheet(context, song),
                    onOpenQueue: () => _openQueueSheet(context, media),
                    onOpenSleepTimer: () => _openSleepTimerSheet(context, media),
                  ),

                  const SizedBox(height: 8),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
