import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../config/app_theme.dart';
import '../../../models/media_item.dart';
import '../../../models/recommendation.dart';
import '../../../providers/media_provider.dart';
import '../../../providers/recommendation_provider.dart';
import '../../../providers/video_playback_provider.dart';
import '../../../services/movie_service.dart';
import 'top_app_header.dart';
import 'movie_trending_fanned_deck.dart';
import 'media_row.dart';
import 'movie_card.dart';
import 'paginated_horizontal_list.dart';
import '../../common/skeleton_loader.dart';

class DynamicMovieGenreShelf {
  final String genre;
  final String title;
  final List<MovieItem> items;
  int skip;

  DynamicMovieGenreShelf({
    required this.genre,
    required this.title,
    required this.items,
    this.skip = 0,
  });
}

class MovieHomeView extends StatefulWidget {
  const MovieHomeView({super.key});

  @override
  State<MovieHomeView> createState() => _MovieHomeViewState();
}

class _MovieHomeViewState extends State<MovieHomeView> {
  final MovieService _movieService = MovieService();
  final ScrollController _scrollController = ScrollController();

  bool _isLoading = true;
  bool _isLoadingExtra = false;

  // Catalog Shelves with pagination skips
  List<MovieItem> _trendingMovies = [];

  List<MovieItem> _theaterMovies = [];
  int _theaterSkip = 0;

  List<MovieItem> _topSeries = [];
  int _seriesSkip = 0;

  List<MovieItem> _netflixHits = [];
  int _netflixSkip = 0;

  List<MovieItem> _hotstarHits = [];
  int _hotstarSkip = 0;

  // Infinite Dynamic Genre Shelves
  final List<DynamicMovieGenreShelf> _extraGenreShelves = [];
  static const List<String> _genrePool = [
    'Action',
    'Sci-Fi',
    'Thriller',
    'Comedy',
    'Horror',
    'Animation',
    'Drama',
    'Adventure',
    'Crime',
    'Mystery',
    'Romance',
    'Fantasy',
    'Family',
  ];

  @override
  void initState() {
    super.initState();
    _loadCatalogs();
    _scrollController.addListener(_onVerticalScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onVerticalScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onVerticalScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 650 &&
        !_isLoadingExtra &&
        !_isLoading) {
      _loadNextDynamicMovieShelf();
    }
  }

