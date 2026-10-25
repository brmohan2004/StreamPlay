// server-scraper/lib/httpClient.js
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export function buildHeaders(referer) {
  const h = {
    'User-Agent': randomUA(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  };
  if (referer) {
    try {
      const u = new URL(referer);
      h.Referer = referer;
      h.Origin = u.origin;
    } catch {
      h.Referer = referer;
    }
  }
  return h;
}

import https from 'https';

const insecureAgent = new https.Agent({ rejectUnauthorized: false });

export async function fetchText(url, options = {}) {
  const axios = (await import('axios')).default;
  const headers = buildHeaders(options.referer || url);
  if (options.headers) Object.assign(headers, options.headers);
  const res = await axios.get(url, {
    headers,
    httpsAgent: insecureAgent,
    timeout: options.timeout || 15000,
    maxRedirects: 5,
    validateStatus: () => true,
    responseType: 'text',
    transformResponse: [(d) => d]
  });
  if (res.status >= 400) {
    const err = new Error(`HTTP ${res.status} for ${url}`);
    err.status = res.status;
    err.body = res.data;
    throw err;
  }
  return { status: res.status, headers: res.headers, body: String(res.data || ''), finalUrl: res.request?.res?.responseUrl || url };
}

export async function fetchBuffer(url, options = {}) {
  const axios = (await import('axios')).default;
  const headers = buildHeaders(options.referer || url);
  if (options.headers) Object.assign(headers, options.headers);
  const res = await axios.get(url, {
    headers,
    httpsAgent: insecureAgent,
    timeout: options.timeout || 15000,
    maxRedirects: 5,
    validateStatus: () => true,
    responseType: 'arraybuffer'
  });
  if (res.status >= 400) {
    const err = new Error(`HTTP ${res.status} for ${url}`);
    err.status = res.status;
    throw err;
  }
  return { status: res.status, headers: res.headers, body: Buffer.from(res.data), finalUrl: res.request?.res?.responseUrl || url };
}
