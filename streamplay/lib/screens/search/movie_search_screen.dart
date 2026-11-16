import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../config/app_svg_icons.dart';
import '../../models/media_item.dart';
import '../../models/recommendation.dart';
import '../../providers/media_provider.dart';
import '../../providers/navigation_provider.dart';
import '../../providers/recommendation_provider.dart';
import '../../services/movie_service.dart';
import '../../services/music_service.dart';
import '../common/skeleton_loader.dart';
import '../home/components/movie_card.dart';
import 'components/voice_search_modal.dart';

/// Dedicated Movie & Series Search Screen matching MovieSearchScreen.tsx & Screenshot 1.
class MovieSearchScreen extends StatefulWidget {
  const MovieSearchScreen({super.key});

  @override
  State<MovieSearchScreen> createState() => _MovieSearchScreenState();
}

class _MovieSearchScreenState extends State<MovieSearchScreen> {
  final MovieService _movieService = MovieService();
  final MusicService _musicService = MusicService();
  final TextEditingController _queryController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FocusNode _focusNode = FocusNode();

  Timer? _debounceTimer;
  bool _isSearching = false;
  bool _isLoadingMore = false;
  bool _hasMore = true;
  int _page = 0;
  String _selectedCapsule = 'All';

  List<MovieItem> _movieResults = [];
  List<SongItem> _relatedMusic = [];
  List<String> _recentSearches = [];
  List<String> _popularTags = [
    'Spider-Man',
    'Godzilla Minus One',
    'Heart of the Beast',
    'Resident Evil',
    'Primetime',
    'Obsession',
    'The Invite',
    'Sense and Sensibility',
  ];

  static const List<String> _searchCapsules = [
    'All',
    'Latest',
    'Dubbed',
    'Series',
    'Movies',
    'Actors'
  ];

  @override
  void initState() {
    super.initState();
    _loadRecentsAndPopular();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _queryController.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _loadRecentsAndPopular() {
    final media = context.read<MediaProvider>();
    setState(() {
      _recentSearches = media.getRecentSearches(AppMode.movies);
    });

    _movieService.fetchTopMovies().then((movies) {
      if (movies.isNotEmpty && mounted) {
        setState(() {
          _popularTags = movies.map((m) => m.name).take(10).toList();
        });
      }
    }).catchError((_) {});
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 400 &&
        !_isLoadingMore &&
        _hasMore &&
        !_isSearching &&
        _queryController.text.trim().isNotEmpty) {
      _loadMore();
    }
  }

  void _onQueryChanged(String query) {
    _debounceTimer?.cancel();
    final trimmed = query.trim();
    if (trimmed.isEmpty) {
      setState(() {
        _movieResults = [];
        _relatedMusic = [];
        _isSearching = false;
      });
      return;
    }

    _debounceTimer = Timer(const Duration(milliseconds: 280), () {
      _triggerSearch(trimmed);
    });
  }

  Future<void> _triggerSearch(String term) async {
    final trimmed = term.trim();
    if (trimmed.isEmpty) return;

    setState(() {
      _isSearching = true;
      _page = 0;
      _hasMore = true;
    });

    final media = context.read<MediaProvider>();
    media.saveRecentSearch(trimmed, AppMode.movies);
    setState(() {
      _recentSearches = media.getRecentSearches(AppMode.movies);
    });

    context.read<RecommendationProvider>().logSignal(
          BehaviorSignal(
            type: 'search',
            itemId: 'search-movie-$trimmed',
            itemType: 'movie',
            timestamp: DateTime.now().millisecondsSinceEpoch,
            metadata: {'query': trimmed},
          ),
        );

    try {
      final results = await Future.wait([
        _movieService.searchMovies(trimmed, page: 0, limit: 25),
        _musicService.searchSongs('$trimmed soundtrack', limit: 6),
      ]);

      if (mounted) {
        final movies = results[0] as List<MovieItem>;
        final songs = results[1] as List<SongItem>;
        setState(() {
          _movieResults = movies;
          _relatedMusic = songs;
          _isSearching = false;
          _hasMore = movies.length >= 25;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _movieResults = [];
          _relatedMusic = [];
          _isSearching = false;
          _hasMore = false;
        });
      }
    }
  }

  Future<void> _loadMore() async {
    final query = _queryController.text.trim();
    if (query.isEmpty || _isLoadingMore || !_hasMore) return;

    setState(() {
      _isLoadingMore = true;
    });

    final nextPage = _page + 1;
    try {
      final more = await _movieService.searchMovies(query, page: nextPage, limit: 25);
      if (mounted) {
        setState(() {
          _page = nextPage;
          _isLoadingMore = false;
          if (more.isEmpty) {
            _hasMore = false;
          } else {
            final seenIds = _movieResults.map((m) => m.id).toSet();
            final uniqueMore = more.where((m) => !seenIds.contains(m.id)).toList();
            _movieResults.addAll(uniqueMore);
            if (more.length < 25) _hasMore = false;
          }
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isLoadingMore = false;
          _hasMore = false;
        });
      }
    }
  }

