import 'package:flutter/material.dart';
import '../../../config/app_theme.dart';
import '../../../providers/media_provider.dart';

class PlayerSleepTimerModal extends StatelessWidget {
  final MediaProvider media;

  const PlayerSleepTimerModal({super.key, required this.media});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
      decoration: const BoxDecoration(
        color: Color(0xFF141916),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 36,
            height: 4,
            margin: const EdgeInsets.only(bottom: 20),
            decoration: BoxDecoration(
              color: Colors.white24,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const Text('Sleep Timer', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          const Text('Playback will stop automatically after the timer expires', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
          const SizedBox(height: 20),
          ...[15, 30, 45, 60].map((mins) {
            return ListTile(
              title: Text('$mins minutes', style: const TextStyle(color: Colors.white, fontSize: 14)),
              trailing: const Icon(Icons.chevron_right, color: Colors.white30, size: 18),
              onTap: () {
                media.setSleepTimer(mins);
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Sleep timer set for $mins minutes'),
                    backgroundColor: const Color(0xFF1B2A1E),
                  ),
                );
              },
            );
          }),
          if (media.remainingSleepTimerSeconds > 0)
            ListTile(
              title: const Text('Cancel Sleep Timer', style: TextStyle(color: Color(0xFFFF5252), fontSize: 14, fontWeight: FontWeight.bold)),
              trailing: const Icon(Icons.cancel_outlined, color: Color(0xFFFF5252), size: 18),
              onTap: () {
                media.cancelSleepTimer();
                Navigator.pop(context);
              },
            ),
        ],
      ),
    );
  }
}
