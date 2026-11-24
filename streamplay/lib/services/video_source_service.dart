import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../config/constants.dart';
import '../models/video_playback_models.dart';

class VideoSourceException implements Exception {
  final String code;
  final String message;
  final int? statusCode;

  const VideoSourceException({
    required this.code,
    required this.message,
    this.statusCode,
  });

  bool get isExpired =>
      statusCode == 410 || code == 'SESSION_EXPIRED' || code == 'SOURCE_EXPIRED';

  bool get isUnauthorized =>
      statusCode == 401 || statusCode == 403 || code == 'UNAUTHORIZED' || code == 'SOURCE_UNAUTHORIZED';

  bool get isNetworkError => code == 'NETWORK_ERROR' || code == 'TIMEOUT';

  @override
  String toString() => 'VideoSourceException($code, status=$statusCode): $message';
}

class SourceResolutionResult {
  final String contentId;
  final String mediaType;
  final List<VideoSourceItem> sources;
  final String? message;
  final bool fromCache;

  const SourceResolutionResult({
    required this.contentId,
    required this.mediaType,
    required this.sources,
    this.message,
    this.fromCache = false,
  });

  bool get isAvailable => sources.isNotEmpty;
}

class _CachedResolution {
  final SourceResolutionResult result;
  final DateTime expiresAt;

  _CachedResolution(this.result, this.expiresAt);
}

class VideoSourceService {
  final String baseUrl;
  final http.Client _client;
  final Duration timeout;
  final Duration cacheTtl;

  final Map<String, _CachedResolution> _cache = {};

  VideoSourceService({
    String? baseUrl,
    http.Client? client,
    Duration? timeout,
    Duration? cacheTtl,
  })  : baseUrl = (baseUrl ?? AppConstants.playbackApiBaseUrl).replaceAll(RegExp(r'/+$'), ''),
        _client = client ?? http.Client(),
        timeout = timeout ?? AppConstants.playbackApiTimeout,
        cacheTtl = cacheTtl ?? AppConstants.playbackSourceCacheTtl;

  void clearCache() => _cache.clear();

