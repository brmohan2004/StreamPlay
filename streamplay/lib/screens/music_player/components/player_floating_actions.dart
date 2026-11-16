import 'package:flutter/material.dart';
import '../../../config/app_theme.dart';

class PlayerFloatingActions extends StatelessWidget {
  final int remainingTimerSec;
  final VoidCallback onOpenLyrics;
  final VoidCallback onOpenSleepTimer;
  final VoidCallback onOpenQueue;

  const PlayerFloatingActions({
    super.key,
    required this.remainingTimerSec,
    required this.onOpenLyrics,
    required this.onOpenSleepTimer,
    required this.onOpenQueue,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _buildFloatingPill(
          icon: Icons.subtitles_rounded,
          label: 'Lyrics',
          onTap: onOpenLyrics,
        ),
        const SizedBox(width: 8),
        _buildFloatingPill(
          icon: Icons.bedtime_rounded,
          label: remainingTimerSec > 0
              ? '${remainingTimerSec ~/ 60}m Left'
              : 'Sleep Timer',
          isActive: remainingTimerSec > 0,
          onTap: onOpenSleepTimer,
        ),
        const SizedBox(width: 8),
        _buildFloatingPill(
          icon: Icons.queue_music_rounded,
          label: 'Up Next',
          onTap: onOpenQueue,
        ),
      ],
    );
  }

  Widget _buildFloatingPill({
    required IconData icon,
    required String label,
    bool isActive = false,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: isActive ? AppTheme.musicLime.withValues(alpha: 0.2) : const Color(0xFF141916),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isActive ? AppTheme.musicLime : Colors.white12,
            width: 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: isActive ? AppTheme.musicLime : Colors.white70),
            const SizedBox(width: 5),
            Text(
              label,
              style: TextStyle(
                color: isActive ? AppTheme.musicLime : Colors.white70,
                fontSize: 11.5,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
