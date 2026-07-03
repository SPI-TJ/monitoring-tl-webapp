/**
 * ============================================================================
 * DATA MANAGEMENT ROUTES — v2.0.0
 * ============================================================================
 *
 * Perubahan dari v1:
 *  - GET /api/data     : menggunakan read cache sheetsService (otomatis)
 *  - logActivity       : non-blocking, TIDAK menunggu write selesai agar
 *                        request utama tidak ikut terhambat queue
 *  - Semua write       : melalui write queue di sheetsService (quota-safe)
 *  - Activity Log cache: TTL dinaikkan ke 2 menit; invalidate manual setelah write
 *
 * @version 2.0.0
 */

'use strict';

const express      = require('express');
const router       = express.Router();
const sheetsService = require('../services/sheetsService');

/* Role read-only: tidak boleh menulis data apapun. */
const READ_ONLY_ROLES = new Set(['Manajemen']);
function isReadOnly(role) { return READ_ONLY_ROLES.has(String(role || '').trim()); }
function denyReadOnly(res, role) {
  return res.status(403).json({ success: false, message: `Role "${role}" hanya memiliki hak baca (read-only).` });
}

const ACTIVITY_LOG_SHEET   = 'Activity Log';
const ACTIVITY_LOG_HEADERS = [
  'Timestamp', 'Username', 'Nama', 'Role', 'Action',
  'No', 'Judul Audit', 'Rekomendasi', 'Divisi', 'Keterangan',
];

/* ─── Activity Log in-memory cache ──────────────────
   TTL 2 menit — lebih longgar dari v1 (90 dtk).
   Invalidate manual tiap ada write baru.
─────────────────────────────────────────────────── */
const _actLogCache = {
  data: null,
  ts  : 0,
  TTL : 120_000,

  isValid()  { return this.data !== null && (Date.now() - this.ts) < this.TTL; },
  set(data)  { this.data = data; this.ts = Date.now(); },
  invalidate(){ this.data = null; this.ts = 0; },
};

/* ─── Date normalization (mm/dd/yyyy) ───────────────────────────────
   Sesuai kebutuhan: kolom tanggal di sheet "Data" diseragamkan menjadi
   mm/dd/yyyy (Tanggal Laporan, Due Date, Tanggal Close).
   Kolom Last Updated tetap ISO (tidak diubah).
──────────────────────────────────────────────────────────────────── */
const DATA_DATE_FIELDS = new Set(['Tanggal Laporan', 'Due Date', 'Tanggal Close']);
function _pad2(n) { return String(n).padStart(2, '0'); }
function normalizeToMMDDYYYY(input) {
  if (input === undefined || input === null) return '';
  const s = String(input).trim();
  if (!s) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s; // already mm/dd/yyyy

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s; // fallback: keep original text

  return `${_pad2(d.getMonth() + 1)}/${_pad2(d.getDate())}/${d.getFullYear()}`;
}

/* ─── ensureActivityLog (cached) ────────────────── */
async function ensureActivityLog() {
  await sheetsService.ensureSheet(ACTIVITY_LOG_SHEET, ACTIVITY_LOG_HEADERS);
}

/* ─── logActivity  ───────────────────────────────
   Fire-and-forget: TIDAK di-await di caller.
   Error di sini tidak boleh merusak response utama.
─────────────────────────────────────────────────── */
function logActivity(actor, action, rowSnapshot, keterangan) {
  // Jalankan async tanpa menunggu
  (async () => {
    try {
      await ensureActivityLog();

      const nowJkt = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      const pad    = n => String(n).padStart(2, '0');
      const timestamp = `${pad(nowJkt.getDate())}/${pad(nowJkt.getMonth() + 1)}/${nowJkt.getFullYear()}, `
                      + `${pad(nowJkt.getHours())}:${pad(nowJkt.getMinutes())}:${pad(nowJkt.getSeconds())}`;

      const logRow = [
        timestamp,
        actor.username || '',
        actor.nama     || actor.username || '',
        actor.role     || '',
        action,
        rowSnapshot['No']         || '',
        String(rowSnapshot['Judul Audit']   || '').substring(0, 80),
        String(rowSnapshot['Rekomendasi']   || '').substring(0, 120),
        rowSnapshot['Divisi']     || '',
        keterangan                || '',
      ];

      await sheetsService.appendRows(ACTIVITY_LOG_SHEET, [logRow]);
      _actLogCache.invalidate();
      console.log(`📝 Activity logged: [${action}] by ${actor.username} on No.${rowSnapshot['No']}`);
    } catch (err) {
      console.error('⚠ Failed to write activity log:', err.message);
    }
  })();
  // Fungsi ini return langsung (tidak await di atas)
}

