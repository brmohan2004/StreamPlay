import 'package:flutter/material.dart';
import 'package:just_audio/just_audio.dart';
import '../../../config/app_theme.dart';

class PlayerPlaybackControls extends StatelessWidget {
  final bool isPlaying;
  final bool isShuffle;
  final LoopMode loopMode;
  final VoidCallback onToggleShuffle;
  final VoidCallback onPrev;
  final VoidCallback onTogglePlay;
  final VoidCallback onNext;
  final VoidCallback onToggleRepeat;

  const PlayerPlaybackControls({
    super.key,
    required this.isPlaying,
    required this.isShuffle,
    required this.loopMode,
    required this.onToggleShuffle,
    required this.onPrev,
    required this.onTogglePlay,
    required this.onNext,
    required this.onToggleRepeat,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Shuffle Icon
          IconButton(
            icon: Icon(
              Icons.shuffle_rounded,
              color: isShuffle ? AppTheme.musicLime : Colors.white54,
              size: 22,
            ),
            onPressed: onToggleShuffle,
          ),

          // Previous Track
          IconButton(
            icon: const Icon(Icons.skip_previous_rounded, color: Colors.white, size: 30),
            onPressed: onPrev,
          ),

          // Center Big White Play Button with Glowing Ripple (Screenshot 12)
          GestureDetector(
            onTap: onTogglePlay,
            child: Container(
              width: 68,
              height: 68,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.musicLime.withValues(alpha: 0.55),
                    blurRadius: 24,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: Center(
                child: Icon(
                  isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                  color: Colors.black,
                  size: 38,
                ),
              ),
            ),
          ),

          // Next Track
          IconButton(
            icon: const Icon(Icons.skip_next_rounded, color: Colors.white, size: 30),
            onPressed: onNext,
          ),

          // Repeat Icon (Off / All / One)
          IconButton(
            icon: Icon(
              loopMode == LoopMode.one ? Icons.repeat_one_rounded : Icons.repeat_rounded,
              color: loopMode != LoopMode.off ? AppTheme.musicLime : Colors.white54,
              size: 22,
            ),
            onPressed: onToggleRepeat,
          ),
        ],
      ),
    );
  }
}
