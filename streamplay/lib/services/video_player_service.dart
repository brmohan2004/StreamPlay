import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';
import '../models/video_playback_models.dart';

class SelectableSubtitleOption {
  final String id;
  final String label;
  final String language;
  final bool isOff;
  final SubtitleTrack? nativeTrack;
  final SubtitleTrackInfo? externalTrack;

  const SelectableSubtitleOption({
    required this.id,
    required this.label,
    this.language = '',
    this.isOff = false,
    this.nativeTrack,
    this.externalTrack,
  });
}

class SelectableAudioOption {
  final String id;
  final String label;
  final String language;
  final String? details;
  final AudioTrack? nativeTrack;

  const SelectableAudioOption({
    required this.id,
    required this.label,
    this.language = '',
    this.details,
    this.nativeTrack,
  });
}

class SelectableQualityOption {
  final String id;
  final String label;
  final bool isAuto;
  final VideoTrack? nativeVideoTrack;
  final VideoSourceItem? alternateSource;

  const SelectableQualityOption({
    required this.id,
    required this.label,
    this.isAuto = false,
    this.nativeVideoTrack,
    this.alternateSource,
  });
}

/// Direct native video playback engine built on media_kit (libmpv).
/// Supports authorized MP4, HLS (.m3u8), and MPEG-DASH (.mpd) streams
/// with zero WebView, zero iframe, multi-audio, external/embedded subtitles,
/// adaptive quality switching, resume seeking, and expiry/error recovery.
class VideoPlayerService extends ChangeNotifier {
  late final Player _player;
  late final VideoController _videoController;

  PlaybackSession? _activeSession;
  List<VideoSourceItem> _availableSources = const [];
  List<SubtitleTrackInfo> _externalSubtitles = const [];
  List<AudioTrackInfo> _sessionAudioTracks = const [];

  bool _isPlaying = false;
  bool _isBuffering = true;
  bool _isInitialized = false;
  bool _isCompleted = false;
  Duration _position = Duration.zero;
  Duration _duration = Duration.zero;
  Duration _buffered = Duration.zero;
  double _volume = 100.0;
  double _previousVolume = 100.0;
  double _playbackSpeed = 1.0;

  String? _errorMessage;
  bool _isExpiredError = false;
  String _selectedSubtitleId = 'off';
  String _selectedAudioId = 'auto';
  String _selectedQualityId = 'auto';

  Duration? _pendingResumePosition;
  String _subtitlePref = 'auto';
  String _preferredLanguage = 'English';
  bool _initialTracksApplied = false;

  Timer? _expiryTimer;
  final List<StreamSubscription> _subscriptions = [];
  bool _disposed = false;

  VideoPlayerService() {
    _player = Player(
      configuration: const PlayerConfiguration(
        title: 'StreamPlay',
        bufferSize: 32 * 1024 * 1024,
      ),
    );
    _videoController = VideoController(_player);
    _bindStreams();
  }

  Player get player => _player;
  VideoController get videoController => _videoController;
  PlaybackSession? get activeSession => _activeSession;
  VideoSourceItem? get activeSource => _activeSession?.source;
  List<VideoSourceItem> get availableSources => _availableSources;

  bool get isPlaying => _isPlaying;
  bool get isBuffering => _isBuffering;
  bool get isInitialized => _isInitialized;
  bool get isCompleted => _isCompleted;
  Duration get position => _position;
  Duration get duration => _duration;
  Duration get buffered => _buffered;
  double get volume => _volume;
  bool get isMuted => _volume <= 0.01;
  double get playbackSpeed => _playbackSpeed;

  String? get errorMessage => _errorMessage;
  bool get hasError => _errorMessage != null;
  bool get isExpiredError => _isExpiredError;

  String get selectedSubtitleId => _selectedSubtitleId;
  String get selectedAudioId => _selectedAudioId;
  String get selectedQualityId => _selectedQualityId;

