/**
 * ============================================================================
 * DATA MANAGEMENT ROUTES
 * ============================================================================
 * 
 * Endpoint untuk CRUD operations pada data audit
 * 
 * @author Professional Backend Developer
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const sheetsService = require('../services/sheetsService');

const ACTIVITY_LOG_SHEET = 'Activity Log';
const ACTIVITY_LOG_HEADERS = [
  'Timestamp', 'Username', 'Nama', 'Role', 'Action',
  'No', 'Judul Audit', 'Rekomendasi', 'Divisi', 'Keterangan'
];

/**
 * In-memory cache untuk Activity Log
 * TTL 90 detik — cukup segar untuk notifikasi, jauh di bawah Sheets quota limit.
 * Setiap logActivity() langsung invalidate cache supaya baca berikutnya fresh.
 */
const _actLogCache = {
  data: null,         // array of log objects (sudah reversed)
  ts:   0,            // epoch ms saat cache terakhir diisi
  TTL:  90 * 1000,    // 90 detik

  isValid() { return this.data !== null && (Date.now() - this.ts) < this.TTL; },
  set(data)  { this.data = data; this.ts = Date.now(); },
  invalidate(){ this.data = null; this.ts = 0; },
};

/**
 * Pastikan sheet Activity Log ada — delegasi ke sheetsService yang sudah ber-cache
 */
async function ensureActivityLog() {
  await sheetsService.ensureSheet(ACTIVITY_LOG_SHEET, ACTIVITY_LOG_HEADERS);
}

/**
 * Tulis satu baris ke Activity Log (non-blocking, error tidak crash request)
 * @param {Object} actor       - { username, nama, role }
 * @param {string} action      - label aksi (e.g. 'Edit PIC', 'Approve Close')
 * @param {Object} rowSnapshot - row data saat itu
 * @param {string} keterangan  - ringkasan perubahan
 */
async function logActivity(actor, action, rowSnapshot, keterangan) {
  try {
    await ensureActivityLog();

    // Bangun timestamp Jakarta format DD/MM/YYYY, HH:MM:SS secara manual
    // agar tidak bergantung pada locale Node.js (id-ID pakai titik, bukan titik dua)
    const nowJkt = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const pad = n => String(n).padStart(2, '0');
    const timestamp = `${pad(nowJkt.getDate())}/${pad(nowJkt.getMonth() + 1)}/${nowJkt.getFullYear()}, ${pad(nowJkt.getHours())}:${pad(nowJkt.getMinutes())}:${pad(nowJkt.getSeconds())}`;

    const rek = String(rowSnapshot['Rekomendasi'] || '').substring(0, 120);
    const judul = String(rowSnapshot['Judul Audit'] || '').substring(0, 80);

    const logRow = [
      timestamp,
      actor.username || '',
      actor.nama || actor.username || '',
      actor.role || '',
      action,
      rowSnapshot['No'] || '',
      judul,
      rek,
      rowSnapshot['Divisi'] || '',
      keterangan || ''
    ];

    await sheetsService.appendRows(ACTIVITY_LOG_SHEET, [logRow]);
    _actLogCache.invalidate(); // paksa read fresh pada request berikutnya
    console.log(`📝 Activity logged: [${action}] by ${actor.username} on row No.${rowSnapshot['No']}`);
  } catch (err) {
    // Jangan sampai gagal log merusak operasi utama
    console.error('⚠ Failed to write activity log:', err.message);
  }
}

/**
 * Helper function untuk build stats dari rows
 */
function buildStats(rows) {
  const total = rows.length;
  const open = rows.filter(r => String(r['Status'] || '') !== 'Close').length;
  const closed = rows.filter(r => String(r['Status'] || '') === 'Close').length;
  const requestClose = rows.filter(r => 
    String(r['Request Close'] || '') === 'Ya' && String(r['Status'] || '') !== 'Close'
  ).length;

  // Average progress
  const avgProgres = total > 0
    ? Math.round(rows.reduce((sum, r) => sum + (Number(r['Progres%']) || 0), 0) / total)
    : 0;

  // By Direktorat
  const byDirektorat = {};
  rows.forEach(r => {
    const dir = r['Kode Direktorat'] || 'N/A';
    byDirektorat[dir] = (byDirektorat[dir] || 0) + 1;
  });

  // By Departemen
  const byDepartemen = {};
  rows.forEach(r => {
    const dep = r['Departemen'] || 'N/A';
    byDepartemen[dep] = (byDepartemen[dep] || 0) + 1;
  });

  return {
    total,
    open,
    closed,
    requestClose,
    avgProgres,
    byDirektorat,
    byDepartemen
  };
}

