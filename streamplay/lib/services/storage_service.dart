import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/media_item.dart';
import '../models/recommendation.dart';
import '../models/video_playback_models.dart';

class StorageService {
  static const String _keyOnboarding = 'streamplay_onboarding_completed';
  static const String _keyMode = 'streamplay_app_mode';
  static const String _keyLocation = 'streamplay_user_location';
  static const String _keyPrimaryLang = 'streamplay_primary_lang';
  static const String _keySecondaryLang = 'streamplay_secondary_lang';
  static const String _keyWatchlist = 'streamplay_watchlist_v2';
  static const String _keyPlaylists = 'streamplay_playlists_v2';
  static const String _keyLikedSongs = 'streamplay_liked_songs_v2';
  static const String _keyRecentlyPlayed = 'streamplay_recently_played_songs_v2';
  static const String _keyLastPlayedSong = 'streamplay_last_played_song_v2';
  static const String _keyLastPlayedQueue = 'streamplay_last_played_queue_v2';
  static const String _keyAudioPlayerDismissed = 'streamplay_audio_player_dismissed_v2';
  static const String _keySongSwitchDelay = 'streamplay_song_switch_delay_v2';
  static const String _keyRecentMovieSearches = 'streamplay_recent_movie_searches';
  static const String _keyRecentMusicSearches = 'streamplay_recent_music_searches';
  static const String _keyProfile = 'streamplay_rec_profile_v2';
  static const String _keyAudioQuality = 'streamplay_setting_audio_quality';
  static const String _keyVideoQuality = 'streamplay_setting_video_quality';
  static const String _keyEqPreset = 'streamplay_setting_eq_preset';
  static const String _keyGapless = 'streamplay_setting_gapless';
  static const String _keyNotifications = 'streamplay_setting_notifications';
  static const String _keyAutoPlayEpisode = 'streamplay_setting_autoplay_episode';
  static const String _keySubtitlePref = 'streamplay_setting_subtitles';
  static const String _keyDynamicPlayerBg = 'streamplay_setting_dynamic_player_bg';
  static const String _keyVideoWatchProgress = 'streamplay_video_watch_progress_v1';
  static const String _keyPreferredVideoProvider = 'streamplay_setting_video_provider';

  final SharedPreferences _prefs;

  StorageService(this._prefs);

  static Future<StorageService> init() async {
    final prefs = await SharedPreferences.getInstance();
    return StorageService(prefs);
  }

  // Onboarding
  bool isOnboardingCompleted() => _prefs.getBool(_keyOnboarding) ?? false;
  Future<void> setOnboardingCompleted(bool val) => _prefs.setBool(_keyOnboarding, val);

  // Mode: 'movies' or 'music'
  String getAppMode() => _prefs.getString(_keyMode) ?? 'movies';
  Future<void> setAppMode(String mode) => _prefs.setString(_keyMode, mode);

  // Location Hub
  String getUserLocation() => _prefs.getString(_keyLocation) ?? 'chennai';
  Future<void> setUserLocation(String loc) => _prefs.setString(_keyLocation, loc);

  // Languages
  String getPrimaryLanguage() => _prefs.getString(_keyPrimaryLang) ?? 'Tamil';
  Future<void> setPrimaryLanguage(String lang) => _prefs.setString(_keyPrimaryLang, lang);

  String getSecondaryLanguage() => _prefs.getString(_keySecondaryLang) ?? 'English';
  Future<void> setSecondaryLanguage(String lang) => _prefs.setString(_keySecondaryLang, lang);

  // Watchlist
  List<MovieItem> getWatchlist() {
    try {
      final raw = _prefs.getString(_keyWatchlist);
      if (raw != null) {
        final List list = json.decode(raw);
        return list.map((e) => MovieItem.fromJson(e as Map<String, dynamic>)).toList();
      }
    } catch (_) {}
    return [];
  }

  Future<void> saveWatchlist(List<MovieItem> items) async {
    final raw = json.encode(items.map((e) => e.toJson()).toList());
    await _prefs.setString(_keyWatchlist, raw);
  }

  // Playlists
  List<Playlist> getPlaylists() {
    try {
      final raw = _prefs.getString(_keyPlaylists);
      if (raw != null) {
        final List list = json.decode(raw);
        return list.map((e) => Playlist.fromJson(e as Map<String, dynamic>)).toList();
      }
    } catch (_) {}
    return [];
  }

