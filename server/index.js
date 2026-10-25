import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import crypto from 'node:crypto';
import { streamLimiter, proxyLimiter } from './rateLimiter.js';
import * as streamCrypto from './streamCrypto.js';
const TOKEN_TTL_MS = 60 * 60 * 1000;

const PORT = Number(process.env.PORT || 3001);

function sendJson(res, status, obj) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(obj));
}

function fetchText(targetUrl) {
  return new Promise((resolve, reject) => {
    const u = new URL(targetUrl);
    const mod = u.protocol === 'https:' ? https : http;
    const req = mod.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': `${u.origin}/`
      }
    }, (r) => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
        const next = new URL(r.headers.location, targetUrl).toString();
        fetchText(next).then(resolve).catch(reject);
        return;
      }
      let data = '';
      r.setEncoding('utf8');
      r.on('data', (c) => { data += c; });
      r.on('end', () => resolve({ status: r.statusCode, headers: r.headers, body: data, finalUrl: targetUrl }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(new Error('timeout')); });
  });
}


function fetchBuffer(targetUrl) {
  return new Promise((resolve, reject) => {
    const u = new URL(targetUrl);
    const mod = u.protocol === 'https:' ? https : http;
    const req = mod.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': '*/*',
        'Referer': `${u.origin}/`
      }
    }, (r) => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
        const next = new URL(r.headers.location, targetUrl).toString();
        fetchBuffer(next).then(resolve).catch(reject);
        return;
      }
      const chunks = [];
      r.on('data', (c) => chunks.push(c));
      r.on('end', () => resolve({ status: r.statusCode, headers: r.headers, body: Buffer.concat(chunks), finalUrl: targetUrl }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(new Error('timeout')); });
  });
}

function extractMediaUrl(html) {
  const patterns = [
    /https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*/i,
    /https?:\/\/[^"'\s<>]+\.mp4[^"'\s<>]*/i
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m && m[0].startsWith('http')) return m[0];
  }
  return null;
}

function isValidId(id) {
  return /^tt\d{5,12}$/.test(id) || /^\d{1,12}$/.test(id);
}

function getProviderTemplates() {
  const raw = process.env.STREAM_PROVIDER_TEMPLATES || process.env.STREAM_PROVIDERS || '';
  if (!raw || !String(raw).trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((v) => String(v || '').trim()).filter(Boolean);
    }
  } catch {
    // Allow comma-separated templates for simple env configuration.
  }
  return String(raw).split(',').map((v) => v.trim()).filter(Boolean);
}

function renderProviderTemplate(template, id, type, season, episode) {
  return String(template || '')
    .replace(/\{id\}/g, encodeURIComponent(id))
    .replace(/\{type\}/g, type === 'series' ? 'series' : 'movie')
    .replace(/\{season\}/g, String(season))
    .replace(/\{episode\}/g, String(episode))
    .replace(/\{rawId\}/g, encodeURIComponent(String(id).replace(/^tt/i, '')));
}

function extractMediaUrls(html) {
  const found = new Set();
  const matches = String(html || '').match(/https?:\/\/[^"'\\s<>]+/gi) || [];
  const m3u8 = [];
  const mp4 = [];
  for (const raw of matches) {
    const cleaned = raw.replace(/[),;]+$/, '');
    if (!validateTargetUrl(cleaned)) continue;
    if (/\.m3u8(\?|$)/i.test(cleaned)) m3u8.push(cleaned);
    else if (/\.mp4(\?|$)/i.test(cleaned)) mp4.push(cleaned);
  }
  for (const u of [...m3u8, ...mp4]) found.add(u);
  return [...found];
}

async function resolveProviderMediaUrls(id, type, season, episode) {
  const templates = getProviderTemplates();
  const urls = [];
  const seen = new Set();
  for (const template of templates) {
    const embedUrl = renderProviderTemplate(template, id, type, season, episode);
    if (!embedUrl || !validateTargetUrl(embedUrl)) continue;
    try {
      const { body } = await fetchText(embedUrl);
      for (const mediaUrl of extractMediaUrls(body)) {
        if (seen.has(mediaUrl)) continue;
        seen.add(mediaUrl);
        urls.push(mediaUrl);
      }
    } catch {
      // Try the next configured provider.
    }
  }
  return urls;
}

async function buildStreamBundle(req, mediaUrls) {
  const sessionId = (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'));
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const base = (req.headers['x-forwarded-proto'] || 'http') + '://' + (req.headers.host || ('localhost:' + PORT));
  const mirrors = [];
  for (let i = 0; i < mediaUrls.length; i++) {
    const mediaUrl = mediaUrls[i];
    const token = await streamCrypto.signStreamToken({
      url: mediaUrl,
      sid: sessionId,
      origin: new URL(mediaUrl).origin,
      allowedOrigins: [new URL(mediaUrl).origin],
      exp: expiresAt
    });
    const proxyUrl = base + '/api/proxy/hls?token=' + encodeURIComponent(token);
    mirrors.push({
      id: 'mirror-' + i,
      name: 'Mirror ' + (i + 1),
      url: proxyUrl,
      health: i === 0 ? 'healthy' : 'unknown'
    });
  }
  return {
    sessionId,
    expiresAt,
    mirrors,
    subtitles: [],
    qualities: ['auto']
  };
}


function clientIp(req) {
  const xf = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim();
  return xf || (req.socket && req.socket.remoteAddress) || 'unknown';
}

function isPrivateHost(hostname) {
  const h = (hostname || '').toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h.endsWith('.localhost')) return true;
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(h)) return true;
  if (h === '0.0.0.0' || h === '169.254.169.254') return true;
  return false;
}

