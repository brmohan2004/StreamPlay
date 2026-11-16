import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../config/app_theme.dart';
import '../../../models/media_item.dart';
import '../../../providers/media_provider.dart';
import '../../../services/music_service.dart';

class PlayerLyricsModal extends StatefulWidget {
  final SongItem song;

  const PlayerLyricsModal({super.key, required this.song});

  @override
  State<PlayerLyricsModal> createState() => _PlayerLyricsModalState();
}

class _PlayerLyricsModalState extends State<PlayerLyricsModal> {
  final MusicService _musicService = MusicService();
  final ScrollController _scrollController = ScrollController();

  SongLyrics? _lyrics;
  bool _isLoading = true;
  int _activeLineIndex = -1;
  StreamSubscription<Duration>? _posSub;
  bool _userIsScrolling = false;
  Timer? _scrollResumeTimer;

  @override
  void initState() {
    super.initState();
    _fetchLyrics();
  }

  @override
  void dispose() {
    _posSub?.cancel();
    _scrollResumeTimer?.cancel();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _fetchLyrics() async {
    setState(() => _isLoading = true);
    final result = await _musicService.fetchLyrics(widget.song);

    if (mounted) {
      setState(() {
        _lyrics = result;
        _isLoading = false;
      });

      if (result != null && result.isSynced) {
        _startListeningPosition();
      }
    }
  }

  void _startListeningPosition() {
    final media = context.read<MediaProvider>();
    _posSub = media.positionStream.listen((pos) {
      if (!mounted || _lyrics == null || !_lyrics!.isSynced) return;

      final lines = _lyrics!.lines;
      int foundIndex = -1;
      for (int i = 0; i < lines.length; i++) {
        if (lines[i].timestamp != null && lines[i].timestamp! <= pos) {
          foundIndex = i;
        } else {
          break;
        }
      }

      if (foundIndex != _activeLineIndex && foundIndex >= 0) {
        setState(() => _activeLineIndex = foundIndex);
        if (!_userIsScrolling && _scrollController.hasClients) {
          final targetOffset = (foundIndex * 48.0) - 100.0;
          _scrollController.animateTo(
            targetOffset.clamp(0.0, _scrollController.position.maxScrollExtent),
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOutCubic,
          );
        }
      }
    });
  }

  void _onUserScrollStart() {
    _userIsScrolling = true;
    _scrollResumeTimer?.cancel();
    _scrollResumeTimer = Timer(const Duration(seconds: 4), () {
      if (mounted) _userIsScrolling = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final media = context.watch<MediaProvider>();

    return Container(
      height: MediaQuery.of(context).size.height * 0.78,
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1411),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        border: Border(
          top: BorderSide(color: Colors.white.withValues(alpha: 0.12), width: 1),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.8),
            blurRadius: 28,
            spreadRadius: 2,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag handle bar
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
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Lyrics',
                      style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${widget.song.title} • ${widget.song.artist}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              if (_lyrics != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                  decoration: BoxDecoration(
                    color: _lyrics!.isSynced
                        ? AppTheme.musicLime.withValues(alpha: 0.18)
                        : Colors.white.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: _lyrics!.isSynced
                          ? AppTheme.musicLime.withValues(alpha: 0.5)
                          : Colors.white24,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _lyrics!.isSynced ? Icons.bolt_rounded : Icons.subject_rounded,
                        size: 12,
                        color: _lyrics!.isSynced ? AppTheme.musicLime : Colors.white70,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _lyrics!.isSynced ? 'SYNCED' : 'PLAIN',
                        style: TextStyle(
                          color: _lyrics!.isSynced ? AppTheme.musicLime : Colors.white70,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),

          const SizedBox(height: 20),

          // Lyrics Body
          Expanded(
            child: _isLoading
                ? _buildLoadingSkeleton()
                : _lyrics == null || _lyrics!.lines.isEmpty
                    ? _buildNotFoundView()
                    : NotificationListener<ScrollNotification>(
                        onNotification: (notif) {
                          if (notif is ScrollStartNotification) {
                            _onUserScrollStart();
                          }
                          return false;
                        },
                        child: ListView.builder(
                          controller: _scrollController,
                          physics: const BouncingScrollPhysics(),
                          itemCount: _lyrics!.lines.length + 1,
                          itemBuilder: (context, idx) {
                            if (idx == _lyrics!.lines.length) {
                              return Padding(
                                padding: const EdgeInsets.symmetric(vertical: 36),
                                child: Center(
                                  child: Text(
                                    _lyrics!.isSynced
                                        ? 'Synchronized lyrics powered by LRCLIB'
                                        : 'Lyrics powered by StreamPlay Zero-Key Engine',
                                    style: const TextStyle(color: Colors.white24, fontSize: 11),
                                  ),
                                ),
                              );
                            }

                            final line = _lyrics!.lines[idx];
                            final isHighlight = _lyrics!.isSynced && idx == _activeLineIndex;

                            return GestureDetector(
                              onTap: () {
                                if (line.timestamp != null) {
                                  media.seek(line.timestamp!);
                                }
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
                                margin: const EdgeInsets.symmetric(vertical: 2),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(12),
                                  color: isHighlight
                                      ? AppTheme.musicLime.withValues(alpha: 0.12)
                                      : Colors.transparent,
                                ),
                                child: Text(
                                  line.text,
                                  style: TextStyle(
                                    color: isHighlight
                                        ? AppTheme.musicLime
                                        : _lyrics!.isSynced
                                            ? Colors.white.withValues(alpha: 0.5)
                                            : Colors.white.withValues(alpha: 0.88),
                                    fontSize: isHighlight ? 20 : 16,
                                    fontWeight: isHighlight ? FontWeight.bold : FontWeight.w500,
                                    height: 1.45,
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoadingSkeleton() {
    return ListView.builder(
      itemCount: 8,
      physics: const NeverScrollableScrollPhysics(),
      itemBuilder: (context, idx) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Container(
          width: double.infinity,
          height: 18,
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(6),
          ),
        ),
      ),
    );
  }

  Widget _buildNotFoundView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.music_off_rounded, size: 48, color: Colors.white.withValues(alpha: 0.25)),
          const SizedBox(height: 12),
          const Text(
            'Lyrics Not Available',
            style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          const Text(
            'We couldn\'t find synchronized lyrics for this track.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppTheme.textMuted, fontSize: 13),
          ),
          const SizedBox(height: 20),
          GestureDetector(
            onTap: _fetchLyrics,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
              decoration: BoxDecoration(
                color: AppTheme.musicLime.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.musicLime.withValues(alpha: 0.4)),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.refresh_rounded, size: 16, color: AppTheme.musicLime),
                  SizedBox(width: 6),
                  Text('Retry', style: TextStyle(color: AppTheme.musicLime, fontSize: 13, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
