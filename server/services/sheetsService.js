/**
 * ============================================================================
 * GOOGLE SHEETS SERVICE — v2.0.0  (Quota-Safe Edition)
 * ============================================================================
 *
 * Perbaikan utama dari v1:
 *  1. Write Queue  — semua operasi tulis di-serialise lewat antrian FIFO
 *                    sehingga tidak ada burst write bersamaan.
 *  2. Token Bucket — maksimum WRITE_RPM write/menit (default 55, batas Sheets = 60).
 *                    Jika bucket kosong, request dimasukkan antrean & dieksekusi
 *                    setelah slot tersedia — TIDAK pernah throw 429 ke user.
 *  3. Read Cache   — per-sheet, TTL READ_CACHE_TTL ms.  Dipaksa invalidate setiap
 *                    kali ada write sukses pada sheet yang sama.
 *  4. Header Cache — kolom-headers tidak perlu di-fetch ulang setiap updateCells.
 *  5. Retry        — write yang gagal 429/500 di-retry otomatis hingga MAX_RETRIES kali
 *                    dengan exponential back-off.
 *  6. Health stats — endpoint /api/health bisa lihat queue depth, token sisa, dll.
 *
 * @author  Miftahur Rizki
 * @version 2.0.0
 */

'use strict';

const { google } = require('googleapis');
const path       = require('path');
const EventEmitter = require('events');

/* ═══════════════════════════════════════════════════════
   TUNABLES  (override via .env)
═══════════════════════════════════════════════════════ */
const WRITE_RPM        = parseInt(process.env.SHEETS_WRITE_RPM  || '55');  // token per menit
const READ_CACHE_TTL   = parseInt(process.env.SHEETS_READ_TTL   || '15000'); // ms — 15 detik
const HEADER_CACHE_TTL = parseInt(process.env.SHEETS_HDR_TTL    || '300000'); // ms — 5 menit
const MAX_RETRIES      = parseInt(process.env.SHEETS_MAX_RETRY  || '4');
const BASE_BACKOFF_MS  = parseInt(process.env.SHEETS_BACKOFF_MS || '1500');
const MAX_QUEUE_DEPTH  = parseInt(process.env.SHEETS_MAX_QUEUE  || '200');

/* ═══════════════════════════════════════════════════════
   TOKEN BUCKET  (write rate limiter)
═══════════════════════════════════════════════════════ */
class TokenBucket {
  constructor(capacity, refillPerMinute) {
    this.capacity   = capacity;
    this.tokens     = capacity;
    this.refillRate = refillPerMinute / 60_000; // token per ms
    this.lastRefill = Date.now();
  }

  _refill() {
    const now    = Date.now();
    const added  = (now - this.lastRefill) * this.refillRate;
    this.tokens  = Math.min(this.capacity, this.tokens + added);
    this.lastRefill = now;
  }

  /** Ambil 1 token.  Return true jika tersedia, false jika bucket kosong. */
  consume() {
    this._refill();
    if (this.tokens >= 1) { this.tokens -= 1; return true; }
    return false;
  }

  /** Berapa ms sampai minimal 1 token tersedia */
  msUntilToken() {
    this._refill();
    if (this.tokens >= 1) return 0;
    return Math.ceil((1 - this.tokens) / this.refillRate);
  }

  get remaining() { this._refill(); return Math.floor(this.tokens); }
}

/* ═══════════════════════════════════════════════════════
   WRITE QUEUE  (serialised FIFO + token-bucket gating)
═══════════════════════════════════════════════════════ */
class WriteQueue extends EventEmitter {
  constructor(bucket) {
    super();
    this._bucket  = bucket;
    this._queue   = [];      // [ { fn, resolve, reject, retries } ]
    this._running = false;
  }

