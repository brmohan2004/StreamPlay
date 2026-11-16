import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../models/media_item.dart';
import '../../providers/media_provider.dart';

class AddToPlaylistModal extends StatefulWidget {
  final SongItem song;

  const AddToPlaylistModal({super.key, required this.song});

  @override
  State<AddToPlaylistModal> createState() => _AddToPlaylistModalState();
}

class _AddToPlaylistModalState extends State<AddToPlaylistModal> {
  final TextEditingController _nameController = TextEditingController();
  bool _isCreating = false;

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final media = context.watch<MediaProvider>();
    final playlists = media.playlists;

    return Container(
      decoration: const BoxDecoration(
        color: AppTheme.surfaceDark,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 38,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.24),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Add to Playlist',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close, color: Colors.white70),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 8),

          Text(
            widget.song.title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: AppTheme.musicLime, fontSize: 13),
          ),
          const SizedBox(height: 16),

          // New Playlist Input or Trigger
          if (_isCreating) ...[
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _nameController,
                    autofocus: true,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: 'Playlist name...',
                      hintStyle: const TextStyle(color: AppTheme.textMuted),
                      filled: true,
                      fillColor: AppTheme.cardDark,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: () {
                    final name = _nameController.text.trim();
                    if (name.isNotEmpty) {
                      media.createPlaylist(name, widget.song);
                      Navigator.pop(context);
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.musicLime,
                    foregroundColor: Colors.black,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Create'),
                ),
              ],
            ),
          ] else ...[
            ListTile(
              leading: Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppTheme.musicLime.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.add, color: AppTheme.musicLime),
              ),
              title: const Text('Create New Playlist', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
              onTap: () {
                setState(() {
                  _isCreating = true;
                });
              },
              contentPadding: EdgeInsets.zero,
            ),
          ],

          const Divider(color: AppTheme.borderSubtle, height: 24),

          // Existing Playlists
          if (playlists.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Center(
                child: Text('No custom playlists yet', style: TextStyle(color: AppTheme.textMuted, fontSize: 13)),
              ),
            )
          else
            Flexible(
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: playlists.length,
                itemBuilder: (context, idx) {
                  final pl = playlists[idx];
                  final alreadyIn = pl.songs.any((s) => s.id == widget.song.id);
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: AppTheme.cardDark,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.music_note_rounded, color: AppTheme.textMuted),
                    ),
                    title: Text(pl.name, style: const TextStyle(color: Colors.white, fontSize: 14)),
                    subtitle: Text('${pl.songs.length} songs', style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                    trailing: alreadyIn
                        ? const Icon(Icons.check_circle_rounded, color: AppTheme.musicLime, size: 20)
                        : const Icon(Icons.add_circle_outline_rounded, color: Colors.white70, size: 20),
                    onTap: () {
                      if (!alreadyIn) {
                        media.addSongToPlaylist(pl.id, widget.song);
                      }
                      Navigator.pop(context);
                    },
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}

