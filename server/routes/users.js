/**
 * ============================================================================
 * USER MANAGEMENT ROUTES
 * ============================================================================
 * 
 * Endpoint untuk CRUD operations pada data users (Admin only)
 * 
 * @author Professional Backend Developer
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const sheetsService = require('../services/sheetsService');

/**
 * GET /api/users
 * Ambil semua users (Admin only)
 */
router.get('/', async (req, res) => {
  try {
    const rawData = await sheetsService.getSheetData('Users');
    
    if (!rawData || rawData.length < 2) {
      return res.json({
        users: []
      });
    }

    const users = sheetsService.rowsToObjects(rawData);

    console.log(`✓ Users fetched: ${users.length} users`);

    res.json({
      users
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/users/add
 * Tambah user baru (Admin only)
 * 
 * Request body:
 * {
 *   "username": "john",
 *   "password": "pass123",
 *   "role": "PIC",
 *   "divisi": "Finance",
 *   "nama": "John Doe"
 * }
 */
router.post('/add', async (req, res) => {
  try {
    const { username, password, role, divisi, nama } = req.body;

    // Validasi input
    if (!username || !password || !role || !nama) {
      return res.status(400).json({
        success: false,
        message: 'Field tidak lengkap. Username, password, role, dan nama wajib diisi.'
      });
    }

    // Ambil data users untuk check duplikat
    const rawData = await sheetsService.getSheetData('Users');
    if (!rawData || rawData.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Sheet "Users" tidak ditemukan.'
      });
    }

    const users = rawData.slice(1); // Skip header

    // Check duplikat username
    const isDuplicate = users.some(row => 
      String(row[0] || '').trim().toLowerCase() === String(username).trim().toLowerCase()
    );

    if (isDuplicate) {
      return res.status(409).json({
        success: false,
        message: `Username "${username}" sudah digunakan.`
      });
    }

    // Append new user
    const newUserRow = [
      username.trim(),
      password,
      role,
      divisi || '',
      nama.trim()
    ];

    await sheetsService.appendRows('Users', [newUserRow]);

    console.log(`✓ User added: ${username} (${role})`);

    res.json({
      success: true,
      message: `User "${username}" berhasil ditambahkan.`
    });

  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menambah user: ' + error.message
    });
  }
});

/**
 * PUT /api/users/update/:username
 * Update user (Admin only)
 * 
 * Request body:
 * {
 *   "password": "newpass",
 *   "role": "Admin",
 *   "divisi": "IT",
 *   "nama": "John Doe Updated"
 * }
 */
router.put('/update/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { password, role, divisi, nama } = req.body;

    // Validasi input
    if (!username || !password || !role || !nama) {
      return res.status(400).json({
        success: false,
        message: 'Field tidak lengkap.'
      });
    }

    // Ambil data users
    const rawData = await sheetsService.getSheetData('Users');
    if (!rawData || rawData.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Sheet "Users" tidak ditemukan.'
      });
    }

    const dataRows = rawData.slice(1);

    // Cari user
    let rowIndex = -1;
    for (let i = 0; i < dataRows.length; i++) {
      if (String(dataRows[i][0] || '').trim() === String(username).trim()) {
        rowIndex = i + 2; // +2 karena header di row 1, data mulai row 2
        break;
      }
    }

    if (rowIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `User "${username}" tidak ditemukan.`
      });
    }

    // Update row (hanya update kolom 2-5, username tetap)
    const updatedRow = [
      username, // Keep username sama
      password,
      role,
      divisi || '',
      nama.trim()
    ];

    await sheetsService.updateRow('Users', rowIndex, updatedRow);

    console.log(`✓ User updated: ${username}`);

    res.json({
      success: true,
      message: `User "${username}" berhasil diupdate.`
    });

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal update user: ' + error.message
    });
  }
});

/**
 * DELETE /api/users/delete/:username
 * Hapus user (Admin only)
 */
router.delete('/delete/:username', async (req, res) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username tidak boleh kosong.'
      });
    }

    // Ambil data users
    const rawData = await sheetsService.getSheetData('Users');
    if (!rawData || rawData.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Sheet "Users" tidak ditemukan.'
      });
    }

    const dataRows = rawData.slice(1);

    // Cari User
    let rowIndex = -1;
    for (let i = 0; i < dataRows.length; i++) {
      if (String(dataRows[i][0] || '').trim() === String(username).trim()) {
        rowIndex = i + 2; // +2 karena header di row 1
        break;
      }
    }

    if (rowIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `User "${username}" tidak ditemukan.`
      });
    }

    await sheetsService.deleteRow('Users', rowIndex);

    console.log(`✓ User deleted: ${username}`);

    res.json({
      success: true,
      message: `User "${username}" berhasil dihapus.`
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus user: ' + error.message
    });
  }
});

/* ════════════════════════════════════════════════════
   KONTAK USER (PIC) CRUD — Admin only
════════════════════════════════════════════════════ */

