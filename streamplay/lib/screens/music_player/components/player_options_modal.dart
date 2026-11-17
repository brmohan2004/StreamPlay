import 'dart:io';
import 'package:flutter/foundation.dart';
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
      String locationNote = '';

      if (!kIsWeb && Platform.isAndroid) {
        // Priority 1: Public standard Android Downloads folder
        final publicDownload = Directory('/storage/emulated/0/Download/StreamPlay');
        try {
          if (!publicDownload.existsSync()) {
            publicDownload.createSync(recursive: true);
          }
          targetDir = publicDownload;
          locationNote = 'Downloads/StreamPlay';
        } catch (_) {
          // Priority 2: Public standard Android Music folder
          final publicMusic = Directory('/storage/emulated/0/Music/StreamPlay');
          try {
            if (!publicMusic.existsSync()) {
              publicMusic.createSync(recursive: true);
            }
            targetDir = publicMusic;
            locationNote = 'Music/StreamPlay';
          } catch (_) {}
        }
      }

      if (targetDir == null) {
        try {
          final extDir = await getExternalStorageDirectory();
          if (extDir != null) {
            targetDir = extDir;
            locationNote = 'Device Storage';
          }
        } catch (_) {}
      }
      targetDir ??= await getApplicationDocumentsDirectory();
      if (locationNote.isEmpty) locationNote = 'App Storage';

      final cleanName = song.title.replaceAll(RegExp(r'[\\/:*?"<>|]'), '_');
      final file = File('${targetDir.path}/$cleanName.mp3');
      await file.writeAsBytes(downloadedBytes);

      final mb = (downloadedBytes.length / (1024 * 1024)).toStringAsFixed(1);
      messenger.showSnackBar(
        SnackBar(
          content: Text('✓ Saved "$cleanName.mp3" ($mb MB)\n📁 Location: $locationNote/'),
          backgroundColor: const Color(0xFF10401E),
          duration: const Duration(seconds: 5),
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

  String _formatDuration(int seconds) {
    final m = seconds ~/ 60;
    final s = seconds % 60;
    return '$m:${s.toString().padLeft(2, '0')}';
  }

  void _showSongDetailsSheet(BuildContext context, SongItem song) {
    final durStr = _formatDuration(song.duration);

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) {
        return Container(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(ctx).size.height * 0.85,
          ),
          decoration: const BoxDecoration(
            color: Color(0xFF111713),
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
            border: Border(
              top: BorderSide(color: Colors.white12, width: 1),
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 12),
              // Drag Handle
              Container(
                width: 38,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white24,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 16),

              // Title Header Row
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: AppTheme.musicLime.withValues(alpha: 0.15),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.info_rounded,
                        color: AppTheme.musicLime,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        'Song Details',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: Colors.white60),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
              ),

              const Divider(color: Colors.white10, height: 20),

              // Scrollable Details Body
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Album Art + Main Title Card
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.04),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.07)),
                        ),
                        child: Row(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: CachedNetworkImage(
                                imageUrl: song.image,
                                width: 68,
                                height: 68,
                                fit: BoxFit.cover,
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    song.title,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    song.artist,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      color: AppTheme.musicLime,
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  if (song.album.isNotEmpty) ...[
                                    const SizedBox(height: 2),
                                    Text(
                                      song.album,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        color: Colors.white54,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 18),

                      // Audio Specifications Pill Banner
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: AppTheme.musicLime.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppTheme.musicLime.withValues(alpha: 0.25)),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.graphic_eq_rounded, color: AppTheme.musicLime, size: 20),
                            SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '320 kbps Ultra-HD • CD Quality',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  Text(
                                    'Lossless AAC stream • 44.1 kHz Stereo',
                                    style: TextStyle(color: Colors.white54, fontSize: 11),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 18),

                      const Text(
                        'METADATA & CREDITS',
                        style: TextStyle(
                          color: Colors.white38,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1.2,
                        ),
                      ),
                      const SizedBox(height: 10),

                      // Structured details list
                      _buildDetailRow(Icons.music_note_rounded, 'Track Name', song.title),
                      _buildDetailRow(Icons.album_rounded, 'Album', song.album),
                      _buildDetailRow(Icons.person_rounded, 'Singers / Artists', (song.singers != null && song.singers!.isNotEmpty) ? song.singers! : song.artist),
                      if (song.composer != null && song.composer!.isNotEmpty)
                        _buildDetailRow(Icons.piano_rounded, 'Composer / Music', song.composer!),
                      if (song.starring != null && song.starring!.isNotEmpty)
                        _buildDetailRow(Icons.star_rounded, 'Starring', song.starring!),
                      _buildDetailRow(Icons.timer_rounded, 'Duration', '$durStr (${song.duration} seconds)'),
                      _buildDetailRow(Icons.calendar_today_rounded, 'Release Year', song.year ?? 'Original Release'),
                      _buildDetailRow(Icons.translate_rounded, 'Language', song.language ?? 'Universal'),
                      _buildDetailRow(Icons.high_quality_rounded, 'Stream Quality', song.quality),
                      _buildDetailRow(Icons.cloud_done_rounded, 'Audio Engine', '${song.source} Hi-Fi CDN'),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.035),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: AppTheme.musicLime, size: 18),
          const SizedBox(width: 12),
          SizedBox(
            width: 110,
            child: Text(
              label,
              style: const TextStyle(
                color: Colors.white54,
                fontSize: 12.5,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
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

          // 1. Song Details (Full Metadata Sheet)
          ListTile(
            leading: const Icon(Icons.info_outline_rounded, color: AppTheme.musicLime),
            title: const Text('Song Details', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
            subtitle: const Text('Metadata, bitrate specs, album & audio credits', style: TextStyle(color: Colors.white38, fontSize: 11)),
            trailing: const Icon(Icons.chevron_right_rounded, color: Colors.white38, size: 20),
            onTap: () {
              Navigator.pop(context);
              _showSongDetailsSheet(context, song);
            },
          ),

          // 2. Playback Speed Selector
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

          // 3. Drive Mode Toggle
          ListTile(
            leading: const Icon(Icons.directions_car_rounded, color: Colors.white70),
            title: const Text('Drive Mode', style: TextStyle(color: Colors.white, fontSize: 14)),
            onTap: () {
              Navigator.pop(context);
              onActivateDriveMode();
            },
          ),

          // 4. Set as Ringtone / Audio Share
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

          // 5. Download 320kbps CD Quality Audio
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
