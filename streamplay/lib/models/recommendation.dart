class BehaviorSignal {
  final String type; // 'click' | 'detail_view' | 'watch_start' | 'like' | 'skip' | 'search'
  final String itemId;
  final String itemType; // 'movie' | 'series' | 'song'
  final int timestamp;
  final Map<String, dynamic>? metadata;

  BehaviorSignal({
    required this.type,
    required this.itemId,
    required this.itemType,
    required this.timestamp,
    this.metadata,
  });

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'itemId': itemId,
      'itemType': itemType,
      'timestamp': timestamp,
      'metadata': metadata,
    };
  }
}

class UserPreferenceProfile {
  Map<String, double> genreWeights;
  Map<String, double> languageWeights;
  Map<String, double> artistWeights;
  Map<String, double> ottWeights;
  List<String> recentMovieIds;
  List<String> recentSongIds;
  List<String> completedMovieIds;
  List<String> likedSongIds;
  List<Map<String, dynamic>> searchHistory;
  Map<String, Map<String, double>> timePatterns;
  int totalInteractions;
  int lastUpdated;

  UserPreferenceProfile({
    required this.genreWeights,
    required this.languageWeights,
    required this.artistWeights,
    required this.ottWeights,
    required this.recentMovieIds,
    required this.recentSongIds,
    required this.completedMovieIds,
    required this.likedSongIds,
    required this.searchHistory,
    required this.timePatterns,
    this.totalInteractions = 0,
    this.lastUpdated = 0,
  });

  factory UserPreferenceProfile.createDefault() {
    return UserPreferenceProfile(
      genreWeights: {},
      languageWeights: {},
      artistWeights: {},
      ottWeights: {},
      recentMovieIds: [],
      recentSongIds: [],
      completedMovieIds: [],
      likedSongIds: [],
      searchHistory: [],
      timePatterns: {
        'morning': {},
        'afternoon': {},
        'evening': {},
        'night': {},
      },
      totalInteractions: 0,
      lastUpdated: DateTime.now().millisecondsSinceEpoch,
    );
  }

  factory UserPreferenceProfile.fromJson(Map<String, dynamic> json) {
    Map<String, double> parseDoubleMap(dynamic raw) {
      if (raw is Map) {
        return raw.map((k, v) => MapEntry(k.toString(), (double.tryParse(v.toString()) ?? 0.0)));
      }
      return {};
    }

    Map<String, Map<String, double>> parseTimePatterns(dynamic raw) {
      if (raw is Map) {
        return raw.map((k, v) => MapEntry(k.toString(), parseDoubleMap(v)));
      }
      return {
        'morning': {},
        'afternoon': {},
        'evening': {},
        'night': {},
      };
    }

    return UserPreferenceProfile(
      genreWeights: parseDoubleMap(json['genreWeights']),
      languageWeights: parseDoubleMap(json['languageWeights']),
      artistWeights: parseDoubleMap(json['artistWeights']),
      ottWeights: parseDoubleMap(json['ottWeights']),
      recentMovieIds: (json['recentMovieIds'] as List?)?.map((e) => e.toString()).toList() ?? [],
      recentSongIds: (json['recentSongIds'] as List?)?.map((e) => e.toString()).toList() ?? [],
      completedMovieIds: (json['completedMovieIds'] as List?)?.map((e) => e.toString()).toList() ?? [],
      likedSongIds: (json['likedSongIds'] as List?)?.map((e) => e.toString()).toList() ?? [],
      searchHistory: (json['searchHistory'] as List?)?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [],
      timePatterns: parseTimePatterns(json['timePatterns']),
      totalInteractions: json['totalInteractions'] is int ? json['totalInteractions'] : 0,
      lastUpdated: json['lastUpdated'] is int ? json['lastUpdated'] : 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'genreWeights': genreWeights,
      'languageWeights': languageWeights,
      'artistWeights': artistWeights,
      'ottWeights': ottWeights,
      'recentMovieIds': recentMovieIds,
      'recentSongIds': recentSongIds,
      'completedMovieIds': completedMovieIds,
      'likedSongIds': likedSongIds,
      'searchHistory': searchHistory,
      'timePatterns': timePatterns,
      'totalInteractions': totalInteractions,
      'lastUpdated': lastUpdated,
    };
  }
}

class RecommendationResult {
  final String id;
  final double score;
  final String reason;
  final String reasonType;

  RecommendationResult({
    required this.id,
    required this.score,
    required this.reason,
    required this.reasonType,
  });
}

