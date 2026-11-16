import 'package:flutter/material.dart';
import '../../../config/app_theme.dart';
import '../../../providers/navigation_provider.dart';

/// Step 1: Mode Selector (Screenshot 2)
class LandingStepMode extends StatelessWidget {
  final AppMode selectedMode;
  final ValueChanged<AppMode> onSelectMode;

  const LandingStepMode({
    super.key,
    required this.selectedMode,
    required this.onSelectMode,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      key: const ValueKey('step_1'),
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Gradient Headline
        ShaderMask(
          shaderCallback: (bounds) => AppTheme.brandGradient.createShader(bounds),
          child: const Text(
            'Stream the magic of\nevery story',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w800,
              color: Colors.white,
              height: 1.25,
            ),
          ),
        ),
        const SizedBox(height: 14),

        const Text(
          'Enjoy a huge library of movies, series, and exclusive content—all in one convenient place.',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: AppTheme.textMuted,
            fontSize: 14,
            height: 1.4,
          ),
        ),
        const SizedBox(height: 36),

        // Mode Choice Buttons
        Row(
          children: [
            Expanded(
              child: _buildModeCard(
                mode: AppMode.movies,
                icon: Icons.movie_filter_rounded,
                title: 'Movies & Series',
                isSelected: selectedMode == AppMode.movies,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: _buildModeCard(
                mode: AppMode.music,
                icon: Icons.music_note_rounded,
                title: 'Music & Audio',
                isSelected: selectedMode == AppMode.music,
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),

        const Text(
          'Select a streaming mode to continue',
          style: TextStyle(color: AppTheme.textDim, fontSize: 13),
        ),
      ],
    );
  }

  Widget _buildModeCard({
    required AppMode mode,
    required IconData icon,
    required String title,
    required bool isSelected,
  }) {
    final isMovies = mode == AppMode.movies;
    final activeColor = isMovies ? AppTheme.movieCyan : AppTheme.musicLime;

    return GestureDetector(
      onTap: () => onSelectMode(mode),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 12),
        decoration: BoxDecoration(
          color: isSelected ? activeColor.withValues(alpha: 0.12) : AppTheme.cardDark,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isSelected ? activeColor : AppTheme.borderSubtle,
            width: isSelected ? 2 : 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: activeColor.withValues(alpha: 0.3),
                    blurRadius: 16,
                  ),
                ]
              : null,
        ),
        child: Column(
          children: [
            Icon(icon, size: 36, color: isSelected ? activeColor : Colors.white70),
            const SizedBox(height: 12),
            Text(
              title,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: isSelected ? Colors.white : AppTheme.textMuted,
                fontWeight: FontWeight.w700,
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
