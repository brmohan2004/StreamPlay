import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../config/app_theme.dart';
import '../../../models/media_item.dart';

class MovieTrendingFannedDeck extends StatefulWidget {
  final List<MovieItem> movies;
  final Function(MovieItem) onSelect;

  const MovieTrendingFannedDeck({
    super.key,
    required this.movies,
    required this.onSelect,
  });

  @override
  State<MovieTrendingFannedDeck> createState() => _MovieTrendingFannedDeckState();
}

class _MovieTrendingFannedDeckState extends State<MovieTrendingFannedDeck> {
  int _currentIndex = 0;

  void _next() {
    if (widget.movies.isNotEmpty) {
      setState(() {
        _currentIndex = (_currentIndex + 1) % widget.movies.length;
      });
    }
  }

  void _prev() {
    if (widget.movies.isNotEmpty) {
      setState(() {
        _currentIndex = (_currentIndex - 1 + widget.movies.length) % widget.movies.length;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.movies.isEmpty) {
      return const SizedBox(height: 310);
    }

    final total = widget.movies.length;
    final currentMovie = widget.movies[_currentIndex];
    final prevMovie = widget.movies[(_currentIndex - 1 + total) % total];
    final nextMovie = widget.movies[(_currentIndex + 1) % total];

    return GestureDetector(
      onHorizontalDragEnd: (details) {
        if ((details.primaryVelocity ?? 0) < -200) {
          _next();
        } else if ((details.primaryVelocity ?? 0) > 200) {
          _prev();
        }
      },
      child: Container(
        height: 330,
        alignment: Alignment.center,
        child: Stack(
          alignment: Alignment.center,
          clipBehavior: Clip.none,
          children: [
            // Ambient Cyan Backlight (Screenshot 6)
            Positioned(
              child: Container(
                width: 240,
                height: 240,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      const Color(0xFF00B4FF).withValues(alpha: 0.28),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),

            // Left Fanned Card (rotated -10 degrees)
            Transform(
              alignment: Alignment.bottomCenter,
              transform: Matrix4.identity()
                ..translateByDouble(-75.0, 10.0, 0.0, 1.0)
                ..rotateZ(-0.16)
                ..scaleByDouble(0.85, 0.85, 1.0, 1.0),
              child: Opacity(
                opacity: 0.55,
                child: _buildPosterCard(prevMovie, isHero: false),
              ),
            ),

            // Right Fanned Card (rotated +10 degrees)
            Transform(
              alignment: Alignment.bottomCenter,
              transform: Matrix4.identity()
                ..translateByDouble(75.0, 10.0, 0.0, 1.0)
                ..rotateZ(0.16)
                ..scaleByDouble(0.85, 0.85, 1.0, 1.0),
              child: Opacity(
                opacity: 0.55,
                child: _buildPosterCard(nextMovie, isHero: false),
              ),
            ),

            // Center Hero Card
            GestureDetector(
              onTap: () => widget.onSelect(currentMovie),
              child: _buildPosterCard(currentMovie, isHero: true),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPosterCard(MovieItem movie, {required bool isHero}) {
    return Container(
      width: isHero ? 200 : 180,
      height: isHero ? 285 : 260,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        color: AppTheme.cardDark,
        border: Border.all(
          color: isHero ? AppTheme.movieCyan.withValues(alpha: 0.4) : Colors.white10,
          width: isHero ? 1.5 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.7),
            blurRadius: isHero ? 20 : 10,
            offset: const Offset(0, 8),
          ),
          if (isHero)
            BoxShadow(
              color: AppTheme.movieCyanGlow.withValues(alpha: 0.25),
              blurRadius: 18,
            ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(19),
        child: Stack(
          children: [
            // Poster Image
            Positioned.fill(
              child: CachedNetworkImage(
                imageUrl: movie.poster,
                fit: BoxFit.cover,
                placeholder: (context, url) => Container(color: AppTheme.cardDark),
                errorWidget: (context, url, error) => Container(
                  color: AppTheme.cardDark,
                  child: const Icon(Icons.movie, size: 40, color: Colors.white24),
                ),
              ),
            ),

            // Bottom Gradient Overlay for typography legibility
            Positioned.fill(
              child: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Colors.transparent,
                      Color(0x44000000),
                      Color(0xF0000000),
                    ],
                    stops: [0.4, 0.7, 1.0],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
              ),
            ),

            // Hero Details (Title, Year/Genre, PLAY button)
            if (isHero)
              Positioned(
                bottom: 12,
                left: 12,
                right: 12,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            movie.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 14.5,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            [
                              if (movie.releaseInfo != null && movie.releaseInfo!.isNotEmpty) movie.releaseInfo!,
                              if (movie.genres.isNotEmpty) movie.genres.first,
                            ].join(' • '),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: AppTheme.textMuted,
                              fontSize: 10.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),

                    // [ PLAY ] Button (Matching Screenshot 6)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFF283446),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.white12, width: 0.8),
                      ),
                      child: const Text(
                        'PLAY',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 10.5,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

