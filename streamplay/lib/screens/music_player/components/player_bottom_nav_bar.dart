import 'package:flutter/material.dart';
import '../../../config/app_theme.dart';

class PlayerBottomNavBar extends StatelessWidget {
  final int remainingTimerSec;
  final VoidCallback onOpenLyrics;
  final VoidCallback onOpenQueue;
  final VoidCallback onOpenSleepTimer;

  const PlayerBottomNavBar({
    super.key,
    required this.remainingTimerSec,
    required this.onOpenLyrics,
    required this.onOpenQueue,
    required this.onOpenSleepTimer,
  });

  @override
  Widget build(BuildContext context) {
    final hasActiveTimer = remainingTimerSec > 0;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF121714),
        borderRadius: BorderRadius.circular(26),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.12),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.45),
            blurRadius: 18,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          // 1. Lyrics
          _buildNavItem(
            icon: Icons.subtitles_rounded,
            label: 'Lyrics',
            isActive: false,
            onTap: onOpenLyrics,
          ),

          // Divider
          Container(
            width: 1,
            height: 24,
            color: Colors.white.withValues(alpha: 0.08),
          ),

          // 2. Up Next
          _buildNavItem(
            icon: Icons.queue_music_rounded,
            label: 'Up Next',
            isActive: false,
            onTap: onOpenQueue,
          ),

          // Divider
          Container(
            width: 1,
            height: 24,
            color: Colors.white.withValues(alpha: 0.08),
          ),

          // 3. Sleep Timer
          _buildNavItem(
            icon: Icons.bedtime_rounded,
            label: hasActiveTimer
                ? '${remainingTimerSec ~/ 60}m Left'
                : 'Sleep Timer',
            isActive: hasActiveTimer,
            onTap: onOpenSleepTimer,
          ),
        ],
      ),
    );
  }

  Widget _buildNavItem({
    required IconData icon,
    required String label,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    final color = isActive ? AppTheme.musicLime : Colors.white.withValues(alpha: 0.78);

    return Expanded(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 16,
                color: color,
              ),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: color,
                    fontSize: 12,
                    fontWeight: isActive ? FontWeight.bold : FontWeight.w600,
                    letterSpacing: -0.1,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
