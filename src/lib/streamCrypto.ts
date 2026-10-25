// src/lib/streamCrypto.ts
// Web Crypto helpers for StreamPlay stream tokens and manifest encryption.

export interface StreamTokenPayload {
  url?: string;
  headers?: Record<string, string>;
  sid?: string;
  exp?: number;
  [key: string]: unknown;
}

export interface EncryptedManifest {
  data: string;
  iv: string;
}

function getSecret(): string {
  const env = (import.meta as any)?.env || {};
  return (
    env.VITE_STREAM_SECRET_KEY ||
    env.VITE_STREAMPLAY_SIGNING_SECRET ||
    ((globalThis as any).process?.env?.STREAM_SECRET_KEY) ||
    ((globalThis as any).process?.env?.STREAMPLAY_SIGNING_SECRET) ||
    'dev-insecure-secret-change-me'
  );
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = '';
  for (let i = 0; i < arr.length; i++) str += String.fromCharCode(arr[i]);
  let out = btoa(str).split('+').join('-').split('/').join('_');
  while (out.endsWith('=')) out = out.slice(0, -1);
  return out;
}

function fromBase64Url(value: string): Uint8Array {
  const pad = value.length % 4 === 0 ? '' : '='.repeat(4 - (value.length % 4));
  const b64 = value.split('-').join('+').split('_').join('/') + pad;
  const str = atob(b64);
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i);
  return out;
}

function toBase64(bytes: Uint8Array): string {
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str);
}

function fromBase64(value: string): Uint8Array {
  const str = atob(value);
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i);
  return out;
}

async function sha256Bytes(input: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data as any);
  return new Uint8Array(hash);
}

async function hmacSha256(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    await sha256Bytes(secret) as any,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data) as any);
  return new Uint8Array(sig);
}

export async function signStreamToken(payload: StreamTokenPayload): Promise<string> {
  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const sigBytes = await hmacSha256(getSecret(), body);
  const sig = toBase64Url(sigBytes);
  return body + '.' + sig;
}

export async function verifyStreamToken(token: string): Promise<StreamTokenPayload | null> {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const body = parts[0];
  const sig = parts[1];
  const expectedBytes = await hmacSha256(getSecret(), body);
  const expected = toBase64Url(expectedBytes);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as StreamTokenPayload;
    if (payload.exp && Date.now() > Number(payload.exp)) return null;
    return payload;
  } catch {
    return null;
  }
}

async function deriveAesKey(): Promise<CryptoKey> {
  const raw = await sha256Bytes(getSecret());
  return crypto.subtle.importKey('raw', raw as any, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptStreamManifest(plaintext: string): Promise<EncryptedManifest> {
  const key = await deriveAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as any },
    key,
    new TextEncoder().encode(plaintext) as any
  );
  return { data: toBase64(new Uint8Array(ct)), iv: toBase64(iv) };
}

export async function decryptStreamManifest(bundle: EncryptedManifest): Promise<string> {
  const key = await deriveAesKey();
  const iv = fromBase64(bundle.iv);
  const ct = fromBase64(bundle.data);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as any }, key, ct as any);
  return new TextDecoder().decode(pt);
}

export function streamSecret(): string {
  return getSecret();
}