  /**
   * Enqueue satu fungsi async write.
   * Kembalikan Promise yang resolve/reject sesuai hasil eksekusi.
   */
  enqueue(fn, label = 'write') {
    if (this._queue.length >= MAX_QUEUE_DEPTH) {
      return Promise.reject(
        new Error(`Write queue penuh (${MAX_QUEUE_DEPTH}). Coba beberapa saat lagi.`)
      );
    }
    return new Promise((resolve, reject) => {
      this._queue.push({ fn, resolve, reject, retries: 0, label });
      if (!this._running) this._drain();
    });
  }

  async _drain() {
    this._running = true;
    while (this._queue.length > 0) {
      // Tunggu sampai ada token
      const wait = this._bucket.msUntilToken();
      if (wait > 0) {
        await _sleep(wait);
      }
      if (!this._bucket.consume()) continue; // re-check (race-safe)

      const item = this._queue.shift();
      try {
        const result = await _withRetry(item.fn, MAX_RETRIES, BASE_BACKOFF_MS, item.label);
        item.resolve(result);
      } catch (err) {
        item.reject(err);
      }
    }
    this._running = false;
  }

  get depth() { return this._queue.length; }
}

/* ═══════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════ */
function _sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function _isRetryable(err) {
  // 429 Too Many Requests atau 500/503 server errors
  const code = err?.code || err?.status || (err?.response?.status);
  if ([429, 500, 502, 503, 504].includes(Number(code))) return true;
  const msg = String(err?.message || '').toLowerCase();
  return msg.includes('quota') || msg.includes('rate') || msg.includes('too many');
}

async function _withRetry(fn, maxRetries, baseDelayMs, label = 'op') {
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!_isRetryable(err) || attempt === maxRetries) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
      console.warn(`⚠ [${label}] attempt ${attempt + 1} failed (${err.message}), retry in ${Math.round(delay)}ms`);
      await _sleep(delay);
    }
  }
  throw lastErr;
}

/* ═══════════════════════════════════════════════════════
   CACHE  (read cache + header cache)
═══════════════════════════════════════════════════════ */
class SheetCache {
  constructor() {
    this._data    = new Map(); // sheetName → { rows, ts }
    this._headers = new Map(); // sheetName → { headers, ts }
  }

  /* --- Read cache --- */
  getRows(sheetName) {
    const entry = this._data.get(sheetName);
    if (!entry) return null;
    if (Date.now() - entry.ts > READ_CACHE_TTL) { this._data.delete(sheetName); return null; }
    return entry.rows;
  }

  setRows(sheetName, rows) {
    this._data.set(sheetName, { rows, ts: Date.now() });
  }

  invalidate(sheetName) {
    this._data.delete(sheetName);
    // Jangan hapus header cache — headers jarang berubah
  }

  invalidateAll() {
    this._data.clear();
  }

  /* --- Header cache --- */
  getHeaders(sheetName) {
    const entry = this._headers.get(sheetName);
    if (!entry) return null;
    if (Date.now() - entry.ts > HEADER_CACHE_TTL) { this._headers.delete(sheetName); return null; }
    return entry.headers;
  }

  setHeaders(sheetName, headers) {
    this._headers.set(sheetName, { headers, ts: Date.now() });
  }

  invalidateHeaders(sheetName) {
    this._headers.delete(sheetName);
  }

  stats() {
    return {
      cachedSheets:  [...this._data.keys()],
      cachedHeaders: [...this._headers.keys()],
    };
  }
}

/* ═══════════════════════════════════════════════════════
   MAIN SERVICE
═══════════════════════════════════════════════════════ */
class SheetsService {
  constructor() {
    this.spreadsheetId = process.env.SPREADSHEET_ID;
    this.auth          = null;
    this.sheets        = null;
    this.initialized   = false;

    this._sheetIdCache = {};  // sheetName → numeric sheetId (permanent)
    this._sheetExists  = {};  // sheetName → true

    this._cache  = new SheetCache();
    this._bucket = new TokenBucket(WRITE_RPM, WRITE_RPM);
    this._queue  = new WriteQueue(this._bucket);

    // Expose stats untuk health endpoint
    this.stats = () => ({
      queueDepth    : this._queue.depth,
      tokensLeft    : this._bucket.remaining,
      writeRpm      : WRITE_RPM,
      readCacheTtl  : READ_CACHE_TTL,
      ...this._cache.stats(),
    });
  }

