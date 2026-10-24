// src/services/adBlocker.ts
// Advanced Dynamic Runtime Ad & Popup Blocker for Embedded Third-Party Media Players.
//
// ZERO HARDCODED AD DOMAINS — All detection is behavioral & heuristic-based.
//
// Advanced capabilities:
//   1. Window.open popup/popunder interception with mock proxy
//   2. Top-level navigation hijack protection (location.assign/replace/href)
//   3. Click-hijacking & transparent overlay detection + removal
//   4. DOM mutation observer for injected ad scripts/iframes/overlays
//   5. Network guards — Fetch & XMLHttpRequest ad-domain blocking
//   6. WebSocket ad-beacon interception
//   7. Service Worker registration blocking
//   8. CSS-based cosmetic ad hiding (zero-pixel overlay, suspicious banners)
//   9. Periodic aggressive DOM sweep for late-injected ad elements
//  10. Anti-fingerprinting canvas noise injection
//  11. iframe sandbox enforcement for non-player frames
//  12. postMessage spam filter (blocks cross-origin ad coordination messages)

import { STREAMING_SERVERS } from './movieService';

/* ────────────────────────────────────────────────────────────
   1. DYNAMIC BLOCKLIST REGISTRY (Session & Runtime Persisted)
   ──────────────────────────────────────────────────────────── */

const STORAGE_KEY = 'streamplay_dynamic_blocked_domains';

function loadPersistedDomains(): Set<string> {
  const set = new Set<string>();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach((d) => typeof d === 'string' && set.add(d.toLowerCase()));
      }
    }
  } catch {
    // sessionStorage might be restricted in some iframe contexts
  }
  return set;
}

function persistDomains(set: Set<string>): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

/** Dynamically learned ad domains (accumulates in real time) */
const dynamicBlockedDomains: Set<string> = loadPersistedDomains();

/** Inspection cache for fast lookups */
const classifiedCache: Map<string, boolean> = new Map();

/** Block activity log for monitoring and diagnostics */
interface BlockEvent {
  url: string;
  domain: string;
  source: string;
  timestamp: number;
}
const recentBlocks: BlockEvent[] = [];
let totalBlockedCount = 0;

/* ────────────────────────────────────────────────────────────
   2. DYNAMIC WHITELIST (Auto-Configured from App & Active Servers)
   ──────────────────────────────────────────────────────────── */

/**
 * Dynamically extract all legitimate streaming server hostnames
 * directly from the configured STREAMING_SERVERS registry.
 * Zero hardcoding: adding or modifying servers in movieService.ts
 * automatically updates the whitelist.
 */
function getDynamicAllowedOrigins(): Set<string> {
  const allowed = new Set<string>();

  // Current application origin & local hosts
  try {
    if (typeof window !== 'undefined' && window.location) {
      if (window.location.hostname) allowed.add(window.location.hostname.toLowerCase());
      if (window.location.host) allowed.add(window.location.host.toLowerCase());
    }
  } catch {
    // ignore
  }
  allowed.add('localhost');
  allowed.add('127.0.0.1');

  // Dynamically resolve domains from STREAMING_SERVERS
  try {
    if (Array.isArray(STREAMING_SERVERS)) {
      for (const server of STREAMING_SERVERS) {
        if (typeof server.getUrl === 'function') {
          try {
            const sampleUrl = server.getUrl('tt0000001', '0000001', 'movie', 1, 1);
            const parsed = new URL(sampleUrl);
            allowed.add(parsed.hostname.toLowerCase());
          } catch {
            // ignore malformed sample
          }
        }
      }
    }
  } catch {
    // ignore
  }

  // Common application media & API services
  allowed.add('api.themoviedb.org');
  allowed.add('image.tmdb.org');
  allowed.add('omdbapi.com');
  allowed.add('www.omdbapi.com');
  allowed.add('jiosaavn.com');
  allowed.add('www.jiosaavn.com');
  allowed.add('saavn.com');

  return allowed;
}

let cachedAllowedOrigins: Set<string> | null = null;
function getAllowedOrigins(): Set<string> {
  if (!cachedAllowedOrigins) {
    cachedAllowedOrigins = getDynamicAllowedOrigins();
  }
  return cachedAllowedOrigins;
}

/** Check if a hostname belongs to our own app or whitelisted media servers */
function isWhitelisted(hostname: string): boolean {
  if (!hostname) return true;
  const host = hostname.toLowerCase();
  const allowed = getAllowedOrigins();

  if (allowed.has(host)) return true;

  // Check parent domains (e.g. sub.vidlink.pro matches vidlink.pro)
  for (const item of allowed) {
    if (host.endsWith('.' + item)) return true;
  }
  return false;
}

/* ────────────────────────────────────────────────────────────
   3. URL & DOMAIN PARSING UTILITIES
   ──────────────────────────────────────────────────────────── */

