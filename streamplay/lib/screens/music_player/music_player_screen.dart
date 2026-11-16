import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
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

  Future<void> _confirmExitDriveMode(BuildContext context) async {
    final shouldExit = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF161E18),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: Colors.white12),
        ),
        title: const Row(
          children: [
            Icon(Icons.directions_car_rounded, color: AppTheme.musicLime, size: 24),
            SizedBox(width: 10),
            Text('Exit Drive Mode?', style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.bold)),
          ],
        ),
        content: const Text(
          'Do you want to exit Drive Mode and return to the standard music player?',
          style: TextStyle(color: Colors.white70, fontSize: 13.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('STAY', style: TextStyle(color: Colors.white54, fontWeight: FontWeight.bold)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.musicLime,
              foregroundColor: Colors.black,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('EXIT', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (shouldExit == true && mounted) {
      setState(() => _isDriveMode = false);
    }
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
      return PopScope(
        canPop: false,
        onPopInvokedWithResult: (didPop, _) {
          if (!didPop) _confirmExitDriveMode(context);
        },
        child: Scaffold(
          backgroundColor: AppTheme.pureBlack,
          body: Stack(
            children: [
              // Drive Mode Ambient Poster Background
              if (media.isDynamicPlayerBgEnabled && song.image.isNotEmpty)
                Positioned.fill(
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 650),
                    child: Stack(
                      key: ValueKey(song.id),
                      fit: StackFit.expand,
                      children: [
                        CachedNetworkImage(
                          imageUrl: song.image,
                          fit: BoxFit.cover,
                          errorWidget: (context, url, error) => const SizedBox.shrink(),
                        ),
                        BackdropFilter(
                          filter: ImageFilter.blur(sigmaX: 65, sigmaY: 65),
                          child: Container(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [
                                  Colors.black.withValues(alpha: 0.65),
                                  Colors.black.withValues(alpha: 0.85),
                                  Colors.black.withValues(alpha: 0.95),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

              SafeArea(
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
                            onPressed: () => _confirmExitDriveMode(context),
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
            ],
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
        body: Stack(
          children: [
            // Dynamic Poster Ambient Background
            if (media.isDynamicPlayerBgEnabled && song.image.isNotEmpty)
              Positioned.fill(
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 650),
                  child: Stack(
                    key: ValueKey(song.id),
                    fit: StackFit.expand,
                    children: [
                      CachedNetworkImage(
                        imageUrl: song.image,
                        fit: BoxFit.cover,
                        errorWidget: (context, url, error) => const SizedBox.shrink(),
                      ),
                      BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 65, sigmaY: 65),
                        child: Container(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [
                                Colors.black.withValues(alpha: 0.65),
                                Colors.black.withValues(alpha: 0.85),
                                Colors.black.withValues(alpha: 0.95),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

            SafeArea(
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

            if (!_showLyrics) const Spacer(flex: 1),

            // 2. Center Stage: In-Poster Synced Lyrics OR Video Mode OR Disc Stage
            if (_showLyrics)
              Expanded(
                child: PlayerLyricsStage(
                  song: song,
                  currentPosition: media.songPosition,
                  songDuration: media.songDuration,
                  onSeek: (pos) => media.seek(pos),
                  onClose: () => setState(() => _showLyrics = false),
                ),
              )
            else
              PlayerDiskStage(
                song: song,
                isVideoMode: _isVideoMode,
                onSwipeLeft: () => media.nextSong(),
                onSwipeRight: () => media.prevSong(),
              ),

            if (!_showLyrics) const Spacer(flex: 1),

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
          ],
        ),
      ),
    );
  }
}