function validateTargetUrl(target) {
  let u;
  try { u = new URL(target); } catch { return false; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  if (isPrivateHost(u.hostname)) return false;
  return true;
}

function allowedOriginForReq(req) {
  const originHeader = req.headers.origin;
  const referer = req.headers.referer;
  const candidates = [originHeader, referer].filter(Boolean);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VITE_APP_URL || process.env.APP_URL || 'http://localhost:5173';
  const allowed = new Set([appUrl, 'http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://localhost:4173']);
  for (const c of candidates) {
    try { const o = new URL(c).origin; if (allowed.has(o)) return o; } catch {}
  }
  return null;
}

function sendNoWildcardCors(req, res, status, headers) {
  const origin = allowedOriginForReq(req);
  const h = Object.assign({}, headers || {});
  if (origin) { h['Access-Control-Allow-Origin'] = origin; h['Vary'] = 'Origin'; }
  res.writeHead(status, h);
}
export async function handleRequest(req, res) {
  const u = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'OPTIONS') {
    if (u.pathname === '/api/proxy/hls' || u.pathname.startsWith('/api/proxy/')) {
      sendNoWildcardCors(req, res, 204, {});
      res.end();
      return;
    }
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  if (u.pathname === '/health') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (u.pathname === '/stream') {
    const id = u.searchParams.get('id') || '';
    const type = u.searchParams.get('type') === 'series' ? 'series' : 'movie';
    const season = Math.max(1, Number(u.searchParams.get('season') || 1));
    const episode = Math.max(1, Number(u.searchParams.get('episode') || 1));
    if (!isValidId(id)) {
      sendJson(res, 404, { error: 'invalid id' });
      return;
    }
    const mediaUrls = await resolveProviderMediaUrls(id, type, season, episode);
    if (mediaUrls.length === 0) {
      sendJson(res, 404, { error: 'no direct stream found' });
      return;
    }
    const bundle = await buildStreamBundle(req, mediaUrls);
    const encrypted = await streamCrypto.encryptStreamManifest(JSON.stringify(bundle));
    sendJson(res, 200, encrypted);
    return;
  }


  if (u.pathname === '/proxy') {
    const target = u.searchParams.get('url');
    if (!target || !/^https?:\/\//i.test(target)) {
      sendJson(res, 400, { error: 'invalid url' });
      return;
    }
    try {
      const { status, headers, body } = await fetchBuffer(target);
      const ct = headers['content-type'] || 'application/octet-stream';
      const isHtml = /text\/html/i.test(ct);
      let out = body;
      if (isHtml) {
        let text = body.toString('utf8');
        let targetOrigin = '';
        try {
          targetOrigin = new URL(target).origin;
        } catch {}

        // 0. Detect upstream 404 / Missing content and inform parent StreamPlay player
        const is404Missing = status === 404 ||
          (text.includes('404') && (text.includes('Content not found') || text.includes('not found'))) ||
          (text.includes('Content not found') && text.includes('IMDB:'));

        if (is404Missing) {
          const failoverScript = `
<script>
  try {
    window.parent.postMessage({ type: 'streamplay_player_error', code: 404, message: 'Content not found on mirror' }, '*');
  } catch(e) {}
</script>
`;
          text = failoverScript + text;
        }

        // 1. Inject <base> tag so relative paths (posters, styles, icons) resolve to target origin
        if (targetOrigin && !/<base\s/i.test(text)) {
          text = text.includes('<head>')
            ? text.replace('<head>', `<head><base href="${targetOrigin}/">`)
            : `<base href="${targetOrigin}/">` + text;
        }

        // 2. Strip known ad injection scripts (tagivi, adplox, popads, propellerads, whos.amung, disable-devtool, etc.)
        text = text.replace(/<script[^>]+(?:tagivi|adplox|whos\.amung|disable-devtool|histats|popads|clickadu|propellerads|interline)[^>]*><\/script>/gi, '');

        // 3. Strip ad links & tracking images
        text = text.replace(/<a[^>]+href=["'][^"']*(?:interline|adplox|traffic|banner|sponsor)[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, '');
        text = text.replace(/<img[^>]+src=["'][^"']*(?:whos\.amung\.us|adplox)[^"']*["'][^>]*>/gi, '');

        // 4. Inject runtime anti-ad protection and auto-player initialization
        const antiAdScript = `
<style>
  /* Strip all ad overlays, ad links, and fake error screens */
  a, a *, a[href], a[target="_blank"] {
    pointer-events: none !important;
    cursor: default !important;
  }
  a[target="_blank"],
  a[href*="interline"],
  a[href*="tagivi"],
  a[href*="adplox"],
  div[class*="ad-"],
  div[id*="ad-"],
  #sbxErr {
    display: none !important;
    pointer-events: none !important;
    visibility: hidden !important;
  }
  .playbtnx, .playbtnx * {
    pointer-events: auto !important;
    cursor: pointer !important;
  }
</style>
<script>
  // Prevent popup window creation
  window.open = function() { return null; };

  // Strip all href and target attributes so Chrome never previews or navigates any ad link
  function stripAllAdLinks() {
    var links = document.querySelectorAll('a');
    for (var i = 0; i < links.length; i++) {
      links[i].removeAttribute('href');
      links[i].removeAttribute('target');
      links[i].style.pointerEvents = 'none';
    }
  }
  document.addEventListener('DOMContentLoaded', stripAllAdLinks);
  if (document.body) stripAllAdLinks();
  try {
    new MutationObserver(stripAllAdLinks).observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href']
    });
  } catch(e) {}

  // Intercept any clicks on ad links
  window.addEventListener('click', function(e) {
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (a && a.href) {
      var href = a.getAttribute('href') || '';
      if (href.startsWith('http') && !href.includes(window.location.host) && !href.includes('vidsrc')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }
  }, true);

  // Auto-play driver: triggers video play and clicks player controls automatically
  function autoPlayEmbeddedMedia() {
    try {
      var ifr = document.getElementById('iframesrc');
      if (ifr && ifr.getAttribute('data-src') && !ifr.src) {
        ifr.src = ifr.getAttribute('data-src');
      }
      var bg = document.getElementById('bgImage');
      if (bg) bg.remove();
      var p = document.querySelector('.playbtnx');
      if (p) {
        p.click();
        p.style.display = 'none';
      }
      var drop = document.querySelector('.dropdown');
      if (drop) drop.style.display = 'block';

      // Auto-click play buttons
      var playBtns = document.querySelectorAll('button[aria-label*="play" i], button[title*="play" i], .play-button, .vjs-big-play-button, .jw-icon-display, .plyr__control--overlaid, [class*="play-btn"], [class*="playBtn"]');
      for (var i = 0; i < playBtns.length; i++) {
        playBtns[i].click();
      }

      // Unpause any HTML5 video
      var vids = document.querySelectorAll('video');
      for (var j = 0; j < vids.length; j++) {
        if (vids[j].paused) {
          vids[j].muted = false;
          vids[j].play().catch(function() {});
        }
      }
    } catch(e) {}
  }

  document.addEventListener('DOMContentLoaded', function() {
    autoPlayEmbeddedMedia();
    setTimeout(autoPlayEmbeddedMedia, 150);
    setTimeout(autoPlayEmbeddedMedia, 450);
    setTimeout(autoPlayEmbeddedMedia, 1000);
    setTimeout(autoPlayEmbeddedMedia, 2000);
  });

  window.addEventListener('message', function(e) {
    if (e.data === 'play' || (e.data && (e.data.type === 'play' || e.data.func === 'playVideo' || e.data.action === 'play'))) {
      autoPlayEmbeddedMedia();
    }
  });
</script>
`;
        out = text.includes('</head>')
          ? text.replace('</head>', antiAdScript + '</head>')
          : antiAdScript + text;
      }
      res.writeHead(status || 200, {
        'Content-Type': ct,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store'
      });
      res.end(out);
    } catch (err) {
      sendJson(res, 502, { error: String(err?.message || err) });
    }
    return;
  }

  if (u.pathname === '/api/health') {
    sendJson(res, 200, { ok: true });
    return;
  }

  const streamMatch = u.pathname.match(/^\/api\/stream\/([^/]+)$/);
  if (streamMatch) {
    const id = decodeURIComponent(streamMatch[1]);
    const ip = clientIp(req);
    const rl = streamLimiter.check(ip);
    if (!rl.allowed) {
      sendJson(res, 429, { error: 'rate limited' });
      return;
    }
    const type = u.searchParams.get('type') === 'series' ? 'series' : 'movie';
    const season = Math.max(1, Number(u.searchParams.get('season') || 1));
    const episode = Math.max(1, Number(u.searchParams.get('episode') || 1));
    if (!isValidId(id)) {
      sendJson(res, 404, { error: 'invalid id' });
      return;
    }
    const mediaUrls = await resolveProviderMediaUrls(id, type, season, episode);
    if (mediaUrls.length === 0) {
      sendJson(res, 404, { error: 'no direct stream found' });
      return;
    }
    const bundle = await buildStreamBundle(req, mediaUrls);
    const encrypted = await streamCrypto.encryptStreamManifest(JSON.stringify(bundle));
    sendJson(res, 200, encrypted);
    return;
  }

  if (u.pathname === '/api/proxy/hls') {
    const ip = clientIp(req);
    const rl = proxyLimiter.check(ip);
    if (!rl.allowed) {
      sendNoWildcardCors(req, res, 429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'rate limited' }));
      return;
    }
    const token = u.searchParams.get('token') || '';
    const payload = await streamCrypto.verifyStreamToken(token);
    if (!payload || !payload.url || !validateTargetUrl(payload.url)) {
      sendNoWildcardCors(req, res, 401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid or expired token' }));
      return;
    }
    if (req.headers.origin && !allowedOriginForReq(req)) {
      sendNoWildcardCors(req, res, 403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'origin not allowed' }));
      return;
    }
    const target = payload.url;
    const base = (req.headers['x-forwarded-proto'] || 'http') + '://' + (req.headers.host || ('localhost:' + PORT));
    const expiresAt = payload.exp || (Date.now() + TOKEN_TTL_MS);
    const sessionId = payload.sid;

    let isManifest = /\.m3u8(\?|$)/i.test(target);
    try {
      const ft = await fetchText(target);
      const body = ft.body || '';
      if (/#EXTM3U/i.test(body)) {
        isManifest = true;
        const lines = body.split(/\r?\n/);
        const rewritten = [];
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) { rewritten.push(line); continue; }
          if (trimmed.startsWith('#')) {
            let out = line;
            const uriRegex = /URI="([^"]+)"/g;
            const matches = [...out.matchAll(uriRegex)];
            for (const m of matches) {
              const uri = m[1];
              try {
                const abs = new URL(uri, target).toString();
                const t = await streamCrypto.signStreamToken({ url: abs, sid: sessionId, exp: expiresAt });
                const newUri = base + '/api/proxy/hls?token=' + encodeURIComponent(t);
                out = out.split('URI="' + uri + '"').join('URI="' + newUri + '"');
              } catch {
                // keep original
              }
            }
            rewritten.push(out);
            continue;
          }
          try {
            const abs = new URL(trimmed, target).toString();
            const t = await streamCrypto.signStreamToken({ url: abs, sid: sessionId, exp: expiresAt });
            rewritten.push(base + '/api/proxy/hls?token=' + encodeURIComponent(t));
          } catch {
            rewritten.push(line);
          }
        }
        const h = {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'public, s-maxage=3, stale-while-revalidate=10',
        };
        sendNoWildcardCors(req, res, 200, h);
        res.end(rewritten.join('\n'));
        return;
      }
    } catch (err) {
      // fall through to stream
    }

    const u2 = new URL(target);
    const mod = u2.protocol === 'https:' ? https : http;
    const upstreamHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      'Accept': '*/*',
      'Referer': u2.origin + '/'
    };
    if (req.headers.range) upstreamHeaders.Range = req.headers.range;
    const upstreamReq = mod.get(target, { headers: upstreamHeaders }, (upstreamRes) => {
      const outHeaders = {
        'Content-Type': upstreamRes.headers['content-type'] || 'application/octet-stream',
        'Accept-Ranges': upstreamRes.headers['accept-ranges'] || 'bytes',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, immutable',
      };
      if (upstreamRes.headers['content-range']) outHeaders['Content-Range'] = upstreamRes.headers['content-range'];
      if (upstreamRes.headers['content-length']) outHeaders['Content-Length'] = upstreamRes.headers['content-length'];
      sendNoWildcardCors(req, res, upstreamRes.statusCode || 200, outHeaders);
      upstreamRes.pipe(res);
    });
    upstreamReq.on('error', (err) => {
      if (!res.headersSent) {
        sendNoWildcardCors(req, res, 502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(err && err.message ? err.message : err) }));
      }
    });
    return;
  }
  sendJson(res, 404, { error: 'not found' });
}

if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  http.createServer(handleRequest).listen(PORT, () => {
    console.log(`StreamPlay backend listening on http://localhost:${PORT}`);
  });
}

