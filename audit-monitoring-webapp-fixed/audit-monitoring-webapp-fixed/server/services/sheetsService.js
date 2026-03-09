/**
 * server/services/sheetsService.js
 * Semua operasi baca/tulis ke Google Sheets.
 * Logika ini adalah port langsung dari Code.gs (Apps Script) ke Node.js.
 */

const { getSheetsClient, getSpreadsheetId } = require('../config/sheets');

const SHEET_DATA  = 'Data';
const SHEET_USERS = 'Users';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Membaca semua nilai dari sebuah sheet.
 * @returns {Array<Array>} 2D array (rows x cols)
 */
async function readSheet(sheetName) {
  const sheets = await getSheetsClient();
  const ssId   = getSpreadsheetId();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: ssId,
    range        : sheetName,
  });

  return res.data.values || [];
}

/**
 * Mengambil index kolom dari array headers.
 * Throw error jika kolom tidak ditemukan.
 */
function colIndex(headers, colName) {
  const idx = headers.indexOf(colName);
  if (idx < 0) throw new Error(`Kolom "${colName}" tidak ditemukan di sheet.`);
  return idx;
}

/**
 * Konversi serial number Google Sheets ke ISO date string.
 * Google Sheets menyimpan tanggal sebagai float (days since 1899-12-30).
 */
function parseSheetDate(val) {
  if (!val || val === '') return '';
  // Jika sudah berupa ISO string atau string tanggal, kembalikan langsung
  if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) return val;
  // Jika berupa number (serial date dari Sheets)
  if (typeof val === 'number') {
    const msPerDay = 86400000;
    const epoch    = new Date(Date.UTC(1899, 11, 30)); // 1899-12-30
    const d        = new Date(epoch.getTime() + val * msPerDay);
    return d.toISOString();
  }
  return String(val);
}

/**
 * Konversi nilai date untuk ditulis ke Sheets.
 * Sheets API menerima string tanggal dalam format YYYY-MM-DD.
 */
function formatDateForSheet(val) {
  if (!val || val === '') return '';
  if (val instanceof Date) return val.toISOString().split('T')[0];
  if (typeof val === 'string' && val.includes('T')) return val.split('T')[0];
  return String(val);
}

/**
 * Mengupdate satu rentang sel.
 */