  void _bindStreams() {
    _subscriptions.add(
      _player.stream.playing.listen((playing) {
        _isPlaying = playing;
        if (playing) {
          _isCompleted = false;
          _errorMessage = null;
        }
        _safeNotify();
      }),
    );

    _subscriptions.add(
      _player.stream.buffering.listen((buffering) {
        _isBuffering = buffering;
        _safeNotify();
      }),
    );

    _subscriptions.add(
      _player.stream.position.listen((pos) {
        _position = pos;
        _safeNotify();
      }),
    );

    _subscriptions.add(
      _player.stream.duration.listen((dur) {
        _duration = dur;
        if (dur > Duration.zero && !_isInitialized) {
          _isInitialized = true;
          _applyPendingResume();
        }
        _safeNotify();
      }),
    );

    _subscriptions.add(
      _player.stream.buffer.listen((buf) {
        _buffered = buf;
        _safeNotify();
      }),
    );

    _subscriptions.add(
      _player.stream.volume.listen((vol) {
        _volume = vol;
        _safeNotify();
      }),
    );

    _subscriptions.add(
      _player.stream.rate.listen((rate) {
        _playbackSpeed = rate;
        _safeNotify();
      }),
    );

    _subscriptions.add(
      _player.stream.tracks.listen((tracks) {
        if (!_initialTracksApplied &&
            (tracks.audio.length > 2 || tracks.subtitle.length > 2 || _externalSubtitles.isNotEmpty)) {
          _initialTracksApplied = true;
          _applyDefaultTrackPreferences();
        }
        _safeNotify();
      }),
    );

    _subscriptions.add(
      _player.stream.completed.listen((completed) {
        _isCompleted = completed;
        _safeNotify();
      }),
    );

    _subscriptions.add(
      _player.stream.error.listen((err) {
        if (err.trim().isEmpty) return;
        // Ignore benign non-fatal mpv diagnostics while actively playing
        if (_isPlaying && !_isBuffering) return;
        _errorMessage = _friendlyErrorMessage(err);
        _isBuffering = false;
        _safeNotify();
      }),
    );
  }

  Future<void> openSession({
    required PlaybackSession session,
    List<VideoSourceItem> availableSources = const [],
    Duration? resumePosition,
    String subtitlePref = 'auto',
    String preferredLanguage = 'English',
  }) async {
    _expiryTimer?.cancel();
    _errorMessage = null;
    _isExpiredError = false;
    _isCompleted = false;
    _isBuffering = true;
    _isInitialized = false;
    _initialTracksApplied = false;
    _subtitlePref = subtitlePref;
    _preferredLanguage = preferredLanguage;
    _pendingResumePosition =
        (resumePosition != null && resumePosition.inSeconds >= 3) ? resumePosition : null;

    if (!session.source.isAuthorizedAndValid || session.isExpired) {
      _activeSession = session;
      _isExpiredError = session.isExpired || session.source.isExpired;
      _errorMessage = _isExpiredError
          ? 'This playback session or stream URL has expired. Refresh to continue.'
          : 'This stream is not authorized for direct HTTPS playback.';
      _isBuffering = false;
      _safeNotify();
      return;
    }

    _activeSession = session;
    _availableSources = availableSources;
    _externalSubtitles = session.subtitles.where((s) => !s.isExternal || s.hasValidHttpsUrl).toList();
    _sessionAudioTracks = session.audioTracks;
    _selectedSubtitleId = 'off';
    _selectedAudioId = 'auto';
    _selectedQualityId = 'auto';
    _safeNotify();

    _scheduleExpiryWatchdog(session);

    try {
      await _player.open(
        Media(
          session.source.playbackUrl,
          httpHeaders: session.source.headers.isEmpty ? null : session.source.headers,
        ),
        play: true,
      );

      // Apply external subtitle preference once stream opens
      if (!_initialTracksApplied && _externalSubtitles.isNotEmpty) {
        _initialTracksApplied = true;
        await _applyDefaultTrackPreferences();
      }
    } catch (e) {
      _errorMessage = _friendlyErrorMessage(e.toString());
      _isBuffering = false;
      _safeNotify();
    }
  }

