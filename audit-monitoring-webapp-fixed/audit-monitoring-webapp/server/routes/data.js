/**
 * server/routes/data.js
 * Routes CRUD untuk data temuan audit.
 */

const express      = require('express');
const { requireAuth } = require('./auth');
const svc          = require('../services/sheetsService');

const router = express.Router();

// Semua route butuh autentikasi
router.use(requireAuth);

// ─── GET /api/data — ambil semua data ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { role, divisi } = req.user;
    const result = await svc.getAll(role, divisi);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/data — tambah baris baru (Admin only) ─────────────────────────
router.post('/', adminOnly, async (req, res) => {
  try {
    const { rows } = req.body;
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Body harus berisi array "rows".' });
    }

    const result = await svc.addRows(rows);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/data/:rowIndex — update satu baris (Admin & PIC) ───────────────
router.put('/:rowIndex', async (req, res) => {
  try {
    const rowIndex   = parseInt(req.params.rowIndex);
    const { updatedData } = req.body;

    if (!rowIndex || !updatedData) {
      return res.status(400).json({ success: false, message: 'rowIndex dan updatedData diperlukan.' });
    }

    // PIC tidak boleh mengubah Status langsung
    if (req.user.role !== 'Admin') {
      delete updatedData['Status'];
      delete updatedData['Tanggal Close'];
      delete updatedData['No'];
    }

    await svc.updateRowAdmin(rowIndex, updatedData);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PATCH /api/data/:rowIndex/status — ubah status (Admin only) ─────────────
router.patch('/:rowIndex/status', adminOnly, async (req, res) => {
  try {
    const rowIndex = parseInt(req.params.rowIndex);
    const { status } = req.body;

    if (!rowIndex || !['Open', 'Close'].includes(status)) {
      return res.status(400).json({ success: false, message: 'rowIndex dan status (Open/Close) diperlukan.' });
    }

    await svc.updateStatus(rowIndex, status);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PATCH /api/data/:rowIndex/reject-close — tolak request close (Admin) ────
router.patch('/:rowIndex/reject-close', adminOnly, async (req, res) => {
  try {
    const rowIndex = parseInt(req.params.rowIndex);
    if (!rowIndex) return res.status(400).json({ success: false, message: 'rowIndex diperlukan.' });

    await svc.rejectCloseRequest(rowIndex);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE /api/data/:rowIndex — hapus baris (Admin only) ───────────────────
router.delete('/:rowIndex', adminOnly, async (req, res) => {
  try {
    const rowIndex = parseInt(req.params.rowIndex);
    if (!rowIndex || rowIndex < 2) {
      return res.status(400).json({ success: false, message: 'rowIndex tidak valid.' });
    }

    await svc.deleteRow(rowIndex);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── MIDDLEWARE: adminOnly ────────────────────────────────────────────────────
function adminOnly(req, res, next) {
  if (req.user && req.user.role === 'Admin') return next();
  return res.status(403).json({ success: false, message: 'Akses ditolak. Hanya Admin yang boleh melakukan aksi ini.' });
}

module.exports = router;