  Future<List<ProviderInfo>> fetchProviders() async {
    final uri = Uri.parse('$baseUrl/api/providers');
    final data = await _getJson(uri);
    final raw = data['providers'];
    if (raw is! List) return const [];
    return raw
        .whereType<Map>()
        .map((e) => ProviderInfo.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<SourceResolutionResult> fetchMovieSources({
    required String movieId,
    String? title,
    String? year,
    String? preferredQuality,
    String? preferredLanguage,
    String? preferredProvider,
    bool forceRefresh = false,
  }) async {
    final cleanId = movieId.trim();
    if (cleanId.isEmpty) {
      throw const VideoSourceException(
        code: 'INVALID_CONTENT_ID',
        message: 'Movie ID is required.',
      );
    }

    final queryParams = <String, String>{};
    if (title != null && title.trim().isNotEmpty) queryParams['title'] = title.trim();
    final parsedYear = _extractYear(year);
    if (parsedYear != null) queryParams['year'] = parsedYear;
    if (preferredQuality != null && preferredQuality.isNotEmpty) {
      queryParams['quality'] = preferredQuality;
    }
    if (preferredLanguage != null && preferredLanguage.isNotEmpty) {
      queryParams['language'] = preferredLanguage;
    }
    if (preferredProvider != null && preferredProvider.isNotEmpty && preferredProvider != 'auto') {
      queryParams['provider'] = preferredProvider;
    }

    final uri = Uri.parse('$baseUrl/api/movies/${Uri.encodeComponent(cleanId)}/sources')
        .replace(queryParameters: queryParams.isEmpty ? null : queryParams);

    return _fetchAndCacheSources(
      cacheKey: uri.toString(),
      uri: uri,
      contentId: cleanId,
      mediaType: 'movie',
      forceRefresh: forceRefresh,
    );
  }

  Future<SourceResolutionResult> fetchSeriesSources({
    required String seriesId,
    required int season,
    required int episode,
    String? title,
    String? year,
    String? preferredQuality,
    String? preferredLanguage,
    String? preferredProvider,
    bool forceRefresh = false,
  }) async {
    final cleanId = seriesId.trim();
    if (cleanId.isEmpty) {
      throw const VideoSourceException(
        code: 'INVALID_CONTENT_ID',
        message: 'Series ID is required.',
      );
    }

    final queryParams = <String, String>{
      'season': season.toString(),
      'episode': episode.toString(),
    };
    if (title != null && title.trim().isNotEmpty) queryParams['title'] = title.trim();
    final parsedYear = _extractYear(year);
    if (parsedYear != null) queryParams['year'] = parsedYear;
    if (preferredQuality != null && preferredQuality.isNotEmpty) {
      queryParams['quality'] = preferredQuality;
    }
    if (preferredLanguage != null && preferredLanguage.isNotEmpty) {
      queryParams['language'] = preferredLanguage;
    }
    if (preferredProvider != null && preferredProvider.isNotEmpty && preferredProvider != 'auto') {
      queryParams['provider'] = preferredProvider;
    }

    final uri = Uri.parse('$baseUrl/api/series/${Uri.encodeComponent(cleanId)}/sources')
        .replace(queryParameters: queryParams);

    return _fetchAndCacheSources(
      cacheKey: uri.toString(),
      uri: uri,
      contentId: cleanId,
      mediaType: 'series',
      forceRefresh: forceRefresh,
    );
  }

  Future<PlaybackSession> createPlaybackSession({
    required VideoSourceItem source,
    String? title,
    String? year,
  }) async {
    if (!source.isAuthorizedAndValid) {
      throw VideoSourceException(
        code: source.isExpired ? 'SOURCE_EXPIRED' : 'SOURCE_UNAUTHORIZED',
        message: source.isExpired
            ? 'Selected video source has expired.'
            : 'Selected video source is not authorized for direct HTTPS playback.',
      );
    }

    final uri = Uri.parse('$baseUrl/api/playback/session');
    final body = <String, dynamic>{
      'sourceId': source.sourceId,
      'contentId': source.contentId,
      'mediaType': source.mediaType,
      if (title != null && title.trim().isNotEmpty) 'title': title.trim(),
      if (_extractYear(year) != null) 'year': _extractYear(year),
      if (source.season != null) 'season': source.season,
      if (source.episode != null) 'episode': source.episode,
    };

    final data = await _postJson(uri, body);
    final session = PlaybackSession.fromJson(data);

    // Client-side defense-in-depth: strictly enforce HTTPS & authorization
    if (!session.source.isAuthorizedAndValid) {
      throw const VideoSourceException(
        code: 'INVALID_SESSION_STREAM',
        message: 'Playback session returned an unauthorized or non-HTTPS stream.',
      );
    }

    return session;
  }

  Future<PlaybackSession> getPlaybackSession({
    required String sessionId,
    required String token,
  }) async {
    final uri = Uri.parse('$baseUrl/api/playback/${Uri.encodeComponent(sessionId)}');
    final data = await _getJson(uri, headers: {'Authorization': 'Bearer $token'});
    final merged = Map<String, dynamic>.from(data);
    merged['token'] = token;
    final session = PlaybackSession.fromJson(merged);
    if (!session.source.isAuthorizedAndValid) {
      throw const VideoSourceException(
        code: 'INVALID_SESSION_STREAM',
        message: 'Playback session stream failed HTTPS or authorization check.',
      );
    }
    return session;
  }

  Future<List<SubtitleTrackInfo>> fetchSessionSubtitles({
    required String sessionId,
    required String token,
  }) async {
    final uri = Uri.parse('$baseUrl/api/playback/${Uri.encodeComponent(sessionId)}/subtitles');
    final data = await _getJson(uri, headers: {'Authorization': 'Bearer $token'});
    final raw = data['subtitles'];
    if (raw is! List) return const [];
    return raw
        .whereType<Map>()
        .map((e) => SubtitleTrackInfo.fromJson(Map<String, dynamic>.from(e)))
        .where((s) => !s.isExternal || s.hasValidHttpsUrl)
        .toList();
  }

  Future<List<AudioTrackInfo>> fetchSessionAudioTracks({
    required String sessionId,
    required String token,
  }) async {
    final uri = Uri.parse('$baseUrl/api/playback/${Uri.encodeComponent(sessionId)}/audio');
    final data = await _getJson(uri, headers: {'Authorization': 'Bearer $token'});
    final raw = data['audioTracks'];
    if (raw is! List) return const [];
    return raw
        .whereType<Map>()
        .map((e) => AudioTrackInfo.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<SourceResolutionResult> _fetchAndCacheSources({
    required String cacheKey,
    required Uri uri,
    required String contentId,
    required String mediaType,
    required bool forceRefresh,
  }) async {
    final now = DateTime.now().toUtc();
    if (!forceRefresh) {
      final cached = _cache[cacheKey];
      if (cached != null && cached.expiresAt.isAfter(now)) {
        final stillValid = cached.result.sources.where((s) => s.isAuthorizedAndValid).toList();
        if (stillValid.length == cached.result.sources.length) {
          return SourceResolutionResult(
            contentId: cached.result.contentId,
            mediaType: cached.result.mediaType,
            sources: stillValid,
            message: cached.result.message,
            fromCache: true,
          );
        }
        _cache.remove(cacheKey);
      }
    }

    final data = await _getJson(uri);
    final rawSources = data['sources'];
    final parsedSources = rawSources is List
        ? rawSources
            .whereType<Map>()
            .map((e) => VideoSourceItem.fromJson(Map<String, dynamic>.from(e)))
            // Strict client-side security filter: only HTTPS, authorized, non-expired direct streams
            .where((s) => s.isAuthorizedAndValid)
            .toList()
        : <VideoSourceItem>[];

    final result = SourceResolutionResult(
      contentId: contentId,
      mediaType: mediaType,
      sources: parsedSources,
      message: parsedSources.isEmpty
          ? (data['message']?.toString() ?? 'Currently unavailable for streaming.')
          : null,
      fromCache: false,
    );

    if (parsedSources.isNotEmpty) {
      DateTime cacheExpiry = now.add(cacheTtl);
      for (final src in parsedSources) {
        if (src.expiresAt.isBefore(cacheExpiry)) {
          cacheExpiry = src.expiresAt;
        }
      }
      if (cacheExpiry.isAfter(now)) {
        _cache[cacheKey] = _CachedResolution(result, cacheExpiry);
      }
    } else {
      _cache.remove(cacheKey);
    }

    return result;
  }

  Future<Map<String, dynamic>> _getJson(Uri uri, {Map<String, String>? headers}) async {
    try {
      final response = await _client
          .get(
            uri,
            headers: {
              'Accept': 'application/json',
              ...?headers,
            },
          )
          .timeout(timeout);
      return _decodeResponse(response);
    } on TimeoutException {
      throw const VideoSourceException(
        code: 'TIMEOUT',
        message: 'Playback server request timed out. Check your connection and retry.',
      );
    } on SocketException {
      throw const VideoSourceException(
        code: 'NETWORK_ERROR',
        message: 'Unable to reach the StreamPlay playback server. Ensure the backend is running.',
      );
    } on http.ClientException {
      throw const VideoSourceException(
        code: 'NETWORK_ERROR',
        message: 'Network error while contacting the StreamPlay playback server.',
      );
    }
  }

  Future<Map<String, dynamic>> _postJson(
    Uri uri,
    Map<String, dynamic> body, {
    Map<String, String>? headers,
  }) async {
    try {
      final response = await _client
          .post(
            uri,
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              ...?headers,
            },
            body: json.encode(body),
          )
          .timeout(timeout);
      return _decodeResponse(response);
    } on TimeoutException {
      throw const VideoSourceException(
        code: 'TIMEOUT',
        message: 'Playback session request timed out.',
      );
    } on SocketException {
      throw const VideoSourceException(
        code: 'NETWORK_ERROR',
        message: 'Unable to reach the StreamPlay playback server.',
      );
    } on http.ClientException {
      throw const VideoSourceException(
        code: 'NETWORK_ERROR',
        message: 'Network error while initializing playback session.',
      );
    }
  }

  Map<String, dynamic> _decodeResponse(http.Response response) {
    Map<String, dynamic> decoded = {};
    if (response.body.isNotEmpty) {
      try {
        final raw = json.decode(response.body);
        if (raw is Map<String, dynamic>) {
          decoded = raw;
        }
      } catch (_) {
        throw VideoSourceException(
          code: 'INVALID_RESPONSE',
          message: 'Playback server returned malformed JSON.',
          statusCode: response.statusCode,
        );
      }
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return decoded;
    }

    throw VideoSourceException(
      code: decoded['error']?.toString() ?? 'HTTP_${response.statusCode}',
      message: decoded['message']?.toString() ??
          'Playback server error (HTTP ${response.statusCode}).',
      statusCode: response.statusCode,
    );
  }

  String? _extractYear(String? raw) {
    if (raw == null || raw.isEmpty) return null;
    final match = RegExp(r'\b(19|20)\d{2}\b').firstMatch(raw);
    return match?.group(0);
  }

  void dispose() {
    _client.close();
  }
}
