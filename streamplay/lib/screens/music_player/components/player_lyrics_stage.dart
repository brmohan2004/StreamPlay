import 'package:flutter/material.dart';
import '../../../config/app_theme.dart';
import '../../../models/media_item.dart';
import '../../../services/music_service.dart';

/// In-Poster Synced Lyrics Stage (replaces album poster when lyrics mode is enabled).
///
/// Features:
/// 1. Real-time audio line highlighting (bright lime neon glow for active line, muted for inactive).
/// 2. Auto-scrolls smoothly to keep the currently sung line centered.
/// 3. Interactive tap-to-seek: tapping any line jumps audio directly to that timestamp.
/// 4. Graceful fallback for non-synced lyrics with progress-based line highlighting.
class PlayerLyricsStage extends StatefulWidget {
  final SongItem song;
  final Duration currentPosition;
  final Duration songDuration;
  final ValueChanged<Duration> onSeek;
  final VoidCallback onClose;

  const PlayerLyricsStage({
    super.key,
    required this.song,
    required this.currentPosition,
    required this.songDuration,
    required this.onSeek,
    required this.onClose,
  });

  @override
  State<PlayerLyricsStage> createState() => _PlayerLyricsStageState();
}

class _PlayerLyricsStageState extends State<PlayerLyricsStage> {
  final MusicService _musicService = MusicService();
  final ScrollController _scrollController = ScrollController();

  SongLyrics? _lyrics;
  bool _isLoading = true;
  String? _loadedSongId;
  int _lastActiveIndex = -1;

  @override
  void initState() {
    super.initState();
    _loadLyrics();
  }

  @override
  void didUpdateWidget(covariant PlayerLyricsStage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.song.id != _loadedSongId) {
      _loadLyrics();
    } else {
      _autoScrollToActiveLine();
    }
  }

  Future<void> _loadLyrics() async {
    _loadedSongId = widget.song.id;
    setState(() => _isLoading = true);

    try {
      final res = await _musicService.fetchLyrics(widget.song);
      if (mounted) {
        setState(() {
          _lyrics = res;
          _isLoading = false;
        });
        _autoScrollToActiveLine();
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  int _calculateActiveIndex() {
    if (_lyrics == null || _lyrics!.lines.isEmpty) return -1;
    final lines = _lyrics!.lines;

    if (_lyrics!.isSynced) {
      for (int i = lines.length - 1; i >= 0; i--) {
        final t = lines[i].timestamp;
        if (t != null && widget.currentPosition >= t) {
          return i;
        }
      }
      return 0;
    } else {
      // Non-synced fallback: highlight by proportional audio progress
      final totalSec = widget.songDuration.inSeconds;
      if (totalSec <= 0) return 0;
      final curSec = widget.currentPosition.inSeconds;
      final progress = (curSec / totalSec).clamp(0.0, 1.0);
      return (progress * (lines.length - 1)).round().clamp(0, lines.length - 1);
    }
  }

  void _autoScrollToActiveLine() {
    final activeIndex = _calculateActiveIndex();
    if (activeIndex == -1 || activeIndex == _lastActiveIndex) return;
    _lastActiveIndex = activeIndex;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      // Approximate line height ~42px, center the line in the 265px container
      final targetOffset = (activeIndex * 44.0) - (265 / 2) + 22.0;
      final clampedOffset = targetOffset.clamp(
        0.0,
        _scrollController.position.maxScrollExtent,
      );

      _scrollController.animateTo(
        clampedOffset,
        duration: const Duration(milliseconds: 320),
        curve: Curves.easeOutCubic,
      );
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final activeIndex = _calculateActiveIndex();

    return Container(
      width: 280,
      height: 265,
      decoration: BoxDecoration(
        color: const Color(0xF2101612), // Deep dark glass
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: AppTheme.musicLime.withValues(alpha: 0.28),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.7),
            blurRadius: 36,
            spreadRadius: 2,
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(23),
        child: Stack(
          children: [
            // Content Stage
            if (_isLoading)
              const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SizedBox(
                      width: 28,
                      height: 28,
                      child: CircularProgressIndicator(
                        color: AppTheme.musicLime,
                        strokeWidth: 2.5,
                      ),
                    ),
                    SizedBox(height: 12),
                    Text(
                      'Loading lyrics...',
                      style: TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                  ],
                ),
              )
            else if (_lyrics == null || _lyrics!.lines.isEmpty)
              Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.subtitles_off_rounded, color: Colors.white.withValues(alpha: 0.3), size: 36),
                      const SizedBox(height: 10),
                      const Text(
                        'Lyrics not available for this song',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.white54, fontSize: 13),
                      ),
                    ],
                  ),
                ),
              )
            else
              ShaderMask(
                shaderCallback: (rect) {
                  return const LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.transparent,
                      Colors.black,
                      Colors.black,
                      Colors.transparent,
                    ],
                    stops: [0.0, 0.15, 0.85, 1.0],
                  ).createShader(rect);
                },
                blendMode: BlendMode.dstIn,
                child: ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 16),
                  itemCount: _lyrics!.lines.length,
                  itemBuilder: (context, index) {
                    final line = _lyrics!.lines[index];
                    final isActive = index == activeIndex;

                    return GestureDetector(
                      onTap: () {
                        if (line.timestamp != null) {
                          widget.onSeek(line.timestamp!);
                        }
                      },
                      behavior: HitTestBehavior.opaque,
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        alignment: Alignment.center,
                        child: AnimatedDefaultTextStyle(
                          duration: const Duration(milliseconds: 250),
                          curve: Curves.easeOut,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: isActive ? AppTheme.musicLime : Colors.white.withValues(alpha: 0.38),
                            fontSize: isActive ? 18 : 14.5,
                            fontWeight: isActive ? FontWeight.bold : FontWeight.w500,
                            letterSpacing: isActive ? 0.2 : 0,
                            shadows: isActive
                                ? [
                                    Shadow(
                                      color: AppTheme.musicLime.withValues(alpha: 0.65),
                                      blurRadius: 16,
                                    ),
                                  ]
                                : null,
                          ),
                          child: Text(line.text),
                        ),
                      ),
                    );
                  },
                ),
              ),

            // Top-right Close/Return to Poster icon button
            Positioned(
              top: 8,
              right: 8,
              child: GestureDetector(
                onTap: widget.onClose,
                child: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.5),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.close_rounded,
                    color: Colors.white70,
                    size: 16,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
