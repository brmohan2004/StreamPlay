import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../config/app_theme.dart';
import '../../../models/media_item.dart';

/* ========================================================
   1. COMPACT TILE CARD (Pill Shape with Artwork, Title, Artist, Rank)
   Matches Spotify / Apple Music quick list tile layout
   ======================================================== */
class CompactTileCard extends StatelessWidget {
  final SongItem song;
  final VoidCallback onPlay;
  final VoidCallback? onAddToPlaylist;
  final int? rank;
  final double width;

  const CompactTileCard({
    super.key,
    required this.song,
    required this.onPlay,
    this.onAddToPlaylist,
    this.rank,
    this.width = 240,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onPlay,
      child: Container(
        width: width,
        height: 58,
        padding: const EdgeInsets.fromLTRB(6, 6, 8, 6),
        decoration: BoxDecoration(
          color: const Color(0xFF0F1523),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: rank != null && rank! <= 3
                ? (rank == 1
                    ? const Color(0xFFFFD54F).withValues(alpha: 0.3)
                    : (rank == 2
                        ? const Color(0xFF80D8FF).withValues(alpha: 0.3)
                        : const Color(0xFFCCFF90).withValues(alpha: 0.3)))
                : Colors.white.withValues(alpha: 0.08),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.35),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Row(
          children: [
            // Thumbnail with optional Rank Badge
            Stack(
              clipBehavior: Clip.none,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: CachedNetworkImage(
                    imageUrl: song.image,
                    width: 46,
                    height: 46,
                    fit: BoxFit.cover,
                    placeholder: (context, url) => Container(color: AppTheme.cardDark),
                    errorWidget: (context, url, error) => Container(
                      color: AppTheme.cardDark,
                      child: const Icon(Icons.music_note, size: 20, color: Colors.white24),
                    ),
                  ),
                ),
                if (rank != null)
                  Positioned(
                    top: 2,
                    left: 2,
                    child: _buildRankBadge(rank!),
                  ),
              ],
            ),
            const SizedBox(width: 10),

            // Song Info (Title + Artist)
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    song.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    song.artist,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.55),
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),

            // Quick Add to Playlist Action
            if (onAddToPlaylist != null)
              IconButton(
                onPressed: onAddToPlaylist,
                icon: const Icon(Icons.playlist_add_rounded, size: 18),
                color: Colors.white60,
                splashRadius: 18,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildRankBadge(int r) {
    Gradient grad;
    Color textColor = Colors.black;
    if (r == 1) {
      grad = const LinearGradient(colors: [Color(0xFFFFD54F), Color(0xFFFF8F00)]);
    } else if (r == 2) {
      grad = const LinearGradient(colors: [Color(0xFF80D8FF), Color(0xFF0091EA)]);
    } else if (r == 3) {
      grad = const LinearGradient(colors: [Color(0xFFCCFF90), Color(0xFF64DD17)]);
    } else {
      grad = const LinearGradient(colors: [Color(0xFF333333), Color(0xFF1E1E1E)]);
      textColor = Colors.white;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
      decoration: BoxDecoration(
        gradient: grad,
        borderRadius: BorderRadius.circular(4),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.4),
            blurRadius: 4,
          ),
        ],
      ),
      child: Text(
        '#$r',
        style: TextStyle(
          color: textColor,
          fontSize: 8.5,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

/* ========================================================
   2. TWO-ROW HORIZONTAL SCROLL GRID
   Lists compact cards vertically into 2 rows, scrolling horizontally
   ======================================================== */
class TwoRowScrollGrid extends StatefulWidget {
  final List<SongItem> songs;
  final Function(SongItem, int) onPlay;
  final Function(SongItem)? onAddToPlaylist;
  final Future<void> Function()? onLoadMore;
  final bool hasMore;

  const TwoRowScrollGrid({
    super.key,
    required this.songs,
    required this.onPlay,
    this.onAddToPlaylist,
    this.onLoadMore,
    this.hasMore = true,
  });

  @override
  State<TwoRowScrollGrid> createState() => _TwoRowScrollGridState();
}

class _TwoRowScrollGridState extends State<TwoRowScrollGrid> {
  final ScrollController _scrollController = ScrollController();
  bool _isLoadingMore = false;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!widget.hasMore || _isLoadingMore || widget.onLoadMore == null) return;
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 150) {
      _loadMore();
    }
  }

  Future<void> _loadMore() async {
    if (_isLoadingMore) return;
    setState(() => _isLoadingMore = true);
    try {
      await widget.onLoadMore!();
    } catch (_) {}
    if (mounted) setState(() => _isLoadingMore = false);
  }

  @override
  Widget build(BuildContext context) {
    if (widget.songs.isEmpty) return const SizedBox.shrink();

    // Group songs into pairs of two for each horizontal column
    final List<List<SongItem>> pairs = [];
    for (int i = 0; i < widget.songs.length; i += 2) {
      final pair = <SongItem>[widget.songs[i]];
      if (i + 1 < widget.songs.length) {
        pair.add(widget.songs[i + 1]);
      }
      pairs.add(pair);
    }

    final totalCount = pairs.length + (_isLoadingMore ? 1 : 0);

    return SizedBox(
      height: 126, // 58px + 10px gap + 58px
      child: ListView.builder(
        controller: _scrollController,
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: totalCount,
        itemBuilder: (context, colIdx) {
          if (colIdx < pairs.length) {
            final col = pairs[colIdx];
            return Padding(
              padding: const EdgeInsets.only(right: 10),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  CompactTileCard(
                    song: col[0],
                    rank: colIdx * 2 + 1,
                    onPlay: () => widget.onPlay(col[0], colIdx * 2),
                    onAddToPlaylist: widget.onAddToPlaylist != null
                        ? () => widget.onAddToPlaylist!(col[0])
                        : null,
                  ),
                  if (col.length > 1)
                    CompactTileCard(
                      song: col[1],
                      rank: colIdx * 2 + 2,
                      onPlay: () => widget.onPlay(col[1], colIdx * 2 + 1),
                      onAddToPlaylist: widget.onAddToPlaylist != null
                          ? () => widget.onAddToPlaylist!(col[1])
                          : null,
                    )
                  else
                    const SizedBox(height: 58, width: 240),
                ],
              ),
            );
          }

          return Container(
            width: 70,
            height: 126,
            margin: const EdgeInsets.only(right: 12),
            decoration: BoxDecoration(
              color: AppTheme.cardDark.withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white10),
            ),
            child: const Center(
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.musicLime),
              ),
            ),
          );
        },
      ),
    );
  }
}

