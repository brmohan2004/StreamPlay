import 'package:flutter/painting.dart';
import '../config/constants.dart';

class EpisodeItem {
  final String id;
  final String name;
  final int season;
  final int number;
  final String? overview;
  final String? thumbnail;
  final double? rating;
  final String? released;

  EpisodeItem({
    required this.id,
    required this.name,
    required this.season,
    required this.number,
    this.overview,
    this.thumbnail,
    this.rating,
    this.released,
  });

  factory EpisodeItem.fromJson(Map<String, dynamic> json) {
    return EpisodeItem(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Episode',
      season: json['season'] is int
          ? json['season']
          : int.tryParse(json['season']?.toString() ?? '1') ?? 1,
      number: json['number'] is int
          ? json['number']
          : int.tryParse(json['number']?.toString() ?? '1') ?? 1,
      overview: json['overview']?.toString(),
      thumbnail: json['thumbnail']?.toString(),
      rating: json['rating'] != null ? (double.tryParse(json['rating'].toString()) ?? 0.0) : null,
      released: json['released']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'season': season,
      'number': number,
      'overview': overview,
      'thumbnail': thumbnail,
      'rating': rating,
      'released': released,
    };
  }
}

class MovieItem {
  final String id;
  final String name;
  final String type; // 'movie' or 'series'
  final String poster;
  final String? background;
  final String? description;
  final String? releaseInfo;
  final String? imdbRating;
  final List<String> genres;
  final String? ottProvider;
  final List<String>? cast;
  final String? runtime;
  final String? trailer;
  final List<EpisodeItem>? videos;
  final bool isTheaterPrint;
  final String? language;
  final String? released;
  final String? recReason; // For recommendation engine attribution

  MovieItem({
    required this.id,
    required this.name,
    this.type = 'movie',
    required this.poster,
    this.background,
    this.description,
    this.releaseInfo,
    this.imdbRating,
    this.genres = const [],
    this.ottProvider,
    this.cast,
    this.runtime,
    this.trailer,
    this.videos,
    this.isTheaterPrint = false,
    this.language,
    this.released,
    this.recReason,
  });

  MovieItem copyWith({
    String? recReason,
    bool? isTheaterPrint,
    String? ottProvider,
  }) {
    return MovieItem(
      id: id,
      name: name,
      type: type,
      poster: poster,
      background: background,
      description: description,
      releaseInfo: releaseInfo,
      imdbRating: imdbRating,
      genres: genres,
      ottProvider: ottProvider ?? this.ottProvider,
      cast: cast,
      runtime: runtime,
      trailer: trailer,
      videos: videos,
      isTheaterPrint: isTheaterPrint ?? this.isTheaterPrint,
      language: language,
      released: released,
      recReason: recReason ?? this.recReason,
    );
  }

  factory MovieItem.fromJson(Map<String, dynamic> json) {
    var rawGenres = json['genres'];
    List<String> parsedGenres = [];
    if (rawGenres is List) {
      parsedGenres = rawGenres.map((e) => e.toString()).toList();
    }

    var rawCast = json['cast'];
    List<String>? parsedCast;
    if (rawCast is List) {
      parsedCast = rawCast.map((e) => e.toString()).toList();
    }

    var rawVideos = json['videos'];
    List<EpisodeItem>? parsedVideos;
    if (rawVideos is List) {
      parsedVideos = rawVideos.map((e) => EpisodeItem.fromJson(e as Map<String, dynamic>)).toList();
    }

    return MovieItem(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Untitled',
      type: json['type']?.toString() ?? 'movie',
      poster: (json['poster']?.toString().isNotEmpty ?? false)
          ? json['poster'].toString()
          : AppConstants.defaultPosterFallback,
      background: json['background']?.toString(),
      description: json['description']?.toString() ?? 'Watch now on StreamPlay in high quality.',
      releaseInfo: json['releaseInfo']?.toString() ?? json['year']?.toString(),
      imdbRating: json['imdbRating']?.toString(),
      genres: parsedGenres,
      ottProvider: json['ottProvider']?.toString(),
      cast: parsedCast,
      runtime: json['runtime']?.toString(),
      trailer: json['trailer']?.toString(),
      videos: parsedVideos,
      isTheaterPrint: json['isTheaterPrint'] == true,
      language: json['language']?.toString(),
      released: json['released']?.toString(),
      recReason: json['recReason']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'type': type,
      'poster': poster,
      'background': background,
      'description': description,
      'releaseInfo': releaseInfo,
      'imdbRating': imdbRating,
      'genres': genres,
      'ottProvider': ottProvider,
      'cast': cast,
      'runtime': runtime,
      'trailer': trailer,
      'videos': videos?.map((v) => v.toJson()).toList(),
      'isTheaterPrint': isTheaterPrint,
      'language': language,
      'released': released,
      'recReason': recReason,
    };
  }
}

