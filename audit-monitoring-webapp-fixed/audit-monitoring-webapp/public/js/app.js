/**
 * public/js/app.js
 * Frontend logic — versi Vercel/Express.
 * Menggantikan semua google.script.run dengan fetch() ke REST API.
 */

// ═══════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════
let currentUser       = null;
let authToken         = null;     // JWT token — disimpan di memory
let cachedRows        = null;
let cachedStats       = null;
let filteredRows      = [];
let allRows           = [];
let editRowIndex      = null;
let editUserIndex     = null;
let pendingUploadRows = [];
let pendingDeleteRowIndex = null;
let currentPage       = 1;
const PAGE_SIZE       = 50;
let searchTimer       = null;

const TABS_ADMIN = [
  { id: 'dashboard', label: '📊 Dashboard' },
  { id: 'data',      label: '📋 Data Temuan' },
  { id: 'request',   label: '🔔 Request Close' },
  { id: 'users',     label: '👤 User Management' },
];
const TABS_PIC = [
  { id: 'dashboard', label: '📊 Dashboard' },
  { id: 'data',      label: '📋 Data Divisi Saya' },
];
let activeTab = 'dashboard';

// ═══════════════════════════════════════════════════════════
// API HELPER
// ═══════════════════════════════════════════════════════════

/**
 * Wrapper untuk semua pemanggilan API.
 * Otomatis menyertakan Authorization header dan parse JSON.
 * @param {string} method  - GET | POST | PUT | PATCH | DELETE
 * @param {string} path    - Contoh: '/api/data'
 * @param {object} [body]  - Request body (di-JSON.stringify otomatis)
 * @returns {Promise<object>} Parsed JSON response
 */
async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = 'Bearer ' + authToken;

  const opts = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res  = await fetch(path, opts);
  const data = await res.json();

  // Jika 401, paksa logout (token expired)
  if (res.status === 401 && currentUser) {
    toast('Sesi habis. Silakan login kembali.', 'error');
    logout();
    return { success: false, message: 'Sesi habis.' };
  }

  return data;
}

// ═══════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════
async function doLogin() {
  const u   = document.getElementById('loginUser').value.trim();
  const p   = document.getElementById('loginPass').value.trim();
  if (!u || !p) { showLoginErr('Username dan password harus diisi.'); return; }

  const btn = document.getElementById('loginBtn');
  btn.innerHTML = '<span class="spinner"></span> Memuat...';
  btn.disabled  = true;
  hideLoginErr();

  try {
    const res = await api('POST', '/api/auth/login', { username: u, password: p });
    if (res.success) {
      authToken   = res.token;
      currentUser = res.user;
      startApp();
    } else {
      showLoginErr(res.message || 'Login gagal. Coba lagi.');
    }
  } catch (err) {
    showLoginErr('Gagal terhubung ke server: ' + (err.message || 'Unknown error'));
  } finally {
    btn.innerHTML = 'Masuk';
    btn.disabled  = false;
  }
}

function showLoginErr(msg) {
  const el      = document.getElementById('loginErr');
  el.textContent = '⚠ ' + msg;
  el.classList.add('show');
}
function hideLoginErr() {
  document.getElementById('loginErr').classList.remove('show');
}

function logout() {
  authToken   = null;
  currentUser = null;
  cachedRows  = null;
  cachedStats = null;
  allRows     = [];
  filteredRows = [];
  document.getElementById('app').style.display       = 'none';
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  hideLoginErr();
}

// ═══════════════════════════════════════════════════════════
// APP INIT
// ═══════════════════════════════════════════════════════════
function startApp() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('app').style.display       = 'flex';
  document.getElementById('headerUser').textContent  = currentUser.nama || currentUser.username;
  document.getElementById('headerRole').textContent  = currentUser.role;
  buildNav();
  fetchAll(() => switchTab('dashboard'));
}

function buildNav() {
  const tabs = currentUser.role === 'Admin' ? TABS_ADMIN : TABS_PIC;
  document.getElementById('mainNav').innerHTML = tabs.map(t =>
    `<div class="nav-tab ${activeTab === t.id ? 'active' : ''}" onclick="switchTab('${t.id}')">${t.label}</div>`
  ).join('');
}

function switchTab(tab) {
  activeTab = tab;
  buildNav();
  if      (tab === 'dashboard') renderDashboard(cachedStats);
  else if (tab === 'data')      { currentPage = 1; renderDataTable(); }
  else if (tab === 'request')   renderRequestClose();
  else if (tab === 'users')     loadUsers();
}

// ═══════════════════════════════════════════════════════════
// FETCH DATA
// ═══════════════════════════════════════════════════════════
async function fetchAll(callback, showLoading) {
  if (showLoading !== false) showMain('<div class="loading">Memuat data</div>');

  try {
    const res = await api('GET', '/api/data');
    if (!res.success) { showErrorBox('Gagal memuat data.', res.message); return; }

    cachedRows  = res.rows  || [];
    cachedStats = res.stats || {};
    allRows     = cachedRows;
    if (callback) callback();
  } catch (err) {
    showErrorBox('Koneksi ke server gagal.', err.message || 'Unknown error');
  }
}

function refreshData(callback) {
  cachedRows = null;
  cachedStats = null;
  fetchAll(callback, false);
}

function showErrorBox(title, detail) {
  showMain(
    `<div style="padding:32px"><div class="error-box">
      <div class="icon">🚨</div>
      <div class="content">
        <h4>${escHtml(title)}</h4>
        <p>Periksa koneksi, konfigurasi environment variable, dan nama sheet.</p>
        <div class="detail">${escHtml(detail || '')}</div>
      </div>
    </div>
    <div style="margin-top:16px">
      <button class="btn btn-primary" onclick="refreshData(()=>switchTab(activeTab))">🔄 Coba Lagi</button>
    </div></div>`
  );
}