/**
 * GET /api/data
 * Ambil semua data dengan filter berdasarkan role
 * 
 * Query params:
 * - role: Admin | PIC
 * - divisi: string (untuk filter PIC)
 */
router.get('/', async (req, res) => {
  try {
    const { role, divisi } = req.query;

    // Ambil data dari sheet
    const rawRows = await sheetsService.getSheetData('Data');
    
    if (!rawRows || rawRows.length < 2) {
      return res.json({
        rows: [],
        stats: {
          total: 0,
          open: 0,
          closed: 0,
          requestClose: 0,
          avgProgres: 0,
          byDirektorat: {},
          byDepartemen: {}
        }
      });
    }

    // Convert ke objects
    let rows = sheetsService.rowsToObjects(rawRows);

    // Filter berdasarkan role
    if (role === 'PIC' && divisi) {
      rows = rows.filter(r => String(r['Divisi'] || '').trim() === String(divisi).trim());
    }

    // Reverse untuk menampilkan data terbaru di atas (seperti Apps Script version)
    rows = rows.reverse();

    // Build statistics
    const stats = buildStats(rows);

    console.log(`✓ Data fetched: ${rows.length} rows (role: ${role || 'all'})`);

    res.json({
      rows,
      stats
    });

  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/data/activity-log
 * Ambil semua log aktivitas (Admin only).
 * Hasil di-cache 90 detik server-side untuk menekan Sheets API read quota.
 */
router.get('/activity-log', async (req, res) => {
  try {
    // Serve dari cache kalau masih valid
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
      headers.forEach((h, idx) => { obj[h] = row[idx] !== undefined ? row[idx] : ''; });
      return obj;
    }).reverse();

    _actLogCache.set(logs);
    res.json({ logs });
  } catch (error) {
    console.error('Error fetching activity log:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/data/add
 * Tambah data baru (Admin only)
 * 
 * Request body:
 * {
 *   "rows": [
 *     { "Tanggal Laporan": "...", "Jenis Pemeriksaan": "...", ... },
 *     ...
 *   ]
 * }
 */
router.post('/add', async (req, res) => {
  try {
    const { rows: newRows, actor } = req.body;

    if (!newRows || !Array.isArray(newRows) || newRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak ada data untuk ditambahkan.'
      });
    }

    // Ambil data existing untuk mendapatkan headers dan last No
    const rawData = await sheetsService.getSheetData('Data');
    if (!rawData || rawData.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Sheet "Data" tidak ditemukan atau kosong.'
      });
    }

    const headers = rawData[0];
    const dataRows = rawData.slice(1);
    
    // Get last No
    let lastNo = 0;
    if (dataRows.length > 0) {
      const lastRow = dataRows[dataRows.length - 1];
      lastNo = Number(lastRow[0]) || 0;
    }

    // Prepare rows untuk append
    const rowsToAppend = newRows.map((row, index) => {
      return headers.map(header => {
        if (header === 'No') return lastNo + index + 1;
        if (header === 'Status') return row[header] || 'Open';
        if (header === 'Request Close') return 'Belum';
        if (header === 'Progres%') return 0;
        return row[header] !== undefined && row[header] !== null ? row[header] : '';
      });
    });

    // Append ke sheet
    await sheetsService.appendRows('Data', rowsToAppend);

    // Log aktivitas untuk setiap row yang ditambah
    if (actor) {
      for (let i = 0; i < newRows.length; i++) {
        const rowObj = {};
        headers.forEach((h, idx) => { rowObj[h] = rowsToAppend[i][idx]; });
        await logActivity(
          actor,
          'Tambah Temuan',
          rowObj,
          `Judul: ${rowObj['Judul Audit'] || ''}`
        );
      }
    }

    console.log(`✓ Added ${rowsToAppend.length} new rows`);

    res.json({
      success: true,
      added: rowsToAppend.length
    });

  } catch (error) {
    console.error('Error adding data:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menambah data: ' + error.message
    });
  }
});

/**
 * PUT /api/data/update/:rowIndex
 * Update data (Admin full update, PIC partial update)
 * 
 * Request body:
 * {
 *   "role": "Admin" | "PIC",
 *   "data": { "Status": "Close", "Progres%": 100, ... }
 * }
 */
