import 'package:flutter/material.dart';
import '../../../config/app_theme.dart';
import '../../../config/constants.dart';
import '../../../providers/media_provider.dart';
import '../../../providers/navigation_provider.dart';

class ProfileHeroCard extends StatelessWidget {
  final RegionalHub hub;
  final NavigationProvider nav;
  final MediaProvider media;
  final VoidCallback onRelaunchWizard;
  final VoidCallback onOpenWatchlist;
  final VoidCallback onOpenPlaylists;

  const ProfileHeroCard({
    super.key,
    required this.hub,
    required this.nav,
    required this.media,
    required this.onRelaunchWizard,
    required this.onOpenWatchlist,
    required this.onOpenPlaylists,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      height: 220,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: Colors.white12),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(21),
        child: Stack(
          children: [
            // Background Image
            Positioned.fill(
              child: Image.asset(
                hub.image,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => Container(color: AppTheme.cardDark),
              ),
            ),
            Positioned.fill(
              child: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0x66000000), Color(0xF2080B12)],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
              ),
            ),

            // Content
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Top Badges
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.65),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.location_on, size: 12, color: AppTheme.movieCyan),
                            const SizedBox(width: 4),
                            Text(
                              '${hub.name} • ${hub.cinemaHub}',
                              style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.65),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppTheme.movieCyan, width: 0.8),
                        ),
                        child: Text(
                          nav.appMode == AppMode.movies ? '🎞 Movies Mode' : '🎵 Music Mode',
                          style: const TextStyle(color: AppTheme.movieCyan, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),

                  // Stats & Counters Row
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          GestureDetector(
                            onTap: onOpenWatchlist,
                            child: _buildStatPill(Icons.bookmark_outline, '${media.watchlist.length}', 'Watchlist', AppTheme.goldAccent),
                          ),
                          const SizedBox(width: 8),
                          GestureDetector(
                            onTap: onOpenPlaylists,
                            child: _buildStatPill(Icons.queue_music, '${media.playlists.length}', 'Playlists', AppTheme.musicLime),
                          ),
                          const SizedBox(width: 8),
                          GestureDetector(
                            onTap: onOpenPlaylists,
                            child: _buildStatPill(Icons.auto_awesome, '${media.likedSongIds.length}', 'Liked', AppTheme.movieCyan),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // Relaunch Setup Wizard button
                      GestureDetector(
                        onTap: onRelaunchWizard,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            color: const Color(0x33FF4757),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: const Color(0x66FF4757), width: 1),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.auto_fix_high, size: 14, color: Color(0xFFFF6B6B)),
                              SizedBox(width: 6),
                              Text(
                                'Relaunch Setup Wizard',
                                style: TextStyle(
                                  color: Color(0xFFFF6B6B),
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatPill(IconData icon, String count, String label, Color iconColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.65),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white10),
      ),
      child: Row(
        children: [
          Icon(icon, size: 12, color: iconColor),
          const SizedBox(width: 5),
          Text(
            count,
            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
          ),
          const SizedBox(width: 4),
          Text(
            label,
            style: const TextStyle(color: AppTheme.textMuted, fontSize: 10),
          ),
        ],
      ),
    );
  }
}
