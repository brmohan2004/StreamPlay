import 'package:flutter/material.dart';
import '../../../config/app_theme.dart';
import '../../../models/video_playback_models.dart';
import '../../../services/video_player_service.dart';

class PlayerControlsOverlay extends StatefulWidget {
  final VideoPlayerService service;
  final String title;
  final String? subtitleText;
  final bool visible;
  final bool isFullscreen;
  final VoidCallback onInteraction;
  final VoidCallback onBack;
  final VoidCallback onToggleFullscreen;
  final VoidCallback onOpenSubtitles;
  final VoidCallback onOpenAudio;
  final VoidCallback onOpenQuality;
  final VoidCallback onOpenSpeed;

  const PlayerControlsOverlay({
    super.key,
    required this.service,
    required this.title,
    this.subtitleText,
    required this.visible,
    required this.isFullscreen,
    required this.onInteraction,
    required this.onBack,
    required this.onToggleFullscreen,
    required this.onOpenSubtitles,
    required this.onOpenAudio,
    required this.onOpenQuality,
    required this.onOpenSpeed,
  });

  @override
  State<PlayerControlsOverlay> createState() => _PlayerControlsOverlayState();
}

class _PlayerControlsOverlayState extends State<PlayerControlsOverlay> {
  double? _dragSeekMs;
  bool _showVolumeSlider = false;