// ═══════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════
function renderDashboard(s) {
  if (!s) { showMain('<div class="loading">Memuat</div>'); return; }

  const isAdmin = currentUser.role === 'Admin';
  const pct     = s.total > 0 ? (s.closed / s.total * 100).toFixed(1) : 0;

  const distData  = isAdmin ? (s.byDirektorat || {}) : (s.byDepartemen || {});
  const distTitle = isAdmin
    ? 'Distribusi Temuan per Direktorat'
    : `Distribusi Temuan per Departemen — Divisi ${escHtml(currentUser.divisi)}`;
  const distColHd = isAdmin ? 'Kode Direktorat' : 'Departemen';

  const distRows = Object.entries(distData)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => {
      const pctBar = s.total > 0 ? (v / s.total * 100).toFixed(0) : 0;
      return `<tr>
        <td><strong>${escHtml(k)}</strong></td>
        <td><span style="font-family:'JetBrains Mono',monospace;font-weight:700">${v}</span></td>
        <td><div class="progress-wrap">
          <div class="progress-bar"><div class="progress-fill" style="width:${pctBar}%"></div></div>
          <span class="progress-val">${pctBar}%</span>
        </div></td>
      </tr>`;
    }).join('');

  let dirDetailCard = '';
  if (isAdmin) {
    const byStatus = {};
    (allRows || []).forEach(r => {
      const dir = r['Kode Direktorat'] || 'N/A';
      if (!byStatus[dir]) byStatus[dir] = { open: 0, closed: 0, total: 0 };
      byStatus[dir].total++;
      if (String(r['Status'] || '') === 'Close') byStatus[dir].closed++;
      else byStatus[dir].open++;
    });

    const dirDetailRows = Object.entries(byStatus)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([k, v]) => {
        const pctClose = v.total > 0 ? (v.closed / v.total * 100).toFixed(0) : 0;
        return `<tr>
          <td><strong>${escHtml(k)}</strong></td>
          <td style="text-align:center">${v.total}</td>
          <td style="text-align:center"><span style="color:var(--yellow);font-weight:700">${v.open}</span></td>
          <td style="text-align:center"><span style="color:var(--green);font-weight:700">${v.closed}</span></td>
          <td><div class="progress-wrap">
            <div class="progress-bar"><div class="progress-fill" style="width:${pctClose}%;background:linear-gradient(90deg,var(--green),#4ade80)"></div></div>
            <span class="progress-val">${pctClose}%</span>
          </div></td>
        </tr>`;
      }).join('');

    dirDetailCard = `
      <div class="section-card" style="margin-top:0">
        <div class="section-header"><div>
          <div class="section-title">📊 Status per Direktorat</div>
          <div class="section-subtitle">Rincian open vs close tiap direktorat</div>
        </div></div>
        <div class="table-wrap"><table>
          <thead><tr>
            <th>Kode Direktorat</th>
            <th style="text-align:center">Total</th>
            <th style="text-align:center">Open</th>
            <th style="text-align:center">Close</th>
            <th style="min-width:160px">% Selesai</th>
          </tr></thead>
          <tbody>${dirDetailRows || '<tr><td colspan="5"><div class="empty">Tidak ada data</div></td></tr>'}</tbody>
        </table></div>
      </div>`;
  }

  showMain(`
    <div class="stats-grid">
      <div class="stat-card total"><div class="stat-value">${s.total}</div><div class="stat-label">Total Rekomendasi</div></div>
      <div class="stat-card open"><div class="stat-value">${s.open}</div><div class="stat-label">Masih Open</div></div>
      <div class="stat-card closed"><div class="stat-value">${s.closed}</div><div class="stat-label">Sudah Close</div></div>
      <div class="stat-card request"><div class="stat-value">${s.requestClose}</div><div class="stat-label">Menunggu Approval Close</div></div>
      <div class="stat-card progres"><div class="stat-value">${s.avgProgres}<span style="font-size:20px;font-weight:500">%</span></div><div class="stat-label">Rata-rata Progres</div></div>
    </div>
    <div class="section-card">
      <div class="section-header"><div>
        <div class="section-title">Tingkat Penyelesaian Keseluruhan</div>
        <div class="section-subtitle">${s.closed} dari ${s.total} rekomendasi telah di-close</div>
      </div></div>
      <div style="padding:24px 28px"><div style="display:flex;align-items:center;gap:16px">
        <div class="progress-bar" style="height:14px;flex:1">
          <div class="progress-fill" style="width:${pct}%;background:linear-gradient(90deg,var(--green),#4ade80)"></div>
        </div>
        <div style="font-size:22px;font-weight:800;color:var(--green);font-family:'JetBrains Mono',monospace">${pct}%</div>
      </div></div>
    </div>
    <div style="display:grid;grid-template-columns:${isAdmin ? '1fr 1fr' : '1fr'};gap:16px">
      <div class="section-card" style="margin-bottom:0">
        <div class="section-header"><div>
          <div class="section-title">${distTitle}</div>
          <div class="section-subtitle">Berdasarkan jumlah rekomendasi</div>
        </div></div>
        <div class="table-wrap"><table>
          <thead><tr><th>${distColHd}</th><th>Jml Rekomendasi</th><th style="min-width:150px">Proporsi</th></tr></thead>
          <tbody>${distRows || '<tr><td colspan="3"><div class="empty">Tidak ada data</div></td></tr>'}</tbody>
        </table></div>
      </div>
      ${dirDetailCard}
    </div>
  `);
}

