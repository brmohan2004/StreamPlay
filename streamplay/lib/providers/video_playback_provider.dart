import 'package:flutter/material.dart';
import '../models/media_item.dart';
import '../models/video_playback_models.dart';
import '../services/storage_service.dart';
import '../services/video_source_service.dart';

class VideoPlaybackProvider with ChangeNotifier {
  final StorageService _storage;
  final VideoSourceService _sourceService;

  bool _isResolvingSources = false;
  bool _isCreatingSession = false;
  String? _resolutionError;
  List<VideoSourceItem> _resolvedSources = const [];
  String? _resolvedContentId;
  List<ProviderInfo> _providers = const [];
  List<WatchProgress> _recentWatchProgress = const [];

  VideoPlaybackProvider(this._storage, this._sourceService) {
    _recentWatchProgress = _storage.getRecentWatchProgress();
  }

  bool get isResolvingSources => _isResolvingSources;
  bool get isCreatingSession => _isCreatingSession;
  String? get resolutionError => _resolutionError;
  List<VideoSourceItem> get resolvedSources => _resolvedSources;
  String? get resolvedContentId => _resolvedContentId;
  List<ProviderInfo> get providers => _providers;
  List<WatchProgress> get recentWatchProgress => _recentWatchProgress;

  String get preferredVideoProvider => _storage.getPreferredVideoProvider();

  Future<void> setPreferredVideoProvider(String providerId) async {
    await _storage.setPreferredVideoProvider(providerId);
    _sourceService.clearCache();
    notifyListeners();
  }

  Future<void> loadProviders() async {
    try {
      _providers = await _sourceService.fetchProviders();
      notifyListeners();
    } catch (_) {
      // Keep previous provider list when backend is temporarily unreachable
    }
  }

  Future<SourceResolutionResult> resolveSources({
    required MovieItem movie,
    EpisodeItem? episode,
    bool forceRefresh = false,
  }) async {
    _isResolvingSources = true;
    _resolutionError = null;
    notifyListeners();

    try {
      final preferredQuality = _storage.getVideoQuality();
      final preferredLanguage = _storage.getPrimaryLanguage();
      final preferredProvider = _storage.getPreferredVideoProvider();

      final SourceResolutionResult result;
      if (movie.type == 'series') {
        result = await _sourceService.fetchSeriesSources(
          seriesId: movie.id,
          season: episode?.season ?? 1,
          episode: episode?.number ?? 1,
          title: movie.name,
          year: movie.releaseInfo ?? movie.released,
          preferredQuality: preferredQuality,
          preferredLanguage: preferredLanguage,
          preferredProvider: preferredProvider,
          forceRefresh: forceRefresh,
        );
      } else {
        result = await _sourceService.fetchMovieSources(
          movieId: movie.id,
          title: movie.name,
          year: movie.releaseInfo ?? movie.released,
          preferredQuality: preferredQuality,
          preferredLanguage: preferredLanguage,
          preferredProvider: preferredProvider,
          forceRefresh: forceRefresh,
        );
      }

      _resolvedSources = result.sources;
      _resolvedContentId = movie.id;
      _isResolvingSources = false;
      notifyListeners();
      return result;
    } on VideoSourceException catch (e) {
      _resolvedSources = const [];
      _resolutionError = e.message;
      _isResolvingSources = false;
      notifyListeners();
      rethrow;
    } catch (e) {
      _resolvedSources = const [];
      _resolutionError = 'Failed to check authorized video sources.';
      _isResolvingSources = false;
      notifyListeners();
      throw VideoSourceException(
        code: 'UNKNOWN_ERROR',
        message: _resolutionError!,
      );
    }
  }

  Future<PlaybackSession> createPlaybackSession({
    required VideoSourceItem source,
    required MovieItem movie,
  }) async {
    _isCreatingSession = true;
    notifyListeners();

    try {
      var session = await _sourceService.createPlaybackSession(
        source: source,
        title: movie.name,
        year: movie.releaseInfo ?? movie.released,
      );

      // Hydrate session subtitles & audio tracks via dedicated authorized endpoints
      try {
        final trackResults = await Future.wait([
          _sourceService.fetchSessionSubtitles(
            sessionId: session.sessionId,
            token: session.token,
          ),
          _sourceService.fetchSessionAudioTracks(
            sessionId: session.sessionId,
            token: session.token,
          ),
        ]);

        final fetchedSubs = trackResults[0] as List<SubtitleTrackInfo>;
        final fetchedAudio = trackResults[1] as List<AudioTrackInfo>;
        session = session.copyWith(
          subtitles: fetchedSubs.isNotEmpty ? fetchedSubs : session.subtitles,
          audioTracks: fetchedAudio.isNotEmpty ? fetchedAudio : session.audioTracks,
        );
      } catch (_) {
        // Fallback to inline tracks returned on session creation
      }

      _isCreatingSession = false;
      notifyListeners();
      return session;
    } catch (_) {
      _isCreatingSession = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<PlaybackSession> refreshExpiredSession({
    required MovieItem movie,
    required VideoSourceItem previousSource,
    EpisodeItem? episode,
  }) async {
    final resolved = await resolveSources(
      movie: movie,
      episode: episode,
      forceRefresh: true,
    );

    if (resolved.sources.isEmpty) {
      throw const VideoSourceException(
        code: 'UNAVAILABLE',
        message: 'Currently unavailable for streaming.',
      );
    }

    final matching = resolved.sources.firstWhere(
      (s) =>
          s.providerId == previousSource.providerId &&
          s.format == previousSource.format &&
          s.quality == previousSource.quality,
      orElse: () => resolved.sources.first,
    );

    return createPlaybackSession(source: matching, movie: movie);
  }

  // Watch Progress & Resume Persistence
  WatchProgress? getWatchProgress(String contentId, {int? season, int? episode}) {
    return _storage.getWatchProgress(contentId, season: season, episode: episode);
  }

  Future<void> saveWatchProgress({
    required MovieItem movie,
    EpisodeItem? episode,
    required Duration position,
    required Duration duration,
  }) async {
    if (duration.inSeconds <= 0) return;

    final progress = WatchProgress(
      contentId: movie.id,
      mediaType: movie.type,
      title: movie.name,
      poster: movie.poster,
      background: movie.background,
      season: episode?.season,
      episode: episode?.number,
      episodeTitle: episode?.name,
      positionSeconds: position.inSeconds,
      durationSeconds: duration.inSeconds,
      updatedAt: DateTime.now().toUtc(),
    );

    await _storage.saveWatchProgress(progress);
    _recentWatchProgress = _storage.getRecentWatchProgress();
    notifyListeners();
  }

  Future<void> removeWatchProgress(String contentId, {int? season, int? episode}) async {
    await _storage.removeWatchProgress(contentId, season: season, episode: episode);
    _recentWatchProgress = _storage.getRecentWatchProgress();
    notifyListeners();
  }
}