/* ========================================================
   3. SQUARE MINIMALIST CARD (Top Picks For You)
   ======================================================== */
class SquareMusicCard extends StatelessWidget {
  final SongItem song;
  final VoidCallback onTap;
  final double size;

  const SquareMusicCard({
    super.key,
    required this.song,
    required this.onTap,
    this.size = 146,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        width: size,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: size,
              height: size,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                color: const Color(0xFF0D121C),
                border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.6),
                    blurRadius: 16,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(13),
                child: Stack(
                  children: [
                    Positioned.fill(
                      child: CachedNetworkImage(
                        imageUrl: song.image,
                        fit: BoxFit.cover,
                        placeholder: (context, url) => Container(color: AppTheme.cardDark),
                        errorWidget: (context, url, error) => Container(
                          color: AppTheme.cardDark,
                          child: const Icon(Icons.music_note, size: 36, color: Colors.white24),
                        ),
                      ),
                    ),
                    Positioned(
                      bottom: 8,
                      right: 8,
                      child: Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.black.withValues(alpha: 0.85),
                          border: Border.all(color: AppTheme.musicLime.withValues(alpha: 0.6), width: 1.2),
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.musicLimeGlow.withValues(alpha: 0.3),
                              blurRadius: 8,
                            ),
                          ],
                        ),
                        child: const Center(
                          child: Icon(
                            Icons.play_arrow_rounded,
                            color: AppTheme.musicLime,
                            size: 22,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              song.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              song.artist,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.55),
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/* ========================================================
   4. VINYL DISC RECORD CARD (Retro & Golden Classics)
   Realistic circular vinyl record disc sliding out of sleeve
   ======================================================== */
class VinylMusicCard extends StatelessWidget {
  final SongItem song;
  final VoidCallback onTap;
  final double size;

  const VinylMusicCard({
    super.key,
    required this.song,
    required this.onTap,
    this.size = 140,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        width: size + 24,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: size + 24,
              height: size,
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Positioned(
                    top: 4,
                    right: 0,
                    child: Container(
                      width: size - 8,
                      height: size - 8,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: const RadialGradient(
                          colors: [
                            Color(0xFF161616),
                            Color(0xFF080808),
                            Color(0xFF1A1A1A),
                            Color(0xFF000000),
                          ],
                          stops: [0.25, 0.5, 0.8, 1.0],
                        ),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.2), width: 1.5),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.8),
                            blurRadius: 14,
                            offset: const Offset(4, 4),
                          ),
                        ],
                      ),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          Container(
                            width: (size - 8) * 0.76,
                            height: (size - 8) * 0.76,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white10, width: 1),
                            ),
                          ),
                          Container(
                            width: (size - 8) * 0.52,
                            height: (size - 8) * 0.52,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white.withValues(alpha: 0.08), width: 1),
                            ),
                          ),
                          Container(
                            width: 24,
                            height: 24,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: AppTheme.musicLime,
                              border: Border.all(color: Colors.black, width: 3),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  Positioned(
                    top: 0,
                    left: 0,
                    child: Container(
                      width: size,
                      height: size,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.8),
                            blurRadius: 18,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(9),
                        child: Stack(
                          children: [
                            Positioned.fill(
                              child: CachedNetworkImage(
                                imageUrl: song.image,
                                fit: BoxFit.cover,
                                placeholder: (context, url) => Container(color: AppTheme.cardDark),
                                errorWidget: (context, url, error) => Container(
                                  color: AppTheme.cardDark,
                                  child: const Icon(Icons.music_note, color: Colors.white24),
                                ),
                              ),
                            ),
                            Positioned.fill(
                              child: Container(
                                color: Colors.black.withValues(alpha: 0.2),
                                child: Center(
                                  child: Container(
                                    width: 38,
                                    height: 38,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: Colors.black.withValues(alpha: 0.65),
                                      border: Border.all(color: Colors.white30),
                                    ),
                                    child: const Center(
                                      child: Icon(Icons.play_arrow_rounded, color: Colors.white, size: 24),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              song.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              song.artist,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.55),
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/* ========================================================
   5. CINEMATIC VIDEO CARD (Video Songs & High Energy)
   ======================================================== */
class CinematicVideoCard extends StatelessWidget {
  final SongItem song;
  final VoidCallback onTap;
  final double width;

  const CinematicVideoCard({
    super.key,
    required this.song,
    required this.onTap,
    this.width = 240,
  });

  @override
  Widget build(BuildContext context) {
    final height = width * 9 / 16;

    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        width: width,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: width,
              height: height,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                color: const Color(0xFF0A0A0A),
                border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.7),
                    blurRadius: 18,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(15),
                child: Stack(
                  children: [
                    Positioned.fill(
                      child: CachedNetworkImage(
                        imageUrl: song.image,
                        fit: BoxFit.cover,
                        placeholder: (context, url) => Container(color: AppTheme.cardDark),
                        errorWidget: (context, url, error) => Container(
                          color: AppTheme.cardDark,
                          child: const Icon(Icons.videocam, color: Colors.white24, size: 36),
                        ),
                      ),
                    ),
                    Positioned.fill(
                      child: Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              Colors.transparent,
                              Colors.black.withValues(alpha: 0.75),
                            ],
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                          ),
                        ),
                      ),
                    ),
                    Center(
                      child: Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.black.withValues(alpha: 0.75),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.5), width: 1.5),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.6),
                              blurRadius: 12,
                            ),
                          ],
                        ),
                        child: const Center(
                          child: Icon(Icons.play_arrow_rounded, color: Colors.white, size: 28),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              song.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              song.artist,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.55),
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/* ========================================================
   6. PORTRAIT POSTER CARD (Trending in City & Regional Melodies)
   ======================================================== */
class PortraitMusicCard extends StatelessWidget {
  final SongItem song;
  final VoidCallback onTap;
  final double width;

  const PortraitMusicCard({
    super.key,
    required this.song,
    required this.onTap,
    this.width = 140,
  });

  @override
  Widget build(BuildContext context) {
    final height = width * 5 / 4;

    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        width: width,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: width,
              height: height,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                color: const Color(0xFF0E1624),
                border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.7),
                    blurRadius: 18,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(15),
                child: Stack(
                  children: [
                    Positioned.fill(
                      child: CachedNetworkImage(
                        imageUrl: song.image,
                        fit: BoxFit.cover,
                        placeholder: (context, url) => Container(color: AppTheme.cardDark),
                        errorWidget: (context, url, error) => Container(
                          color: AppTheme.cardDark,
                          child: const Icon(Icons.music_note, color: Colors.white24, size: 36),
                        ),
                      ),
                    ),
                    Positioned.fill(
                      child: Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              Colors.transparent,
                              Colors.black.withValues(alpha: 0.65),
                            ],
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                          ),
                        ),
                      ),
                    ),
                    Positioned(
                      bottom: 8,
                      right: 8,
                      child: Container(
                        width: 34,
                        height: 34,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.black.withValues(alpha: 0.8),
                          border: Border.all(color: AppTheme.musicLime.withValues(alpha: 0.7), width: 1.2),
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.musicLimeGlow.withValues(alpha: 0.25),
                              blurRadius: 8,
                            ),
                          ],
                        ),
                        child: const Center(
                          child: Icon(Icons.play_arrow_rounded, color: AppTheme.musicLime, size: 20),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              song.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              song.artist,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.55),
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/* ========================================================
   7. PANORAMA COLLECTION CARD
   ======================================================== */
