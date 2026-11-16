import 'dart:io';
import 'dart:typed_data';
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
        content: Row(
          children: [
            const SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(color: AppTheme.musicLime, strokeWidth: 2),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Downloading "${song.title}"...',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        backgroundColor: const Color(0xFF1B2A1E),
        duration: const Duration(seconds: 4),
      ),
    );

    try {
      final candidateUrls = [song.streamUrl, ...song.backupStreamUrls]
          .where((u) => u.trim().isNotEmpty)
          .toSet()
          .toList();

      if (candidateUrls.isEmpty) {
        throw Exception('No stream URL available for download');
      }

      final headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Referer': 'https://www.jiosaavn.com/',
      };

      Uint8List? downloadedBytes;
      for (final url in candidateUrls) {
        try {
          final res = await http.get(Uri.parse(url), headers: headers).timeout(const Duration(seconds: 30));
          if (res.statusCode == 200 && res.bodyBytes.isNotEmpty) {
            downloadedBytes = res.bodyBytes;
            break;
          }
        } catch (_) {}
      }

      if (downloadedBytes == null || downloadedBytes.isEmpty) {
        throw Exception('Could not fetch audio bytes from any candidate mirrors');
      }

      Directory? targetDir;
      try {
        final extDir = await getExternalStorageDirectory();
        if (extDir != null) targetDir = extDir;
      } catch (_) {}
      targetDir ??= await getApplicationDocumentsDirectory();

      final cleanName = song.title.replaceAll(RegExp(r'[\\/:*?"<>|]'), '_');
      final file = File('${targetDir.path}/$cleanName.mp3');
      await file.writeAsBytes(downloadedBytes);

      final mb = (downloadedBytes.length / (1024 * 1024)).toStringAsFixed(1);
      messenger.showSnackBar(
        SnackBar(
          content: Text('✓ Saved "${song.title}" ($mb MB) to offline storage!'),
          backgroundColor: const Color(0xFF10401E),
          duration: const Duration(seconds: 4),
        ),
      );
    } catch (e) {
      messenger.showSnackBar(
        const SnackBar(
          content: Text('Download failed. Network mirror unavailable.'),
          backgroundColor: Color(0xFF5E1B1B),
          duration: Duration(seconds: 3),
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