  /* ─── Init ──────────────────────────────────────── */
  async initialize() {
    if (this.initialized) return;
    try {
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        this.auth = new google.auth.GoogleAuth({
          keyFile: path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS),
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
      } else if (process.env.GOOGLE_CREDENTIALS_JSON) {
        this.auth = new google.auth.GoogleAuth({
          credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON),
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
      } else {
        throw new Error('Google credentials not found. Set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CREDENTIALS_JSON');
      }
      this.sheets      = google.sheets({ version: 'v4', auth: this.auth });
      this.initialized = true;
      console.log('✅ Google Sheets API initialized (v2 — quota-safe)');
    } catch (err) {
      console.error('❌ Failed to initialize Google Sheets API:', err.message);
      throw err;
    }
  }

  /* ─── READ ──────────────────────────────────────── */

  /**
   * Baca semua baris dari sheet.
   * Hasil di-cache READ_CACHE_TTL ms.
   * @param {string} sheetName
   * @param {boolean} [forceRefresh=false]
   */
  async getSheetData(sheetName, forceRefresh = false) {
    await this.initialize();

    if (!forceRefresh) {
      const cached = this._cache.getRows(sheetName);
      if (cached) return cached;
    }

    // Retry pada read juga (lebih lenient — hanya 429)
    const rows = await _withRetry(async () => {
      const res = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range        : `${sheetName}!A:Z`,
      });
      return res.data.values || [];
    }, 3, BASE_BACKOFF_MS, `read:${sheetName}`);

    this._cache.setRows(sheetName, rows);

    // Simpan headers juga agar updateCells tidak perlu fetch ulang
    if (rows.length > 0) {
      this._cache.setHeaders(sheetName, rows[0]);
    }

