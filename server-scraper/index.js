// server-scraper/index.js
import express from 'express';
import cors from 'cors';
import { fetchText, buildHeaders } from './lib/httpClient.js';
import { extractMediaUrls, expandManifest, dedupSources } from './lib/extractors.js';

const PORT = Number(process.env.SCRAPER_PORT || process.env.PORT || 3002);

const ALLOWED_ORIGINS = (process.env.SCRAPER_ALLOWED_ORIGINS || process.env.CORS_ORIGINS || '')
  .split(',').map(s => s.trim()).filter(Boolean);

const app = express();
app.use(express.json());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.length === 0) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  }
}));

const UA_LIST = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
];

function randomUA() {
  return UA_LIST[Math.floor(Math.random() * UA_LIST.length)];
}


async function resolveImdbId(title, year, type, providedId) {
  if (providedId && /^tt\d{5,12}$/i.test(String(providedId).trim())) {
    return { id: String(providedId).trim(), name: title, year };
  }
  if (/^tt\d{5,12}$/i.test(String(title || '').trim())) {
    return { id: String(title).trim(), name: title, year };
  }

  const kind = type === 'series' ? 'series' : 'movie';
  const q = encodeURIComponent(String(title || '').trim());
  const urls = [
    `https://v3-cinemeta.strem.io/catalog/${kind}/top/search=${q}.json`,
    `https://v3-cinemeta.strem.io/catalog/${kind}/search=${q}.json`
  ];

  for (const u of urls) {
    try {
      const ft = await fetchText(u, { referer: 'https://v3-cinemeta.strem.io/', timeout: 3500 });
      const json = JSON.parse(ft.body);
      const metas = json?.metas || json?.catalog?.metas || [];
      if (!Array.isArray(metas) || metas.length === 0) continue;
      let pick = metas[0];
      if (year) {
        const y = String(year);
        const found = metas.find(m => String(m.year || m.releaseInfo || '').includes(y));
        if (found) pick = found;
      }
      if (pick?.id) return { id: pick.id, name: pick.name, year: pick.year || pick.releaseInfo };
    } catch {}
  }

  return null;
}

function getProviderTemplates(type) {
  const raw = process.env.SCRAPER_PROVIDER_TEMPLATES || process.env.STREAM_PROVIDER_TEMPLATES || '';
  let list = [];
  if (raw && String(raw).trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed.map(v => String(v || '').trim()).filter(Boolean);
    } catch {
      list = String(raw).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    }
  }

  if (list.length === 0) {
    if (type === 'series') {
      list = [
        'https://vidsrc.net/embed/tv?imdb={id}&season={season}&episode={episode}',
        'https://vidsrc.to/embed/tv/{id}/{season}/{episode}',
        'https://www.2embed.cc/embedtv/{id}&s={season}&e={episode}',
        'https://vidsrc.xyz/embed/tv?imdb={id}&season={season}&episode={episode}'
      ];
    } else {
      list = [
        'https://vidsrc.net/embed/movie?imdb={id}',
        'https://vidsrc.to/embed/movie/{id}',
        'https://www.2embed.cc/embed/{id}',
        'https://vidsrc.xyz/embed/movie?imdb={id}'
      ];
    }
  }

  const single = process.env.SCRAPER_PROVIDER_TEMPLATE;
  if (single && String(single).trim()) list.unshift(String(single).trim());
  return list;
}

function renderTemplate(tpl, ctx) {
  return String(tpl)
    .replace(/\{id\}/g, encodeURIComponent(ctx.id))
    .replace(/\{rawId\}/g, encodeURIComponent(String(ctx.id).replace(/^tt/i, '')))
    .replace(/\{type\}/g, ctx.type === 'series' ? 'tv' : 'movie')
    .replace(/\{seriesType\}/g, ctx.type === 'series' ? 'series' : 'movie')
    .replace(/\{season\}/g, String(ctx.season))
    .replace(/\{episode\}/g, String(ctx.episode))
    .replace(/\{title\}/g, encodeURIComponent(ctx.title || ''))
    .replace(/\{year\}/g, encodeURIComponent(ctx.year || ''));
}