// ═══════════════════════════════════════════════════════════
// DATA TABLE
// ═══════════════════════════════════════════════════════════
function renderDataTable(filter, statusFilter, requestFilter) {
  filter        = filter        !== undefined ? filter        : (document.getElementById('searchInput')   || {}).value || '';
  statusFilter  = statusFilter  !== undefined ? statusFilter  : (document.getElementById('statusFilter')  || {}).value || '';
  requestFilter = requestFilter !== undefined ? requestFilter : (document.getElementById('requestFilter') || {}).value || '';

  const isAdmin = currentUser.role === 'Admin';
  filteredRows = allRows.filter(r => {
    const q     = filter.toLowerCase();
    const match = !q || ['Judul Audit','Rekomendasi','Divisi','Departemen','Kode Direktorat','Temuan Pemeriksaan']
      .some(k => String(r[k] || '').toLowerCase().includes(q));
    const st = !statusFilter  || String(r['Status']        || '') === statusFilter;
    const rc = !requestFilter || String(r['Request Close'] || '') === requestFilter;
    return match && st && rc;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  const pageRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const rowsHtml = pageRows.length === 0
    ? '<tr><td colspan="13"><div class="empty"><div class="empty-icon">🔍</div><p>Tidak ada data ditemukan</p></div></td></tr>'
    : pageRows.map(r => {
        const status    = String(r['Status']        || '').trim();
        const rc        = String(r['Request Close'] || 'Belum').trim();
        const prog      = parseFloat(r['Progres%']) || 0;
        const due       = r['Due Date'] ? new Date(r['Due Date']) : null;
        const isOverdue = due && !isNaN(due) && status !== 'Close' && due < new Date();
        const ri        = r._rowIndex;
        const trClass   = !isAdmin ? ' class="clickable-row"' : '';
        const trClick   = !isAdmin ? ` onclick="openDetail(${ri})" style="cursor:pointer" title="Klik baris untuk lihat detail"` : '';

        return `<tr${trClass}${trClick}>
          <td><span class="mono">${escHtml(String(r['No'] || ''))}</span></td>
          <td><span class="mono">${fmtDate(r['Tanggal Laporan'])}</span></td>
          <td><span class="tag">${escHtml(r['Jenis Pemeriksaan'] || '')}</span></td>
          <td><div class="cell-text">${escHtml(r['Judul Audit'] || '')}</div></td>
          <td><div class="cell-text" style="font-size:12px">${escHtml(r['Rekomendasi'] || '')}</div></td>
          <td><div class="cell-text" style="font-size:12px;color:var(--muted)">${escHtml(r['Tindak Lanjut'] || '-')}</div></td>
          <td>
            <div style="font-size:11px;font-family:'JetBrains Mono',monospace;${isOverdue ? 'color:var(--red);font-weight:700' : ''}">${fmtDate(r['Due Date'])}</div>
            ${isOverdue ? '<div style="font-size:10px;color:var(--red);font-weight:700">⚠ OVERDUE</div>' : ''}
          </td>
          <td>${escHtml(r['Divisi'] || '')}<br><span style="font-size:11px;color:var(--muted)">${escHtml(r['Departemen'] || '')}</span></td>
          <td><div class="progress-wrap" style="min-width:90px">
            <div class="progress-bar"><div class="progress-fill" style="width:${prog}%"></div></div>
            <span class="progress-val">${prog}%</span>
          </div></td>
          <td><span class="badge ${rc === 'Ya' ? 'badge-ya' : 'badge-belum'}">${escHtml(rc)}</span></td>
          <td><span class="badge ${status === 'Close' ? 'badge-close' : 'badge-open'}">${escHtml(status || 'Open')}</span></td>
          <td><span class="mono" style="font-size:11px">${r['Tanggal Close'] ? fmtDate(r['Tanggal Close']) : '-'}</span></td>
          <td><div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openDetail(${ri})">🔍</button>
            ${isAdmin
              ? `<button class="btn btn-primary btn-sm" onclick="openAdminEdit(${ri})">✏️</button>
                 ${rc === 'Ya' && status !== 'Close' ? `<button class="btn btn-success btn-sm" onclick="approveClose(${ri})">✓ Close</button>` : ''}
                 <button class="btn btn-danger btn-sm" onclick="deleteRowConfirm(${ri})">🗑</button>`
              : `<button class="btn btn-accent btn-sm" onclick="event.stopPropagation();openPICEdit(${ri})">Update</button>`
            }
          </div></td>
        </tr>`;
      }).join('');

  const pagCtrl = totalPages <= 1 ? '' : `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 24px;border-top:1px solid var(--border);background:var(--light)">
      <span style="font-size:12px;color:var(--muted)">
        Menampilkan ${((currentPage - 1) * PAGE_SIZE) + 1}–${Math.min(currentPage * PAGE_SIZE, filteredRows.length)} dari ${filteredRows.length} data
      </span>
      <div style="display:flex;gap:6px;align-items:center">
        <button class="btn btn-ghost btn-sm" onclick="gotoPage(1)" ${currentPage===1?'disabled':''}>«</button>
        <button class="btn btn-ghost btn-sm" onclick="gotoPage(${currentPage - 1})" ${currentPage===1?'disabled':''}>‹</button>
        <span style="font-size:13px;font-weight:700;padding:0 8px">${currentPage} / ${totalPages}</span>
        <button class="btn btn-ghost btn-sm" onclick="gotoPage(${currentPage + 1})" ${currentPage===totalPages?'disabled':''}>›</button>
        <button class="btn btn-ghost btn-sm" onclick="gotoPage(${totalPages})" ${currentPage===totalPages?'disabled':''}>»</button>
      </div>
    </div>`;

  showMain(`
    <div class="section-card">
      <div class="section-header">
        <div>
          <div class="section-title">${isAdmin ? 'Semua Data Temuan' : 'Data Temuan Divisi ' + escHtml(currentUser.divisi)}</div>
          <div class="section-subtitle">${filteredRows.length} rekomendasi${filter || statusFilter || requestFilter ? ' (hasil filter)' : ''}${!isAdmin ? ' — <span style="color:var(--accent);font-weight:700">💡 Klik baris untuk lihat detail</span>' : ''}</div>
        </div>
        <div class="toolbar">
          <input class="search-input" type="text" placeholder="🔍 Cari judul, rekomendasi, divisi..." id="searchInput"
            value="${escHtml(filter)}" oninput="applyFilter()"/>
          <select id="statusFilter" onchange="applyFilter()">
            <option value="">Semua Status</option>
            <option value="Open"  ${statusFilter === 'Open'  ? 'selected' : ''}>Open</option>
            <option value="Close" ${statusFilter === 'Close' ? 'selected' : ''}>Close</option>
          </select>
          <select id="requestFilter" onchange="applyFilter()">
            <option value="">Semua Request Close</option>
            <option value="Ya"    ${requestFilter === 'Ya'    ? 'selected' : ''}>Request Close: Ya</option>
            <option value="Belum" ${requestFilter === 'Belum' ? 'selected' : ''}>Request Close: Belum</option>
          </select>
          ${isAdmin
            ? `<button class="btn btn-primary" onclick="openAddRow()">✏️ Input Temuan Baru</button>
               <button class="btn btn-ghost" onclick="openUpload()">⬆ Upload CSV</button>`
            : ''}
        </div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>No</th><th>Tgl Laporan</th><th>Jenis</th>
          <th style="min-width:160px">Judul Audit</th>
          <th style="min-width:200px">Rekomendasi</th>
          <th style="min-width:160px">Tindak Lanjut</th>
          <th>Due Date</th><th>Divisi / Dept</th>
          <th style="min-width:110px">Progres%</th>
          <th>Req. Close</th><th>Status</th>
          <th>Tgl Close</th><th style="min-width:140px">Aksi</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table></div>
      ${pagCtrl}
    </div>
  `);
}

function gotoPage(p) {
  currentPage = p;
  renderDataTable();
  document.querySelector('.table-wrap')?.scrollTo(0, 0);
}

function applyFilter() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { currentPage = 1; renderDataTable(); }, 300);
}

