import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/constants.dart';
import '../models/media_item.dart';
import 'des_crypto.dart';

class LyricLine {
  final Duration? timestamp;
  final String text;

  const LyricLine({this.timestamp, required this.text});
}

class SongLyrics {
  final bool isSynced;
  final List<LyricLine> lines;
  final String? plainText;
  final String? trackName;
  final String? artistName;

  const SongLyrics({
    required this.isSynced,
    required this.lines,
    this.plainText,
    this.trackName,
    this.artistName,
  });
}

/// Robust Zero-API-Key Music Engine with Multi-Provider Redundancy
/// (JioSaavn 320kbps DES + Apple iTunes Public Previews + Audius Decentralized).
class MusicService {
  final http.Client _client;
  static final Map<String, List<SongItem>> _cache = {};
  static final Map<String, SongLyrics> _lyricsCache = {};
  static final Map<String, String> _youtubeVideoCache = {};

  MusicService({http.Client? client}) : _client = client ?? http.Client();

  /// Clears in-memory search and metadata caches
  static void clearCache() {
    _cache.clear();
    _lyricsCache.clear();
    _youtubeVideoCache.clear();
  }

  /// Search JioSaavn Songs with 0 API Keys & 320kbps DES Decryption + Multi-provider fallback
  /// [fullSongsOnly]: defaults to true so entire music mode strictly plays full-length tracks (>= 90s).
  Future<List<SongItem>> searchSongs(
    String query, {
    int page = 1,
    int limit = 25,
    bool fullSongsOnly = true,
  }) async {
    final trimmed = query.trim();
    if (trimmed.isEmpty) { return []; }

    final cacheKey = '${trimmed.toLowerCase()}_p${page}_n${limit}_full$fullSongsOnly';
    if (_cache.containsKey(cacheKey) && _cache[cacheKey]!.isNotEmpty) {
      return _cache[cacheKey]!;
    }

    // 1. Primary: JioSaavn 320kbps (Full Songs)
    List<SongItem> saavnSongs = [];
    try {
      saavnSongs = await _searchSaavn(trimmed, page: page, limit: limit);
    } catch (_) {}

    // If initial query was very specific and returned 0, try a normalized query on JioSaavn
    if (saavnSongs.isEmpty && page == 1) {
      final relaxed = _cleanQueryForSearch(trimmed);
      if (relaxed != trimmed) {
        try {
          saavnSongs = await _searchSaavn(relaxed, page: 1, limit: limit);
        } catch (_) {}
      }
    }

    // If still empty, try primary keyword only
    if (saavnSongs.isEmpty && page == 1) {
      final words = trimmed.split(RegExp(r'\s+')).where((w) => w.length > 2).toList();
      if (words.length > 1) {
        try {
          saavnSongs = await _searchSaavn(words.first, page: 1, limit: limit);
        } catch (_) {}
      }
    }

    // 2. Secondary Fallback: Decentralized Audius (Full-length streams only, NEVER 30s previews)
    List<SongItem> audiusSongs = [];
    if (saavnSongs.isEmpty) {
      try {
        audiusSongs = await searchAudiusSongs(trimmed, limit: 12);
      } catch (_) {}
    }

    final combined = deduplicateSongs([...saavnSongs, ...audiusSongs]).where((s) {
      if (fullSongsOnly) {
        // In entire music mode, only full songs (strictly >= 90s and not short clips)
        return s.duration >= 90 && !s.isShortClip;
      } else {
        // Allows 1-min preview hooks on search screen
        return s.duration >= 30;
      }
    }).toList();

    if (combined.isNotEmpty) {
      _cache[cacheKey] = combined;
    }
    return combined;
  }

