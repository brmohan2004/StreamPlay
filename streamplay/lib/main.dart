import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import 'config/app_theme.dart';
import 'providers/media_provider.dart';
import 'providers/navigation_provider.dart';
import 'providers/recommendation_provider.dart';
import 'screens/common/audio_player_bar.dart';
import 'screens/common/floating_nav_bar.dart';
import 'screens/home/home_screen.dart';
import 'screens/landing/landing_screen.dart';
import 'screens/movie_details/movie_details_screen.dart';
import 'screens/music_player/components/music_player_sheet_overlay.dart';
import 'screens/playlist/playlist_screen.dart';
import 'screens/profile/profile_settings_screen.dart';
import 'screens/search/movie_search_screen.dart';
import 'screens/search/music_search_screen.dart';
import 'screens/splash/splash_screen.dart';
import 'package:just_audio_background/just_audio_background.dart';
import 'screens/watchlist/watchlist_screen.dart';
import 'services/audio_player_handler.dart';
import 'services/recommendation_engine.dart';
import 'services/storage_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await JustAudioBackground.init(
    androidNotificationChannelId: 'com.example.streamplay.channel.audio',
    androidNotificationChannelName: 'StreamPlay Music Playback',
    androidNotificationOngoing: false,
    androidStopForegroundOnPause: true,
  );

  // Edge-to-edge transparent OLED system overlays
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Colors.transparent,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);

  final storage = await StorageService.init();
  final audioHandler = AudioPlayerHandler();
  final recommendationEngine = RecommendationEngine(storage);

  runApp(
    MultiProvider(
      providers: [
        Provider<StorageService>.value(value: storage),
        Provider<AudioPlayerHandler>.value(value: audioHandler),
        ChangeNotifierProvider(create: (_) => NavigationProvider(storage)),
        ChangeNotifierProvider(create: (_) => MediaProvider(storage, audioHandler)),
        ChangeNotifierProvider(create: (_) => RecommendationProvider(recommendationEngine)),
      ],
      child: const StreamPlayApp(),
    ),
  );
}

class StreamPlayApp extends StatelessWidget {
  const StreamPlayApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'StreamPlay',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: const AppContent(),
    );
  }
}

class AppContent extends StatefulWidget {
  const AppContent({super.key});

  @override
  State<AppContent> createState() => _AppContentState();
}

class _AppContentState extends State<AppContent> with WidgetsBindingObserver {
  final GlobalKey<MusicPlayerSheetOverlayState> _sheetOverlayKey = GlobalKey<MusicPlayerSheetOverlayState>();
  // 1-second dynamic splash screen animation
  bool _showSplash = true;
  bool _showOnboarding = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    final storage = context.read<StorageService>();
    final isDone = storage.isOnboardingCompleted();
    _showOnboarding = !isDone;
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.detached) {
      // User closed/swiped away the app: pause audio so background playback stops,
      // but do not dismiss the player so last played song is preserved on reopen.
      context.read<MediaProvider>().pauseSong();
    }
  }

  @override
  Widget build(BuildContext context) {
    final nav = context.watch<NavigationProvider>();
    final media = context.watch<MediaProvider>();

    // 1. First-Time User Onboarding (Screenshots 2, 3, 4)
    if (_showOnboarding) {
      return LandingScreen(
        onComplete: () {
          setState(() {
            _showOnboarding = false;
            _showSplash = true;
          });
        },
      );
    }

    // 2. Smooth Animated Entrance from Splash to Main Shell
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 320),
      switchInCurve: Curves.easeOutCubic,
      switchOutCurve: Curves.easeInCubic,
      transitionBuilder: (child, animation) {
        return FadeTransition(
          opacity: animation,
          child: ScaleTransition(
            scale: Tween<double>(begin: 0.96, end: 1.0).animate(animation),
            child: child,
          ),
        );
      },
      child: _showSplash
          ? SplashScreen(
              key: const ValueKey('splash_screen'),
              onFinish: () {
                setState(() {
                  _showSplash = false;
                });
              },
            )
          : PopScope(
              canPop: false,
              onPopInvokedWithResult: (didPop, result) {
                if (didPop) return;
                // 1. If music player is open, smoothly minimize it via sheet controller
                if (media.isMusicPlayerOpen) {
                  if (_sheetOverlayKey.currentState != null) {
                    _sheetOverlayKey.currentState!.dismiss();
                  } else {
                    media.closeMusicPlayer();
                  }
                  return;
                }
                // 2. If movie details modal is open, close it
                if (media.selectedMovie != null) {
                  media.closeMovieDetails();
                  return;
                }
                // 3. If any category / OTT filter is active, reset to clean home
                if (nav.isFiltered) {
                  nav.resetFiltersAndGoHome();
                  return;
                }
                // 4. If on another screen (Search, Profile, Watchlist, Playlist), navigate back to Home
                if (nav.activeScreen != ScreenName.home) {
                  nav.setActiveScreen(ScreenName.home);
                  return;
                }
                // 5. If on clean Home, exit the application
                SystemNavigator.pop();
              },
              child: MusicPlayerSheetOverlay(
                key: _sheetOverlayKey,
                child: Scaffold(
                  key: const ValueKey('main_app_shell'),
                  backgroundColor: AppTheme.pureBlack,
                  body: Stack(
                    children: [
                      // Active Screen View
                      _buildActiveScreen(nav.activeScreen, nav),

                      // Movie Details Screen Modal (Screenshot 11)
                      if (media.selectedMovie != null)
                        MovieDetailsScreen(movie: media.selectedMovie!),

                      // Persistent Mini Audio Player Bar (above bottom nav bar)
                      const AudioPlayerBar(),

                      // Centered Bottom Floating Navigation Bar (hidden on Profile/Settings)
                      if (nav.activeScreen != ScreenName.profile)
                        const FloatingNavBar(),
                    ],
                  ),
                ),
              ),
            ),
    );
  }

  Widget _buildActiveScreen(ScreenName screen, NavigationProvider nav) {
    switch (screen) {
      case ScreenName.home:
        return const HomeScreen();
      case ScreenName.search:
        return nav.appMode == AppMode.music
            ? const MusicSearchScreen()
            : const MovieSearchScreen();
      case ScreenName.profile:
        return const ProfileSettingsScreen();
      case ScreenName.watchlater:
        return const WatchlistScreen();
      case ScreenName.playlist:
        return const PlaylistScreen();
      case ScreenName.details:
        return const SizedBox.shrink();
    }
  }
}