router.put('/update/:rowIndex', async (req, res) => {
  try {
    const { rowIndex } = req.params;
    const { role, data: updatedData, actor } = req.body;

    if (!rowIndex || !updatedData) {
      return res.status(400).json({
        success: false,
        message: 'Parameter tidak lengkap.'
      });
    }

    // Ambil data sheet untuk mendapatkan headers dan existing row
    const rawData = await sheetsService.getSheetData('Data');
    if (!rawData || rawData.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Sheet "Data" tidak ditemukan atau kosong.'
      });
    }

    const headers = rawData[0];
    const dataRows = rawData.slice(1);
    const rowIdx = Number(rowIndex);
    
    // Validate row exists
    if (rowIdx < 2 || rowIdx > dataRows.length + 1) {
      return res.status(404).json({
        success: false,
        message: 'Baris tidak ditemukan.'
      });
    }

    // Get existing values
    const existingRow = dataRows[rowIdx - 2]; // -2 karena header di row 1, data mulai row 2
    const existingObj = {};
    headers.forEach((h, idx) => {
      existingObj[h] = existingRow[idx] !== undefined && existingRow[idx] !== null ? existingRow[idx] : '';
    });

    // Auto-set Last Updated
    const now = new Date().toISOString();

    // Build new row values
    const newRowValues = headers.map(header => {
      // Auto-set Tanggal Close jika status berubah ke Close
      if (header === 'Tanggal Close' && String(updatedData['Status'] || '') === 'Close') {
        return updatedData[header] || existingObj[header] || now;
      }
      
      // Auto-set Last Updated
      if (header === 'Last Updated') {
        return now;
      }
      
      // Untuk Admin: gunakan nilai baru atau existing (full update)
      // Untuk PIC: hanya update field tertentu
      if (role === 'Admin') {
        return updatedData[header] !== undefined ? updatedData[header] : existingObj[header];
      } else {
        // PIC hanya bisa update: Tindak Lanjut, Progres%, Request Close, Link Evidence
        const picAllowedFields = ['Tindak Lanjut', 'Progres%', 'Request Close', 'Link Evidence', 'Tanggapan Auditee'];
        if (picAllowedFields.includes(header) && updatedData[header] !== undefined) {
          return updatedData[header];
        }
        return existingObj[header];
      }
    });

    // Update row
    await sheetsService.updateRow('Data', rowIdx, newRowValues);

    // Log aktivitas
    if (actor) {
      // Deteksi field yang berubah (untuk PIC: field terbatas)
      const trackedFields = role === 'Admin'
        ? ['Status', 'Progres%', 'Request Close', 'Tindak Lanjut', 'Tanggapan Auditee', 'Link Evidence', 'Due Date']
        : ['Progres%', 'Request Close', 'Tindak Lanjut', 'Tanggapan Auditee', 'Link Evidence'];

      const changed = trackedFields.filter(f => {
        return updatedData[f] !== undefined &&
          String(updatedData[f]) !== String(existingObj[f] || '');
      });

      const keterangan = changed.length > 0
        ? changed.map(f => `${f}: "${existingObj[f] || ''}" → "${updatedData[f]}"`).join(' | ')
        : 'Tidak ada perubahan';

      const rowSnapshot = Object.assign({}, existingObj);
      await logActivity(actor, role === 'Admin' ? 'Edit Admin' : 'Edit PIC', rowSnapshot, keterangan);
    }

    console.log(`✓ Updated row ${rowIdx} (${role})`);

    res.json({
      success: true
    });

  } catch (error) {
    console.error('Error updating data:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal update data: ' + error.message
    });
  }
});

/**
 * PUT /api/data/status/:rowIndex
 * Update status (approve close)
 * 
 * Request body:
 * {
 *   "status": "Close" | "Open"
 * }
 */