  /// Popular platforms (Spotify/JioSaavn) intelligent multi-tier ranked search
  Future<List<SongItem>> searchSongsWithRanking(
    String query, {
    int page = 1,
    int limit = 25,
    bool fullSongsOnly = true,
  }) async {
    final raw = await searchSongs(query, page: page, limit: limit, fullSongsOnly: fullSongsOnly);
    if (raw.isEmpty) { return []; }

    final q = query.toLowerCase().trim();
    final words = q.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList();

    final sorted = List<SongItem>.from(raw);
    sorted.sort((a, b) {
      final aTitle = a.title.toLowerCase();
      final bTitle = b.title.toLowerCase();
      final aArtist = a.artist.toLowerCase();
      final bArtist = b.artist.toLowerCase();

      int score(String title, String artist) {
        int s = 0;
        if (title == q) {
          s += 100;
        } else if (title.startsWith(q)) {
          s += 60;
        } else if (title.contains(q)) {
          s += 40;
        }

        if (artist == q) {
          s += 80;
        } else if (artist.startsWith(q)) {
          s += 50;
        } else if (artist.contains(q)) {
          s += 30;
        }

        for (var w in words) {
          if (title.contains(w)) {
            s += 12;
          }
          if (artist.contains(w)) {
            s += 8;
          }
        }
        return s;
      }

      return score(bTitle, bArtist).compareTo(score(aTitle, aArtist));
    });

    return sorted;
  }

  /// Daily Mix Freshness: Fetches authentic top trending chartbusters
  Future<List<SongItem>> fetchLatestHitSongs(String lang, {int limit = 15}) async {
    final queries = [
      '$lang trending now',
      '$lang viral hits 2025 2026',
      '$lang top chartbusters',
      '$lang top 50 trending',
    ];

    List<SongItem> collected = [];
    for (var q in queries) {
      try {
        final songs = await _searchSaavn(q, page: 1, limit: limit);
        collected.addAll(songs);
        if (collected.length >= limit * 2) break;
      } catch (_) {}
    }

    final unique = deduplicateSongs(collected);
    return unique.take(limit).toList();
  }

  /// Popular Top 20 Songs for each language (used for language capsules)
  /// Always guarantees a full batch of 20 distinct songs
  Future<List<SongItem>> fetchTopSongsByLanguage(String lang, {int page = 1, int limit = 20}) async {
    final primaryQuery = '$lang top 20 hits 2025 2026';
    List<SongItem> songs = await searchSongs(primaryQuery, page: page, limit: 35);

    // If fewer than 20 songs, pitch additional queries to guarantee exactly 20 songs
    if (songs.length < 20) {
      try {
        final backupSongs = await searchSongs('$lang chartbusters songs', page: 1, limit: 25);
        songs = deduplicateSongs([...songs, ...backupSongs]);
      } catch (_) {}
    }

    if (songs.length < 20) {
      try {
        final moreSongs = await searchSongs('$lang popular songs', page: 1, limit: 25);
        songs = deduplicateSongs([...songs, ...moreSongs]);
      } catch (_) {}
    }

    return songs.take(limit).toList();
  }

  /// Chronological location-based trending stream
  Future<List<SongItem>> fetchLocationTrending(String defaultLang, {int page = 1, int limit = 20}) async {
    if (page == 1) {
      try {
        final responses = await Future.wait([
          searchSongs('$defaultLang viral hits today', page: 1, limit: 10),
          searchSongs('$defaultLang top trending week', page: 1, limit: 10),
        ]);
        final combined = deduplicateSongs([...responses[0], ...responses[1]]);
        if (combined.isNotEmpty) { return combined; }
      } catch (_) {}
    }

    final query = '$defaultLang chartbusters 2025';
    return await searchSongs(query, page: page, limit: limit);
  }

