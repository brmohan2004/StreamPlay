import 'dart:math';
import '../models/media_item.dart';
import '../models/recommendation.dart';
import 'storage_service.dart';

class RecommendationEngine {
  final StorageService _storage;
  final UserPreferenceProfile _profile;

  RecommendationEngine(this._storage) : _profile = _storage.getPreferenceProfile();

  UserPreferenceProfile get profile => _profile;

  String _getTimeBucket() {
    final hour = DateTime.now().hour;
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  void logSignal(BehaviorSignal signal) {
    _profile.totalInteractions++;
    _profile.lastUpdated = DateTime.now().millisecondsSinceEpoch;

    final meta = signal.metadata ?? {};
    final genres = (meta['genres'] as List?)?.map((e) => e.toString()).toList() ?? [];
    final lang = meta['language']?.toString();
    final ott = meta['ottProvider']?.toString();
    final artist = meta['artist']?.toString();
    final query = meta['query']?.toString();

    double weightDelta = 1.0;
    if (signal.type == 'watch_start') weightDelta = 3.0;
    if (signal.type == 'like') weightDelta = 4.0;
    if (signal.type == 'skip') weightDelta = -2.0;

    // Update Genre Weights
    for (var g in genres) {
      _profile.genreWeights[g] = (_profile.genreWeights[g] ?? 0.0) + weightDelta;
      final timeBucket = _getTimeBucket();
      _profile.timePatterns[timeBucket] ??= {};
      _profile.timePatterns[timeBucket]![g] =
          (_profile.timePatterns[timeBucket]![g] ?? 0.0) + weightDelta;
    }

    // Update Language Weights
    if (lang != null && lang.isNotEmpty) {
      _profile.languageWeights[lang] = (_profile.languageWeights[lang] ?? 0.0) + weightDelta;
    }

    // Update OTT Weights
    if (ott != null && ott.isNotEmpty) {
      _profile.ottWeights[ott] = (_profile.ottWeights[ott] ?? 0.0) + weightDelta;
    }

    // Update Artist Weights
    if (artist != null && artist.isNotEmpty) {
      _profile.artistWeights[artist] = (_profile.artistWeights[artist] ?? 0.0) + weightDelta;
    }

    // Track IDs
    if (signal.itemType == 'song') {
      if (!_profile.recentSongIds.contains(signal.itemId)) {
        _profile.recentSongIds.insert(0, signal.itemId);
        if (_profile.recentSongIds.length > 50) _profile.recentSongIds.removeLast();
      }
      if (signal.type == 'like') {
        if (!_profile.likedSongIds.contains(signal.itemId)) {
          _profile.likedSongIds.add(signal.itemId);
        }
      }
    } else {
      if (!_profile.recentMovieIds.contains(signal.itemId)) {
        _profile.recentMovieIds.insert(0, signal.itemId);
        if (_profile.recentMovieIds.length > 50) _profile.recentMovieIds.removeLast();
      }
    }

    // Search query tracking
    if (query != null && query.isNotEmpty) {
      _profile.searchHistory.insert(0, {
        'query': query,
        'timestamp': DateTime.now().millisecondsSinceEpoch,
      });
      if (_profile.searchHistory.length > 30) _profile.searchHistory.removeLast();
    }

    _storage.savePreferenceProfile(_profile);
  }

  /// Score a single movie item against user profile
  RecommendationResult scoreMovie(MovieItem movie) {
    double score = 0.0;
    String topReason = '';
    String topReasonType = 'trending';
    double highestContrib = 0.0;

    // 1. Genre affinity
    for (var g in movie.genres) {
      final w = _profile.genreWeights[g] ?? 0.0;
      score += w;
      if (w > highestContrib) {
        highestContrib = w;
        topReason = 'Matches your love for $g';
        topReasonType = 'genre_match';
      }
    }

    // 2. Language affinity
    for (var entry in _profile.languageWeights.entries) {
      if (entry.value > 0) {
        final matchGenre = movie.genres.any((g) => g.toLowerCase() == entry.key.toLowerCase());
        final matchTitle = movie.name.toLowerCase().contains(entry.key.toLowerCase());
        if (matchGenre || matchTitle) {
          score += entry.value * 1.5;
          if (entry.value > highestContrib) {
            highestContrib = entry.value;
            topReason = '${entry.key} cinema pick for you';
            topReasonType = 'language';
          }
        }
      }
    }

    // 3. OTT affinity
    if (movie.ottProvider != null && _profile.ottWeights.containsKey(movie.ottProvider)) {
      final ottW = _profile.ottWeights[movie.ottProvider] ?? 0.0;
      score += ottW;
      if (ottW > highestContrib) {
        highestContrib = ottW;
        topReason = 'Popular on ${movie.ottProvider}';
        topReasonType = 'ott';
      }
    }

    // 4. Time-of-day bonus
    final bucket = _getTimeBucket();
    final timeMap = _profile.timePatterns[bucket] ?? {};
    for (var g in movie.genres) {
      final tw = timeMap[g] ?? 0.0;
      score += tw * 0.5;
      if (tw > highestContrib && tw > 2.0) {
        highestContrib = tw;
        topReason = 'Great for your $bucket watch';
        topReasonType = 'time_of_day';
      }
    }

    // 5. Popularity baseline from IMDb rating
    final rating = double.tryParse(movie.imdbRating ?? '0') ?? 0.0;
    score += rating * 0.3;

    // 6. Penalize already watched
    if (_profile.completedMovieIds.contains(movie.id)) {
      score -= 10.0;
    }

    if (topReason.isEmpty) {
      topReason = rating >= 7.5 ? 'Highly rated blockbusters' : 'Trending right now';
    }

    return RecommendationResult(
      id: movie.id,
      score: score,
      reason: topReason,
      reasonType: topReasonType,
    );
  }

  /// Get personalized movie recommendations with diversity limits
  List<MovieItem> rankMovies(List<MovieItem> catalog, {int limit = 15}) {
    if (catalog.isEmpty) return [];

    final scored = catalog.map((m) {
      final res = scoreMovie(m);
      return MapEntry(m.copyWith(recReason: res.reason), res.score);
    }).toList();

    scored.sort((a, b) => b.value.compareTo(a.value));

    // Enforce max 40% items from the same primary genre
    final List<MovieItem> result = [];
    final Map<String, int> genreCounts = {};
    final maxPerGenre = max(2, (limit * 0.4).ceil());

    for (var entry in scored) {
      final movie = entry.key;
      final primary = movie.genres.isNotEmpty ? movie.genres.first : 'Other';
      if ((genreCounts[primary] ?? 0) >= maxPerGenre) continue;
      result.add(movie);
      genreCounts[primary] = (genreCounts[primary] ?? 0) + 1;
      if (result.length >= limit) break;
    }

    // Backfill if needed
    if (result.length < limit) {
      final used = result.map((m) => m.id).toSet();
      for (var entry in scored) {
        if (!used.contains(entry.key.id)) {
          result.add(entry.key);
          if (result.length >= limit) break;
        }
      }
    }

    return result;
  }

  /// Generates dynamic search queries for "Top Picks For You" based on
  /// user's real listening habits: top artists, liked tracks, and top genres.
  List<String> getPersonalizedMusicQueries(String primaryLang) {
    final queries = <String>[];

    // 1. User's top interacted artists
    if (_profile.artistWeights.isNotEmpty) {
      final sortedArtists = _profile.artistWeights.entries.toList()
        ..sort((a, b) => b.value.compareTo(a.value));
      for (var a in sortedArtists.take(2)) {
        if (a.key.isNotEmpty && a.value > 0) {
          queries.add('${a.key} hits');
        }
      }
    }

    // 2. User's top interacted music genres
    if (_profile.genreWeights.isNotEmpty) {
      final sortedGenres = _profile.genreWeights.entries.toList()
        ..sort((a, b) => b.value.compareTo(a.value));
      for (var g in sortedGenres.take(2)) {
        if (g.key.isNotEmpty && g.value > 0) {
          queries.add('$primaryLang ${g.key} songs 2025');
        }
      }
    }

    // 3. Defaults based on user's selected primary language & year 2025/2026
    if (queries.isEmpty) {
      queries.add('$primaryLang top chartbusters 2025 2026');
      queries.add('$primaryLang viral melodious hits');
    }

    return queries;
  }

  /// Score and rank songs for "Top Picks For You"
  List<SongItem> rankSongs(List<SongItem> songs, {int limit = 15}) {
    if (songs.isEmpty) return [];

    final scored = songs.map((s) {
      double score = 0.0;
      // Artist affinity
      for (var artist in s.artist.split(',')) {
        final a = artist.trim();
        if (_profile.artistWeights.containsKey(a)) {
          score += (_profile.artistWeights[a] ?? 0.0) * 2.5;
        }
      }
      // Liked songs
      if (_profile.likedSongIds.contains(s.id)) {
        score += 8.0;
      }
      // Freshness bonus
      final year = int.tryParse(s.year ?? '0') ?? 0;
      if (year >= 2025) {
        score += 3.0;
      }
      return MapEntry(s, score);
    }).toList();

    scored.sort((a, b) => b.value.compareTo(a.value));
    return scored.map((e) => e.key).take(limit).toList();
  }
}
