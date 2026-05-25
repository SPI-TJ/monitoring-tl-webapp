/**
 * ============================================================================
 * AUTH MIDDLEWARE
 * ============================================================================
 *
 * requireAuth  — verifikasi Bearer token, populate req.user.
 * requireAdmin — opsional, harus dipasang setelah requireAuth; tolak non-Admin.
 *
 * req.user shape: { username, role, divisi, nama }
 */

'use strict';

const { verifyToken } = require('../utils/token');

function _bearer(req) {
  const h = req.headers && (req.headers.authorization || req.headers.Authorization);
  if (typeof h !== 'string') return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

function requireAuth(req, res, next) {
  const token = _bearer(req);
  if (!token) return res.status(401).json({ success: false, message: 'Token tidak ada.' });

  let payload;
  try { payload = verifyToken(token); }
  catch (e) {
    if (String(e.message || '').includes('SESSION_SECRET')) {
      return res.status(500).json({ success: false, message: 'Server misconfigured (SESSION_SECRET).' });
    }
    return res.status(401).json({ success: false, message: 'Token tidak valid.' });
  }

  if (!payload) return res.status(401).json({ success: false, message: 'Token tidak valid atau kadaluarsa.' });

  req.user = {
    username: payload.sub,
    role    : payload.role,
    divisi  : payload.divisi || '',
    nama    : payload.nama   || '',
  };
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, message: 'Tidak terautentikasi.' });
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ success: false, message: 'Akses hanya untuk Admin.' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
