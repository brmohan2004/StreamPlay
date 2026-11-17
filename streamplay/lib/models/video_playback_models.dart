enum VideoFormat {
  mp4,
  hls,
  dash,
  unknown;

  static VideoFormat fromString(String? raw) {
    switch (raw?.toLowerCase().trim()) {
      case 'mp4':
      case 'video/mp4':
        return VideoFormat.mp4;
      case 'hls':
      case 'm3u8':
      case 'application/vnd.apple.mpegurl':
      case 'application/x-mpegurl':
        return VideoFormat.hls;
      case 'dash':
      case 'mpd':
      case 'application/dash+xml':
        return VideoFormat.dash;
      default:
        return VideoFormat.unknown;
    }
  }

  String get displayLabel {
    switch (this) {
      case VideoFormat.mp4:
        return 'MP4';
      case VideoFormat.hls:
        return 'HLS';
      case VideoFormat.dash:
        return 'DASH';
      case VideoFormat.unknown:
        return 'STREAM';
    }
  }

  String get apiValue {
    switch (this) {
      case VideoFormat.mp4:
        return 'mp4';
      case VideoFormat.hls:
        return 'hls';
      case VideoFormat.dash:
        return 'dash';
      case VideoFormat.unknown:
        return 'unknown';
    }
  }
}

enum AuthorizationStatus {
  authorized,
  unauthorized,
  expired,
  geoRestricted;

  static AuthorizationStatus fromString(String? raw) {
    switch (raw?.toLowerCase().trim()) {
      case 'authorized':
        return AuthorizationStatus.authorized;
      case 'expired':
        return AuthorizationStatus.expired;
      case 'geo_restricted':
      case 'georestricted':
        return AuthorizationStatus.geoRestricted;
      default:
        return AuthorizationStatus.unauthorized;
    }
  }

  String get apiValue {
    switch (this) {
      case AuthorizationStatus.authorized:
        return 'authorized';
      case AuthorizationStatus.unauthorized:
        return 'unauthorized';
      case AuthorizationStatus.expired:
        return 'expired';
      case AuthorizationStatus.geoRestricted:
        return 'geo_restricted';
    }
  }
}

class SubtitleTrackInfo {
  final String id;
  final String language;
  final String label;
  final String? url;
  final String format; // 'vtt', 'srt', 'ass', 'embedded'
  final bool isDefault;
  final bool isExternal;

  const SubtitleTrackInfo({
    required this.id,
    required this.language,
    required this.label,
    this.url,
    this.format = 'vtt',
    this.isDefault = false,
    this.isExternal = true,
  });

  bool get hasValidHttpsUrl {
    if (url == null || url!.trim().isEmpty) return false;
    final uri = Uri.tryParse(url!.trim());
    return uri != null && uri.scheme == 'https' && uri.host.isNotEmpty;
  }

  factory SubtitleTrackInfo.fromJson(Map<String, dynamic> json) {
    return SubtitleTrackInfo(
      id: json['id']?.toString() ?? '',
      language: json['language']?.toString() ?? 'und',
      label: json['label']?.toString() ?? json['language']?.toString() ?? 'Subtitle',
      url: json['url']?.toString(),
      format: json['format']?.toString() ?? 'vtt',
      isDefault: json['isDefault'] == true,
      isExternal: json['isExternal'] != false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'language': language,
      'label': label,
      'url': url,
      'format': format,
      'isDefault': isDefault,
      'isExternal': isExternal,
    };
  }
}

class AudioTrackInfo {
  final String id;
  final String language;
  final String label;
  final String? channels;
  final String? codec;
  final int? bitrateKbps;
  final bool isDefault;

  const AudioTrackInfo({
    required this.id,
    required this.language,
    required this.label,
    this.channels,
    this.codec,
    this.bitrateKbps,
    this.isDefault = false,
  });

  String get displayName {
    final parts = <String>[label];
    if (channels != null && channels!.isNotEmpty) {
      parts.add(channels!);
    }
    return parts.join(' • ');
  }

