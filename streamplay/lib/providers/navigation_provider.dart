import 'package:flutter/material.dart';
import '../services/storage_service.dart';

enum AppMode { movies, music }
enum ScreenName { home, search, playlist, profile, watchlater, details }

class NavigationProvider with ChangeNotifier {
  final StorageService _storage;

  AppMode _appMode = AppMode.movies;
  ScreenName _activeScreen = ScreenName.home;

  String _selectedOTT = 'All';
  String _selectedLanguage = 'All';
  String _activeCategory = 'All';
  bool _isFilterSheetOpen = false;

  NavigationProvider(this._storage) {
    final savedMode = _storage.getAppMode();
    _appMode = savedMode == 'music' ? AppMode.music : AppMode.movies;
  }

  AppMode get appMode => _appMode;
  ScreenName get activeScreen => _activeScreen;
  String get selectedOTT => _selectedOTT;
  String get selectedLanguage => _selectedLanguage;
  String get activeCategory => _activeCategory;
  bool get isFilterSheetOpen => _isFilterSheetOpen;

  bool get isFiltered =>
      _selectedOTT != 'All' || _selectedLanguage != 'All' || _activeCategory != 'All';

  void setAppMode(AppMode mode) {
    if (_appMode != mode) {
      _appMode = mode;
      _storage.setAppMode(mode == AppMode.movies ? 'movies' : 'music');
      notifyListeners();
    }
  }

  void toggleAppMode() {
    setAppMode(_appMode == AppMode.movies ? AppMode.music : AppMode.movies);
  }

  void setActiveScreen(ScreenName screen) {
    if (_activeScreen != screen) {
      _activeScreen = screen;
      notifyListeners();
    }
  }

  void setSelectedOTT(String ott) {
    _selectedOTT = ott;
    notifyListeners();
  }

  void setSelectedLanguage(String lang) {
    _selectedLanguage = lang;
    notifyListeners();
  }

  void setActiveCategory(String cat) {
    _activeCategory = cat;
    notifyListeners();
  }

  void openFilterSheet() {
    _isFilterSheetOpen = true;
    notifyListeners();
  }

  void closeFilterSheet() {
    _isFilterSheetOpen = false;
    notifyListeners();
  }

  void resetFiltersAndGoHome() {
    _selectedOTT = 'All';
    _selectedLanguage = 'All';
    _activeCategory = 'All';
    _activeScreen = ScreenName.home;
    notifyListeners();
  }
}