  void updateSessionTracks({
    List<SubtitleTrackInfo>? subtitles,
    List<AudioTrackInfo>? audioTracks,
  }) {
    if (subtitles != null) {
      _externalSubtitles = subtitles.where((s) => !s.isExternal || s.hasValidHttpsUrl).toList();
    }
    if (audioTracks != null) {
      _sessionAudioTracks = audioTracks;
    }
    if (_activeSession != null) {
      _activeSession = _activeSession!.copyWith(
        subtitles: _externalSubtitles,
        audioTracks: _sessionAudioTracks,
      );
    }
    if (!_initialTracksApplied && _externalSubtitles.isNotEmpty) {
      _initialTracksApplied = true;
      _applyDefaultTrackPreferences();
    }
    _safeNotify();
  }

  Future<void> _applyPendingResume() async {
    final target = _pendingResumePosition;
    if (target == null) return;
    _pendingResumePosition = null;
    if (_duration > Duration.zero && target < _duration - const Duration(seconds: 5)) {
      await seek(target);
    }
  }

  Future<void> _applyDefaultTrackPreferences() async {
    // 1. Subtitles preference
    if (_subtitlePref == 'off') {
      await selectSubtitleOption(
        const SelectableSubtitleOption(id: 'off', label: 'Off', isOff: true),
      );
    } else if (_subtitlePref == 'always' || _subtitlePref == 'auto') {
      final options = subtitleOptions.where((o) => !o.isOff).toList();
      if (options.isNotEmpty) {
        final langLower = _preferredLanguage.toLowerCase();
        final match = options.firstWhere(
          (o) =>
              o.label.toLowerCase().contains(langLower) ||
              o.language.toLowerCase().startsWith(langLower.substring(0, langLower.length >= 2 ? 2 : langLower.length)),
          orElse: () => options.firstWhere(
            (o) => o.externalTrack?.isDefault == true,
            orElse: () => options.first,
          ),
        );
        if (_subtitlePref == 'always' || match.externalTrack?.isDefault == true) {
          await selectSubtitleOption(match);
        }
      }
    }

    // 2. Audio language preference (embedded tracks)
    final audios = audioOptions;
    if (audios.length > 1) {
      final langLower = _preferredLanguage.toLowerCase();
      final prefix = langLower.length >= 2 ? langLower.substring(0, 2) : langLower;
      for (final opt in audios) {
        if (opt.nativeTrack != null &&
            (opt.label.toLowerCase().contains(langLower) ||
                opt.language.toLowerCase().startsWith(prefix))) {
          await selectAudioOption(opt);
          break;
        }
      }
    }
  }

  void _scheduleExpiryWatchdog(PlaybackSession session) {
    _expiryTimer?.cancel();
    final remaining = session.effectiveExpiry.difference(DateTime.now().toUtc());
    if (remaining <= Duration.zero) {
      _handleExpired();
      return;
    }
    _expiryTimer = Timer(remaining, _handleExpired);
  }

  void _handleExpired() {
    if (_disposed) return;
    _player.pause();
    _isExpiredError = true;
    _errorMessage = 'Authorized playback URL expired. Tap Refresh Session to resume seamlessly.';
    _safeNotify();
  }

  Future<void> play() async {
    if (_isExpiredError) return;
    if (_isCompleted) {
      await _player.seek(Duration.zero);
    }
    await _player.play();
  }

  Future<void> pause() async {
    await _player.pause();
  }

  Future<void> togglePlay() async {
    if (_isExpiredError) return;
    if (_isCompleted) {
      await _player.seek(Duration.zero);
      await _player.play();
    } else {
      await _player.playOrPause();
    }
  }

  Future<void> seek(Duration target) async {
    final maxDur = _duration > Duration.zero ? _duration : target;
    final clampedMs = target.inMilliseconds.clamp(0, maxDur.inMilliseconds);
    await _player.seek(Duration(milliseconds: clampedMs));
  }

  Future<void> seekRelative(Duration delta) async {
    await seek(_position + delta);
  }

  Future<void> setVolume(double value) async {
    final clamped = value.clamp(0.0, 100.0);
    if (clamped > 0.01) {
      _previousVolume = clamped;
    }
    await _player.setVolume(clamped);
  }

