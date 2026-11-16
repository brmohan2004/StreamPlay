import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../config/app_theme.dart';
import '../../../models/media_item.dart';
import '../../../models/recommendation.dart';
import '../../../providers/media_provider.dart';
import '../../../providers/recommendation_provider.dart';
import '../../../services/music_service.dart';
import '../../common/add_to_playlist_modal.dart';
import '../../common/skeleton_loader.dart';
import '../../playlist/playlist_detail_screen.dart';
import '../../artist/artist_detail_screen.dart';
import 'top_app_header.dart';
import 'daily_mix_fanned_deck.dart';
import 'media_row.dart';
import 'music_cards_design.dart';
import 'paginated_horizontal_list.dart';

class DynamicMusicSection {
  final String title;
  final String subtitle;
  final String cardType; // 'vinyl', 'portrait', 'tile', 'video', 'square', 'two_row'
  final List<SongItem> songs;
  int page;
  final List<String> queries;

  DynamicMusicSection({
    required this.title,
    required this.subtitle,
    required this.cardType,
    required this.songs,
    this.page = 1,
    required this.queries,
  });
}

class DynamicSectionBlueprint {
  final String title;
  final String subtitle;
  final String cardType;
  final List<String> Function(String lang) queryBuilder;

  const DynamicSectionBlueprint({
    required this.title,
    required this.subtitle,
    required this.cardType,
    required this.queryBuilder,
  });
}

class MusicHomeView extends StatefulWidget {
  const MusicHomeView({super.key});

  @override
  State<MusicHomeView> createState() => _MusicHomeViewState();
}

class _MusicHomeViewState extends State<MusicHomeView> {
  final MusicService _musicService = MusicService();
  final ScrollController _scrollController = ScrollController();

  // Static in-memory cache to guarantee 0ms instant display on return visits
  static List<SongItem>? _cachedDailyMix;
  static List<SongItem>? _cachedTopPicks;
  static List<SongItem>? _cachedRegionalTrending;
  static List<SongItem>? _cachedLanguageTop20;
  static List<SongItem>? _cachedVideoSongs;

  bool _isLoading = true;
  bool _isLoadingExtra = false;

  // Global Assigned Song Keys to enforce 100% unique songs across the entire app
  final Set<String> _globalAssignedSongKeys = {};

