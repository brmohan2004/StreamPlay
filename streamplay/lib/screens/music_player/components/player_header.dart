import 'package:flutter/material.dart';
import '../../../config/app_theme.dart';

class PlayerHeader extends StatelessWidget {
  final bool isVideoMode;
  final VoidCallback onToggleVideoMode;
  final VoidCallback onClose;
  final VoidCallback onOpenQueue;
  final VoidCallback onOpenOptions;

  const PlayerHeader({
    super.key,
    required this.isVideoMode,
    required this.onToggleVideoMode,
    required this.onClose,
    required this.onOpenQueue,
    required this.onOpenOptions,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // 1. Dismiss / Collapse chevron
          GestureDetector(
            onTap: onClose,
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.08),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.keyboard_arrow_down_rounded, color: Colors.white, size: 24),
            ),
          ),

          // 2. Audio vs Video Switcher Pill (Screenshot 12)
          Container(
            padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(
              color: const Color(0xFF101612),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white12),
            ),
            child: Row(
              children: [
                GestureDetector(
                  onTap: () {
                    if (isVideoMode) onToggleVideoMode();
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: !isVideoMode ? AppTheme.musicLime : Colors.transparent,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.music_note_rounded, size: 14, color: !isVideoMode ? Colors.black : Colors.white60),
                        const SizedBox(width: 4),
                        Text(
                          'Audio',
                          style: TextStyle(
                            color: !isVideoMode ? Colors.black : Colors.white60,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                GestureDetector(
                  onTap: () {
                    if (!isVideoMode) onToggleVideoMode();
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: isVideoMode ? AppTheme.musicLime : Colors.transparent,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.videocam_rounded, size: 14, color: isVideoMode ? Colors.black : Colors.white60),
                        const SizedBox(width: 4),
                        Text(
                          'Video',
                          style: TextStyle(
                            color: isVideoMode ? Colors.black : Colors.white60,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // 3. Queue & 3-Dots actions
          Row(
            children: [
              GestureDetector(
                onTap: onOpenQueue,
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.08),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.playlist_play_rounded, color: Colors.white, size: 20),
                ),
              ),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: onOpenOptions,
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.08),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.more_horiz_rounded, color: Colors.white, size: 20),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