class SongItem {
  final String id;
  final String title;
  final String album;
  final String artist;
  final String? year;
  final int duration; // in seconds
  final String image;
  final String streamUrl;
  final List<String> backupStreamUrls;
  final String? videoUrl;
  final bool isVideo;
  final String? language;
  final String accentColor;
  final String quality;
  final bool isShortClip;
  final String? starring;
  final String? singers;
  final String? composer;
  final String source;

  SongItem({
    required this.id,
    required this.title,
    required this.album,
    required this.artist,
    this.year,
    this.duration = 180,
    required this.image,
    required this.streamUrl,
    this.backupStreamUrls = const [],
    this.videoUrl,
    this.isVideo = false,
    this.language,
    this.accentColor = '#00B4FF',
    this.quality = '320kbps Ultra-HD',
    this.isShortClip = false,
    this.starring,
    this.singers,
    this.composer,
    this.source = 'JioSaavn',
  });

  factory SongItem.fromJson(Map<String, dynamic> json) {
    var rawBackups = json['backupStreamUrls'];
    List<String> parsedBackups = [];
    if (rawBackups is List) {
      parsedBackups = rawBackups.map((e) => e.toString()).toList();
    }

    return SongItem(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Unknown Track',
      album: json['album']?.toString() ?? 'Single',
      artist: json['artist']?.toString() ?? 'Various Artists',
      year: json['year']?.toString(),
      duration: json['duration'] is int
          ? json['duration']
          : int.tryParse(json['duration']?.toString() ?? '180') ?? 180,
      image: (json['image']?.toString().isNotEmpty ?? false)
          ? json['image'].toString()
          : AppConstants.defaultSongArtFallback,
      streamUrl: json['streamUrl']?.toString() ?? '',
      backupStreamUrls: parsedBackups,
      videoUrl: json['videoUrl']?.toString(),
      isVideo: json['isVideo'] == true,
      language: json['language']?.toString(),
      accentColor: json['accentColor']?.toString() ?? '#00B4FF',
      quality: json['quality']?.toString() ?? '320kbps Ultra-HD',
      isShortClip: json['isShortClip'] == true,
      starring: json['starring']?.toString(),
      singers: json['singers']?.toString(),
      composer: json['composer']?.toString(),
      source: json['source']?.toString() ?? 'JioSaavn',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'album': album,
      'artist': artist,
      'year': year,
      'duration': duration,
      'image': image,
      'streamUrl': streamUrl,
      'backupStreamUrls': backupStreamUrls,
      'videoUrl': videoUrl,
      'isVideo': isVideo,
      'language': language,
      'accentColor': accentColor,
      'quality': quality,
      'isShortClip': isShortClip,
      'starring': starring,
      'singers': singers,
      'composer': composer,
      'source': source,
    };
  }
}

class Playlist {
  final String id;
  final String name;
  final String? description;
  final String? coverImage;
  final List<SongItem> songs;
  final String createdAt;

  Playlist({
    required this.id,
    required this.name,
    this.description,
    this.coverImage,
    required this.songs,
    required this.createdAt,
  });

  Playlist copyWith({
    String? name,
    String? description,
    String? coverImage,
    List<SongItem>? songs,
  }) {
    return Playlist(
      id: id,
      name: name ?? this.name,
      description: description ?? this.description,
      coverImage: coverImage ?? this.coverImage,
      songs: songs ?? this.songs,
      createdAt: createdAt,
    );
  }

  factory Playlist.fromJson(Map<String, dynamic> json) {
    var rawSongs = json['songs'];
    List<SongItem> parsedSongs = [];
    if (rawSongs is List) {
      parsedSongs = rawSongs.map((s) => SongItem.fromJson(s as Map<String, dynamic>)).toList();
    }

    return Playlist(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'My Playlist',
      description: json['description']?.toString(),
      coverImage: json['coverImage']?.toString(),
      songs: parsedSongs,
      createdAt: json['createdAt']?.toString() ?? DateTime.now().toIso8601String(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'coverImage': coverImage,
      'songs': songs.map((s) => s.toJson()).toList(),
      'createdAt': createdAt,
    };
  }
}

class PanoramaCollectionItem {
  final String title;
  final String imageUrl;
  final Gradient gradient;
  final String query;

  PanoramaCollectionItem({
    required this.title,
    required this.imageUrl,
    required this.gradient,
    required this.query,
  });
}

class ArtistItem {
  final String name;
  final String imageUrl;
  final String? subtext;

  ArtistItem({
    required this.name,
    required this.imageUrl,
    this.subtext,
  });
}