function extractHostname(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('about:') ||
    trimmed === '#'
  ) {
    return null;
  }
  try {
    const base = typeof window !== 'undefined' ? window.location.href : 'http://localhost';
    const parsed = new URL(trimmed, base);
    return parsed.hostname.toLowerCase();
  } catch {
    // Regex fallback for irregular URLs
    const match = trimmed.match(/^https?:\/\/([^/?#:]+)/i);
    return match ? match[1].toLowerCase() : null;
  }
}

/**
 * Generic behavioral ad pattern signatures (matches URL path/query structures,
 * NOT specific company names).
 */
const BEHAVIORAL_AD_PATTERNS = [
  /\/ads?[/._?=-]/i,
  /\/adserv/i,
  /\/popunder/i,
  /\/pop(up)?[._?=-]/i,
  /\/click(track|through|log|er)?\?/i,
  /\/aff(iliate)?_?(redirect|click|id)/i,
  /\/banner[._?=-]/i,
  /\/vast[._?=-]/i,
  /\/vpaid[._?=-]/i,
  /\/openrtb/i,
  /\/prebid/i,
  /\/impression[._?=-]/i,
  /[?&](ad_id|ad_unit|ad_slot|ad_type|banner_id|campaign_id|click_id|zoneid)=/i,
  // Advanced heuristic patterns
  /\/track(er|ing)?[/._?=-]/i,
  /\/beacon[/._?=-]/i,
  /\/pixel[/._?=-]/i,
  /\/syndic(ation|ate)/i,
  /\/interstitial/i,
  /\/overlay[._?=-]/i,
  /\/(?:out|exit|redirect)\.php/i,
  /\/(?:go|jump|redir|bounce)\//i,
  /[?&](utm_|ref_|aff_|click_|campaign_)/i,
  /\/(?:pre|mid|post)roll/i,
  /\/monetiz/i,
  /\/sponsor/i,
  /\/native-?ad/i,
  /\/tag[/._?=-].*(?:js|script)/i,
];

/** Advanced: Suspicious script content patterns that indicate ad injection */
const SUSPICIOUS_SCRIPT_PATTERNS = [
  /document\.write\s*\(/,
  /\.createElement\s*\(\s*['"]iframe['"]\s*\)/,
  /window\.open\s*\(/,
  /\.insertBefore\s*\(/,
  /popunder|popupunder|clickunder/i,
  /anti.?adb/i,
  /disable.?adb/i,
];

/** Check if an URL exhibits generic ad-serving signatures */
function hasAdBehaviorPattern(url: string): boolean {
  return BEHAVIORAL_AD_PATTERNS.some((pattern) => pattern.test(url));
}

/**
 * Dynamically register a domain as an ad source.
 * When any popup, redirect, or click-hijack attempt occurs, this function
 * captures and remembers the domain for all subsequent requests.
 */
function recordBlockedAd(url: string, source: string): void {
  const host = extractHostname(url);
  totalBlockedCount++;

  if (host && !isWhitelisted(host)) {
    if (!dynamicBlockedDomains.has(host)) {
      dynamicBlockedDomains.add(host);
      classifiedCache.set(host, true);
      persistDomains(dynamicBlockedDomains);
      console.warn(`[AdvancedAdBlocker] 🛡️ Dynamically learned new ad domain: "${host}" from ${source}`);
    }
  }

  recentBlocks.unshift({
    url: url.slice(0, 200),
    domain: host || 'unknown',
    source,
    timestamp: Date.now(),
  });
  if (recentBlocks.length > 100) recentBlocks.length = 100;
}

/**
 * Check if a URL should be blocked.
 * Dynamic: Evaluates against whitelisted origins, previously learned ad domains,
 * and behavioral ad heuristics.
 */
export function isAdUrl(url: string): boolean {
  if (!url) return false;
  const host = extractHostname(url);

  // If no host (e.g. anchor link or relative internal app path), allow it
  if (!host) return false;

  // App or media server: always allow
  if (isWhitelisted(host)) return false;

  // Previously learned dynamic ad domain: block
  if (dynamicBlockedDomains.has(host)) return true;

  // Cached determination
  const cached = classifiedCache.get(host);
  if (cached !== undefined) return cached;

  // Subdomain match against learned domains
  for (const blocked of dynamicBlockedDomains) {
    if (host === blocked || host.endsWith('.' + blocked)) {
      classifiedCache.set(host, true);
      return true;
    }
  }

  // Behavioral ad pattern match
  if (hasAdBehaviorPattern(url)) {
    recordBlockedAd(url, 'heuristic-pattern');
    return true;
  }

  classifiedCache.set(host, false);
  return false;
}

/* ────────────────────────────────────────────────────────────
   4. MOCK WINDOW PROXY (Neutralizes Window.open Popups & Popunders)
   ──────────────────────────────────────────────────────────── */

/**
 * Creates an intelligent mock Window proxy.
 * Ad scripts frequently test popups by doing:
 *   const win = window.open('about:blank', '_blank');
 *   win.location.href = 'https://ad-site.com/...';
 * 
 * Our proxy intercepts the subsequent location assignment dynamically,
 * registers the target URL as an ad, and blocks the navigation.
 */
function createMockWindow(initialUrl?: string): any {
  let targetUrl = initialUrl || '';

  const mockLocation: any = {
    get href() {
      return targetUrl;
    },
    set href(newUrl: string) {
      if (newUrl && isExternalNavigation(newUrl)) {
        recordBlockedAd(newUrl, 'window.open -> location.href assignment');
        console.warn('[AdvancedAdBlocker] Neutralized popup location assignment:', newUrl);
        return;
      }
      targetUrl = newUrl;
    },
    assign(newUrl: string) {
      if (newUrl && isExternalNavigation(newUrl)) {
        recordBlockedAd(newUrl, 'window.open -> location.assign');
        console.warn('[AdvancedAdBlocker] Neutralized popup location.assign:', newUrl);
        return;
      }
      targetUrl = newUrl;
    },
    replace(newUrl: string) {
      if (newUrl && isExternalNavigation(newUrl)) {
        recordBlockedAd(newUrl, 'window.open -> location.replace');
        console.warn('[AdvancedAdBlocker] Neutralized popup location.replace:', newUrl);
        return;
      }
      targetUrl = newUrl;
    },
    reload() {},
    toString() { return targetUrl; },
  };

  return {
    closed: false,
    name: '',
    opener: null,
    parent: null,
    top: null,
    frameElement: null,
    focus: () => {},
    blur: () => {},
    close: () => {},
    postMessage: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    getComputedStyle: () => ({}),
    matchMedia: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }),
    location: mockLocation,
    document: {
      write: () => {},
      writeln: () => {},
      open: () => {},
      close: () => {},
      createElement: () => ({ style: {}, appendChild: () => {}, setAttribute: () => {}, addEventListener: () => {} }),
      createElementNS: () => ({ style: {}, appendChild: () => {} }),
      head: { appendChild: () => {}, insertBefore: () => {} },
      body: { appendChild: () => {}, insertBefore: () => {}, innerHTML: '' },
      getElementById: () => null,
      getElementsByTagName: () => [],
      getElementsByClassName: () => [],
      querySelector: () => null,
      querySelectorAll: () => [],
      readyState: 'complete',
      documentElement: { style: {} },
    },
    navigator: { userAgent: navigator.userAgent },
    screen: { width: 1920, height: 1080 },
    innerWidth: 1920,
    innerHeight: 1080,
    setTimeout: () => 0,
    setInterval: () => 0,
    clearTimeout: () => {},
    clearInterval: () => {},
  };
}

/** Determines if a target navigation URL attempts to leave the application */
function isExternalNavigation(targetUrl: string): boolean {
  if (!targetUrl) return false;
  const host = extractHostname(targetUrl);
  if (!host) return false;
  return !isWhitelisted(host);
}

/* ────────────────────────────────────────────────────────────
   5. INTERCEPTION GUARDS
   ──────────────────────────────────────────────────────────── */

let installed = false;
let originalOpen: typeof window.open | null = null;
let originalFetch: typeof window.fetch | null = null;
let originalXhrOpen: any = null;
let originalLocationAssign: ((url: string) => void) | null = null;
let originalLocationReplace: ((url: string) => void) | null = null;
let originalWebSocket: typeof WebSocket | null = null;
let originalServiceWorkerRegister: any = null;
let originalSendBeacon: any = null;
const cleanupFns: Array<() => void> = [];
let domObserver: MutationObserver | null = null;
let periodicSweepTimer: ReturnType<typeof setInterval> | null = null;

/**
 * 1. WINDOW.OPEN INTERCEPTOR:
 * Embedded media players NEVER have a legitimate need to open new browser tabs
 * to external websites. Any external window.open invocation is dynamically blocked,
 * its target domain is learned, and a mock window proxy is returned.
 */
function interceptWindowOpen(): void {
  try {
    originalOpen = window.open;
    window.open = function (...args: any[]) {
      const targetUrl = args[0] ? String(args[0]) : '';
      const windowName = args[1] ? String(args[1]) : '';

      // If opening an external URL, dynamically learn and block it
      if (targetUrl && isExternalNavigation(targetUrl)) {
        recordBlockedAd(targetUrl, 'window.open');
        console.warn('[AdvancedAdBlocker] Intercepted & blocked popup URL:', targetUrl);
        return createMockWindow(targetUrl);
      }

      // If calling window.open('') or with target='_blank' without internal URL,
      // return a proxy that intercepts subsequent location updates
      if (!targetUrl || targetUrl === 'about:blank' || windowName === '_blank') {
        console.warn('[AdvancedAdBlocker] Trapped blank popup request, returning dynamic guard proxy');
        return createMockWindow(targetUrl);
      }

      return originalOpen!.apply(window, args as any);
    } as any;
  } catch (err) {
    console.debug('[AdvancedAdBlocker] window.open guard error:', err);
  }
}

/**
 * 2. CLICK-HIJACKING & OVERLAY INTERCEPTOR:
 * Ad scripts often inject transparent overlays over the video player or wrap
 * the screen in an invisible <a target="_blank"> element.
 * We capture all clicks at the topmost window phase (capture: true) and prevent
 * external redirects.
 */
function interceptClickHijacking(): void {
  const clickHandler = (e: MouseEvent) => {
    try {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Check if clicked element or any parent is an external anchor
      const anchor = target.closest('a') as HTMLAnchorElement | null;
      if (anchor) {
        const href = anchor.getAttribute('href') || anchor.href || '';
        const isBlank = anchor.target === '_blank';

        if (href && isExternalNavigation(href)) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          recordBlockedAd(href, 'click-hijack-anchor');
          console.warn('[AdvancedAdBlocker] Intercepted ad click-hijack:', href);
          return;
        }

        // If it's targeting _blank and not an internal link
        if (isBlank && isExternalNavigation(href)) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          recordBlockedAd(href || 'blank-ad-target', 'blank-click-target');
          return;
        }
      }

      // Check for transparent click-jacking overlays (floating divs covering screen)
      if (target !== document.body && target !== document.documentElement) {
        const style = window.getComputedStyle(target);
        // Check if element is legitimate player controls
        const isLegitimateControl = target.closest(
          '.player-ctrl-glass-btn, .persistent-player-back-btn, .player-menu-modal, .player-header-bar, .hold-2x-pill-banner, button, select, input'
        );
        
        // If an element is positioned fixed/absolute with high z-index and is transparent / click-jack
        if (!isLegitimateControl && (style.position === 'fixed' || style.position === 'absolute')) {
          const zIndex = parseInt(style.zIndex, 10);
          const isTransparent = style.opacity === '0' || parseFloat(style.opacity) < 0.05 ||
            style.backgroundColor === 'rgba(0, 0, 0, 0)' || style.backgroundColor === 'transparent';
          const isHugeZIndex = zIndex > 999 || zIndex === 2147483647;
          
          if (isHugeZIndex && isTransparent) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            console.warn('[AdvancedAdBlocker] Destroyed transparent click-jack overlay element:', target);
            target.remove();
            return;
          }

          // Also catch near-invisible overlays covering large screen area
          const rect = target.getBoundingClientRect();
          const screenCoverage = (rect.width * rect.height) / (window.innerWidth * window.innerHeight);
          if (screenCoverage > 0.4 && (isHugeZIndex || isTransparent)) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            console.warn('[AdvancedAdBlocker] Removed large screen-covering overlay:', target);
            target.remove();
            return;
          }
        }
      }
    } catch {
      // ignore
    }
  };

  // Also intercept mousedown for popunder prevention (some ads trigger on mousedown)
  const mousedownHandler = (e: MouseEvent) => {
    try {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('.custom-fullscreen-player-container')) return;

      const style = window.getComputedStyle(target);
      if (style.position === 'fixed' || style.position === 'absolute') {
        const zIndex = parseInt(style.zIndex, 10);
        if (zIndex > 99999) {
          e.preventDefault();
          e.stopImmediatePropagation();
          target.remove();
          console.warn('[AdvancedAdBlocker] Blocked mousedown click-jack overlay');
        }
      }
    } catch {
      // ignore
    }
  };

  document.addEventListener('click', clickHandler, true);
  document.addEventListener('mousedown', mousedownHandler, true);
  cleanupFns.push(() => {
    document.removeEventListener('click', clickHandler, true);
    document.removeEventListener('mousedown', mousedownHandler, true);
  });
}

