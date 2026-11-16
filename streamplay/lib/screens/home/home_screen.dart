import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/navigation_provider.dart';
import 'movie_home_screen.dart';
import 'music_home_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final nav = context.watch<NavigationProvider>();
    final isMovies = nav.appMode == AppMode.movies;

    // Dual-mounted IndexedStack keeps both views alive for 0ms flicker-free mode transitions
    return IndexedStack(
      index: isMovies ? 0 : 1,
      children: const [
        MovieHomeScreen(),
        MusicHomeScreen(),
      ],
    );
  }
}
