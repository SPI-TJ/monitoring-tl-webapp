/**
 * ============================================================================
 * INPUT VALIDATION & SANITIZATION
 * ============================================================================
 */

'use strict';

const URL_FIELDS_DATA = new Set(['Link Evidence']);
const FORMULA_TRIGGERS = ['=', '+', '@'];

/**
 * Reject URL dengan protocol selain http(s).
 * Empty string diperbolehkan.
 * Return: { ok: true, value: 'sanitized' } atau { ok: false, message: '...' }
 */
function validateHttpUrl(value) {
  if (value === undefined || value === null) return { ok: true, value: '' };
  const s = String(value).trim();
  if (s === '') return { ok: true, value: '' };
  let u;
  try { u = new URL(s); }
  catch { return { ok: false, message: 'URL tidak valid.' }; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { ok: false, message: `Protocol "${u.protocol}" tidak diizinkan untuk Link Evidence.` };
  }
  return { ok: true, value: u.href };
}

/**
 * Cegah Google Sheets formula injection: prefix `'` jika value diawali =, +, @.
 * Dash `-` tidak diprefix karena banyak nilai legit dimulai dengan minus.
 */
function sanitizeFormulaValue(value) {
  if (value === undefined || value === null) return value;
  const s = String(value);
  if (s.length === 0) return s;
  if (FORMULA_TRIGGERS.includes(s[0])) return `'${s}`;
  return s;
}

/**
 * Sanitasi obyek "Data" row sebelum disimpan: validate URL fields + sanitize formula triggers
 * pada SEMUA value string user-input. Returns { ok, errors[], data }.
 */
function sanitizeDataRow(obj) {
  const errors = [];
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (URL_FIELDS_DATA.has(k)) {
      const r = validateHttpUrl(v);
      if (!r.ok) errors.push(`${k}: ${r.message}`);
      else out[k] = r.value;
      continue;
    }
    if (typeof v === 'string') out[k] = sanitizeFormulaValue(v);
    else out[k] = v;
  }
  return { ok: errors.length === 0, errors, data: out };
}

module.exports = {
  validateHttpUrl,
  sanitizeFormulaValue,
  sanitizeDataRow,
  URL_FIELDS_DATA,
};
