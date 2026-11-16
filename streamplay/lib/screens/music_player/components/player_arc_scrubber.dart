import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../../config/app_theme.dart';

class PlayerArcScrubber extends StatelessWidget {
  final Duration position;
  final Duration duration;
  final bool isLiked;
  final ValueChanged<Duration> onSeek;
  final VoidCallback onToggleLike;

  const PlayerArcScrubber({
    super.key,
    required this.position,
    required this.duration,
    required this.isLiked,
    required this.onSeek,
    required this.onToggleLike,
  });

  String _formatDuration(Duration d) {
    final m = d.inMinutes;
    final s = (d.inSeconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    final maxSec = duration.inSeconds > 0 ? duration.inSeconds.toDouble() : 1.0;
    final curSec = position.inSeconds.toDouble().clamp(0.0, maxSec);
    final progress = (curSec / maxSec).clamp(0.0, 1.0);

    return SizedBox(
      height: 120,
      width: 250,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Custom Arc Visual Scrubber
          Positioned.fill(
            child: GestureDetector(
              onPanUpdate: (details) {
                final box = context.findRenderObject() as RenderBox?;
                if (box == null) return;
                final local = box.globalToLocal(details.globalPosition);
                final center = Offset(box.size.width / 2, box.size.height);
                final dx = local.dx - center.dx;
                final dy = local.dy - center.dy;
                var angle = math.atan2(dy, dx);
                if (angle < 0) angle += 2 * math.pi;
                var norm = (angle - math.pi) / math.pi;
                norm = norm.clamp(0.0, 1.0);
                onSeek(Duration(seconds: (norm * maxSec).toInt()));
              },
              child: CustomPaint(
                painter: _ArcScrubberPainter(progress: progress),
              ),
            ),
          ),

          // Center Heart & Counters
          Column(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              GestureDetector(
                onTap: onToggleLike,
                child: Container(
                  padding: const EdgeInsets.all(6),
                  child: Icon(
                    isLiked ? Icons.favorite_rounded : Icons.favorite_outline_rounded,
                    color: isLiked ? AppTheme.musicLime : Colors.white60,
                    size: 20,
                  ),
                ),
              ),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '${_formatDuration(position)} / ${_formatDuration(duration)}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    fontFamily: 'monospace',
                  ),
                ),
              ),
              const SizedBox(height: 12),
            ],
          ),
        ],
      ),
    );
  }
}

// Semicircular Arc Painter
class _ArcScrubberPainter extends CustomPainter {
  final double progress;

  _ArcScrubberPainter({required this.progress});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height);
    final radius = size.width / 2 - 12;

    final bgPaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.12)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      math.pi,
      math.pi,
      false,
      bgPaint,
    );

    final progressPaint = Paint()
      ..color = AppTheme.musicLime
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 3.0;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      math.pi,
      math.pi * progress,
      false,
      progressPaint,
    );

    // Thumb position indicator dot with lime glow
    final thumbAngle = math.pi + (math.pi * progress);
    final thumbX = center.dx + radius * math.cos(thumbAngle);
    final thumbY = center.dy + radius * math.sin(thumbAngle);

    final glowPaint = Paint()
      ..color = AppTheme.musicLime.withValues(alpha: 0.5)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6);
    canvas.drawCircle(Offset(thumbX, thumbY), 8, glowPaint);

    final thumbPaint = Paint()..color = AppTheme.musicLime;
    canvas.drawCircle(Offset(thumbX, thumbY), 5.5, thumbPaint);
  }

  @override
  bool shouldRepaint(covariant _ArcScrubberPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}
