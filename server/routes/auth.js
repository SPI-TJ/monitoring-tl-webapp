/**
 * ============================================================================
 * AUTHENTICATION ROUTES
 * ============================================================================
 * 
 * Endpoint untuk login dan autentikasi user
 * 
 * @author Professional Backend Developer
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const sheetsService = require('../services/sheetsService');

/**
 * POST /api/auth/login
 * Login user dengan username dan password
 * 
 * Request body:
 * {
 *   "username": "admin",
 *   "password": "password123"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "user": {
 *     "username": "admin",
 *     "role": "Admin",
 *     "divisi": "IT",
 *     "nama": "Administrator"
 *   }
 * }
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validasi input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username dan password tidak boleh kosong.'
      });
    }

    // Ambil data users dari Google Sheets
    const rows = await sheetsService.getSheetData('Users');

    if (!rows || rows.length < 2) {
      return res.status(500).json({
        success: false,
        message: 'Belum ada user terdaftar.'
      });
    }

    // Headers ada di row pertama
    const headers = rows[0];
    const userRows = rows.slice(1);

    // Expected headers: Username, Password, Role, Divisi, Nama
    // Cari user yang cocok
    let foundUser = null;

    for (const row of userRows) {
      const rowUsername = String(row[0] || '').trim();
      const rowPassword = String(row[1] || '').trim();

      if (rowUsername === String(username).trim() && 
          rowPassword === String(password).trim()) {
        foundUser = {
          username: String(row[0] || '').trim(),
          role: String(row[2] || '').trim(),
          divisi: String(row[3] || '').trim(),
          nama: String(row[4] || '').trim()
        };
        break;
      }
    }

    if (foundUser) {
      console.log(`✓ Login successful: ${foundUser.username} (${foundUser.role})`);
      
      return res.json({
        success: true,
        user: foundUser
      });
    } else {
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah.'
      });
    }

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error server: ' + error.message
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (placeholder - implementasi tergantung session management)
 */
router.post('/logout', (req, res) => {
  // Jika menggunakan session-based auth, clear session di sini
  res.json({
    success: true,
    message: 'Logout berhasil'
  });
});

/**
 * GET /api/auth/verify
 * Verify session/token (placeholder untuk future implementation)
 */
router.get('/verify', (req, res) => {
  // TODO: Implement token verification
  res.json({
    success: false,
    message: 'Not implemented'
  });
});

module.exports = router;