// ═══════════════════════════════════════════════════════════
// REQUEST CLOSE (Admin)
// ═══════════════════════════════════════════════════════════
function renderRequestClose() {
  const pending = allRows.filter(r =>
    String(r['Request Close'] || '').trim() === 'Ya' &&
    String(r['Status']        || '').trim() !== 'Close'
  );

  const rowsHtml = pending.length === 0
    ? '<tr><td colspan="8"><div class="empty"><div class="empty-icon">✅</div><p>Tidak ada request close yang menunggu persetujuan</p></div></td></tr>'
    : pending.map(r => `
        <tr>
          <td><span class="mono">${escHtml(String(r['No']))}</span></td>
          <td>${escHtml(r['Judul Audit'] || '')}</td>
          <td style="font-size:12px">${escHtml(r['Rekomendasi'] || '')}</td>
          <td>${escHtml(r['Divisi'] || '')}</td>
          <td>${escHtml(r['Departemen'] || '')}</td>
          <td><div class="progress-wrap">
            <div class="progress-bar"><div class="progress-fill" style="width:${r['Progres%'] || 0}%"></div></div>
            <span class="progress-val">${r['Progres%'] || 0}%</span>
          </div></td>
          <td style="font-size:12px;color:var(--muted)">${escHtml(r['Tindak Lanjut'] || '-')}</td>
          <td><div style="display:flex;gap:6px">
            <button class="btn btn-success btn-sm" onclick="approveClose(${r._rowIndex})">✓ Approve Close</button>
            <button class="btn btn-ghost btn-sm"   onclick="rejectClose(${r._rowIndex})">✕ Tolak</button>
          </div></td>
        </tr>`
      ).join('');

  showMain(`
    <div class="section-card">
      <div class="section-header"><div>
        <div class="section-title">🔔 Request Close Menunggu Persetujuan</div>
        <div class="section-subtitle">${pending.length} rekomendasi menunggu review admin</div>
      </div></div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>No</th><th>Judul Audit</th><th style="min-width:200px">Rekomendasi</th>
          <th>Divisi</th><th>Departemen</th><th style="min-width:110px">Progres%</th>
          <th style="min-width:160px">Tindak Lanjut</th><th style="min-width:200px">Aksi</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table></div>
    </div>
  `);
}

async function approveClose(rowIndex) {
  if (!confirm('Approve dan ubah status menjadi CLOSE?')) return;
  try {
    const res = await api('PATCH', `/api/data/${rowIndex}/status`, { status: 'Close' });
    if (res.success) { toast('Status berhasil di-close!', 'success'); refreshData(() => switchTab(activeTab)); }
    else toast(res.message || 'Gagal approve close.', 'error');
  } catch (e) { toast('Error: ' + e.message, 'error'); }
}

async function rejectClose(rowIndex) {
  if (!confirm('Tolak request close ini?')) return;
  try {
    const res = await api('PATCH', `/api/data/${rowIndex}/reject-close`);
    if (res.success) { toast('Request close ditolak.', 'info'); refreshData(() => switchTab(activeTab)); }
    else toast(res.message || 'Gagal menolak.', 'error');
  } catch (e) { toast('Error: ' + e.message, 'error'); }
}

// ═══════════════════════════════════════════════════════════
// PIC EDIT MODAL
// ═══════════════════════════════════════════════════════════
function openPICEdit(rowIndex) {
  const row = allRows.find(r => r._rowIndex === rowIndex);
  if (!row) { toast('Data tidak ditemukan.', 'error'); return; }

  editRowIndex = rowIndex;
  document.getElementById('picModalSubtitle').textContent = `${row['Divisi'] || ''} — ${row['Departemen'] || ''}`;
  document.getElementById('picRekDisplay').textContent    = row['Rekomendasi'] || '-';
  document.getElementById('picProgres').value             = row['Progres%'] || 0;
  document.getElementById('picRequestClose').value        = row['Request Close'] || 'Belum';
  document.getElementById('picTL').value                  = row['Tindak Lanjut'] || '';
  document.getElementById('picTanggapan').value           = row['Tanggapan Auditee'] || '';
  document.getElementById('picLinkEvidence').value        = row['Link Evidence'] || '';
  document.getElementById('evidenceError').style.display  = 'none';
  onRequestCloseChange();
  openModal('modalPIC');
}

function onRequestCloseChange() {
  const rc    = document.getElementById('picRequestClose').value;
  const panel = document.getElementById('evidencePanel');
  if (rc === 'Ya') panel.classList.add('show');
  else { panel.classList.remove('show'); document.getElementById('evidenceError').style.display = 'none'; }
}

