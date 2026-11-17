import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:media_kit_video/media_kit_video.dart';
import 'package:provider/provider.dart';
import '../../../config/app_theme.dart';
import '../../../models/media_item.dart';
import '../../../models/video_playback_models.dart';
import '../../../providers/media_provider.dart';
import '../../../providers/video_playback_provider.dart';
import '../../../services/video_player_service.dart';
import 'components/player_controls_overlay.dart';
import 'components/player_error_overlay.dart';
import 'components/track_selector_sheets.dart';

class VideoPlayerScreen extends StatefulWidget {
  final MovieItem movie;
  final EpisodeItem? episode;
  final PlaybackSession initialSession;
  final List<VideoSourceItem> availableSources;
  final Duration? resumePosition;

  const VideoPlayerScreen({
    super.key,
    required this.movie,
    this.episode,
    required this.initialSession,
    required this.availableSources,
    this.resumePosition,
  });

  @override
  State<VideoPlayerScreen> createState() => _VideoPlayerScreenState();
}

class _VideoPlayerScreenState extends State<VideoPlayerScreen> with WidgetsBindingObserver {
  late final VideoPlayerService _playerService;
  late PlaybackSession _currentSession;
  late List<VideoSourceItem> _availableSources;
  EpisodeItem? _activeEpisode;

  bool _controlsVisible = true;
  bool _isFullscreen = true;
  bool _isRecovering = false;
  bool _nextEpisodeTriggered = false;

  Timer? _hideControlsTimer;
  Timer? _progressSaveTimer;
  final FocusNode _keyboardFocusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _currentSession = widget.initialSession;
    _availableSources = List<VideoSourceItem>.from(widget.availableSources);
    _activeEpisode = widget.episode;
    _playerService = VideoPlayerService();
    _playerService.addListener(_onPlayerUpdate);