router.put('/status/:rowIndex', async (req, res) => {
  try {
    const { rowIndex } = req.params;
    const { status, actor } = req.body;

    if (!rowIndex) {
      return res.status(400).json({
        success: false,
        message: 'rowIndex tidak valid.'
      });
    }

    const now = new Date().toISOString();
    const rowIdx = Number(rowIndex);

    // Ambil snapshot row sebelum diubah (untuk log)
    let rowSnapshot = {};
    try {
      const rawData = await sheetsService.getSheetData('Data');
      if (rawData && rawData.length > 1) {
        const headers = rawData[0];
        const existingRow = rawData[rowIdx - 1]; // rowIdx adalah 1-based termasuk header
        if (existingRow) {
          headers.forEach((h, idx) => {
            rowSnapshot[h] = existingRow[idx] !== undefined ? existingRow[idx] : '';
          });
        }
      }
    } catch (_) { /* snapshot gagal, tetap lanjut */ }

    // Update specific cells
    const updates = {
      'Status': status,
      'Request Close': 'Belum',
      'Last Updated': now
    };

    if (status === 'Close') {
      updates['Tanggal Close'] = now;
    }

    await sheetsService.updateCells('Data', rowIdx, updates);

    // Log aktivitas
    if (actor) {
      const action = status === 'Close' ? 'Approve Close' : 'Reopen';
      const keterangan = `Status diubah menjadi "${status}"`;
      await logActivity(actor, action, rowSnapshot, keterangan);
    }

    console.log(`✓ Status updated for row ${rowIdx}: ${status}`);

    res.json({
      success: true
    });

  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal update status: ' + error.message
    });
  }
});

/**
 * PUT /api/data/reject-close/:rowIndex
 * Reject request close
 */
router.put('/reject-close/:rowIndex', async (req, res) => {
  try {
    const { rowIndex } = req.params;
    const { actor } = req.body;

    if (!rowIndex) {
      return res.status(400).json({
        success: false,
        message: 'rowIndex tidak valid.'
      });
    }

    const now = new Date().toISOString();
    const rowIdx = Number(rowIndex);

    // Ambil snapshot row (untuk log)
    let rowSnapshot = {};
    try {
      const rawData = await sheetsService.getSheetData('Data');
      if (rawData && rawData.length > 1) {
        const headers = rawData[0];
        const existingRow = rawData[rowIdx - 1];
        if (existingRow) {
          headers.forEach((h, idx) => {
            rowSnapshot[h] = existingRow[idx] !== undefined ? existingRow[idx] : '';
          });
        }
      }
    } catch (_) { /* snapshot gagal, tetap lanjut */ }

    await sheetsService.updateCells('Data', rowIdx, {
      'Request Close': 'Belum',
      'Last Updated': now
    });

    // Log aktivitas
    if (actor) {
      await logActivity(actor, 'Reject Close', rowSnapshot, 'Request Close ditolak oleh Admin');
    }

    console.log(`✓ Request close rejected for row ${rowIdx}`);

    res.json({
      success: true
    });

  } catch (error) {
    console.error('Error rejecting close request:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menolak request close: ' + error.message
    });
  }
});

/**
 * DELETE /api/data/delete/:rowIndex
 * Hapus data (Admin only)
 */
router.delete('/delete/:rowIndex', async (req, res) => {
  try {
    const { rowIndex } = req.params;
    const rowIdx = Number(rowIndex);
    // actor dikirim via query string karena DELETE body tidak selalu reliable
    const actor = req.query.actor ? JSON.parse(decodeURIComponent(req.query.actor)) : null;

    if (!rowIdx || rowIdx < 2) {
      return res.status(400).json({
        success: false,
        message: 'Tidak bisa menghapus baris header.'
      });
    }

    // Ambil snapshot SEBELUM dihapus (untuk log)
    let rowSnapshot = {};
    try {
      const rawData = await sheetsService.getSheetData('Data');
      if (rawData && rawData.length > 1) {
        const headers = rawData[0];
        const existingRow = rawData[rowIdx - 1];
        if (existingRow) {
          headers.forEach((h, idx) => {
            rowSnapshot[h] = existingRow[idx] !== undefined ? existingRow[idx] : '';
          });
        }
      }
    } catch (_) { /* snapshot gagal, tetap lanjut */ }

    await sheetsService.deleteRow('Data', rowIdx);

    // Log aktivitas setelah berhasil dihapus
    if (actor) {
      const keterangan = `Judul: ${rowSnapshot['Judul Audit'] || '—'} | Divisi: ${rowSnapshot['Divisi'] || '—'}`;
      await logActivity(actor, 'Hapus Temuan', rowSnapshot, keterangan);
    }

    console.log(`✓ Deleted row ${rowIdx}`);

    res.json({
      success: true
    });

  } catch (error) {
    console.error('Error deleting data:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus baris: ' + error.message
    });
  }
});

module.exports = router;