import 'package:flutter/material.dart';
import '../../../config/app_theme.dart';

class PlayerBufferingOverlay extends StatelessWidget {
  final String? subtitle;

  const PlayerBufferingOverlay({super.key, this.subtitle});

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Center(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.72),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.white12),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(
                width: 34,
                height: 34,
                child: CircularProgressIndicator(
                  color: AppTheme.movieCyan,
                  strokeWidth: 3,
                ),
              ),
              if (subtitle != null && subtitle!.isNotEmpty) ...[
                const SizedBox(height: 10),
                Text(
                  subtitle!,
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class PlayerErrorOverlay extends StatelessWidget {
  final String message;
  final bool isExpired;
  final bool hasAlternateSources;
  final bool isRecovering;
  final VoidCallback onRetry;
  final VoidCallback onRefreshSession;
  final VoidCallback? onSwitchSource;
  final VoidCallback onClose;

  const PlayerErrorOverlay({
    super.key,
    required this.message,
    required this.isExpired,
    required this.hasAlternateSources,
    required this.isRecovering,
    required this.onRetry,
    required this.onRefreshSession,
    this.onSwitchSource,
    required this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black.withValues(alpha: 0.86),
      alignment: Alignment.center,
      padding: const EdgeInsets.all(24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 440),
        child: Container(
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            color: const Color(0xFF0E1420),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isExpired ? AppTheme.theaterAmber.withValues(alpha: 0.5) : AppTheme.errorRed.withValues(alpha: 0.45),
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                isExpired ? Icons.timer_off_rounded : Icons.wifi_off_rounded,
                color: isExpired ? AppTheme.theaterAmber : AppTheme.errorRed,
                size: 40,
              ),
              const SizedBox(height: 12),
              Text(
                isExpired ? 'Playback Session Expired' : 'Playback Interrupted',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: AppTheme.textMuted,
                  fontSize: 13,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 20),
              if (isRecovering)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: CircularProgressIndicator(color: AppTheme.movieCyan, strokeWidth: 2.5),
                )
              else
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  alignment: WrapAlignment.center,
                  children: [
                    if (isExpired)
                      ElevatedButton.icon(
                        onPressed: onRefreshSession,
                        icon: const Icon(Icons.refresh_rounded, size: 18),
                        label: const Text('Refresh Session'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.movieCyan,
                          foregroundColor: Colors.black,
                          textStyle: const TextStyle(fontWeight: FontWeight.w800),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      )
                    else
                      ElevatedButton.icon(
                        onPressed: onRetry,
                        icon: const Icon(Icons.replay_rounded, size: 18),
                        label: const Text('Retry Stream'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.movieCyan,
                          foregroundColor: Colors.black,
                          textStyle: const TextStyle(fontWeight: FontWeight.w800),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    if (hasAlternateSources && onSwitchSource != null)
                      OutlinedButton.icon(
                        onPressed: onSwitchSource,
                        icon: const Icon(Icons.swap_horiz_rounded, size: 18, color: Colors.white),
                        label: const Text('Switch Source', style: TextStyle(color: Colors.white)),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Colors.white24),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    TextButton(
                      onPressed: onClose,
                      child: const Text('Exit Player', style: TextStyle(color: AppTheme.textMuted)),
                    ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }
}
