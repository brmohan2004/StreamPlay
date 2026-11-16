import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../config/app_theme.dart';
import '../../models/media_item.dart';
import '../../models/recommendation.dart';
import '../../providers/media_provider.dart';
import '../../providers/recommendation_provider.dart';
import '../../services/music_service.dart';
import '../common/add_to_playlist_modal.dart';
import '../common/skeleton_loader.dart';

class ArtistDetailScreen extends StatefulWidget {
  final ArtistItem artist;

  const ArtistDetailScreen({
    super.key,
    required this.artist,
  });

  @override
  State<ArtistDetailScreen> createState() => _ArtistDetailScreenState();
}

class _ArtistDetailScreenState extends State<ArtistDetailScreen> {
  final MusicService _musicService = MusicService();
  final ScrollController _scrollController = ScrollController();
  List<SongItem> _songs = [];
  bool _isLoading = true;
  bool _isLoadingMore = false;
  int _artistPage = 1;
  bool _hasMore = true;

  @override
  void initState() {
    super.initState();
    _fetchArtistSongs();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 400 &&
        !_isLoadingMore &&
        !_isLoading &&
        _hasMore) {
      _fetchMoreSongs();
    }
  }

  Future<void> _fetchArtistSongs() async {
    try {
      final results = await _musicService.searchSongs('${widget.artist.name} hits', limit: 30);
      if (mounted) {
        setState(() {
          _songs = results;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _fetchMoreSongs() async {
    if (_isLoadingMore || !_hasMore) return;
    setState(() => _isLoadingMore = true);
    _artistPage++;

    try {
      final more = await _musicService.fetchArtistDiscographyBatch(
        widget.artist.name,
        page: _artistPage,
        limit: 20,
      );

      final existingIds = _songs.map((s) => s.id).toSet();
      final existingKeys = _songs.map((s) => '${s.title.toLowerCase().trim()}|${s.artist.toLowerCase().trim()}').toSet();
      final unique = more.where((s) {
        final k = '${s.title.toLowerCase().trim()}|${s.artist.toLowerCase().trim()}';
        return !existingIds.contains(s.id) && !existingKeys.contains(k);
      }).toList();

      if (mounted) {
        setState(() {
          if (unique.isNotEmpty) {
            _songs.addAll(unique);
          } else if (_artistPage > 8) {
            _hasMore = false;
          }
          _isLoadingMore = false;
        });

        // Pitch newly discovered songs into queue if currently playing from this artist
        final media = context.read<MediaProvider>();
        if (unique.isNotEmpty && media.currentSong != null && _songs.any((s) => s.id == media.currentSong!.id)) {
          media.appendToQueue(unique);
        }
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingMore = false);
    }
  }

  void _playSong(SongItem song, int index) {
    final media = context.read<MediaProvider>();
    media.playSong(song, _songs);

    // Track artist listening habit for personalized recommendations
    context.read<RecommendationProvider>().logSignal(
      BehaviorSignal(
        itemId: song.id,
        itemType: 'song',
        type: 'play_start',
        timestamp: DateTime.now().millisecondsSinceEpoch,
        metadata: {
          'title': song.title,
          'artist': widget.artist.name,
        },
      ),
    );
  }

  void _playAll() {
    if (_songs.isNotEmpty) {
      _playSong(_songs.first, 0);
    }
  }

  void _shufflePlay() {
    if (_songs.isNotEmpty) {
      final shuffled = List<SongItem>.from(_songs)..shuffle();
      final media = context.read<MediaProvider>();
      media.playSong(shuffled.first, shuffled);
    }
  }

  void _openAddToPlaylist(SongItem song) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => AddToPlaylistModal(song: song),
    );
  }

  @override
  Widget build(BuildContext context) {
    final media = context.watch<MediaProvider>();
    final currentId = media.currentSong?.id;

    return Scaffold(
      backgroundColor: AppTheme.pureBlack,
      body: CustomScrollView(
        controller: _scrollController,
        physics: const BouncingScrollPhysics(),
        slivers: [
          // 1. Collapsing Hero Header
          SliverAppBar(
            expandedHeight: 300,
            pinned: true,
            backgroundColor: const Color(0xFF0F141C),
            leading: GestureDetector(
              onTap: () => Navigator.of(context).pop(),
              child: Container(
                margin: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.5),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.arrow_back_rounded, color: Colors.white, size: 20),
              ),
            ),
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  // Backdrop image
                  CachedNetworkImage(
                    imageUrl: widget.artist.imageUrl,
                    fit: BoxFit.cover,
                    placeholder: (context, url) => Container(color: AppTheme.cardDark),
                    errorWidget: (context, url, error) => Container(color: AppTheme.cardDark),
                  ),

                  // Heavy Gradient Shade
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.transparent,
                          Colors.black.withValues(alpha: 0.6),
                          AppTheme.pureBlack,
                        ],
                      ),
                    ),
                  ),

                  // Artist Profile Info
                  Positioned(
                    left: 20,
                    right: 20,
                    bottom: 24,
                    child: Row(
                      children: [
                        // Circle avatar with Lime Border
                        Container(
                          width: 84,
                          height: 84,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(color: AppTheme.musicLime, width: 2.5),
                            boxShadow: [
                              BoxShadow(
                                color: AppTheme.musicLimeGlow.withValues(alpha: 0.4),
                                blurRadius: 16,
                              ),
                            ],
                          ),
                          child: ClipOval(
                            child: CachedNetworkImage(
                              imageUrl: widget.artist.imageUrl,
                              fit: BoxFit.cover,
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),

                        // Name & Verified Badge
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Row(
                                children: [
                                  const Icon(Icons.verified_rounded, color: AppTheme.musicLime, size: 16),
                                  const SizedBox(width: 4),
                                  Text(
                                    'VERIFIED ARTIST',
                                    style: TextStyle(
                                      color: AppTheme.musicLime.withValues(alpha: 0.9),
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                      letterSpacing: 0.8,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                widget.artist.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 22,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: -0.3,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                _isLoading ? 'Loading discography...' : '${_songs.length} Popular Tracks',
                                style: const TextStyle(
                                  color: AppTheme.textMuted,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // 2. Play All / Shuffle Action Bar
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
              child: Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _songs.isEmpty ? null : _playAll,
                      icon: const Icon(Icons.play_arrow_rounded, color: Colors.black, size: 22),
                      label: const Text(
                        'Play All',
                        style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.musicLime,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        elevation: 0,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton.icon(
                    onPressed: _songs.isEmpty ? null : _shufflePlay,
                    icon: const Icon(Icons.shuffle_rounded, color: Colors.white, size: 18),
                    label: const Text(
                      'Shuffle',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white.withValues(alpha: 0.1),
                      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 18),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      elevation: 0,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // 3. Songs List
          if (_isLoading)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
                child: Column(
                  children: List.generate(
                    6,
                    (_) => const Padding(
                      padding: EdgeInsets.only(bottom: 12),
                      child: ShimmerContainer(width: double.infinity, height: 62, borderRadius: 12),
                    ),
                  ),
                ),
              ),
            )
          else if (_songs.isEmpty)
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.all(40),
                child: Center(
                  child: Text(
                    'No tracks available for this artist.',
                    style: TextStyle(color: AppTheme.textMuted),
                  ),
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 120),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final song = _songs[index];
                    final isPlaying = song.id == currentId;

                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      decoration: BoxDecoration(
                        color: isPlaying ? AppTheme.musicLime.withValues(alpha: 0.12) : AppTheme.cardDark,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isPlaying ? AppTheme.musicLime.withValues(alpha: 0.4) : Colors.white.withValues(alpha: 0.05),
                          width: 1,
                        ),
                      ),
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        leading: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            SizedBox(
                              width: 24,
                              child: Text(
                                '${index + 1}'.padLeft(2, '0'),
                                style: TextStyle(
                                  color: isPlaying ? AppTheme.musicLime : AppTheme.textMuted,
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: CachedNetworkImage(
                                imageUrl: song.image,
                                width: 44,
                                height: 44,
                                fit: BoxFit.cover,
                                placeholder: (context, url) => Container(color: AppTheme.cardDark),
                                errorWidget: (context, url, error) => const Icon(Icons.music_note, color: Colors.white24),
                              ),
                            ),
                          ],
                        ),
                        title: Text(
                          song.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: isPlaying ? AppTheme.musicLime : Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        subtitle: Text(
                          song.album,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: AppTheme.textMuted,
                            fontSize: 11,
                          ),
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (isPlaying)
                              Container(
                                margin: const EdgeInsets.only(right: 8),
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppTheme.musicLime,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: const Text(
                                  'PLAYING',
                                  style: TextStyle(
                                    color: Colors.black,
                                    fontSize: 8,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            IconButton(
                              icon: const Icon(Icons.more_vert_rounded, color: Colors.white54, size: 20),
                              onPressed: () => _openAddToPlaylist(song),
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                            ),
                          ],
                        ),
                        onTap: () => _playSong(song, index),
                      ),
                    );
                  },
                  childCount: _songs.length,
                ),
              ),
            ),
          if (_isLoadingMore)
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(
                  child: SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(color: AppTheme.musicLime, strokeWidth: 2.2),
                  ),
                ),
              ),
            ),
          const SliverToBoxAdapter(
            child: SizedBox(height: 100),
          ),
        ],
      ),
    );
  }
}
