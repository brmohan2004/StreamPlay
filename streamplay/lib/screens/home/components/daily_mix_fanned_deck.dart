import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../config/app_theme.dart';
import '../../../models/media_item.dart';

class DailyMixFannedDeck extends StatefulWidget {
  final List<SongItem> songs;
  final Function(SongItem) onPlay;

  const DailyMixFannedDeck({
    super.key,
    required this.songs,
    required this.onPlay,
  });

  @override
  State<DailyMixFannedDeck> createState() => _DailyMixFannedDeckState();
}

class _DailyMixFannedDeckState extends State<DailyMixFannedDeck> {
  late final PageController _pageController;
  double _currentPage = 0.0;

  @override
  void initState() {
    super.initState();
    final initial = widget.songs.length > 2 ? 1 : 0;
    _currentPage = initial.toDouble();
    _pageController = PageController(
      viewportFraction: 0.54,
      initialPage: initial,
    );
    _pageController.addListener(_onPageScroll);
  }

  void _onPageScroll() {
    if (mounted) {
      setState(() {
        _currentPage = _pageController.page ?? 0.0;
      });
    }
  }

  @override
  void dispose() {
    _pageController.removeListener(_onPageScroll);
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.songs.isEmpty) {
      return const SizedBox(height: 250);
    }

    final total = widget.songs.length;
    final activeIndex = _currentPage.round().clamp(0, total - 1);
    final activeSong = widget.songs[activeIndex];

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          height: 250,
          child: Stack(
            alignment: Alignment.center,
            children: [
              // 1. Ambient Lime/Cyan Backlight Glow behind active card
              Container(
                width: 220,
                height: 220,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      AppTheme.musicLime.withValues(alpha: 0.28),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),

              // 2. Interactive 3D Fanning Deck PageView
              PageView.builder(
                controller: _pageController,
                physics: const BouncingScrollPhysics(),
                itemCount: total,
                clipBehavior: Clip.none,
                itemBuilder: (context, index) {
                  final song = widget.songs[index];
                  final diff = index - _currentPage;
                  final absDiff = diff.abs();

                  // Smooth 3D geometry transformations
                  final scale = (1.0 - (absDiff * 0.15)).clamp(0.78, 1.0);
                  final rotateZ = (diff * 0.16).clamp(-0.25, 0.25);
                  final translateY = (absDiff * 16.0).clamp(0.0, 32.0);
                  final opacity = (1.0 - (absDiff * 0.40)).clamp(0.40, 1.0);
                  final isHero = absDiff < 0.35;

                  return Transform(
                    alignment: Alignment.bottomCenter,
                    transform: Matrix4.identity()
                      ..setEntry(3, 2, 0.001) // 3D depth perspective
                      ..translateByDouble(0.0, translateY, 0.0, 1.0)
                      ..rotateZ(rotateZ)
                      ..scaleByDouble(scale, scale, 1.0, 1.0),
                    child: Opacity(
                      opacity: opacity,
                      child: GestureDetector(
                        onTap: () {
                          if (absDiff > 0.4) {
                            _pageController.animateToPage(
                              index,
                              duration: const Duration(milliseconds: 320),
                              curve: Curves.easeOutCubic,
                            );
                          } else {
                            widget.onPlay(song);
                          }
                        },
                        behavior: HitTestBehavior.opaque,
                        child: Center(
                          child: _buildAlbumCard(song, isHero: isHero),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
        ),

        const SizedBox(height: 6),

        // Active Song Title & Artist Indicator
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            children: [
              Text(
                activeSong.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.2,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                activeSong.artist,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Color(0xFF9EABB8),
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildAlbumCard(SongItem song, {required bool isHero}) {
    return Container(
      width: 195,
      height: 195,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        color: AppTheme.cardDark,
        border: Border.all(
          color: isHero ? AppTheme.musicLime : Colors.white.withValues(alpha: 0.15),
          width: isHero ? 2.0 : 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.75),
            blurRadius: isHero ? 22 : 12,
            offset: const Offset(0, 8),
          ),
          if (isHero)
            BoxShadow(
              color: AppTheme.musicLimeGlow.withValues(alpha: 0.35),
              blurRadius: 22,
              spreadRadius: 2,
            ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Album Artwork
            Positioned.fill(
              child: CachedNetworkImage(
                imageUrl: song.image,
                fit: BoxFit.cover,
                placeholder: (context, url) => Container(color: AppTheme.cardDark),
                errorWidget: (context, url, error) => Container(
                  color: AppTheme.cardDark,
                  child: const Icon(Icons.music_note, size: 40, color: Colors.white24),
                ),
              ),
            ),

            // Subtle dark wash for readability and play button contrast
            Positioned.fill(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Colors.transparent,
                      Colors.black.withValues(alpha: isHero ? 0.30 : 0.50),
                    ],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
              ),
            ),

            // Center Play Button (On active center hero card)
            if (isHero)
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withValues(alpha: 0.95),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.55),
                      blurRadius: 14,
                    ),
                  ],
                ),
                child: const Center(
                  child: Icon(
                    Icons.play_arrow_rounded,
                    color: Colors.black,
                    size: 34,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
