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
  final Map<int, GlobalKey> _lineKeys = {};
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
    _lineKeys.clear();
    _lastActiveIndex = -1;
    setState(() => _isLoading = true);

    try {
      final res = await _musicService.fetchLyrics(widget.song);
      if (mounted) {
        setState(() {
          _lyrics = res;
          _isLoading = false;
        });
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _autoScrollToActiveLine(force: true);
        });
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

  void _autoScrollToActiveLine({bool force = false}) {
    final activeIndex = _calculateActiveIndex();
    if (activeIndex == -1) return;
    if (!force && activeIndex == _lastActiveIndex) return;
    _lastActiveIndex = activeIndex;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final key = _lineKeys[activeIndex];
      final ctx = key?.currentContext;
      if (ctx != null) {
        Scrollable.ensureVisible(
          ctx,
          alignment: 0.5, // Exactly centers the active line vertically
          duration: const Duration(milliseconds: 550),
          curve: Curves.easeOutCubic,
        );
      }
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

    return LayoutBuilder(
      builder: (context, constraints) {
        final viewportHeight = constraints.maxHeight.isFinite ? constraints.maxHeight : 300.0;
        final verticalPadding = viewportHeight * 0.44;

        return SizedBox(
          width: double.infinity,
          height: viewportHeight,
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
                        'Loading lyrics...',
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
                      stops: [0.0, 0.24, 0.76, 1.0],
                    ).createShader(rect);
                  },
                  blendMode: BlendMode.dstIn,
                  child: SingleChildScrollView(
                    controller: _scrollController,
                    physics: const BouncingScrollPhysics(),
                    padding: EdgeInsets.symmetric(
                      vertical: verticalPadding,
                      horizontal: 20,
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: List.generate(_lyrics!.lines.length, (index) {
                        final line = _lyrics!.lines[index];
                        final isActive = index == activeIndex;
                        final isInstrumental = line.text.contains('♪') || line.text.contains('♫');
                        final key = _lineKeys.putIfAbsent(index, () => GlobalKey());

                        return GestureDetector(
                          key: key,
                          onTap: () {
                            if (line.timestamp != null) {
                              widget.onSeek(line.timestamp!);
                            }
                            _autoScrollToActiveLine(force: true);
                          },
                          behavior: HitTestBehavior.opaque,
                          child: AnimatedPadding(
                            duration: const Duration(milliseconds: 400),
                            curve: Curves.easeOutCubic,
                            padding: EdgeInsets.symmetric(vertical: isActive ? 10 : 5),
                            child: AnimatedScale(
                              duration: const Duration(milliseconds: 400),
                              curve: Curves.easeOutCubic,
                              scale: isActive ? 1.08 : 0.88,
                              child: AnimatedOpacity(
                                duration: const Duration(milliseconds: 400),
                                curve: Curves.easeOutCubic,
                                opacity: isActive ? 1.0 : 0.30,
                                child: isInstrumental
                                    ? _buildInstrumentalItem(isActive)
                                    : Text(
                                        line.text,
                                        textAlign: TextAlign.center,
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: 22.0,
                                          fontWeight: isActive ? FontWeight.w900 : FontWeight.w600,
                                          letterSpacing: isActive ? -0.3 : 0,
                                          height: 1.35,
                                          shadows: isActive
                                              ? [
                                                  Shadow(
                                                    color: AppTheme.musicLime.withValues(alpha: 0.85),
                                                    blurRadius: 22,
                                                  ),
                                                  Shadow(
                                                    color: Colors.black.withValues(alpha: 0.9),
                                                    blurRadius: 6,
                                                    offset: const Offset(0, 2),
                                                  ),
                                                ]
                                              : null,
                                        ),
                                      ),
                              ),
                            ),
                          ),
                        );
                      }),
                    ),
                  ),
                ),

              // 2. Top-Right Subtle Dismiss Button
              Positioned(
                top: 4,
                right: 16,
                child: GestureDetector(
                  onTap: widget.onClose,
                  child: Container(
                    padding: const EdgeInsets.all(7),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.close_rounded,
                      color: Colors.white70,
                      size: 18,
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
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
