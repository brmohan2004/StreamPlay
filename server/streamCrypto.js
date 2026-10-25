// server/streamCrypto.js
import crypto from 'node:crypto';

function getSecret() {
  return (
    process.env.STREAM_SECRET_KEY ||
    process.env.STREAMPLAY_SIGNING_SECRET ||
    process.env.VITE_STREAM_SECRET_KEY ||
    'dev-insecure-secret-change-me'
  );
}

function sha256Bytes(input) {
  return crypto.createHash('sha256').update(input, 'utf8').digest();
}

function toBase64Url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(b64, 'base64');
}

function toBase64(buf) { return buf.toString('base64'); }
function fromBase64(str) { return Buffer.from(str, 'base64'); }

async function hmacSha256(secret, data) {
  const key = sha256Bytes(secret);
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

export async function signStreamToken(payload) {
  const body = toBase64Url(Buffer.from(JSON.stringify(payload), 'utf8'));
  const sig = toBase64Url(await hmacSha256(getSecret(), body));
  return body + '.' + sig;
}

export async function verifyStreamToken(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = toBase64Url(await hmacSha256(getSecret(), body));
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const payload = JSON.parse(fromBase64Url(body).toString('utf8'));
    if (payload.exp && Date.now() > Number(payload.exp)) return null;
    return payload;
  } catch {
    return null;
  }
}

function deriveAesKey() {
  return sha256Bytes(getSecret());
}

export async function encryptStreamManifest(plaintext) {
  const key = deriveAesKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([ct, tag]);
  return { data: toBase64(combined), iv: toBase64(iv) };
}

export async function decryptStreamManifest(bundle) {
  const key = deriveAesKey();
  const iv = fromBase64(bundle.iv);
  const combined = fromBase64(bundle.data);
  const tag = combined.slice(combined.length - 16);
  const ct = combined.slice(0, combined.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}

