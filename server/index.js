import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

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

const STREAMING_SERVERS = [
  (id, type, s, e) => type === 'series'
    ? `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`
    : `https://www.2embed.cc/embed/${id}`,
  (id, type, s, e) => type === 'series'
    ? `https://vidsrc.pm/embed/tv/${id}/${s}/${e}`
    : `https://vidsrc.pm/embed/movie/${id}`
];


export async function handleRequest(req, res) {
  const u = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'OPTIONS') {
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
      sendJson(res, 400, { error: 'invalid id' });
      return;
    }
    for (const build of STREAMING_SERVERS) {
      const embedUrl = build(id, type, season, episode);
      try {
        const { body } = await fetchText(embedUrl);
        const mediaUrl = extractMediaUrl(body);
        if (mediaUrl) {
          sendJson(res, 200, { url: mediaUrl, streamUrl: mediaUrl });
          return;
        }
      } catch {
        // try next provider
      }
    }
    sendJson(res, 404, { error: 'no direct stream found' });
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

  // Auto-start embedded player if playbtnx exists (e.g. 2embed wrapper)
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
      var ifr = document.getElementById('iframesrc');
      if (ifr && ifr.getAttribute('data-src')) {
        ifr.src = ifr.getAttribute('data-src');
      }
      var bg = document.getElementById('bgImage');
      if (bg) bg.remove();
      var p = document.querySelector('.playbtnx');
      if (p) p.style.display = 'none';
      var drop = document.querySelector('.dropdown');
      if (drop) drop.style.display = 'block';
    }, 50);
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

  sendJson(res, 404, { error: 'not found' });
}

if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  http.createServer(handleRequest).listen(PORT, () => {
    console.log(`StreamPlay backend listening on http://localhost:${PORT}`);
  });
}

