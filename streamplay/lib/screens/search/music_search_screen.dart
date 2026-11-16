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
import '../../services/music_service.dart';
import '../common/add_to_playlist_modal.dart';
import '../common/skeleton_loader.dart';
import 'components/voice_search_modal.dart';

/// Dedicated Music Search Screen matching MusicSearchScreen.tsx & Screenshot 4
/// Enhanced with:
/// - Compact 30px category capsules
/// - Multi-tier Spotify/JioSaavn search ranking algorithm
/// - 15-item infinite pagination batches
/// - Full interactive category filters (All, Full Songs, Songs, 🎬 Video Songs, Artists, Playlists, ⚡ 1-Min Hooks)
/// - Interactive Voice Search / Mic listening dialog
class MusicSearchScreen extends StatefulWidget {
  const MusicSearchScreen({super.key});

  @override
  State<MusicSearchScreen> createState() => _MusicSearchScreenState();
}

class _MusicSearchScreenState extends State<MusicSearchScreen> {
  final MusicService _musicService = MusicService();
  final TextEditingController _queryController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FocusNode _focusNode = FocusNode();

  Timer? _debounceTimer;
  bool _isSearching = false;
  bool _isLoadingMore = false;
  bool _hasMore = true;
  int _page = 1;
  String _selectedCapsule = 'All';

  List<SongItem> _songResults = [];
  List<String> _recentSearches = [];

  static const List<String> _trendingArtists = [
    'Arijit Singh',
    'Taylor Swift',
    'Diljit Dosanjh',
    'Anirudh',
    'Coldplay',
    'The Weeknd',
    'Shreya Ghoshal',
    'Pritam',
    'Sid Sriram',
    'Billie Eilish',
  ];

  static const List<String> _resultCapsules = [
    'All',
    'Full Songs',
    'Songs',
    '🎬 Video Songs',
    'Artists',
    'Playlists',
    '⚡ 1-Min Hooks',
  ];

  @override
  void initState() {
    super.initState();
    _loadRecentsAndSession();
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

  void _loadRecentsAndSession() {
    final media = context.read<MediaProvider>();
    setState(() {
      _recentSearches = media.getRecentSearches(AppMode.music);
      if (media.activeMusicSearchResults.isNotEmpty) {
        _queryController.text = media.activeMusicSearchQuery;
        _songResults = List.from(media.activeMusicSearchResults);
        _selectedCapsule = media.activeMusicSearchCapsule;
        _page = media.activeMusicSearchPage;
        _hasMore = true;
      }
    });
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 250 &&
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
        _songResults = [];
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
      _page = 1;
      _hasMore = true;
    });

    final media = context.read<MediaProvider>();
    media.saveRecentSearch(trimmed, AppMode.music);
    setState(() {
      _recentSearches = media.getRecentSearches(AppMode.music);
    });

    context.read<RecommendationProvider>().logSignal(
          BehaviorSignal(
            type: 'search',
            itemId: 'search-music-$trimmed',
            itemType: 'song',
            timestamp: DateTime.now().millisecondsSinceEpoch,
            metadata: {'query': trimmed},
          ),
        );