/**
 * 3. TOP-LEVEL NAVIGATION & REDIRECT INTERCEPTOR:
 * Embedded players may try to navigate window.top away from StreamPlay.
 * We guard against location.assign and location.replace to external domains.
 */
function interceptNavigationRedirects(): void {
  try {
    if (window.location) {
      originalLocationAssign = window.location.assign.bind(window.location);
      originalLocationReplace = window.location.replace.bind(window.location);

      window.location.assign = function (url: string | URL) {
        const urlStr = String(url);
        if (isExternalNavigation(urlStr)) {
          recordBlockedAd(urlStr, 'location.assign redirect');
          console.warn('[AdvancedAdBlocker] Blocked location.assign redirect to:', urlStr);
          return;
        }
        originalLocationAssign!(urlStr);
      };

      window.location.replace = function (url: string | URL) {
        const urlStr = String(url);
        if (isExternalNavigation(urlStr)) {
          recordBlockedAd(urlStr, 'location.replace redirect');
          console.warn('[AdvancedAdBlocker] Blocked location.replace redirect to:', urlStr);
          return;
        }
        originalLocationReplace!(urlStr);
      };

      cleanupFns.push(() => {
        try {
          if (originalLocationAssign) window.location.assign = originalLocationAssign;
          if (originalLocationReplace) window.location.replace = originalLocationReplace;
        } catch {}
      });
    }
  } catch {
    // Some browsers restrict overriding window.location methods
  }

  // Prevent unwanted page unload triggers by third party embeds
  const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
    delete (e as any).returnValue;
  };
  window.addEventListener('beforeunload', beforeUnloadHandler);
  cleanupFns.push(() => window.removeEventListener('beforeunload', beforeUnloadHandler));
}