/* ─── buildStats ─────────────────────────────────── */
function buildStats(rows) {
  const total        = rows.length;
  const open         = rows.filter(r => String(r['Status'] || '') !== 'Close').length;
  const closed       = rows.filter(r => String(r['Status'] || '') === 'Close').length;
  const requestClose = rows.filter(r =>
    String(r['Request Close'] || '') === 'Ya' && String(r['Status'] || '') !== 'Close'
  ).length;
  const avgProgres   = total > 0
    ? Math.round(rows.reduce((s, r) => s + (Number(r['Progres%']) || 0), 0) / total)
    : 0;

  const byDirektorat = {};
  const byDepartemen = {};
  rows.forEach(r => {
    const dir = r['Kode Direktorat'] || 'N/A';
    const dep = r['Departemen']      || 'N/A';
    byDirektorat[dir] = (byDirektorat[dir] || 0) + 1;
    byDepartemen[dep] = (byDepartemen[dep] || 0) + 1;
  });

  return { total, open, closed, requestClose, avgProgres, byDirektorat, byDepartemen };
}

/* ════════════════════════════════════════════════════
   ROUTES
════════════════════════════════════════════════════ */

/**
 * GET /api/data
 * Read cache di sheetsService menangani burst read otomatis.
 */
router.get('/', async (req, res) => {
  try {
    const { role, divisi } = req.query;
    const rawRows = await sheetsService.getSheetData('Data');

    if (!rawRows || rawRows.length < 2) {
      return res.json({
        rows : [],
        stats: { total: 0, open: 0, closed: 0, requestClose: 0, avgProgres: 0, byDirektorat: {}, byDepartemen: {} },
      });
    }

    let rows = sheetsService.rowsToObjects(rawRows);
    if (role === 'PIC' && divisi) {
      rows = rows.filter(r => String(r['Divisi'] || '').trim() === String(divisi).trim());
    }
    if (role === 'Admin Audit KNKT') {
      rows = rows.filter(r => String(r['Jenis Pemeriksaan'] || '').trim().toUpperCase() === 'KNKT');
    }
    rows = rows.reverse();

    console.log(`✓ Data fetched: ${rows.length} rows (role: ${role || 'all'})`);
    res.json({ rows, stats: buildStats(rows) });
  } catch (err) {
    console.error('Error fetching data:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/data/activity-log
 * Cache TTL 2 menit server-side.
 */
router.get('/activity-log', async (req, res) => {
  try {
    if (_actLogCache.isValid()) {
      return res.json({ logs: _actLogCache.data, cached: true });
    }

    await ensureActivityLog();
    const rawRows = await sheetsService.getSheetData(ACTIVITY_LOG_SHEET);

    if (!rawRows || rawRows.length < 2) {
      _actLogCache.set([]);
      return res.json({ logs: [] });
    }

    const headers = rawRows[0];
    const logs = rawRows.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? row[i] : ''; });
      return obj;
    }).reverse();

    _actLogCache.set(logs);
    res.json({ logs });
  } catch (err) {
    console.error('Error fetching activity log:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/data/add
 */
router.post('/add', async (req, res) => {
  try {
    const { rows: newRows, actor } = req.body;

    if (actor && isReadOnly(actor.role)) return denyReadOnly(res, actor.role);
    if (!newRows || !Array.isArray(newRows) || newRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Tidak ada data untuk ditambahkan.' });
    }

    const rawData = await sheetsService.getSheetData('Data');
    if (!rawData || rawData.length === 0) {
      return res.status(500).json({ success: false, message: 'Sheet "Data" tidak ditemukan atau kosong.' });
    }

    const headers  = rawData[0];
    const dataRows = rawData.slice(1);
    let lastNo     = dataRows.length > 0 ? (Number(dataRows[dataRows.length - 1][0]) || 0) : 0;

    const rowsToAppend = newRows.map((row, index) =>
      headers.map(header => {
        if (header === 'No')            return lastNo + index + 1;
        if (header === 'Status')        return row[header] || 'Open';
        if (header === 'Request Close') return 'Belum';
        if (header === 'Progres%')      return 0;
        if (DATA_DATE_FIELDS.has(header)) return normalizeToMMDDYYYY(row[header]);
        return row[header] !== undefined && row[header] !== null ? row[header] : '';
      })
    );

    await sheetsService.appendRows('Data', rowsToAppend);

    // Log — fire-and-forget
    if (actor) {
      rowsToAppend.forEach((appRow, i) => {
        const rowObj = {};
        headers.forEach((h, idx) => { rowObj[h] = appRow[idx]; });
        logActivity(actor, 'Tambah Temuan', rowObj, `Judul: ${rowObj['Judul Audit'] || ''}`);
      });
    }

    console.log(`✓ Added ${rowsToAppend.length} new rows`);
    res.json({ success: true, added: rowsToAppend.length });
  } catch (err) {
    console.error('Error adding data:', err);
    const isQueue = err.message?.includes('queue penuh');
    res.status(isQueue ? 503 : 500).json({ success: false, message: 'Gagal menambah data: ' + err.message });
  }
});

/**
 * PUT /api/data/update/:rowIndex
 */
router.put('/update/:rowIndex', async (req, res) => {
  try {
    const { rowIndex }                         = req.params;
    const { role, data: updatedData, actor }   = req.body;

    if (isReadOnly(role) || (actor && isReadOnly(actor.role))) return denyReadOnly(res, role || actor?.role);
    if (!rowIndex || !updatedData) {
      return res.status(400).json({ success: false, message: 'Parameter tidak lengkap.' });
    }

    const rawData = await sheetsService.getSheetData('Data');
    if (!rawData || rawData.length === 0) {
      return res.status(500).json({ success: false, message: 'Sheet "Data" tidak ditemukan.' });
    }

    const headers   = rawData[0];
    const dataRows  = rawData.slice(1);
    const rowIdx    = Number(rowIndex);

    if (rowIdx < 2 || rowIdx > dataRows.length + 1) {
      return res.status(404).json({ success: false, message: 'Baris tidak ditemukan.' });
    }

    const existingRow = dataRows[rowIdx - 2];
    const existingObj = {};
    headers.forEach((h, i) => { existingObj[h] = existingRow[i] !== undefined && existingRow[i] !== null ? existingRow[i] : ''; });

    const now = new Date().toISOString();

    const newRowValues = headers.map(header => {
      if (header === 'Tanggal Close' && String(updatedData['Status'] || '') === 'Close') {
        return normalizeToMMDDYYYY(updatedData[header] || existingObj[header] || now);
      }
      if (header === 'Last Updated') return now;

      if (role === 'Admin' || role === 'Admin Audit KNKT') {
        if (updatedData[header] === undefined) return existingObj[header];
        if (DATA_DATE_FIELDS.has(header)) return normalizeToMMDDYYYY(updatedData[header]);
        return updatedData[header];
      }
      const picFields = ['Tindak Lanjut', 'Progres%', 'Request Close', 'Link Evidence', 'Tanggapan Auditee'];
      if (picFields.includes(header) && updatedData[header] !== undefined) return updatedData[header];
      return existingObj[header];
    });

    await sheetsService.updateRow('Data', rowIdx, newRowValues);

    // Log — fire-and-forget
    if (actor) {
      const isAdminRole = role === 'Admin' || role === 'Admin Audit KNKT';
      const tracked = isAdminRole
        ? ['Status', 'Progres%', 'Request Close', 'Tindak Lanjut', 'Tanggapan Auditee', 'Link Evidence', 'Due Date']
        : ['Progres%', 'Request Close', 'Tindak Lanjut', 'Tanggapan Auditee', 'Link Evidence'];

      const changed = tracked.filter(f =>
        updatedData[f] !== undefined && String(updatedData[f]) !== String(existingObj[f] || '')
      );
      const keterangan = changed.length > 0
        ? changed.map(f => `${f}: "${existingObj[f] || ''}" → "${updatedData[f]}"`).join(' | ')
        : 'Tidak ada perubahan';

      logActivity(actor, isAdminRole ? 'Edit Admin' : 'Edit PIC', { ...existingObj }, keterangan);
    }

    console.log(`✓ Updated row ${rowIdx} (${role})`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating data:', err);
    const isQueue = err.message?.includes('queue penuh');
    res.status(isQueue ? 503 : 500).json({ success: false, message: 'Gagal update data: ' + err.message });
  }
});

/**
 * PUT /api/data/status/:rowIndex
 */
router.put('/status/:rowIndex', async (req, res) => {
  try {
    const { rowIndex }    = req.params;
    const { status, actor } = req.body;

    if (actor && isReadOnly(actor.role)) return denyReadOnly(res, actor.role);
    if (!rowIndex) return res.status(400).json({ success: false, message: 'rowIndex tidak valid.' });

    const rowIdx = Number(rowIndex);
    const now    = new Date().toISOString();

    // Snapshot untuk log (baca dari cache — cepat)
    let rowSnapshot = {};
    try {
      const rawData = await sheetsService.getSheetData('Data');
      if (rawData?.length > 1) {
        const headers = rawData[0];
        const existing = rawData[rowIdx - 1];
        if (existing) headers.forEach((h, i) => { rowSnapshot[h] = existing[i] !== undefined ? existing[i] : ''; });
      }
    } catch (_) { /* snapshot gagal, tetap lanjut */ }

    const updates = { 'Status': status, 'Request Close': 'Belum', 'Last Updated': now };
    if (status === 'Close') updates['Tanggal Close'] = normalizeToMMDDYYYY(now);

    await sheetsService.updateCells('Data', rowIdx, updates);

    if (actor) {
      logActivity(actor, status === 'Close' ? 'Approve Close' : 'Reopen', rowSnapshot, `Status diubah menjadi "${status}"`);
    }

    console.log(`✓ Status updated row ${rowIdx}: ${status}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating status:', err);
    const isQueue = err.message?.includes('queue penuh');
    res.status(isQueue ? 503 : 500).json({ success: false, message: 'Gagal update status: ' + err.message });
  }
});

/**
 * PUT /api/data/reject-close/:rowIndex
 */
router.put('/reject-close/:rowIndex', async (req, res) => {
  try {
    const { rowIndex } = req.params;
    const { actor }    = req.body;

    if (actor && isReadOnly(actor.role)) return denyReadOnly(res, actor.role);
    if (!rowIndex) return res.status(400).json({ success: false, message: 'rowIndex tidak valid.' });

    const rowIdx = Number(rowIndex);
    const now    = new Date().toISOString();

    let rowSnapshot = {};
    try {
      const rawData = await sheetsService.getSheetData('Data');
      if (rawData?.length > 1) {
        const headers  = rawData[0];
        const existing = rawData[rowIdx - 1];
        if (existing) headers.forEach((h, i) => { rowSnapshot[h] = existing[i] !== undefined ? existing[i] : ''; });
      }
    } catch (_) { /* ignore */ }

    await sheetsService.updateCells('Data', rowIdx, { 'Request Close': 'Belum', 'Last Updated': now });

    if (actor) {
      logActivity(actor, 'Reject Close', rowSnapshot, 'Request Close ditolak oleh Admin');
    }

    console.log(`✓ Reject close row ${rowIdx}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error rejecting close:', err);
    const isQueue = err.message?.includes('queue penuh');
    res.status(isQueue ? 503 : 500).json({ success: false, message: 'Gagal menolak request close: ' + err.message });
  }
});

/**
 * DELETE /api/data/delete/:rowIndex
 */
router.delete('/delete/:rowIndex', async (req, res) => {
  try {
    const { rowIndex } = req.params;
    const rowIdx       = Number(rowIndex);
    const actor        = req.query.actor ? JSON.parse(decodeURIComponent(req.query.actor)) : null;

    if (actor && isReadOnly(actor.role)) return denyReadOnly(res, actor.role);
    if (!rowIdx || rowIdx < 2) {
      return res.status(400).json({ success: false, message: 'Tidak bisa menghapus baris header.' });
    }

    let rowSnapshot = {};
    try {
      const rawData = await sheetsService.getSheetData('Data');
      if (rawData?.length > 1) {
        const headers  = rawData[0];
        const existing = rawData[rowIdx - 1];
        if (existing) headers.forEach((h, i) => { rowSnapshot[h] = existing[i] !== undefined ? existing[i] : ''; });
      }
    } catch (_) { /* ignore */ }

    await sheetsService.deleteRow('Data', rowIdx);

    if (actor) {
      logActivity(actor, 'Hapus Temuan', rowSnapshot,
        `Judul: ${rowSnapshot['Judul Audit'] || '—'} | Divisi: ${rowSnapshot['Divisi'] || '—'}`
      );
    }

    console.log(`✓ Deleted row ${rowIdx}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting data:', err);
    const isQueue = err.message?.includes('queue penuh');
    res.status(isQueue ? 503 : 500).json({ success: false, message: 'Gagal menghapus baris: ' + err.message });
  }
});

module.exports = router;