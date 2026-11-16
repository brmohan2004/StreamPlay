import 'package:flutter/material.dart';
import '../../../config/app_theme.dart';
import '../../../providers/media_provider.dart';
import '../../../providers/navigation_provider.dart';

class ProfileMusicTab extends StatelessWidget {
  final NavigationProvider nav;
  final MediaProvider media;
  final ValueChanged<String> onShowToast;

  const ProfileMusicTab({
    super.key,
    required this.nav,
    required this.media,
    required this.onShowToast,
  });

  @override
  Widget build(BuildContext context) {
    final audioQuality = media.audioQuality;
    final eqPreset = media.eqPreset;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // AUDIO STREAMING QUALITY
          const Text(
            'AUDIO STREAMING QUALITY',
            style: TextStyle(color: AppTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.8),
          ),
          const SizedBox(height: 12),
          Column(
            children: [
              {'id': '320k', 'label': '320 kbps', 'badge': 'Ultra Hi-Fi Lossless (Master CD Quality)'},
              {'id': '160k', 'label': '160 kbps', 'badge': 'High Quality (Balanced Audio)'},
              {'id': '96k', 'label': '96 kbps', 'badge': 'Data Saver (Mobile Friendly)'},
            ].map((opt) {
              final isSel = audioQuality == opt['id'];
              return GestureDetector(
                onTap: () {
                  media.setAudioQuality(opt['id']!);
                  onShowToast('Audio Bitrate: ${opt['label']}');
                },
                child: Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF101624),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: isSel ? AppTheme.musicLime : Colors.white10, width: isSel ? 1.5 : 1),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(opt['label']!, style: const TextStyle(color: Colors.white, fontSize: 13.5, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 2),
                          Text(opt['badge']!, style: TextStyle(color: isSel ? AppTheme.musicLime : AppTheme.textMuted, fontSize: 11)),
                        ],
                      ),
                      if (isSel) const Icon(Icons.check_circle, color: AppTheme.musicLime, size: 18),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 28),

          // GRAPHIC EQUALIZER PRESETS
          const Text(
            'GRAPHIC EQUALIZER TUNING',
            style: TextStyle(color: AppTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.8),
          ),
          const SizedBox(height: 12),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 1.8,
            children: [
              {'id': 'balanced', 'label': 'Studio Balanced', 'bars': [45, 60, 55, 50, 48]},
              {'id': 'bass', 'label': 'Sub-Bass Boost', 'bars': [90, 80, 50, 40, 35]},
              {'id': 'vocal', 'label': 'Vocal Clarity', 'bars': [35, 65, 88, 70, 50]},
              {'id': 'spatial', 'label': 'Spatial Immersion', 'bars': [50, 45, 60, 85, 95]},
            ].map((eq) {
              final isSel = eqPreset == eq['id'];
              final bars = eq['bars'] as List<int>;

              return GestureDetector(
                onTap: () {
                  media.setEqPreset(eq['id'] as String);
                  onShowToast('Equalizer: ${(eq['label'] as String).toUpperCase()}');
                },
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF101624),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: isSel ? AppTheme.musicLime : Colors.white10, width: isSel ? 1.5 : 1),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(eq['label'] as String, style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.bold)),
                          if (isSel) const Icon(Icons.check_circle, color: AppTheme.musicLime, size: 14),
                        ],
                      ),
                      // Frequency equalizer bars
                      SizedBox(
                        height: 24,
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: bars.map((b) {
                            return Expanded(
                              child: Container(
                                margin: const EdgeInsets.symmetric(horizontal: 2),
                                height: (b * 0.24).clamp(4.0, 24.0),
                                decoration: BoxDecoration(
                                  color: isSel ? AppTheme.musicLime : Colors.white24,
                                  borderRadius: BorderRadius.circular(2),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 28),

          // PLAYBACK MODE (Audio vs 4K Video Music)
          const Text(
            'DEFAULT MUSIC MODE',
            style: TextStyle(color: AppTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.8),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () {
                    media.setPlaybackMode('audio');
                    onShowToast('Playback: Audio Only');
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF101624),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: media.playbackMode == 'audio' ? AppTheme.musicLime : Colors.white10, width: 1.5),
                    ),
                    child: const Column(
                      children: [
                        Icon(Icons.volume_up, color: AppTheme.musicLime, size: 22),
                        SizedBox(height: 8),
                        Text('Hi-Fi Audio Stream', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: GestureDetector(
                  onTap: () {
                    media.setPlaybackMode('video');
                    onShowToast('Playback: 4K Video Music');
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF101624),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: media.playbackMode == 'video' ? AppTheme.musicLime : Colors.white10, width: 1.5),
                    ),
                    child: const Column(
                      children: [
                        Icon(Icons.movie, color: AppTheme.movieCyan, size: 22),
                        SizedBox(height: 8),
                        Text('4K Official Video', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 28),

          // TOGGLES (Gapless & Infinite Radio)
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFF101624),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white10),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.hourglass_bottom, color: Color(0xFFFFB703), size: 20),
                        SizedBox(width: 12),
                        Text('5s Delay on Songs Switching', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
                      ],
                    ),
                    Switch(
                      value: media.songSwitchDelayEnabled,
                      activeThumbColor: const Color(0xFFFFB703),
                      onChanged: (val) {
                        media.setSongSwitchDelayEnabled(val);
                        onShowToast(val ? '5s delay between songs switching enabled' : 'Instant song switching enabled');
                      },
                    ),
                  ],
                ),
                const Divider(color: Colors.white10, height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.auto_awesome, color: AppTheme.musicLime, size: 20),
                        SizedBox(width: 12),
                        Text('Auto-Play Infinite Radio', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
                      ],
                    ),
                    Switch(
                      value: media.autoplayInfiniteQueue,
                      activeThumbColor: AppTheme.musicLime,
                      onChanged: (val) {
                        media.setAutoplayInfiniteQueue(val);
                        onShowToast(val ? 'Infinite queue auto-play enabled' : 'Infinite queue auto-play disabled');
                      },
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
