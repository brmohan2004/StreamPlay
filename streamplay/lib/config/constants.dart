class AppConstants {
  // Public Zero-API-Key Endpoints
  static const String cinemetaBase = 'https://v3-cinemeta.strem.io';
  static const String saavnApiBase = 'https://www.jiosaavn.com/api.php';
  static const String audiusApiBase = 'https://discoveryprovider.audius.co';

  // DES ECB Key for JioSaavn Audio Decryption
  static const String saavnDesKey = '38346591';

  // Fallback Posters
  static const String defaultPosterFallback =
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';
  static const String defaultSongArtFallback =
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=500&q=80';

  // Regional Cinema Hubs (as seen in Onboarding Step 2 and Settings Screen)
  static const List<RegionalHub> regionalHubs = [
    RegionalHub(
      id: 'chennai',
      name: 'Chennai',
      subtext: 'Tamil Nadu',
      tag: 'KOLLYWOOD',
      cinemaHub: 'Kollywood',
      defaultLang: 'Tamil',
      image: 'assets/locations/chennai.jpg',
    ),
    RegionalHub(
      id: 'mumbai',
      name: 'Mumbai',
      subtext: 'Maharashtra',
      tag: 'BOLLYWOOD',
      cinemaHub: 'Bollywood',
      defaultLang: 'Hindi',
      image: 'assets/locations/mumbai.jpg',
    ),
    RegionalHub(
      id: 'hyderabad',
      name: 'Hyderabad',
      subtext: 'Telangana & AP',
      tag: 'TOLLYWOOD',
      cinemaHub: 'Tollywood',
      defaultLang: 'Telugu',
      image: 'assets/locations/hyderabad.jpg',
    ),
    RegionalHub(
      id: 'bengaluru',
      name: 'Bengaluru',
      subtext: 'Karnataka',
      tag: 'SANDALWOOD',
      cinemaHub: 'Sandalwood',
      defaultLang: 'Kannada',
      image: 'assets/locations/bengaluru.jpg',
    ),
    RegionalHub(
      id: 'kochi',
      name: 'Kochi',
      subtext: 'Kerala',
      tag: 'MOLLYWOOD',
      cinemaHub: 'Mollywood',
      defaultLang: 'Malayalam',
      image: 'assets/locations/kochi.jpg',
    ),
    RegionalHub(
      id: 'delhi',
      name: 'Delhi NCR',
      subtext: 'Northern Circuit',
      tag: 'NORTH TRENDS',
      cinemaHub: 'North Trends',
      defaultLang: 'Hindi',
      image: 'assets/locations/delhi.jpg',
    ),
    RegionalHub(
      id: 'kolkata',
      name: 'Kolkata',
      subtext: 'West Bengal',
      tag: 'TOLLYWOOD BANGLA',
      cinemaHub: 'Tollywood Bangla',
      defaultLang: 'Bengali',
      image: 'assets/locations/kolkata.jpg',
    ),
    RegionalHub(
      id: 'global',
      name: 'Global / International',
      subtext: 'Worldwide',
      tag: 'HOLLYWOOD & WORLD',
      cinemaHub: 'Hollywood & World',
      defaultLang: 'English',
      image: 'assets/locations/global.jpg',
    ),
  ];

  // Available Languages
  static const List<String> availableLanguages = [
    'Tamil',
    'Hindi',
    'Telugu',
    'English',
    'Malayalam',
    'Kannada',
    'Punjabi',
    'Bengali',
  ];

  // Movie Categories / Genres
  static const List<String> movieCategories = [
    'All',
    'Movies',
    'Series',
    'Action',
    'Comedy',
    'Romance',
    'Sci-Fi',
    'Thriller',
    'Horror',
    'Animation',
    'Drama',
    'Crime',
  ];

  // OTT Platforms
  static const List<OTTBrandInfo> ottPlatforms = [
    OTTBrandInfo(name: 'All', color: 0xFF00D2FF),
    OTTBrandInfo(name: 'Netflix', color: 0xFFE50914),
    OTTBrandInfo(name: 'JioHotstar', color: 0xFF0F52BA),
    OTTBrandInfo(name: 'Prime Video', color: 0xFF00A8E1),
    OTTBrandInfo(name: 'Apple TV+', color: 0xFFFFFFFF),
    OTTBrandInfo(name: 'Sony LIV', color: 0xFFFD7E14),
    OTTBrandInfo(name: 'Zee5', color: 0xFFA855F7),
  ];

  // Curated Trending Search Tags
  static const List<String> trendingCinemaSearches = [
    'Heart of the Beast',
    'Resident Evil',
    'Primetime',
    'Obsession',
    "A Dog's Perfect Christmas",
    'Verity',
    'Spider-Man: Brand New Day',
    'The Invite',
    'Godzilla Minus One',
    'Sense and Sensibility',
  ];

  static const List<String> trendingMusicCreators = [
    'Arijit Singh',
    'Taylor Swift',
    'Diljit Dosanjh',
    'Anirudh',
    'Coldplay',
    'The Weeknd',
    'Shreya Ghoshal',
    'Pritam',
    'Sid Sriram',
    'Billie Eilish',
  ];
}

class RegionalHub {
  final String id;
  final String name;
  final String subtext;
  final String tag;
  final String cinemaHub;
  final String defaultLang;
  final String image;

  const RegionalHub({
    required this.id,
    required this.name,
    required this.subtext,
    required this.tag,
    required this.cinemaHub,
    required this.defaultLang,
    required this.image,
  });
}

class OTTBrandInfo {
  final String name;
  final int color;

  const OTTBrandInfo({
    required this.name,
    required this.color,
  });
}

