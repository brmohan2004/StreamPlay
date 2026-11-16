import 'dart:async';
import 'package:just_audio/just_audio.dart';
import 'package:just_audio_background/just_audio_background.dart';
import '../models/media_item.dart';

/// OS-Level Integrated Audio Handler using ConcatenatingAudioSource
/// Powers Android MediaSessionCompat, Lock Screen, Control Center,
/// and Dynamic Island with native next/previous skip controls.
class AudioPlayerHandler {
  final AudioPlayer _player = AudioPlayer();

  SongItem? _currentSong;
  List<SongItem> _queue = [];
  int _currentIndex = -1;
  bool _isShuffle = false;
  ConcatenatingAudioSource? _playlistSource;

  AudioPlayerHandler() {
    _initListener();
  }

  AudioPlayer get player => _player;
  SongItem? get currentSong => _currentSong;
  List<SongItem> get queue => _queue;
  int get currentIndex => _currentIndex;
  bool get isShuffle => _isShuffle;
  bool get isPlaying => _player.playing;
  LoopMode get loopMode => _player.loopMode;
  double get speed => _player.speed;

  Stream<Duration> get positionStream => _player.positionStream;
  Stream<Duration?> get durationStream => _player.durationStream;
  Stream<PlayerState> get playerStateStream => _player.playerStateStream;
  Stream<bool> get playingStream => _player.playingStream;
  Stream<LoopMode> get loopModeStream => _player.loopModeStream;
  Stream<double> get speedStream => _player.speedStream;
  Stream<int?> get currentIndexStream => _player.currentIndexStream;

  Future<List<SongItem>> Function(SongItem currentSong)? onFetchRelatedSongs;
  Future<void> Function(int index, SongItem song, bool wasPlaying)? onTrackSwitched;
  bool _isAutoFetching = false;
  int _lastReportedIndex = -1;
  String _qualityPreference = '320k';

  void setAudioQualityPreference(String q) {
    _qualityPreference = q;
  }

  String _resolveUrlForQuality(String url, String qualityPreference) {
    if (!url.contains('.saavncdn.com')) return url;

    String targetSuffix = '_320.mp4';
    if (qualityPreference == '160k') {
      targetSuffix = '_160.mp4';
    } else if (qualityPreference == '96k') {
      targetSuffix = '_96.mp4';
    }

    return url.replaceAll(RegExp(r'_(96|160|320)\.(mp4|m4a)'), targetSuffix);
  }

  AudioSource _buildAudioSource(SongItem song) {
    final candidateUrls = [song.streamUrl, ...song.backupStreamUrls].where((u) => u.isNotEmpty).toList();
    final rawUrl = candidateUrls.isNotEmpty ? candidateUrls.first : song.streamUrl;
    final primaryUrl = _resolveUrlForQuality(rawUrl, _qualityPreference);
    final uri = Uri.parse(primaryUrl);
    final artUri = song.image.isNotEmpty ? Uri.tryParse(song.image) : null;

    return AudioSource.uri(
      uri,
      tag: MediaItem(
        id: song.id,
        album: song.album,
        title: song.title,
        artist: song.artist,
        artUri: artUri,
      ),
    );
  }

  void _initListener() {
    // 1. Listen for track changes directly from OS notification / next/prev skips
    _player.currentIndexStream.listen((index) async {
      if (index != null && index >= 0 && index < _queue.length) {
        final previousIndex = _currentIndex;
        final wasPlaying = _player.playing;

        _currentIndex = index;
        _currentSong = _queue[index];
        checkAndAutoExtendQueue();

        if (previousIndex != -1 && previousIndex != index && _lastReportedIndex != index) {
          _lastReportedIndex = index;
          if (onTrackSwitched != null) {
            await onTrackSwitched!(index, _queue[index], wasPlaying);
          }
        } else {
          _lastReportedIndex = index;
        }
      }
    });

    // 2. Continuous playback across tracks & repeat handling
    _player.playerStateStream.listen((state) async {
      if (state.processingState == ProcessingState.completed) {
        if (_player.loopMode == LoopMode.one) {
          await _player.seek(Duration.zero);
          await _player.play();
        } else if (_player.hasNext) {
          await _player.seekToNext();
          await _player.play();
        } else {
          // Reached end of current queue: auto-extend with related tracks or seamless continuous queue
          await checkAndAutoExtendQueue();
          if (_player.hasNext) {
            await _player.seekToNext();
            await _player.play();
          } else if (_queue.isNotEmpty) {
            await _player.seek(Duration.zero, index: 0);
            await _player.play();
          }
        }
      }
    });
  }

  Future<void> checkAndAutoExtendQueue() async {
    if (_isAutoFetching || onFetchRelatedSongs == null || _currentSong == null) return;
    if (_currentIndex >= _queue.length - 2 || _queue.length <= 1) {
      _isAutoFetching = true;
      try {
        final related = await onFetchRelatedSongs!(_currentSong!);
        if (related.isNotEmpty) {
          await appendToQueue(related);
        }
      } catch (_) {} finally {
        _isAutoFetching = false;
      }
    }
  }