function validateEvidenceInput() {
  const val = document.getElementById('picLinkEvidence').value.trim();
  document.getElementById('evidenceError').style.display = val ? 'none' : 'block';
}

function savePIC() {
  const prog = parseInt(document.getElementById('picProgres').value) || 0;
  const rc   = document.getElementById('picRequestClose').value;
  const ev   = document.getElementById('picLinkEvidence').value.trim();

  if (prog < 0 || prog > 100) { toast('Progres harus antara 0–100', 'error'); return; }

  if (rc === 'Ya' && !ev) {
    document.getElementById('evidenceError').style.display = 'block';
    document.getElementById('picLinkEvidence').focus();
    toast('Link evidence wajib diisi saat mengajukan Request Close.', 'error');
    return;
  }

  const row = allRows.find(r => r._rowIndex === editRowIndex);
  if (!row) { toast('Data tidak ditemukan di cache. Silakan refresh.', 'error'); return; }

  if (rc === 'Ya') {
    const rekShort = String(row['Rekomendasi'] || '').substring(0, 120) + (String(row['Rekomendasi'] || '').length > 120 ? '...' : '');
    document.getElementById('rcConfirmDetail').innerHTML = `
      <div class="row"><span class="lbl">Judul Audit</span><span class="val">${escHtml(row['Judul Audit'] || '-')}</span></div>
      <div class="row"><span class="lbl">Rekomendasi</span><span class="val">${escHtml(rekShort)}</span></div>
      <div class="row"><span class="lbl">Divisi</span><span class="val">${escHtml(row['Divisi'] || '-')}</span></div>
      <div class="row"><span class="lbl">Progres</span><span class="val"><strong style="color:${prog === 100 ? 'var(--green)' : 'var(--yellow)'}">${prog}%</strong>${prog < 100 ? ' <span style="font-size:11px;color:var(--muted)">(belum 100%)</span>' : ''}</span></div>
      <div class="row"><span class="lbl">Link Evidence</span><span class="val"><a href="${escHtml(ev)}" target="_blank" style="color:var(--navy2);word-break:break-all">${escHtml(ev)}</a></span></div>`;
    openModal('modalConfirmRC');
    return;
  }

  doSavePIC();
}

async function doSavePIC() {
  const prog = parseInt(document.getElementById('picProgres').value) || 0;
  const rc   = document.getElementById('picRequestClose').value;
  const tl   = document.getElementById('picTL').value;
  const tg   = document.getElementById('picTanggapan').value;
  const ev   = document.getElementById('picLinkEvidence').value.trim();

  const row = allRows.find(r => r._rowIndex === editRowIndex);
  if (!row) { toast('Data tidak ditemukan.', 'error'); return; }

  const updated = Object.assign({}, row, {
    'Progres%'         : prog,
    'Request Close'    : rc,
    'Tindak Lanjut'    : tl,
    'Tanggapan Auditee': tg,
    'Link Evidence'    : ev,
  });

  closeModal('modalConfirmRC');

  const btn = document.getElementById('btnSavePIC');
  btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
  btn.disabled  = true;

  try {
    const res = await api('PUT', `/api/data/${editRowIndex}`, { updatedData: updated });
    if (res.success) {
      closeModal('modalPIC');
      toast(rc === 'Ya' ? 'Request Close berhasil diajukan! Menunggu review Admin.' : 'Data berhasil diperbarui!', 'success');
      refreshData(() => switchTab(activeTab));
    } else {
      toast(res.message || 'Gagal menyimpan.', 'error');
    }
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  } finally {
    btn.innerHTML = '💾 Simpan';
    btn.disabled  = false;
  }
}

// ═══════════════════════════════════════════════════════════
// ADMIN EDIT / INPUT TEMUAN BARU
// ═══════════════════════════════════════════════════════════
const ADMIN_COLS = [
  'Tanggal Laporan','Jenis Pemeriksaan','Kategori Pemeriksaan','Judul Audit',
  'Temuan Pemeriksaan','Rekomendasi','Tindak Lanjut','Due Date','Tanggapan Auditee',
  'Status','Kode Direktorat','Divisi','Departemen','Request Close','Progres%','Link Evidence','Tanggal Close',
];

function buildAdminFormFields(row) {
  const fields = ADMIN_COLS.map(c => {
    const val = row && row[c] !== undefined ? row[c] : '';
    if (c === 'Status')
      return `<div class="form-col"><label>${c}</label><select id="ae_${c}">
        <option value="Open"  ${!row || val === 'Open'  ? 'selected' : ''}>Open</option>
        <option value="Close" ${val === 'Close' ? 'selected' : ''}>Close</option>
      </select></div>`;
    if (c === 'Request Close')
      return `<div class="form-col"><label>${c}</label><select id="ae_${c}">
        <option value="Belum" ${!row || val === 'Belum' ? 'selected' : ''}>Belum</option>
        <option value="Ya"    ${val === 'Ya' ? 'selected' : ''}>Ya</option>
      </select></div>`;
    if (['Temuan Pemeriksaan','Rekomendasi','Tindak Lanjut','Tanggapan Auditee'].includes(c))
      return `<div class="form-col full"><label>${c}${c === 'Rekomendasi' || c === 'Temuan Pemeriksaan' ? ' <span style="color:var(--red)">*</span>' : ''}</label>
        <textarea id="ae_${c}" rows="3">${escHtml(String(val))}</textarea></div>`;
    if (c === 'Progres%')
      return `<div class="form-col"><label>${c}</label>
        <input type="number" id="ae_${c}" min="0" max="100" value="${escHtml(String(val || 0))}"/></div>`;
    if (['Tanggal Laporan','Due Date','Tanggal Close'].includes(c))
      return `<div class="form-col"><label>${c}</label>
        <input type="date" id="ae_${c}" value="${fmtDateInput(val)}"/></div>`;
    if (c === 'Link Evidence')
      return `<div class="form-col full"><label>${c}</label>
        <input type="text" id="ae_${c}" placeholder="https://drive.google.com/..." value="${escHtml(String(val))}"/></div>`;
    if (c === 'Judul Audit')
      return `<div class="form-col full"><label>${c} <span style="color:var(--red)">*</span></label>
        <input type="text" id="ae_${c}" value="${escHtml(String(val))}"/></div>`;
    return `<div class="form-col"><label>${c}</label>
      <input type="text" id="ae_${c}" value="${escHtml(String(val))}"/></div>`;
  });
  return `<div class="form-row">${fields.join('')}</div>`;
}