  Future<void> _loadCatalogs() async {
    if (!mounted) return;
    setState(() => _isLoading = true);

    try {
      final results = await Future.wait([
        _movieService.fetchTopMovies(skip: 0),
        _movieService.fetchTheaterReleases(skip: 0),
        _movieService.fetchTopSeries(skip: 0),
        _movieService.fetchByOTT('Netflix', skip: 0),
        _movieService.fetchByOTT('JioHotstar', skip: 0),
      ]);

      if (mounted) {
        setState(() {
          _trendingMovies = results[0];
          _theaterMovies = results[1];
          _topSeries = results[2];
          _netflixHits = results[3];
          _hotstarHits = results[4];
          _isLoading = false;
        });

        // Feed to Recommendation Provider
        final all = [..._trendingMovies, ..._theaterMovies, ..._topSeries, ..._netflixHits];
        context.read<RecommendationProvider>().updateMovieRecommendations(all);

        // Preload first 3 dynamic genre shelves sequentially
        _extraGenreShelves.clear();
        await _loadNextDynamicMovieShelf();
        await _loadNextDynamicMovieShelf();
        await _loadNextDynamicMovieShelf();
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  /// Dynamic vertical scrolling: loads new categories as user scrolls down infinitely
  Future<void> _loadNextDynamicMovieShelf() async {
    if (_isLoadingExtra) return;
    setState(() => _isLoadingExtra = true);
    try {
      final genreIdx = _extraGenreShelves.length % _genrePool.length;
      final cycle = _extraGenreShelves.length ~/ _genrePool.length;
      final genre = _genrePool[genreIdx];
      final skip = cycle * 20;
      final movies = await _movieService.fetchGenreMovies(genre, skip: skip);
      if (mounted) {
        setState(() {
          if (movies.isNotEmpty) {
            _extraGenreShelves.add(
              DynamicMovieGenreShelf(
                genre: genre,
                title: cycle == 0 ? '$genre Blockbusters' : '$genre Classics & Superhits',
                items: movies,
                skip: skip,
              ),
            );
          }
          _isLoadingExtra = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingExtra = false);
    }
  }

  Future<void> _fetchMoreForMovieShelf(int index) async {
    if (index >= _extraGenreShelves.length) return;
    final shelf = _extraGenreShelves[index];
    shelf.skip += 20;
    final items = await _movieService.fetchGenreMovies(shelf.genre, skip: shelf.skip);
    if (mounted && items.isNotEmpty) {
      setState(() {
        shelf.items.addAll(items.where((m) => !shelf.items.any((e) => e.id == m.id)));
      });
    }
  }

  // Horizontal Pagination Loaders (Fetch next 10 items)
  Future<void> _fetchMoreTheaters() async {
    _theaterSkip += 10;
    final items = await _movieService.fetchTheaterReleases(skip: _theaterSkip);
    if (mounted && items.isNotEmpty) {
      setState(() {
        _theaterMovies.addAll(items.where((m) => !_theaterMovies.any((existing) => existing.id == m.id)));
      });
    }
  }

  Future<void> _fetchMoreSeries() async {
    _seriesSkip += 10;
    final items = await _movieService.fetchTopSeries(skip: _seriesSkip);
    if (mounted && items.isNotEmpty) {
      setState(() {
        _topSeries.addAll(items.where((m) => !_topSeries.any((existing) => existing.id == m.id)));
      });
    }
  }

  Future<void> _fetchMoreNetflix() async {
    _netflixSkip += 10;
    final items = await _movieService.fetchByOTT('Netflix', skip: _netflixSkip);
    if (mounted && items.isNotEmpty) {
      setState(() {
        _netflixHits.addAll(items.where((m) => !_netflixHits.any((existing) => existing.id == m.id)));
      });
    }
  }

  Future<void> _fetchMoreHotstar() async {
    _hotstarSkip += 10;
    final items = await _movieService.fetchByOTT('JioHotstar', skip: _hotstarSkip);
    if (mounted && items.isNotEmpty) {
      setState(() {
        _hotstarHits.addAll(items.where((m) => !_hotstarHits.any((existing) => existing.id == m.id)));
      });
    }
  }

  void _onSelectMovie(MovieItem movie) {
    context.read<RecommendationProvider>().logSignal(
          BehaviorSignal(
            type: 'click',
            itemId: movie.id,
            itemType: movie.type,
            timestamp: DateTime.now().millisecondsSinceEpoch,
            metadata: {'genres': movie.genres},
          ),
        );
    context.read<MediaProvider>().openMovieDetails(movie);
  }

  @override
  Widget build(BuildContext context) {
    final rec = context.watch<RecommendationProvider>();
    final media = context.watch<MediaProvider>();

    return Container(
      decoration: const BoxDecoration(
        gradient: AppTheme.movieAmbientGradient,
      ),
      child: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          color: AppTheme.movieCyan,
          backgroundColor: AppTheme.cardDark,
          onRefresh: _loadCatalogs,
          child: SingleChildScrollView(
            controller: _scrollController,
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.only(bottom: 120),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top App Bar
                const TopAppHeader(),

                if (_isLoading) ...[
                  const MovieHomeSkeleton(),
                ] else ...[
                  // 1. Curated Trending 3D Fanned Deck (Screenshot 6)
                  if (_trendingMovies.isNotEmpty)
                    MovieTrendingFannedDeck(
                      movies: _trendingMovies,
                      onSelect: _onSelectMovie,
                    ),
                  const SizedBox(height: 12),

                  // 2. Real Continue Watching Shelf (Only shown when user has saved/history items)
                  _buildContinueWatchingShelf(media),

                  // 3. In Theaters Now • Cinema Exclusive (Screenshot 6) with horizontal pagination
                  if (_theaterMovies.isNotEmpty)
                    MediaRow(
                      title: 'In Theaters Now • Cinema Exclusive',
                      child: PaginatedHorizontalList<MovieItem>(
                        items: _theaterMovies,
                        height: 235,
                        onLoadMore: _fetchMoreTheaters,
                        indicatorColor: AppTheme.theaterAmber,
                        itemBuilder: (context, m, idx) {
                          return MovieCard(
                            movie: m,
                            onTap: () => _onSelectMovie(m),
                          );
                        },
                      ),
                    ),

                  // 4. Recommendation Engine: "For You"
                  if (rec.forYouMovies.isNotEmpty)
                    MediaRow(
                      title: 'For You',
                      subtitle: 'Tailored to your taste',
                      child: PaginatedHorizontalList<MovieItem>(
                        items: rec.forYouMovies,
                        height: 235,
                        indicatorColor: AppTheme.movieCyan,
                        itemBuilder: (context, m, idx) {
                          return MovieCard(
                            movie: m,
                            onTap: () => _onSelectMovie(m),
                          );
                        },
                      ),
                    ),

                  // 5. "Because You Watched" Row
                  if (rec.becauseYouWatched.isNotEmpty)
                    MediaRow(
                      title: 'Because You Watched ${rec.becauseMovieTitle}',
                      child: PaginatedHorizontalList<MovieItem>(
                        items: rec.becauseYouWatched,
                        height: 235,
                        indicatorColor: AppTheme.movieCyan,
                        itemBuilder: (context, m, idx) {
                          return MovieCard(
                            movie: m,
                            onTap: () => _onSelectMovie(m),
                          );
                        },
                      ),
                    ),

                  // 6. Top Series Shelf with horizontal pagination
                  if (_topSeries.isNotEmpty)
                    MediaRow(
                      title: 'Trending Series & Shows',
                      child: PaginatedHorizontalList<MovieItem>(
                        items: _topSeries,
                        height: 235,
                        onLoadMore: _fetchMoreSeries,
                        indicatorColor: AppTheme.movieCyan,
                        itemBuilder: (context, m, idx) {
                          return MovieCard(
                            movie: m,
                            onTap: () => _onSelectMovie(m),
                          );
                        },
                      ),
                    ),

                  // 7. Netflix Hits with horizontal pagination
                  if (_netflixHits.isNotEmpty)
                    MediaRow(
                      title: 'Popular on Netflix',
                      child: PaginatedHorizontalList<MovieItem>(
                        items: _netflixHits,
                        height: 235,
                        onLoadMore: _fetchMoreNetflix,
                        indicatorColor: const Color(0xFFE50914),
                        itemBuilder: (context, m, idx) {
                          return MovieCard(
                            movie: m,
                            onTap: () => _onSelectMovie(m),
                          );
                        },
                      ),
                    ),

                  // 8. Hotstar Hits with horizontal pagination
                  if (_hotstarHits.isNotEmpty)
                    MediaRow(
                      title: 'Top on JioHotstar',
                      child: PaginatedHorizontalList<MovieItem>(
                        items: _hotstarHits,
                        height: 235,
                        onLoadMore: _fetchMoreHotstar,
                        indicatorColor: const Color(0xFF0F52BA),
                        itemBuilder: (context, m, idx) {
                          return MovieCard(
                            movie: m,
                            onTap: () => _onSelectMovie(m),
                          );
                        },
                      ),
                    ),

                  // 9. Infinite Dynamic Genre Shelves
                  for (int i = 0; i < _extraGenreShelves.length; i++)
                    MediaRow(
                      title: _extraGenreShelves[i].title,
                      child: PaginatedHorizontalList<MovieItem>(
                        items: _extraGenreShelves[i].items,
                        height: 235,
                        onLoadMore: () => _fetchMoreForMovieShelf(i),
                        indicatorColor: AppTheme.movieCyan,
                        itemBuilder: (context, m, idx) {
                          return MovieCard(
                            movie: m,
                            onTap: () => _onSelectMovie(m),
                          );
                        },
                      ),
                    ),

                  // Infinite Scroll Spinner
                  if (_isLoadingExtra)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 24),
                      child: Center(
                        child: CircularProgressIndicator(color: AppTheme.movieCyan, strokeWidth: 2),
                      ),
                    ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  // Continue Watching horizontal cards with real saved playback progress
  Widget _buildContinueWatchingShelf(MediaProvider media) {
    final playback = context.watch<VideoPlaybackProvider>();
    final watchHistory = playback.recentWatchProgress.where((p) => p.canResume).take(8).toList();

    if (watchHistory.isNotEmpty) {
      return MediaRow(
        title: 'Continue Watching',
        child: SizedBox(
          height: 125,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: watchHistory.length,
            itemBuilder: (context, idx) {
              final wp = watchHistory[idx];
              final movieItem = MovieItem(
                id: wp.contentId,
                name: wp.title,
                type: wp.mediaType,
                poster: wp.poster,
                background: wp.background,
              );

              return GestureDetector(
                onTap: () => _onSelectMovie(movieItem),
                child: Container(
                  width: 170,
                  margin: const EdgeInsets.only(right: 12),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    color: AppTheme.cardDark,
                    border: Border.all(color: Colors.white10, width: 0.8),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(13),
                    child: Stack(
                      children: [
                        Positioned.fill(
                          child: Image.network(
                            (wp.background != null && wp.background!.isNotEmpty)
                                ? wp.background!
                                : wp.poster,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) =>
                                Container(color: AppTheme.cardDark),
                          ),
                        ),
                        Positioned.fill(
                          child: Container(
                            decoration: const BoxDecoration(
                              gradient: LinearGradient(
                                colors: [Colors.transparent, Color(0xDD000000)],
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                              ),
                            ),
                          ),
                        ),
                        Positioned(
                          top: 8,
                          right: 8,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.7),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              wp.formattedPosition,
                              style: const TextStyle(
                                color: AppTheme.movieCyan,
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ),
                        Positioned(
                          bottom: 10,
                          left: 10,
                          right: 10,
                          child: Text(
                            wp.season != null && wp.episode != null
                                ? '${wp.title} • S${wp.season}E${wp.episode}'
                                : wp.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12.5,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        Positioned(
                          bottom: 0,
                          left: 0,
                          right: 0,
                          child: LinearProgressIndicator(
                            value: wp.progressRatio,
                            backgroundColor: Colors.white12,
                            valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.movieCyan),
                            minHeight: 3,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      );
    }

    final recentWatchItems = media.watchlist.take(5).toList();
    if (recentWatchItems.isEmpty) {
      return const SizedBox.shrink();
    }

    return MediaRow(
      title: 'Saved to Watch Later',
      child: SizedBox(
        height: 125,
        child: ListView.builder(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          itemCount: recentWatchItems.length,
          itemBuilder: (context, idx) {
            final item = recentWatchItems[idx];

            return GestureDetector(
              onTap: () => _onSelectMovie(item),
              child: Container(
                width: 170,
                margin: const EdgeInsets.only(right: 12),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  color: AppTheme.cardDark,
                  border: Border.all(color: Colors.white10, width: 0.8),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(13),
                  child: Stack(
                    children: [
                      Positioned.fill(
                        child: Image.network(
                          (item.background != null && item.background!.isNotEmpty)
                              ? item.background!
                              : item.poster,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) => Container(color: AppTheme.cardDark),
                        ),
                      ),
                      Positioned.fill(
                        child: Container(
                          decoration: const BoxDecoration(
                            gradient: LinearGradient(
                              colors: [Colors.transparent, Color(0xDD000000)],
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                            ),
                          ),
                        ),
                      ),
                      Positioned(
                        bottom: 10,
                        left: 10,
                        right: 10,
                        child: Text(
                          item.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12.5,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