class PanoramaCollectionCard extends StatelessWidget {
  final String title;
  final String imageUrl;
  final Gradient gradient;
  final VoidCallback onTap;

  const PanoramaCollectionCard({
    super.key,
    required this.title,
    required this.imageUrl,
    required this.gradient,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 280,
        height: 120,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          gradient: gradient,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.5),
              blurRadius: 18,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.3,
                      height: 1.2,
                    ),
                  ),
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white.withValues(alpha: 0.2),
                      border: Border.all(color: Colors.white30),
                    ),
                    child: const Center(
                      child: Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 18),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Transform.rotate(
              angle: 0.08,
              child: Container(
                width: 86,
                height: 86,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.6),
                      blurRadius: 12,
                      offset: const Offset(2, 4),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(13),
                  child: CachedNetworkImage(
                    imageUrl: imageUrl,
                    fit: BoxFit.cover,
                    placeholder: (context, url) => Container(color: AppTheme.cardDark),
                    errorWidget: (context, url, error) => Container(color: AppTheme.cardDark),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/* ========================================================
   8. ARTIST BUBBLE CARD (Artists & Discographies)
   ======================================================== */
class ArtistBubbleCard extends StatelessWidget {
  final String name;
  final String imageUrl;
  final String? subtext;
  final VoidCallback onTap;

  const ArtistBubbleCard({
    super.key,
    required this.name,
    required this.imageUrl,
    this.subtext,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        width: 96,
        child: Column(
          children: [
            Container(
              width: 86,
              height: 86,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: AppTheme.musicLime.withValues(alpha: 0.55), width: 1.8),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.6),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                  BoxShadow(
                    color: AppTheme.musicLimeGlow.withValues(alpha: 0.2),
                    blurRadius: 10,
                  ),
                ],
              ),
              child: ClipOval(
                child: CachedNetworkImage(
                  imageUrl: imageUrl,
                  fit: BoxFit.cover,
                  placeholder: (context, url) => Container(color: AppTheme.cardDark),
                  errorWidget: (context, url, error) => Container(
                    color: AppTheme.cardDark,
                    child: const Icon(Icons.person, color: Colors.white24, size: 36),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
            if (subtext != null) ...[
              const SizedBox(height: 2),
              Text(
                subtext!,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: AppTheme.textMuted,
                  fontSize: 10,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