  factory AudioTrackInfo.fromJson(Map<String, dynamic> json) {
    return AudioTrackInfo(
      id: json['id']?.toString() ?? '',
      language: json['language']?.toString() ?? 'und',
      label: json['label']?.toString() ?? json['language']?.toString() ?? 'Audio',
      channels: json['channels']?.toString(),
      codec: json['codec']?.toString(),
      bitrateKbps: json['bitrateKbps'] is int
          ? json['bitrateKbps'] as int
          : int.tryParse(json['bitrateKbps']?.toString() ?? ''),
      isDefault: json['isDefault'] == true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'language': language,
      'label': label,
      'channels': channels,
      'codec': codec,
      'bitrateKbps': bitrateKbps,
      'isDefault': isDefault,
    };
  }
}

class VideoSourceItem {
  final String sourceId;
  final String providerId;
  final String providerName;
  final String contentId;
  final String mediaType; // 'movie' or 'series'
  final String playbackUrl;
  final VideoFormat format;
  final String quality;
  final List<String> audioLanguages;
  final List<String> subtitleLanguages;
  final List<AudioTrackInfo> audioTracks;
  final List<SubtitleTrackInfo> subtitles;
  final DateTime expiresAt;
  final AuthorizationStatus authorizationStatus;
  final Map<String, String> headers;
  final String? licenseType;
  final int? season;
  final int? episode;

  const VideoSourceItem({
    required this.sourceId,
    required this.providerId,
    required this.providerName,
    required this.contentId,
    this.mediaType = 'movie',
    required this.playbackUrl,
    required this.format,
    required this.quality,
    this.audioLanguages = const [],
    this.subtitleLanguages = const [],
    this.audioTracks = const [],
    this.subtitles = const [],
    required this.expiresAt,
    required this.authorizationStatus,
    this.headers = const {},
    this.licenseType,
    this.season,
    this.episode,
  });

  bool get isHttps {
    final uri = Uri.tryParse(playbackUrl.trim());
    return uri != null && uri.scheme == 'https' && uri.host.isNotEmpty;
  }

  bool get isExpired => DateTime.now().toUtc().isAfter(expiresAt.toUtc());

  Duration get timeUntilExpiry => expiresAt.toUtc().difference(DateTime.now().toUtc());

  bool get isAuthorizedAndValid =>
      isHttps &&
      !isExpired &&
      authorizationStatus == AuthorizationStatus.authorized &&
      format != VideoFormat.unknown;

  factory VideoSourceItem.fromJson(Map<String, dynamic> json) {
    final rawAudioLangs = json['audioLanguages'];
    final rawSubLangs = json['subtitleLanguages'];
    final rawAudioTracks = json['audioTracks'];
    final rawSubtitles = json['subtitles'];
    final rawHeaders = json['headers'];

    final parsedHeaders = <String, String>{};
    if (rawHeaders is Map) {
      rawHeaders.forEach((key, value) {
        if (key != null && value != null) {
          parsedHeaders[key.toString()] = value.toString();
        }
      });
    }

    final parsedExpiresAt = DateTime.tryParse(json['expiresAt']?.toString() ?? '')?.toUtc() ??
        DateTime.now().toUtc().subtract(const Duration(seconds: 1));

    return VideoSourceItem(
      sourceId: json['sourceId']?.toString() ?? json['id']?.toString() ?? '',
      providerId: json['providerId']?.toString() ?? '',
      providerName: json['providerName']?.toString() ?? 'Authorized Provider',
      contentId: json['contentId']?.toString() ?? '',
      mediaType: json['mediaType']?.toString() ?? 'movie',
      playbackUrl: json['playbackUrl']?.toString() ?? '',
      format: VideoFormat.fromString(json['format']?.toString()),
      quality: json['quality']?.toString() ?? 'HD',
      audioLanguages: rawAudioLangs is List
          ? rawAudioLangs.map((e) => e.toString()).toList()
          : const [],
      subtitleLanguages: rawSubLangs is List
          ? rawSubLangs.map((e) => e.toString()).toList()
          : const [],
      audioTracks: rawAudioTracks is List
          ? rawAudioTracks
              .whereType<Map>()
              .map((e) => AudioTrackInfo.fromJson(Map<String, dynamic>.from(e)))
              .toList()
          : const [],
      subtitles: rawSubtitles is List
          ? rawSubtitles
              .whereType<Map>()
              .map((e) => SubtitleTrackInfo.fromJson(Map<String, dynamic>.from(e)))
              .toList()
          : const [],
      expiresAt: parsedExpiresAt,
      authorizationStatus: AuthorizationStatus.fromString(json['authorizationStatus']?.toString()),
      headers: parsedHeaders,
      licenseType: json['licenseType']?.toString(),
      season: json['season'] is int
          ? json['season'] as int
          : int.tryParse(json['season']?.toString() ?? ''),
      episode: json['episode'] is int
          ? json['episode'] as int
          : int.tryParse(json['episode']?.toString() ?? ''),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'sourceId': sourceId,
      'providerId': providerId,
      'providerName': providerName,
      'contentId': contentId,
      'mediaType': mediaType,
      'playbackUrl': playbackUrl,
      'format': format.apiValue,
      'quality': quality,
      'audioLanguages': audioLanguages,
      'subtitleLanguages': subtitleLanguages,
      'audioTracks': audioTracks.map((e) => e.toJson()).toList(),
      'subtitles': subtitles.map((e) => e.toJson()).toList(),
      'expiresAt': expiresAt.toUtc().toIso8601String(),
      'authorizationStatus': authorizationStatus.apiValue,
      'headers': headers,
      'licenseType': licenseType,
      'season': season,
      'episode': episode,
    };
  }
}

