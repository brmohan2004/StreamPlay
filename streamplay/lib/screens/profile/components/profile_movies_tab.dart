import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../config/app_theme.dart';
import '../../../config/constants.dart';
import '../../../models/video_playback_models.dart';
import '../../../providers/media_provider.dart';
import '../../../providers/navigation_provider.dart';
import '../../../providers/video_playback_provider.dart';

class ProfileMoviesTab extends StatefulWidget {
  final NavigationProvider nav;
  final MediaProvider media;
  final ValueChanged<String> onShowToast;

  const ProfileMoviesTab({
    super.key,
    required this.nav,
    required this.media,
    required this.onShowToast,
  });

  @override
  State<ProfileMoviesTab> createState() => _ProfileMoviesTabState();
}

class _ProfileMoviesTabState extends State<ProfileMoviesTab> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        context.read<VideoPlaybackProvider>().loadProviders();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final nav = widget.nav;
    final media = widget.media;
    final playback = context.watch<VideoPlaybackProvider>();
    final videoQuality = media.videoQuality;
    final selectedProvider = playback.preferredVideoProvider;

    final providerOptions = <ProviderInfo>[
      const ProviderInfo(
        id: 'auto',
        name: 'Auto (All Authorized Providers)',
        description: 'Ranks verified MP4, HLS & MPEG-DASH streams automatically',
        enabled: true,
        priority: 0,
        supportedFormats: ['hls', 'dash', 'mp4'],
      ),
      ...playback.providers.where((p) => p.enabled),
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // VIDEO RESOLUTION
          const Text(
            'VIDEO QUALITY',
            style: TextStyle(color: AppTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.8),
          ),
          const SizedBox(height: 12),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 2.2,
            children: [
              {'id': 'auto', 'label': 'Adaptive', 'badge': 'Auto 4K'},
              {'id': '4k', 'label': '2160p UHD', 'badge': 'Ultra 4K'},
              {'id': '1080p', 'label': '1080p FHD', 'badge': 'Crisp'},
              {'id': '720p', 'label': '720p HD', 'badge': 'Saver'},
            ].map((opt) {
              final isSel = videoQuality == opt['id'];
              return GestureDetector(
                onTap: () {
                  media.setVideoQuality(opt['id']!);
                  widget.onShowToast('Quality: ${opt['label']}');
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF101624),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: isSel ? AppTheme.movieCyan : Colors.white12, width: isSel ? 1.5 : 1),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(opt['badge']!, style: const TextStyle(color: AppTheme.goldAccent, fontSize: 9.5, fontWeight: FontWeight.bold)),
                          Text(opt['label']!, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
                        ],
                      ),
                      if (isSel) const Icon(Icons.check_circle, color: AppTheme.movieCyan, size: 16),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 28),

          // AUTHORIZED VIDEO PROVIDERS
          const Text(
            'AUTHORIZED VIDEO PROVIDER',
            style: TextStyle(color: AppTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.8),
          ),
          const SizedBox(height: 12),
          Column(
            children: providerOptions.map((prov) {
              final isSel = selectedProvider == prov.id;
              final formatTag = prov.supportedFormats.map((f) => f.toUpperCase()).join(' • ');

              return GestureDetector(
                onTap: () {
                  playback.setPreferredVideoProvider(prov.id);
                  widget.onShowToast('Provider: ${prov.name}');
                },
                child: Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF101624),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: isSel ? AppTheme.movieCyan : Colors.white10, width: isSel ? 1.5 : 1),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                shape: BoxShape.circle,
                                color: AppTheme.musicLime,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    prov.name,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                                  ),
                                  Text(
                                    formatTag.isNotEmpty ? formatTag : prov.description,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (isSel) const Icon(Icons.check_circle, color: AppTheme.movieCyan, size: 16),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 28),

          // OTT PLATFORM CATALOG FILTER
          const Text(
            'OTT CATALOG FILTER',
            style: TextStyle(color: AppTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.8),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: AppConstants.ottPlatforms.map((ott) {
              final isSel = nav.selectedOTT == ott.name;
              return GestureDetector(
                onTap: () {
                  nav.setSelectedOTT(ott.name);
                  widget.onShowToast('OTT: ${ott.name}');
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: isSel ? AppTheme.movieCyan : const Color(0xFF101624),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: isSel ? AppTheme.movieCyan : Colors.white12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (isSel) ...[
                        const Icon(Icons.check, size: 12, color: Colors.black),
                        const SizedBox(width: 4),
                      ],
                      Text(
                        ott.name,
                        style: TextStyle(
                          color: isSel ? Colors.black : Colors.white,
                          fontSize: 12,
                          fontWeight: isSel ? FontWeight.bold : FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 28),

          // TOGGLES (Auto-play Episode & Subtitles)
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
                        Icon(Icons.tv, color: AppTheme.movieCyan, size: 20),
                        SizedBox(width: 12),
                        Text('Auto-Play Next Episode', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
                      ],
                    ),
                    Switch(
                      value: media.autoPlayEpisode,
                      activeThumbColor: AppTheme.movieCyan,
                      onChanged: (val) {
                        media.setAutoPlayEpisode(val);
                        widget.onShowToast(val ? 'Episode auto-play enabled' : 'Episode auto-play disabled');
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
                        Icon(Icons.subtitles, color: AppTheme.goldAccent, size: 20),
                        SizedBox(width: 12),
                        Text('Subtitles & Captions', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
                      ],
                    ),
                    Row(
                      children: ['auto', 'always', 'off'].map((opt) {
                        final isSel = media.subtitlePref == opt;
                        return GestureDetector(
                          onTap: () {
                            media.setSubtitlePref(opt);
                            widget.onShowToast('Subtitles: ${opt.toUpperCase()}');
                          },
                          child: Container(
                            margin: const EdgeInsets.only(left: 6),
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: isSel ? AppTheme.movieCyan : const Color(0xFF1A2333),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              opt.toUpperCase(),
                              style: TextStyle(
                                color: isSel ? Colors.black : Colors.white70,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        );
                      }).toList(),
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
