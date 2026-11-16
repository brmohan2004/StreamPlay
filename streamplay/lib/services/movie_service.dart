import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/constants.dart';
import '../models/media_item.dart';

class MovieService {
  final http.Client _client;

  MovieService({http.Client? client}) : _client = client ?? http.Client();

  /// Fetches Top Trending Movies from Cinemeta (0 API Keys, Real Data Only)
  Future<List<MovieItem>> fetchTopMovies({int skip = 0}) async {
    try {
      final skipPart = skip > 0 ? '/skip=$skip' : '';
      final responses = await Future.wait([
        _client.get(Uri.parse('${AppConstants.cinemetaBase}/catalog/movie/top$skipPart.json')),
        if (skip == 0)
          _client.get(Uri.parse('${AppConstants.cinemetaBase}/catalog/movie/year/genre=2025.json'))
        else
          Future.value(http.Response('{"metas":[]}', 200)),
      ]);

      List<MovieItem> baseList = [];
      if (responses[0].statusCode == 200) {
        final data = json.decode(responses[0].body);
        final List metas = data['metas'] ?? [];
        baseList = metas.map((m) => _formatMovie(m, 'movie')).toList();
      }

      List<MovieItem> year25List = [];
      if (responses[1].statusCode == 200) {
        final data = json.decode(responses[1].body);
        final List metas = data['metas'] ?? [];
        year25List = metas.map((m) => _formatMovie(m, 'movie')).toList();
      }

      final pool = [...year25List.take(12), ...baseList];
      final seen = <String>{};
      final unique = <MovieItem>[];

      for (var m in pool) {
        if (m.id.isNotEmpty && !seen.contains(m.id)) {
          seen.add(m.id);
          unique.add(m);
        }
      }

      return unique;
    } catch (_) {
      return [];
    }
  }

  /// Fetches Top TV Series from Cinemeta (0 API Keys, Real Data Only)
  Future<List<MovieItem>> fetchTopSeries({int skip = 0}) async {
    try {
      final skipPart = skip > 0 ? '/skip=$skip' : '';
      final res = await _client.get(Uri.parse('${AppConstants.cinemetaBase}/catalog/series/top$skipPart.json'));
      if (res.statusCode == 200) {
        final data = json.decode(res.body);
        final List metas = data['metas'] ?? [];
        return metas.map((m) => _formatMovie(m, 'series')).toList();
      }
    } catch (_) {}
    return [];
  }

  /// Fetches Theatrical Exclusive Releases
  Future<List<MovieItem>> fetchTheaterReleases({int skip = 0}) async {
    try {
      final skipQuery = skip > 0 ? '&skip=$skip' : '';
      final res = await _client.get(Uri.parse('${AppConstants.cinemetaBase}/catalog/movie/year/genre=2026$skipQuery.json'));
      if (res.statusCode == 200) {
        final data = json.decode(res.body);
        final List metas = data['metas'] ?? [];
        return metas.map((m) {
          final item = _formatMovie(m, 'movie');
          return item.copyWith(isTheaterPrint: true);
        }).toList();
      }
    } catch (_) {}
    return [];
  }

  /// Fetches Movies by Genre with skip pagination support
  Future<List<MovieItem>> fetchGenreMovies(String genre, {int skip = 0}) async {
    try {
      final skipQuery = skip > 0 ? '&skip=$skip' : '';
      final res = await _client.get(
        Uri.parse('${AppConstants.cinemetaBase}/catalog/movie/top/genre=${Uri.encodeComponent(genre)}$skipQuery.json'),
      );
      if (res.statusCode == 200) {
        final data = json.decode(res.body);
        final List metas = data['metas'] ?? [];
        return metas.map((m) => _formatMovie(m, 'movie')).toList();
      }
    } catch (_) {}
    return [];
  }

  /// Fetches Movies by OTT Brand with pagination
  Future<List<MovieItem>> fetchByOTT(String brand, {int skip = 0}) async {
    if (brand == 'All') {
      return fetchTopMovies(skip: skip);
    }

    try {
      final query = '$brand Hits 2025';
      final skipQuery = skip > 0 ? '&skip=$skip' : '';
      final res = await _client.get(
        Uri.parse('${AppConstants.cinemetaBase}/catalog/movie/top/search=${Uri.encodeComponent(query)}$skipQuery.json'),
      );
      if (res.statusCode == 200) {
        final data = json.decode(res.body);
        final List metas = data['metas'] ?? [];
        return metas.map((m) {
          final item = _formatMovie(m, 'movie');
          return item.copyWith(ottProvider: brand);
        }).toList();
      }
    } catch (_) {}
    return [];
  }

  /// Search Movies & Shows with 0 API Keys
  Future<List<MovieItem>> searchMovies(String query, {int page = 0, int limit = 25}) async {
    final trimmed = query.trim();
    if (trimmed.isEmpty) return [];

    try {
      final skip = page * limit;
      final skipQuery = skip > 0 ? '&skip=$skip' : '';
      final responses = await Future.wait([
        _client.get(Uri.parse('${AppConstants.cinemetaBase}/catalog/movie/top/search=${Uri.encodeComponent(trimmed)}$skipQuery.json')),
        _client.get(Uri.parse('${AppConstants.cinemetaBase}/catalog/series/top/search=${Uri.encodeComponent(trimmed)}$skipQuery.json')),
      ]);

      final List<MovieItem> combined = [];
      final seen = <String>{};

      for (var r in responses) {
        if (r.statusCode == 200) {
          final data = json.decode(r.body);
          final List metas = data['metas'] ?? [];
          for (var m in metas) {
            final item = _formatMovie(m, m['type'] == 'series' ? 'series' : 'movie');
            if (item.id.isNotEmpty && !seen.contains(item.id)) {
              seen.add(item.id);
              combined.add(item);
            }
          }
        }
      }

      return combined;
    } catch (_) {
      return [];
    }
  }

  /// Fetch Details for Movie or Series
  Future<MovieItem?> fetchMovieDetails(String id, String type) async {
    try {
      final res = await _client.get(
        Uri.parse('${AppConstants.cinemetaBase}/meta/$type/$id.json'),
      );
      if (res.statusCode == 200) {
        final data = json.decode(res.body);
        final meta = data['meta'];
        if (meta != null) {
          return MovieItem.fromJson(Map<String, dynamic>.from(meta));
        }
      }
    } catch (_) {}
    return null;
  }

  MovieItem _formatMovie(Map<String, dynamic> item, String type) {
    List<String> genres = [];
    if (item['genres'] is List) {
      genres = (item['genres'] as List).map((e) => e.toString()).toList();
    }
    return MovieItem(
      id: item['id']?.toString() ?? '',
      name: item['name']?.toString() ?? 'Untitled',
      type: type,
      poster: (item['poster']?.toString().isNotEmpty ?? false)
          ? item['poster'].toString()
          : AppConstants.defaultPosterFallback,
      background: item['background']?.toString() ?? item['poster']?.toString(),
      description: item['description']?.toString(),
      releaseInfo: item['releaseInfo']?.toString() ?? item['year']?.toString(),
      imdbRating: item['imdbRating']?.toString(),
      genres: genres,
      released: item['released']?.toString(),
    );
  }
}
