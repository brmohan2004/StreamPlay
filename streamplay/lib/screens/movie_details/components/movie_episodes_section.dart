import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../config/app_theme.dart';
import '../../../models/media_item.dart';
import '../../../models/video_playback_models.dart';

class MovieEpisodesSection extends StatefulWidget {
  final List<EpisodeItem> episodes;
  final EpisodeItem? selectedEpisode;
  final WatchProgress? Function(EpisodeItem ep) getProgress;
  final ValueChanged<EpisodeItem> onPlayEpisode;

  const MovieEpisodesSection({
    super.key,
    required this.episodes,
    this.selectedEpisode,
    required this.getProgress,
    required this.onPlayEpisode,
  });

  @override
  State<MovieEpisodesSection> createState() => _MovieEpisodesSectionState();
}

class _MovieEpisodesSectionState extends State<MovieEpisodesSection> {
  late int _selectedSeason;

  List<int> get _seasons {
    final s = widget.episodes.map((e) => e.season).toSet().toList()..sort();
    return s;
  }

  @override
  void initState() {
    super.initState();
    _selectedSeason = widget.selectedEpisode?.season ?? (_seasons.isNotEmpty ? _seasons.first : 1);
  }

  @override
  Widget build(BuildContext context) {
    if (widget.episodes.isEmpty) return const SizedBox.shrink();

    final seasons = _seasons;
    if (!seasons.contains(_selectedSeason) && seasons.isNotEmpty) {
      _selectedSeason = seasons.first;
    }

    final seasonEpisodes = widget.episodes.where((e) => e.season == _selectedSeason).toList()
      ..sort((a, b) => a.number.compareTo(b.number));

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Episodes',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                ),
              ),
              if (seasons.length > 1)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFF101624),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.white12),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<int>(
                      value: _selectedSeason,
                      dropdownColor: const Color(0xFF101624),
                      iconEnabledColor: AppTheme.movieCyan,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                      ),
                      items: seasons
                          .map((s) => DropdownMenuItem<int>(value: s, child: Text('Season $s')))
                          .toList(),
                      onChanged: (val) {
                        if (val != null) setState(() => _selectedSeason = val);
                      },
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: seasonEpisodes.take(20).length,
            separatorBuilder: (_, _) => const SizedBox(height: 10),
            itemBuilder: (context, idx) {
              final ep = seasonEpisodes[idx];
              final prog = widget.getProgress(ep);
              final isSelected = widget.selectedEpisode?.season == ep.season &&
                  widget.selectedEpisode?.number == ep.number;

              return GestureDetector(
                onTap: () => widget.onPlayEpisode(ep),
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF101624),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: isSelected ? AppTheme.movieCyan : Colors.white10,
                      width: isSelected ? 1.3 : 1,
                    ),
                  ),
                  child: Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: SizedBox(
                          width: 106,
                          height: 62,
                          child: Stack(
                            fit: StackFit.expand,
                            children: [
                              if (ep.thumbnail != null && ep.thumbnail!.isNotEmpty)
                                CachedNetworkImage(
                                  imageUrl: ep.thumbnail!,
                                  fit: BoxFit.cover,
                                  placeholder: (_, _) => Container(color: AppTheme.cardDark),
                                  errorWidget: (_, _, _) => Container(
                                    color: AppTheme.cardDark,
                                    child: const Icon(Icons.movie_outlined, color: Colors.white24),
                                  ),
                                )
                              else
                                Container(
                                  color: AppTheme.cardDark,
                                  child: const Icon(Icons.movie_outlined, color: Colors.white24),
                                ),
                              Center(
                                child: Container(
                                  width: 30,
                                  height: 30,
                                  decoration: BoxDecoration(
                                    color: Colors.black.withValues(alpha: 0.65),
                                    shape: BoxShape.circle,
                                    border: Border.all(color: Colors.white30),
                                  ),
                                  child: const Icon(Icons.play_arrow_rounded, color: Colors.white, size: 18),
                                ),
                              ),
                              if (prog != null && prog.progressRatio > 0.02)
                                Positioned(
                                  bottom: 0,
                                  left: 0,
                                  right: 0,
                                  child: LinearProgressIndicator(
                                    value: prog.progressRatio,
                                    minHeight: 3,
                                    backgroundColor: Colors.white24,
                                    valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.movieCyan),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'E${ep.number} • ${ep.name}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            if (ep.overview != null && ep.overview!.isNotEmpty) ...[
                              const SizedBox(height: 3),
                              Text(
                                ep.overview!,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: AppTheme.textMuted,
                                  fontSize: 11,
                                  height: 1.3,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
