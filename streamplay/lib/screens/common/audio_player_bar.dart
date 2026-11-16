import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../config/app_theme.dart';
import '../../providers/media_provider.dart';
import '../../providers/navigation_provider.dart';

class AudioPlayerBar extends StatelessWidget {
  const AudioPlayerBar({super.key});

  @override
  Widget build(BuildContext context) {
    final media = context.watch<MediaProvider>();
    final nav = context.watch<NavigationProvider>();

    final song = media.currentSong;
    if (song == null) return const SizedBox.shrink();

    // If movie details screen is active, hide mini bar
    if (nav.activeScreen == ScreenName.details) {
      return const SizedBox.shrink();
    }

    final totalSec = media.songDuration.inSeconds;
    final currentSec = media.songPosition.inSeconds;
    final progress = totalSec > 0 ? (currentSec / totalSec).clamp(0.0, 1.0) : 0.0;

    return Align(
      alignment: Alignment.bottomCenter,
      child: SafeArea(
        child: Container(
          margin: const EdgeInsets.only(bottom: 84, left: 14, right: 14),
          decoration: BoxDecoration(
            color: const Color(0xF2121724), // High opacity dark slate
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.white.withValues(alpha: 0.12), width: 1),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.7),
                blurRadius: 20,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Top Progress Bar
                LinearProgressIndicator(
                  value: media.isSwitchingSong
                      ? (1.0 - (media.switchDelaySecondsRemaining / 5.0)).clamp(0.0, 1.0)
                      : progress,
                  backgroundColor: Colors.white.withValues(alpha: 0.08),
                  valueColor: AlwaysStoppedAnimation<Color>(
                    media.isSwitchingSong ? const Color(0xFFFFB703) : AppTheme.musicLime,
                  ),
                  minHeight: 2.5,
                ),

                // Player Content
                GestureDetector(
                  onTap: () {
                    media.openMusicPlayer();
                  },
                  behavior: HitTestBehavior.opaque,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    child: Row(
                      children: [
                        // Album Art
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: CachedNetworkImage(
                            imageUrl: song.image,
                            width: 44,
                            height: 44,
                            fit: BoxFit.cover,
                            placeholder: (context, url) => Container(color: AppTheme.cardDark),
                            errorWidget: (context, url, error) => const Icon(Icons.music_note, color: Colors.white54),
                          ),
                        ),
                        const SizedBox(width: 12),

                        // Title & Artist
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                song.title,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      song.artist,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        color: AppTheme.textMuted,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ),
                                  if (media.isSwitchingSong)
                                    Container(
                                      margin: const EdgeInsets.only(left: 6),
                                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFFFB703).withValues(alpha: 0.2),
                                        borderRadius: BorderRadius.circular(4),
                                        border: Border.all(color: const Color(0xFFFFB703).withValues(alpha: 0.6)),
                                      ),
                                      child: Text(
                                        'Next in ${media.switchDelaySecondsRemaining}s',
                                        style: const TextStyle(
                                          color: Color(0xFFFFB703),
                                          fontSize: 9,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    )
                                  else
                                    Container(
                                      margin: const EdgeInsets.only(left: 6),
                                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                      decoration: BoxDecoration(
                                        color: AppTheme.musicLime.withValues(alpha: 0.16),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: const Text(
                                        '320k',
                                        style: TextStyle(
                                          color: AppTheme.musicLime,
                                          fontSize: 9,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ],
                          ),
                        ),

                        // Controls
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.skip_previous_rounded, size: 24, color: Colors.white),
                              onPressed: () => media.prevSong(),
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                            ),
                            const SizedBox(width: 8),
                            IconButton(
                              icon: Icon(
                                media.isSwitchingSong
                                    ? Icons.play_circle_fill_rounded
                                    : (media.isPlayingSong
                                        ? Icons.pause_circle_filled_rounded
                                        : Icons.play_circle_fill_rounded),
                                size: 36,
                                color: media.isSwitchingSong
                                    ? const Color(0xFFFFB703)
                                    : AppTheme.musicLime,
                              ),
                              onPressed: () => media.togglePlay(),
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                            ),
                            const SizedBox(width: 8),
                            IconButton(
                              icon: const Icon(Icons.skip_next_rounded, size: 24, color: Colors.white),
                              onPressed: () => media.nextSong(),
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                            ),
                            const SizedBox(width: 8),
                            // Cancel / Dismiss Player Button (Enlarged Touch Target)
                            GestureDetector(
                              onTap: () => media.stopAndDismissPlayer(),
                              behavior: HitTestBehavior.opaque,
                              child: Container(
                                width: 34,
                                height: 34,
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.12),
                                  shape: BoxShape.circle,
                                  border: Border.all(color: Colors.white12, width: 1),
                                ),
                                child: const Icon(
                                  Icons.close_rounded,
                                  size: 20,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
