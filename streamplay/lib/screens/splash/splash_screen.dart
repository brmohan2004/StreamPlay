import 'package:flutter/material.dart';
import '../../config/app_theme.dart';

class SplashScreen extends StatefulWidget {
  final VoidCallback onFinish;

  const SplashScreen({super.key, required this.onFinish});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _textOpacityAnimation;
  late Animation<double> _rippleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000), // Fast 1-sec punchy splash animation
    );

    _scaleAnimation = Tween<double>(begin: 1.35, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.7, curve: Curves.easeOutCubic),
      ),
    );

    _rippleAnimation = Tween<double>(begin: 0.5, end: 2.1).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.1, 0.85, curve: Curves.easeOutCubic),
      ),
    );

    _textOpacityAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.25, 0.75, curve: Curves.easeIn),
      ),
    );

    _controller.forward();

    _controller.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        widget.onFinish();
      }
    });
  }

  void _skip() {
    _controller.stop();
    widget.onFinish();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _skip,
      child: Scaffold(
        backgroundColor: AppTheme.pureBlack,
        body: Stack(
          alignment: Alignment.center,
          children: [
            // Center Ambient Vertical Backlight
            Center(
              child: AnimatedBuilder(
                animation: _rippleAnimation,
                builder: (context, _) {
                  return Container(
                    width: 280 * _rippleAnimation.value,
                    height: 280 * _rippleAnimation.value,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: RadialGradient(
                        colors: [
                          const Color(0xFFC0F000).withValues(alpha: (0.35 * (1.0 - _controller.value)).clamp(0.0, 0.35)),
                          const Color(0xFF00B4FF).withValues(alpha: (0.25 * (1.0 - _controller.value)).clamp(0.0, 0.25)),
                          Colors.transparent,
                        ],
                        stops: const [0.0, 0.45, 1.0],
                      ),
                    ),
                  );
                },
              ),
            ),

            // Logo & Typography
            AnimatedBuilder(
              animation: _controller,
              builder: (context, child) {
                return Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // StreamPlay Logo
                    Transform.scale(
                      scale: _scaleAnimation.value,
                      child: Container(
                        width: 90,
                        height: 90,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.musicLimeGlow.withValues(alpha: 0.4),
                              blurRadius: 30,
                              spreadRadius: 4,
                            ),
                          ],
                        ),
                        child: Image.asset(
                          'assets/StreamPlay.png',
                          fit: BoxFit.contain,
                          errorBuilder: (context, error, stackTrace) => const Icon(
                            Icons.play_arrow_rounded,
                            size: 60,
                            color: AppTheme.musicLime,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 18),

                    // "StreamPlay" Split Typography
                    Opacity(
                      opacity: _textOpacityAnimation.value,
                      child: RichText(
                        text: const TextSpan(
                          style: TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.5,
                          ),
                          children: [
                            TextSpan(
                              text: 'Stream',
                              style: TextStyle(color: Color(0xFF00B4FF)),
                            ),
                            TextSpan(
                              text: 'Play',
                              style: TextStyle(color: Color(0xFFC0F000)),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