    try {
      final fullOnly = _selectedCapsule != '⚡ 1-Min Hooks';
      final songs = await _musicService.searchSongsWithRanking(
        trimmed,
        page: 1,
        limit: 15,
        fullSongsOnly: fullOnly,
      );
      if (mounted) {
        setState(() {
          _songResults = songs;
          _isSearching = false;
          _hasMore = songs.length >= 10;
        });
        media.saveMusicSearchSession(
          query: trimmed,
          results: _songResults,
          capsule: _selectedCapsule,
          page: _page,
        );
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _songResults = [];
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
      final fullOnly = _selectedCapsule != '⚡ 1-Min Hooks';
      final more = await _musicService.searchSongsWithRanking(
        query,
        page: nextPage,
        limit: 15,
        fullSongsOnly: fullOnly,
      );
      if (mounted) {
        setState(() {
          _page = nextPage;
          _isLoadingMore = false;
          if (more.isEmpty) {
            _hasMore = false;
          } else {
            final seenIds = _songResults.map((s) => s.id).toSet();
            final uniqueMore = more.where((s) => !seenIds.contains(s.id)).toList();
            _songResults.addAll(uniqueMore);
            if (more.length < 10) _hasMore = false;
          }
        });
        context.read<MediaProvider>().saveMusicSearchSession(
              query: query,
              results: _songResults,
              capsule: _selectedCapsule,
              page: _page,
            );
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

  List<SongItem> _filterResults(List<SongItem> songs) {
    switch (_selectedCapsule) {
      case 'Full Songs':
        return songs.where((s) => !s.isShortClip && s.duration >= 90).toList();
      case 'Songs':
        return songs.where((s) => !s.isShortClip && s.duration > 0).toList();
      case '🎬 Video Songs':
        return songs.where((s) => s.videoUrl != null || s.title.toLowerCase().contains('video') || s.title.toLowerCase().contains('song')).toList();
      case '⚡ 1-Min Hooks':
        return songs.where((s) => s.isShortClip || (s.duration < 90 && s.duration > 0)).toList();
      default:
        return songs;
    }
  }

  /// Extracts distinct artists from search results
  List<Map<String, String>> _extractArtists(List<SongItem> songs) {
    final Map<String, String> artistMap = {};
    for (final song in songs) {
      final primary = song.artist.split(RegExp(r'[,&]')).first.trim();
      if (primary.isNotEmpty && !artistMap.containsKey(primary)) {
        artistMap[primary] = song.image;
      }
    }
    return artistMap.entries.map((e) => {'name': e.key, 'image': e.value}).toList();
  }

  /// Groups songs into album/playlists
  Map<String, List<SongItem>> _extractPlaylists(List<SongItem> songs) {
    final Map<String, List<SongItem>> groups = {};
    for (final song in songs) {
      final key = song.album.isNotEmpty ? song.album : '${song.artist} Hits';
      groups.putIfAbsent(key, () => []).add(song);
    }
    return groups;
  }

  String _formatDuration(int? sec) {
    if (sec == null || sec <= 0) return '';
    final m = sec ~/ 60;
    final s = (sec % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  // Interactive Voice Search Dialog with live waveform equalizer & voice prompt launcher
  void _openVoiceSearchDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF10161F),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return VoiceSearchModal(
          accentColor: AppTheme.musicLime,
          title: 'Listening for Music...',
          hint: 'Say a song title, artist, composer, or album',
          suggestions: const [
            'Anirudh Ravichander',
            'Arijit Singh hits',
            'Tamil latest chartbusters',
            'A.R. Rahman melody',
            'Taylor Swift',
            'Arabic Kuthu',
            'Badass Leo',
            'Sid Sriram romantic',
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
    final media = context.watch<MediaProvider>();
    final hasQuery = _queryController.text.trim().isNotEmpty;

    return Scaffold(
      backgroundColor: AppTheme.pureBlack,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            // 1. Search Bar Header (Matching Screenshot 4)
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

                  // Minimal Search Input with Lime Music Note
                  Expanded(
                    child: Container(
                      height: 48,
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      decoration: BoxDecoration(
                        color: const Color(0xFF101912),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(
                          color: hasQuery ? AppTheme.musicLime.withValues(alpha: 0.6) : Colors.white12,
                          width: 1.2,
                        ),
                      ),
                      child: Row(
                        children: [
                          AppSvgIcons.music(color: AppTheme.musicLime, size: 19),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextField(
                              controller: _queryController,
                              focusNode: _focusNode,
                              onChanged: _onQueryChanged,
                              onSubmitted: (q) => _triggerSearch(q),
                              style: const TextStyle(color: Colors.white, fontSize: 14.5),
                              cursorColor: AppTheme.musicLime,
                              decoration: const InputDecoration(
                                hintText: 'Search JioSaavn, Audius, Apple Music...',
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
                                context.read<MediaProvider>().clearMusicSearchSession();
                              },
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 4),
                                child: AppSvgIcons.close(color: const Color(0xFF9CA3AF), size: 16),
                              ),
                            ),
                          const SizedBox(width: 4),
                          // Working Interactive Mic Icon
                          GestureDetector(
                            onTap: _openVoiceSearchDialog,
                            child: AppSvgIcons.mic(color: AppTheme.musicLime, size: 19),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // 2. Compact Category Capsules (Reduced to 30px height)
            if (hasQuery)
              Container(
                height: 30,
                margin: const EdgeInsets.only(bottom: 8),
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  itemCount: _resultCapsules.length,
                  itemBuilder: (context, idx) {
                    final cap = _resultCapsules[idx];
                    final isSel = _selectedCapsule == cap;
                    return GestureDetector(
                      onTap: () {
                        setState(() {
                          _selectedCapsule = cap;
                        });
                        if (_queryController.text.trim().isNotEmpty) {
                          _triggerSearch(_queryController.text.trim());
                        }
                      },
                      child: Container(
                        margin: const EdgeInsets.only(right: 6),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: isSel ? AppTheme.musicLime : const Color(0xFF142016),
                          borderRadius: BorderRadius.circular(15),
                          border: Border.all(
                            color: isSel ? AppTheme.musicLime : Colors.white12,
                          ),
                        ),
                        child: Center(
                          child: Text(
                            cap,
                            style: TextStyle(
                              color: isSel ? Colors.black : Colors.white70,
                              fontSize: 11.5,
                              fontWeight: isSel ? FontWeight.w700 : FontWeight.w500,
                            ),
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
                  ? _buildSearchResultsBody(media)
                  : _buildRecentAndArtists(media),
            ),
          ],
        ),
      ),
    );
  }

  // 1. Initial State: Recent Searches & Trending Artists & Creators (Screenshot 4)
  Widget _buildRecentAndArtists(MediaProvider media) {
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
                  media.clearRecentSearches(AppMode.music);
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
                  color: const Color(0xFF131D15),
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
                        media.deleteRecentSearch(term, AppMode.music);
                        setState(() {
                          _recentSearches = media.getRecentSearches(AppMode.music);
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

        // Trending Artists & Creators Block (Screenshot 4)
        Row(
          children: [
            AppSvgIcons.sparkles(color: AppTheme.musicLime, size: 16),
            const SizedBox(width: 8),
            const Text(
              'Trending Artists & Creators',
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
          children: _trendingArtists.map((artist) {
            return GestureDetector(
              onTap: () {
                _queryController.text = artist;
                _triggerSearch(artist);
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFF101C12),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppTheme.musicLime.withValues(alpha: 0.3)),
                ),
                child: Text(
                  artist,
                  style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  // 2. Active Search Results Body Routing
  Widget _buildSearchResultsBody(MediaProvider media) {
    if (_isSearching) {
      return Padding(
        padding: const EdgeInsets.all(16),
        child: SkeletonList(count: 8),
      );
    }

    if (_songResults.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppSvgIcons.music(color: Colors.white24, size: 48),
            const SizedBox(height: 12),
            const Text(
              'No songs found',
              style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 4),
            const Text(
              'Try searching for another track, artist or album',
              style: TextStyle(color: Color(0xFF6B7280), fontSize: 13),
            ),
          ],
        ),
      );
    }

    // If 'Artists' capsule is selected, render Artist Bubbles
    if (_selectedCapsule == 'Artists') {
      final artists = _extractArtists(_songResults);
      return GridView.builder(
        controller: _scrollController,
        physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 120),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 3,
          crossAxisSpacing: 12,
          mainAxisSpacing: 16,
          childAspectRatio: 0.8,
        ),
        itemCount: artists.length,
        itemBuilder: (context, idx) {
          final art = artists[idx];
          return GestureDetector(
            onTap: () {
              _queryController.text = art['name']!;
              setState(() {
                _selectedCapsule = 'All';
              });
              _triggerSearch(art['name']!);
            },
            child: Column(
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: AppTheme.musicLime.withValues(alpha: 0.5), width: 1.5),
                  ),
                  child: ClipOval(
                    child: Image.network(
                      art['image']!,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => Container(
                        color: AppTheme.cardDark,
                        child: const Icon(Icons.person, color: Colors.white54, size: 40),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  art['name']!,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                ),
                const Text(
                  'Artist',
                  style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 10),
                ),
              ],
            ),
          );
        },
      );
    }

    // If 'Playlists' capsule is selected, render Playlist cards
    if (_selectedCapsule == 'Playlists') {
      final playlists = _extractPlaylists(_songResults);
      return ListView(
        controller: _scrollController,
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 120),
        children: playlists.entries.map((entry) {
          final title = entry.key;
          final songs = entry.value;
          final cover = songs.first.image;

          return GestureDetector(
            onTap: () {
              media.playSong(songs.first, songs);
            },
            child: Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF101712),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.white10),
              ),
              child: Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: Image.network(
                      cover,
                      width: 58,
                      height: 58,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => Container(
                        width: 58,
                        height: 58,
                        color: AppTheme.cardDark,
                        child: AppSvgIcons.music(color: Colors.white24, size: 24),
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Colors.white, fontSize: 14.5, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${songs.length} Tracks • ${songs.first.artist}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    width: 36,
                    height: 36,
                    decoration: const BoxDecoration(
                      color: AppTheme.musicLime,
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: AppSvgIcons.play(color: Colors.black, size: 16),
                    ),
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      );
    }

    final filtered = _filterResults(_songResults);

    return ListView(
      controller: _scrollController,
      physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
      children: [
        // Results Count Header
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '${_selectedCapsule == 'All' ? 'Songs & Tracks' : _selectedCapsule} (${filtered.length})',
              style: const TextStyle(color: Colors.white, fontSize: 14.5, fontWeight: FontWeight.w700),
            ),
            Text(
              'Ranked by relevance',
              style: TextStyle(color: AppTheme.musicLime.withValues(alpha: 0.8), fontSize: 11),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Songs List
        ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: filtered.length,
          itemBuilder: (context, idx) {
            final song = filtered[idx];
            final isCurrent = media.currentSong?.id == song.id;
            final isPlaying = isCurrent && media.isPlayingSong;
            final isLiked = media.isLikedSong(song.id);

            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: isCurrent ? AppTheme.musicLime.withValues(alpha: 0.08) : const Color(0xFF101712),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isCurrent ? AppTheme.musicLime.withValues(alpha: 0.4) : Colors.white10,
                ),
              ),
              child: Row(
                children: [
                  // Cover Image with Play indicator
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Stack(
                      children: [
                        Image.network(
                          song.image,
                          width: 48,
                          height: 48,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) => Container(
                            width: 48,
                            height: 48,
                            color: AppTheme.cardDark,
                            child: AppSvgIcons.music(color: Colors.white24, size: 22),
                          ),
                        ),
                        if (isPlaying)
                          Positioned.fill(
                            child: Container(
                              color: Colors.black45,
                              child: Center(
                                child: AppSvgIcons.pause(color: AppTheme.musicLime, size: 18),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),

                  // Title & Meta
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          song.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: isCurrent ? AppTheme.musicLime : Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Row(
                          children: [
                            Flexible(
                              child: Text(
                                '${song.artist} • ${song.album}',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(color: Color(0xFF9CA3AF), fontSize: 12),
                              ),
                            ),
                            if (song.duration > 0) ...[
                              const SizedBox(width: 4),
                              Text(
                                '• ${_formatDuration(song.duration)}',
                                style: const TextStyle(color: Color(0xFF6B7280), fontSize: 11),
                              ),
                            ],
                            const SizedBox(width: 6),
                            if (song.isShortClip || (song.duration > 0 && song.duration < 90))
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFF9F1C).withValues(alpha: 0.2),
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(color: const Color(0xFFFF9F1C).withValues(alpha: 0.6)),
                                ),
                                child: const Text(
                                  '⚡ 1-MIN HOOK',
                                  style: TextStyle(
                                    color: Color(0xFFFF9F1C),
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              )
                            else
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                decoration: BoxDecoration(
                                  color: AppTheme.musicLime.withValues(alpha: 0.2),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  song.source == 'JioSaavn' ? '320k FULL' : song.source,
                                  style: const TextStyle(
                                    color: AppTheme.musicLime,
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // Actions: Like, Add to playlist, Play
                  IconButton(
                    onPressed: () => media.toggleLikeSong(song.id),
                    icon: AppSvgIcons.heart(
                      color: isLiked ? AppTheme.musicLime : Colors.white38,
                      filled: isLiked,
                      size: 18,
                    ),
                  ),
                  IconButton(
                    onPressed: () {
                      showModalBottomSheet(
                        context: context,
                        isScrollControlled: true,
                        backgroundColor: Colors.transparent,
                        builder: (_) => AddToPlaylistModal(song: song),
                      );
                    },
                    icon: AppSvgIcons.playlistAdd(color: Colors.white54, size: 18),
                  ),
                  GestureDetector(
                    onTap: () {
                      if (isCurrent) {
                        media.toggleSongPlay();
                      } else {
                        media.playSong(song, filtered);
                      }
                    },
                    child: Container(
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(
                        color: isPlaying ? Colors.white : AppTheme.musicLime,
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: isPlaying
                            ? AppSvgIcons.pause(color: Colors.black, size: 16)
                            : AppSvgIcons.play(color: Colors.black, size: 16),
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        ),

        // Infinite Scroll Progress Indicator (Batches of 15)
        if (_isLoadingMore)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 20),
            child: Center(
              child: CircularProgressIndicator(color: AppTheme.musicLime, strokeWidth: 2),
            ),
          ),
      ],
    );
  }
}