class PlaybackSession {
  final String sessionId;
  final String token;
  final VideoSourceItem source;
  final List<SubtitleTrackInfo> subtitles;
  final List<AudioTrackInfo> audioTracks;
  final DateTime expiresAt;
  final DateTime createdAt;

  const PlaybackSession({
    required this.sessionId,
    required this.token,
    required this.source,
    this.subtitles = const [],
    this.audioTracks = const [],
    required this.expiresAt,
    required this.createdAt,
  });

  bool get isExpired =>
      DateTime.now().toUtc().isAfter(expiresAt.toUtc()) || source.isExpired;

  DateTime get effectiveExpiry =>
      expiresAt.toUtc().isBefore(source.expiresAt.toUtc())
          ? expiresAt.toUtc()
          : source.expiresAt.toUtc();

  PlaybackSession copyWith({
    List<SubtitleTrackInfo>? subtitles,
    List<AudioTrackInfo>? audioTracks,
    VideoSourceItem? source,
    DateTime? expiresAt,
    String? token,
  }) {
    return PlaybackSession(
      sessionId: sessionId,
      token: token ?? this.token,
      source: source ?? this.source,
      subtitles: subtitles ?? this.subtitles,
      audioTracks: audioTracks ?? this.audioTracks,
      expiresAt: expiresAt ?? this.expiresAt,
      createdAt: createdAt,
    );
  }

  factory PlaybackSession.fromJson(Map<String, dynamic> json) {
    final rawSource = json['source'];
    if (rawSource is! Map) {
      throw const FormatException('Playback session is missing source payload.');
    }

    final parsedSource = VideoSourceItem.fromJson(Map<String, dynamic>.from(rawSource));
    final rawSubtitles = json['subtitles'];
    final rawAudioTracks = json['audioTracks'];

    final subtitles = rawSubtitles is List
        ? rawSubtitles
            .whereType<Map>()
            .map((e) => SubtitleTrackInfo.fromJson(Map<String, dynamic>.from(e)))
            .toList()
        : parsedSource.subtitles;

    final audioTracks = rawAudioTracks is List
        ? rawAudioTracks
            .whereType<Map>()
            .map((e) => AudioTrackInfo.fromJson(Map<String, dynamic>.from(e)))
            .toList()
        : parsedSource.audioTracks;

    return PlaybackSession(
      sessionId: json['sessionId']?.toString() ?? '',
      token: json['token']?.toString() ?? '',
      source: parsedSource,
      subtitles: subtitles,
      audioTracks: audioTracks,
      expiresAt: DateTime.tryParse(json['expiresAt']?.toString() ?? '')?.toUtc() ??
          parsedSource.expiresAt,
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '')?.toUtc() ??
          DateTime.now().toUtc(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'sessionId': sessionId,
      'token': token,
      'source': source.toJson(),
      'subtitles': subtitles.map((e) => e.toJson()).toList(),
      'audioTracks': audioTracks.map((e) => e.toJson()).toList(),
      'expiresAt': expiresAt.toUtc().toIso8601String(),
      'createdAt': createdAt.toUtc().toIso8601String(),
    };
  }
}

