import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../config/app_theme.dart';
import '../../../providers/navigation_provider.dart';

class TopAppHeader extends StatelessWidget {
  const TopAppHeader({super.key});

  @override
  Widget build(BuildContext context) {
    final nav = context.watch<NavigationProvider>();
    final isMovie = nav.appMode == AppMode.movies;
    final modeColor = isMovie ? AppTheme.movieCyan : AppTheme.musicLime;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Left: StreamPlay Logo + Mode Pill
          Row(
            children: [
              Image.asset(
                'assets/StreamPlay.png',
                width: 26,
                height: 26,
                fit: BoxFit.contain,
                errorBuilder: (context, error, stackTrace) => const Icon(
                  Icons.play_circle_fill_rounded,
                  color: AppTheme.movieCyan,
                  size: 26,
                ),
              ),
              const SizedBox(width: 8),

              // Animated Mode Switcher Pill
              GestureDetector(
                onTap: () {
                  nav.toggleAppMode();
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: modeColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: modeColor, width: 1.2),
                    boxShadow: [
                      BoxShadow(
                        color: modeColor.withValues(alpha: 0.3),
                        blurRadius: 8,
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Icon(
                        isMovie ? Icons.movie_filter_rounded : Icons.music_note_rounded,
                        size: 13,
                        color: modeColor,
                      ),
                      const SizedBox(width: 5),
                      Text(
                        isMovie ? 'MOVIES' : 'MUSIC',
                        style: TextStyle(
                          color: modeColor,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          // Right Icons: Party, Bookmark/Playlists, Profile
          Row(
            children: [
              // 1. Party / Community Button
              _buildRoundIconBtn(
                icon: Icons.people_alt_outlined,
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Watch & Listen Party Room coming soon!'),
                      duration: Duration(seconds: 2),
                    ),
                  );
                },
              ),
              const SizedBox(width: 8),

              // 2. Watchlist (in Movies) or Playlists (in Music)
              _buildRoundIconBtn(
                icon: isMovie ? Icons.bookmark_outline_rounded : Icons.queue_music_rounded,
                onTap: () {
                  nav.setActiveScreen(isMovie ? ScreenName.watchlater : ScreenName.playlist);
                },
              ),
              const SizedBox(width: 8),

              // 3. Profile Avatar
              _buildRoundIconBtn(
                icon: Icons.person_outline_rounded,
                onTap: () {
                  nav.setActiveScreen(ScreenName.profile);
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRoundIconBtn({required IconData icon, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 38,
        height: 38,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.08),
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white.withValues(alpha: 0.12), width: 1),
        ),
        child: Icon(icon, size: 18, color: Colors.white),
      ),
    );
  }
}

