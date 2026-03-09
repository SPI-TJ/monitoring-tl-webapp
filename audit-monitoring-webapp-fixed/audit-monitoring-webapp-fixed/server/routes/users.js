/**
 * server/routes/users.js
 * Routes untuk manajemen user (Admin only).
 */

const express         = require('express');
const { requireAuth } = require('./auth');
const svc             = require('../services/sheetsService');

const router = express.Router();

// Semua route butuh autentikasi + hanya Admin
router.use(requireAuth);
router.use(adminOnly);

// ─── GET /api/users ───────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const users = await svc.getUsers();
    return res.json({ success: true, users });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/users — tambah user baru ──────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { username, password, role, divisi, nama } = req.body;

    if (!username || !password || !role || !nama) {
      return res.status(400).json({ success: false, message: 'username, password, role, dan nama wajib diisi.' });
    }
    if (role === 'PIC' && !divisi) {
      return res.status(400).json({ success: false, message: 'Divisi wajib diisi untuk user bertipe PIC.' });
    }

    await svc.addUser(username, password, role, divisi, nama);
    return res.json({ success: true });
  } catch (err) {
    const status = err.message.includes('sudah digunakan') ? 409 : 500;
    return res.status(status).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/users/:username — update user ───────────────────────────────────
router.put('/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { password, role, divisi, nama } = req.body;

    if (!password || !role || !nama) {
      return res.status(400).json({ success: false, message: 'password, role, dan nama wajib diisi.' });
    }
    if (role === 'PIC' && !divisi) {
      return res.status(400).json({ success: false, message: 'Divisi wajib diisi untuk user bertipe PIC.' });
    }

    await svc.updateUser(username, password, role, divisi, nama);
    return res.json({ success: true });
  } catch (err) {
    const status = err.message.includes('tidak ditemukan') ? 404 : 500;
    return res.status(status).json({ success: false, message: err.message });
  }
});

// ─── DELETE /api/users/:username — hapus user ────────────────────────────────
router.delete('/:username', async (req, res) => {
  try {
    const { username } = req.params;

    // Cegah admin menghapus dirinya sendiri
    if (username === req.user.username) {
      return res.status(400).json({ success: false, message: 'Tidak bisa menghapus akun sendiri.' });
    }

    await svc.deleteUser(username);
    return res.json({ success: true });
  } catch (err) {
    const status = err.message.includes('tidak ditemukan') ? 404 : 500;
    return res.status(status).json({ success: false, message: err.message });
  }
});

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
function adminOnly(req, res, next) {
  if (req.user && req.user.role === 'Admin') return next();
  return res.status(403).json({ success: false, message: 'Akses ditolak. Hanya Admin.' });
}

module.exports = router;