  Future<void> savePlaylists(List<Playlist> items) async {
    final raw = json.encode(items.map((e) => e.toJson()).toList());
    await _prefs.setString(_keyPlaylists, raw);
  }

  // Liked Songs
  List<String> getLikedSongIds() {
    try {
      return _prefs.getStringList(_keyLikedSongs) ?? [];
    } catch (_) {
      return [];
    }
  }

  Future<void> saveLikedSongIds(List<String> ids) async {
    await _prefs.setStringList(_keyLikedSongs, ids);
  }

  // Recently Played Songs
  List<SongItem> getRecentlyPlayedSongs() {
    try {
      final raw = _prefs.getString(_keyRecentlyPlayed);
      if (raw != null) {
        final List list = json.decode(raw);
        return list.map((e) => SongItem.fromJson(e as Map<String, dynamic>)).toList();
      }
    } catch (_) {}
    return [];
  }

  Future<void> saveRecentlyPlayedSongs(List<SongItem> songs) async {
    final raw = json.encode(songs.take(30).map((e) => e.toJson()).toList());
    await _prefs.setString(_keyRecentlyPlayed, raw);
  }

  // Last Active Song in Audio Player (Restored on App Open)
  SongItem? getLastPlayedSong() {
    try {
      final raw = _prefs.getString(_keyLastPlayedSong);
      if (raw != null && raw.isNotEmpty) {
        final Map<String, dynamic> data = json.decode(raw);
        return SongItem.fromJson(data);
      }
    } catch (_) {}
    return null;
  }

  Future<void> saveLastPlayedSong(SongItem song) async {
    final raw = json.encode(song.toJson());
    await _prefs.setString(_keyLastPlayedSong, raw);
  }

  List<SongItem> getLastPlayedQueue() {
    try {
      final raw = _prefs.getString(_keyLastPlayedQueue);
      if (raw != null && raw.isNotEmpty) {
        final List list = json.decode(raw);
        return list.map((e) => SongItem.fromJson(e as Map<String, dynamic>)).toList();
      }
    } catch (_) {}
    return [];
  }

  Future<void> saveLastPlayedQueue(List<SongItem> queue) async {
    final raw = json.encode(queue.take(50).map((e) => e.toJson()).toList());
    await _prefs.setString(_keyLastPlayedQueue, raw);
  }

  // User Dismissed Player Before Exit (Do not show if user closed player)
  bool isAudioPlayerDismissed() => _prefs.getBool(_keyAudioPlayerDismissed) ?? false;
  Future<void> setAudioPlayerDismissed(bool dismissed) => _prefs.setBool(_keyAudioPlayerDismissed, dismissed);

  // Song Switch Delay (Disabled, seamless instant transition)
  bool getSongSwitchDelayEnabled() => false;
  Future<void> setSongSwitchDelayEnabled(bool val) => _prefs.setBool(_keySongSwitchDelay, false);

  // Recent Searches
  List<String> getRecentSearches(String mode) {
    try {
      final key = mode == 'movies' ? _keyRecentMovieSearches : _keyRecentMusicSearches;
      return _prefs.getStringList(key) ?? [];
    } catch (_) {
      return [];
    }
  }

  Future<void> saveRecentSearches(String mode, List<String> searches) async {
    final key = mode == 'movies' ? _keyRecentMovieSearches : _keyRecentMusicSearches;
    await _prefs.setStringList(key, searches);
  }

  // Settings & Engine Profile
  String getAudioQuality() => _prefs.getString(_keyAudioQuality) ?? '320k';
  Future<void> setAudioQuality(String q) => _prefs.setString(_keyAudioQuality, q);

  String getVideoQuality() => _prefs.getString(_keyVideoQuality) ?? '4k';
  Future<void> setVideoQuality(String q) => _prefs.setString(_keyVideoQuality, q);

  String getEqPreset() => _prefs.getString(_keyEqPreset) ?? 'balanced';
  Future<void> setEqPreset(String p) => _prefs.setString(_keyEqPreset, p);

  bool getGapless() => _prefs.getBool(_keyGapless) ?? true;
  Future<void> setGapless(bool val) => _prefs.setBool(_keyGapless, val);

