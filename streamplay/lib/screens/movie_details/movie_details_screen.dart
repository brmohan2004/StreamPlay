import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../models/media_item.dart';
import '../../providers/media_provider.dart';
import '../../services/movie_service.dart';
import 'components/movie_hero_stage.dart';
import 'components/movie_meta_section.dart';
import 'components/movie_theater_banner.dart';
import 'components/movie_action_buttons.dart';
import 'components/movie_storyline_section.dart';
import 'components/movie_similar_shelf.dart';
import 'components/movie_details_top_bar.dart';

class MovieDetailsScreen extends StatefulWidget {
  final MovieItem movie;

  const MovieDetailsScreen({super.key, required this.movie});

  @override
  State<MovieDetailsScreen> createState() => _MovieDetailsScreenState();
}

class _MovieDetailsScreenState extends State<MovieDetailsScreen> {
  final MovieService _movieService = MovieService();
  MovieItem? _fullDetails;
  List<MovieItem> _similarMovies = [];
  bool _isPlayingTrailer = true;
  bool _isMuted = true;

  @override
  void initState() {
    super.initState();
    _loadDetailsAndSimilar();
  }

  Future<void> _loadDetailsAndSimilar() async {
    try {
      final details = await _movieService.fetchMovieDetails(widget.movie.id, widget.movie.type);
      final genre = widget.movie.genres.isNotEmpty ? widget.movie.genres.first : 'Action';
      final similar = await _movieService.fetchGenreMovies(genre);

      if (mounted) {
        setState(() {
          _fullDetails = details ?? widget.movie;
          _similarMovies = similar.where((m) => m.id != widget.movie.id).toList();
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _fullDetails = widget.movie;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final media = context.watch<MediaProvider>();
    final m = _fullDetails ?? widget.movie;
    final isSaved = media.isWatchlist(m.id);

    return Scaffold(
      backgroundColor: AppTheme.pureBlack,
      body: Stack(
        children: [
          // Scrollable Content
          SingleChildScrollView(
            padding: const EdgeInsets.only(bottom: 60),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. Hero Video / Trailer Stage (Screenshot 11)
                MovieHeroStage(
                  movie: m,
                  isPlayingTrailer: _isPlayingTrailer,
                  isMuted: _isMuted,
                  onTogglePlayTrailer: () {
                    setState(() {
                      _isPlayingTrailer = !_isPlayingTrailer;
                    });
                  },
                  onToggleMute: () {
                    setState(() {
                      _isMuted = !_isMuted;
                    });
                  },
                ),
                const SizedBox(height: 14),

                // 2. Movie Info & Badges
                MovieMetaSection(movie: m),
                const SizedBox(height: 16),

                // 3. IN THEATERS EARLY ACCESS Banner (Screenshot 11)
                if (m.isTheaterPrint) ...[
                  const MovieTheaterBanner(),
                  const SizedBox(height: 18),
                ],

                // 4. Action Buttons (Play Movie Full Screen + Watch Later + Share)
                MovieActionButtons(
                  movie: m,
                  isSaved: isSaved,
                  onPlayFullScreen: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Playing Movie in Full Screen')),
                    );
                  },
                  onToggleWatchLater: () => media.toggleWatchLater(m),
                  onShare: () {},
                ),
                const SizedBox(height: 24),

                // 5. Storyline & Audio/Subtitles
                MovieStorylineSection(movie: m),
                const SizedBox(height: 24),

                // 6. More Like This Shelf
                MovieSimilarShelf(
                  similarMovies: _similarMovies,
                  onSelectMovie: (item) => media.openMovieDetails(item),
                ),
              ],
            ),
          ),

          // Floating Top Back & Share Navigation Bar
          MovieDetailsTopBar(
            onBack: () => media.closeMovieDetails(),
            onShare: () {},
          ),
        ],
      ),
    );
  }
}
