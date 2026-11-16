import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_svg_icons.dart';
import '../../providers/navigation_provider.dart';

/// Pixel-perfect Floating Navigation Bar matching Screenshot media_1794820793474_94c3e029.png
class FloatingNavBar extends StatefulWidget {
  const FloatingNavBar({super.key});

  @override
  State<FloatingNavBar> createState() => _FloatingNavBarState();
}

class _FloatingNavBarState extends State<FloatingNavBar> with SingleTickerProviderStateMixin {
  late final AnimationController _pulseController;
  late final Animation<double> _pulseScale;
  late final Animation<double> _pulseOpacity;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    )..repeat(reverse: true);

    _pulseScale = Tween<double>(begin: 0.96, end: 1.08).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _pulseOpacity = Tween<double>(begin: 0.35, end: 0.85).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final nav = context.watch<NavigationProvider>();

    // Hide floating nav bar on movie details screen
    if (nav.activeScreen == ScreenName.details) {
      return const SizedBox.shrink();
    }

    final isHomeActive = nav.activeScreen == ScreenName.home;
    final isSearchActive = nav.activeScreen == ScreenName.search;
    final isMovieMode = nav.appMode == AppMode.movies;
    final isFiltered = nav.isFiltered;

    // Center button glow / ring color configuration
    final Color ringColor;
    final Color glowColor;
    final List<Color> gradientColors;

    if (isFiltered) {
      ringColor = const Color(0xFFFF1744);
      glowColor = const Color(0xFFFF1744);
      gradientColors = const [Color(0xFFFF1744), Color(0xFFB71C1C)];
    } else if (isMovieMode) {
      // In Movies Mode: Lime gradient (tapping switches to Hi-Fi Music)
      ringColor = const Color(0xFFD4FF00);
      glowColor = const Color(0xFFC0F000);
      gradientColors = const [Color(0xFFD4FF00), Color(0xFF1ED760)];
    } else {
      // In Music Mode: Electric Cyan-to-Blue gradient (Screenshot media_1794820793474_94c3e029.png)
      ringColor = const Color(0xFF00D2FF);
      glowColor = const Color(0xFF00D2FF);
      gradientColors = const [Color(0xFF00D2FF), Color(0xFF0066FF)];
    }

    return Align(
      alignment: Alignment.bottomCenter,
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: SizedBox(
            height: 64, // Accommodates protruding center button & pulse ring
            child: Stack(
              alignment: Alignment.center,
              clipBehavior: Clip.none,
              children: [
                // 1. Pill Background with Blur and Border (Screenshot media_1794820793474_94c3e029.png)
                ClipRRect(
                  borderRadius: BorderRadius.circular(44),
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
                    child: Container(
                      height: 48,
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      decoration: BoxDecoration(
                        color: const Color(0xE80C0C0C),
                        borderRadius: BorderRadius.circular(44),
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.12),
                          width: 1.0,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.92),
                            blurRadius: 32,
                            offset: const Offset(0, 10),
                          ),
                          BoxShadow(
                            color: Colors.white.withValues(alpha: 0.04),
                            blurRadius: 15,
                          ),
                        ],
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          // 1.1 Home Tab Item with Active Dot (media_1794820793474_94c3e029.png)
                          _buildTabItem(
                            isActive: isHomeActive && !isFiltered,
                            icon: AppSvgIcons.home(
                              color: (isHomeActive && !isFiltered) ? Colors.white : const Color(0xFFA1A1AA),
                              size: 22,
                            ),
                            onTap: () {
                              if (isFiltered) {
                                nav.resetFiltersAndGoHome();
                              } else {
                                nav.setActiveScreen(ScreenName.home);
                              }
                            },
                          ),

                          // Gap reserved for the protruding Center Mode Button
                          const SizedBox(width: 58),

                          // 1.2 Search Tab Item with Active Dot (media_1794820793474_94c3e029.png)
                          _buildTabItem(
                            isActive: isSearchActive,
                            icon: AppSvgIcons.search(
                              color: isSearchActive ? Colors.white : const Color(0xFFA1A1AA),
                              size: 22,
                            ),
                            onTap: () {
                              nav.setActiveScreen(ScreenName.search);
                            },
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                // 2. Protruding Center Mode Switch Button with Breathing Glow Ring
                Positioned(
                  child: GestureDetector(
                    onTap: () {
                      if (isFiltered) {
                        nav.resetFiltersAndGoHome();
                      } else {
                        nav.toggleAppMode();
                      }
                    },
                    behavior: HitTestBehavior.opaque,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        // Animated Breathing Outer Ring
                        AnimatedBuilder(
                          animation: _pulseController,
                          builder: (context, child) {
                            return Transform.scale(
                              scale: _pulseScale.value,
                              child: Container(
                                width: 62,
                                height: 62,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: ringColor.withValues(alpha: _pulseOpacity.value * 0.45),
                                    width: 1.5,
                                  ),
                                ),
                              ),
                            );
                          },
                        ),

                        // Center Circular Button (Protrudes outside the 48px pill)
                        Container(
                          width: 54,
                          height: 54,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: gradientColors,
                            ),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.35),
                              width: 2.0,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: glowColor.withValues(alpha: 0.65),
                                blurRadius: 22,
                                spreadRadius: 1,
                              ),
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.70),
                                blurRadius: 16,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: Center(
                            child: isFiltered
                                ? AppSvgIcons.rotateCcw(color: Colors.white, size: 21)
                                : isMovieMode
                                    ? AppSvgIcons.music(color: Colors.black, size: 22)
                                    : AppSvgIcons.movies(color: Colors.black, size: 22),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTabItem({
    required bool isActive,
    required Widget icon,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        width: 48,
        alignment: Alignment.center,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            icon,
            const SizedBox(height: 3),
            // Glowing Active Dot Indicator (Screenshot media_1794820793474_94c3e029.png)
            Container(
              width: 4,
              height: 4,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isActive ? Colors.white : Colors.transparent,
                boxShadow: isActive
                    ? [
                        BoxShadow(
                          color: Colors.white.withValues(alpha: 0.95),
                          blurRadius: 6,
                          spreadRadius: 1,
                        ),
                      ]
                    : null,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