const KONTAK_SHEET   = 'Kontak PIC';
const KONTAK_HEADERS = ['Nama PIC', 'Nomor WA PIC', 'Email PIC', 'Nama Departemen', 'Nama Divisi', 'Catatan'];

/**
 * GET /api/users/contacts?role=Admin
 */
router.get('/contacts', async (req, res) => {
  try {
    const { role } = req.query;
    if (role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Akses ditolak: hanya Admin.' });
    }
    const rawData = await sheetsService.getSheetData(KONTAK_SHEET);
    if (!rawData || rawData.length < 2) {
      return res.json({ success: true, contacts: [] });
    }
    const contacts = sheetsService.rowsToObjects(rawData);
    console.log(`✓ Contacts fetched: ${contacts.length} PIC`);
    res.json({ success: true, contacts });
  } catch (err) {
    console.error('❌ Failed to fetch contacts:', err.message);
    res.status(500).json({ success: false, message: 'Gagal mengambil data kontak.' });
  }
});

/**
 * POST /api/users/contacts/add
 */
router.post('/contacts/add', async (req, res) => {
  try {
    const { role, data } = req.body;
    if (role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Akses ditolak: hanya Admin.' });
    }
    if (!data || !data['Nama PIC'] || !data['Nomor WA PIC'] || !data['Email PIC'] || !data['Nama Departemen'] || !data['Nama Divisi']) {
      return res.status(400).json({ success: false, message: 'Nama PIC, Nomor WA, Email, Departemen, dan Divisi wajib diisi.' });
    }
    const row = KONTAK_HEADERS.map(h => String(data[h] || '').trim());
    await sheetsService.appendRows(KONTAK_SHEET, [row]);
    console.log(`✓ Contact added: ${data['Nama PIC']}`);
    res.json({ success: true, message: 'Kontak PIC berhasil ditambahkan.' });
  } catch (err) {
    console.error('❌ Failed to add contact:', err.message);
    res.status(500).json({ success: false, message: 'Gagal menambah kontak.' });
  }
});

/**
 * PUT /api/users/contacts/update/:rowIndex
 */
router.put('/contacts/update/:rowIndex', async (req, res) => {
  try {
    const rowIndex = parseInt(req.params.rowIndex);
    const { role, data, verifyNama } = req.body;
    if (role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Akses ditolak: hanya Admin.' });
    }
    if (isNaN(rowIndex) || rowIndex < 2) {
      return res.status(400).json({ success: false, message: 'Row index tidak valid.' });
    }
    const rawData = await sheetsService.getSheetData(KONTAK_SHEET, true);
    if (!rawData || rowIndex > rawData.length) {
      return res.status(404).json({ success: false, message: 'Record tidak ditemukan.' });
    }
    const existing = rawData[rowIndex - 1];
    if (verifyNama && String(existing[0] || '').trim() !== String(verifyNama).trim()) {
      return res.status(409).json({ success: false, message: 'Data telah berubah. Muat ulang halaman dan coba lagi.' });
    }
    const updatedRow = KONTAK_HEADERS.map(h => String(data[h] || '').trim());
    await sheetsService.updateRow(KONTAK_SHEET, rowIndex, updatedRow);
    console.log(`✓ Contact updated: row ${rowIndex} — ${data['Nama PIC']}`);
    res.json({ success: true, message: 'Kontak PIC berhasil diperbarui.' });
  } catch (err) {
    console.error('❌ Failed to update contact:', err.message);
    res.status(500).json({ success: false, message: 'Gagal memperbarui kontak.' });
  }
});

/**
 * DELETE /api/users/contacts/delete/:rowIndex
 */
router.delete('/contacts/delete/:rowIndex', async (req, res) => {
  try {
    const rowIndex = parseInt(req.params.rowIndex);
    const { role, verifyNama } = req.query;
    if (role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Akses ditolak: hanya Admin.' });
    }
    if (isNaN(rowIndex) || rowIndex < 2) {
      return res.status(400).json({ success: false, message: 'Row index tidak valid.' });
    }
    const rawData = await sheetsService.getSheetData(KONTAK_SHEET, true);
    if (!rawData || rowIndex > rawData.length) {
      return res.status(404).json({ success: false, message: 'Record tidak ditemukan.' });
    }
    const existing = rawData[rowIndex - 1];
    if (verifyNama && String(existing[0] || '').trim() !== String(verifyNama).trim()) {
      return res.status(409).json({ success: false, message: 'Data telah berubah. Muat ulang halaman dan coba lagi.' });
    }
    await sheetsService.deleteRow(KONTAK_SHEET, rowIndex);
    console.log(`✓ Contact deleted: row ${rowIndex}`);
    res.json({ success: true, message: 'Kontak PIC berhasil dihapus.' });
  } catch (err) {
    console.error('❌ Failed to delete contact:', err.message);
    res.status(500).json({ success: false, message: 'Gagal menghapus kontak.' });
  }
});

module.exports = router;
