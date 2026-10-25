// server-scraper/lib/extractors/base.js
import crypto from 'node:crypto';
import { fetchText } from '../httpClient.js';

export function unpackJs(code) {
  if (!code || typeof code !== 'string') return '';
  const regex = /eval\(function\(p,a,c,k,e,[rd]\)\{.*\}\('(.*?)',(\d+),(\d+),'(.*?)'\.split\('\|'\)/s;
  const match = regex.exec(code);
  if (!match) return code;
  try {
    const [, payload, radixStr, countStr, syms] = match;
    const radix = parseInt(radixStr, 10);
    const count = parseInt(countStr, 10);
    const symArray = syms.split('|');
    const baseUnpack = (c) => {
      return (c < radix ? '' : baseUnpack(Math.floor(c / radix))) +
        ((c = c % radix) > 35 ? String.fromCharCode(c + 29) : c.toString(36));
    };
    const dict = {};
    for (let i = 0; i < count; i++) {
      dict[baseUnpack(i)] = symArray[i] || baseUnpack(i);
    }
    return payload.replace(/\b\w+\b/g, (w) => dict[w] !== undefined ? dict[w] : w);
  } catch {
    return code;
  }
}

export function rc4Decrypt(key, cipherHexOrBase64) {
  try {
    let inputBuf;
    if (/^[0-9a-fA-F]+$/.test(cipherHexOrBase64)) {
      inputBuf = Buffer.from(cipherHexOrBase64, 'hex');
    } else {
      inputBuf = Buffer.from(cipherHexOrBase64, 'base64');
    }
    const keyBuf = Buffer.from(key);
    const S = new Uint8Array(256);
    for (let i = 0; i < 256; i++) S[i] = i;
    let j = 0;
    for (let i = 0; i < 256; i++) {
      j = (j + S[i] + keyBuf[i % keyBuf.length]) % 256;
      const tmp = S[i];
      S[i] = S[j];
      S[j] = tmp;
    }
    let i = 0;
    j = 0;
    const out = new Uint8Array(inputBuf.length);
    for (let k = 0; k < inputBuf.length; k++) {
      i = (i + 1) % 256;
      j = (j + S[i]) % 256;
      const tmp = S[i];
      S[i] = S[j];
      S[j] = tmp;
      const K = S[(S[i] + S[j]) % 256];
      out[k] = inputBuf[k] ^ K;
    }
    return Buffer.from(out).toString('utf8');
  } catch {
    return '';
  }
}

export function aesCbcDecrypt(keyHexOrBuf, ivHexOrBuf, cipherBase64OrHex) {
  try {
    const key = typeof keyHexOrBuf === 'string' ? Buffer.from(keyHexOrBuf, 'hex') : keyHexOrBuf;
    const iv = typeof ivHexOrBuf === 'string' ? Buffer.from(ivHexOrBuf, 'hex') : ivHexOrBuf;
    const cipherBuf = /^[0-9a-fA-F]+$/.test(cipherBase64OrHex)
      ? Buffer.from(cipherBase64OrHex, 'hex')
      : Buffer.from(cipherBase64OrHex, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    decipher.setAutoPadding(true);
    let decrypted = decipher.update(cipherBuf, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return '';
  }
}

export function extractSubtitlesFromText(text, baseUrl) {
  const subtitles = [];
  if (!text) return subtitles;
  const subRegex = /["']?(?:file|url|src)["']?\s*:\s*["']([^"']+\.(?:vtt|srt)[^"']*)["'](?:\s*,\s*["']?label["']?\s*:\s*["']([^"']+)["'])?/gi;
  let m;
  while ((m = subRegex.exec(text))) {
    try {
      const u = new URL(m[1], baseUrl).toString();
      subtitles.push({
        lang: m[2] || 'Subtitle',
        url: u,
        default: false
      });
    } catch {}
  }
  return subtitles;
}

export class BaseExtractor {
  constructor(name) {
    this.name = name;
  }

  canExtract(_url) {
    return false;
  }

  async extract(_embedUrl, _referer) {
    return {
      success: false,
      videoSources: [],
      audioTracks: [],
      subtitles: [],
      headers: {}
    };
  }
}