function getAdminFormValues() {
  const obj = {};
  ADMIN_COLS.forEach(c => {
    const el = document.getElementById(`ae_${c}`);
    if (el) obj[c] = el.value;
  });
  return obj;
}

function openAdminEdit(rowIndex) {
  const row = allRows.find(r => r._rowIndex === rowIndex);
  if (!row) { toast('Data tidak ditemukan.', 'error'); return; }
  editRowIndex = rowIndex;
  document.getElementById('adminModalTitle').textContent = 'Edit Data Temuan';
  document.getElementById('adminEditBody').innerHTML = buildAdminFormFields(row);
  openModal('modalAdmin');
}

function openAddRow() {
  editRowIndex = null;
  document.getElementById('adminModalTitle').textContent = '✏️ Input Temuan Baru';
  document.getElementById('adminEditBody').innerHTML = buildAdminFormFields(null);
  const todayEl = document.getElementById('ae_Tanggal Laporan');
  if (todayEl) todayEl.value = new Date().toISOString().split('T')[0];
  openModal('modalAdmin');
}

async function saveAdminEdit() {
  const btn = document.getElementById('btnSaveAdmin');
  btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
  btn.disabled  = true;

  try {
    if (editRowIndex === null) {
      // Mode tambah baru
      const vals = getAdminFormValues();
      if (!vals['Judul Audit'] || !vals['Rekomendasi']) {
        toast('Judul Audit dan Rekomendasi wajib diisi.', 'error');
        return;
      }
      const res = await api('POST', '/api/data', { rows: [vals] });
      if (res.success) {
        closeModal('modalAdmin');
        toast('Temuan baru berhasil ditambahkan!', 'success');
        refreshData(() => switchTab('data'));
      } else {
        toast(res.message || 'Gagal menyimpan.', 'error');
      }
    } else {
      // Mode edit
      const row = allRows.find(r => r._rowIndex === editRowIndex);
      if (!row) { toast('Data tidak ditemukan.', 'error'); return; }
      const updated = Object.assign({}, row, getAdminFormValues());
      const res = await api('PUT', `/api/data/${editRowIndex}`, { updatedData: updated });
      if (res.success) {
        closeModal('modalAdmin');
        toast('Data berhasil diperbarui!', 'success');
        refreshData(() => switchTab(activeTab));
      } else {
        toast(res.message || 'Gagal menyimpan.', 'error');
      }
    }
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  } finally {
    btn.innerHTML = '💾 Simpan';
    btn.disabled  = false;
  }
}

// ═══════════════════════════════════════════════════════════
// DETAIL MODAL
// ═══════════════════════════════════════════════════════════
function openDetail(rowIndex) {
  const row = allRows.find(r => r._rowIndex === rowIndex);
  if (!row) { toast('Data tidak ditemukan.', 'error'); return; }

  const fields = [
    ['No', row['No']],
    ['Tanggal Laporan', fmtDate(row['Tanggal Laporan'])],
    ['Jenis Pemeriksaan', row['Jenis Pemeriksaan']],
    ['Kategori Pemeriksaan', row['Kategori Pemeriksaan']],
    ['Judul Audit', row['Judul Audit']],
    ['Kode Direktorat', row['Kode Direktorat']],
    ['Divisi', row['Divisi']],
    ['Departemen', row['Departemen']],
    ['Due Date', fmtDate(row['Due Date'])],
    ['Status', `<span class="badge ${row['Status'] === 'Close' ? 'badge-close' : 'badge-open'}">${escHtml(row['Status'] || 'Open')}</span>`],
    ['Temuan Pemeriksaan', row['Temuan Pemeriksaan']],
    ['Rekomendasi', row['Rekomendasi']],
    ['Tindak Lanjut', row['Tindak Lanjut'] || '-'],
    ['Tanggapan Auditee', row['Tanggapan Auditee'] || '-'],
    ['Progres%', `<div class="progress-wrap"><div class="progress-bar"><div class="progress-fill" style="width:${row['Progres%'] || 0}%"></div></div><span class="progress-val">${row['Progres%'] || 0}%</span></div>`],
    ['Request Close', `<span class="badge ${row['Request Close'] === 'Ya' ? 'badge-ya' : 'badge-belum'}">${escHtml(row['Request Close'] || 'Belum')}</span>`],
    ['Link Evidence', row['Link Evidence']
      ? `<a href="${escHtml(row['Link Evidence'])}" target="_blank" style="color:var(--navy2);text-decoration:underline;word-break:break-all">📎 ${escHtml(row['Link Evidence'])}</a>`
      : '<span style="color:var(--muted)">Belum dilampirkan</span>'],
    ['Tanggal Close', row['Tanggal Close']
      ? `<span style="font-weight:700;color:var(--green)">${fmtDate(row['Tanggal Close'])}</span>`
      : '<span style="color:var(--muted)">Belum ditutup</span>'],
  ];

  document.getElementById('detailBody').innerHTML = fields.map(f =>
    `<div style="display:grid;grid-template-columns:160px 1fr;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;padding-top:2px">${f[0]}</div>
      <div style="font-size:13px;line-height:1.6">${f[1] || '-'}</div>
    </div>`
  ).join('');

  openModal('modalDetail');
}

