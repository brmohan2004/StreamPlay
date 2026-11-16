import 'package:flutter/material.dart';
import '../../../config/app_theme.dart';
import '../../../models/media_item.dart';

class PlayerInfoSection extends StatelessWidget {
  final SongItem song;
  final SongItem? prevSong;
  final SongItem? nextSong;
  final int trackNumber;

  const PlayerInfoSection({
    super.key,
    required this.song,
    this.prevSong,
    this.nextSong,
    this.trackNumber = 1,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        children: [
          // Track Number Indicator
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: AppTheme.musicLime.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              trackNumber.toString().padLeft(2, '0'),
              style: const TextStyle(
                color: AppTheme.musicLime,
                fontSize: 11,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          const SizedBox(height: 8),

          // Main Center Title with non-overlapping background preview titles (Point 2.1)
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Left Previous Song Preview
              if (prevSong != null)
                Expanded(
                  child: Text(
                    prevSong!.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.right,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.22),
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                )
              else
                const Spacer(),

              const SizedBox(width: 14),

              // Active Centered Track Title
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 220),
                child: Text(
                  song.title,
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),

              const SizedBox(width: 14),

              // Right Next Song Preview
              if (nextSong != null)
                Expanded(
                  child: Text(
                    nextSong!.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.left,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.22),
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                )
              else
                const Spacer(),
            ],
          ),
          const SizedBox(height: 4),

          // Artist & Album Info
          Text(
            '${song.artist} • ${song.album}',
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: AppTheme.textMuted,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }
}
