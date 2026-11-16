import 'dart:async';
import 'package:flutter/material.dart';
import 'package:just_audio/just_audio.dart';
import '../models/media_item.dart';
import '../services/audio_player_handler.dart';
import '../services/music_service.dart';
import '../services/storage_service.dart';
import 'navigation_provider.dart';

class MediaProvider with ChangeNotifier {
  final StorageService _storage;
  final AudioPlayerHandler _audioHandler;
  final MusicService _musicService = MusicService();

  MovieItem? _selectedMovie;
  bool _isMusicPlayerOpen = false;
  String _playbackMode = 'audio'; // 'audio' | 'video'

  List<MovieItem> _watchlist = [];
  List<Playlist> _playlists = [];
  Set<String> _likedSongIds = {};
  List<SongItem> _recentlyPlayed = [];

  String _primaryLanguage = 'Tamil';
  String _secondaryLanguage = 'English';
  String _userLocation = 'chennai';

  StreamSubscription? _posSub;
  StreamSubscription? _durSub;
  StreamSubscription? _stateSub;
  StreamSubscription? _playingSub;
  StreamSubscription? _loopSub;
  StreamSubscription? _indexSub;

  Duration _songPosition = Duration.zero;
  Duration _songDuration = const Duration(minutes: 3);

  // Search Persistence State (Persists until user dismisses audio player)
  String _activeMusicSearchQuery = '';
  List<SongItem> _activeMusicSearchResults = [];
  String _activeMusicSearchCapsule = 'All';
  int _activeMusicSearchPage = 1;

  // Sleep Timer
  Timer? _sleepTimer;
  DateTime? _sleepTimerEndTime;

  // 5s Delay for Each Song Switching
  int _songSwitchDelayRemaining = 0;
  Timer? _switchDelayTimer;

  bool get isSwitchingSong => _songSwitchDelayRemaining > 0;
  int get switchDelaySecondsRemaining => _songSwitchDelayRemaining;
  bool get songSwitchDelayEnabled => _storage.getSongSwitchDelayEnabled();

  void setSongSwitchDelayEnabled(bool val) {
    _storage.setSongSwitchDelayEnabled(val);
    notifyListeners();
  }

  // Session-level tracking of played song keys to guarantee 100% uniqueness in infinite queue
  final Set<String> _playedSongKeys = {};
  int _autoplayPage = 1;
  bool _autoplayInfiniteQueue = true;

  bool get autoplayInfiniteQueue => _autoplayInfiniteQueue;

  void setAutoplayInfiniteQueue(bool val) {
    _autoplayInfiniteQueue = val;
    notifyListeners();
  }

  void reloadStoredData() => _loadStoredData();