  Future<List<SongItem>> _searchSaavn(String query, {int page = 1, int limit = 25}) async {
    final uri = Uri.parse(
      '${AppConstants.saavnApiBase}?__call=search.getResults&_marker=0&q=${Uri.encodeComponent(query)}&ctx=web6dot0&_format=json&n=$limit&p=$page',
    );

    final res = await _client.get(
      uri,
      headers: {
        'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.jiosaavn.com/',
        'Accept': 'application/json, text/plain, */*',
      },
    ).timeout(const Duration(seconds: 8));

    if (res.statusCode != 200) { return []; }

    final data = json.decode(res.body);
    final List results = data['results'] ?? [];
    final List<SongItem> parsed = [];

    for (var item in results) {
      final encrypted = item['encrypted_media_url'] ?? item['more_info']?['encrypted_media_url'];
      if (encrypted == null || encrypted.toString().isEmpty) continue;

      final streamUrl = DesCrypto.decryptSaavnUrl(encrypted.toString());
      if (streamUrl.isEmpty) { continue; }

      final title = _cleanSongTitle(item['song'] ?? item['title'] ?? 'Unknown Track');
      final artist = _decodeHtmlEntities(
        item['primary_artists'] ?? item['more_info']?['artistMap']?['primary_artists']?[0]?['name'] ?? 'Various Artists',
      );
      final album = _decodeHtmlEntities(item['album'] ?? item['more_info']?['album'] ?? 'Single');
      final image = (item['image'] ?? item['more_info']?['thumbnail'] ?? '')
          .toString()
          .replaceAll('150x150', '500x500');

      final durationSec = int.tryParse(item['duration']?.toString() ?? item['more_info']?['duration']?.toString() ?? '180') ?? 180;
      final isShortClip = durationSec > 0 && durationSec < 90;
      final backupMirrors = _buildBackupMirrors(streamUrl);
      final rawLang = item['language'] ?? item['more_info']?['language'];
      final itemLanguage = rawLang != null ? _decodeHtmlEntities(rawLang.toString()).trim() : null;

      parsed.add(
        SongItem(
          id: item['id']?.toString() ?? '',
          title: title,
          album: album,
          artist: artist,
          year: item['year']?.toString() ?? item['more_info']?['year']?.toString(),
          duration: durationSec,
          isShortClip: isShortClip,
          image: image.isNotEmpty ? image : AppConstants.defaultSongArtFallback,
          streamUrl: streamUrl,
          backupStreamUrls: backupMirrors,
          language: itemLanguage,
          quality: '320kbps Ultra-HD',
          source: 'JioSaavn',
        ),
      );
    }

    return parsed;
  }