async function updateRange(sheetName, startRow, startCol, values) {
  const sheets = await getSheetsClient();
  const ssId   = getSpreadsheetId();

  // Konversi angka kolom ke huruf (1→A, 2→B, dst.)
  const colLetter = (n) => {
    let s = '';
    while (n > 0) {
      const rem = (n - 1) % 26;
      s = String.fromCharCode(65 + rem) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  };

  const endRow = startRow + values.length - 1;
  const endCol = startCol + values[0].length - 1;
  const range  = `${sheetName}!${colLetter(startCol)}${startRow}:${colLetter(endCol)}${endRow}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId    : ssId,
    range,
    valueInputOption : 'USER_ENTERED',
    requestBody      : { values },
  });
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

async function login(username, password) {
  const data    = await readSheet(SHEET_USERS);
  if (data.length < 2) throw new Error('Belum ada user terdaftar.');

  const headers = data[0];
  const uIdx    = colIndex(headers, 'Username');
  const pIdx    = colIndex(headers, 'Password');
  const rIdx    = colIndex(headers, 'Role');
  const dIdx    = colIndex(headers, 'Divisi');
  const nIdx    = colIndex(headers, 'Nama');

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (
      String(row[uIdx] || '').trim() === String(username).trim() &&
      String(row[pIdx] || '').trim() === String(password).trim()
    ) {
      return {
        username : String(row[uIdx] || '').trim(),
        role     : String(row[rIdx] || '').trim(),
        divisi   : String(row[dIdx] || '').trim(),
        nama     : String(row[nIdx] || '').trim(),
      };
    }
  }

  throw new Error('Username atau password salah.');
}

// ─── DATA READ ────────────────────────────────────────────────────────────────

async function getAll(role, userDivisi) {
  const data = await readSheet(SHEET_DATA);

  if (data.length < 2) {
    return {
      rows : [],
      stats: buildStats([]),
    };
  }

  const headers = data[0];
  const rows    = [];

  for (let i = 1; i < data.length; i++) {
    const rowArr = data[i];
    const obj    = { _rowIndex: i + 1 }; // 1-indexed, row 1 = header

    headers.forEach((h, idx) => {
      const v = rowArr[idx];
      // Kolom yang berisi tanggal
      if (['Tanggal Laporan', 'Due Date', 'Tanggal Close'].includes(h)) {
        obj[h] = parseSheetDate(v);
      } else {
        obj[h] = v !== null && v !== undefined ? v : '';
      }
    });

    // Filter: PIC hanya lihat divisi mereka
    if (role === 'Admin' || String(obj['Divisi'] || '').trim() === String(userDivisi || '').trim()) {
      rows.push(obj);
    }
  }

  // Kembalikan urutan terbalik (terbaru di atas) tapi rowIndex tetap benar
  return {
    rows : [...rows].reverse(),
    stats: buildStats(rows),
  };
}

function buildStats(rows) {
  return {
    total       : rows.length,
    open        : rows.filter(r => String(r['Status'] || '') !== 'Close').length,
    closed      : rows.filter(r => String(r['Status'] || '') === 'Close').length,
    requestClose: rows.filter(r =>
      String(r['Request Close'] || '') === 'Ya' &&
      String(r['Status']        || '') !== 'Close'
    ).length,
    avgProgres  : rows.length
      ? Math.round(rows.reduce((a, b) => a + (Number(b['Progres%']) || 0), 0) / rows.length)
      : 0,
    byDirektorat: rows.reduce((acc, r) => {
      const k  = r['Kode Direktorat'] || 'N/A';
      acc[k]   = (acc[k] || 0) + 1;
      return acc;
    }, {}),
    byDepartemen: rows.reduce((acc, r) => {
      const k  = r['Departemen'] || 'N/A';
      acc[k]   = (acc[k] || 0) + 1;
      return acc;
    }, {}),
  };
}

// ─── DATA WRITE ───────────────────────────────────────────────────────────────

async function addRows(newRows) {
  if (!newRows || !newRows.length) throw new Error('Tidak ada data untuk ditambahkan.');

  const sheets  = await getSheetsClient();
  const ssId    = getSpreadsheetId();
  const data    = await readSheet(SHEET_DATA);
  const headers = data[0];

  // Nomor terakhir di kolom No
  const noIdx  = headers.indexOf('No');
  let lastNo   = 0;
  if (data.length > 1 && noIdx >= 0) {
    lastNo = Number(data[data.length - 1][noIdx]) || 0;
  }

  const toAppend = newRows.map((r, idx) => {
    return headers.map(h => {
      if (h === 'No')            return lastNo + idx + 1;
      if (h === 'Status')        return r[h] || 'Open';
      if (h === 'Request Close') return 'Belum';
      if (h === 'Progres%')      return 0;
      if (['Tanggal Laporan','Due Date','Tanggal Close'].includes(h)) return formatDateForSheet(r[h]);
      return r[h] !== undefined && r[h] !== null ? r[h] : '';
    });
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId   : ssId,
    range           : SHEET_DATA,
    valueInputOption: 'USER_ENTERED',
    requestBody     : { values: toAppend },
  });

  return { added: toAppend.length };
}

async function updateRowAdmin(rowIndex, updatedData) {
  if (!rowIndex || !updatedData) throw new Error('Parameter tidak lengkap.');

  const data    = await readSheet(SHEET_DATA);
  const headers = data[0];

  // Existing row sebagai fallback mencegah kolom terhapus
  const existingRow = data[rowIndex - 1]; // rowIndex adalah 1-based
  const existingObj = {};
  headers.forEach((h, idx) => { existingObj[h] = existingRow[idx]; });

  const rowValues = [headers.map(h => {
    // Auto-set Tanggal Close jika status jadi Close
    if (h === 'Tanggal Close' && String(updatedData['Status'] || '') === 'Close') {
      const existing = updatedData[h] || existingObj[h];
      return existing ? formatDateForSheet(existing) : new Date().toISOString().split('T')[0];
    }
    if (['Tanggal Laporan','Due Date','Tanggal Close'].includes(h)) {
      const v = updatedData[h] !== undefined ? updatedData[h] : existingObj[h];
      return formatDateForSheet(v);
    }
    return updatedData[h] !== undefined ? updatedData[h] : existingObj[h];
  })];

  await updateRange(SHEET_DATA, rowIndex, 1, rowValues);
  return { success: true };
}

async function updateStatus(rowIndex, status) {
  if (!rowIndex) throw new Error('rowIndex tidak valid.');

  const data      = await readSheet(SHEET_DATA);
  const headers   = data[0];
  const statusIdx = colIndex(headers, 'Status') + 1; // 1-based untuk updateRange

  await updateRange(SHEET_DATA, rowIndex, statusIdx, [[status]]);

  // Set Request Close = Belum
  const rcIdx = headers.indexOf('Request Close');
  if (rcIdx >= 0) {
    await updateRange(SHEET_DATA, rowIndex, rcIdx + 1, [['Belum']]);
  }

  // Set Tanggal Close jika Close
  if (status === 'Close') {
    const tcIdx = headers.indexOf('Tanggal Close');
    if (tcIdx >= 0) {
      const today = new Date().toISOString().split('T')[0];
      await updateRange(SHEET_DATA, rowIndex, tcIdx + 1, [[today]]);
    }
  }

  return { success: true };
}

async function rejectCloseRequest(rowIndex) {
  if (!rowIndex) throw new Error('rowIndex tidak valid.');

  const data    = await readSheet(SHEET_DATA);
  const headers = data[0];
  const rcIdx   = colIndex(headers, 'Request Close') + 1; // 1-based

  await updateRange(SHEET_DATA, rowIndex, rcIdx, [['Belum']]);
  return { success: true };
}

async function deleteRow(rowIndex) {
  if (!rowIndex || rowIndex < 2) throw new Error('Tidak bisa menghapus baris header.');

  const sheets = await getSheetsClient();
  const ssId   = getSpreadsheetId();

  // Dapatkan sheetId numerik dari nama sheet
  const meta = await sheets.spreadsheets.get({ spreadsheetId: ssId });
  const sheet = meta.data.sheets.find(s => s.properties.title === SHEET_DATA);
  if (!sheet) throw new Error(`Sheet "${SHEET_DATA}" tidak ditemukan.`);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: ssId,
    requestBody  : {
      requests: [{
        deleteDimension: {
          range: {
            sheetId   : sheet.properties.sheetId,
            dimension : 'ROWS',
            startIndex: rowIndex - 1, // 0-based
            endIndex  : rowIndex,     // exclusive
          },
        },
      }],
    },
  });

  return { success: true };
}

// ─── USER MANAGEMENT ─────────────────────────────────────────────────────────

async function getUsers() {
  const data    = await readSheet(SHEET_USERS);
  if (data.length < 1) return [];

  const headers = data[0];
  return data.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = r[i] !== null && r[i] !== undefined ? r[i] : ''; });
    return obj;
  });
}

async function addUser(u, p, r, d, n) {
  if (!u || !p || !r || !n) throw new Error('Field tidak lengkap.');

  const data = await readSheet(SHEET_USERS);
  const uIdx = colIndex(data[0], 'Username');

  // Cek duplikat
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][uIdx] || '').trim().toLowerCase() === String(u).trim().toLowerCase()) {
      throw new Error(`Username "${u}" sudah digunakan.`);
    }
  }

  const sheets = await getSheetsClient();
  const ssId   = getSpreadsheetId();

  await sheets.spreadsheets.values.append({
    spreadsheetId   : ssId,
    range           : SHEET_USERS,
    valueInputOption: 'RAW',
    requestBody     : { values: [[u.trim(), p, r, d || '', n.trim()]] },
  });

  return { success: true };
}

async function updateUser(username, p, r, d, n) {
  if (!username || !p || !r || !n) throw new Error('Field tidak lengkap.');

  const data = await readSheet(SHEET_USERS);
  const uIdx = colIndex(data[0], 'Username');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][uIdx] || '').trim() === String(username).trim()) {
      // Update kolom 2–5 (Password, Role, Divisi, Nama) — 1-based
      await updateRange(SHEET_USERS, i + 1, 2, [[p, r, d || '', n.trim()]]);
      return { success: true };
    }
  }

  throw new Error(`User "${username}" tidak ditemukan.`);
}

async function deleteUser(username) {
  if (!username) throw new Error('Username tidak boleh kosong.');

  const sheets = await getSheetsClient();
  const ssId   = getSpreadsheetId();
  const data   = await readSheet(SHEET_USERS);
  const uIdx   = colIndex(data[0], 'Username');

  let targetRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][uIdx] || '').trim() === String(username).trim()) {
      targetRow = i + 1; // 1-based row index
      break;
    }
  }
  if (targetRow < 0) throw new Error(`User "${username}" tidak ditemukan.`);

  const meta  = await sheets.spreadsheets.get({ spreadsheetId: ssId });
  const sheet = meta.data.sheets.find(s => s.properties.title === SHEET_USERS);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: ssId,
    requestBody  : {
      requests: [{
        deleteDimension: {
          range: {
            sheetId   : sheet.properties.sheetId,
            dimension : 'ROWS',
            startIndex: targetRow - 1,
            endIndex  : targetRow,
          },
        },
      }],
    },
  });

  return { success: true };
}

module.exports = {
  login,
  getAll,
  addRows,
  updateRowAdmin,
  updateStatus,
  rejectCloseRequest,
  deleteRow,
  getUsers,
  addUser,
  updateUser,
  deleteUser,
};
