# 🚀 Monitoring Tindak Lanjut Audit — Vercel Deployment Guide

Panduan **lengkap step-by-step** untuk deploy aplikasi ke Vercel.

---

## 📁 Struktur Proyek

```
audit-monitoring-webapp/
├── public/
│   ├── index.html          ← UI utama (login + app)
│   └── js/
│       └── app.js          ← Frontend logic (fetch API)
│
├── server/
│   ├── index.js            ← Express entry point
│   ├── config/
│   │   └── sheets.js       ← Google Sheets auth config
│   ├── routes/
│   │   ├── auth.js         ← POST /api/auth/login
│   │   ├── data.js         ← CRUD /api/data
│   │   └── users.js        ← CRUD /api/users
│   └── services/
│       └── sheetsService.js ← Semua operasi Sheets API
│
├── .env.example            ← Template environment variables
├── .gitignore
├── package.json
├── vercel.json             ← Konfigurasi Vercel
└── README.md
```

---

## 📋 Prasyarat

- Node.js 18+ terinstall di komputer kamu
- Akun [Vercel](https://vercel.com) (gratis)
- Akun [Google Cloud Platform](https://console.cloud.google.com)
- Akun GitHub / GitLab / Bitbucket
- Spreadsheet Google Sheets yang sudah ada datanya

---

## 🗂️ LANGKAH 1 — Siapkan Google Sheets

### 1a. Buat struktur sheet

Spreadsheet kamu harus punya **2 sheet**:

**Sheet 1 — `Data`** (nama persis begitu, huruf kapital D):
```
No | Tanggal Laporan | Jenis Pemeriksaan | Kategori Pemeriksaan | Judul Audit |
Temuan Pemeriksaan | Rekomendasi | Tindak Lanjut | Due Date | Tanggapan Auditee |
Status | Kode Direktorat | Divisi | Departemen | Request Close | Progres% |
Link Evidence | Tanggal Close
```

**Sheet 2 — `Users`** (nama persis begitu):
```
Username | Password | Role | Divisi | Nama
```

> **Penting:** Baris pertama adalah header. Data mulai dari baris kedua.

### 1b. Tambah user awal di sheet Users

| Username | Password | Role  | Divisi | Nama         |
|----------|----------|-------|--------|--------------|
| admin    | admin123 | Admin |        | Administrator|
| pic_tiu  | pic123   | PIC   | TIU    | Staff TIU    |

> Ganti password setelah deploy!

---

## ☁️ LANGKAH 2 — Setup Google Cloud Service Account

Service Account adalah "robot" yang bisa baca/tulis spreadsheet tanpa login manual.

### 2a. Buat Project di Google Cloud

1. Buka [https://console.cloud.google.com](https://console.cloud.google.com)
2. Klik tombol **Select a project** → **New Project**
3. Isi nama project, contoh: `audit-monitoring`
4. Klik **Create**

### 2b. Aktifkan Google Sheets API

1. Di menu kiri → **APIs & Services** → **Library**
2. Search: `Google Sheets API`
3. Klik → **Enable**

### 2c. Buat Service Account

1. Di menu kiri → **APIs & Services** → **Credentials**
2. Klik **+ Create Credentials** → **Service Account**
3. Isi **Service account name**: `audit-monitoring-sa`
4. Klik **Create and Continue** → **Done**

### 2d. Download JSON Key

1. Di halaman Credentials, klik service account yang baru dibuat
2. Masuk ke tab **Keys**
3. Klik **Add Key** → **Create new key** → pilih **JSON**
4. File JSON akan otomatis didownload — **simpan dengan aman, jangan di-commit ke Git!**

File JSON kira-kira isinya seperti ini:
```json
{
  "type": "service_account",
  "project_id": "audit-monitoring",
  "client_email": "audit-monitoring-sa@audit-monitoring.iam.gserviceaccount.com",
  "private_key": "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQ...\n-----END RSA PRIVATE KEY-----\n",
  ...
}
```

Nilai yang kamu butuhkan: `client_email` dan `private_key`.

### 2e. Bagikan Spreadsheet ke Service Account

1. Buka spreadsheet kamu di Google Sheets
2. Klik tombol **Share** (pojok kanan atas)
3. Di kolom "Add people", paste `client_email` dari file JSON tadi
4. Set permission: **Editor**
5. Klik **Send** (atau **Share**)

> Ini penting! Tanpa ini, server tidak bisa baca/tulis spreadsheet.

---

## 💻 LANGKAH 3 — Setup Project Lokal

```bash
# Clone atau copy folder project
cd audit-monitoring-webapp

# Install dependencies
npm install

# Buat file .env dari template
cp .env.example .env
```

### Edit file `.env`

Buka file `.env` dan isi dengan nilai yang benar:

```env
GOOGLE_SHEETS_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
# ↑ Ambil dari URL spreadsheet:
# https://docs.google.com/spreadsheets/d/AMBIL_INI/edit

GOOGLE_CLIENT_EMAIL=audit-monitoring-sa@audit-monitoring.iam.gserviceaccount.com
# ↑ Dari file JSON yang didownload

GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----\n"
# ↑ Dari file JSON, ganti newline dengan \n
# JANGAN hapus tanda kutip ganda di awal dan akhir!

JWT_SECRET=ini_harus_random_string_panjang_min_32_karakter_ubah_ini
# Generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

PORT=3000
NODE_ENV=development
```

### ⚠️ Cara benar format GOOGLE_PRIVATE_KEY

Private key di file JSON tampak seperti:
```
"-----BEGIN RSA PRIVATE KEY-----\nABCDEF...\n-----END RSA PRIVATE KEY-----\n"
```

Di `.env`, salin persis isi value-nya (termasuk `\n`), bungkus dengan double quote:
```
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nABCDEF...\n-----END RSA PRIVATE KEY-----\n"
```

### Test lokal

```bash
npm run dev
# Buka http://localhost:3000
```

Jika berhasil, terminal akan menampilkan:
```
╔══════════════════════════════════════════════╗
║  🚀 Audit Monitoring Server Running           ║
║  ➜ Local:   http://localhost:3000             ║
╚══════════════════════════════════════════════╝
```

---

## 🐙 LANGKAH 4 — Push ke GitHub

```bash
# Inisialisasi Git (jika belum)
git init

# Pastikan .gitignore sudah benar (file .env tidak akan ikut!)
git status

# Add semua file
git add .

# Commit
git commit -m "Initial commit: Audit Monitoring Webapp"

# Buat repo baru di GitHub (github.com/new)
# Lalu push:
git remote add origin https://github.com/USERNAME/audit-monitoring-webapp.git
git branch -M main
git push -u origin main
```

> **CHECKLIST sebelum push:**
> - [ ] File `.env` **tidak ada** di list `git status`
> - [ ] File `.gitignore` sudah ada dan berisi `.env`

---

## 🚀 LANGKAH 5 — Deploy ke Vercel

### 5a. Connect ke Vercel

1. Buka [https://vercel.com](https://vercel.com) → Login
2. Klik **Add New...** → **Project**
3. Klik **Import** di sebelah repo `audit-monitoring-webapp`
4. Di bagian **Framework Preset** → pilih **Other**
5. **Jangan klik Deploy dulu!** Kita perlu set environment variables dulu.

### 5b. Set Environment Variables di Vercel

Di halaman project setup, scroll ke bawah ke bagian **Environment Variables**.

Tambahkan satu per satu:

| Key | Value |
|-----|-------|
| `GOOGLE_SHEETS_ID` | ID spreadsheet kamu |
| `GOOGLE_CLIENT_EMAIL` | client_email dari JSON |
| `GOOGLE_PRIVATE_KEY` | private_key dari JSON (dengan `\n`, tanpa tanda kutip) |
| `JWT_SECRET` | Random string panjang |
| `NODE_ENV` | `production` |

> **Catatan untuk `GOOGLE_PRIVATE_KEY` di Vercel:**
> Paste langsung isi private key, Vercel secara otomatis handle newline.
> Atau tetap pakai format `\n`.

### 5c. Deploy!

Klik **Deploy** dan tunggu sekitar 1–2 menit.

Setelah selesai, kamu akan mendapat URL seperti:
`https://audit-monitoring-webapp.vercel.app`

---

## 🔄 LANGKAH 6 — Update & Redeploy

Setiap kali kamu push ke branch `main`, Vercel akan otomatis redeploy:

```bash
# Edit kode...
git add .
git commit -m "Fix: perbaiki tampilan dashboard"
git push origin main
# ← Vercel langsung deploy otomatis!
```

---

## 🛠️ Troubleshooting

### ❌ Error: "Sheet bernama 'Data' tidak ditemukan"
→ Pastikan nama sheet di Spreadsheet persis `Data` (huruf kapital D).

### ❌ Error: "The caller does not have permission"
→ Kamu lupa share spreadsheet ke `client_email`. Ulangi Langkah 2e.

### ❌ Error: "invalid_grant" atau "Could not load the default credentials"
→ `GOOGLE_PRIVATE_KEY` format salah. Pastikan `\n` bukan literal newline.

### ❌ Login selalu gagal dengan "Username atau password salah"
→ Cek sheet `Users` — pastikan nama sheet persis `Users` dan ada data di baris kedua.

### ❌ Vercel deploy gagal dengan "Cannot find module"
→ Jalankan `npm install` lokal, commit `package.json` dan `package-lock.json`.

### ❌ Private key error di Vercel
Coba format alternatif di Vercel env vars:
1. Buka file JSON
2. Copy seluruh value `private_key` (termasuk `-----BEGIN...-----`)
3. Di Vercel, paste tanpa modifikasi apapun

---

## 🔐 Keamanan Production

1. **Ganti semua password default** di sheet Users
2. **JWT_SECRET** harus random dan panjang:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
3. **Jangan expose spreadsheet ID** ke publik
4. Set `ALLOWED_ORIGIN` di env vars ke domain Vercel kamu:
   ```
   ALLOWED_ORIGIN=https://audit-monitoring-webapp.vercel.app
   ```

---

## 📡 API Endpoints

| Method | Endpoint | Auth | Deskripsi |
|--------|----------|------|-----------|
| POST | `/api/auth/login` | ❌ | Login, return JWT token |
| GET | `/api/auth/me` | ✅ | Validasi token |
| GET | `/api/data` | ✅ | Ambil semua data (filter by role) |
| POST | `/api/data` | ✅ Admin | Tambah baris baru |
| PUT | `/api/data/:rowIndex` | ✅ | Update baris |
| PATCH | `/api/data/:rowIndex/status` | ✅ Admin | Approve close |
| PATCH | `/api/data/:rowIndex/reject-close` | ✅ Admin | Tolak request close |
| DELETE | `/api/data/:rowIndex` | ✅ Admin | Hapus baris |
| GET | `/api/users` | ✅ Admin | List semua user |
| POST | `/api/users` | ✅ Admin | Tambah user |
| PUT | `/api/users/:username` | ✅ Admin | Update user |
| DELETE | `/api/users/:username` | ✅ Admin | Hapus user |
| GET | `/api/health` | ❌ | Health check |

---

## 💡 Tips Tambahan

### Custom Domain
Di Vercel → Settings → Domains → tambah domain kamu sendiri.

### Preview Deployments
Setiap push ke branch selain `main` akan buat preview URL terpisah — bagus untuk testing.

### Monitoring Logs
Di Vercel → Functions → pilih function → lihat real-time logs.
