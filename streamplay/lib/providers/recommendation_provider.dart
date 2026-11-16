import 'package:flutter/material.dart';
import '../models/media_item.dart';
import '../models/recommendation.dart';
import '../services/recommendation_engine.dart';

class RecommendationProvider with ChangeNotifier {
  final RecommendationEngine _engine;

  List<MovieItem> _forYouMovies = [];
  List<MovieItem> _becauseYouWatched = [];
  String _becauseMovieTitle = '';

  List<SongItem> _dailyMix = [];
  List<SongItem> _topPicks = [];

  RecommendationProvider(this._engine);

  List<MovieItem> get forYouMovies => _forYouMovies;
  List<MovieItem> get becauseYouWatched => _becauseYouWatched;
  String get becauseMovieTitle => _becauseMovieTitle;
  List<SongItem> get dailyMix => _dailyMix;
  List<SongItem> get topPicks => _topPicks;

  void logSignal(BehaviorSignal signal) {
    _engine.logSignal(signal);
    notifyListeners();
  }

  void updateMovieRecommendations(List<MovieItem> allMovies) {
    if (allMovies.isEmpty) return;

    // Rank for "For You"
    _forYouMovies = _engine.rankMovies(allMovies, limit: 12);

    // "Because You Watched"
    if (_engine.profile.recentMovieIds.isNotEmpty) {
      final lastId = _engine.profile.recentMovieIds.first;
      final match = allMovies.firstWhere(
        (m) => m.id == lastId,
        orElse: () => allMovies.first,
      );
      _becauseMovieTitle = match.name;
      final similar = allMovies.where((m) {
        if (m.id == match.id) return false;
        return m.genres.any((g) => match.genres.contains(g));
      }).toList();
      _becauseYouWatched = similar.take(10).toList();
    } else {
      _becauseMovieTitle = allMovies.first.name;
      _becauseYouWatched = allMovies.skip(1).take(10).toList();
    }

    notifyListeners();
  }

  void updateMusicShelves(List<SongItem> songs) {
    if (songs.isEmpty) return;
    _dailyMix = songs.take(10).toList();
    _topPicks = songs.skip(10).take(15).toList();
    notifyListeners();
  }

  List<String> getPersonalizedMusicQueries(String primaryLang) {
    return _engine.getPersonalizedMusicQueries(primaryLang);
  }

  List<SongItem> rankSongs(List<SongItem> songs, {int limit = 15}) {
    return _engine.rankSongs(songs, limit: limit);
  }
}

