import 'package:flutter/material.dart';
import '../../../config/app_theme.dart';
import '../../../models/media_item.dart';
import '../../../services/music_service.dart';

/// Ultra-Modern, Minimalist In-Poster Synced Lyrics Stage.
///
/// Features:
/// 1. Spotify & Apple Music inspired minimalist typography with vertical fade gradient.
/// 2. Active line bold expansion (20px, pure white + vivid neon lime ambient glow).
/// 3. Automated instrumental break rendering: displays animated musical symbols (♪ ♫ ♪) during intro and solos.
/// 4. Tap-to-seek: instant jump to any lyric timestamp on touch.
/// 5. Smooth auto-centering of active line with cubic ease curves.
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

class _PlayerLyricsStageState extends State<PlayerLyricsStage>
    with SingleTickerProviderStateMixin {
  final MusicService _musicService = MusicService();
  final ScrollController _scrollController = ScrollController();
  late final AnimationController _pulseController;

  SongLyrics? _lyrics;
  bool _isLoading = true;
  String? _loadedSongId;
  int _lastActiveIndex = -1;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);
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
      // Center the active item in the 265px container
      final targetOffset = (activeIndex * 48.0) - (265 / 2) + 24.0;
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
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final activeIndex = _calculateActiveIndex();

    return Container(
      width: 285,
      height: 265,
      decoration: BoxDecoration(
        color: const Color(0xF20B0F0C), // Deep obsidian minimal glass
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.1),
          width: 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.65),
            blurRadius: 36,
            spreadRadius: 2,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(23),
        child: Stack(
          children: [
            // 1. Content Area
            if (_isLoading)
              const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SizedBox(
                      width: 26,
                      height: 26,
                      child: CircularProgressIndicator(
                        color: AppTheme.musicLime,
                        strokeWidth: 2.2,
                      ),
                    ),
                    SizedBox(height: 12),
                    Text(
                      'Syncing lyrics...',
                      style: TextStyle(color: Colors.white54, fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              )
            else if (_lyrics == null || _lyrics!.lines.isEmpty)
              Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.subtitles_off_rounded, color: Colors.white.withValues(alpha: 0.25), size: 36),
                      const SizedBox(height: 10),
                      const Text(
                        'Lyrics not available for this track',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.white54, fontSize: 13, fontWeight: FontWeight.w500),
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
                    stops: [0.0, 0.16, 0.84, 1.0],
                  ).createShader(rect);
                },
                blendMode: BlendMode.dstIn,
                child: ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 16),
                  itemCount: _lyrics!.lines.length,
                  itemBuilder: (context, index) {
                    final line = _lyrics!.lines[index];
                    final isActive = index == activeIndex;
                    final isInstrumental = line.text.contains('♪') || line.text.contains('♫');

                    return GestureDetector(
                      onTap: () {
                        if (line.timestamp != null) {
                          widget.onSeek(line.timestamp!);
                        }
                      },
                      behavior: HitTestBehavior.opaque,
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 250),
                        curve: Curves.easeOut,
                        padding: EdgeInsets.symmetric(vertical: isActive ? 10 : 6),
                        alignment: Alignment.center,
                        child: isInstrumental
                            ? _buildInstrumentalItem(isActive)
                            : AnimatedDefaultTextStyle(
                                duration: const Duration(milliseconds: 260),
                                curve: Curves.easeOutCubic,
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  color: isActive
                                      ? Colors.white
                                      : Colors.white.withValues(alpha: 0.32),
                                  fontSize: isActive ? 19.5 : 14.5,
                                  fontWeight: isActive ? FontWeight.w800 : FontWeight.w500,
                                  letterSpacing: isActive ? -0.2 : 0,
                                  height: 1.35,
                                  shadows: isActive
                                      ? [
                                          Shadow(
                                            color: AppTheme.musicLime.withValues(alpha: 0.75),
                                            blurRadius: 18,
                                          ),
                                          Shadow(
                                            color: Colors.black.withValues(alpha: 0.8),
                                            blurRadius: 4,
                                            offset: const Offset(0, 1),
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

            // 2. Minimalist Header Badge (Live Sync Status)
            Positioned(
              top: 10,
              left: 14,
              child: Row(
                children: [
                  Container(
                    width: 6.5,
                    height: 6.5,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppTheme.musicLime,
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.musicLime.withValues(alpha: 0.8),
                          blurRadius: 6,
                          spreadRadius: 1,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    _lyrics?.isSynced == true ? 'SYNCED' : 'LYRICS',
                    style: const TextStyle(
                      color: AppTheme.musicLime,
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.2,
                    ),
                  ),
                ],
              ),
            ),

            // 3. Top-Right Dismiss Icon Button
            Positioned(
              top: 8,
              right: 8,
              child: GestureDetector(
                onTap: widget.onClose,
                child: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.08),
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

  /// Musical symbols indicator (♪ ♫ ♪) shown during instrumental portions
  Widget _buildInstrumentalItem(bool isActive) {
    return AnimatedBuilder(
      animation: _pulseController,
      builder: (context, _) {
        final pulseScale = isActive ? (1.0 + _pulseController.value * 0.12) : 1.0;
        final glowOpacity = isActive ? (0.4 + _pulseController.value * 0.5) : 0.0;

        return Transform.scale(
          scale: pulseScale,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            decoration: BoxDecoration(
              color: isActive
                  ? AppTheme.musicLime.withValues(alpha: 0.12)
                  : Colors.transparent,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.music_note_rounded,
                  size: isActive ? 20 : 15,
                  color: isActive ? AppTheme.musicLime : Colors.white24,
                  shadows: isActive
                      ? [
                          Shadow(
                            color: AppTheme.musicLime.withValues(alpha: glowOpacity),
                            blurRadius: 14,
                          ),
                        ]
                      : null,
                ),
                const SizedBox(width: 8),
                Text(
                  '♪  ♫  ♪',
                  style: TextStyle(
                    color: isActive ? AppTheme.musicLime : Colors.white24,
                    fontSize: isActive ? 18 : 13,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 3,
                    shadows: isActive
                        ? [
                            Shadow(
                              color: AppTheme.musicLime.withValues(alpha: glowOpacity),
                              blurRadius: 16,
                            ),
                          ]
                        : null,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
