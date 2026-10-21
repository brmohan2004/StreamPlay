// === StreamPlay Location & Regional Personalization Service ===

export interface UserLocation {
  id: string;
  name: string;
  region: string;
  cinemaHub: string;
  defaultLang: string;
  image: string;
  tagline: string;
}

export const SUPPORTED_LOCATIONS: UserLocation[] = [
  {
    id: 'chennai',
    name: 'Chennai',
    region: 'Tamil Nadu',
    cinemaHub: 'Kollywood',
    defaultLang: 'Tamil',
    image: '/locations/chennai.jpg',
    tagline: 'Kollywood blockbusters, Anirudh & Rahman sensations'
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    region: 'Maharashtra',
    cinemaHub: 'Bollywood',
    defaultLang: 'Hindi',
    image: '/locations/mumbai.jpg',
    tagline: 'Bollywood mega-premieres, global hits & Hindi melodies'
  },
  {
    id: 'hyderabad',
    name: 'Hyderabad',
    region: 'Telangana & AP',
    cinemaHub: 'Tollywood',
    defaultLang: 'Telugu',
    image: '/locations/hyderabad.jpg',
    tagline: 'Epic Tollywood spectacles, mass anthems & chartbusters'
  },
  {
    id: 'bengaluru',
    name: 'Bengaluru',
    region: 'Karnataka',
    cinemaHub: 'Sandalwood',
    defaultLang: 'Kannada',
    image: '/locations/bengaluru.jpg',
    tagline: 'Sandalwood hits, indie music concerts & multilingual feeds'
  },
  {
    id: 'kochi',
    name: 'Kerala (Kochi)',
    region: 'Kerala',
    cinemaHub: 'Mollywood',
    defaultLang: 'Malayalam',
    image: '/locations/kochi.jpg',
    tagline: 'Mollywood cinematic masterpieces & soothing melodies'
  },
  {
    id: 'delhi',
    name: 'Delhi NCR',
    region: 'North India',
    cinemaHub: 'North Trends',
    defaultLang: 'Hindi',
    image: '/locations/delhi.jpg',
    tagline: 'North Indian trending cinema, Punjabi pop & theater releases'
  },
  {
    id: 'kolkata',
    name: 'Kolkata',
    region: 'West Bengal',
    cinemaHub: 'Tollywood Bangla',
    defaultLang: 'Bengali',
    image: '/locations/kolkata.jpg',
    tagline: 'Bengali classics, contemporary cinema & cultural melodies'
  },
  {
    id: 'global',
    name: 'Global / International',
    region: 'Worldwide',
    cinemaHub: 'Hollywood & World',
    defaultLang: 'English',
    image: '/locations/global.jpg',
    tagline: 'Hollywood 4K blockbusters, global billboard chartbusters'
  }
];

const LOCATION_STORAGE_KEY = 'streamplay_user_location';

/**
 * Downloads and preloads the location image into browser memory cache.
 */
export function prefetchLocationImage(imageUrl: string): Promise<void> {
  return new Promise(resolve => {
    if (!imageUrl) {
      resolve();
      return;
    }
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => resolve();
    img.onerror = () => resolve(); // never reject to avoid breaking flow
  });
}

/**
 * Gets the current active location from localStorage or defaults to Chennai.
 */
export function getUserLocation(): UserLocation {
  try {
    const savedId = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (savedId) {
      const match = SUPPORTED_LOCATIONS.find(loc => loc.id === savedId);
      if (match) return match;
    }
  } catch {
    // fallback
  }
  return SUPPORTED_LOCATIONS[0]; // Default Chennai
}

/**
 * Saves user location and automatically preloads its imagery in background.
 */
export function setUserLocation(locationId: string): UserLocation {
  const loc = SUPPORTED_LOCATIONS.find(l => l.id === locationId) || SUPPORTED_LOCATIONS[0];
  try {
    localStorage.setItem(LOCATION_STORAGE_KEY, loc.id);
  } catch (e) {
    console.warn('Failed to save user location:', e);
  }
  // Download and cache the location image in browser memory
  prefetchLocationImage(loc.image);
  return loc;
}
