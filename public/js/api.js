/**
 * ============================================================================
 * API CLIENT - WRAPPER UNTUK BACKEND API
 * ============================================================================
 *
 * File ini menggantikan google.script.run dengan fetch API calls
 * ke backend Express server.
 *
 * Catatan v1.1.0:
 *  - Semua write-endpoint kini mem-forward parameter `actor` (user yang sedang
 *    login) ke server. Tanpa ini, server tidak mencatat aktivitas di
 *    sheet "Activity Log" karena field tersebut datang sebagai undefined.
 *
 * @author Miftahur Rizki
 * @version 1.1.0
 */

const API_BASE = window.location.origin + '/api';

function _json(res) { return res.json(); }

const API = {
  login: function (username, password) {
    return fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    }).then(_json);
  },

  getAll: function (role, userDivisi) {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    if (userDivisi) params.append('divisi', userDivisi);
    return fetch(`${API_BASE}/data?${params.toString()}`).then(_json);
  },

  addRows: function (rows, actor) {
    return fetch(`${API_BASE}/data/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows, actor })
    }).then(_json);
  },

  updateRowAdmin: function (rowIndex, data, actor) {
    return fetch(`${API_BASE}/data/update/${rowIndex}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'Admin', data, actor })
    }).then(_json);
  },

  updateRowPIC: function (rowIndex, data, actor) {
    return fetch(`${API_BASE}/data/update/${rowIndex}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'PIC', data, actor })
    }).then(_json);
  },

  updateStatus: function (rowIndex, status, actor) {
    return fetch(`${API_BASE}/data/status/${rowIndex}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, actor })
    }).then(_json);
  },

  rejectCloseRequest: function (rowIndex, actor) {
    return fetch(`${API_BASE}/data/reject-close/${rowIndex}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor })
    }).then(_json);
  },

  deleteRow: function (rowIndex, actor) {
    let url = `${API_BASE}/data/delete/${rowIndex}`;
    if (actor) url += '?actor=' + encodeURIComponent(JSON.stringify(actor));
    return fetch(url, { method: 'DELETE' }).then(_json);
  },

  getUsers: function () {
    return fetch(`${API_BASE}/users`).then(_json);
  },

  addUser: function (username, password, role, divisi, nama) {
    return fetch(`${API_BASE}/users/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role, divisi, nama })
    }).then(_json);
  },

  updateUser: function (username, password, role, divisi, nama) {
    return fetch(`${API_BASE}/users/update/${username}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, role, divisi, nama })
    }).then(_json);
  },

  deleteUser: function (username) {
    return fetch(`${API_BASE}/users/delete/${username}`, {
      method: 'DELETE'
    }).then(_json);
  }
};

window.API = API;
