import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../config/app_theme.dart';
import '../../../providers/media_provider.dart';

class PlayerQueueSheet extends StatefulWidget {
  final MediaProvider media;

  const PlayerQueueSheet({super.key, required this.media});

  @override
  State<PlayerQueueSheet> createState() => _PlayerQueueSheetState();
}

class _PlayerQueueSheetState extends State<PlayerQueueSheet> {
  final ScrollController _scrollController = ScrollController();
  bool _isPitching = false;

  @override
  void initState() {
    super.initState();
    _checkAndPitch();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 250 && !_isPitching) {
      _triggerPitchMore();
    }
  }

  Future<void> _checkAndPitch() async {
    final queue = widget.media.currentQueue;
    final currentIdx = queue.indexWhere((s) => s.id == widget.media.currentSong?.id);
    final remaining = currentIdx >= 0 ? queue.length - 1 - currentIdx : queue.length;
    if (remaining < 6 && !_isPitching) {
      _triggerPitchMore();
    }
  }

  Future<void> _triggerPitchMore() async {
    if (_isPitching) return;
    setState(() => _isPitching = true);
    await widget.media.pitchMoreSongsToQueue();
    if (mounted) setState(() => _isPitching = false);
  }

  @override
  Widget build(BuildContext context) {
    final queue = widget.media.currentQueue;
    final currentSong = widget.media.currentSong;
    final currentIndex = queue.indexWhere((s) => s.id == currentSong?.id);

    return Container(
      height: MediaQuery.of(context).size.height * 0.78,
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
      decoration: BoxDecoration(
        color: const Color(0xFF101512),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        border: Border(
          top: BorderSide(color: Colors.white.withValues(alpha: 0.12), width: 1),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.75),
            blurRadius: 28,
            spreadRadius: 2,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 38,
              height: 4.5,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.28),
                borderRadius: BorderRadius.circular(3),
              ),
            ),
          ),

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Up Next',
                    style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${queue.length} Tracks in Queue',
                    style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                  ),
                ],
              ),

              // Infinite Autoplay Indicator
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: AppTheme.musicLime.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.musicLime.withValues(alpha: 0.35)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: const BoxDecoration(
                        color: AppTheme.musicLime,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    const Text(
                      'INFINITE AUTOPLAY',
                      style: TextStyle(
                        color: AppTheme.musicLime,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.6,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          Expanded(
            child: queue.isEmpty
                ? const Center(child: Text('Queue is empty', style: TextStyle(color: AppTheme.textMuted)))
                : ListView.builder(
                    controller: _scrollController,
                    physics: const BouncingScrollPhysics(),
                    itemCount: queue.length + 1,
                    itemBuilder: (context, idx) {
                      if (idx == queue.length) {
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 20),
                          child: Center(
                            child: _isPitching
                                ? const Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      SizedBox(
                                        width: 16,
                                        height: 16,
                                        child: CircularProgressIndicator(color: AppTheme.musicLime, strokeWidth: 2),
                                      ),
                                      SizedBox(width: 10),
                                      Text(
                                        'Pitching next unique tracks...',
                                        style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
                                      ),
                                    ],
                                  )
                                : GestureDetector(
                                    onTap: _triggerPitchMore,
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                      decoration: BoxDecoration(
                                        color: Colors.white.withValues(alpha: 0.08),
                                        borderRadius: BorderRadius.circular(20),
                                        border: Border.all(color: Colors.white12),
                                      ),
                                      child: const Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(Icons.add_rounded, size: 16, color: AppTheme.musicLime),
                                          SizedBox(width: 6),
                                          Text(
                                            'Pitch More Songs to Queue',
                                            style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                          ),
                        );
                      }

                      final item = queue[idx];
                      final isCurrent = currentSong?.id == item.id;
                      final isPlayed = currentIndex >= 0 && idx < currentIndex;

                      return ListTile(
                        contentPadding: const EdgeInsets.symmetric(vertical: 2),
                        leading: ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Stack(
                            children: [
                              CachedNetworkImage(
                                imageUrl: item.image,
                                width: 44,
                                height: 44,
                                fit: BoxFit.cover,
                              ),
                              if (isPlayed)
                                Container(
                                  width: 44,
                                  height: 44,
                                  color: Colors.black.withValues(alpha: 0.45),
                                ),
                            ],
                          ),
                        ),
                        title: Text(
                          item.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: isCurrent
                                ? AppTheme.musicLime
                                : isPlayed
                                    ? Colors.white38
                                    : Colors.white,
                            fontSize: 13.5,
                            fontWeight: isCurrent ? FontWeight.bold : FontWeight.w500,
                          ),
                        ),
                        subtitle: Text(
                          item.artist,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: isCurrent
                                ? AppTheme.musicLime.withValues(alpha: 0.8)
                                : isPlayed
                                    ? Colors.white24
                                    : const Color(0xFF8E9BAE),
                            fontSize: 11,
                          ),
                        ),
                        trailing: isCurrent
                            ? Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: AppTheme.musicLime.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.equalizer_rounded, color: AppTheme.musicLime, size: 16),
                                    SizedBox(width: 4),
                                    Text('NOW PLAYING', style: TextStyle(color: AppTheme.musicLime, fontSize: 9, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                              )
                            : isPlayed
                                ? const Text('PLAYED', style: TextStyle(color: Colors.white24, fontSize: 10))
                                : null,
                        onTap: () {
                          widget.media.playSong(item, queue);
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
