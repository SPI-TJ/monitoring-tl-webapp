/**
 * ============================================================================
 * SESSION TOKEN — HMAC-signed stateless token
 * ============================================================================
 *
 * Format: base64url(payloadJSON) + "." + base64url(hmacSha256(payloadJSON))
 *
 * Payload berisi: sub (username), role, divisi, nama, iat, exp (epoch detik).
 * Verifikasi dilakukan dengan timing-safe comparison.
 */

'use strict';

const crypto = require('crypto');

const DEFAULT_TTL_MS = parseInt(process.env.SESSION_TTL_MS || String(8 * 60 * 60 * 1000)); // 8 jam

function _secret() {
  const s = process.env.SESSION_SECRET || '';
  if (s.length < 32) {
    throw new Error('SESSION_SECRET kosong atau terlalu pendek (minimal 32 karakter). Setel via env.');
  }
  return s;
}

function _b64urlEncode(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function _b64urlDecode(str) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

function signToken(claims, ttlMs = DEFAULT_TTL_MS) {
  const nowSec = Math.floor(Date.now() / 1000);
  const payload = {
    sub   : claims.username,
    role  : claims.role,
    divisi: claims.divisi || '',
    nama  : claims.nama   || '',
    iat   : nowSec,
    exp   : nowSec + Math.floor(ttlMs / 1000),
  };
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = _b64urlEncode(payloadStr);
  const sig        = crypto.createHmac('sha256', _secret()).update(payloadB64).digest();
  const sigB64     = _b64urlEncode(sig);
  return `${payloadB64}.${sigB64}`;
}

function verifyToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [payloadB64, sigB64] = token.split('.', 2);
  if (!payloadB64 || !sigB64) return null;

  const expectedSig = crypto.createHmac('sha256', _secret()).update(payloadB64).digest();
  let providedSig;
  try { providedSig = _b64urlDecode(sigB64); } catch { return null; }
  if (providedSig.length !== expectedSig.length) return null;
  if (!crypto.timingSafeEqual(expectedSig, providedSig)) return null;

  let payload;
  try { payload = JSON.parse(_b64urlDecode(payloadB64).toString('utf8')); } catch { return null; }

  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp < nowSec) return null;
  if (!payload.sub || !payload.role) return null;
  return payload;
}

module.exports = { signToken, verifyToken };
