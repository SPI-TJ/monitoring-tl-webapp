/**
 * ============================================================================
 * API CLIENT — v2.0.0 (Token-based auth)
 * ============================================================================
 *
 * Perubahan dari v1.1.0:
 *  - Semua request otomatis menyertakan header `Authorization: Bearer <token>`
 *    jika ada token tersimpan di localStorage.
 *  - Parameter `actor` & `role` dari fungsi-fungsi update tidak dikirim ke
 *    server lagi — server identifikasi user via token.
 *  - Saat respon 401, token + session di-clear dan event `session-expired`
 *    di-dispatch ke window agar UI bisa redirect ke login.
 *
 * Catatan kompatibilitas: signature fungsi dipertahankan untuk minimasi
 * perubahan caller. Argumen ekstra (actor/role) di-ignore.
 */

const API_BASE  = window.location.origin + '/api';
const TOKEN_KEY = 'ptj_token';

function _getToken()  { return localStorage.getItem(TOKEN_KEY); }
function _setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
function _clearToken(){ localStorage.removeItem(TOKEN_KEY); }

function _headers() {
  var h = { 'Content-Type': 'application/json' };
  var t = _getToken();
  if (t) h['Authorization'] = 'Bearer ' + t;
  return h;
}

function _handle(res) {
  if (res.status === 401) {
    _clearToken();
    try { localStorage.removeItem('ptj_session'); } catch (_) {}
    try { window.dispatchEvent(new CustomEvent('session-expired')); } catch (_) {}
  }
  return res.json();
}

const API = {
  login: function (username, password) {
    return fetch(API_BASE + '/auth/login', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ username: username, password: password })
    }).then(function (r) { return r.json(); }).then(function (r) {
      if (r && r.success && r.token) _setToken(r.token);
      return r;
    });
  },

  logout: function () {
    _clearToken();
    try { localStorage.removeItem('ptj_session'); } catch (_) {}
  },

  verify: function () {
    return fetch(API_BASE + '/auth/verify', { headers: _headers() }).then(_handle);
  },

  getAll: function () {
    return fetch(API_BASE + '/data', { headers: _headers() }).then(_handle);
  },

  addRows: function (rows) {
    return fetch(API_BASE + '/data/add', {
      method : 'POST',
      headers: _headers(),
      body   : JSON.stringify({ rows: rows })
    }).then(_handle);
  },

  updateRowAdmin: function (rowIndex, data) {
    return fetch(API_BASE + '/data/update/' + rowIndex, {
      method : 'PUT',
      headers: _headers(),
      body   : JSON.stringify({ data: data })
    }).then(_handle);
  },

  updateRowPIC: function (rowIndex, data) {
    return fetch(API_BASE + '/data/update/' + rowIndex, {
      method : 'PUT',
      headers: _headers(),
      body   : JSON.stringify({ data: data })
    }).then(_handle);
  },

  updateStatus: function (rowIndex, status) {
    return fetch(API_BASE + '/data/status/' + rowIndex, {
      method : 'PUT',
      headers: _headers(),
      body   : JSON.stringify({ status: status })
    }).then(_handle);
  },

  rejectCloseRequest: function (rowIndex) {
    return fetch(API_BASE + '/data/reject-close/' + rowIndex, {
      method : 'PUT',
      headers: _headers(),
      body   : JSON.stringify({})
    }).then(_handle);
  },

  deleteRow: function (rowIndex) {
    return fetch(API_BASE + '/data/delete/' + rowIndex, {
      method : 'DELETE',
      headers: _headers()
    }).then(_handle);
  },

  getUsers: function () {
    return fetch(API_BASE + '/users', { headers: _headers() }).then(_handle);
  },

  addUser: function (username, password, role, divisi, nama) {
    return fetch(API_BASE + '/users/add', {
      method : 'POST',
      headers: _headers(),
      body   : JSON.stringify({ username: username, password: password, role: role, divisi: divisi, nama: nama })
    }).then(_handle);
  },

  updateUser: function (username, password, role, divisi, nama) {
    return fetch(API_BASE + '/users/update/' + username, {
      method : 'PUT',
      headers: _headers(),
      body   : JSON.stringify({ password: password, role: role, divisi: divisi, nama: nama })
    }).then(_handle);
  },

  deleteUser: function (username) {
    return fetch(API_BASE + '/users/delete/' + username, {
      method : 'DELETE',
      headers: _headers()
    }).then(_handle);
  }
};

window.API = API;