  bool getNotifications() => _prefs.getBool(_keyNotifications) ?? true;
  Future<void> setNotifications(bool val) => _prefs.setBool(_keyNotifications, val);

  bool getAutoPlayEpisode() => _prefs.getBool(_keyAutoPlayEpisode) ?? true;
  Future<void> setAutoPlayEpisode(bool val) => _prefs.setBool(_keyAutoPlayEpisode, val);

  String getSubtitlePref() => _prefs.getString(_keySubtitlePref) ?? 'auto';
  Future<void> setSubtitlePref(String pref) => _prefs.setString(_keySubtitlePref, pref);

  // Dynamic Player Background (Poster-based dynamic background)
  bool getDynamicPlayerBgEnabled() => _prefs.getBool(_keyDynamicPlayerBg) ?? true;
  Future<void> setDynamicPlayerBgEnabled(bool val) => _prefs.setBool(_keyDynamicPlayerBg, val);

  // Preferred Authorized Video Provider ('auto' or specific providerId)
  String getPreferredVideoProvider() => _prefs.getString(_keyPreferredVideoProvider) ?? 'auto';
  Future<void> setPreferredVideoProvider(String providerId) =>
      _prefs.setString(_keyPreferredVideoProvider, providerId);

  // Video Watch Progress & Resume Positions
  Map<String, WatchProgress> getAllWatchProgress() {
    try {
      final raw = _prefs.getString(_keyVideoWatchProgress);
      if (raw != null && raw.isNotEmpty) {
        final decoded = json.decode(raw);
        if (decoded is Map) {
          final result = <String, WatchProgress>{};
          decoded.forEach((key, value) {
            if (key != null && value is Map) {
              result[key.toString()] = WatchProgress.fromJson(Map<String, dynamic>.from(value));
            }
          });
          return result;
        }
      }
    } catch (_) {}
    return {};
  }

  WatchProgress? getWatchProgress(String contentId, {int? season, int? episode}) {
    final all = getAllWatchProgress();
    final key = WatchProgress.buildKey(contentId, season: season, episode: episode);
    return all[key];
  }

  List<WatchProgress> getRecentWatchProgress({int limit = 20}) {
    final items = getAllWatchProgress().values.toList()
      ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    return items.take(limit).toList();
  }

  Future<void> saveWatchProgress(WatchProgress progress) async {
    final all = getAllWatchProgress();
    all[progress.storageKey] = progress;
    // Keep most recent 50 progress entries
    if (all.length > 50) {
      final sortedKeys = all.entries.toList()
        ..sort((a, b) => b.value.updatedAt.compareTo(a.value.updatedAt));
      final trimmed = <String, WatchProgress>{};
      for (final entry in sortedKeys.take(50)) {
        trimmed[entry.key] = entry.value;
      }
      final encoded = json.encode(trimmed.map((k, v) => MapEntry(k, v.toJson())));
      await _prefs.setString(_keyVideoWatchProgress, encoded);
      return;
    }
    final encoded = json.encode(all.map((k, v) => MapEntry(k, v.toJson())));
    await _prefs.setString(_keyVideoWatchProgress, encoded);
  }

  Future<void> removeWatchProgress(String contentId, {int? season, int? episode}) async {
    final all = getAllWatchProgress();
    all.remove(WatchProgress.buildKey(contentId, season: season, episode: episode));
    final encoded = json.encode(all.map((k, v) => MapEntry(k, v.toJson())));
    await _prefs.setString(_keyVideoWatchProgress, encoded);
  }

  // Preference Profile
  UserPreferenceProfile getPreferenceProfile() {
    try {
      final raw = _prefs.getString(_keyProfile);
      if (raw != null) {
        final Map<String, dynamic> data = json.decode(raw);
        return UserPreferenceProfile.fromJson(data);
      }
    } catch (_) {}
    return UserPreferenceProfile.createDefault();
  }

  Future<void> savePreferenceProfile(UserPreferenceProfile profile) async {
    final raw = json.encode(profile.toJson());
    await _prefs.setString(_keyProfile, raw);
  }

  // Clear all for Setup Wizard or Reset
  Future<void> clearAll() async {
    await _prefs.clear();
  }
}