    return rows;
  }

  /* ─── Helper: dapatkan headers (cache-first) ─────── */
  async _getHeaders(sheetName) {
    const cached = this._cache.getHeaders(sheetName);
    if (cached) return cached;

    const rows = await this.getSheetData(sheetName);
    return rows.length > 0 ? rows[0] : [];
  }

  /* ─── rowsToObjects (sync, tidak perlu diubah) ───── */
  rowsToObjects(rows) {
    if (!rows || rows.length === 0) return [];
    const headers  = rows[0];
    const dataRows = rows.slice(1);
    return dataRows.map((row, index) => {
      const obj = { _rowIndex: index + 2 };
      headers.forEach((header, colIndex) => {
        obj[header] = row[colIndex] !== undefined && row[colIndex] !== null ? row[colIndex] : '';
      });
      return obj;
    });
  }

  /* ─── WRITE helpers (semua lewat queue) ─────────── */

  /**
   * Append satu atau lebih baris.
   */
  async appendRows(sheetName, values) {
    await this.initialize();
    return this._queue.enqueue(async () => {
      const res = await this.sheets.spreadsheets.values.append({
        spreadsheetId   : this.spreadsheetId,
        range           : `${sheetName}!A:A`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource        : { values },
      });
      this._cache.invalidate(sheetName);
      return res.data;
    }, `append:${sheetName}`);
  }

  /**
   * Update seluruh baris (semua kolom A–Z).
   */
  async updateRow(sheetName, rowIndex, values) {
    await this.initialize();
    return this._queue.enqueue(async () => {
      const res = await this.sheets.spreadsheets.values.update({
        spreadsheetId   : this.spreadsheetId,
        range           : `${sheetName}!A${rowIndex}:Z${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        resource        : { values: [values] },
      });
      this._cache.invalidate(sheetName);
      return res.data;
    }, `updateRow:${sheetName}:${rowIndex}`);
  }

  /**
   * Update sel-sel tertentu (batchUpdate).
   * Menggunakan header cache — TIDAK fetch ulang seluruh sheet.
   */
  async updateCells(sheetName, rowIndex, updates) {
    await this.initialize();

    // Ambil headers dari cache (tidak hit API jika sudah ada)
    const headers = await this._getHeaders(sheetName);
    if (!headers || headers.length === 0) {
      throw new Error(`Headers untuk sheet "${sheetName}" tidak ditemukan.`);
    }

    const data = [];
    for (const [columnName, value] of Object.entries(updates)) {
      const colIndex = headers.indexOf(columnName);
      if (colIndex !== -1) {
        data.push({
          range : `${sheetName}!${this.numberToLetter(colIndex + 1)}${rowIndex}`,
          values: [[value]],
        });
      }
    }
    if (data.length === 0) return null;

    return this._queue.enqueue(async () => {
      const res = await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        resource     : { valueInputOption: 'USER_ENTERED', data },
      });
      this._cache.invalidate(sheetName);
      return res.data;
    }, `updateCells:${sheetName}:${rowIndex}`);
  }

  /**
   * Hapus baris berdasarkan nomor baris (1-based).
   */
  async deleteRow(sheetName, rowIndex) {
    await this.initialize();
    const sheetId = await this._getSheetId(sheetName);

    return this._queue.enqueue(async () => {
      const res = await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        resource     : {
          requests: [{
            deleteDimension: {
              range: {
                sheetId,
                dimension  : 'ROWS',
                startIndex : rowIndex - 1,
                endIndex   : rowIndex,
              },
            },
          }],
        },
      });
      this._cache.invalidate(sheetName);
      return res.data;
    }, `deleteRow:${sheetName}:${rowIndex}`);
  }

  /* ─── ensureSheet ────────────────────────────────── */
  async ensureSheet(sheetName, headers) {
    if (this._sheetExists[sheetName]) return;
    await this.initialize();

    try {
      const meta     = await this.sheets.spreadsheets.get({ spreadsheetId: this.spreadsheetId });
      const existing = meta.data.sheets.find(s => s.properties.title === sheetName);

      if (existing) {
        this._sheetExists[sheetName]  = true;
        this._sheetIdCache[sheetName] = existing.properties.sheetId;
        return;
      }

      // Buat sheet baru — juga lewat queue supaya tidak burst
      await this._queue.enqueue(async () => {
        const res = await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          resource     : { requests: [{ addSheet: { properties: { title: sheetName } } }] },
        });
        const added = res.data.replies?.[0]?.addSheet?.properties;
        if (added) this._sheetIdCache[sheetName] = added.sheetId;
      }, `addSheet:${sheetName}`);

      if (headers && headers.length > 0) {
        await this.appendRows(sheetName, [headers]);
        this._cache.setHeaders(sheetName, headers);
      }

      this._sheetExists[sheetName] = true;
      console.log(`✅ Sheet "${sheetName}" created`);
    } catch (err) {
      console.error(`Error ensuring sheet "${sheetName}":`, err.message);
    }
  }

  /* ─── Private: dapatkan numeric sheetId ─────────── */
  async _getSheetId(sheetName) {
    if (this._sheetIdCache[sheetName] !== undefined) return this._sheetIdCache[sheetName];

    await this.initialize();
    const meta  = await this.sheets.spreadsheets.get({ spreadsheetId: this.spreadsheetId });
    const sheet = meta.data.sheets.find(s => s.properties.title === sheetName);
    if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);
    this._sheetIdCache[sheetName] = sheet.properties.sheetId;
    return sheet.properties.sheetId;
  }

  /* ─── Utilities ──────────────────────────────────── */
  numberToLetter(num) {
    let letter = '';
    while (num > 0) {
      const rem = (num - 1) % 26;
      letter = String.fromCharCode(65 + rem) + letter;
      num    = Math.floor((num - 1) / 26);
    }
    return letter;
  }

  /**
   * Force-invalidate read cache untuk sheet tertentu
   * (berguna jika data diubah dari luar aplikasi)
   */
  invalidateCache(sheetName) {
    if (sheetName) this._cache.invalidate(sheetName);
    else           this._cache.invalidateAll();
  }
}

/* Export singleton */
module.exports = new SheetsService();