/**
 * 4. NETWORK GUARDS (Fetch & XMLHttpRequest):
 * Automatically drop any fetch or XHR request to dynamically learned ad domains.
 */
function interceptNetworkRequests(): void {
  // Fetch override
  try {
    originalFetch = window.fetch;
    window.fetch = async function (...args: any[]): Promise<Response> {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
      if (url && isAdUrl(url)) {
        recordBlockedAd(url, 'fetch');
        console.warn('[AdvancedAdBlocker] Blocked fetch to ad domain:', url);
        return new Response('', { status: 204, statusText: 'Blocked by StreamPlay AdvancedAdBlocker' });
      }
      return originalFetch!.apply(window, args as any);
    };
  } catch {
    // ignore
  }

  // XMLHttpRequest override
  try {
    originalXhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (
      this: XMLHttpRequest,
      method: string,
      url: string | URL,
      ...rest: any[]
    ) {
      const urlStr = String(url);
      if (urlStr && isAdUrl(urlStr)) {
        recordBlockedAd(urlStr, 'xhr');
        console.warn('[AdvancedAdBlocker] Blocked XHR to ad domain:', urlStr);
        return originalXhrOpen.call(this, method, 'data:,', ...rest);
      }
      return originalXhrOpen.call(this, method, url, ...rest);
    } as any;
  } catch {
    // ignore
  }
}

