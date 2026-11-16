import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../config/app_theme.dart';
import '../../../models/media_item.dart';

class MovieHeroStage extends StatelessWidget {
  final MovieItem movie;
  final bool isPlayingTrailer;
  final bool isMuted;
  final VoidCallback onTogglePlayTrailer;
  final VoidCallback onToggleMute;

  const MovieHeroStage({
    super.key,
    required this.movie,
    required this.isPlayingTrailer,
    required this.isMuted,
    required this.onTogglePlayTrailer,
    required this.onToggleMute,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Container(
          height: 280,
          width: double.infinity,
          color: const Color(0xFF0A0F18),
          child: CachedNetworkImage(
            imageUrl: movie.background ?? movie.poster,
            fit: BoxFit.cover,
            placeholder: (context, url) => Container(color: AppTheme.cardDark),
            errorWidget: (context, url, error) => Container(color: AppTheme.cardDark),
          ),
        ),
        // Dark Vignette & Gradient
        Positioned.fill(
          child: Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Color(0x88000000),
                  Colors.transparent,
                  Color(0xFF000000),
                ],
                stops: [0.0, 0.45, 1.0],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
          ),
        ),

        // Controls at bottom right of trailer stage (Screenshot 11)
        Positioned(
          bottom: 16,
          right: 16,
          child: Row(
            children: [
              GestureDetector(
                onTap: onTogglePlayTrailer,
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.65),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white12),
                  ),
                  child: Icon(
                    isPlayingTrailer ? Icons.pause_rounded : Icons.play_arrow_rounded,
                    color: Colors.white,
                    size: 18,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: onToggleMute,
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.65),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white12),
                  ),
                  child: Icon(
                    isMuted ? Icons.volume_off_rounded : Icons.volume_up_rounded,
                    color: Colors.white,
                    size: 18,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