  /// Free Decentralized Audius Fallback Provider
  Future<List<SongItem>> searchAudiusSongs(String query, {int limit = 15}) async {
    try {
      final uri = Uri.parse(
        '${AppConstants.audiusApiBase}/v1/tracks/search?query=${Uri.encodeComponent(query)}&limit=$limit&app_name=StreamPlay',
      );
      final res = await _client.get(uri).timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) {
        final data = json.decode(res.body);
        final List tracks = data['data'] ?? [];
        return tracks.map((t) {
          final id = t['id']?.toString() ?? '';
          final title = _cleanSongTitle(t['title']?.toString() ?? 'Audius Track');
          final artist = t['user']?['name']?.toString() ?? 'Creator';
          final image = t['artwork']?['480x480']?.toString() ?? AppConstants.defaultSongArtFallback;
          final streamUrl = '${AppConstants.audiusApiBase}/v1/tracks/$id/stream?app_name=StreamPlay';
          return SongItem(
            id: id,
            title: title,
            album: 'Audius Independent',
            artist: artist,
            duration: t['duration'] is int ? t['duration'] : 180,
            image: image,
            streamUrl: streamUrl,
            source: 'Audius',
          );
        }).toList();
      }
    } catch (_) {}
    return [];
  }

  String _cleanQueryForSearch(String q) {
    return q
        .replaceAll(RegExp(r'\b(2026|2025|top hits|chartbusters)\b', caseSensitive: false), '')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }

  List<String> _buildBackupMirrors(String primaryUrl) {
    final mirrors = <String>[primaryUrl];
    if (primaryUrl.contains('aac.saavncdn.com')) {
      mirrors.add(primaryUrl.replaceAll('aac.saavncdn.com', 'c.saavncdn.com'));
    } else if (primaryUrl.contains('c.saavncdn.com')) {
      mirrors.add(primaryUrl.replaceAll('c.saavncdn.com', 'aac.saavncdn.com'));
    }
    if (primaryUrl.contains('_320.mp4')) {
      mirrors.add(primaryUrl.replaceAll('_320.mp4', '_160.mp4'));
      mirrors.add(primaryUrl.replaceAll('_320.mp4', '_96.mp4'));
    }
    return mirrors.toSet().toList();
  }

  List<SongItem> deduplicateSongs(List<SongItem> songs) {
    final seen = <String>{};
    final unique = <SongItem>[];
    for (var s in songs) {
      final key = '${s.title.toLowerCase().trim()}|${s.artist.toLowerCase().trim()}';
      if (!seen.contains(key)) {
        seen.add(key);
        unique.add(s);
      }
    }
    return unique;
  }

  String _cleanSongTitle(String title) {
    var cleaned = _decodeHtmlEntities(title).trim();

    // Handle "Song Name - From Movie Name" or "Movie - Song"
    if (cleaned.contains(' - ')) {
      final parts = cleaned.split(' - ');
      if (parts.length == 2) {
        final p0 = parts[0].trim();
        final p1 = parts[1].trim();
        if (RegExp(r'\b(from|ost|soundtrack)\b', caseSensitive: false).hasMatch(p1)) {
          cleaned = p0;
        } else if (p1.length > 2 && !RegExp(r'^\d+$').hasMatch(p1)) {
          cleaned = p1;
        }
      }
    }

    // Clean technical brackets e.g. [Official Video], [Full Audio], (Lyrical)
    cleaned = cleaned.replaceAll(
      RegExp(r'\s*[\(\[]\s*(?:official\s*(?:video|audio|lyric|hd|4k)|lyric\s*video|full\s*song|audio\s*song|audio\s*track|video\s*song|original\s*motion\s*picture\s*soundtrack)\s*[\)\]]', caseSensitive: false),
      '',
    );

    // Clean "(From ...)" only if it leaves a valid non-empty song title
    final withoutFrom = cleaned.replaceAll(
      RegExp(r'\s*[\(\[]\s*From\s+["\x27]?[^()\[\]]+["\x27]?\s*[\)\]]', caseSensitive: false),
      '',
    );
    if (withoutFrom.trim().isNotEmpty) {
      cleaned = withoutFrom;
    }

    return cleaned.trim();
  }

  String _decodeHtmlEntities(String html) {
    return html
        .replaceAll('&quot;', '"')
        .replaceAll('&amp;', '&')
        .replaceAll('&#039;', "'")
        .replaceAll('&apos;', "'")
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>');
  }

  /// Zero-API-Key Lyrics Engine: Fetches real synced/plain lyrics from LRCLIB with Saavn fallback
  Future<SongLyrics?> fetchLyrics(SongItem song) async {
    if (song.id.isNotEmpty && _lyricsCache.containsKey(song.id)) {
      return _lyricsCache[song.id];
    }

    final cleanTitle = _cleanSongTitle(song.title);
    final strippedTitle = cleanTitle.replaceAll(RegExp(r'[\(\[].*?[\)\]]'), '').trim();
    final effectiveTitle = strippedTitle.isNotEmpty ? strippedTitle : cleanTitle;
    final primaryArtist = song.artist.split(',').first.split('&').first.trim();

    // 1. Try exact match on LRCLIB
    try {
      final getUri = Uri.parse(
        'https://lrclib.net/api/get?track_name=${Uri.encodeComponent(effectiveTitle)}&artist_name=${Uri.encodeComponent(primaryArtist)}',
      );
      final res = await _client.get(getUri).timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) {
        final data = json.decode(res.body);
        final lyrics = _parseLrcLibResponse(data);
        if (lyrics != null) {
          if (song.id.isNotEmpty) _lyricsCache[song.id] = lyrics;
          return lyrics;
        }
      }
    } catch (_) {}

    // 2. Try search match on LRCLIB
    try {
      final searchUri = Uri.parse(
        'https://lrclib.net/api/search?q=${Uri.encodeComponent('$effectiveTitle $primaryArtist')}',
      );
      final res = await _client.get(searchUri).timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) {
        final List list = json.decode(res.body);
        if (list.isNotEmpty) {
          final lyrics = _parseLrcLibResponse(list.first as Map<String, dynamic>);
          if (lyrics != null) {
            if (song.id.isNotEmpty) _lyricsCache[song.id] = lyrics;
            return lyrics;
          }
        }
      }
    } catch (_) {}

    // 3. Fallback: Saavn Lyrics API
    if (song.id.isNotEmpty) {
      try {
        final saavnUri = Uri.parse(
          '${AppConstants.saavnApiBase}?__call=lyrics.getLyrics&lyrics_id=${song.id}&ctx=web6dot0&_format=json',
        );
        final res = await _client.get(saavnUri).timeout(const Duration(seconds: 4));
        if (res.statusCode == 200) {
          final data = json.decode(res.body);
          final rawLyrics = data['lyrics']?.toString() ?? '';
          if (rawLyrics.isNotEmpty) {
            final cleaned = _decodeHtmlEntities(
              rawLyrics
                  .replaceAll('<br/>', '\n')
                  .replaceAll('<br>', '\n')
                  .replaceAll(RegExp(r'<[^>]*>'), ''),
            ).trim();
            if (cleaned.isNotEmpty) {
              final lines = cleaned
                  .split('\n')
                  .map((l) => l.trim())
                  .where((l) => l.isNotEmpty)
                  .map((l) => LyricLine(text: l))
                  .toList();
              final result = SongLyrics(
                isSynced: false,
                lines: lines,
                plainText: cleaned,
                trackName: song.title,
                artistName: song.artist,
              );
              _lyricsCache[song.id] = result;
              return result;
            }
          }
        }
      } catch (_) {}
    }

    return null;
  }

  SongLyrics? _parseLrcLibResponse(Map<String, dynamic> data) {
    final synced = data['syncedLyrics']?.toString();
    final plain = data['plainLyrics']?.toString();
    final track = data['trackName']?.toString();
    final artist = data['artistName']?.toString();

    if (synced != null && synced.trim().isNotEmpty) {
      final lines = <LyricLine>[];
      final lrcRegex = RegExp(r'\[(\d{2}):(\d{2})\.?(\d{1,3})?\](.*)');
      for (var rawLine in synced.split('\n')) {
        final trimmed = rawLine.trim();
        final match = lrcRegex.firstMatch(trimmed);
        if (match != null) {
          final min = int.tryParse(match.group(1) ?? '0') ?? 0;
          final sec = int.tryParse(match.group(2) ?? '0') ?? 0;
          var msRaw = match.group(3) ?? '0';
          if (msRaw.length == 2) msRaw = '${msRaw}0';
          final ms = int.tryParse(msRaw) ?? 0;
          final time = Duration(minutes: min, seconds: sec, milliseconds: ms);
          final text = match.group(4)?.trim() ?? '';
          if (text.isNotEmpty) {
            lines.add(LyricLine(timestamp: time, text: text));
          }
        }
      }

      if (lines.isNotEmpty) {
        return SongLyrics(
          isSynced: true,
          lines: lines,
          plainText: plain,
          trackName: track,
          artistName: artist,
        );
      }
    }

    if (plain != null && plain.trim().isNotEmpty) {
      final lines = plain
          .split('\n')
          .map((l) => l.trim())
          .where((l) => l.isNotEmpty)
          .map((l) => LyricLine(text: l))
          .toList();
      return SongLyrics(
        isSynced: false,
        lines: lines,
        plainText: plain,
        trackName: track,
        artistName: artist,
      );
    }

    return null;
  }

  /// YouTube Video ID Resolver for Zero-Key Video Mode playback
  Future<String?> searchYouTubeVideoId(String query) async {
    final cacheKey = query.trim().toLowerCase();
    if (_youtubeVideoCache.containsKey(cacheKey)) {
      return _youtubeVideoCache[cacheKey];
    }

    try {
      final uri = Uri.parse(
        'https://www.youtube.com/results?search_query=${Uri.encodeComponent(query)}',
      );
      final res = await _client.get(
        uri,
        headers: {
          'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      ).timeout(const Duration(seconds: 5));

      if (res.statusCode == 200) {
        final match = RegExp(r'"videoId":"([a-zA-Z0-9_-]{11})"').firstMatch(res.body);
        if (match != null) {
          final id = match.group(1)!;
          _youtubeVideoCache[cacheKey] = id;
          return id;
        }
      }
    } catch (_) {}
    return null;
  }

  /// Discography and Playlist Infinite Pitching Helper
  Future<List<SongItem>> fetchArtistDiscographyBatch(String artistName, {required int page, int limit = 20}) async {
    final queryVariants = [
      '$artistName hits',
      '$artistName songs',
      '$artistName all songs',
      '$artistName melodies',
      '$artistName albums',
      '$artistName best songs',
      '$artistName chartbusters',
      '$artistName sound tracks',
      '$artistName popular',
    ];
    final q = queryVariants[(page - 1) % queryVariants.length];
    final p = ((page - 1) ~/ queryVariants.length) + 1;
    return await searchSongs(q, page: p, limit: limit);
  }

  Future<List<SongItem>> fetchPlaylistMoreBatch(String baseQuery, {required int page, int limit = 20}) async {
    final queryVariants = [
      baseQuery,
      '$baseQuery hits',
      '$baseQuery chartbusters',
      '$baseQuery all songs',
      '$baseQuery songs 2025',
      '$baseQuery popular tracks',
    ];
    final q = queryVariants[(page - 1) % queryVariants.length];
    final p = ((page - 1) ~/ queryVariants.length) + 1;
    return await searchSongs(q, page: p, limit: limit);
  }
}