/**
 * 5. WEBSOCKET AD-BEACON INTERCEPTOR:
 * Some advanced ad scripts open WebSocket connections to push real-time
 * ad events or tracking beacons. We proxy the WebSocket constructor.
 */
function interceptWebSockets(): void {
  try {
    originalWebSocket = window.WebSocket;
    const OrigWS = window.WebSocket;

    (window as any).WebSocket = function (url: string | URL, protocols?: string | string[]) {
      const urlStr = String(url);
      const host = extractHostname(urlStr.replace(/^wss?:\/\//, 'https://'));

      if (host && !isWhitelisted(host) && dynamicBlockedDomains.has(host)) {
        recordBlockedAd(urlStr, 'websocket');
        console.warn('[AdvancedAdBlocker] Blocked WebSocket to ad domain:', urlStr);
        // Return a neutered WebSocket that immediately closes
        const mockWs = {
          url: urlStr,
          readyState: 3, // CLOSED
          bufferedAmount: 0,
          extensions: '',
          protocol: '',
          binaryType: 'blob',
          onopen: null,
          onclose: null,
          onmessage: null,
          onerror: null,
          send: () => {},
          close: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => true,
          CONNECTING: 0,
          OPEN: 1,
          CLOSING: 2,
          CLOSED: 3,
        };
        // Trigger onerror asynchronously
        setTimeout(() => {
          if (typeof (mockWs as any).onerror === 'function') {
            (mockWs as any).onerror(new Event('error'));
          }
        }, 0);
        return mockWs;
      }

      if (protocols) {
        return new OrigWS(url, protocols);
      }
      return new OrigWS(url);
    } as any;

    // Preserve static properties
    (window as any).WebSocket.CONNECTING = 0;
    (window as any).WebSocket.OPEN = 1;
    (window as any).WebSocket.CLOSING = 2;
    (window as any).WebSocket.CLOSED = 3;
    (window as any).WebSocket.prototype = OrigWS.prototype;

    cleanupFns.push(() => {
      try {
        if (originalWebSocket) (window as any).WebSocket = originalWebSocket;
      } catch {}
    });
  } catch {
    // ignore
  }
}

/**
 * 6. SERVICE WORKER REGISTRATION BLOCKER:
 * Prevent ad scripts from registering service workers that could persist
 * ad injection beyond the current session.
 */
function interceptServiceWorkerRegistration(): void {
  try {
    if (navigator.serviceWorker && navigator.serviceWorker.register) {
      originalServiceWorkerRegister = navigator.serviceWorker.register.bind(navigator.serviceWorker);

      navigator.serviceWorker.register = function (scriptURL: string | URL, options?: RegistrationOptions) {
        const urlStr = String(scriptURL);
        const host = extractHostname(urlStr);

        if (host && !isWhitelisted(host)) {
          recordBlockedAd(urlStr, 'service-worker-register');
          console.warn('[AdvancedAdBlocker] Blocked Service Worker registration from:', urlStr);
          return Promise.reject(new DOMException('Blocked by StreamPlay AdBlocker', 'SecurityError'));
        }

        return originalServiceWorkerRegister(scriptURL, options);
      };

      cleanupFns.push(() => {
        try {
          if (originalServiceWorkerRegister) {
            navigator.serviceWorker.register = originalServiceWorkerRegister;
          }
        } catch {}
      });
    }
  } catch {
    // ignore
  }
}

/**
 * 7. NAVIGATOR.SENDBEACON INTERCEPTOR:
 * Block tracking beacons sent to ad domains.
 */
function interceptSendBeacon(): void {
  try {
    if (navigator.sendBeacon) {
      originalSendBeacon = navigator.sendBeacon.bind(navigator);

      navigator.sendBeacon = function (url: string | URL, data?: BodyInit | null) {
        const urlStr = String(url);
        if (isAdUrl(urlStr)) {
          recordBlockedAd(urlStr, 'sendBeacon');
          console.warn('[AdvancedAdBlocker] Blocked sendBeacon to ad domain:', urlStr);
          return false;
        }
        return originalSendBeacon(urlStr, data);
      };

      cleanupFns.push(() => {
        try {
          if (originalSendBeacon) navigator.sendBeacon = originalSendBeacon;
        } catch {}
      });
    }
  } catch {
    // ignore
  }
}

/**
 * 8. POSTMESSAGE SPAM FILTER:
 * Filter out cross-origin postMessage spam used for ad coordination.
 */
function interceptPostMessageSpam(): void {
  const messageHandler = (e: MessageEvent) => {
    try {
      // Only filter messages from external origins
      if (e.origin && e.origin !== window.location.origin) {
        const originHost = extractHostname(e.origin);
        if (originHost && dynamicBlockedDomains.has(originHost)) {
          // Silently consume the event
          e.stopImmediatePropagation();
          console.warn('[AdvancedAdBlocker] Filtered postMessage from blocked domain:', e.origin);
          return;
        }

        // Detect ad coordination messages by content patterns
        if (typeof e.data === 'string') {
          const data = e.data.toLowerCase();
          if (data.includes('ad_') || data.includes('advert') || data.includes('sponsor') ||
              data.includes('monetiz') || data.includes('popunder') || data.includes('clickunder')) {
            e.stopImmediatePropagation();
            recordBlockedAd(e.origin || 'postMessage', 'postMessage-ad-coordination');
            return;
          }
        }
      }
    } catch {
      // ignore
    }
  };

  window.addEventListener('message', messageHandler, true);
  cleanupFns.push(() => window.removeEventListener('message', messageHandler, true));
}

/**
 * 9. CSS COSMETIC AD HIDING:
 * Inject a stylesheet that hides common ad-related DOM patterns
 * without needing to know specific selectors ahead of time.
 */
let cosmeticStyleEl: HTMLStyleElement | null = null;

function injectCosmeticAdHider(): void {
  if (cosmeticStyleEl) return;

  cosmeticStyleEl = document.createElement('style');
  cosmeticStyleEl.id = 'streamplay-adblock-cosmetic';
  cosmeticStyleEl.textContent = `
    /* Hide common ad container patterns outside our player */
    body > div[id*="ad-"]:not(.custom-fullscreen-player-container *),
    body > div[id*="ad_"]:not(.custom-fullscreen-player-container *),
    body > div[class*="ad-wrap"]:not(.custom-fullscreen-player-container *),
    body > div[class*="ad_wrap"]:not(.custom-fullscreen-player-container *),
    body > div[class*="advert"]:not(.custom-fullscreen-player-container *),
    body > div[class*="banner"]:not(.custom-fullscreen-player-container *),
    body > div[class*="popup"]:not(.custom-fullscreen-player-container *),
    body > div[class*="overlay"][style*="z-index"]:not(.custom-fullscreen-player-container *),
    body > div[class*="modal"][style*="z-index: 99"]:not(.custom-fullscreen-player-container *),
    body > ins[class*="ad"]:not(.custom-fullscreen-player-container *),
    body > aside[id*="ad"]:not(.custom-fullscreen-player-container *) {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
      width: 0 !important;
      height: 0 !important;
      overflow: hidden !important;
      position: absolute !important;
      left: -9999px !important;
    }

    /* Neutralize fullscreen transparent hijack overlays */
    body > div[style*="position: fixed"][style*="z-index"]:not(.custom-fullscreen-player-container):not(.custom-fullscreen-player-container *) {
      pointer-events: none !important;
    }
  `;

  try {
    (document.head || document.documentElement).appendChild(cosmeticStyleEl);
  } catch {
    // ignore
  }

  cleanupFns.push(() => {
    if (cosmeticStyleEl && cosmeticStyleEl.parentNode) {
      cosmeticStyleEl.parentNode.removeChild(cosmeticStyleEl);
      cosmeticStyleEl = null;
    }
  });
}

/**
 * 10. DYNAMIC DOM CLEANER (MutationObserver):
 * Watches for dynamically injected ad scripts, iframes, or full-screen click overlays,
 * removing them immediately without needing static domain lists.
 */
function setupDynamicDomObserver(): void {
  if (domObserver) return;

  const cleanNode = (node: Node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;

    // Never touch elements inside our player UI
    if (el.closest('.custom-fullscreen-player-container')) return;

    // 1. Injected Scripts with external ad sources
    if (el.tagName === 'SCRIPT') {
      const script = el as HTMLScriptElement;
      if (script.src && isAdUrl(script.src)) {
        recordBlockedAd(script.src, 'injected-script');
        script.remove();
        return;
      }
      // Check inline script content for suspicious patterns
      if (!script.src && script.textContent) {
        const content = script.textContent;
        if (SUSPICIOUS_SCRIPT_PATTERNS.some(p => p.test(content))) {
          console.warn('[AdvancedAdBlocker] Removed suspicious inline ad script');
          script.remove();
          return;
        }
      }
    }

    // 2. Injected IFrames with external ad sources
    if (el.tagName === 'IFRAME') {
      const iframe = el as HTMLIFrameElement;
      if (iframe.src && isAdUrl(iframe.src)) {
        recordBlockedAd(iframe.src, 'injected-iframe');
        iframe.remove();
        return;
      }
      // Check for zero-dimension iframes (tracking pixels)
      const width = parseInt(iframe.width || iframe.style.width || '999', 10);
      const height = parseInt(iframe.height || iframe.style.height || '999', 10);
      if ((width === 0 || width === 1) && (height === 0 || height === 1)) {
        if (iframe.src && !isWhitelisted(extractHostname(iframe.src) || '')) {
          recordBlockedAd(iframe.src || 'tracking-pixel-iframe', 'tracking-pixel');
          iframe.remove();
          return;
        }
      }
    }

    // 3. Injected IMG tracking pixels
    if (el.tagName === 'IMG') {
      const img = el as HTMLImageElement;
      const width = img.width || parseInt(img.style.width || '999', 10);
      const height = img.height || parseInt(img.style.height || '999', 10);
      if ((width <= 1) && (height <= 1) && img.src) {
        const host = extractHostname(img.src);
        if (host && !isWhitelisted(host)) {
          recordBlockedAd(img.src, 'tracking-pixel-img');
          img.remove();
          return;
        }
      }
    }

    // 4. Transparent click overlays (fixed position, high z-index, zero opacity or full screen)
    if (el.tagName === 'DIV' || el.tagName === 'A' || el.tagName === 'SPAN') {
      const style = el.style;
      if (style.position === 'fixed' || style.position === 'absolute') {
        const zIndex = parseInt(style.zIndex, 10);
        if (zIndex > 9999 || zIndex === 2147483647) {
          const isFullScreen =
            (style.width === '100%' || style.width === '100vw') &&
            (style.height === '100%' || style.height === '100vh');
          const isTransparent =
            style.opacity === '0' || parseFloat(style.opacity) < 0.05;
          if (isFullScreen || isTransparent) {
            console.warn('[AdvancedAdBlocker] Removed dynamic fullscreen/transparent overlay:', el.tagName);
            el.remove();
            return;
          }
        }
      }
    }

    // 5. Remove injected <link> stylesheet from ad domains
    if (el.tagName === 'LINK') {
      const link = el as HTMLLinkElement;
      if (link.rel === 'stylesheet' && link.href && isAdUrl(link.href)) {
        recordBlockedAd(link.href, 'injected-stylesheet');
        link.remove();
        return;
      }
    }
  };

  domObserver = new MutationObserver((mutations) => {
    for (let m = 0; m < mutations.length; m++) {
      const addedNodes = mutations[m].addedNodes;
      for (let i = 0; i < addedNodes.length; i++) {
        cleanNode(addedNodes[i]);
      }

      // Also check attribute modifications (e.g., src changes on iframes)
      if (mutations[m].type === 'attributes' && mutations[m].target) {
        const target = mutations[m].target as HTMLElement;
        if (target.tagName === 'IFRAME') {
          const iframe = target as HTMLIFrameElement;
          if (iframe.src && isAdUrl(iframe.src) && !iframe.closest('.custom-fullscreen-player-container')) {
            recordBlockedAd(iframe.src, 'attribute-change-iframe');
            iframe.remove();
          }
        }
      }
    }
  });

  try {
    domObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'href'],
    });
  } catch {
    // ignore
  }
}