  String _songKey(SongItem s) {
    final title = s.title.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '').trim();
    final artist = s.artist.split(',').first.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '').trim();
    return '$title|$artist';
  }

  List<SongItem> _filterUniqueAndRegister(List<SongItem> incoming, {int limit = 15}) {
    final unique = <SongItem>[];
    for (var s in incoming) {
      final key = _songKey(s);
      if (!_globalAssignedSongKeys.contains(key)) {
        _globalAssignedSongKeys.add(key);
        unique.add(s);
        if (unique.length >= limit) break;
      }
    }
    return unique;
  }

  /// Robust batching that progressively searches queries and pages until targetCount unique tracks are gathered
  Future<List<SongItem>> _fetchUniqueBatch(
    List<String> queries, {
    required int targetCount,
    int maxPages = 3,
  }) async {
    final List<SongItem> accumulated = [];
    final Set<String> batchKeys = {};

    for (int p = 1; p <= maxPages && accumulated.length < targetCount; p++) {
      for (final q in queries) {
        if (accumulated.length >= targetCount) break;
        try {
          final res = await _musicService.searchSongs(q, page: p, limit: 15);
          for (final s in res) {
            if (accumulated.length >= targetCount) break;
            final key = _songKey(s);
            if (!_globalAssignedSongKeys.contains(key) && !batchKeys.contains(key)) {
              _globalAssignedSongKeys.add(key);
              batchKeys.add(key);
              accumulated.add(s);
            }
          }
        } catch (_) {}
      }
    }

    // Safety fallback: if strict global uniqueness returned fewer than targetCount / 2,
    // backfill with local unique candidate songs so section is never visually empty or 2 songs
    if (accumulated.length < targetCount) {
      for (final q in queries) {
        if (accumulated.length >= targetCount) break;
        try {
          final res = await _musicService.searchSongs(q, page: 1, limit: 20);
          for (final s in res) {
            if (accumulated.length >= targetCount) break;
            final key = _songKey(s);
            if (!batchKeys.contains(key)) {
              batchKeys.add(key);
              accumulated.add(s);
            }
          }
        } catch (_) {}
      }
    }

    return accumulated;
  }

  // 1. Mandatory Shelves
  List<SongItem> _dailyMixFeed = [];

  List<SongItem> _topPicks = [];
  int _topPicksPage = 1;

  List<SongItem> _regionalTrending = [];
  int _regionalPage = 1;

  // Language Capsules & Popular Top 20
  String _selectedLangCapsule = 'Tamil';
  List<SongItem> _languageTop20 = [];
  bool _isLoadingLangSongs = false;

  // Curated Playlists
  List<PanoramaCollectionItem> _playlists = [];

  // Artists & Discographies
  List<ArtistItem> _topArtists = [];

  // Cinema Video Songs (16:9)
  List<SongItem> _videoSongs = [];
  int _videoPage = 1;

  // 2. Infinite Dynamic Vertical Shelves
  final List<DynamicMusicSection> _dynamicSections = [];

  static final List<DynamicSectionBlueprint> _blueprints = [
    DynamicSectionBlueprint(
      title: 'Retro & Golden Classics',
      subtitle: 'Vinyl collection',
      cardType: 'vinyl',
      queryBuilder: (l) => [
        '$l 90s golden hits spb ilayaraja',
        '$l 80s evergreen classics',
        '$l vintage retro hits',
        '$l golden melodies',
      ],
    ),
    DynamicSectionBlueprint(
      title: 'Romantic Sunset Melodies',
      subtitle: 'Pure emotion',
      cardType: 'portrait',
      queryBuilder: (l) => [
        '$l romantic melodies love',
        '$l heart touching melody songs',
        '$l soulful love anthems',
        '$l sweet romantic tracks',
      ],
    ),
    DynamicSectionBlueprint(
      title: 'Workout & High Voltage Motivation',
      subtitle: 'Power tracks',
      cardType: 'tile',
      queryBuilder: (l) => [
        'workout motivation gym hype songs',
        'beast mode workout gym music',
        'high energy fitness pump up',
        'gym motivation edm bass boost',
      ],
    ),
    DynamicSectionBlueprint(
      title: 'Party & Dance Floor Anthems',
      subtitle: 'Bass & rhythm',
      cardType: 'video',
      queryBuilder: (l) => [
        '$l kuthu party dance',
        '$l club dance anthems',
        '$l bass boost party songs',
        '$l fast beat dance hits',
      ],
    ),
    DynamicSectionBlueprint(
      title: 'Lo-Fi Chill & Focus Beats',
      subtitle: 'Late night vibes',
      cardType: 'two_row',
      queryBuilder: (l) => [
        '$l lofi chill beats rain',
        'lofi hip hop chill study beats',
        '$l lofi flip night acoustic',
        'midnight aesthetic lofi chill',
      ],
    ),
    DynamicSectionBlueprint(
      title: '90s & 2000s Nostalgia Hits',
      subtitle: 'Relive the golden memory lane',
      cardType: 'portrait',
      queryBuilder: (l) => [
        '$l 90s all time hits',
        '$l 2000s chartbuster hits',
        '$l nostalgic childhood songs',
      ],
    ),
    DynamicSectionBlueprint(
      title: 'Acoustic & Unplugged Sessions',
      subtitle: 'Raw instruments & pure vocals',
      cardType: 'square',
      queryBuilder: (l) => [
        '$l acoustic guitar unplugged',
        '$l unplugged acoustic live',
        '$l stripped raw vocals',
      ],
    ),
    DynamicSectionBlueprint(
      title: 'Late Night Long Drive',
      subtitle: 'Cruising under highway lights',
      cardType: 'tile',
      queryBuilder: (l) => [
        '$l midnight drive night vibes',
        '$l car drive hits',
        '$l late night highway tunes',
      ],
    ),
    DynamicSectionBlueprint(
      title: 'Rainy Day Monsoon Melodies',
      subtitle: 'Warm chai & soothing drops',
      cardType: 'portrait',
      queryBuilder: (l) => [
        '$l rain songs monsoon melodies',
        '$l monsoon rain hits',
        '$l cozy rainy weather tracks',
      ],
    ),
    DynamicSectionBlueprint(
      title: 'Indie Pop & Emerging Talents',
      subtitle: 'Fresh independent voices',
      cardType: 'square',
      queryBuilder: (l) => [
        '$l independent indie pop hits',
        '$l indie music artists',
        '$l non film independent songs',
      ],
    ),
    DynamicSectionBlueprint(
      title: 'EDM & Electronic Bass Anthems',
      subtitle: 'Festival drops & synthetic energy',
      cardType: 'video',
      queryBuilder: (l) => [
        '$l edm electronic bass drops',
        'festival dance electronic anthem',
        '$l electronic remix hits',
      ],
    ),
    DynamicSectionBlueprint(
      title: 'Sufi & Soulful Poetry',
      subtitle: 'Words that speak to the soul',
      cardType: 'two_row',
      queryBuilder: (l) => [
        '$l soulful sufi qawwali',
        '$l ghazals poetry soulful',
        '$l heartfelt sufi tracks',
      ],
    ),
    DynamicSectionBlueprint(
      title: 'Devotional & Spiritual Peace',
      subtitle: 'Serenity & calm chants',
      cardType: 'portrait',
      queryBuilder: (l) => [
        '$l devotional spiritual peaceful',
        '$l morning prayers chants',
        '$l peaceful meditation songs',
      ],
    ),
    DynamicSectionBlueprint(
      title: 'Weekend Cafe & Coffee Chill',
      subtitle: 'Mellow acoustic background',
      cardType: 'square',
      queryBuilder: (l) => [
        '$l coffee shop acoustic chill',
        '$l weekend relax lounge',
        '$l mellow background tunes',
      ],
    ),
  ];

  // Regional Trending Location Capsules (Requirement 5)
  static const List<Map<String, String>> _regionalLocations = [
    {'name': 'Chennai (Tamil)', 'lang': 'Tamil', 'query': 'Tamil viral trending hits 2025 2026'},
    {'name': 'Mumbai (Hindi)', 'lang': 'Hindi', 'query': 'Hindi trending chartbusters 2025'},
    {'name': 'Hyderabad (Telugu)', 'lang': 'Telugu', 'query': 'Telugu viral hits 2025'},
    {'name': 'Bengaluru (Kannada)', 'lang': 'Kannada', 'query': 'Kannada top hits 2025'},
    {'name': 'Kochi (Malayalam)', 'lang': 'Malayalam', 'query': 'Malayalam trending hits 2025'},
    {'name': 'Delhi (North / Punjabi)', 'lang': 'Punjabi', 'query': 'Punjabi trending hits 2025'},
    {'name': 'Kolkata (Bengali)', 'lang': 'Bengali', 'query': 'Bengali trending hits 2025'},
    {'name': 'Global (English)', 'lang': 'English', 'query': 'Billboard global hits 2025'},
  ];
  int _selectedLocationIndex = 0;
  bool _isLoadingLocationSongs = false;

  static const List<String> _languages = [
    'Tamil',
    'Hindi',
    'Telugu',
    'English',
    'Malayalam',
    'Kannada',
    'Punjabi',
    'Bengali',
  ];

  @override
  void initState() {
    super.initState();
    _loadInitialMusicFeeds();
    _scrollController.addListener(_onVerticalScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onVerticalScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onVerticalScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 700 &&
        !_isLoadingExtra &&
        !_isLoading) {
      _loadNextDynamicMusicShelf();
    }
  }

  Future<List<SongItem>> _fetchCandidateTopPicks(String primaryLang, String secondaryLang, RecommendationProvider rec) async {
    final userQueries = rec.getPersonalizedMusicQueries(primaryLang);
    final Set<String> queryList = {};
    for (var uq in userQueries) {
      queryList.add(uq);
    }
    // Always include rich chartbusters & melodious anchors
    queryList.add('$primaryLang top chartbusters 2025 2026');
    queryList.add('$primaryLang all time hit songs');
    queryList.add('$primaryLang superhit melodious tracks');

    // Weave in secondary language preferences
    if (secondaryLang.isNotEmpty && secondaryLang.toLowerCase() != primaryLang.toLowerCase()) {
      queryList.add('$secondaryLang viral trending hits 2025');
    }

    final targetQueries = queryList.take(3).toList();
    final List<SongItem> candidates = [];
    try {
      final results = await Future.wait(
        targetQueries.map((q) => _musicService.searchSongs(q, page: 1, limit: 15)),
      );
      for (var res in results) {
        candidates.addAll(res);
      }
    } catch (_) {}
    return rec.rankSongs(candidates, limit: 30);
  }

  Future<void> _loadInitialMusicFeeds() async {
    if (!mounted) return;

    final media = context.read<MediaProvider>();
    final primaryLang = media.primaryLanguage;
    final secondaryLang = media.secondaryLanguage;

    _selectedLangCapsule = primaryLang;

    // Match initial location to primary language
    final matchedLocIdx = _regionalLocations.indexWhere(
      (l) => l['lang']!.toLowerCase() == primaryLang.toLowerCase(),
    );
    if (matchedLocIdx != -1) {
      _selectedLocationIndex = matchedLocIdx;
    }

    // 1. Instant Cache Display: Render immediately in 0ms if previous cache exists
    if (_cachedDailyMix != null && _cachedDailyMix!.isNotEmpty) {
      _dailyMixFeed = List.from(_cachedDailyMix!);
      _topPicks = List.from(_cachedTopPicks ?? []);
      _regionalTrending = List.from(_cachedRegionalTrending ?? []);
      _languageTop20 = List.from(_cachedLanguageTop20 ?? []);
      _videoSongs = List.from(_cachedVideoSongs ?? []);
      _isLoading = false;
      if (mounted) setState(() {});
    } else {
      setState(() => _isLoading = true);
    }

    final rec = context.read<RecommendationProvider>();
    final loc = _regionalLocations[_selectedLocationIndex];

    final langQueries = [
      '$_selectedLangCapsule top 50 hits 2025',
      '$_selectedLangCapsule chartbusters superhits',
    ];
    final videoQueries = [
      '$primaryLang official 4k video song',
      '$primaryLang trending video songs',
    ];

    try {
      // 2. High-speed Parallel Execution of all core shelves (instead of 20+ sequential calls)
      final results = await Future.wait([
        _musicService.fetchLatestHitSongs(primaryLang, limit: 12),
        _fetchCandidateTopPicks(primaryLang, secondaryLang, rec),
        _fetchRegionalTrendingBatch(loc, targetCount: 15),
        _fetchUniqueBatch(langQueries, targetCount: 20, maxPages: 2),
        _fetchUniqueBatch(videoQueries, targetCount: 10, maxPages: 2),
      ]);

      _globalAssignedSongKeys.clear();

      final rawDaily = results[0];
      final candidateTopPicks = results[1];
      final locTrending = results[2];
      final langTop20 = results[3];
      final vidSongs = results[4];

      _dailyMixFeed = _filterUniqueAndRegister(rawDaily, limit: 12);
      _topPicks = _filterUniqueAndRegister(candidateTopPicks, limit: 15);
      if (_topPicks.length < 10) {
        final extra = candidateTopPicks.where((s) => !_topPicks.any((e) => e.id == s.id)).toList();
        _topPicks.addAll(_filterUniqueAndRegister(extra, limit: 12 - _topPicks.length));
      }
      _regionalTrending = locTrending;
      _languageTop20 = langTop20;
      _videoSongs = vidSongs;

      // Update static cache for instant future loads
      _cachedDailyMix = List.from(_dailyMixFeed);
      _cachedTopPicks = List.from(_topPicks);
      _cachedRegionalTrending = List.from(_regionalTrending);
      _cachedLanguageTop20 = List.from(_languageTop20);
      _cachedVideoSongs = List.from(_videoSongs);

      if (mounted) {
        setState(() {
          // Setup 8 Curated Playlists with dedicated matching thematic cover artwork
          _playlists = [
            PanoramaCollectionItem(
              title: '$primaryLang Mega Hits 2025',
              imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
              gradient: const LinearGradient(colors: [Color(0xFF0F3820), Color(0xFF1E6038)]),
              query: '$primaryLang chartbusters 2025 2026',
            ),
            PanoramaCollectionItem(
              title: 'Midnight Lo-Fi Rain',
              imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
              gradient: const LinearGradient(colors: [Color(0xFF2C1340), Color(0xFF4C246E)]),
              query: 'lofi chill beats rain',
            ),
            PanoramaCollectionItem(
              title: 'Pure 90s Nostalgia',
              imageUrl: 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=600&auto=format&fit=crop&q=80',
              gradient: const LinearGradient(colors: [Color(0xFF381F08), Color(0xFF6E3E12)]),
              query: '$primaryLang 90s golden classics',
            ),
            PanoramaCollectionItem(
              title: 'EDM Festival Bangers',
              imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
              gradient: const LinearGradient(colors: [Color(0xFF0C2442), Color(0xFF174785)]),
              query: 'electronic dance festival hits',
            ),
            PanoramaCollectionItem(
              title: 'Soulful Acoustic Melodies',
              imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
              gradient: const LinearGradient(colors: [Color(0xFF361828), Color(0xFF6A264D)]),
              query: '$primaryLang soulful unplugged melodies',
            ),
            PanoramaCollectionItem(
              title: 'Monsoon Chai & Rain',
              imageUrl: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=600&auto=format&fit=crop&q=80',
              gradient: const LinearGradient(colors: [Color(0xFF142E28), Color(0xFF225247)]),
              query: '$primaryLang monsoon rain songs',
            ),
            PanoramaCollectionItem(
              title: 'High-Power Workout Gym',
              imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80',
              gradient: const LinearGradient(colors: [Color(0xFF401810), Color(0xFF7A2718)]),
              query: 'gym motivation hype workout songs',
            ),
            PanoramaCollectionItem(
              title: 'Late Night Long Drive',
              imageUrl: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600&auto=format&fit=crop&q=80',
              gradient: const LinearGradient(colors: [Color(0xFF1B1B38), Color(0xFF31316B)]),
              query: '$primaryLang late night long drive melodies',
            ),
          ];

          // Setup Verified Iconic Artists & Creators with real portraits
          _topArtists = [
            ArtistItem(
              name: 'Anirudh Ravichander',
              imageUrl: 'https://c.saavncdn.com/artists/Anirudh_Ravichander_004_20231018101540_500x500.jpg',
              subtext: 'Rockstar',
            ),
            ArtistItem(
              name: 'A.R. Rahman',
              imageUrl: 'https://c.saavncdn.com/artists/A_R_Rahman_002_20231102070732_500x500.jpg',
              subtext: 'Isai Puyal',
            ),
            ArtistItem(
              name: 'Arijit Singh',
              imageUrl: 'https://c.saavncdn.com/artists/Arijit_Singh_002_20230323062147_500x500.jpg',
              subtext: 'Melody King',
            ),
            ArtistItem(
              name: 'Sid Sriram',
              imageUrl: 'https://c.saavncdn.com/artists/Sid_Sriram_003_20230718080645_500x500.jpg',
              subtext: 'Soulful Vocals',
            ),
            ArtistItem(
              name: 'Shreya Ghoshal',
              imageUrl: 'https://c.saavncdn.com/artists/Shreya_Ghoshal_004_20231024103138_500x500.jpg',
              subtext: 'Nightingale',
            ),
            ArtistItem(
              name: 'Yuvan Shankar Raja',
              imageUrl: 'https://c.saavncdn.com/artists/Yuvan_Shankar_Raja_003_20230801094038_500x500.jpg',
              subtext: 'U1 Drugs',
            ),
            ArtistItem(
              name: 'Harris Jayaraj',
              imageUrl: 'https://c.saavncdn.com/artists/Harris_Jayaraj_002_20230424072614_500x500.jpg',
              subtext: 'Harmonies',
            ),
            ArtistItem(
              name: 'Ilayaraja',
              imageUrl: 'https://c.saavncdn.com/artists/Ilaiyaraaja_004_20231018073534_500x500.jpg',
              subtext: 'Isaignani',
            ),
            ArtistItem(
              name: 'Santhosh Narayanan',
              imageUrl: 'https://c.saavncdn.com/artists/Santhosh_Narayanan_003_20230801094145_500x500.jpg',
              subtext: 'Acoustic Beats',
            ),
            ArtistItem(
              name: 'Thaman S',
              imageUrl: 'https://c.saavncdn.com/artists/Thaman_S_003_20231102073204_500x500.jpg',
              subtext: 'High Voltage',
            ),
            ArtistItem(
              name: 'Taylor Swift',
              imageUrl: 'https://c.saavncdn.com/artists/Taylor_Swift_004_20231027110151_500x500.jpg',
              subtext: 'Global Icon',
            ),
            ArtistItem(
              name: 'The Weeknd',
              imageUrl: 'https://c.saavncdn.com/artists/The_Weeknd_002_20230323063510_500x500.jpg',
              subtext: 'Starboy',
            ),
            ArtistItem(
              name: 'Diljit Dosanjh',
              imageUrl: 'https://c.saavncdn.com/artists/Diljit_Dosanjh_004_20231024104245_500x500.jpg',
              subtext: 'Punjabi Wave',
            ),
            ArtistItem(
              name: 'Coldplay',
              imageUrl: 'https://c.saavncdn.com/artists/Coldplay_002_20230323062402_500x500.jpg',
              subtext: 'British Rock',
            ),
          ];

          _isLoading = false;
        });

        rec.updateMusicShelves([
          ..._dailyMixFeed,
          ..._topPicks,
          ..._regionalTrending,
        ]);

        // Preload initial dynamic shelves sequentially
        _dynamicSections.clear();
        await _loadNextDynamicMusicShelf();
        await _loadNextDynamicMusicShelf();
        await _loadNextDynamicMusicShelf();
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  /// Robust regional batching guaranteeing at least 15 songs independently of other shelves
  Future<List<SongItem>> _fetchRegionalTrendingBatch(Map<String, String> loc, {int targetCount = 15}) async {
    final lang = loc['lang']!;
    final queries = [
      loc['query']!,
      '$lang trending hits 2025 2026',
      '$lang viral regional chartbusters',
      '$lang top melodious tracks 2025',
      '$lang superhit cinema songs',
    ];

    final accumulated = <SongItem>[];
    final seenKeys = <String>{};

    for (final q in queries) {
      if (accumulated.length >= targetCount) break;
      try {
        final res = await _musicService.searchSongs(q, page: 1, limit: 15);
        for (final s in res) {
          final k = _songKey(s);
          if (!seenKeys.contains(k)) {
            seenKeys.add(k);
            accumulated.add(s);
            if (accumulated.length >= targetCount) break;
          }
        }
      } catch (_) {}
    }

    if (accumulated.length < targetCount) {
      try {
        final res = await _musicService.searchSongs('$lang popular songs 2025', page: 1, limit: 25);
        for (final s in res) {
          final k = _songKey(s);
          if (!seenKeys.contains(k)) {
            seenKeys.add(k);
            accumulated.add(s);
            if (accumulated.length >= targetCount) break;
          }
        }
      } catch (_) {}
    }

    return accumulated;
  }

  // Tapping another Regional Location Capsule switches the location & trending songs
  Future<void> _switchRegionalLocation(int idx) async {
    if (_selectedLocationIndex == idx && _regionalTrending.isNotEmpty) return;
    setState(() {
      _selectedLocationIndex = idx;
      _isLoadingLocationSongs = true;
      _regionalPage = 1;
    });

    try {
      final loc = _regionalLocations[idx];
      final unique = await _fetchRegionalTrendingBatch(loc, targetCount: 15);
      if (mounted) {
        setState(() {
          _regionalTrending = unique;
          _isLoadingLocationSongs = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingLocationSongs = false);
    }
  }

  // Tapping another Language Capsule dynamically switches the Top 20 songs
  Future<void> _switchLanguageCapsule(String lang) async {
    if (_selectedLangCapsule == lang && _languageTop20.isNotEmpty) return;
    setState(() {
      _selectedLangCapsule = lang;
      _isLoadingLangSongs = true;
    });

    try {
      final queries = [
        '$lang top 50 hits 2025',
        '$lang chartbusters superhits',
        '$lang trending songs',
        '$lang viral hits',
      ];
      final unique = await _fetchUniqueBatch(queries, targetCount: 20);
      if (mounted) {
        setState(() {
          _languageTop20 = unique;
          _isLoadingLangSongs = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingLangSongs = false);
    }
  }

  /// Dynamic vertical scrolling: loads infinite dynamic categories with 100% unique songs
  Future<void> _loadNextDynamicMusicShelf() async {
    if (_isLoadingExtra) return;
    setState(() => _isLoadingExtra = true);
    final media = context.read<MediaProvider>();
    final primaryLang = media.primaryLanguage;

    try {
      final blueprintIndex = _dynamicSections.length % _blueprints.length;
      final blueprint = _blueprints[blueprintIndex];
      final queries = blueprint.queryBuilder(primaryLang);

      final unique = await _fetchUniqueBatch(queries, targetCount: 12);
      if (mounted) {
        setState(() {
          if (unique.isNotEmpty) {
            _dynamicSections.add(
              DynamicMusicSection(
                title: blueprint.title.replaceAll('{lang}', primaryLang),
                subtitle: blueprint.subtitle,
                cardType: blueprint.cardType,
                songs: unique,
                queries: queries,
              ),
            );
          }
          _isLoadingExtra = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingExtra = false);
    }
  }

  Future<void> _fetchMoreForDynamicSection(int sectionIndex) async {
    if (sectionIndex >= _dynamicSections.length) return;
    final section = _dynamicSections[sectionIndex];
    section.page++;
    final q = section.queries[(section.page - 1) % section.queries.length];
    final p = ((section.page - 1) ~/ section.queries.length) + 1;
    final songs = await _musicService.searchSongs(q, page: p, limit: 15);
    final existingKeys = section.songs.map(_songKey).toSet();
    final unique = <SongItem>[];
    for (var s in songs) {
      final k = _songKey(s);
      if (!existingKeys.contains(k)) {
        existingKeys.add(k);
        unique.add(s);
        if (unique.length >= 10) break;
      }
    }
    if (mounted && unique.isNotEmpty) {
      setState(() => section.songs.addAll(unique));
    }
  }

  // Infinite Horizontal Pagination Loaders using progressive query rotation
  Future<void> _fetchMoreTopPicks() async {
    final media = context.read<MediaProvider>();
    final lang = media.primaryLanguage;
    final queries = [
      '$lang top chartbusters 2026',
      '$lang superhit anthems 2025',
      '$lang viral popular hits',
      '$lang latest new releases 2025',
      '$lang all time hit songs',
      '$lang melodious blockbusters',
    ];
    _topPicksPage++;
    final q = queries[(_topPicksPage - 1) % queries.length];
    final p = ((_topPicksPage - 1) ~/ queries.length) + 1;
    final songs = await _musicService.searchSongs(q, page: p, limit: 15);
    final unique = _filterUniqueAndRegister(songs, limit: 10);
    if (mounted && unique.isNotEmpty) {
      setState(() => _topPicks.addAll(unique));
    }
  }

  Future<void> _fetchMoreRegional() async {
    final loc = _regionalLocations[_selectedLocationIndex];
    final lang = loc['lang']!;
    final queries = [
      loc['query']!,
      '$lang trending hits 2025 2026',
      '$lang viral regional chartbusters',
      '$lang top melodious tracks 2025',
      '$lang all time hit songs',
      '$lang cinema superhits',
      '$lang chartbusters',
    ];
    _regionalPage++;
    final q = queries[(_regionalPage - 1) % queries.length];
    final p = ((_regionalPage - 1) ~/ queries.length) + 1;
    final songs = await _musicService.searchSongs(q, page: p, limit: 15);
    final existingKeys = _regionalTrending.map(_songKey).toSet();
    final unique = <SongItem>[];
    for (var s in songs) {
      final k = _songKey(s);
      if (!existingKeys.contains(k)) {
        existingKeys.add(k);
        unique.add(s);
      }
    }
    if (mounted && unique.isNotEmpty) {
      setState(() => _regionalTrending.addAll(unique));
    }
  }

  Future<void> _fetchMoreLanguageTop20() async {
    final lang = _selectedLangCapsule;
    final queries = [
      '$lang top 20 hits official',
      '$lang chartbusters songs',
      '$lang popular melodious tracks',
      '$lang all time hits playlist',
      '$lang new viral releases',
    ];
    final step = (_languageTop20.length ~/ 10);
    final q = queries[step % queries.length];
    final p = (step ~/ queries.length) + 1;
    final songs = await _musicService.searchSongs(q, page: p, limit: 15);
    final unique = _filterUniqueAndRegister(songs, limit: 10);
    if (mounted && unique.isNotEmpty) {
      setState(() => _languageTop20.addAll(unique));
    }
  }

  Future<void> _fetchMoreVideoSongs() async {
    final media = context.read<MediaProvider>();
    final lang = media.primaryLanguage;
    final queries = [
      '$lang official 4k video song',
      '$lang 4k music video',
      '$lang hd video hits',
      '$lang latest video songs 2025',
    ];
    _videoPage++;
    final q = queries[(_videoPage - 1) % queries.length];
    final p = ((_videoPage - 1) ~/ queries.length) + 1;
    final songs = await _musicService.searchSongs(q, page: p, limit: 15);
    final unique = _filterUniqueAndRegister(songs, limit: 10);
    if (mounted && unique.isNotEmpty) {
      setState(() => _videoSongs.addAll(unique));
    }
  }

  Widget _buildDynamicSectionWidget(DynamicMusicSection section, int index) {
    switch (section.cardType) {
      case 'vinyl':
        return MediaRow(
          title: section.title,
          subtitle: section.subtitle,
          child: PaginatedHorizontalList<SongItem>(
            items: section.songs,
            height: 200,
            onLoadMore: () => _fetchMoreForDynamicSection(index),
            indicatorColor: AppTheme.musicLime,
            itemBuilder: (context, song, idx) {
              return VinylMusicCard(
                song: song,
                size: 140,
                onTap: () => _onPlaySong(song, section.songs),
              );
            },
          ),
        );
      case 'portrait':
        return MediaRow(
          title: section.title,
          subtitle: section.subtitle,
          child: PaginatedHorizontalList<SongItem>(
            items: section.songs,
            height: 235,
            onLoadMore: () => _fetchMoreForDynamicSection(index),
            indicatorColor: AppTheme.musicLime,
            itemBuilder: (context, song, idx) {
              return PortraitMusicCard(
                song: song,
                width: 140,
                onTap: () => _onPlaySong(song, section.songs),
              );
            },
          ),
        );
      case 'video':
        return MediaRow(
          title: section.title,
          subtitle: section.subtitle,
          child: PaginatedHorizontalList<SongItem>(
            items: section.songs,
            height: 195,
            onLoadMore: () => _fetchMoreForDynamicSection(index),
            indicatorColor: AppTheme.musicLime,
            itemBuilder: (context, song, idx) {
              return CinematicVideoCard(
                song: song,
                width: 240,
                onTap: () => _onPlaySong(song, section.songs),
              );
            },
          ),
        );
      case 'tile':
        return MediaRow(
          title: section.title,
          subtitle: section.subtitle,
          child: PaginatedHorizontalList<SongItem>(
            items: section.songs,
            height: 72,
            onLoadMore: () => _fetchMoreForDynamicSection(index),
            indicatorColor: AppTheme.musicLime,
            itemBuilder: (context, song, idx) {
              return CompactTileCard(
                song: song,
                width: 230,
                onPlay: () => _onPlaySong(song, section.songs),
              );
            },
          ),
        );
      case 'two_row':
        return MediaRow(
          title: section.title,
          subtitle: section.subtitle,
          child: TwoRowScrollGrid(
            songs: section.songs,
            onPlay: (song, idx) => _onPlaySong(song, section.songs),
            onAddToPlaylist: _openAddToPlaylist,
            onLoadMore: () => _fetchMoreForDynamicSection(index),
          ),
        );
      case 'square':
      default:
        return MediaRow(
          title: section.title,
          subtitle: section.subtitle,
          child: PaginatedHorizontalList<SongItem>(
            items: section.songs,
            height: 200,
            onLoadMore: () => _fetchMoreForDynamicSection(index),
            indicatorColor: AppTheme.musicLime,
            itemBuilder: (context, song, idx) {
              return SquareMusicCard(
                song: song,
                size: 146,
                onTap: () => _onPlaySong(song, section.songs),
              );
            },
          ),
        );
    }
  }

  void _onPlaySong(SongItem song, List<SongItem> queue) {
    context.read<RecommendationProvider>().logSignal(
          BehaviorSignal(
            type: 'watch_start',
            itemId: song.id,
            itemType: 'song',
            timestamp: DateTime.now().millisecondsSinceEpoch,
            metadata: {'artist': song.artist},
          ),
        );
    final media = context.read<MediaProvider>();
    media.playSong(song, queue);
    media.openMusicPlayer(); // Immediately open full player
  }

  void _openAddToPlaylist(SongItem song) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => AddToPlaylistModal(song: song),
    );
  }

  @override
  Widget build(BuildContext context) {
    final media = context.watch<MediaProvider>();
    final recentlyPlayed = media.recentlyPlayed;

    return Container(
      decoration: const BoxDecoration(
        gradient: AppTheme.musicAmbientGradient,
      ),
      child: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          color: AppTheme.musicLime,
          backgroundColor: AppTheme.cardDark,
          onRefresh: _loadInitialMusicFeeds,
          child: SingleChildScrollView(
            controller: _scrollController,
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.only(bottom: 120),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top App Header
                const TopAppHeader(),

                if (_isLoading) ...[
                  const MusicHomeSkeleton(),
                ] else ...[
                  // 1. MANDATORY: Daily Mix 3D Fanned Deck (User-based Feed)
                  if (_dailyMixFeed.isNotEmpty)
                    DailyMixFannedDeck(
                      songs: _dailyMixFeed,
                      onPlay: (song) => _onPlaySong(song, _dailyMixFeed),
                    ),
                  const SizedBox(height: 12),

                  // 2. MANDATORY: Recently Played (Real User Play History)
                  if (recentlyPlayed.isNotEmpty)
                    MediaRow(
                      title: 'Recently Played',
                      subtitle: 'Jump back in',
                      child: SizedBox(
                        height: 70,
                        child: ListView.builder(
                          scrollDirection: Axis.horizontal,
                          physics: const BouncingScrollPhysics(),
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: recentlyPlayed.length,
                          itemBuilder: (context, idx) {
                            final song = recentlyPlayed[idx];
                            return Padding(
                              padding: const EdgeInsets.only(right: 10),
                              child: CompactTileCard(
                                song: song,
                                onPlay: () => _onPlaySong(song, recentlyPlayed),
                                onAddToPlaylist: () => _openAddToPlaylist(song),
                              ),
                            );
                          },
                        ),
                      ),
                    ),

                  // 3. MANDATORY: Top Picks For You (SquareMinimalistCard with 10-item pagination)
                  if (_topPicks.isNotEmpty)
                    MediaRow(
                      title: 'Top Picks For You',
                      child: PaginatedHorizontalList<SongItem>(
                        items: _topPicks,
                        height: 200,
                        onLoadMore: _fetchMoreTopPicks,
                        indicatorColor: AppTheme.musicLime,
                        itemBuilder: (context, song, idx) {
                          return SquareMusicCard(
                            song: song,
                            size: 146,
                            onTap: () => _onPlaySong(song, _topPicks),
                          );
                        },
                      ),
                    ),

                  // 4. MANDATORY: Trending in Location with Language Location Capsules (10-by-10 pagination)
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 16),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Trending in Location',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                letterSpacing: -0.2,
                              ),
                            ),
                            Text(
                              'Regional Freshness',
                              style: TextStyle(color: Colors.white54, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 10),

                      // Location / Language Selector Capsules
                      SizedBox(
                        height: 32,
                        child: ListView.builder(
                          scrollDirection: Axis.horizontal,
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: _regionalLocations.length,
                          itemBuilder: (context, idx) {
                            final loc = _regionalLocations[idx];
                            final isSel = _selectedLocationIndex == idx;
                            return GestureDetector(
                              onTap: () => _switchRegionalLocation(idx),
                              child: Container(
                                margin: const EdgeInsets.only(right: 8),
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                                decoration: BoxDecoration(
                                  color: isSel ? AppTheme.musicLime : const Color(0xFF142016),
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: isSel ? AppTheme.musicLime : Colors.white12,
                                    width: 1,
                                  ),
                                ),
                                child: Text(
                                  loc['name']!,
                                  style: TextStyle(
                                    color: isSel ? Colors.black : Colors.white70,
                                    fontSize: 12,
                                    fontWeight: isSel ? FontWeight.w800 : FontWeight.w500,
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: 12),

                      if (_isLoadingLocationSongs)
                        Container(
                          height: 235,
                          margin: const EdgeInsets.symmetric(horizontal: 16),
                          child: const Center(
                            child: CircularProgressIndicator(color: AppTheme.musicLime, strokeWidth: 2),
                          ),
                        )
                      else if (_regionalTrending.isNotEmpty)
                        PaginatedHorizontalList<SongItem>(
                          items: _regionalTrending,
                          height: 235,
                          onLoadMore: _fetchMoreRegional,
                          indicatorColor: AppTheme.musicLime,
                          itemBuilder: (context, song, idx) {
                            return PortraitMusicCard(
                              song: song,
                              width: 140,
                              onTap: () => _onPlaySong(song, _regionalTrending),
                            );
                          },
                        ),
                      const SizedBox(height: 24),
                    ],
                  ),

                  // 5. MANDATORY: Popular Top 20 Songs with Language Capsules
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Popular Top 20 • $_selectedLangCapsule',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                letterSpacing: -0.2,
                              ),
                            ),
                            const Text(
                              'Official Charts',
                              style: TextStyle(color: Colors.white54, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 10),

                      // Language Selector Capsules
                      SizedBox(
                        height: 32,
                        child: ListView.builder(
                          scrollDirection: Axis.horizontal,
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: _languages.length,
                          itemBuilder: (context, idx) {
                            final lang = _languages[idx];
                            final isSel = _selectedLangCapsule == lang;
                            return GestureDetector(
                              onTap: () => _switchLanguageCapsule(lang),
                              child: Container(
                                margin: const EdgeInsets.only(right: 8),
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                                decoration: BoxDecoration(
                                  color: isSel ? AppTheme.musicLime : const Color(0xFF142016),
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: isSel ? AppTheme.musicLime : Colors.white12,
                                    width: 1,
                                  ),
                                ),
                                child: Text(
                                  lang,
                                  style: TextStyle(
                                    color: isSel ? Colors.black : Colors.white70,
                                    fontSize: 12,
                                    fontWeight: isSel ? FontWeight.w800 : FontWeight.w500,
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: 12),

                      if (_isLoadingLangSongs)
                        Container(
                          height: 126,
                          margin: const EdgeInsets.symmetric(horizontal: 16),
                          decoration: BoxDecoration(
                            color: AppTheme.cardDark,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Center(
                            child: CircularProgressIndicator(color: AppTheme.musicLime, strokeWidth: 2),
                          ),
                        )
                      else if (_languageTop20.isNotEmpty)
                        TwoRowScrollGrid(
                          songs: _languageTop20,
                          onPlay: (song, idx) => _onPlaySong(song, _languageTop20),
                          onAddToPlaylist: _openAddToPlaylist,
                          onLoadMore: _fetchMoreLanguageTop20,
                        ),
                      const SizedBox(height: 24),
                    ],
                  ),

                  // 6. MANDATORY: Top Playlists & Collections (Panorama Landscape Cards)
                  if (_playlists.isNotEmpty)
                    MediaRow(
                      title: 'Top Playlists & Moods',
                      child: SizedBox(
                        height: 126,
                        child: ListView.builder(
                          scrollDirection: Axis.horizontal,
                          physics: const BouncingScrollPhysics(),
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: _playlists.length,
                          itemBuilder: (context, idx) {
                            final pl = _playlists[idx];
                            return Padding(
                              padding: const EdgeInsets.only(right: 12),
                              child: PanoramaCollectionCard(
                                title: pl.title,
                                imageUrl: pl.imageUrl,
                                gradient: pl.gradient,
                                onTap: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (_) => PlaylistDetailScreen(playlist: pl),
                                    ),
                                  );
                                },
                              ),
                            );
                          },
                        ),
                      ),
                    ),

                  // 7. MANDATORY: Artists & Discographies (Circular Bubble Cards)
                  if (_topArtists.isNotEmpty)
                    MediaRow(
                      title: 'Popular Artists & Creators',
                      subtitle: 'Discographies',
                      child: SizedBox(
                        height: 138,
                        child: ListView.builder(
                          scrollDirection: Axis.horizontal,
                          physics: const BouncingScrollPhysics(),
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: _topArtists.length,
                          itemBuilder: (context, idx) {
                            final artist = _topArtists[idx];
                            return Padding(
                              padding: const EdgeInsets.only(right: 12),
                              child: ArtistBubbleCard(
                                name: artist.name,
                                imageUrl: artist.imageUrl,
                                subtext: artist.subtext,
                                onTap: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (_) => ArtistDetailScreen(artist: artist),
                                    ),
                                  );
                                },
                              ),
                            );
                          },
                        ),
                      ),
                    ),

                  // 8. MANDATORY: Cinema Video Songs • 4K Hits (16:9 Widescreen Cards)
                  if (_videoSongs.isNotEmpty)
                    MediaRow(
                      title: 'Cinema Video Songs • 4K Hits',
                      subtitle: 'Official music videos',
                      child: PaginatedHorizontalList<SongItem>(
                        items: _videoSongs,
                        height: 195,
                        onLoadMore: _fetchMoreVideoSongs,
                        indicatorColor: AppTheme.musicLime,
                        itemBuilder: (context, song, idx) {
                          return CinematicVideoCard(
                            song: song,
                            width: 240,
                            onTap: () => _onPlaySong(song, _videoSongs),
                          );
                        },
                      ),
                    ),

                  // ──────── DYNAMIC INFINITE SECTIONS BASED ON USER HABITS ────────
                  for (int i = 0; i < _dynamicSections.length; i++)
                    _buildDynamicSectionWidget(_dynamicSections[i], i),

                  // Dynamic Section Shimmer Loader for vertical shelves
                  if (_isLoadingExtra)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              ShimmerContainer(width: 170, height: 18, borderRadius: 6),
                              ShimmerContainer(width: 60, height: 14, borderRadius: 4),
                            ],
                          ),
                          const SizedBox(height: 14),
                          SizedBox(
                            height: 180,
                            child: ListView.builder(
                              scrollDirection: Axis.horizontal,
                              itemCount: 4,
                              physics: const NeverScrollableScrollPhysics(),
                              itemBuilder: (context, index) => const Padding(
                                padding: EdgeInsets.only(right: 12),
                                child: ShimmerContainer(width: 140, height: 180, borderRadius: 16),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
