import 'package:flutter/material.dart';
import '../../../config/app_theme.dart';
import '../../../config/constants.dart';
import '../../../services/video_player_service.dart';

Future<void> showSubtitleSelectorSheet({
  required BuildContext context,
  required List<SelectableSubtitleOption> options,
  required String selectedId,
  required ValueChanged<SelectableSubtitleOption> onSelected,
}) {
  return _showPlayerSheet(
    context: context,
    title: 'Subtitles & Captions',
    icon: Icons.subtitles_rounded,
    child: options.isEmpty
        ? const _EmptyTrackMessage(message: 'No subtitle tracks available for this stream.')
        : ListView.builder(
            shrinkWrap: true,
            itemCount: options.length,
            itemBuilder: (ctx, idx) {
              final opt = options[idx];
              final isSelected = opt.id == selectedId;
              return _TrackTile(
                title: opt.label,
                subtitle: opt.isOff
                    ? 'Disable captions'
                    : (opt.externalTrack != null ? 'Authorized external track' : 'Embedded stream track'),
                isSelected: isSelected,
                onTap: () {
                  Navigator.pop(ctx);
                  onSelected(opt);
                },
              );
            },
          ),
  );
}

Future<void> showAudioSelectorSheet({
  required BuildContext context,
  required List<SelectableAudioOption> options,
  required String selectedId,
  required ValueChanged<SelectableAudioOption> onSelected,
}) {
  return _showPlayerSheet(
    context: context,
    title: 'Audio Tracks',
    icon: Icons.audiotrack_rounded,
    child: options.isEmpty
        ? const _EmptyTrackMessage(message: 'Single default audio track active.')
        : ListView.builder(
            shrinkWrap: true,
            itemCount: options.length,
            itemBuilder: (ctx, idx) {
              final opt = options[idx];
              final isSelected = opt.id == selectedId || (selectedId == 'auto' && idx == 0);
              return _TrackTile(
                title: opt.label,
                subtitle: opt.details,
                isSelected: isSelected,
                onTap: () {
                  Navigator.pop(ctx);
                  onSelected(opt);
                },
              );
            },
          ),
  );
}

Future<void> showQualitySelectorSheet({
  required BuildContext context,
  required List<SelectableQualityOption> options,
  required String selectedId,
  required String activeSummary,
  required ValueChanged<SelectableQualityOption> onSelected,
}) {
  return _showPlayerSheet(
    context: context,
    title: 'Video Quality & Stream',
    subtitle: 'Active: $activeSummary',
    icon: Icons.high_quality_rounded,
    child: ListView.builder(
      shrinkWrap: true,
      itemCount: options.length,
      itemBuilder: (ctx, idx) {
        final opt = options[idx];
        final isSelected = opt.id == selectedId;
        return _TrackTile(
          title: opt.label,
          subtitle: opt.isAuto
              ? 'Automatically adapts to network bandwidth'
              : (opt.alternateSource != null
                  ? 'Switches to alternate authorized source'
                  : 'Adaptive rendition'),
          isSelected: isSelected,
          onTap: () {
            Navigator.pop(ctx);
            onSelected(opt);
          },
        );
      },
    ),
  );
}

Future<void> showPlaybackSpeedSheet({
  required BuildContext context,
  required double currentSpeed,
  required ValueChanged<double> onSelected,
}) {
  return _showPlayerSheet(
    context: context,
    title: 'Playback Speed',
    icon: Icons.speed_rounded,
    child: ListView.builder(
      shrinkWrap: true,
      itemCount: AppConstants.videoPlaybackSpeeds.length,
      itemBuilder: (ctx, idx) {
        final speed = AppConstants.videoPlaybackSpeeds[idx];
        final isSelected = (currentSpeed - speed).abs() < 0.05;
        return _TrackTile(
          title: speed == 1.0 ? '1.0x (Normal)' : '${speed}x',
          isSelected: isSelected,
          onTap: () {
            Navigator.pop(ctx);
            onSelected(speed);
          },
        );
      },
    ),
  );
}

Future<void> _showPlayerSheet({
  required BuildContext context,
  required String title,
  String? subtitle,
  required IconData icon,
  required Widget child,
}) {
  return showModalBottomSheet(
    context: context,
    backgroundColor: const Color(0xFF0E1420),
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
    ),
    builder: (ctx) {
      return SafeArea(
        top: false,
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(ctx).size.height * 0.65,
            maxWidth: 520,
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(18, 14, 18, 18),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.white24,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Icon(icon, color: AppTheme.movieCyan, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          if (subtitle != null) ...[
                            const SizedBox(height: 2),
                            Text(
                              subtitle,
                              style: const TextStyle(color: AppTheme.textMuted, fontSize: 11.5),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Flexible(child: child),
              ],
            ),
          ),
        ),
      );
    },
  );
}

class _TrackTile extends StatelessWidget {
  final String title;
  final String? subtitle;
  final bool isSelected;
  final VoidCallback onTap;

  const _TrackTile({
    required this.title,
    this.subtitle,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected
              ? AppTheme.movieCyan.withValues(alpha: 0.14)
              : const Color(0xFF141C2B),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppTheme.movieCyan : Colors.white10,
            width: isSelected ? 1.4 : 1,
          ),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      color: isSelected ? AppTheme.movieCyan : Colors.white,
                      fontSize: 13.5,
                      fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                    ),
                  ),
                  if (subtitle != null && subtitle!.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      subtitle!,
                      style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                    ),
                  ],
                ],
              ),
            ),
            if (isSelected)
              const Icon(Icons.check_circle_rounded, color: AppTheme.movieCyan, size: 18),
          ],
        ),
      ),
    );
  }
}

class _EmptyTrackMessage extends StatelessWidget {
  final String message;

  const _EmptyTrackMessage({required this.message});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 18),
      child: Center(
        child: Text(
          message,
          style: const TextStyle(color: AppTheme.textMuted, fontSize: 13),
        ),
      ),
    );
  }
}
