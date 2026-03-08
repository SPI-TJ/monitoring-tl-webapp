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
    const { rows: newRows } = req.body;

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
    const { role, data: updatedData } = req.body;

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
        const picAllowedFields = ['Tindak Lanjut', 'Progres%', 'Request Close', 'Link Evidence'];
        if (picAllowedFields.includes(header) && updatedData[header] !== undefined) {
          return updatedData[header];
        }
        return existingObj[header];
      }
    });

    // Update row
    await sheetsService.updateRow('Data', rowIdx, newRowValues);

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
    const { status } = req.body;

    if (!rowIndex) {
      return res.status(400).json({
        success: false,
        message: 'rowIndex tidak valid.'
      });
    }

    const now = new Date().toISOString();
    const rowIdx = Number(rowIndex);

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

    if (!rowIndex) {
      return res.status(400).json({
        success: false,
        message: 'rowIndex tidak valid.'
      });
    }

    const now = new Date().toISOString();
    const rowIdx = Number(rowIndex);

    await sheetsService.updateCells('Data', rowIdx, {
      'Request Close': 'Belum',
      'Last Updated': now
    });

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

    if (!rowIdx || rowIdx < 2) {
      return res.status(400).json({
        success: false,
        message: 'Tidak bisa menghapus baris header.'
      });
    }

    await sheetsService.deleteRow('Data', rowIdx);

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