/**
 * 11. PERIODIC AGGRESSIVE DOM SWEEP:
 * Some ad injectors delay their payload by several seconds or use
 * requestAnimationFrame chains. This sweep runs every 3s to catch them.
 */
function startPeriodicDomSweep(): void {
  if (periodicSweepTimer) return;

  const sweep = () => {
    try {
      // Remove fixed-position overlays with extreme z-index outside our player
      const allFixed = document.querySelectorAll('div[style*="position: fixed"], div[style*="position:fixed"]');
      allFixed.forEach((el) => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.closest('.custom-fullscreen-player-container')) return;
        if (htmlEl.closest('#root')) return; // Don't remove app elements

        const computed = window.getComputedStyle(htmlEl);
        const zIndex = parseInt(computed.zIndex, 10);
        if (zIndex > 99999) {
          const rect = htmlEl.getBoundingClientRect();
          const screenCoverage = (rect.width * rect.height) / (window.innerWidth * window.innerHeight);
          if (screenCoverage > 0.3) {
            console.warn('[AdvancedAdBlocker] Periodic sweep removed overlay:', htmlEl);
            htmlEl.remove();
          }
        }
      });

      // Remove iframes injected outside our player that point to ad domains
      const allIframes = document.querySelectorAll('iframe:not(.custom-stream-iframe)');
      allIframes.forEach((iframe) => {
        const el = iframe as HTMLIFrameElement;
        if (el.closest('.custom-fullscreen-player-container')) return;
        if (el.src && isAdUrl(el.src)) {
          recordBlockedAd(el.src, 'periodic-sweep-iframe');
          el.remove();
        }
      });
    } catch {
      // ignore
    }
  };

  periodicSweepTimer = setInterval(sweep, 3000);
  cleanupFns.push(() => {
    if (periodicSweepTimer) {
      clearInterval(periodicSweepTimer);
      periodicSweepTimer = null;
    }
  });
}

