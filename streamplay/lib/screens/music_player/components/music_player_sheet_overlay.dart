import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../config/app_theme.dart';
import '../../../providers/media_provider.dart';
import '../music_player_screen.dart';

/// High-performance, gesture-driven bottom sheet overlay for the music player.
///
/// Features:
/// 1. True 1:1 real-time finger tracking on vertical drags.
/// 2. Velocity-aware spring physics and threshold fling dismiss.
/// 3. Elastic rubber-band resistance when pulling upwards at the top.
/// 4. Synchronized backdrop scrim dimmer that fades with drag progress.
/// 5. Apple Music / Spotify 3D depth effect (underlying app scales down to 0.95
///    with rounded corners and restores smoothly on sheet minimization).
class MusicPlayerSheetOverlay extends StatefulWidget {
  final Widget child;

  const MusicPlayerSheetOverlay({
    super.key,
    required this.child,
  });

  @override
  State<MusicPlayerSheetOverlay> createState() => MusicPlayerSheetOverlayState();
}

class MusicPlayerSheetOverlayState extends State<MusicPlayerSheetOverlay>
    with TickerProviderStateMixin {
  late final AnimationController _controller;
  late final AnimationController _overshootController;
  Animation<double>? _overshootAnimation;

  double _overshoot = 0.0;
  bool _isDragging = false;
  bool _isDismissing = false;
  bool _wasOpen = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 380),
      reverseDuration: const Duration(milliseconds: 280),
    );

    _overshootController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 220),
    )..addListener(() {
        if (mounted) {
          setState(() {
            _overshoot = _overshootAnimation?.value ?? 0.0;
          });
        }
      });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final media = context.watch<MediaProvider>();
    final isOpen = media.isMusicPlayerOpen;

    if (isOpen != _wasOpen) {
      _wasOpen = isOpen;
      if (isOpen) {
        _isDismissing = false;
        if (_controller.value < 1.0 && !_isDragging) {
          _controller.animateTo(
            1.0,
            duration: const Duration(milliseconds: 380),
            curve: Curves.easeOutQuart,
          );
        }
      } else {
        if (_controller.value > 0.0 && !_isDragging && !_isDismissing) {
          _controller.animateTo(
            0.0,
            duration: const Duration(milliseconds: 280),
            curve: Curves.easeOutCubic,
          );
        }
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _overshootController.dispose();
    super.dispose();
  }

  /// Smoothly animates the sheet downwards to the dismissed state,
  /// then updates MediaProvider state.
  Future<void> dismiss() async {
    if (_isDismissing) return;
    _isDismissing = true;
    try {
      await _controller.animateTo(
        0.0,
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeOutCubic,
      );
    } finally {
      _isDismissing = false;
      if (mounted) {
        context.read<MediaProvider>().closeMusicPlayer();
      }
    }
  }

  void _onDragStart(DragStartDetails details) {
    _controller.stop();
    _isDragging = true;
  }

  void _onDragUpdate(DragUpdateDetails details, double travelDistance) {
    if (travelDistance <= 0) return;
    final dy = details.primaryDelta ?? 0.0;

    if (_controller.value >= 0.999 && dy < 0) {
      // User is dragging UP past top: elastic rubber-band resistance
      setState(() {
        _overshoot = (_overshoot + dy * 0.22).clamp(-32.0, 0.0);
      });
    } else {
      if (_overshoot < 0) {
        // Returning from overshoot
        setState(() {
          _overshoot = (_overshoot + dy * 0.5).clamp(-32.0, 0.0);
        });
      } else {
        // Normal 1:1 downward/upward drag tracking
        final deltaFraction = dy / travelDistance;
        _controller.value = (_controller.value - deltaFraction).clamp(0.0, 1.0);
      }
    }
  }

  void _onDragEnd(DragEndDetails details) {
    _isDragging = false;
    final velocity = details.primaryVelocity ?? 0.0;

    // If there was upward rubber-band stretch, spring it back
    if (_overshoot != 0.0) {
      _springBackOvershoot();
    }

    if (velocity > 320 || _controller.value < 0.78) {
      // Downward flick or pulled down past threshold -> dismiss smoothly
      dismiss();
    } else {
      // Snap back up to fully open
      _controller.animateTo(
        1.0,
        duration: const Duration(milliseconds: 240),
        curve: Curves.easeOutCubic,
      );
    }
  }

  void _springBackOvershoot() {
    _overshootAnimation = Tween<double>(begin: _overshoot, end: 0.0).animate(
      CurvedAnimation(parent: _overshootController, curve: Curves.easeOutBack),
    );
    _overshootController.forward(from: 0.0);
  }

  @override
  Widget build(BuildContext context) {
    final media = context.watch<MediaProvider>();
    final mediaQuery = MediaQuery.of(context);
    final screenHeight = mediaQuery.size.height;
    final travelDistance = screenHeight;

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final progress = _controller.value;
        final isVisible = progress > 0.001 || media.isMusicPlayerOpen;
        final sheetY = (1.0 - progress) * travelDistance + _overshoot;

        return Stack(
          children: [
            // 1. Scaled & Rounded App Shell Background (Spotify / Apple Music depth card)
            Transform.scale(
              scale: 1.0 - (0.05 * progress),
              alignment: Alignment.center,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(18 * progress),
                child: widget.child,
              ),
            ),

            // 2. Synchronized Scrim Dimmer (smooth fade in/out)
            if (progress > 0.001)
              Positioned.fill(
                child: GestureDetector(
                  onTap: dismiss,
                  behavior: HitTestBehavior.opaque,
                  child: Container(
                    color: Colors.black.withValues(alpha: (0.65 * progress).clamp(0.0, 0.65)),
                  ),
                ),
              ),

            // 3. Fluid Interactive Full-Height Sheet
            if (isVisible)
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                child: Transform.translate(
                  offset: Offset(0, sheetY),
                  child: GestureDetector(
                    behavior: HitTestBehavior.translucent,
                    onVerticalDragStart: _onDragStart,
                    onVerticalDragUpdate: (d) => _onDragUpdate(d, travelDistance),
                    onVerticalDragEnd: _onDragEnd,
                    child: Container(
                      color: AppTheme.pureBlack,
                      child: MusicPlayerScreen(onDismiss: dismiss),
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}