// ═══════════════════════════════════════════════════════════
// DELETE ROW
// ═══════════════════════════════════════════════════════════
function deleteRowConfirm(rowIndex) {
  const row = allRows.find(r => r._rowIndex === rowIndex);
  if (!row) { toast('Data tidak ditemukan.', 'error'); return; }

  pendingDeleteRowIndex = rowIndex;
  const rekShort = String(row['Rekomendasi'] || '').substring(0, 120) + (String(row['Rekomendasi'] || '').length > 120 ? '...' : '');

  document.getElementById('deleteConfirmDetail').innerHTML = `
    <div class="row"><span class="lbl">No</span><span class="val"><strong>${escHtml(String(row['No'] || '-'))}</strong></span></div>
    <div class="row"><span class="lbl">Judul Audit</span><span class="val">${escHtml(row['Judul Audit'] || '-')}</span></div>
    <div class="row"><span class="lbl">Rekomendasi</span><span class="val">${escHtml(rekShort)}</span></div>
    <div class="row"><span class="lbl">Divisi</span><span class="val">${escHtml(row['Divisi'] || '-')}</span></div>
    <div class="row"><span class="lbl">Status</span><span class="val"><span class="badge ${row['Status'] === 'Close' ? 'badge-close' : 'badge-open'}">${escHtml(row['Status'] || 'Open')}</span></span></div>`;

  const inp = document.getElementById('deleteConfirmInput');
  inp.value = ''; inp.className = '';
  document.getElementById('btnConfirmDelete').disabled = true;
  openModal('modalConfirmDelete');
}

function onDeleteTypeInput() {
  const val = document.getElementById('deleteConfirmInput').value;
  const btn = document.getElementById('btnConfirmDelete');
  if (val === 'HAPUS') {
    document.getElementById('deleteConfirmInput').classList.add('valid');
    btn.disabled = false;
  } else {
    document.getElementById('deleteConfirmInput').classList.remove('valid');
    btn.disabled = true;
  }
}

async function executeDelete() {
  if (!pendingDeleteRowIndex) { toast('Tidak ada data untuk dihapus.', 'error'); return; }

  const btn = document.getElementById('btnConfirmDelete');
  btn.innerHTML = '<span class="spinner"></span> Menghapus...';
  btn.disabled  = true;

  try {
    const res = await api('DELETE', `/api/data/${pendingDeleteRowIndex}`);
    if (res.success) {
      closeModal('modalConfirmDelete');
      pendingDeleteRowIndex = null;
      toast('Data berhasil dihapus!', 'success');
      refreshData(() => switchTab(activeTab));
    } else {
      toast(res.message || 'Gagal menghapus.', 'error');
    }
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  } finally {
    btn.innerHTML = '🗑 Hapus Permanen';
    btn.disabled  = false;
  }
}

// ═══════════════════════════════════════════════════════════
// UPLOAD CSV
// ═══════════════════════════════════════════════════════════
const UPLOAD_COLS = [
  'Tanggal Laporan','Jenis Pemeriksaan','Kategori Pemeriksaan','Judul Audit',
  'Temuan Pemeriksaan','Rekomendasi','Tindak Lanjut','Due Date','Tanggapan Auditee',
  'Status','Kode Direktorat','Divisi','Departemen','Link Evidence',
];

function openUpload() { openModal('modalUpload'); }

