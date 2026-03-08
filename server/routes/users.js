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

    // Cari user
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

module.exports = router;