  Future<void> toggleMute() async {
    if (isMuted) {
      await setVolume(_previousVolume > 5 ? _previousVolume : 80.0);
    } else {
      _previousVolume = _volume > 5 ? _volume : 80.0;
      await _player.setVolume(0.0);
    }
  }

  Future<void> setPlaybackSpeed(double speed) async {
    final clamped = speed.clamp(0.25, 3.0);
    await _player.setRate(clamped);
  }

  Future<void> retryCurrentStream() async {
    final session = _activeSession;
    if (session == null) return;
    final resumeAt = _position;
    await openSession(
      session: session,
      availableSources: _availableSources,
      resumePosition: resumeAt,
      subtitlePref: _subtitlePref,
      preferredLanguage: _preferredLanguage,
    );
  }

  List<SelectableSubtitleOption> get subtitleOptions {
    final list = <SelectableSubtitleOption>[
      const SelectableSubtitleOption(id: 'off', label: 'Off', isOff: true),
    ];

    // 1. Embedded subtitles detected by libmpv (HLS/DASH/MKV/MP4)
    for (final track in _player.state.tracks.subtitle) {
      if (track.id == 'auto' || track.id == 'no') continue;
      // Avoid duplicating external URI tracks we already loaded
      if (track.uri) continue;
      final label = _formatTrackLabel(track.title, track.language, 'Embedded Track ${track.id}');
      list.add(
        SelectableSubtitleOption(
          id: 'native:${track.id}',
          label: label,
          language: track.language ?? '',
          nativeTrack: track,
        ),
      );
    }

    // 2. Authorized external WebVTT/SRT subtitles from PlaybackSession
    for (final ext in _externalSubtitles) {
      if (ext.isExternal && !ext.hasValidHttpsUrl) continue;
      list.add(
        SelectableSubtitleOption(
          id: 'ext:${ext.id}',
          label: '${ext.label} (${ext.format.toUpperCase()})',
          language: ext.language,
          externalTrack: ext,
        ),
      );
    }

    return list;
  }

  Future<void> selectSubtitleOption(SelectableSubtitleOption option) async {
    try {
      if (option.isOff) {
        await _player.setSubtitleTrack(SubtitleTrack.no());
      } else if (option.nativeTrack != null) {
        await _player.setSubtitleTrack(option.nativeTrack!);
      } else if (option.externalTrack != null && option.externalTrack!.hasValidHttpsUrl) {
        await _player.setSubtitleTrack(
          SubtitleTrack.uri(
            option.externalTrack!.url!,
            title: option.externalTrack!.label,
            language: option.externalTrack!.language,
          ),
        );
      }
      _selectedSubtitleId = option.id;
      _safeNotify();
    } catch (_) {}
  }

  List<SelectableAudioOption> get audioOptions {
    final list = <SelectableAudioOption>[];
    final nativeTracks = _player.state.tracks.audio
        .where((t) => t.id != 'auto' && t.id != 'no')
        .toList();

    for (var i = 0; i < nativeTracks.length; i++) {
      final track = nativeTracks[i];
      final meta = i < _sessionAudioTracks.length ? _sessionAudioTracks[i] : null;
      final label = _formatTrackLabel(
        track.title ?? meta?.label,
        track.language ?? meta?.language,
        'Audio Track ${i + 1}',
      );
      final detailsParts = <String>[];
      if (track.channelscount != null && track.channelscount! > 0) {
        detailsParts.add(track.channelscount == 6 ? '5.1' : '${track.channelscount}ch');
      } else if (meta?.channels != null) {
        detailsParts.add(meta!.channels!);
      }
      if (track.codec != null && track.codec!.isNotEmpty) {
        detailsParts.add(track.codec!.toUpperCase());
      } else if (meta?.codec != null) {
        detailsParts.add(meta!.codec!);
      }

      list.add(
        SelectableAudioOption(
          id: 'native:${track.id}',
          label: label,
          language: track.language ?? meta?.language ?? '',
          details: detailsParts.isEmpty ? null : detailsParts.join(' • '),
          nativeTrack: track,
        ),
      );
    }

    // Fallback metadata-only audio listing if manifest hasn't exposed separate tracks yet
    if (list.isEmpty) {
      for (final meta in _sessionAudioTracks) {
        list.add(
          SelectableAudioOption(
            id: 'meta:${meta.id}',
            label: meta.label,
            language: meta.language,
            details: meta.channels,
          ),
        );
      }
    }

    return list;
  }

