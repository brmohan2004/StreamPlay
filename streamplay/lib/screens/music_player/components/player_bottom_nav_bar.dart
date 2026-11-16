import 'package:flutter/material.dart';
import '../../../config/app_theme.dart';

/// Floating bottom navigation bar for the full-screen music player.
///
/// Features:
/// 1. Floating pill design with logos only (no text labels).
/// 2. Prominent elevated circular center button (Up Next queue).
/// 3. Left logo toggles in-poster lyrics with real-time audio sync.
/// 4. Right logo opens customizable sleep timer with active indicator.
class PlayerBottomNavBar extends StatelessWidget {
  final int remainingTimerSec;
  final bool isLyricsActive;
  final VoidCallback onToggleLyrics;
  final VoidCallback onOpenQueue;
  final VoidCallback onOpenSleepTimer;

  const PlayerBottomNavBar({
    super.key,
    required this.remainingTimerSec,
    this.isLyricsActive = false,
    required this.onToggleLyrics,
    required this.onOpenQueue,
    required this.onOpenSleepTimer,
  });

  @override
  Widget build(BuildContext context) {
    final hasActiveTimer = remainingTimerSec > 0;
    final timerMins = (remainingTimerSec + 59) ~/ 60;

    return Center(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        decoration: BoxDecoration(
          color: const Color(0xF2121715),
          borderRadius: BorderRadius.circular(36),
          border: Border.all(
            color: Colors.white.withValues(alpha: 0.12),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.6),
              blurRadius: 24,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            // 1. Left: Lyrics Logo (Toggles in-poster synced lyrics)
            _buildIconButton(
              icon: Icons.subtitles_rounded,
              tooltip: 'Lyrics',
              isActive: isLyricsActive,
              onTap: onToggleLyrics,
            ),

            const SizedBox(width: 20),

            // 2. Center: Elevated Circle Button (Up Next Queue)
            GestureDetector(
              onTap: onOpenQueue,
              child: Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppTheme.musicLime,
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.musicLime.withValues(alpha: 0.45),
                      blurRadius: 16,
                      spreadRadius: 1,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: const Center(
                  child: Icon(
                    Icons.queue_music_rounded,
                    color: Colors.black,
                    size: 26,
                  ),
                ),
              ),
            ),

            const SizedBox(width: 20),

            // 3. Right: Sleep Timer Logo
            Stack(
              clipBehavior: Clip.none,
              children: [
                _buildIconButton(
                  icon: Icons.bedtime_rounded,
                  tooltip: 'Sleep Timer',
                  isActive: hasActiveTimer,
                  onTap: onOpenSleepTimer,
                ),
                if (hasActiveTimer)
                  Positioned(
                    top: -4,
                    right: -4,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppTheme.musicLime,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${timerMins}m',
                        style: const TextStyle(
                          color: Colors.black,
                          fontSize: 9,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildIconButton({
    required IconData icon,
    required String tooltip,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: isActive ? AppTheme.musicLime.withValues(alpha: 0.16) : Colors.transparent,
          shape: BoxShape.circle,
        ),
        child: Icon(
          icon,
          size: 24,
          color: isActive ? AppTheme.musicLime : Colors.white70,
        ),
      ),
    );
  }
}