  String _formatDuration(Duration d) {
    final totalSeconds = d.inSeconds < 0 ? 0 : d.inSeconds;
    final hours = totalSeconds ~/ 3600;
    final minutes = (totalSeconds % 3600) ~/ 60;
    final seconds = totalSeconds % 60;
    final mm = minutes.toString().padLeft(2, '0');
    final ss = seconds.toString().padLeft(2, '0');
    return hours > 0 ? '$hours:$mm:$ss' : '$mm:$ss';
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.service;
    final source = s.activeSource;
    final durationMs = s.duration.inMilliseconds > 0 ? s.duration.inMilliseconds.toDouble() : 1.0;
    final currentMs = (_dragSeekMs ?? s.position.inMilliseconds.toDouble()).clamp(0.0, durationMs);
    final bufferedMs = s.buffered.inMilliseconds.toDouble().clamp(0.0, durationMs);

    return IgnorePointer(
      ignoring: !widget.visible,
      child: AnimatedOpacity(
        opacity: widget.visible ? 1.0 : 0.0,
        duration: const Duration(milliseconds: 220),
        child: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [
                Color(0xCC000000),
                Color(0x22000000),
                Color(0x22000000),
                Color(0xE6000000),
              ],
              stops: [0.0, 0.25, 0.72, 1.0],
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            ),
          ),
          child: SafeArea(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // 1. TOP BAR: Back + Title + Format/Provider Badge + Track Controls
                Padding(
                  padding: const EdgeInsets.fromLTRB(14, 10, 14, 4),
                  child: Row(
                    children: [
                      _CircleControlButton(
                        icon: Icons.arrow_back_rounded,
                        tooltip: 'Back',
                        onTap: widget.onBack,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              widget.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            if (widget.subtitleText != null || source != null)
                              Row(
                                children: [
                                  if (widget.subtitleText != null && widget.subtitleText!.isNotEmpty) ...[
                                    Flexible(
                                      child: Text(
                                        widget.subtitleText!,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          color: AppTheme.textMuted,
                                          fontSize: 11.5,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                  ],
                                  if (source != null) _SourceSpecPill(source: source),
                                ],
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      _PillActionButton(
                        icon: Icons.speed_rounded,
                        label: '${s.playbackSpeed}x',
                        onTap: () {
                          widget.onInteraction();
                          widget.onOpenSpeed();
                        },
                      ),
                    ],
                  ),
                ),

                // 2. CENTER CONTROLS: -10s, Play/Pause, +10s
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _SeekSkipButton(
                      icon: Icons.replay_10_rounded,
                      label: '10s',
                      onTap: () {
                        widget.onInteraction();
                        s.seekRelative(const Duration(seconds: -10));
                      },
                    ),
                    const SizedBox(width: 28),
                    GestureDetector(
                      onTap: () {
                        widget.onInteraction();
                        s.togglePlay();
                      },
                      child: Container(
                        width: 68,
                        height: 68,
                        decoration: BoxDecoration(
                          color: AppTheme.movieCyan,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.movieCyan.withValues(alpha: 0.45),
                              blurRadius: 24,
                              spreadRadius: 2,
                            ),
                          ],
                        ),
                        child: Icon(
                          s.isCompleted
                              ? Icons.replay_rounded
                              : (s.isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded),
                          color: Colors.black,
                          size: 38,
                        ),
                      ),
                    ),
                    const SizedBox(width: 28),
                    _SeekSkipButton(
                      icon: Icons.forward_10_rounded,
                      label: '10s',
                      onTap: () {
                        widget.onInteraction();
                        s.seekRelative(const Duration(seconds: 10));
                      },
                    ),
                  ],
                ),

                // 3. BOTTOM BAR: Seek Bar + Time/Duration + Volume + Audio/Subtitles/Quality + Fullscreen
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Time & Seek Slider with Buffered Track
                      Row(
                        children: [
                          Text(
                            _formatDuration(Duration(milliseconds: currentMs.round())),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              fontFeatures: [FontFeature.tabularFigures()],
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: SliderTheme(
                              data: SliderTheme.of(context).copyWith(
                                trackHeight: 4,
                                thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 7),
                                overlayShape: const RoundSliderOverlayShape(overlayRadius: 14),
                                activeTrackColor: AppTheme.movieCyan,
                                secondaryActiveTrackColor: Colors.white38,
                                inactiveTrackColor: Colors.white12,
                                thumbColor: Colors.white,
                              ),
                              child: Slider(
                                value: currentMs,
                                secondaryTrackValue: bufferedMs,
                                min: 0.0,
                                max: durationMs,
                                onChangeStart: (_) {
                                  widget.onInteraction();
                                },
                                onChanged: (val) {
                                  setState(() => _dragSeekMs = val);
                                },
                                onChangeEnd: (val) async {
                                  widget.onInteraction();
                                  setState(() => _dragSeekMs = null);
                                  await s.seek(Duration(milliseconds: val.round()));
                                },
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Text(
                            _formatDuration(s.duration),
                            style: const TextStyle(
                              color: AppTheme.textMuted,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              fontFeatures: [FontFeature.tabularFigures()],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),

                      // Bottom Action Strip
                      Row(
                        children: [
                          // Volume toggle + expandable slider
                          IconButton(
                            onPressed: () {
                              widget.onInteraction();
                              setState(() => _showVolumeSlider = !_showVolumeSlider);
                            },
                            onLongPress: () {
                              widget.onInteraction();
                              s.toggleMute();
                            },
                            icon: Icon(
                              s.isMuted
                                  ? Icons.volume_off_rounded
                                  : (s.volume < 50 ? Icons.volume_down_rounded : Icons.volume_up_rounded),
                              color: Colors.white,
                              size: 21,
                            ),
                            tooltip: 'Volume',
                          ),
                          if (_showVolumeSlider)
                            SizedBox(
                              width: 110,
                              child: SliderTheme(
                                data: SliderTheme.of(context).copyWith(
                                  trackHeight: 3,
                                  thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 5.5),
                                  activeTrackColor: AppTheme.movieCyan,
                                  inactiveTrackColor: Colors.white24,
                                  thumbColor: Colors.white,
                                ),
                                child: Slider(
                                  value: s.volume.clamp(0.0, 100.0),
                                  min: 0,
                                  max: 100,
                                  onChanged: (v) {
                                    widget.onInteraction();
                                    s.setVolume(v);
                                  },
                                ),
                              ),
                            ),
                          if (_showVolumeSlider)
                            IconButton(
                              onPressed: () {
                                widget.onInteraction();
                                s.toggleMute();
                              },
                              icon: Icon(
                                s.isMuted ? Icons.volume_mute_rounded : Icons.volume_off_outlined,
                                color: AppTheme.textMuted,
                                size: 18,
                              ),
                              tooltip: s.isMuted ? 'Unmute' : 'Mute',
                            ),

                          const Spacer(),

                          // Audio, Subtitles, Quality, Fullscreen
                          _PillActionButton(
                            icon: Icons.audiotrack_rounded,
                            label: 'Audio',
                            onTap: () {
                              widget.onInteraction();
                              widget.onOpenAudio();
                            },
                          ),
                          const SizedBox(width: 8),
                          _PillActionButton(
                            icon: Icons.subtitles_rounded,
                            label: s.selectedSubtitleId == 'off' ? 'Subs' : 'CC On',
                            highlighted: s.selectedSubtitleId != 'off',
                            onTap: () {
                              widget.onInteraction();
                              widget.onOpenSubtitles();
                            },
                          ),
                          const SizedBox(width: 8),
                          _PillActionButton(
                            icon: Icons.tune_rounded,
                            label: source?.quality ?? 'Quality',
                            onTap: () {
                              widget.onInteraction();
                              widget.onOpenQuality();
                            },
                          ),
                          const SizedBox(width: 8),
                          _CircleControlButton(
                            icon: widget.isFullscreen
                                ? Icons.fullscreen_exit_rounded
                                : Icons.fullscreen_rounded,
                            tooltip: widget.isFullscreen ? 'Exit Fullscreen' : 'Fullscreen',
                            onTap: () {
                              widget.onInteraction();
                              widget.onToggleFullscreen();
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SourceSpecPill extends StatelessWidget {
  final VideoSourceItem source;

  const _SourceSpecPill({required this.source});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: AppTheme.movieCyan.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: AppTheme.movieCyan.withValues(alpha: 0.45)),
      ),
      child: Text(
        '${source.format.displayLabel} • ${source.quality}',
        style: const TextStyle(
          color: AppTheme.movieCyan,
          fontSize: 10,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _CircleControlButton extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;

  const _CircleControlButton({
    required this.icon,
    required this.tooltip,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.55),
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white12),
          ),
          child: Icon(icon, color: Colors.white, size: 20),
        ),
      ),
    );
  }
}

class _SeekSkipButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _SeekSkipButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 52,
        height: 52,
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.5),
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white12),
        ),
        child: Icon(icon, color: Colors.white, size: 28),
      ),
    );
  }
}

class _PillActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool highlighted;
  final VoidCallback onTap;

  const _PillActionButton({
    required this.icon,
    required this.label,
    this.highlighted = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: highlighted
              ? AppTheme.movieCyan.withValues(alpha: 0.2)
              : Colors.black.withValues(alpha: 0.55),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: highlighted ? AppTheme.movieCyan : Colors.white12,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: highlighted ? AppTheme.movieCyan : Colors.white,
              size: 16,
            ),
            const SizedBox(width: 5),
            Text(
              label,
              style: TextStyle(
                color: highlighted ? AppTheme.movieCyan : Colors.white,
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