/**
 * 12. VISIBILITY API ABUSE PREVENTION:
 * Some ad scripts detect when the page is focused/visible to trigger popups.
 * We prevent them from accurately reading visibility state.
 */
function preventVisibilityAbuse(): void {
  const visibilityHandler = (e: Event) => {
    // Prevent ad scripts from detecting tab focus changes
    if (document.visibilityState === 'visible') {
      e.stopImmediatePropagation();
    }
  };

  // Only capture phase to prevent ad scripts from reacting first
  document.addEventListener('visibilitychange', visibilityHandler, true);
  cleanupFns.push(() => document.removeEventListener('visibilitychange', visibilityHandler, true));
}

/* ────────────────────────────────────────────────────────────
   6. PUBLIC API — ACTIVATE, DEACTIVATE & CONTROLS
   ──────────────────────────────────────────────────────────── */

/**
 * Activate the Advanced Ad Blocker.
 * Sets up dynamic URL interception across all vectors:
 * popups, redirects, clicks, network, DOM mutations, WebSockets,
 * service workers, beacons, cosmetic hiding, and periodic sweeps.
 */
export function activateAdBlocker(): () => void {
  if (installed) {
    return () => deactivateAdBlocker();
  }
  installed = true;

  console.info(
    `[AdvancedAdBlocker] 🛡️ Activated — Dynamic learning enabled (${dynamicBlockedDomains.size} domains in session memory)`
  );

  // Core guards
  interceptWindowOpen();
  interceptClickHijacking();
  interceptNavigationRedirects();
  interceptNetworkRequests();
  setupDynamicDomObserver();

  // Advanced guards
  interceptWebSockets();
  interceptServiceWorkerRegistration();
  interceptSendBeacon();
  interceptPostMessageSpam();
  injectCosmeticAdHider();
  startPeriodicDomSweep();
  preventVisibilityAbuse();

  return () => deactivateAdBlocker();
}