  List<MovieItem> _filterMovies(List<MovieItem> movies, NavigationProvider nav) {
    return movies.where((m) {
      if (nav.selectedOTT != 'All' && m.ottProvider != null) {
        if (!m.ottProvider!.toLowerCase().contains(nav.selectedOTT.toLowerCase())) {
          return false;
        }
      }
      if (nav.activeCategory == 'Movies' && m.type != 'movie') return false;
      if (nav.activeCategory == 'Series' && m.type != 'series') return false;

      // Filter by dynamic capsule
      if (_selectedCapsule == 'Series' && m.type != 'series') return false;
      if (_selectedCapsule == 'Movies' && m.type != 'movie') return false;

      return true;
    }).toList();
  }

  void _openVoiceSearchDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F151F),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return VoiceSearchModal(
          accentColor: AppTheme.movieCyan,
          title: 'Listening for Movies & Shows...',
          hint: 'Say a movie name, actor, director, or OTT platform',
          suggestions: const [
            'Leo Tamil 4K',
            'Vijay Sethupathi hits',
            'Action Blockbusters',
            'Stranger Things 4K',
            'Jailer 4K',
            'Netflix Originals',
            'Sci-Fi Thriller',
            'A.R. Rahman musical films',
          ],
          onSelect: (term) {
            Navigator.pop(ctx);
            _queryController.text = term;
            _triggerSearch(term);
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final nav = context.watch<NavigationProvider>();
    final media = context.read<MediaProvider>();
    final filtered = _filterMovies(_movieResults, nav);
    final hasQuery = _queryController.text.trim().isNotEmpty;

    return Scaffold(
      backgroundColor: AppTheme.pureBlack,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            // 1. Search Bar Header (Matching Screenshot 1)
            Container(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 8),
              color: AppTheme.pureBlack,
              child: Row(
                children: [
                  // Circular Back Button
                  GestureDetector(
                    onTap: () => nav.setActiveScreen(ScreenName.home),
                    child: Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: AppTheme.cardDark,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white10),
                      ),
                      child: Center(
                        child: AppSvgIcons.chevronLeft(color: Colors.white, size: 20),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),

                  // Minimal Search Input
                  Expanded(
                    child: Container(
                      height: 48,
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      decoration: BoxDecoration(
                        color: const Color(0xFF121720),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(
                          color: hasQuery ? AppTheme.movieCyan.withValues(alpha: 0.6) : Colors.white12,
                          width: 1.2,
                        ),
                      ),
                      child: Row(
                        children: [
                          AppSvgIcons.movies(color: AppTheme.movieCyan, size: 19),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextField(
                              controller: _queryController,
                              focusNode: _focusNode,
                              onChanged: _onQueryChanged,
                              onSubmitted: (q) => _triggerSearch(q),
                              style: const TextStyle(color: Colors.white, fontSize: 14.5),
                              cursorColor: AppTheme.movieCyan,
                              decoration: const InputDecoration(
                                hintText: 'Search movies, series, OTT originals...',
                                hintStyle: TextStyle(color: Color(0xFF6B7280), fontSize: 14),
                                border: InputBorder.none,
                                isDense: true,
                              ),
                            ),
                          ),
                          if (hasQuery)
                            GestureDetector(
                              onTap: () {
                                _queryController.clear();
                                _onQueryChanged('');
                              },
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 4),
                                child: AppSvgIcons.close(color: const Color(0xFF9CA3AF), size: 16),
                              ),
                            ),
                          const SizedBox(width: 4),
                          GestureDetector(
                            onTap: _openVoiceSearchDialog,
                            child: AppSvgIcons.mic(color: AppTheme.movieCyan, size: 19),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Dynamic Search Capsules Strip (when query active)
            if (hasQuery)
              Container(
                height: 38,
                margin: const EdgeInsets.only(bottom: 6),
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  itemCount: _searchCapsules.length,
                  itemBuilder: (context, idx) {
                    final cap = _searchCapsules[idx];
                    final isSel = _selectedCapsule == cap;
                    return GestureDetector(
                      onTap: () {
                        setState(() {
                          _selectedCapsule = cap;
                        });
                      },
                      child: Container(
                        margin: const EdgeInsets.only(right: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                        decoration: BoxDecoration(
                          color: isSel ? AppTheme.movieCyan : const Color(0xFF141A24),
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(
                            color: isSel ? AppTheme.movieCyan : Colors.white12,
                          ),
                        ),
                        child: Text(
                          cap == 'Latest' ? '⚡ Latest' : cap,
                          style: TextStyle(
                            color: isSel ? Colors.black : Colors.white70,
                            fontSize: 12.5,
                            fontWeight: isSel ? FontWeight.w700 : FontWeight.w500,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),

            // Main Content Body
            Expanded(
              child: hasQuery
                  ? _buildSearchResults(filtered)
                  : _buildRecentAndTrending(media),
            ),
          ],
        ),
      ),
    );
  }

  // 1. Initial State: Recent Searches & Trending Cinema Searches (Screenshot 1)
  Widget _buildRecentAndTrending(MediaProvider media) {
    return ListView(
      physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 120),
      children: [
        // Recent Searches Block
        if (_recentSearches.isNotEmpty) ...[
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  AppSvgIcons.history(color: const Color(0xFF9CA3AF), size: 16),
                  const SizedBox(width: 8),
                  const Text(
                    'Recent Searches',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
              GestureDetector(
                onTap: () {
                  media.clearRecentSearches(AppMode.movies);
                  setState(() {
                    _recentSearches = [];
                  });
                },
                child: const Text(
                  'Clear All',
                  style: TextStyle(color: Color(0xFF6B7280), fontSize: 13, fontWeight: FontWeight.w500),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _recentSearches.map((term) {
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFF141922),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white12),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    GestureDetector(
                      onTap: () {
                        _queryController.text = term;
                        _triggerSearch(term);
                      },
                      child: Text(
                        term,
                        style: const TextStyle(color: Colors.white, fontSize: 13),
                      ),
                    ),
                    const SizedBox(width: 6),
                    GestureDetector(
                      onTap: () {
                        media.deleteRecentSearch(term, AppMode.movies);
                        setState(() {
                          _recentSearches = media.getRecentSearches(AppMode.movies);
                        });
                      },
                      child: AppSvgIcons.close(color: const Color(0xFF9CA3AF), size: 12),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 24),
        ],

        // Trending Cinema Searches Block (Screenshot 1)
        Row(
          children: [
            AppSvgIcons.flame(color: AppTheme.movieCyan, size: 16),
            const SizedBox(width: 8),
            const Text(
              'Trending Cinema Searches',
              style: TextStyle(
                color: Colors.white,
                fontSize: 14.5,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _popularTags.map((tag) {
            return GestureDetector(
              onTap: () {
                _queryController.text = tag;
                _triggerSearch(tag);
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFF10151E),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppTheme.movieCyan.withValues(alpha: 0.3)),
                ),
                child: Text(
                  tag,
                  style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  // 2. Active Search Results
  Widget _buildSearchResults(List<MovieItem> movies) {
    if (_isSearching) {
      return Padding(
        padding: const EdgeInsets.all(16),
        child: SkeletonGrid(count: 6),
      );
    }

    if (movies.isEmpty && _relatedMusic.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppSvgIcons.movies(color: Colors.white24, size: 48),
            const SizedBox(height: 12),
            const Text(
              'No titles found',
              style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 4),
            const Text(
              'Try searching for another movie, series or actor',
              style: TextStyle(color: Color(0xFF6B7280), fontSize: 13),
            ),
          ],
        ),
      );
    }

    return ListView(
      controller: _scrollController,
      physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
      children: [
        // Results Count Header
        Text(
          'Movies & Series (${movies.length})',
          style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 12),

        // 2-Column Movie Grid
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            childAspectRatio: 0.68,
            crossAxisSpacing: 12,
            mainAxisSpacing: 14,
          ),
          itemCount: movies.length,
          itemBuilder: (context, idx) {
            final movie = movies[idx];
            return MovieCard(
              movie: movie,
              onTap: () {
                context.read<MediaProvider>().openMovieDetails(movie);
              },
            );
          },
        ),

        // Infinite Scroll Spinner
        if (_isLoadingMore)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 20),
            child: Center(
              child: CircularProgressIndicator(color: AppTheme.movieCyan, strokeWidth: 2),
            ),
          ),

        // Related Music & Soundtracks Section (matching MovieSearchScreen.tsx)
        if (_relatedMusic.isNotEmpty) ...[
          const SizedBox(height: 28),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  AppSvgIcons.music(color: AppTheme.musicLime, size: 17),
                  const SizedBox(width: 8),
                  Text(
                    'Soundtracks & Related Music (${_relatedMusic.length})',
                    style: const TextStyle(color: Colors.white, fontSize: 14.5, fontWeight: FontWeight.w700),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppTheme.musicLime.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text(
                  '320kbps Master',
                  style: TextStyle(color: AppTheme.musicLime, fontSize: 10.5, fontWeight: FontWeight.w800),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _relatedMusic.length,
            itemBuilder: (context, idx) {
              final song = _relatedMusic[idx];
              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF10151E),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white10),
                ),
                child: Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.network(
                        song.image,
                        width: 44,
                        height: 44,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) => Container(
                          width: 44,
                          height: 44,
                          color: AppTheme.cardDark,
                          child: AppSvgIcons.music(color: Colors.white30, size: 20),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            song.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: Colors.white, fontSize: 13.5, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            song.artist,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    GestureDetector(
                      onTap: () {
                        context.read<MediaProvider>().playSong(song, _relatedMusic);
                      },
                      child: Container(
                        width: 32,
                        height: 32,
                        decoration: const BoxDecoration(
                          color: AppTheme.musicLime,
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: AppSvgIcons.play(color: Colors.black, size: 14),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ],
    );
  }
}
