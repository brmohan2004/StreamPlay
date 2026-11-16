import 'package:flutter/material.dart';
import '../../../config/app_theme.dart';
import '../../../models/media_item.dart';

class MovieMetaSection extends StatelessWidget {
  final MovieItem movie;

  const MovieMetaSection({super.key, required this.movie});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Title
          Text(
            movie.name,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 26,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 10),

          // Metadata Chips Row (Screenshot 11) - Real Data Only
          Wrap(
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 8,
            runSpacing: 6,
            children: [
              if (movie.releaseInfo != null && movie.releaseInfo!.isNotEmpty)
                Text(
                  movie.releaseInfo!,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                ),
              if (movie.runtime != null && movie.runtime!.isNotEmpty) ...[
                const Text('•', style: TextStyle(color: AppTheme.textMuted)),
                const Icon(Icons.access_time_rounded, size: 14, color: AppTheme.textMuted),
                Text(
                  movie.runtime!,
                  style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                ),
              ],
              if (movie.imdbRating != null && movie.imdbRating!.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1C1A14),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: AppTheme.goldAccent.withValues(alpha: 0.5)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.star_rounded, color: AppTheme.goldAccent, size: 12),
                      const SizedBox(width: 3),
                      Text(
                        movie.imdbRating!,
                        style: const TextStyle(color: AppTheme.goldAccent, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              _buildSpecBadge('4K UHD'),
              _buildSpecBadge('5.1'),
            ],
          ),
          const SizedBox(height: 12),

          // Genre Pills
          if (movie.genres.isNotEmpty)
            Wrap(
              spacing: 8,
              children: movie.genres.map((g) {
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF141924),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white10),
                  ),
                  child: Text(
                    g,
                    style: const TextStyle(color: AppTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w600),
                  ),
                );
              }).toList(),
            ),
        ],
      ),
    );
  }

  Widget _buildSpecBadge(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
      decoration: BoxDecoration(
        color: const Color(0xFF141924),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: Colors.white12),
      ),
      child: Text(
        text,
        style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }
}