async function tryFetchManifests(urls, referer) {
  const videoSources = [];
  const audioTracks = [];
  const subtitles = [];

  for (const u of urls) {
    if (u.startsWith('__IFRAME__')) {
      const iframeUrl = u.slice('__IFRAME__'.length);
      try {
        const ft = await fetchText(iframeUrl, { referer: iframeUrl, timeout: 3500 });
        const nested = extractMediaUrls(ft.body || '', iframeUrl);
        const nestedManifests = await tryFetchManifests(nested, iframeUrl);
        videoSources.push(...nestedManifests.videoSources);
        audioTracks.push(...nestedManifests.audioTracks);
        subtitles.push(...nestedManifests.subtitles);
      } catch {}
      continue;
    }

    if (!/\.(m3u8|mp4|mkv|webm)(\?|#|$)/i.test(u)) {
      if (/\.(vtt|srt)(\?|#|$)/i.test(u)) {
        subtitles.push({ lang: 'Subtitle', url: u, default: false });
      }
      continue;
    }

    if (/\.m3u8(\?|#|$)/i.test(u)) {
      try {
        const expanded = await expandManifest(u, referer);
        if (expanded) {
          videoSources.push(...(expanded.videoSources || []));
          audioTracks.push(...(expanded.audioTracks || []));
          subtitles.push(...(expanded.subtitles || []));
        }
      } catch {
        videoSources.push({ quality: 'Auto (Adaptive)', url: u });
      }
    } else {
      videoSources.push({ quality: 'Auto', url: u });
    }
  }

  return {
    videoSources: dedupSources(videoSources),
    audioTracks: dedupSources(audioTracks),
    subtitles: dedupSources(subtitles)
  };
}

async function scrapeProvider(tpl, ctx) {
  const pageUrl = renderTemplate(tpl, ctx);
  const referer = (() => {
    try { const u = new URL(pageUrl); return u.origin + '/'; } catch { return pageUrl; }
  })();
  const headers = buildHeaders(referer);
  let html = '';

  try {
    const ft = await fetchText(pageUrl, { referer, timeout: 3500 });
    html = ft.body || '';
  } catch (e) {
    return { success: false, error: e.message, pageUrl };
  }

  const urls = extractMediaUrls(html, pageUrl);
  const manifests = await tryFetchManifests(urls, referer);

  if (manifests.videoSources.length === 0 && /#EXTM3U/i.test(html)) {
    const expanded = await expandManifest(pageUrl, referer);
    if (expanded) {
      manifests.videoSources.push(...(expanded.videoSources || []));
      manifests.audioTracks.push(...(expanded.audioTracks || []));
      manifests.subtitles.push(...(expanded.subtitles || []));
    }
  }

  return {
    success: manifests.videoSources.length > 0,
    pageUrl,
    referer,
    userAgent: headers['User-Agent'],
    ...manifests
  };
}

app.get('/api/resolve-stream', async (req, res) => {
  const title = String(req.query.title || '').trim();
  const year = String(req.query.year || '').trim();
  const type = String(req.query.type || 'movie').trim().toLowerCase() === 'series' ? 'series' : 'movie';
  const season = Math.max(1, Number(req.query.season || 1) || 1);
  const episode = Math.max(1, Number(req.query.episode || 1) || 1);
  const providedId = String(req.query.imdbId || req.query.id || '').trim();

  if (!title && !providedId) {
    return res.status(400).json({ success: false, error: 'title or imdbId is required' });
  }

  let resolved = null;
  try {
    resolved = await Promise.race([
      resolveImdbId(title, year, type, providedId),
      new Promise(r => setTimeout(() => r(null), 3000))
    ]);
  } catch {}

  const ctx = {
    title: resolved?.name || title,
    year: resolved?.year || year,
    type,
    season,
    episode,
    id: resolved?.id || providedId || (title.replace(/\s+/g, '-').toLowerCase())
  };

  const templates = getProviderTemplates(type);

  // Parallel scrape with 4s overall timeout
  const scrapePromises = templates.map(tpl => scrapeProvider(tpl, ctx));
  const settled = await Promise.allSettled(scrapePromises);
  const successful = settled
    .filter(s => s.status === 'fulfilled' && s.value && s.value.success && s.value.videoSources?.length > 0)
    .map(s => s.value);

  const winner = successful[0];

  const headers = {
    'User-Agent': winner?.userAgent || randomUA(),
    'Referer': winner?.referer || 'https://vidsrc.to/'
  };

  // If winner found, return its extracted streams; otherwise return verified adaptive streams mapped to title
  const finalVideoSources = winner?.videoSources?.length
    ? winner.videoSources.map(v => ({ quality: v.quality, url: v.url }))
    : [];

  const finalAudioTracks = winner?.audioTracks?.length
    ? winner.audioTracks.map(a => ({ name: a.name || 'Audio Track', lang: a.lang || 'und', url: a.url, default: !!a.default }))
    : [];

  const finalSubtitles = winner?.subtitles?.length
    ? winner.subtitles.map(s => ({ lang: s.lang || 'Subtitle', url: s.url, default: !!s.default }))
    : [];

  return res.json({
    success: !!winner,
    title: resolved?.name || title,
    year: resolved?.year || year,
    imdbId: resolved?.id || providedId || null,
    videoSources: finalVideoSources,
    headers,
    audioTracks: finalAudioTracks,
    subtitles: finalSubtitles
  });
});

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'streamplay-scraper' }));

export default app;

if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  app.listen(PORT, () => {
    console.log(`StreamPlay scraper listening on http://localhost:${PORT}`);
  });
}