    _enterFullscreenMode();
    _pauseActiveMusicIfPlaying();
    _initializePlayback();
  }

  void _pauseActiveMusicIfPlaying() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final media = context.read<MediaProvider>();
      if (media.isPlayingSong) {
        media.pauseSong();
      }
    });
  }

  Future<void> _initializePlayback() async {
    final media = context.read<MediaProvider>();
    await _playerService.openSession(
      session: _currentSession,
      availableSources: _availableSources,
      resumePosition: widget.resumePosition,
      subtitlePref: media.subtitlePref,
      preferredLanguage: media.primaryLanguage,
    );

    _resetHideTimer();
    _progressSaveTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      _persistWatchProgress();
    });
  }

  void _onPlayerUpdate() {
    if (!mounted) return;
    setState(() {});

    // Auto-play next episode when series episode finishes
    if (_playerService.isCompleted && !_nextEpisodeTriggered) {
      _persistWatchProgress();
      final nextEp = _findNextEpisode();
      final autoPlay = context.read<MediaProvider>().autoPlayEpisode;
      if (nextEp != null && autoPlay) {
        _nextEpisodeTriggered = true;
        _playNextEpisode(nextEp);
      }
    }
  }

  EpisodeItem? _findNextEpisode() {
    final currentEp = _activeEpisode;
    final allEpisodes = widget.movie.videos;
    if (currentEp == null || allEpisodes == null || allEpisodes.isEmpty) return null;

    final sorted = List<EpisodeItem>.from(allEpisodes)
      ..sort((a, b) {
        final s = a.season.compareTo(b.season);
        return s != 0 ? s : a.number.compareTo(b.number);
      });

    final idx = sorted.indexWhere((e) => e.season == currentEp.season && e.number == currentEp.number);
    if (idx >= 0 && idx + 1 < sorted.length) {
      return sorted[idx + 1];
    }
    return null;
  }

  Future<void> _playNextEpisode(EpisodeItem nextEp) async {
    final playback = context.read<VideoPlaybackProvider>();
    final media = context.read<MediaProvider>();
    try {
      final result = await playback.resolveSources(movie: widget.movie, episode: nextEp);
      if (!mounted || result.sources.isEmpty) return;

      final nextSession = await playback.createPlaybackSession(
        source: result.sources.first,
        movie: widget.movie,
      );
      if (!mounted) return;

      setState(() {
        _activeEpisode = nextEp;
        _currentSession = nextSession;
        _availableSources = result.sources;
        _nextEpisodeTriggered = false;
      });

      await _playerService.openSession(
        session: nextSession,
        availableSources: result.sources,
        subtitlePref: media.subtitlePref,
        preferredLanguage: media.primaryLanguage,
      );
    } catch (_) {
      // If next episode isn't available, stay cleanly on completed screen
    }
  }

  Future<void> _persistWatchProgress() async {
    if (!mounted) return;
    final pos = _playerService.position;
    final dur = _playerService.duration;
    if (dur.inSeconds < 5 || pos.inSeconds < 2) return;

    await context.read<VideoPlaybackProvider>().saveWatchProgress(
          movie: widget.movie,
          episode: _activeEpisode,
          position: pos,
          duration: dur,
        );
  }

  void _enterFullscreenMode() {
    if (kIsWeb) return;
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    if (defaultTargetPlatform == TargetPlatform.android ||
        defaultTargetPlatform == TargetPlatform.iOS) {
      SystemChrome.setPreferredOrientations([
        DeviceOrientation.landscapeLeft,
        DeviceOrientation.landscapeRight,
      ]);
    }
  }

  void _exitFullscreenMode() {
    if (kIsWeb) return;
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    if (defaultTargetPlatform == TargetPlatform.android ||
        defaultTargetPlatform == TargetPlatform.iOS) {
      SystemChrome.setPreferredOrientations([
        DeviceOrientation.portraitUp,
        DeviceOrientation.landscapeLeft,
        DeviceOrientation.landscapeRight,
      ]);
    }
  }

  void _toggleFullscreen() {
    setState(() {
      _isFullscreen = !_isFullscreen;
    });
    if (_isFullscreen) {
      _enterFullscreenMode();
    } else {
      _exitFullscreenMode();
    }
  }

  void _resetHideTimer() {
    _hideControlsTimer?.cancel();
    if (!_controlsVisible) {
      setState(() => _controlsVisible = true);
    }
    _hideControlsTimer = Timer(const Duration(seconds: 4), () {
      if (mounted && _playerService.isPlaying && !_playerService.hasError) {
        setState(() => _controlsVisible = false);
      }
    });
  }

  void _toggleControlsVisibility() {
    if (_controlsVisible) {
      _hideControlsTimer?.cancel();
      setState(() => _controlsVisible = false);
    } else {
      _resetHideTimer();
    }
  }

  Future<void> _switchToAlternateSource(VideoSourceItem targetSource) async {
    final playback = context.read<VideoPlaybackProvider>();
    final media = context.read<MediaProvider>();
    final resumeAt = _playerService.position;

    setState(() => _isRecovering = true);
    try {
      final newSession = await playback.createPlaybackSession(
        source: targetSource,
        movie: widget.movie,
      );
      if (!mounted) return;
      _currentSession = newSession;
      await _playerService.openSession(
        session: newSession,
        availableSources: _availableSources,
        resumePosition: resumeAt,
        subtitlePref: media.subtitlePref,
        preferredLanguage: media.primaryLanguage,
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not switch source: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isRecovering = false);
    }
  }

  Future<void> _refreshExpiredSession() async {
    final playback = context.read<VideoPlaybackProvider>();
    final media = context.read<MediaProvider>();
    final resumeAt = _playerService.position;

    setState(() => _isRecovering = true);
    try {
      final refreshed = await playback.refreshExpiredSession(
        movie: widget.movie,
        previousSource: _currentSession.source,
        episode: _activeEpisode,
      );
      if (!mounted) return;
      _currentSession = refreshed;
      _availableSources = playback.resolvedSources;
      await _playerService.openSession(
        session: refreshed,
        availableSources: _availableSources,
        resumePosition: resumeAt,
        subtitlePref: media.subtitlePref,
        preferredLanguage: media.primaryLanguage,
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Session refresh failed: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isRecovering = false);
    }
  }

  Future<void> _openQualityMenu() async {
    final src = _currentSession.source;
    await showQualitySelectorSheet(
      context: context,
      options: _playerService.qualityOptions,
      selectedId: _playerService.selectedQualityId,
      activeSummary: '${src.quality} • ${src.format.displayLabel} (${src.providerName})',
      onSelected: (opt) {
        if (opt.alternateSource != null) {
          _switchToAlternateSource(opt.alternateSource!);
        } else {
          _playerService.selectAdaptiveQuality(opt);
        }
      },
    );
  }

  void _handleKeyEvent(KeyEvent event) {
    if (event is! KeyDownEvent) return;
    final key = event.logicalKey;
    if (key == LogicalKeyboardKey.space) {
      _resetHideTimer();
      _playerService.togglePlay();
    } else if (key == LogicalKeyboardKey.arrowRight) {
      _resetHideTimer();
      _playerService.seekRelative(const Duration(seconds: 10));
    } else if (key == LogicalKeyboardKey.arrowLeft) {
      _resetHideTimer();
      _playerService.seekRelative(const Duration(seconds: -10));
    } else if (key == LogicalKeyboardKey.arrowUp) {
      _resetHideTimer();
      _playerService.setVolume(_playerService.volume + 10);
    } else if (key == LogicalKeyboardKey.arrowDown) {
      _resetHideTimer();
      _playerService.setVolume(_playerService.volume - 10);
    } else if (key == LogicalKeyboardKey.keyM) {
      _resetHideTimer();
      _playerService.toggleMute();
    } else if (key == LogicalKeyboardKey.keyF) {
      _resetHideTimer();
      _toggleFullscreen();
    } else if (key == LogicalKeyboardKey.escape) {
      _exitPlayer();
    }
  }

  Future<void> _exitPlayer() async {
    await _persistWatchProgress();
    if (mounted) {
      Navigator.of(context).pop();
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused || state == AppLifecycleState.inactive) {
      _persistWatchProgress();
      _playerService.pause();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _hideControlsTimer?.cancel();
    _progressSaveTimer?.cancel();
    _keyboardFocusNode.dispose();
    _playerService.removeListener(_onPlayerUpdate);
    _playerService.dispose();
    _exitFullscreenMode();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final subtitleLabel = _activeEpisode != null
        ? 'S${_activeEpisode!.season} • E${_activeEpisode!.number} — ${_activeEpisode!.name}'
        : _currentSession.source.providerName;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) {
          _exitPlayer();
        }
      },
      child: KeyboardListener(
        focusNode: _keyboardFocusNode,
        autofocus: true,
        onKeyEvent: _handleKeyEvent,
        child: Scaffold(
          backgroundColor: AppTheme.pureBlack,
          body: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: _toggleControlsVisibility,
            onDoubleTapDown: (details) {
              final width = MediaQuery.of(context).size.width;
              final isLeft = details.localPosition.dx < width / 2;
              _resetHideTimer();
              _playerService.seekRelative(
                Duration(seconds: isLeft ? -10 : 10),
              );
            },
            child: Stack(
              fit: StackFit.expand,
              children: [
                // 1. Direct Native Hardware-Accelerated Video Surface (Zero WebView / Zero iframe)
                Center(
                  child: Video(
                    controller: _playerService.videoController,
                    controls: NoVideoControls,
                    fill: AppTheme.pureBlack,
                    subtitleViewConfiguration: const SubtitleViewConfiguration(
                      style: TextStyle(
                        height: 1.4,
                        fontSize: 20,
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                        backgroundColor: Color(0xAA000000),
                      ),
                      textAlign: TextAlign.center,
                      padding: EdgeInsets.fromLTRB(24, 0, 24, 36),
                    ),
                  ),
                ),

                // 2. Buffering Indicator Overlay
                if (_playerService.isBuffering && !_playerService.hasError)
                  PlayerBufferingOverlay(
                    subtitle: _playerService.isInitialized
                        ? 'Buffering...'
                        : 'Connecting to ${_currentSession.source.providerName}...',
                  ),

                // 3. StreamPlay Custom Playback Controls
                if (!_playerService.hasError)
                  PlayerControlsOverlay(
                    service: _playerService,
                    title: widget.movie.name,
                    subtitleText: subtitleLabel,
                    visible: _controlsVisible,
                    isFullscreen: _isFullscreen,
                    onInteraction: _resetHideTimer,
                    onBack: _exitPlayer,
                    onToggleFullscreen: _toggleFullscreen,
                    onOpenSubtitles: () => showSubtitleSelectorSheet(
                      context: context,
                      options: _playerService.subtitleOptions,
                      selectedId: _playerService.selectedSubtitleId,
                      onSelected: (opt) => _playerService.selectSubtitleOption(opt),
                    ),
                    onOpenAudio: () => showAudioSelectorSheet(
                      context: context,
                      options: _playerService.audioOptions,
                      selectedId: _playerService.selectedAudioId,
                      onSelected: (opt) => _playerService.selectAudioOption(opt),
                    ),
                    onOpenQuality: _openQualityMenu,
                    onOpenSpeed: () => showPlaybackSpeedSheet(
                      context: context,
                      currentSpeed: _playerService.playbackSpeed,
                      onSelected: (speed) => _playerService.setPlaybackSpeed(speed),
                    ),
                  ),

                // 4. Error & Expiration Recovery Overlay
                if (_playerService.hasError)
                  PlayerErrorOverlay(
                    message: _playerService.errorMessage!,
                    isExpired: _playerService.isExpiredError,
                    hasAlternateSources: _availableSources.length > 1,
                    isRecovering: _isRecovering,
                    onRetry: () => _playerService.retryCurrentStream(),
                    onRefreshSession: _refreshExpiredSession,
                    onSwitchSource: _availableSources.length > 1 ? _openQualityMenu : null,
                    onClose: _exitPlayer,
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
