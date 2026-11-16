import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../config/app_svg_icons.dart';
import '../../providers/navigation_provider.dart';
import 'filter_sheet_modal.dart';

/// Upgraded Floating Filter Capsule matching FloatingFilterPill.tsx exactly.
/// Displays TV / Movies / Sheet expander in Movie mode, Music Filters in Music mode,
/// and dynamic active filter tag with quick exit when any filter is selected.
class FloatingFilterPill extends StatelessWidget {
  const FloatingFilterPill({super.key});

  void _openFilterSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const FilterSheetModal(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final nav = context.watch<NavigationProvider>();

    if (nav.activeScreen != ScreenName.home) {
      return const SizedBox.shrink();
    }

    final isMovieMode = nav.appMode == AppMode.movies;
    final hasActiveFilter = nav.isFiltered;

    String activeLabel = '';
    if (nav.selectedOTT != 'All') {
      activeLabel = nav.selectedOTT;
    } else if (nav.activeCategory != 'All') {
      activeLabel = nav.activeCategory == 'Series' ? 'TV Shows' : nav.activeCategory;
    } else if (nav.selectedLanguage != 'All') {
      activeLabel = nav.selectedLanguage;
    }

    return Align(
      alignment: Alignment.bottomCenter,
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.only(bottom: 84),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(24),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 250),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: const Color(0xE0121722),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: hasActiveFilter
                        ? (isMovieMode ? AppTheme.movieCyan.withValues(alpha: 0.5) : AppTheme.musicLime.withValues(alpha: 0.5))
                        : Colors.white.withValues(alpha: 0.12),
                    width: 1.0,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.55),
                      blurRadius: 18,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: hasActiveFilter
                    ? _buildActiveFilterContent(context, nav, activeLabel, isMovieMode)
                    : isMovieMode
                        ? _buildMovieCapsuleContent(context, nav)
                        : _buildMusicCapsuleContent(context),
              ),
            ),
          ),
        ),
      ),
    );
  }

  // 1. Active Filter State with clear 'X' button
  Widget _buildActiveFilterContent(BuildContext context, NavigationProvider nav, String label, bool isMovieMode) {
    return GestureDetector(
      onTap: () => _openFilterSheet(context),
      behavior: HitTestBehavior.opaque,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          AppSvgIcons.sparkles(
            color: isMovieMode ? AppTheme.movieCyan : AppTheme.musicLime,
            size: 13,
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.2,
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: () => nav.resetFiltersAndGoHome(),
            behavior: HitTestBehavior.opaque,
            child: Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: AppSvgIcons.close(color: Colors.white, size: 10),
            ),
          ),
        ],
      ),
    );
  }

  // 2. Movie Mode Default: "TV | Movies | ^"
  Widget _buildMovieCapsuleContent(BuildContext context, NavigationProvider nav) {
    final isSeries = nav.activeCategory == 'Series';
    final isMovies = nav.activeCategory == 'Movies';

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        GestureDetector(
          onTap: () {
            nav.setActiveCategory(isSeries ? 'All' : 'Series');
          },
          behavior: HitTestBehavior.opaque,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: isSeries ? AppTheme.movieCyan.withValues(alpha: 0.2) : Colors.transparent,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Text(
              'TV',
              style: TextStyle(
                color: isSeries ? AppTheme.movieCyan : AppTheme.textMuted,
                fontSize: 12,
                fontWeight: isSeries ? FontWeight.w700 : FontWeight.w500,
              ),
            ),
          ),
        ),
        Container(
          width: 1,
          height: 12,
          margin: const EdgeInsets.symmetric(horizontal: 4),
          color: Colors.white.withValues(alpha: 0.12),
        ),
        GestureDetector(
          onTap: () {
            nav.setActiveCategory(isMovies ? 'All' : 'Movies');
          },
          behavior: HitTestBehavior.opaque,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: isMovies ? AppTheme.movieCyan.withValues(alpha: 0.2) : Colors.transparent,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Text(
              'Movies',
              style: TextStyle(
                color: isMovies ? AppTheme.movieCyan : AppTheme.textMuted,
                fontSize: 12,
                fontWeight: isMovies ? FontWeight.w700 : FontWeight.w500,
              ),
            ),
          ),
        ),
        Container(
          width: 1,
          height: 12,
          margin: const EdgeInsets.symmetric(horizontal: 4),
          color: Colors.white.withValues(alpha: 0.12),
        ),
        GestureDetector(
          onTap: () => _openFilterSheet(context),
          behavior: HitTestBehavior.opaque,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
            child: AppSvgIcons.chevronUp(
              color: AppTheme.movieCyan,
              size: 13,
            ),
          ),
        ),
      ],
    );
  }

  // 3. Music Mode Default: "🎛 Music Filters ^"
  Widget _buildMusicCapsuleContent(BuildContext context) {
    return GestureDetector(
      onTap: () => _openFilterSheet(context),
      behavior: HitTestBehavior.opaque,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          AppSvgIcons.filter(color: AppTheme.musicLime, size: 12),
          const SizedBox(width: 6),
          const Text(
            'Music Filters',
            style: TextStyle(
              color: Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(width: 6),
          AppSvgIcons.chevronUp(color: AppTheme.musicLime, size: 12),
        ],
      ),
    );
  }
}