  String _songKey(SongItem s) {
    final title = s.title.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '').trim();
    final artist = s.artist.split(',').first.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '').trim();
    return '$title|$artist';
  }

  MediaProvider(this._storage, this._audioHandler) {
    _loadStoredData();
    _subscribeAudioStreams();
    _setupAutoplayQueueExtender();
    _setupSongSwitchTransition();
    _restoreLastPlayedSession();
  }

  void _restoreLastPlayedSession() {
    final isDismissed = _storage.isAudioPlayerDismissed();
    if (isDismissed) {
      // User explicitly closed audio player before exit: do not show
      return;
    }

    final lastSong = _storage.getLastPlayedSong();
    final lastQueue = _storage.getLastPlayedQueue();
    if (lastSong != null) {
      _audioHandler.prepareSong(lastSong, lastQueue);
      notifyListeners();
    }
  }

  void _setupSongSwitchTransition() {
    _audioHandler.onTrackSwitched = (index, song, wasPlaying) async {
      _storage.saveLastPlayedSong(song);
      _storage.saveLastPlayedQueue(_audioHandler.queue);
      _playedSongKeys.add(_songKey(song));

      if (!wasPlaying || !_storage.getSongSwitchDelayEnabled()) {
        notifyListeners();
        return;
      }

      // 5-second delay for each song switching
      await _audioHandler.pause();
      _startSongSwitchCountdown(5);
    };
  }

  void _startSongSwitchCountdown(int seconds) {
    _switchDelayTimer?.cancel();
    _songSwitchDelayRemaining = seconds;
    notifyListeners();

    _switchDelayTimer = Timer.periodic(const Duration(seconds: 1), (timer) async {
      if (_songSwitchDelayRemaining > 1) {
        _songSwitchDelayRemaining--;
        notifyListeners();
      } else {
        _songSwitchDelayRemaining = 0;
        timer.cancel();
        notifyListeners();
        await _audioHandler.resume();
      }
    });
  }

  void _cancelSwitchDelayTimer() {
    _switchDelayTimer?.cancel();
    _songSwitchDelayRemaining = 0;
  }

  void _setupAutoplayQueueExtender() {
    _audioHandler.onFetchRelatedSongs = (currentSong) async {
      if (!_autoplayInfiniteQueue) return [];

      _playedSongKeys.add(_songKey(currentSong));
      _autoplayPage++;

      final targetLang = (currentSong.language != null && currentSong.language!.trim().isNotEmpty)
          ? currentSong.language!.trim()
          : _primaryLanguage;

      final curYear = int.tryParse(currentSong.year ?? '');
      final isCurContemporary = curYear == null || curYear >= 2015;

      final queries = [
        '$targetLang ${currentSong.artist} hit songs',
        '$targetLang ${currentSong.artist} songs',
        '$targetLang trending hits 2024 2025 2026',
        '$targetLang chartbusters',
        '$targetLang popular songs',
      ];
      final q = queries[(_autoplayPage - 1) % queries.length];
      final p = ((_autoplayPage - 1) ~/ queries.length) + 1;

      try {
        final songs = await _musicService.searchSongs(q, page: p, limit: 15, fullSongsOnly: true);
        final existingQueueKeys = _audioHandler.queue.map(_songKey).toSet();
        final fresh = songs.where((s) {
          final k = _songKey(s);
          if (_playedSongKeys.contains(k) || existingQueueKeys.contains(k)) {
            return false;
          }

          // Strict Language Isolation: Do not allow another language
          if (s.language != null && s.language!.trim().isNotEmpty) {
            final sLang = s.language!.toLowerCase();
            final tLang = targetLang.toLowerCase();
            if (!sLang.contains(tLang) && !tLang.contains(sLang)) {
              return false;
            }
          }

          // Strict Era Protection: Reject vintage/old songs if playing contemporary music
          if (isCurContemporary && s.year != null) {
            final sYear = int.tryParse(s.year!);
            if (sYear != null && sYear < 2015) {
              return false;
            }
          }

          return true;
        }).toList();
        return fresh;
      } catch (_) {
        return [];
      }
    };
  }

  void _loadStoredData() {
    _watchlist = _storage.getWatchlist();
    _playlists = _storage.getPlaylists();
    _likedSongIds = _storage.getLikedSongIds().toSet();
    _recentlyPlayed = _storage.getRecentlyPlayedSongs();
    _primaryLanguage = _storage.getPrimaryLanguage();
    _secondaryLanguage = _storage.getSecondaryLanguage();
    _userLocation = _storage.getUserLocation();
    notifyListeners();
  }

  void _subscribeAudioStreams() {
    _posSub = _audioHandler.positionStream.listen((pos) {
      _songPosition = pos;
      notifyListeners();
    });

    _durSub = _audioHandler.durationStream.listen((dur) {
      if (dur != null) {
        _songDuration = dur;
        notifyListeners();
      }
    });

    _stateSub = _audioHandler.playerStateStream.listen((_) {
      notifyListeners();
    });

    _playingSub = _audioHandler.playingStream.listen((_) {
      notifyListeners();
    });

    _loopSub = _audioHandler.loopModeStream.listen((_) {
      notifyListeners();
    });

    _indexSub = _audioHandler.currentIndexStream.listen((index) {
      if (index != null && index >= 0 && index < _audioHandler.queue.length) {
        _playedSongKeys.add(_songKey(_audioHandler.queue[index]));
      }
      notifyListeners();
    });
  }

  // Getters
  MovieItem? get selectedMovie => _selectedMovie;
  bool get isMusicPlayerOpen => _isMusicPlayerOpen;
  String get playbackMode => _playbackMode;
  List<MovieItem> get watchlist => _watchlist;
  List<Playlist> get playlists => _playlists;
  Set<String> get likedSongIds => _likedSongIds;
  List<SongItem> get recentlyPlayed => _recentlyPlayed;
  String get primaryLanguage => _primaryLanguage;
  String get secondaryLanguage => _secondaryLanguage;
  String get userLocation => _userLocation;

  // Search persistence getters
  String get activeMusicSearchQuery => _activeMusicSearchQuery;
  List<SongItem> get activeMusicSearchResults => _activeMusicSearchResults;
  String get activeMusicSearchCapsule => _activeMusicSearchCapsule;
  int get activeMusicSearchPage => _activeMusicSearchPage;

  void saveMusicSearchSession({
    required String query,
    required List<SongItem> results,
    String capsule = 'All',
    int page = 1,
  }) {
    _activeMusicSearchQuery = query;
    _activeMusicSearchResults = List.from(results);
    _activeMusicSearchCapsule = capsule;
    _activeMusicSearchPage = page;
    notifyListeners();
  }

  void clearMusicSearchSession() {
    _activeMusicSearchQuery = '';
    _activeMusicSearchResults = [];
    _activeMusicSearchCapsule = 'All';
    _activeMusicSearchPage = 1;
    notifyListeners();
  }

  SongItem? get currentSong => _audioHandler.currentSong;
  List<SongItem> get songQueue => _audioHandler.queue;
  bool get isPlayingSong => _audioHandler.isPlaying;
  Duration get songPosition => _songPosition;
  Duration get songDuration => _songDuration;
  bool get isShuffle => _audioHandler.isShuffle;
  LoopMode get loopMode => _audioHandler.loopMode;
  double get playbackSpeed => _audioHandler.speed;
  List<SongItem> get currentQueue => songQueue;
  Stream<Duration> get positionStream => _audioHandler.player.positionStream;
  Stream<Duration?> get durationStream => _audioHandler.player.durationStream;
  int get remainingSleepTimerSeconds => sleepTimerRemainingSeconds ?? 0;

  int? get sleepTimerRemainingSeconds {
    if (_sleepTimerEndTime == null) return null;
    final rem = _sleepTimerEndTime!.difference(DateTime.now()).inSeconds;
    return rem > 0 ? rem : 0;
  }

  // Movie Details
  void openMovieDetails(MovieItem movie) {
    _selectedMovie = movie;
    notifyListeners();
  }

  void closeMovieDetails() {
    _selectedMovie = null;
    notifyListeners();
  }

  // Music Player
  void openMusicPlayer() {
    _isMusicPlayerOpen = true;
    notifyListeners();
  }

  void closeMusicPlayer() {
    _isMusicPlayerOpen = false;
    notifyListeners();
  }

  void setPlaybackMode(String mode) {
    _playbackMode = mode;
    notifyListeners();
  }

  Future<void> playSong(SongItem song, [List<SongItem>? queue]) async {
    _cancelSwitchDelayTimer();

    // Record to recently played
    _recentlyPlayed.removeWhere((s) => s.id == song.id);
    _recentlyPlayed.insert(0, song);
    if (_recentlyPlayed.length > 30) {
      _recentlyPlayed = _recentlyPlayed.sublist(0, 30);
    }
    _storage.saveRecentlyPlayedSongs(_recentlyPlayed);

    // Save as last active song & mark player as not dismissed
    _storage.saveLastPlayedSong(song);
    if (queue != null && queue.isNotEmpty) {
      _storage.saveLastPlayedQueue(queue);
    } else {
      _storage.saveLastPlayedQueue([song]);
    }
    _storage.setAudioPlayerDismissed(false);

    await _audioHandler.playSong(song, queue);
    _playedSongKeys.add(_songKey(song));
    notifyListeners();
  }

  Future<void> pauseSong() async {
    await _audioHandler.pause();
    notifyListeners();
  }

  Future<void> resumeSong() async {
    await _audioHandler.resume();
    notifyListeners();
  }

  Future<void> appendToQueue(List<SongItem> songs) async {
    final existingQueueKeys = _audioHandler.queue.map(_songKey).toSet();
    final fresh = songs.where((s) {
      final k = _songKey(s);
      return !_playedSongKeys.contains(k) && !existingQueueKeys.contains(k);
    }).toList();
    if (fresh.isNotEmpty) {
      await _audioHandler.appendToQueue(fresh);
      notifyListeners();
    }
  }

  Future<void> pitchMoreSongsToQueue() async {
    final cur = _audioHandler.currentSong;
    if (cur == null || !_autoplayInfiniteQueue) return;
    _autoplayPage++;

    final targetLang = (cur.language != null && cur.language!.trim().isNotEmpty)
        ? cur.language!.trim()
        : _primaryLanguage;

    final curYear = int.tryParse(cur.year ?? '');
    final isCurContemporary = curYear == null || curYear >= 2015;

    final queries = [
      '$targetLang ${cur.artist} hit songs',
      '$targetLang ${cur.artist} songs',
      '$targetLang trending hits 2024 2025 2026',
      '$targetLang chartbusters',
      '$targetLang popular songs',
    ];
    final q = queries[(_autoplayPage - 1) % queries.length];
    final p = ((_autoplayPage - 1) ~/ queries.length) + 1;
    try {
      final songs = await _musicService.searchSongs(q, page: p, limit: 15, fullSongsOnly: true);
      final filtered = songs.where((s) {
        if (s.language != null && s.language!.trim().isNotEmpty) {
          final sLang = s.language!.toLowerCase();
          final tLang = targetLang.toLowerCase();
          if (!sLang.contains(tLang) && !tLang.contains(sLang)) {
            return false;
          }
        }
        if (isCurContemporary && s.year != null) {
          final sYear = int.tryParse(s.year!);
          if (sYear != null && sYear < 2015) {
            return false;
          }
        }
        return true;
      }).toList();
      await appendToQueue(filtered);
    } catch (_) {}
  }

  Future<void> togglePlay() async {
    if (_songSwitchDelayRemaining > 0) {
      // User tapped pause during countdown: stop countdown and ensure paused
      _cancelSwitchDelayTimer();
      await _audioHandler.pause();
      notifyListeners();
      return;
    }
    await _audioHandler.togglePlay();
    notifyListeners();
  }

  /// Explicitly skip transition countdown and play immediately
  Future<void> skipDelayAndPlay() async {
    _cancelSwitchDelayTimer();
    await _audioHandler.resume();
    notifyListeners();
  }

  Future<void> toggleSongPlay() => togglePlay();

  Future<void> nextSong() async {
    _cancelSwitchDelayTimer();
    final wasPlaying = _audioHandler.isPlaying;
    await _audioHandler.nextSong();
    if (wasPlaying && _storage.getSongSwitchDelayEnabled()) {
      await _audioHandler.pause();
      _startSongSwitchCountdown(5);
    }
    notifyListeners();
  }

  Future<void> prevSong() async {
    _cancelSwitchDelayTimer();
    final wasPlaying = _audioHandler.isPlaying;
    await _audioHandler.prevSong();
    if (wasPlaying && _storage.getSongSwitchDelayEnabled()) {
      await _audioHandler.pause();
      _startSongSwitchCountdown(5);
    }
    notifyListeners();
  }

  Future<void> seek(Duration pos) async {
    await _audioHandler.seek(pos);
  }

  void toggleShuffle() {
    _audioHandler.toggleShuffle();
    notifyListeners();
  }

  void toggleRepeat() {
    _audioHandler.toggleRepeat();
    notifyListeners();
  }

  Future<void> setPlaybackSpeed(double s) async {
    await _audioHandler.setSpeed(s);
    notifyListeners();
  }

  Future<void> stopAndDismissPlayer() async {
    _cancelSwitchDelayTimer();
    await _audioHandler.stopAndDismiss();
    _isMusicPlayerOpen = false;
    _storage.setAudioPlayerDismissed(true); // User closed player before exit
    clearMusicSearchSession();
    notifyListeners();
  }

  Future<void> stopSong() => stopAndDismissPlayer();

  void setSleepTimer(int minutes) {
    _sleepTimer?.cancel();
    if (minutes <= 0) {
      _sleepTimerEndTime = null;
      notifyListeners();
      return;
    }
    _sleepTimerEndTime = DateTime.now().add(Duration(minutes: minutes));
    _sleepTimer = Timer(Duration(minutes: minutes), () {
      _audioHandler.player.pause();
      _sleepTimerEndTime = null;
      notifyListeners();
    });
    notifyListeners();
  }

  void cancelSleepTimer() {
    _sleepTimer?.cancel();
    _sleepTimerEndTime = null;
    notifyListeners();
  }

  // Liked Songs
  bool isLikedSong(String id) => _likedSongIds.contains(id);

  void toggleLikeSong(String id) {
    if (_likedSongIds.contains(id)) {
      _likedSongIds.remove(id);
    } else {
      _likedSongIds.add(id);
    }
    _storage.saveLikedSongIds(_likedSongIds.toList());
    notifyListeners();
  }

  // Watchlist
  bool isWatchlist(String id) => _watchlist.any((m) => m.id == id);
  bool isWatchLater(String id) => isWatchlist(id);

  void toggleWatchlist(MovieItem movie) {
    if (isWatchlist(movie.id)) {
      _watchlist.removeWhere((m) => m.id == movie.id);
    } else {
      _watchlist.insert(0, movie);
    }
    _storage.saveWatchlist(_watchlist);
    notifyListeners();
  }

  void toggleWatchLater(MovieItem movie) => toggleWatchlist(movie);

  // Playlists
  void createPlaylist(String name, [SongItem? initialSong]) {
    final newPl = Playlist(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      name: name,
      coverImage: initialSong?.image,
      songs: initialSong != null ? [initialSong] : [],
      createdAt: DateTime.now().toIso8601String(),
    );
    _playlists.insert(0, newPl);
    _storage.savePlaylists(_playlists);
    notifyListeners();
  }

  void deletePlaylist(String id) {
    _playlists.removeWhere((p) => p.id == id);
    _storage.savePlaylists(_playlists);
    notifyListeners();
  }

  void addSongToPlaylist(String playlistId, SongItem song) {
    final idx = _playlists.indexWhere((p) => p.id == playlistId);
    if (idx != -1) {
      final pl = _playlists[idx];
      if (!pl.songs.any((s) => s.id == song.id)) {
        final updatedSongs = [...pl.songs, song];
        _playlists[idx] = pl.copyWith(
          songs: updatedSongs,
          coverImage: pl.coverImage ?? song.image,
        );
        _storage.savePlaylists(_playlists);
        notifyListeners();
      }
    }
  }

  void removeSongFromPlaylist(String playlistId, String songId) {
    final idx = _playlists.indexWhere((p) => p.id == playlistId);
    if (idx != -1) {
      final pl = _playlists[idx];
      final updatedSongs = pl.songs.where((s) => s.id != songId).toList();
      _playlists[idx] = pl.copyWith(songs: updatedSongs);
      _storage.savePlaylists(_playlists);
      notifyListeners();
    }
  }

  // Recent Searches
  List<String> getRecentSearches(AppMode mode) {
    final modeStr = mode == AppMode.movies ? 'movies' : 'music';
    return _storage.getRecentSearches(modeStr);
  }

  void saveRecentSearch(String term, AppMode mode) {
    final modeStr = mode == AppMode.movies ? 'movies' : 'music';
    final current = _storage.getRecentSearches(modeStr).where((s) => s != term).toList();
    final updated = [term, ...current].take(8).toList();
    _storage.saveRecentSearches(modeStr, updated);
    notifyListeners();
  }

  void deleteRecentSearch(String term, AppMode mode) {
    final modeStr = mode == AppMode.movies ? 'movies' : 'music';
    final updated = _storage.getRecentSearches(modeStr).where((s) => s != term).toList();
    _storage.saveRecentSearches(modeStr, updated);
    notifyListeners();
  }

  void clearRecentSearches(AppMode mode) {
    final modeStr = mode == AppMode.movies ? 'movies' : 'music';
    _storage.saveRecentSearches(modeStr, []);
    notifyListeners();
  }

  // Preference Settings
  String get audioQuality => _storage.getAudioQuality();
  void setAudioQuality(String q) {
    _storage.setAudioQuality(q);
    notifyListeners();
  }

  String get videoQuality => _storage.getVideoQuality();
  void setVideoQuality(String q) {
    _storage.setVideoQuality(q);
    notifyListeners();
  }

  String get eqPreset => _storage.getEqPreset();
  void setEqPreset(String p) {
    _storage.setEqPreset(p);
    notifyListeners();
  }

  bool get gapless => _storage.getGapless();
  void setGapless(bool g) {
    _storage.setGapless(g);
    notifyListeners();
  }

  bool get notifications => _storage.getNotifications();
  void setNotifications(bool n) {
    _storage.setNotifications(n);
    notifyListeners();
  }

  bool get autoPlayEpisode => _storage.getAutoPlayEpisode();
  void setAutoPlayEpisode(bool a) {
    _storage.setAutoPlayEpisode(a);
    notifyListeners();
  }

  String get subtitlePref => _storage.getSubtitlePref();
  void setSubtitlePref(String s) {
    _storage.setSubtitlePref(s);
    notifyListeners();
  }

  void setPrimaryLanguage(String lang) {
    _primaryLanguage = lang;
    _storage.setPrimaryLanguage(lang);
    notifyListeners();
  }

  void setSecondaryLanguage(String lang) {
    _secondaryLanguage = lang;
    _storage.setSecondaryLanguage(lang);
    notifyListeners();
  }

  void setUserLocation(String loc) {
    _userLocation = loc;
    _storage.setUserLocation(loc);
    notifyListeners();
  }

  @override
  void dispose() {
    _sleepTimer?.cancel();
    _posSub?.cancel();
    _durSub?.cancel();
    _stateSub?.cancel();
    _playingSub?.cancel();
    _loopSub?.cancel();
    _indexSub?.cancel();
    super.dispose();
  }
}
