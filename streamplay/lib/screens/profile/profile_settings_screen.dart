import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../config/constants.dart';
import '../../providers/media_provider.dart';
import '../../providers/navigation_provider.dart';
import '../landing/landing_screen.dart';
import 'components/profile_top_bar.dart';
import 'components/profile_hero_card.dart';
import 'components/profile_segmented_tabs.dart';
import 'components/profile_general_tab.dart';
import 'components/profile_movies_tab.dart';
import 'components/profile_music_tab.dart';

class ProfileSettingsScreen extends StatefulWidget {
  final VoidCallback? onRelaunchWizard;

  const ProfileSettingsScreen({super.key, this.onRelaunchWizard});

  @override
  State<ProfileSettingsScreen> createState() => _ProfileSettingsScreenState();
}

class _ProfileSettingsScreenState extends State<ProfileSettingsScreen> {
  int _activeTab = 0; // 0: General, 1: Movies & OTT, 2: Music & Hi-Fi

  void _showToast(String msg) {
    ScaffoldMessenger.of(context).removeCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle, color: AppTheme.musicLime, size: 18),
            const SizedBox(width: 8),
            Expanded(child: Text(msg, style: const TextStyle(color: Colors.white, fontSize: 13))),
          ],
        ),
        backgroundColor: const Color(0xFF16212D),
        duration: const Duration(milliseconds: 2200),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final nav = context.watch<NavigationProvider>();
    final media = context.watch<MediaProvider>();
    final hubId = media.userLocation;
    final hub = AppConstants.regionalHubs.firstWhere(
      (h) => h.id == hubId,
      orElse: () => AppConstants.regionalHubs.first,
    );

    return Container(
      color: AppTheme.pureBlack,
      child: SafeArea(
        bottom: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.only(bottom: 160),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Bar (Matching Screenshot 3)
              ProfileTopBar(
                onBack: () => nav.setActiveScreen(ScreenName.home),
                onOpenWatchLater: () => nav.setActiveScreen(ScreenName.watchlater),
              ),
              const SizedBox(height: 12),

              // Profile Hero Banner Card (Matching Screenshot 3)
              ProfileHeroCard(
                hub: hub,
                nav: nav,
                media: media,
                onRelaunchWizard: () {
                  if (widget.onRelaunchWizard != null) {
                    widget.onRelaunchWizard!();
                  } else {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => LandingScreen(
                          onComplete: () {
                            Navigator.of(context).pop();
                            _showToast('Setup Wizard preferences saved');
                          },
                        ),
                      ),
                    );
                  }
                },
                onOpenWatchlist: () => nav.setActiveScreen(ScreenName.watchlater),
                onOpenPlaylists: () => nav.setActiveScreen(ScreenName.playlist),
              ),
              const SizedBox(height: 18),

              // Segmented Tab Switcher (General | Movies & OTT | Music & Hi-Fi)
              ProfileSegmentedTabs(
                activeTab: _activeTab,
                onSelectTab: (idx) => setState(() => _activeTab = idx),
              ),
              const SizedBox(height: 20),

              // Active Tab Content
              if (_activeTab == 0)
                ProfileGeneralTab(
                  nav: nav,
                  media: media,
                  currentHub: hub,
                  onShowToast: _showToast,
                )
              else if (_activeTab == 1)
                ProfileMoviesTab(
                  nav: nav,
                  media: media,
                  onShowToast: _showToast,
                )
              else
                ProfileMusicTab(
                  nav: nav,
                  media: media,
                  onShowToast: _showToast,
                ),
            ],
          ),
        ),
      ),
    );
  }
}
