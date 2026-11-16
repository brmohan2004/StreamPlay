import 'package:flutter/material.dart';
import '../../../config/app_theme.dart';
import '../../../providers/media_provider.dart';

/// Customizable Sleep Timer Modal with presets above 1 hour and custom slider (up to 8 hours).
class PlayerSleepTimerModal extends StatefulWidget {
  final MediaProvider media;

  const PlayerSleepTimerModal({super.key, required this.media});

  @override
  State<PlayerSleepTimerModal> createState() => _PlayerSleepTimerModalState();
}

class _PlayerSleepTimerModalState extends State<PlayerSleepTimerModal> {
  double _customMinutes = 90; // Default 1.5 hours

  String _formatDurationLabel(int totalMinutes) {
    if (totalMinutes < 60) {
      return '$totalMinutes mins';
    }
    final hours = totalMinutes ~/ 60;
    final mins = totalMinutes % 60;
    if (mins == 0) {
      return '$hours hr${hours > 1 ? 's' : ''}';
    }
    return '$hours hr${hours > 1 ? 's' : ''} $mins mins';
  }

  void _applyTimer(int minutes) {
    widget.media.setSleepTimer(minutes);
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('✓ Sleep timer set for ${_formatDurationLabel(minutes)}'),
        backgroundColor: const Color(0xFF1B2A1E),
        duration: const Duration(seconds: 3),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final activeTimerSec = widget.media.remainingSleepTimerSeconds;
    final hasActiveTimer = activeTimerSec > 0;

    return Container(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 32),
      decoration: const BoxDecoration(
        color: Color(0xFF131815),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Top Drag Handle
            Container(
              width: 36,
              height: 4,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: Colors.white24,
                borderRadius: BorderRadius.circular(2),
              ),
            ),

            const Text(
              'Sleep Timer',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Playback stops automatically when the timer expires',
              style: TextStyle(color: Colors.white54, fontSize: 12),
            ),
            const SizedBox(height: 20),

            // Active Countdown Card
            if (hasActiveTimer) ...[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: AppTheme.musicLime.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.musicLime.withValues(alpha: 0.4)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.timer_outlined, color: AppTheme.musicLime, size: 22),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Active Timer',
                            style: TextStyle(color: AppTheme.musicLime, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                          Text(
                            '${(activeTimerSec ~/ 60)}m ${(activeTimerSec % 60)}s remaining',
                            style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                    TextButton(
                      onPressed: () {
                        widget.media.cancelSleepTimer();
                        Navigator.pop(context);
                      },
                      child: const Text('Cancel', style: TextStyle(color: Color(0xFFFF5252), fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
            ],

            // Custom Slider Section (Up to 8 hours / 480 mins)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.04),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: Colors.white10),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Custom Duration',
                        style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppTheme.musicLime.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          _formatDurationLabel(_customMinutes.round()),
                          style: const TextStyle(
                            color: AppTheme.musicLime,
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  SliderTheme(
                    data: SliderTheme.of(context).copyWith(
                      activeTrackColor: AppTheme.musicLime,
                      inactiveTrackColor: Colors.white12,
                      thumbColor: AppTheme.musicLime,
                      overlayColor: AppTheme.musicLime.withValues(alpha: 0.2),
                      trackHeight: 4,
                    ),
                    child: Slider(
                      value: _customMinutes,
                      min: 5,
                      max: 480, // Up to 8 hours!
                      divisions: 95, // 5 min increments
                      onChanged: (val) {
                        setState(() => _customMinutes = val);
                      },
                    ),
                  ),
                  const SizedBox(height: 6),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.musicLime,
                        foregroundColor: Colors.black,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      onPressed: () => _applyTimer(_customMinutes.round()),
                      child: Text(
                        'Set Sleep Timer for ${_formatDurationLabel(_customMinutes.round())}',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 18),
            const Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'QUICK PRESETS',
                style: TextStyle(
                  color: Colors.white38,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.1,
                ),
              ),
            ),
            const SizedBox(height: 8),

            // Presets Grid (includes > 1 hour options: 1 hr, 1.5 hrs, 2 hrs, 3 hrs, 4 hrs)
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                15, 30, 45, 60, 90, 120, 180, 240
              ].map((mins) {
                final label = _formatDurationLabel(mins);
                return ActionChip(
                  label: Text(label),
                  labelStyle: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                  backgroundColor: const Color(0xFF1B221E),
                  side: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  onPressed: () => _applyTimer(mins),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }
}