class WatchProgress {
  final String contentId;
  final String mediaType; // 'movie' or 'series'
  final String title;
  final String poster;
  final String? background;
  final int? season;
  final int? episode;
  final String? episodeTitle;
  final int positionSeconds;
  final int durationSeconds;
  final DateTime updatedAt;

  const WatchProgress({
    required this.contentId,
    required this.mediaType,
    required this.title,
    required this.poster,
    this.background,
    this.season,
    this.episode,
    this.episodeTitle,
    required this.positionSeconds,
    required this.durationSeconds,
    required this.updatedAt,
  });

  String get storageKey => buildKey(contentId, season: season, episode: episode);

  static String buildKey(String contentId, {int? season, int? episode}) {
    if (season != null && episode != null) {
      return '$contentId:s${season}e$episode';
    }
    return contentId;
  }

  double get progressRatio {
    if (durationSeconds <= 0) return 0.0;
    return (positionSeconds / durationSeconds).clamp(0.0, 1.0);
  }

  bool get isCompleted => durationSeconds > 0 && progressRatio >= 0.95;

  bool get canResume => positionSeconds >= 5 && !isCompleted;

  String get formattedPosition {
    final d = Duration(seconds: positionSeconds);
    final h = d.inHours;
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return h > 0 ? '$h:$m:$s' : '$m:$s';
  }

  factory WatchProgress.fromJson(Map<String, dynamic> json) {
    return WatchProgress(
      contentId: json['contentId']?.toString() ?? '',
      mediaType: json['mediaType']?.toString() ?? 'movie',
      title: json['title']?.toString() ?? 'Untitled',
      poster: json['poster']?.toString() ?? '',
      background: json['background']?.toString(),
      season: json['season'] is int
          ? json['season'] as int
          : int.tryParse(json['season']?.toString() ?? ''),
      episode: json['episode'] is int
          ? json['episode'] as int
          : int.tryParse(json['episode']?.toString() ?? ''),
      episodeTitle: json['episodeTitle']?.toString(),
      positionSeconds: json['positionSeconds'] is int
          ? json['positionSeconds'] as int
          : int.tryParse(json['positionSeconds']?.toString() ?? '0') ?? 0,
      durationSeconds: json['durationSeconds'] is int
          ? json['durationSeconds'] as int
          : int.tryParse(json['durationSeconds']?.toString() ?? '0') ?? 0,
      updatedAt: DateTime.tryParse(json['updatedAt']?.toString() ?? '')?.toUtc() ??
          DateTime.now().toUtc(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'contentId': contentId,
      'mediaType': mediaType,
      'title': title,
      'poster': poster,
      'background': background,
      'season': season,
      'episode': episode,
      'episodeTitle': episodeTitle,
      'positionSeconds': positionSeconds,
      'durationSeconds': durationSeconds,
      'updatedAt': updatedAt.toUtc().toIso8601String(),
    };
  }
}

class ProviderInfo {
  final String id;
  final String name;
  final String description;
  final bool enabled;
  final int priority;
  final List<String> supportedFormats;

  const ProviderInfo({
    required this.id,
    required this.name,
    this.description = '',
    this.enabled = true,
    this.priority = 100,
    this.supportedFormats = const ['mp4', 'hls', 'dash'],
  });

  factory ProviderInfo.fromJson(Map<String, dynamic> json) {
    final rawFormats = json['supportedFormats'];
    return ProviderInfo(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Authorized Provider',
      description: json['description']?.toString() ?? '',
      enabled: json['enabled'] != false,
      priority: json['priority'] is int
          ? json['priority'] as int
          : int.tryParse(json['priority']?.toString() ?? '100') ?? 100,
      supportedFormats: rawFormats is List
          ? rawFormats.map((e) => e.toString()).toList()
          : const ['mp4', 'hls', 'dash'],
    );
  }
}