  Future<void> selectAudioOption(SelectableAudioOption option) async {
    try {
      if (option.nativeTrack != null) {
        await _player.setAudioTrack(option.nativeTrack!);
      }
      _selectedAudioId = option.id;
      _safeNotify();
    } catch (_) {}
  }

  List<SelectableQualityOption> get qualityOptions {
    final list = <SelectableQualityOption>[
      const SelectableQualityOption(
        id: 'auto',
        label: 'Auto (Adaptive)',
        isAuto: true,
      ),
    ];

    // 1. Adaptive HLS / MPEG-DASH renditions exposed by libmpv
    final nativeVideos = _player.state.tracks.video
        .where((v) => v.id != 'auto' && v.id != 'no' && (v.h ?? 0) > 0)
        .toList()
      ..sort((a, b) => (b.h ?? 0).compareTo(a.h ?? 0));

    final seenHeights = <int>{};
    for (final v in nativeVideos) {
      final h = v.h!;
      if (seenHeights.contains(h)) continue;
      seenHeights.add(h);
      final bitrateLabel = (v.bitrate != null && v.bitrate! > 0)
          ? ' (${(v.bitrate! / 1000000).toStringAsFixed(1)} Mbps)'
          : '';
      list.add(
        SelectableQualityOption(
          id: 'track:${v.id}',
          label: '${h}p$bitrateLabel',
          nativeVideoTrack: v,
        ),
      );
    }

    // 2. Alternate authorized sources (e.g., switch MP4 / HLS / DASH or resolution)
    for (final src in _availableSources) {
      if (src.sourceId == activeSource?.sourceId) continue;
      list.add(
        SelectableQualityOption(
          id: 'source:${src.sourceId}',
          label: '${src.quality} • ${src.format.displayLabel} (${src.providerName})',
          alternateSource: src,
        ),
      );
    }

    return list;
  }

  Future<void> selectAdaptiveQuality(SelectableQualityOption option) async {
    try {
      if (option.isAuto) {
        await _player.setVideoTrack(VideoTrack.auto());
        _selectedQualityId = 'auto';
        _safeNotify();
      } else if (option.nativeVideoTrack != null) {
        await _player.setVideoTrack(option.nativeVideoTrack!);
        _selectedQualityId = option.id;
        _safeNotify();
      }
    } catch (_) {}
  }

  String _formatTrackLabel(String? title, String? language, String fallback) {
    final cleanTitle = title?.trim() ?? '';
    final cleanLang = language?.trim() ?? '';
    if (cleanTitle.isNotEmpty && cleanLang.isNotEmpty && !cleanTitle.toLowerCase().contains(cleanLang.toLowerCase())) {
      return '$cleanTitle ($cleanLang)';
    }
    if (cleanTitle.isNotEmpty) return cleanTitle;
    if (cleanLang.isNotEmpty) return cleanLang.toUpperCase();
    return fallback;
  }

  String _friendlyErrorMessage(String raw) {
    final lower = raw.toLowerCase();
    if (lower.contains('403') || lower.contains('401') || lower.contains('forbidden')) {
      return 'Stream authorization failed or token expired. Try refreshing the session.';
    }
    if (lower.contains('404') || lower.contains('not found')) {
      return 'Video stream was not found on the provider server.';
    }
    if (lower.contains('timeout') || lower.contains('network') || lower.contains('failed to open')) {
      return 'Network interruption while loading video stream. Check your connection and retry.';
    }
    return 'Unable to play this stream right now. Try retrying or switching sources.';
  }

  void _safeNotify() {
    if (!_disposed) {
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _disposed = true;
    _expiryTimer?.cancel();
    for (final sub in _subscriptions) {
      sub.cancel();
    }
    _player.dispose();
    super.dispose();
  }
}
