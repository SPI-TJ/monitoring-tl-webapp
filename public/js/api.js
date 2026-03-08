/**
 * ============================================================================
 * API CLIENT - WRAPPER UNTUK BACKEND API
 * ============================================================================
 * 
 * File ini menggantikan google.script.run dengan fetch API calls
 * ke backend Express server
 * 
 * @author Miftahur Rizki
 * @version 1.0.0
 */

const API_BASE = window.location.origin + '/api';

/**
 * API Client - meniru interface google.script.run
 */
const API = {
  /**
   * Login user
   */
  login: function(username, password) {
    return fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    }).then(r => r.json());
  },

  /**
   * Get all data dengan filter role/divisi
   */
  getAll: function(role, userDivisi) {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    if (userDivisi) params.append('divisi', userDivisi);
    
    return fetch(`${API_BASE}/data?${params.toString()}`)
      .then(r => r.json());
  },

  /**
   * Add rows (Admin only)
   */
  addRows: function(rows) {
    return fetch(`${API_BASE}/data/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows })
    }).then(r => r.json());
  },

  /**
   * Update row (Admin full, PIC partial)
   */
  updateRowAdmin: function(rowIndex, data) {
    return fetch(`${API_BASE}/data/update/${rowIndex}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'Admin', data })
    }).then(r => r.json());
  },

  /**
   * Update row (PIC)
   */
  updateRowPIC: function(rowIndex, data) {
    return fetch(`${API_BASE}/data/update/${rowIndex}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'PIC', data })
    }).then(r => r.json());
  },

  /**
   * Update status (approve close)
   */
  updateStatus: function(rowIndex, status) {
    return fetch(`${API_BASE}/data/status/${rowIndex}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    }).then(r => r.json());
  },

  /**
   * Reject close request
   */
  rejectCloseRequest: function(rowIndex) {
    return fetch(`${API_BASE}/data/reject-close/${rowIndex}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }).then(r => r.json());
  },

  /**
   * Delete row
   */
  deleteRow: function(rowIndex) {
    return fetch(`${API_BASE}/data/delete/${rowIndex}`, {
      method: 'DELETE'
    }).then(r => r.json());
  },

  /**
   * Get all users
   */
  getUsers: function() {
    return fetch(`${API_BASE}/users`)
      .then(r => r.json());
  },

  /**
   * Add user
   */
  addUser: function(username, password, role, divisi, nama) {
    return fetch(`${API_BASE}/users/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role, divisi, nama })
    }).then(r => r.json());
  },

  /**
   * Update user
   */
  updateUser: function(username, password, role, divisi, nama) {
    return fetch(`${API_BASE}/users/update/${username}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, role, divisi, nama })
    }).then(r => r.json());
  },

  /**
   * Delete user
   */
  deleteUser: function(username) {
    return fetch(`${API_BASE}/users/delete/${username}`, {
      method: 'DELETE'
    }).then(r => r.json());
  }
};

// Export untuk digunakan di HTML
window.API = API;
