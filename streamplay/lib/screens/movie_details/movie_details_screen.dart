import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../models/media_item.dart';
import '../../models/video_playback_models.dart';
import '../../providers/media_provider.dart';
import '../../providers/video_playback_provider.dart';
import '../../services/movie_service.dart';
import '../../services/video_source_service.dart';
import '../video_player/source_selector_sheet.dart';
import '../video_player/video_player_screen.dart';
import 'components/movie_hero_stage.dart';
import 'components/movie_meta_section.dart';
import 'components/movie_theater_banner.dart';
import 'components/movie_action_buttons.dart';
import 'components/movie_episodes_section.dart';
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
  EpisodeItem? _selectedEpisode;
  bool _isPlayingTrailer = true;
  bool _isMuted = true;
  bool _isLaunchingPlayback = false;

  @override
  void initState() {
    super.initState();
    _loadDetailsAndSimilar();
  }

  @override
  void didUpdateWidget(covariant MovieDetailsScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.movie.id != widget.movie.id) {
      _fullDetails = null;
      _similarMovies = [];
      _selectedEpisode = null;
      _loadDetailsAndSimilar();
    }
  }

  Future<void> _loadDetailsAndSimilar() async {
    try {
      final details = await _movieService.fetchMovieDetails(widget.movie.id, widget.movie.type);
      final genre = widget.movie.genres.isNotEmpty ? widget.movie.genres.first : 'Action';
      final similar = await _movieService.fetchGenreMovies(genre);

      if (mounted) {
        final resolved = details ?? widget.movie;
        EpisodeItem? defaultEp;
        if (resolved.type == 'series' && (resolved.videos?.isNotEmpty ?? false)) {
          final sorted = List<EpisodeItem>.from(resolved.videos!)
            ..sort((a, b) {
              final s = a.season.compareTo(b.season);
              return s != 0 ? s : a.number.compareTo(b.number);
            });
          defaultEp = sorted.first;
        }
        setState(() {
          _fullDetails = resolved;
          _selectedEpisode = defaultEp;
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

  Future<void> _handlePlayPressed(MovieItem movie, {EpisodeItem? episode}) async {
    final targetEpisode = episode ?? (movie.type == 'series' ? _selectedEpisode : null);
    if (targetEpisode != null && mounted) {
      setState(() => _selectedEpisode = targetEpisode);
    }

    final playback = context.read<VideoPlaybackProvider>();
    final savedProgress = playback.getWatchProgress(
      movie.id,
      season: targetEpisode?.season,
      episode: targetEpisode?.number,
    );

    bool loading = true;
    String? errorMessage;
    List<VideoSourceItem> sources = const [];

    // Show source selector modal immediately so user sees live resolution progress
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0E1420),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetCtx) {
        bool started = false;

        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            Future<void> runLookup({bool forceRefresh = false}) async {
              setSheetState(() {
                loading = true;
                errorMessage = null;
              });
              try {
                final result = await playback.resolveSources(
                  movie: movie,
                  episode: targetEpisode,
                  forceRefresh: forceRefresh,
                );
                if (ctx.mounted) {
                  setSheetState(() {
                    sources = result.sources;
                    loading = false;
                  });
                }
              } on VideoSourceException catch (e) {
                if (ctx.mounted) {
                  setSheetState(() {
                    sources = const [];
                    errorMessage = e.message;
                    loading = false;
                  });
                }
              } catch (_) {
                if (ctx.mounted) {
                  setSheetState(() {
                    sources = const [];
                    errorMessage = 'Unable to contact authorized streaming providers.';
                    loading = false;
                  });
                }
              }
            }

            if (!started) {
              started = true;
              WidgetsBinding.instance.addPostFrameCallback((_) => runLookup());
            }

            return SourceSelectorSheet(
              movie: movie,
              episode: targetEpisode,
              isLoading: loading,
              errorMessage: errorMessage,
              sources: sources,
              savedProgress: savedProgress,
              onRetry: () => runLookup(forceRefresh: true),
              onSelectSource: (selectedSource) async {
                Navigator.of(sheetCtx).pop();
                await _startDirectPlayback(
                  movie: movie,
                  episode: targetEpisode,
                  selectedSource: selectedSource,
                  availableSources: sources,
                  savedProgress: savedProgress,
                );
              },
            );
          },
        );
      },
    );
  }

  Future<void> _startDirectPlayback({
    required MovieItem movie,
    EpisodeItem? episode,
    required VideoSourceItem selectedSource,
    required List<VideoSourceItem> availableSources,
    WatchProgress? savedProgress,
  }) async {
    if (!mounted) return;
    setState(() => _isLaunchingPlayback = true);

    final playback = context.read<VideoPlaybackProvider>();
    try {
      final session = await playback.createPlaybackSession(
        source: selectedSource,
        movie: movie,
      );

      if (!mounted) return;
      setState(() => _isLaunchingPlayback = false);

      final resumePos = (savedProgress != null && savedProgress.canResume)
          ? Duration(seconds: savedProgress.positionSeconds)
          : null;

      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => VideoPlayerScreen(
            movie: movie,
            episode: episode,
            initialSession: session,
            availableSources: availableSources,
            resumePosition: resumePos,
          ),
        ),
      );
    } on VideoSourceException catch (e) {
      if (mounted) {
        setState(() => _isLaunchingPlayback = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message)),
        );
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLaunchingPlayback = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to initialize authorized playback session.')),
        );
      }
    }
  }

  String _buildPlayLabel(MovieItem movie, WatchProgress? progress) {
    if (progress != null && progress.canResume) {
      if (movie.type == 'series' && _selectedEpisode != null) {
        return 'Resume S${_selectedEpisode!.season} E${_selectedEpisode!.number} (${progress.formattedPosition})';
      }
      return 'Resume (${progress.formattedPosition})';
    }
    if (movie.type == 'series' && _selectedEpisode != null) {
      return 'Play S${_selectedEpisode!.season} • E${_selectedEpisode!.number}';
    }
    return 'Play Movie Full Screen';
  }

  @override
  Widget build(BuildContext context) {
    final media = context.watch<MediaProvider>();
    final playback = context.watch<VideoPlaybackProvider>();
    final m = _fullDetails ?? widget.movie;
    final isSaved = media.isWatchlist(m.id);

    final activeProgress = playback.getWatchProgress(
      m.id,
      season: m.type == 'series' ? _selectedEpisode?.season : null,
      episode: m.type == 'series' ? _selectedEpisode?.number : null,
    );

    final matchingSources =
        playback.resolvedContentId == m.id ? playback.resolvedSources : const <VideoSourceItem>[];
    final resolvedAudioLangs = matchingSources.expand((s) => s.audioLanguages).toSet().toList();
    final resolvedSubLangs = matchingSources.expand((s) => s.subtitleLanguages).toSet().toList();

    return Scaffold(
      backgroundColor: AppTheme.pureBlack,
      body: Stack(
        children: [
          // Scrollable Content
          SingleChildScrollView(
            padding: const EdgeInsets.only(bottom: 120),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. Hero Stage
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

                // 3. IN THEATERS EARLY ACCESS Banner
                if (m.isTheaterPrint) ...[
                  const MovieTheaterBanner(),
                  const SizedBox(height: 18),
                ],

                // 4. Action Buttons (Play / Resume + Watch Later + Share)
                MovieActionButtons(
                  movie: m,
                  isSaved: isSaved,
                  playLabel: _buildPlayLabel(m, activeProgress),
                  isLoading: _isLaunchingPlayback,
                  onPlayFullScreen: () => _handlePlayPressed(m),
                  onToggleWatchLater: () => media.toggleWatchLater(m),
                  onShare: () {},
                ),
                const SizedBox(height: 24),

                // 5. Series Episodes Selector (for TV series)
                if (m.type == 'series' && (m.videos?.isNotEmpty ?? false)) ...[
                  MovieEpisodesSection(
                    episodes: m.videos!,
                    selectedEpisode: _selectedEpisode,
                    getProgress: (ep) => playback.getWatchProgress(
                      m.id,
                      season: ep.season,
                      episode: ep.number,
                    ),
                    onPlayEpisode: (ep) => _handlePlayPressed(m, episode: ep),
                  ),
                  const SizedBox(height: 24),
                ],

                // 6. Storyline & Audio/Subtitles
                MovieStorylineSection(
                  movie: m,
                  audioLanguages: resolvedAudioLangs,
                  subtitleLanguages: resolvedSubLangs,
                  onTapTracks: () => _handlePlayPressed(m),
                ),
                const SizedBox(height: 24),

                // 7. More Like This Shelf
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