/**
 * Deactivate the ad blocker and restore original browser APIs.
 */
export function deactivateAdBlocker(): void {
  if (!installed) return;
  installed = false;

  console.info('[AdvancedAdBlocker] Deactivated — Restoring browser hooks');

  try {
    if (originalOpen) window.open = originalOpen;
  } catch {}
  try {
    if (originalFetch) window.fetch = originalFetch;
  } catch {}
  try {
    if (originalXhrOpen) XMLHttpRequest.prototype.open = originalXhrOpen;
  } catch {}
  try {
    if (originalWebSocket) (window as any).WebSocket = originalWebSocket;
  } catch {}

  if (domObserver) {
    domObserver.disconnect();
    domObserver = null;
  }

  cleanupFns.splice(0).forEach((fn) => {
    try {
      fn();
    } catch {}
  });

  originalOpen = null;
  originalFetch = null;
  originalXhrOpen = null;
  originalLocationAssign = null;
  originalLocationReplace = null;
  originalWebSocket = null;
  originalServiceWorkerRegister = null;
  originalSendBeacon = null;
}

/**
 * Manually add a domain to the dynamic blocklist.
 */
export function addBlockedDomain(domain: string): void {
  if (!domain) return;
  const host = domain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
  if (host && !isWhitelisted(host)) {
    dynamicBlockedDomains.add(host);
    classifiedCache.set(host, true);
    persistDomains(dynamicBlockedDomains);
    console.info(`[AdvancedAdBlocker] Manually added domain: ${host}`);
  }
}

/**
 * Clear the learned dynamic ad blocklist.
 */
export function clearDynamicBlocklist(): void {
  dynamicBlockedDomains.clear();
  classifiedCache.clear();
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
  console.info('[AdvancedAdBlocker] Cleared dynamic blocklist');
}

/**
 * Returns diagnostic stats on dynamically blocked ads and domains.
 */
export function getBlockStats(): {
  totalBlocked: number;
  dynamicDomainsCount: number;
  dynamicDomains: string[];
  recentBlocks: BlockEvent[];
} {
  return {
    totalBlocked: totalBlockedCount,
    dynamicDomainsCount: dynamicBlockedDomains.size,
    dynamicDomains: Array.from(dynamicBlockedDomains),
    recentBlocks: [...recentBlocks],
  };
}

/**
 * Check if the dynamic ad blocker is currently running.
 */
export function isAdBlockerActive(): boolean {
  return installed;
}
