import 'package:flutter/material.dart';
import '../../../config/app_theme.dart';
import '../../../models/media_item.dart';

class MovieActionButtons extends StatelessWidget {
  final MovieItem movie;
  final bool isSaved;
  final String playLabel;
  final bool isLoading;
  final VoidCallback onPlayFullScreen;
  final VoidCallback onToggleWatchLater;
  final VoidCallback onShare;

  const MovieActionButtons({
    super.key,
    required this.movie,
    required this.isSaved,
    this.playLabel = 'Play Movie Full Screen',
    this.isLoading = false,
    required this.onPlayFullScreen,
    required this.onToggleWatchLater,
    required this.onShare,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: [
          // 1. Big Full-Width White Play Button (Screenshot 11)
          GestureDetector(
            onTap: isLoading ? null : onPlayFullScreen,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(28),
                boxShadow: [
                  BoxShadow(
                    color: Colors.white.withValues(alpha: 0.2),
                    blurRadius: 16,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (isLoading) ...[
                    const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        color: Colors.black,
                        strokeWidth: 2.2,
                      ),
                    ),
                    const SizedBox(width: 10),
                  ] else ...[
                    const Icon(Icons.play_arrow_rounded, color: Colors.black, size: 24),
                    const SizedBox(width: 8),
                  ],
                  Text(
                    isLoading ? 'Checking Authorized Sources...' : playLabel,
                    style: const TextStyle(
                      color: Colors.black,
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),

          // 2. Secondary Actions Row (Watch Later + Share)
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: onToggleWatchLater,
                  icon: Icon(
                    isSaved ? Icons.bookmark_added_rounded : Icons.bookmark_add_outlined,
                    color: isSaved ? AppTheme.movieCyan : Colors.white,
                    size: 18,
                  ),
                  label: Text(
                    isSaved ? 'In Watch Later' : 'Watch Later',
                    style: TextStyle(
                      color: isSaved ? AppTheme.movieCyan : Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    side: BorderSide(
                      color: isSaved ? AppTheme.movieCyan : Colors.white24,
                    ),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: onShare,
                  icon: const Icon(Icons.share_rounded, color: Colors.white, size: 18),
                  label: const Text(
                    'Share',
                    style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    side: const BorderSide(color: Colors.white24),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
