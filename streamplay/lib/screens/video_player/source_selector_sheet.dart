import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../models/media_item.dart';
import '../../models/video_playback_models.dart';

class SourceSelectorSheet extends StatelessWidget {
  final MovieItem movie;
  final EpisodeItem? episode;
  final bool isLoading;
  final String? errorMessage;
  final List<VideoSourceItem> sources;
  final WatchProgress? savedProgress;
  final ValueChanged<VideoSourceItem> onSelectSource;
  final VoidCallback onRetry;

  const SourceSelectorSheet({
    super.key,
    required this.movie,
    this.episode,
    required this.isLoading,
    this.errorMessage,
    required this.sources,
    this.savedProgress,
    required this.onSelectSource,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    final subtitleText = episode != null
        ? 'Season ${episode!.season} • Episode ${episode!.number}: ${episode!.name}'
        : (movie.releaseInfo ?? 'Authorized Direct Playback');

    return SafeArea(
      top: false,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.72,
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 14, 18, 22),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 42,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.white24,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  const Icon(Icons.play_circle_outline_rounded, color: AppTheme.movieCyan, size: 22),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Select Authorized Source',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16.5,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${movie.name} • $subtitleText',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              if (savedProgress != null && savedProgress!.canResume) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppTheme.movieCyan.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppTheme.movieCyan.withValues(alpha: 0.35)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.history_rounded, color: AppTheme.movieCyan, size: 16),
                      const SizedBox(width: 8),
                      Text(
                        'Will resume from ${savedProgress!.formattedPosition}',
                        style: const TextStyle(
                          color: AppTheme.movieCyan,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 16),
              Flexible(child: _buildBody(context)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBody(BuildContext context) {
    if (isLoading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 34),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(color: AppTheme.movieCyan, strokeWidth: 2.5),
              SizedBox(height: 14),
              Text(
                'Checking authorized video providers...',
                style: TextStyle(color: AppTheme.textMuted, fontSize: 13),
              ),
            ],
          ),
        ),
      );
    }

    if (errorMessage != null) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off_rounded, color: AppTheme.errorRed, size: 38),
            const SizedBox(height: 10),
            Text(
              errorMessage!,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white70, fontSize: 13, height: 1.4),
            ),
            const SizedBox(height: 14),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: const Text('Retry'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.movieCyan,
                foregroundColor: Colors.black,
                textStyle: const TextStyle(fontWeight: FontWeight.w800),
              ),
            ),
          ],
        ),
      );
    }

    if (sources.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 12),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.videocam_off_rounded, color: Colors.white.withValues(alpha: 0.28), size: 44),
              const SizedBox(height: 12),
              const Text(
                'Currently unavailable for streaming.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 15.5,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'No legally authorized direct video streams were found across configured providers for this title.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppTheme.textMuted, fontSize: 12.5, height: 1.4),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh_rounded, size: 18),
                label: const Text('Refresh Sources'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.movieCyan,
                  foregroundColor: Colors.black,
                  textStyle: const TextStyle(fontWeight: FontWeight.w800),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.separated(
      shrinkWrap: true,
      itemCount: sources.length,
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (context, idx) {
        final src = sources[idx];
        return GestureDetector(
          onTap: () => onSelectSource(src),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFF121927),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: idx == 0 ? AppTheme.movieCyan.withValues(alpha: 0.55) : Colors.white12,
                width: idx == 0 ? 1.3 : 1,
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppTheme.movieCyan.withValues(alpha: 0.14),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.play_arrow_rounded, color: AppTheme.movieCyan, size: 26),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              src.providerName,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                          if (idx == 0) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppTheme.musicLime.withValues(alpha: 0.16),
                                borderRadius: BorderRadius.circular(5),
                              ),
                              child: const Text(
                                'BEST',
                                style: TextStyle(
                                  color: AppTheme.musicLime,
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 5),
                      Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        children: [
                          _BadgeChip(label: src.format.displayLabel, accent: true),
                          _BadgeChip(label: src.quality),
                          if (src.audioLanguages.isNotEmpty)
                            _BadgeChip(label: 'Audio: ${src.audioLanguages.take(2).join(', ')}'),
                          if (src.subtitleLanguages.isNotEmpty)
                            _BadgeChip(label: 'CC: ${src.subtitleLanguages.length}'),
                        ],
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right_rounded, color: AppTheme.textMuted),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _BadgeChip extends StatelessWidget {
  final String label;
  final bool accent;

  const _BadgeChip({required this.label, this.accent = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
      decoration: BoxDecoration(
        color: accent ? AppTheme.movieCyan.withValues(alpha: 0.16) : Colors.white.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color: accent ? AppTheme.movieCyan.withValues(alpha: 0.45) : Colors.white12,
        ),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: accent ? AppTheme.movieCyan : Colors.white70,
          fontSize: 10.5,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