function downloadTemplate() {
  const blob = new Blob([UPLOAD_COLS.join(',') + '\n'], { type: 'text/csv' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'template_upload_audit.csv';
  a.click();
}

function handleFileUpload(input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload  = e => { document.getElementById('csvPaste').value = e.target.result; };
  reader.onerror = () => { toast('Gagal membaca file.', 'error'); };
  reader.readAsText(file);
}

function parseUpload() {
  const raw = document.getElementById('csvPaste').value.trim();
  if (!raw) { toast('Tidak ada data untuk di-parse', 'error'); return; }

  const lines = raw.split('\n').filter(l => l.trim());
  const delim = lines[0].includes('\t') ? '\t' : ',';
  const first = lines[0].split(delim).map(s => s.trim().replace(/^"|"$/g, ''));
  const isHdr = UPLOAD_COLS.some(c => first.includes(c));
  const dLines = isHdr ? lines.slice(1) : lines;

  pendingUploadRows = [];
  const errors = [];

  dLines.forEach((line, i) => {
    if (!line.trim()) return;
    const cells = line.split(delim).map(s => s.trim().replace(/^"|"$/g, ''));
    if (cells.length < 6) { errors.push(`Baris ${i + 1}: kolom kurang (min 6)`); return; }
    const row = {};
    UPLOAD_COLS.forEach((col, j) => { row[col] = cells[j] || ''; });
    row['Request Close'] = 'Belum';
    row['Progres%']      = 0;
    pendingUploadRows.push(row);
  });

  document.getElementById('uploadCount').textContent = pendingUploadRows.length;
  const preview = pendingUploadRows.slice(0, 5)
    .map(r => `• ${r['Tanggal Laporan'] || '-'} | ${r['Jenis Pemeriksaan'] || '-'} | ${String(r['Rekomendasi'] || '').substring(0, 60)}...`)
    .join('\n') + (pendingUploadRows.length > 5 ? `\n... dan ${pendingUploadRows.length - 5} baris lainnya` : '');

  document.getElementById('uploadPreviewContent').textContent = preview;
  document.getElementById('uploadPreview').style.display = 'block';

  if (errors.length) toast('Peringatan: ' + errors.slice(0, 3).join('; '), 'error');
  else toast(`${pendingUploadRows.length} baris siap diupload`, 'info');
}

async function confirmUpload() {
  if (!pendingUploadRows.length) { toast('Parse data terlebih dahulu', 'error'); return; }
  if (!confirm(`Upload ${pendingUploadRows.length} baris data baru?`)) return;

  const btn = document.getElementById('btnConfirmUpload');
  btn.innerHTML = '<span class="spinner"></span> Mengupload...';
  btn.disabled  = true;

  try {
    const res = await api('POST', '/api/data', { rows: pendingUploadRows });
    if (res.success) {
      closeModal('modalUpload');
      toast(`${res.added} baris berhasil diupload!`, 'success');
      document.getElementById('csvPaste').value = '';
      document.getElementById('uploadPreview').style.display = 'none';
      pendingUploadRows = [];
      refreshData(() => switchTab('data'));
    } else {
      toast(res.message || 'Gagal upload.', 'error');
    }
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  } finally {
    btn.innerHTML = '⬆ Upload Data';
    btn.disabled  = false;
  }
}

// ═══════════════════════════════════════════════════════════
// USER MANAGEMENT
// ═══════════════════════════════════════════════════════════
async function loadUsers() {
  showMain('<div class="loading">Memuat users</div>');
  try {
    const res = await api('GET', '/api/users');
    if (!res.success) { showErrorBox('Gagal memuat data user.', res.message); return; }
    renderUsers(res.users || []);
  } catch (e) { showErrorBox('Gagal memuat users.', e.message); }
}

function renderUsers(users) {
  const rows = users.map(u =>
    `<tr>
      <td><span class="mono">${escHtml(String(u['Username'] || ''))}</span></td>
      <td><span class="badge ${u['Role'] === 'Admin' ? 'badge-role-admin' : 'badge-role-pic'}">${escHtml(u['Role'] || '')}</span></td>
      <td>${escHtml(u['Divisi'] || '-')}</td>
      <td>${escHtml(u['Nama'] || '-')}</td>
      <td><div style="display:flex;gap:6px">
        <button class="btn btn-primary btn-sm" data-uname="${escAttr(String(u['Username'] || ''))}" onclick="openEditUser(this.dataset.uname)">✏️ Edit</button>
        <button class="btn btn-danger btn-sm"  data-uname="${escAttr(String(u['Username'] || ''))}" onclick="deleteUserConfirm(this.dataset.uname)">🗑</button>
      </div></td>
    </tr>`
  ).join('');

  showMain(`
    <div class="section-card">
      <div class="section-header">
        <div><div class="section-title">👤 Manajemen User</div>
        <div class="section-subtitle">${users.length} user terdaftar</div></div>
        <button class="btn btn-accent" onclick="openAddUser()">+ Tambah User</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Username</th><th>Role</th><th>Divisi</th><th>Nama</th><th>Aksi</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    </div>
  `);
}

function openAddUser() {
  editUserIndex = null;
  document.getElementById('userModalTitle').textContent = 'Tambah User';
  ['uUsername','uPassword','uDivisi','uNama'].forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('uRole').value = 'PIC';
  document.getElementById('uUsername').disabled = false;
  toggleDivisiField();
  openModal('modalUser');
}

async function openEditUser(username) {
  editUserIndex = username;
  try {
    const res = await api('GET', '/api/users');
    if (!res.success) { toast('Gagal mengambil data user: ' + res.message, 'error'); return; }
    const user = (res.users || []).find(u => u['Username'] === username);
    if (!user) { toast('User tidak ditemukan.', 'error'); return; }

    document.getElementById('userModalTitle').textContent    = 'Edit User';
    document.getElementById('uUsername').value               = user['Username'] || '';
    document.getElementById('uUsername').disabled            = true;
    document.getElementById('uPassword').value               = user['Password'] || '';
    document.getElementById('uRole').value                   = user['Role'] || 'PIC';
    document.getElementById('uDivisi').value                 = user['Divisi'] || '';
    document.getElementById('uNama').value                   = user['Nama'] || '';
    toggleDivisiField();
    openModal('modalUser');
  } catch (e) { toast('Error: ' + e.message, 'error'); }
}

function toggleDivisiField() {
  document.getElementById('divisiField').style.display =
    document.getElementById('uRole').value === 'PIC' ? 'flex' : 'none';
}

async function saveUser() {
  const username = document.getElementById('uUsername').value.trim();
  const password = document.getElementById('uPassword').value.trim();
  const role     = document.getElementById('uRole').value;
  const divisi   = document.getElementById('uDivisi').value.trim();
  const nama     = document.getElementById('uNama').value.trim();

  if (!password || !nama)          { toast('Password dan Nama harus diisi', 'error'); return; }
  if (role === 'PIC' && !divisi)   { toast('Divisi harus diisi untuk PIC', 'error'); return; }

  const btn = document.getElementById('btnSaveUser');
  btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
  btn.disabled  = true;

  try {
    let res;
    if (editUserIndex) {
      res = await api('PUT', `/api/users/${editUserIndex}`, { password, role, divisi, nama });
    } else {
      if (!username) { toast('Username harus diisi', 'error'); return; }
      res = await api('POST', '/api/users', { username, password, role, divisi, nama });
    }

    if (res.success) {
      closeModal('modalUser');
      toast('User berhasil disimpan!', 'success');
      loadUsers();
    } else {
      toast(res.message || 'Gagal menyimpan user.', 'error');
    }
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  } finally {
    btn.innerHTML = '💾 Simpan';
    btn.disabled  = false;
  }
}

async function deleteUserConfirm(username) {
  if (!confirm(`Hapus user "${username}"?`)) return;
  try {
    const res = await api('DELETE', `/api/users/${username}`);
    if (res.success) { toast('User dihapus!', 'success'); loadUsers(); }
    else toast(res.message || 'Gagal menghapus user.', 'error');
  } catch (e) { toast('Error: ' + e.message, 'error'); }
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
function showMain(html) { document.getElementById('mainContent').innerHTML = html; }
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.modal-overlay').forEach(el => {
  el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open'); });
});

function toast(msg, type = 'info') {
  const div  = document.createElement('div');
  div.className = `toast-item ${type}`;
  const icon = { success: '✓', error: '✕', info: 'ℹ' }[type] || '';
  div.innerHTML = `<span>${icon}</span><span>${escHtml(String(msg))}</span>`;
  document.getElementById('toast').appendChild(div);
  setTimeout(() => div.parentNode?.removeChild(div), 3500);
}

function fmtDate(val) {
  if (!val) return '-';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) { return String(val); }
}

function fmtDateInput(val) {
  if (!val) return '';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch (e) { return ''; }
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function escAttr(s) { return escHtml(s); }

// Keyboard shortcuts
document.getElementById('loginUser').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('loginPass').focus(); });
document.getElementById('loginPass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
