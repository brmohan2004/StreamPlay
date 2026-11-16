import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../config/app_theme.dart';
import '../../../config/constants.dart';
import '../../../providers/media_provider.dart';
import '../../../providers/navigation_provider.dart';
import '../../../services/storage_service.dart';
import '../../../services/music_service.dart';

class ProfileGeneralTab extends StatefulWidget {
  final NavigationProvider nav;
  final MediaProvider media;
  final RegionalHub currentHub;
  final ValueChanged<String> onShowToast;

  const ProfileGeneralTab({
    super.key,
    required this.nav,
    required this.media,
    required this.currentHub,
    required this.onShowToast,
  });

  @override
  State<ProfileGeneralTab> createState() => _ProfileGeneralTabState();
}

class _ProfileGeneralTabState extends State<ProfileGeneralTab> {
  bool _confirmResetOpen = false;

  @override
  Widget build(BuildContext context) {
    final nav = widget.nav;
    final media = widget.media;
    final currentHub = widget.currentHub;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // DEFAULT STARTUP MODE
          const Text(
            'DEFAULT STARTUP MODE',
            style: TextStyle(
              color: AppTheme.textMuted,
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 12),

          Row(
            children: [
              // Movies & Series Card
              Expanded(
                child: GestureDetector(
                  onTap: () {
                    nav.setAppMode(AppMode.movies);
                    widget.onShowToast('Default launch mode: Movies & Series');
                  },
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF101624),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: nav.appMode == AppMode.movies ? const Color(0xFFFF5252) : Colors.white12,
                        width: 1.5,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.06),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(Icons.movie_creation_outlined, color: Colors.white, size: 20),
                            ),
                            if (nav.appMode == AppMode.movies)
                              const Icon(Icons.check_circle, color: Color(0xFFFF5252), size: 18),
                          ],
                        ),
                        const SizedBox(height: 14),
                        const Text(
                          'Movies & Series',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'OTT & 4K Cinema',
                          style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),

              // Music & Audio Card
              Expanded(
                child: GestureDetector(
                  onTap: () {
                    nav.setAppMode(AppMode.music);
                    widget.onShowToast('Default launch mode: Music & Audio');
                  },
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF101624),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: nav.appMode == AppMode.music ? AppTheme.musicLime : Colors.white12,
                        width: 1.5,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.06),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(Icons.music_note_outlined, color: Colors.white, size: 20),
                            ),
                            if (nav.appMode == AppMode.music)
                              const Icon(Icons.check_circle, color: AppTheme.musicLime, size: 18),
                          ],
                        ),
                        const SizedBox(height: 14),
                        const Text(
                          'Music & Audio',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'Hi-Fi & Official Videos',
                          style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 28),

          // REGIONAL CINEMA HUB
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'REGIONAL CINEMA HUB',
                style: TextStyle(
                  color: AppTheme.textMuted,
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.8,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppTheme.movieCyan.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${currentHub.name} (${currentHub.cinemaHub})',
                  style: const TextStyle(color: AppTheme.movieCyan, fontSize: 10.5, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: AppConstants.regionalHubs.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              childAspectRatio: 1.6,
            ),
            itemBuilder: (context, idx) {
              final h = AppConstants.regionalHubs[idx];
              final isSelected = media.userLocation == h.id;

              return GestureDetector(
                onTap: () {
                  media.setUserLocation(h.id);
                  media.setPrimaryLanguage(h.defaultLang);
                  widget.onShowToast('Hub updated: ${h.name} (${h.cinemaHub})');
                },
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: isSelected ? AppTheme.movieCyan : Colors.white12,
                      width: isSelected ? 2 : 1,
                    ),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(13),
                    child: Stack(
                      children: [
                        Positioned.fill(
                          child: Image.asset(h.image, fit: BoxFit.cover),
                        ),
                        Positioned.fill(
                          child: Container(
                            decoration: const BoxDecoration(
                              gradient: LinearGradient(
                                colors: [Color(0x22000000), Color(0xDD000000)],
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                              ),
                            ),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.all(8),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                decoration: BoxDecoration(
                                  color: Colors.black.withValues(alpha: 0.7),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  h.tag,
                                  style: const TextStyle(
                                    color: AppTheme.theaterAmber,
                                    fontSize: 8.5,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    h.name,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  if (isSelected)
                                    const Icon(Icons.check_circle, color: AppTheme.movieCyan, size: 16),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 28),

          // LANGUAGES
          const Text(
            'LANGUAGES',
            style: TextStyle(
              color: AppTheme.textMuted,
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFF101624),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white10),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Primary (Spotlight & Feeds)',
                  style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: AppConstants.availableLanguages.map((lang) {
                    final isPrim = media.primaryLanguage == lang;
                    return GestureDetector(
                      onTap: () {
                        media.setPrimaryLanguage(lang);
                        widget.onShowToast('Primary: $lang');
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: isPrim ? AppTheme.movieCyan : const Color(0xFF1A2333),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: isPrim ? AppTheme.movieCyan : Colors.white10),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (isPrim) ...[
                              const Icon(Icons.check, size: 12, color: Colors.black),
                              const SizedBox(width: 4),
                            ],
                            Text(
                              lang,
                              style: TextStyle(
                                color: isPrim ? Colors.black : Colors.white,
                                fontSize: 11.5,
                                fontWeight: isPrim ? FontWeight.bold : FontWeight.normal,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: Divider(color: Colors.white10, height: 1),
                ),
                const Text(
                  'Secondary (Discovery Rows)',
                  style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: AppConstants.availableLanguages.map((lang) {
                    final isSec = media.secondaryLanguage == lang;
                    return GestureDetector(
                      onTap: () {
                        media.setSecondaryLanguage(lang);
                        widget.onShowToast('Secondary: $lang');
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: isSec ? AppTheme.movieCyan : const Color(0xFF1A2333),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: isSec ? AppTheme.movieCyan : Colors.white10),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (isSec) ...[
                              const Icon(Icons.check, size: 12, color: Colors.black),
                              const SizedBox(width: 4),
                            ],
                            Text(
                              lang,
                              style: TextStyle(
                                color: isSec ? Colors.black : Colors.white,
                                fontSize: 11.5,
                                fontWeight: isSec ? FontWeight.bold : FontWeight.normal,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ],
            ),
          ),
          const SizedBox(height: 28),

          // RELEASE ALERTS & NOTIFICATIONS
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFF101624),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white10),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.notifications_active_outlined, color: AppTheme.musicLime, size: 20),
                    SizedBox(width: 12),
                    Text(
                      'New Releases & OTT Updates',
                      style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
                Switch(
                  value: media.notifications,
                  activeThumbColor: AppTheme.musicLime,
                  onChanged: (val) {
                    media.setNotifications(val);
                    widget.onShowToast(val ? 'Release alerts enabled' : 'Release alerts disabled');
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 28),

          // STORAGE & ENGINE CACHE
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF101624),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white10),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.storage_rounded, color: AppTheme.movieCyan, size: 20),
                        SizedBox(width: 10),
                        Text(
                          'Engine Cache & Storage',
                          style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.06),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Text('Active Cache', style: TextStyle(color: AppTheme.textMuted, fontSize: 10)),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: const LinearProgressIndicator(
                    value: 0.35,
                    backgroundColor: Colors.white10,
                    valueColor: AlwaysStoppedAnimation<Color>(AppTheme.movieCyan),
                    minHeight: 6,
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.white,
                          side: const BorderSide(color: Colors.white24),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                        ),
                        onPressed: () {
                          PaintingBinding.instance.imageCache.clear();
                          PaintingBinding.instance.imageCache.clearLiveImages();
                          MusicService.clearCache();
                          widget.onShowToast('Cache & buffers cleared successfully');
                        },
                        icon: const Icon(Icons.refresh, size: 14),
                        label: const Text('Clear Buffers', style: TextStyle(fontSize: 12)),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _confirmResetOpen
                          ? ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFFFF4757),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                padding: const EdgeInsets.symmetric(vertical: 10),
                              ),
                              onPressed: () async {
                                final storage = context.read<StorageService>();
                                await storage.clearAll();
                                PaintingBinding.instance.imageCache.clear();
                                PaintingBinding.instance.imageCache.clearLiveImages();
                                MusicService.clearCache();
                                widget.media.reloadStoredData();
                                setState(() {
                                  _confirmResetOpen = false;
                                });
                                widget.onShowToast('StreamPlay reset successfully');
                              },
                              child: const Text('Confirm Reset', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                            )
                          : OutlinedButton.icon(
                              style: OutlinedButton.styleFrom(
                                foregroundColor: const Color(0xFFFF6B6B),
                                side: const BorderSide(color: Color(0x66FF4757)),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                padding: const EdgeInsets.symmetric(vertical: 10),
                              ),
                              onPressed: () {
                                setState(() {
                                  _confirmResetOpen = true;
                                });
                              },
                              icon: const Icon(Icons.delete_outline, size: 14),
                              label: const Text('Reset App', style: TextStyle(fontSize: 12)),
                            ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
