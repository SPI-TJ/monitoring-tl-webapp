/**
 * server/config/sheets.js
 * Konfigurasi koneksi Google Sheets API via Service Account
 */

const { google } = require('googleapis');

/**
 * Membuat instance Google Auth dari environment variables.
 * Private key butuh parsing \\n → \n karena env vars menyimpannya as-is.
 */
function getAuth() {
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '')
    .replace(/\\n/g, '\n');

  if (!privateKey || !process.env.GOOGLE_CLIENT_EMAIL) {
    throw new Error(
      'Google credentials belum dikonfigurasi. ' +
      'Pastikan GOOGLE_CLIENT_EMAIL dan GOOGLE_PRIVATE_KEY sudah diset di environment variables.'
    );
  }

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key : privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

/**
 * Mengembalikan instance Sheets API yang sudah ter-autentikasi.
 */
async function getSheetsClient() {
  const auth = getAuth();
  return google.sheets({ version: 'v4', auth });
}

/**
 * ID spreadsheet dari environment variable.
 */
function getSpreadsheetId() {
  const id = process.env.GOOGLE_SHEETS_ID;
  if (!id) throw new Error('GOOGLE_SHEETS_ID belum diset di environment variables.');
  return id;
}

module.exports = { getSheetsClient, getSpreadsheetId };
