import 'package:flutter/material.dart';
import '../../../config/app_theme.dart';
import '../../../models/media_item.dart';

class MovieStorylineSection extends StatelessWidget {
  final MovieItem movie;
  final List<String> audioLanguages;
  final List<String> subtitleLanguages;
  final VoidCallback? onTapTracks;

  const MovieStorylineSection({
    super.key,
    required this.movie,
    this.audioLanguages = const [],
    this.subtitleLanguages = const [],
    this.onTapTracks,
  });

  @override
  Widget build(BuildContext context) {
    final audioSummary = audioLanguages.isNotEmpty
        ? 'Audio: ${audioLanguages.join(', ')}'
        : (movie.language != null && movie.language!.isNotEmpty
            ? 'Audio: ${movie.language}'
            : 'Audio: Tap Play to check authorized tracks');
    final subtitleSummary = subtitleLanguages.isNotEmpty
        ? 'Subs: ${subtitleLanguages.join(', ')}'
        : 'Subs: Available tracks shown in player';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Storyline',
            style: TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            (movie.description != null && movie.description!.isNotEmpty)
                ? movie.description!
                : 'A captivating story unfolding across breathtaking moments and memorable cinematic experiences.',
            style: const TextStyle(
              color: Color(0xFFC7D2FE),
              fontSize: 13.5,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 16),

          // Audio & Subtitles Info Card
          GestureDetector(
            onTap: onTapTracks,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFF101624),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.white12),
              ),
              child: Row(
                children: [
                  const Icon(Icons.language_rounded, color: AppTheme.movieCyan, size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          audioSummary,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          subtitleSummary,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.keyboard_arrow_down_rounded, color: AppTheme.textMuted, size: 20),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
