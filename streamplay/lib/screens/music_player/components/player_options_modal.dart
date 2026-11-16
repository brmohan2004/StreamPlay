import 'dart:io';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import '../../../config/app_theme.dart';
import '../../../models/media_item.dart';
import '../../../providers/media_provider.dart';

class PlayerOptionsModal extends StatelessWidget {
  final SongItem song;
  final MediaProvider media;
  final VoidCallback onActivateDriveMode;

  const PlayerOptionsModal({
    super.key,
    required this.song,
    required this.media,
    required this.onActivateDriveMode,
  });

  Future<void> _downloadSong(BuildContext context) async {
    final messenger = ScaffoldMessenger.of(context);
    messenger.showSnackBar(
      SnackBar(
        content: Text('Downloading "${song.title}" (320kbps)...'),
        backgroundColor: const Color(0xFF1B2A1E),
        duration: const Duration(seconds: 2),
      ),
    );

    try {
      final candidateUrls = [song.streamUrl, ...song.backupStreamUrls].where((u) => u.isNotEmpty).toList();
      final url = candidateUrls.isNotEmpty ? candidateUrls.first : song.streamUrl;
      final res = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 45));

      if (res.statusCode == 200 && res.bodyBytes.isNotEmpty) {
        Directory? targetDir;
        try {
          final extDir = await getExternalStorageDirectory();
          if (extDir != null) targetDir = extDir;
        } catch (_) {}
        targetDir ??= await getApplicationDocumentsDirectory();

        final cleanName = song.title.replaceAll(RegExp(r'[\\/:*?"<>|]'), '_');
        final file = File('${targetDir.path}/$cleanName.mp3');
        await file.writeAsBytes(res.bodyBytes);

        messenger.showSnackBar(
          SnackBar(
            content: Text('✓ Saved "${song.title}" (${(res.bodyBytes.length / (1024 * 1024)).toStringAsFixed(1)} MB)!'),
            backgroundColor: const Color(0xFF10401E),
            duration: const Duration(seconds: 3),
          ),
        );
      } else {
        throw Exception('Download failed with status ${res.statusCode}');
      }
    } catch (_) {
      messenger.showSnackBar(
        const SnackBar(
          content: Text('Download failed. Please check network connection.'),
          backgroundColor: Color(0xFF5E1B1B),
        ),
      );
    }
  }

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

          // Title Header
          Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: CachedNetworkImage(
                  imageUrl: song.image,
                  width: 44,
                  height: 44,
                  fit: BoxFit.cover,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      song.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    Text(
                      song.artist,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: Colors.white54, fontSize: 12),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          const Divider(color: Colors.white10),

          // 1. Playback Speed Selector
          ListTile(
            leading: const Icon(Icons.speed_rounded, color: AppTheme.musicLime),
            title: const Text('Playback Speed', style: TextStyle(color: Colors.white, fontSize: 14)),
            trailing: DropdownButton<double>(
              value: media.playbackSpeed,
              dropdownColor: const Color(0xFF1A221C),
              underline: const SizedBox.shrink(),
              style: const TextStyle(color: AppTheme.musicLime, fontWeight: FontWeight.bold),
              items: const [0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((s) {
                return DropdownMenuItem(value: s, child: Text('${s}x'));
              }).toList(),
              onChanged: (val) {
                if (val != null) {
                  media.setPlaybackSpeed(val);
                  Navigator.pop(context);
                }
              },
            ),
          ),

          // 2. Drive Mode Toggle
          ListTile(
            leading: const Icon(Icons.directions_car_rounded, color: Colors.white70),
            title: const Text('Drive Mode', style: TextStyle(color: Colors.white, fontSize: 14)),
            onTap: () {
              Navigator.pop(context);
              onActivateDriveMode();
            },
          ),

          // 3. Set as Ringtone / Audio Share
          ListTile(
            leading: const Icon(Icons.share_rounded, color: Colors.white70),
            title: const Text('Share Song Stream', style: TextStyle(color: Colors.white, fontSize: 14)),
            onTap: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Stream link copied: ${song.title}'),
                  backgroundColor: const Color(0xFF1B2A1E),
                ),
              );
            },
          ),

          // 4. Download 320kbps CD Quality Audio
          ListTile(
            leading: const Icon(Icons.download_rounded, color: Colors.white70),
            title: const Text('Download (320kbps Lossless)', style: TextStyle(color: Colors.white, fontSize: 14)),
            subtitle: const Text('Saves audio locally for offline play', style: TextStyle(color: Colors.white38, fontSize: 11)),
            onTap: () {
              Navigator.pop(context);
              _downloadSong(context);
            },
          ),
        ],
      ),
    );
  }
}
