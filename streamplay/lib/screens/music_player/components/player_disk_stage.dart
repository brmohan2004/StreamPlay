import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../../config/app_theme.dart';
import '../../../models/media_item.dart';
import '../../../services/music_service.dart';

class PlayerDiskStage extends StatefulWidget {
  final SongItem song;
  final bool isVideoMode;
  final VoidCallback onSwipeLeft;
  final VoidCallback onSwipeRight;
  final VoidCallback? onSwipeDown;

  const PlayerDiskStage({
    super.key,
    required this.song,
    required this.isVideoMode,
    required this.onSwipeLeft,
    required this.onSwipeRight,
    this.onSwipeDown,
  });

  @override
  State<PlayerDiskStage> createState() => _PlayerDiskStageState();
}

class _PlayerDiskStageState extends State<PlayerDiskStage> {
  final MusicService _musicService = MusicService();
  WebViewController? _webViewController;
  bool _isVideoLoading = true;
  String? _loadedSongId;

  @override
  void initState() {
    super.initState();
    if (widget.isVideoMode) {
      _initVideo(widget.song);
    }
  }

  @override
  void didUpdateWidget(covariant PlayerDiskStage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isVideoMode && (!oldWidget.isVideoMode || widget.song.id != _loadedSongId)) {
      _initVideo(widget.song);
    } else if (!widget.isVideoMode && oldWidget.isVideoMode) {
      // Immediately stop and destroy WebView playback when returning to audio mode
      _webViewController?.loadHtmlString('<html><body style="background:#000;"></body></html>');
      _webViewController = null;
    }
  }

  @override
  void dispose() {
    _webViewController?.loadHtmlString('<html><body style="background:#000;"></body></html>');
    _webViewController = null;
    super.dispose();
  }

  Future<void> _initVideo(SongItem song) async {
    _loadedSongId = song.id;
    setState(() => _isVideoLoading = true);

    final searchQuery = '${song.title} ${song.artist} official video';
    final videoId = await _musicService.searchYouTubeVideoId(searchQuery);

    // Provide full origin and parameters to prevent YouTube embed configuration errors
    final embedUrl = (videoId != null && videoId.isNotEmpty)
        ? 'https://www.youtube.com/embed/$videoId?autoplay=1&playsinline=1&controls=1&rel=0&enablejsapi=1&origin=https://www.youtube.com'
        : 'https://www.youtube.com/embed?listType=search&list=${Uri.encodeComponent(searchQuery)}&autoplay=1&playsinline=1&enablejsapi=1&origin=https://www.youtube.com';

    final htmlContent = '''
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; background:#000; }
    html, body { width:100%; height:100%; overflow:hidden; }
    iframe { width:100%; height:100%; border:none; }
  </style>
</head>
<body>
  <iframe 
    src="$embedUrl" 
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
    allowfullscreen>
  </iframe>
</body>
</html>
''';

    final controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.black)
      ..setUserAgent('Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36')
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (_) {
            if (mounted) setState(() => _isVideoLoading = false);
          },
        ),
      );

    // Providing baseUrl: https://www.youtube.com satisfies YouTube's origin requirement
    await controller.loadHtmlString(htmlContent, baseUrl: 'https://www.youtube.com');

    if (mounted) {
      setState(() {
        _webViewController = controller;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.isVideoMode) {
      return Container(
        height: 240,
        margin: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: Colors.black,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white12, width: 1),
          boxShadow: [
            BoxShadow(
              color: AppTheme.musicLime.withValues(alpha: 0.12),
              blurRadius: 24,
              spreadRadius: 1,
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(19),
          child: Stack(
            alignment: Alignment.center,
            children: [
              if (_webViewController != null)
                WebViewWidget(controller: _webViewController!),

              if (_isVideoLoading || _webViewController == null) ...[
                Positioned.fill(
                  child: CachedNetworkImage(
                    imageUrl: widget.song.image,
                    fit: BoxFit.cover,
                  ),
                ),
                Container(color: Colors.black.withValues(alpha: 0.65)),
                Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const SizedBox(
                      width: 32,
                      height: 32,
                      child: CircularProgressIndicator(
                        color: AppTheme.musicLime,
                        strokeWidth: 2.5,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Loading Music Video...',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.9),
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      );
    }

    return GestureDetector(
      onHorizontalDragEnd: (details) {
        if (details.primaryVelocity != null) {
          if (details.primaryVelocity! < -200) {
            widget.onSwipeLeft();
          } else if (details.primaryVelocity! > 200) {
            widget.onSwipeRight();
          }
        }
      },
      child: Center(
        child: Container(
          width: 265,
          height: 265,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: AppTheme.musicLime.withValues(alpha: 0.4), width: 3.5),
            boxShadow: [
              BoxShadow(
                color: AppTheme.musicLime.withValues(alpha: 0.28),
                blurRadius: 42,
                spreadRadius: 3,
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(3.5),
            child: ClipOval(
              child: CachedNetworkImage(
                imageUrl: widget.song.image,
                fit: BoxFit.cover,
                placeholder: (context, url) => Container(color: AppTheme.cardDark),
                errorWidget: (context, url, error) => Container(color: AppTheme.cardDark),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