  Future<void> appendToQueue(List<SongItem> newSongs) async {
    final existingIds = _queue.map((s) => s.id).toSet();
    final unique = newSongs.where((s) => !existingIds.contains(s.id)).toList();
    if (unique.isEmpty) return;

    _queue.addAll(unique);
    if (_playlistSource != null) {
      try {
        final sources = unique.map(_buildAudioSource).toList();
        await _playlistSource!.addAll(sources);
      } catch (_) {}
    }
  }

  Future<void> prepareSong(SongItem song, [List<SongItem>? newQueue]) async {
    _currentSong = song;

    if (newQueue != null && newQueue.isNotEmpty) {
      _queue = List.from(newQueue);
      _currentIndex = _queue.indexWhere((s) => s.id == song.id);
      if (_currentIndex == -1) {
        _queue.insert(0, song);
        _currentIndex = 0;
      }
    } else if (_queue.isEmpty || !_queue.any((s) => s.id == song.id)) {
      _queue = [song];
      _currentIndex = 0;
    } else {
      _currentIndex = _queue.indexWhere((s) => s.id == song.id);
    }

    try {
      final sources = _queue.map(_buildAudioSource).toList();
      _playlistSource = ConcatenatingAudioSource(
        useLazyPreparation: true,
        shuffleOrder: DefaultShuffleOrder(),
        children: sources,
      );

      await _player.setAudioSource(
        _playlistSource!,
        initialIndex: _currentIndex,
        initialPosition: Duration.zero,
      );
      // Prepared in paused state without calling _player.play()
    } catch (_) {
      try {
        final singleSource = _buildAudioSource(song);
        await _player.setAudioSource(singleSource);
      } catch (_) {}
    }
  }

  Future<void> playSong(SongItem song, [List<SongItem>? newQueue]) async {
    _currentSong = song;

    if (newQueue != null && newQueue.isNotEmpty) {
      _queue = List.from(newQueue);
      _currentIndex = _queue.indexWhere((s) => s.id == song.id);
      if (_currentIndex == -1) {
        _queue.insert(0, song);
        _currentIndex = 0;
      }
    } else if (_queue.isEmpty || !_queue.any((s) => s.id == song.id)) {
      _queue = [song];
      _currentIndex = 0;
    } else {
      _currentIndex = _queue.indexWhere((s) => s.id == song.id);
    }

    await _loadQueueAndPlay(_currentIndex);
    if (_queue.length <= 1) {
      checkAndAutoExtendQueue();
    }
  }

  Future<void> _loadQueueAndPlay(int targetIndex) async {
    try {
      final sources = _queue.map(_buildAudioSource).toList();
      _playlistSource = ConcatenatingAudioSource(
        useLazyPreparation: true,
        shuffleOrder: DefaultShuffleOrder(),
        children: sources,
      );

      await _player.setAudioSource(
        _playlistSource!,
        initialIndex: targetIndex,
        initialPosition: Duration.zero,
      );
      await _player.play();
    } catch (_) {
      // Fallback single stream
      try {
        final singleSource = _buildAudioSource(_queue[targetIndex]);
        await _player.setAudioSource(singleSource);
        await _player.play();
      } catch (_) {}
    }
  }

  Future<void> pause() async {
    await _player.pause();
  }

  Future<void> resume() async {
    await _player.play();
  }

  Future<void> togglePlay() async {
    if (_player.processingState == ProcessingState.completed) {
      await _player.seek(Duration.zero);
      await _player.play();
    } else if (_player.playing) {
      await _player.pause();
    } else {
      await _player.play();
    }
  }

  Future<void> seek(Duration position) async {
    await _player.seek(position);
  }

  /// OS Next action & in-app next track
  Future<void> nextSong() async {
    if (_queue.isEmpty) return;

    if (_player.hasNext) {
      await _player.seekToNext();
    } else if (_queue.length > 1) {
      _currentIndex = 0;
      await _player.seek(Duration.zero, index: 0);
    }
    await _player.play();
  }

  /// OS Previous action & in-app prev track
  Future<void> prevSong() async {
    if (_queue.isEmpty) return;

    if (_player.position.inSeconds > 3) {
      await _player.seek(Duration.zero);
      await _player.play();
      return;
    }

    if (_player.hasPrevious) {
      await _player.seekToPrevious();
    } else if (_queue.length > 1) {
      _currentIndex = _queue.length - 1;
      await _player.seek(Duration.zero, index: _currentIndex);
    }
    await _player.play();
  }

  void toggleShuffle() {
    _isShuffle = !_isShuffle;
    _player.setShuffleModeEnabled(_isShuffle);
  }

  void toggleRepeat() {
    final current = _player.loopMode;
    if (current == LoopMode.off) {
      _player.setLoopMode(LoopMode.all);
    } else if (current == LoopMode.all) {
      _player.setLoopMode(LoopMode.one);
    } else {
      _player.setLoopMode(LoopMode.off);
    }
  }

  Future<void> setSpeed(double s) async {
    await _player.setSpeed(s);
  }

  /// Stops playback, clears queue, and dismisses player session
  Future<void> stopAndDismiss() async {
    await _player.stop();
    _currentSong = null;
    _currentIndex = -1;
    _queue = [];
  }

  Future<void> dispose() async {
    await _player.dispose();
  }
}
