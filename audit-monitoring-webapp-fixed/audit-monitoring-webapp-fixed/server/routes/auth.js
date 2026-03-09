/**
 * server/routes/auth.js
 * Route autentikasi: login & validasi token
 */

const express = require('express');
const jwt     = require('jsonwebtoken');
const svc     = require('../services/sheetsService');

const router  = express.Router();

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username dan password harus diisi.' });
    }

    const user  = await svc.login(username, password);
    const token = jwt.sign(
      { username: user.username, role: user.role, divisi: user.divisi, nama: user.nama },
      process.env.JWT_SECRET || 'fallback-secret-change-in-production',
      { expiresIn: '8h' }
    );

    return res.json({ success: true, token, user });
  } catch (err) {
    // Error dari sheetsService sudah berupa pesan yang user-friendly
    const isAuthError = err.message.includes('salah') || err.message.includes('terdaftar');
    return res.status(isAuthError ? 401 : 500).json({
      success: false,
      message: err.message || 'Terjadi kesalahan server.',
    });
  }
});

// ─── GET /api/auth/me — validasi token yang ada ───────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  return res.json({ success: true, user: req.user });
});

// ─── MIDDLEWARE: requireAuth ─────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token tidak ditemukan. Silakan login ulang.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-change-in-production');
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Token tidak valid atau sudah kadaluarsa. Silakan login ulang.' });
  }
}

module.exports = router;
module.exports.requireAuth = requireAuth;
