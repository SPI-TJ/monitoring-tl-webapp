# 📋 Dokumentasi Aplikasi Monitoring Tindak Lanjut Audit
### PT Transportasi Jakarta — Internal Audit Management System

---

> **Untuk siapa dokumen ini?**
> Dokumen ini ditujukan untuk seluruh pengguna Aplikasi Monitoring Tindak Lanjut Audit — baik yang berperan sebagai **Admin** maupun **PIC (Person In Charge)**. Jika kamu sebelumnya terbiasa menggunakan Excel untuk mencatat dan mengupdate tindak lanjut audit, dokumen ini akan memandu kamu beralih ke sistem yang lebih terstruktur, transparan, dan mudah dipantau.

---

## Daftar Isi

1. [Latar Belakang & Tujuan Aplikasi](#1-latar-belakang--tujuan-aplikasi)
2. [Perbandingan: Excel vs Aplikasi Ini](#2-perbandingan-excel-vs-aplikasi-ini)
3. [Mengenal Peran Pengguna (Role)](#3-mengenal-peran-pengguna-role)
4. [Cara Masuk ke Aplikasi (Login)](#4-cara-masuk-ke-aplikasi-login)
5. [Fitur-Fitur Aplikasi](#5-fitur-fitur-aplikasi)
6. [Panduan Penggunaan untuk Admin](#6-panduan-penggunaan-untuk-admin)
7. [Panduan Penggunaan untuk PIC](#7-panduan-penggunaan-untuk-pic)
8. [Alur Kerja End-to-End (Siklus Lengkap)](#8-alur-kerja-end-to-end-siklus-lengkap)
9. [Real Case & Contoh Penggunaan Nyata](#9-real-case--contoh-penggunaan-nyata)
10. [Pertanyaan yang Sering Ditanyakan (FAQ)](#10-pertanyaan-yang-sering-ditanyakan-faq)
11. [Panduan Kolom & Istilah](#11-panduan-kolom--istilah)
12. [Kontak & Eskalasi Masalah](#12-kontak--eskalasi-masalah)

---

## 1. Latar Belakang & Tujuan Aplikasi

### Masalah yang Ada Sebelumnya

Selama ini, pengelolaan tindak lanjut hasil pemeriksaan audit dilakukan menggunakan **file Excel yang dikirim via email atau disimpan di folder bersama**. Cara ini menimbulkan beberapa masalah:

- 📁 File Excel tersebar di banyak tempat, tidak ada satu sumber kebenaran
- 🔄 Sulit tahu siapa yang sudah update dan kapan terakhir update
- 👁️ Tim Audit harus minta laporan manual ke setiap divisi
- ❌ Tidak ada notifikasi otomatis ketika ada yang minta di-close
- 📊 Membuat rekap & laporan memakan waktu berjam-jam
- 🔐 Tidak ada kontrol siapa yang bisa edit data siapa

### Solusi: Aplikasi Monitoring Tindak Lanjut Audit

Aplikasi ini adalah **platform web terpusat** yang menggantikan Excel. Semua data tersimpan di satu tempat (Google Spreadsheet), bisa diakses dari mana saja melalui browser, dan memiliki kontrol akses per divisi.

**Tujuan utama aplikasi ini:**

| Tujuan | Keterangan |
|--------|-----------|
| **Satu Sumber Data** | Semua temuan dan tindak lanjut tersimpan di satu tempat yang sama |
| **Transparansi Real-time** | Progress setiap rekomendasi bisa dipantau kapan saja |
| **Kontrol Akses** | PIC hanya bisa edit data divisinya sendiri |
| **Alur Persetujuan** | Ada mekanisme Request Close → Review Admin → Disetujui/Ditolak |
| **Pelaporan Otomatis** | Dashboard dan tabel distribusi terbentuk otomatis |

---

## 2. Perbandingan: Excel vs Aplikasi Ini

Bayangkan kamu sebelumnya punya file Excel seperti ini yang dikirim bolak-balik via email. Ini perbedaannya:

| Aspek | Excel (Cara Lama) | Aplikasi Ini (Cara Baru) |
|-------|-----------------|-------------------------|
| **Lokasi Data** | Tersebar di laptop masing-masing | Terpusat, bisa diakses dari mana saja |
| **Update Progress** | Edit langsung di sel Excel | Klik tombol "Update" → isi form → simpan |
| **Minta Close** | Chat/email ke tim Audit | Klik "Request Close" + upload bukti (link) |
| **Approval Close** | Manual via email/meeting | Tim Audit approve langsung di aplikasi |
| **Pantau Status** | Buka file → scroll → cari satu per satu | Dashboard otomatis, grafik real-time |
| **Siapa Edit Apa** | Siapa saja bisa edit semua | PIC hanya bisa edit data divisinya |
| **Rekap Laporan** | Buat manual, bisa berjam-jam | Otomatis terbentuk di Dashboard |
| **Riwayat Update** | Tidak tercatat | Tersimpan di kolom `Last Updated` |
| **Data Overdue** | Harus filter manual | Langsung terlihat di Dashboard & tabel |

---

## 3. Mengenal Peran Pengguna (Role)

Aplikasi ini memiliki **2 peran** dengan akses yang berbeda:

### 👤 Admin (Tim Audit Internal)

Admin adalah pengguna dari **Tim Audit Internal PT Transportasi Jakarta** yang bertanggung jawab atas keseluruhan proses monitoring.

**Admin bisa:**
- ✅ Melihat **semua** data temuan dari semua divisi dan direktorat
- ✅ Menambah temuan baru (input satu per satu atau upload massal via CSV)
- ✅ Mengedit semua kolom data temuan
- ✅ Menghapus data temuan
- ✅ Menyetujui (Approve) atau Menolak Request Close dari PIC
- ✅ Mengelola akun pengguna (tambah, edit, hapus user)
- ✅ Melihat Dashboard dengan data seluruh organisasi (per Direktorat dan per Departemen)

**Admin tidak bisa:**
- ❌ Mengakses data di luar sistem ini (data tetap di Google Spreadsheet yang sama)

---

### 👤 PIC (Person In Charge — Perwakilan Divisi)

PIC adalah **staf atau pejabat dari tiap divisi** yang ditunjuk untuk melaporkan progress tindak lanjut audit dari divisinya.

**PIC bisa:**
- ✅ Melihat data temuan **khusus divisinya saja**
- ✅ Update progress penyelesaian (persentase %)
- ✅ Mengisi tindak lanjut yang sudah dilakukan
- ✅ Mengisi tanggapan auditee
- ✅ Mengajukan **Request Close** (meminta agar temuan ditutup) beserta bukti link
- ✅ Melihat Dashboard khusus divisinya (per Departemen)

**PIC tidak bisa:**
- ❌ Melihat atau mengedit data divisi lain
- ❌ Menghapus data temuan
- ❌ Langsung menutup (close) temuan — harus minta persetujuan Admin
- ❌ Mengelola akun pengguna

---

## 4. Cara Masuk ke Aplikasi (Login)

### Langkah Login

1. **Buka browser** (Chrome, Edge, Firefox — semua bisa)
2. **Ketik atau klik link** aplikasi yang diberikan oleh Admin
3. Muncul halaman login → **isi Username dan Password** yang sudah diberikan Admin
4. Klik tombol **"Masuk →"**
5. Jika berhasil, kamu akan langsung masuk ke halaman **Dashboard**

### Tampilan Halaman Login

```
┌─────────────────────────────────────┐
│          📋 Selamat Datang          │
│         Masuk untuk melanjutkan     │
│                                     │
│  Username: [________________]       │
│  Password: [________________]       │
│                                     │
│         [  Masuk →  ]               │
└─────────────────────────────────────┘
```

> 💡 **Tips:** Tekan `Enter` setelah mengisi Username untuk pindah ke kolom Password. Tekan `Enter` lagi untuk login — tidak perlu klik tombol.

### Lupa Password?

Hubungi Admin untuk reset password. Admin bisa mengubah password kamu melalui menu **User Management**.

### Keluar dari Aplikasi

Klik tombol **"⇠ Keluar"** di pojok kanan atas header.

---

## 5. Fitur-Fitur Aplikasi

### 5.1 Dashboard 📊

Dashboard adalah **halaman ringkasan** yang muncul pertama kali setelah login. Seperti "laporan harian" yang terbentuk otomatis.

#### Kartu Statistik (5 Angka Utama)

Di bagian atas Dashboard ada **5 kartu angka** berwarna berbeda:

| Kartu | Warna | Arti |
|-------|-------|------|
| **Total Rekomendasi** | 🔵 Biru | Jumlah seluruh rekomendasi audit yang dipantau |
| **Masih Open** | 🟡 Kuning | Rekomendasi yang belum selesai/belum close |
| **Sudah Close** | 🟢 Hijau | Rekomendasi yang sudah selesai dan disetujui Admin |
| **Menunggu Approval** | 🔴 Merah | Rekomendasi yang PIC sudah ajukan Request Close, tapi belum di-approve Admin |
| **Jumlah Overdue** | 🟥 Merah Tua | Rekomendasi yang melewati Due Date tapi belum selesai — **perlu segera ditangani!** |

> ⚠️ **Perhatian khusus:** Jika angka **Jumlah Overdue** besar dan berwarna merah tua, itu sinyal bahwa ada banyak rekomendasi yang sudah melewati tenggat waktu. Segera koordinasi dengan PIC terkait.

#### Filter Bulan (Due Date)

Di atas Dashboard ada **baris tombol bulan** (Jan, Feb, Mar, ... Des):
- Klik satu bulan untuk melihat statistik khusus bulan tersebut
- Pilih tahun di sebelah kanan jika diperlukan
- Klik **"Semua"** untuk kembali ke tampilan keseluruhan

Contoh penggunaan: *"Saya ingin lihat berapa rekomendasi yang Due Date-nya di bulan Maret 2025"* → Klik pill **"03 Mar"**.

#### Grafik (Chart)

Tiga grafik otomatis muncul:
1. **Grafik Donut** — Proporsi Open vs Close (visual langsung lihat berapa persen yang sudah beres)
2. **Grafik Bar Per Direktorat/Departemen** — Distribusi jumlah rekomendasi
3. **Grafik Bar Progress** — Rata-rata progress penyelesaian per direktorat/departemen

Warna bar grafik progress punya **arti psikologis:**
- 🟢 **Hijau (≥ 80%)** — Bagus, hampir selesai
- 🟡 **Kuning (50–79%)** — Sedang berjalan, perlu dipantau
- 🔴 **Merah Tua (< 50%)** — Perlu perhatian segera!

#### Tabel Distribusi

Bagian bawah Dashboard menampilkan **tabel rekapitulasi** yang menunjukkan per Direktorat dan per Departemen:

| Kolom | Arti |
|-------|------|
| **Total** | Jumlah total rekomendasi |
| **Open** | Belum selesai |
| **Close** | Sudah selesai |
| **% Selesai** | Persentase penyelesaian dengan bar berwarna |

> 📌 **Untuk Admin:** Tabel menampilkan dua kartu — Direktorat (kiri) dan Departemen (kanan) secara berdampingan.
>
> 📌 **Untuk PIC:** Hanya tampil tabel per Departemen dari divisi kamu.

---

### 5.2 Data Temuan (Tab Data) 📋

Ini adalah "tabel utama" — seperti sheet Excel berisi semua baris data. Di sini kamu bisa melihat detail setiap rekomendasi.

#### Kolom-Kolom yang Tampil di Tabel

| Kolom | Isi |
|-------|-----|
| **No** | Nomor urut otomatis |
| **Tgl Laporan** | Tanggal laporan audit diterbitkan |
| **Jenis** | Label jenis pemeriksaan (misal: Reguler, Khusus) |
| **Judul Audit** | Nama audit/pemeriksaan yang dilakukan |
| **Rekomendasi** | Isi rekomendasi yang harus ditindaklanjuti |
| **Tindak Lanjut** | Progress tindakan yang sudah diambil |
| **Due Date** | Batas waktu penyelesaian (merah jika sudah lewat) |
| **Divisi / Dept** | Siapa yang bertanggung jawab |
| **Progres %** | Bar kemajuan 0–100% |
| **Req. Close** | Apakah PIC sudah minta di-close? |
| **Status** | Open atau Close |
| **Tgl Close** | Tanggal resmi ditutup |
| **Aksi** | Tombol edit, approve, atau hapus |

#### Fitur Pencarian & Filter

Di atas tabel ada beberapa alat bantu:

- **Kotak Pencarian 🔍** — Ketik kata kunci (judul audit, nama divisi, isi rekomendasi) untuk menyaring data
- **Filter Status** — Pilih antara "Semua Status", "Open", atau "Close"
- **Filter Request Close** — Pilih antara "Semua", "Ya" (sudah minta close), atau "Belum"
- **Filter Divisi** *(Admin only)* — Melihat hanya satu divisi tertentu
- **Filter Departemen** *(PIC only)* — Melihat hanya satu departemen tertentu

#### Fitur Sort Due Date ↕

Klik header kolom **"Due Date"** untuk mengurutkan data:
- Klik pertama: **↑ Terlama dulu** (due date paling lama/awal muncul di atas)
- Klik kedua: **↓ Terbaru dulu** (due date paling dekat/terbaru muncul di atas)
- Klik ketiga: **↕ Kembali ke default** (urutan original)

> 💡 **Tips:** Sort **↑ Terlama dulu** berguna untuk melihat mana yang sudah paling lama jatuh tempo dan belum selesai.

#### Klik Baris untuk Lihat Detail

**Setiap baris di tabel bisa diklik** untuk membuka **jendela Detail Temuan** yang berisi informasi lengkap termasuk `Last Updated` — kapan terakhir data ini diperbarui.

#### Tanda Overdue ⚠

Baris yang sudah melewati Due Date dan belum Close akan ditandai dengan:
- Garis merah di tepi kiri baris
- Tanggal Due Date berwarna merah tebal
- Label **"Overdue"** di bawah tanggal

---

### 5.3 Request Close (Tab — Admin Only) 🔔

Tab ini hanya ada di akun Admin. Berisi daftar semua rekomendasi yang **PIC sudah ajukan Request Close** dan menunggu keputusan Admin.

Di sini Admin bisa:
- **✓ Approve** → Status berubah jadi Close, tanggal close otomatis terisi
- **✕ Tolak** → Request Close dibatalkan, PIC perlu perbaiki dan ajukan ulang

> 🔔 **Perhatikan badge merah** di tab "Request Close" — angka di badge menunjukkan berapa yang sedang menunggu persetujuan.

---

### 5.4 User Management (Tab — Admin Only) 👤

Admin bisa mengelola siapa saja yang bisa masuk ke aplikasi.

**Yang bisa dilakukan:**
- **Tambah User** baru — set username, password, role (Admin/PIC), divisi, dan nama
- **Edit User** — ganti password, ubah divisi, atau ubah nama
- **Hapus User** — menghapus akses pengguna yang sudah tidak aktif

> ⚠️ **Penting:** Saat membuat user dengan role **PIC**, pastikan mengisi kolom **Divisi** dengan nama divisi yang **persis sama** dengan kolom Divisi di data temuan. Jika berbeda (misal: "Divisi Keuangan" vs "Keuangan"), PIC tidak akan bisa melihat data divisinya.

---

### 5.5 Detail Temuan (Modal/Popup) 🔍

Saat klik tombol **🔍** atau klik langsung di baris tabel, akan muncul popup yang menampilkan semua informasi dari satu rekomendasi secara lengkap dan rapi.

Informasi yang ditampilkan antara lain:
- Semua data identitas temuan (No, Tgl Laporan, Judul, Direktorat, Divisi, Departemen)
- Temuan Pemeriksaan (kotak abu-abu)
- Rekomendasi (kotak biru muda)
- Tindak Lanjut yang sudah dilakukan
- Progres dengan bar warna
- Status, Request Close, Link Evidence
- Tanggal Close
- **⏱ Last Updated** — waktu terakhir ada yang mengupdate data ini (format: tgl Bulan tahun — HH:MM:SS)

---

### 5.6 Upload Data Massal (CSV) — Admin Only ⬆

Untuk memasukkan banyak data sekaligus (misalnya dari hasil audit baru), Admin bisa upload file CSV.

**Cara upload:**
1. Klik tombol **"⬆ CSV"** di tab Data Temuan
2. Download template CSV dulu dengan klik **"⬇ Template CSV"**
3. Isi template di Excel, simpan sebagai CSV
4. Upload file atau paste isi file ke kotak teks
5. Klik **"👁 Preview"** untuk lihat dulu sebelum upload
6. Klik **"⬆ Upload Data"** jika sudah yakin

---

## 6. Panduan Penggunaan untuk Admin

### 6.1 Memulai — Checklist Pertama Kali

Sebelum mulai digunakan, Admin perlu melakukan setup awal:

- [ ] **Buat akun untuk semua PIC** di setiap divisi (menu Users)
- [ ] **Pastikan nama Divisi di akun PIC** sama persis dengan kolom Divisi di data
- [ ] **Upload data awal** temuan audit yang sudah ada (via CSV atau input manual)
- [ ] **Beritahu PIC** tentang username dan password mereka
- [ ] **Sosialisasikan** cara pakai aplikasi ke semua PIC

---

### 6.2 Menambah Temuan Baru (Satu per Satu)

Gunakan ini saat ada **1–5 temuan baru** yang perlu dimasukkan.

**Langkah:**
1. Buka tab **"Data Temuan"**
2. Klik tombol **"✏️ Tambah"** di pojok kanan atas
3. Isi formulir yang muncul:
   - `Tanggal Laporan` — tanggal laporan audit (otomatis terisi hari ini, bisa diubah)
   - `Jenis Pemeriksaan` — misal: "Audit Reguler", "Audit Khusus", "Reviu"
   - `Kategori Pemeriksaan` — misal: "Operasional", "Keuangan", "IT"
   - `Judul Audit` *(wajib)* — nama lengkap audit
   - `Temuan Pemeriksaan` *(wajib)* — deskripsi temuan
   - `Rekomendasi` *(wajib)* — apa yang harus dilakukan
   - `Due Date` — batas waktu penyelesaian
   - `Kode Direktorat` — misal: "DIRUT", "DIRTEKOPS"
   - `Divisi` — nama divisi yang bertanggung jawab *(harus sama persis dengan Divisi di akun PIC)*
   - `Departemen` — departemen spesifik
   - `Status` — pilih "Open" (default untuk temuan baru)
4. Klik **"💾 Simpan"**

---

### 6.3 Upload Banyak Temuan Sekaligus (CSV)

Gunakan ini saat ada **puluhan atau ratusan temuan** dari satu laporan audit.

**Langkah:**
1. Buka tab **"Data Temuan"** → Klik **"⬆ CSV"**
2. Klik **"⬇ Template CSV"** → file template terdownload
3. Buka file template di **Excel**
4. Isi data temuan (satu baris = satu rekomendasi)
5. Simpan file Excel sebagai **CSV** (File → Simpan Sebagai → CSV)

   > 💡 **Atau cara lebih cepat:** Select dan copy baris-baris dari Excel langsung (Ctrl+A lalu Ctrl+C), lalu paste ke kotak teks di aplikasi.

6. Klik **"👁 Preview"** → periksa apakah data tampil benar
7. Klik **"⬆ Upload Data"** → konfirmasi

---

### 6.4 Mengedit Data Temuan

Jika ada kesalahan data atau perlu update dari sisi Admin:

1. Di tabel, cari baris yang ingin diedit
2. Klik tombol **"✏️"** di kolom Aksi
3. Edit field yang perlu diubah
4. Klik **"💾 Simpan"**

Atau buka **Detail Temuan** dulu dengan klik baris/tombol 🔍, lalu klik **"✏️ Edit"** di bagian bawah popup.

---

### 6.5 Mengelola Request Close dari PIC

Ini adalah tugas rutin Admin — memeriksa dan memutuskan Request Close dari PIC.

**Langkah:**
1. Klik tab **"🔔 Request Close"** (cek badge merah untuk tahu ada berapa yang menunggu)
2. Lihat daftar rekomendasi yang menunggu approval
3. Periksa setiap baris — terutama **Tindak Lanjut** dan **Progres%**
4. Untuk melihat detail lengkap termasuk link evidence: klik baris di tab Data Temuan → buka Detail
5. **Jika setuju:** Klik **"✓ Approve"** → konfirmasi → Status otomatis berubah jadi Close
6. **Jika belum setuju:** Klik **"✕ Tolak"** → Request Close dibatalkan, PIC bisa perbaiki dan ajukan ulang

---

### 6.6 Menghapus Data Temuan

> ⚠️ **PERHATIAN:** Penghapusan bersifat **permanen** dan tidak bisa dibatalkan!

**Langkah:**
1. Di tabel, klik tombol **"🗑"** di baris yang ingin dihapus
2. Muncul popup konfirmasi — baca baik-baik informasi yang tampil
3. **Ketik kata "HAPUS"** (huruf kapital semua) di kotak yang tersedia
4. Tombol "Hapus Permanen" baru akan aktif
5. Klik **"🗑 Hapus Permanen"**

> 💡 Kata **"HAPUS"** harus diketik manual sebagai pengaman agar tidak terjadi penghapusan tidak sengaja.

---

### 6.7 Mengelola User

**Tambah User Baru:**
1. Buka tab **"👤 Users"**
2. Klik **"+ Tambah User"**
3. Isi Username (tidak bisa diubah setelah dibuat), Password, Role, Divisi (jika PIC), dan Nama
4. Klik **"💾 Simpan"**

**Edit User (misalnya ganti password):**
1. Di tabel Users, klik **"✏️ Edit"** di baris user yang bersangkutan
2. Ubah yang perlu diubah (username tidak bisa diubah)
3. Klik **"💾 Simpan"**

**Hapus User:**
1. Klik **"🗑"** di baris user → konfirmasi dengan klik "OK"

---

## 7. Panduan Penggunaan untuk PIC

### 7.1 Orientasi — Apa yang Perlu Kamu Tahu

Sebagai PIC, tanggung jawab kamu di aplikasi ini adalah:
1. **Update progress** (persentase selesai) secara berkala
2. **Isi tindak lanjut** — ceritakan apa yang sudah kamu lakukan
3. **Minta close** ketika rekomendasi sudah benar-benar selesai, disertai bukti link

Kamu **hanya bisa lihat data divisimu sendiri** — data divisi lain tidak terlihat.

---

### 7.2 Memahami Dashboard Kamu

Setelah login, Dashboard menampilkan ringkasan **khusus divisimu**:

- Berapa total rekomendasi yang menjadi tanggung jawab divisimu
- Berapa yang sudah Close vs yang masih Open
- Berapa yang sedang menunggu approval Close
- Berapa yang sudah Overdue (lewat Due Date!)
- Grafik dan tabel distribusi per Departemen di divisimu

> 🎯 **Fokus utama kamu:** Angka **"Jumlah Overdue"** di kartu merah tua. Jika angka ini > 0, artinya ada rekomendasi yang sudah melewati tenggat waktu dan belum selesai. Prioritaskan ini!

---

### 7.3 Update Progress Tindak Lanjut

Ini adalah **kegiatan utama PIC** — melaporkan sejauh mana rekomendasi sudah ditindaklanjuti.

**Langkah:**
1. Buka tab **"📋 Data Divisi Saya"**
2. Cari rekomendasi yang ingin diupdate (bisa pakai kotak pencarian)
3. Klik tombol **"Update"** di kolom Aksi (atau klik baris → buka Detail → klik "✏️ Update Progress")
4. Isi form yang muncul:

   **a. Progres Penyelesaian (%)**
   - Isi angka 0 sampai 100
   - Contoh: baru mulai = isi `20`, setengah jalan = `50`, hampir selesai = `90`, selesai penuh = `100`

   **b. Tindak Lanjut**
   - Ceritakan apa yang sudah dilakukan
   - Tulis dengan jelas: "Sudah dilakukan apa, kapan, siapa yang terlibat"
   - Contoh: *"Tanggal 5 Maret 2025 telah dilakukan rekonsiliasi data penumpang dengan data dari Sistem ATMS. Hasilnya sudah didokumentasikan dalam Berita Acara nomor BA-2025-003."*

   **c. Tanggapan Auditee**
   - Jika ada tanggapan resmi dari auditee/pimpinan, isi di sini

   **d. Request Close**
   - Pilih **"Belum"** jika progres belum 100% atau belum siap di-close
   - Pilih **"Ya — Minta di-close"** jika sudah selesai dan siap diajukan

5. Klik **"💾 Simpan Progress"**

---

### 7.4 Mengajukan Request Close (Minta Ditutup)

Ketika sebuah rekomendasi sudah **benar-benar selesai ditindaklanjuti**, kamu perlu mengajukan Request Close ke Admin.

> 📌 **Syarat Request Close:**
> - Progres idealnya sudah 100% (atau sangat mendekati)
> - Ada bukti yang bisa dilampirkan berupa link (Google Drive, SharePoint, OneDrive, dll.)
> - Tindak lanjut sudah diisi dengan jelas

**Langkah:**
1. Klik tombol **"Update"** pada rekomendasi yang sudah selesai
2. Isi **Progres** = `100`
3. Pastikan **Tindak Lanjut** sudah terisi lengkap
4. Ubah **Request Close** menjadi **"Ya — Minta di-close"**
5. Panel kuning akan muncul → **isi Link Evidence** (wajib!)
   - Link bisa berupa link Google Drive, SharePoint, OneDrive, atau link sistem internal lainnya
   - Pastikan link bisa diakses oleh Tim Audit
6. Klik **"💾 Simpan Progress"**
7. Muncul **popup konfirmasi** → periksa detail yang tampil → klik **"✅ Ya, Ajukan"**

**Setelah diajukan:**
- Status berubah jadi **Request Close: Ya** (ditandai badge merah di tabel)
- Admin akan mendapat notifikasi dan akan mereview
- Jika **disetujui** → Status berubah jadi **Close** ✅
- Jika **ditolak** → Request Close kembali ke "Belum", kamu perlu perbaiki dan ajukan ulang

---

### 7.5 Melihat Detail Lengkap Sebuah Rekomendasi

Klik baris mana saja di tabel atau klik tombol **"🔍"** untuk melihat:
- Semua informasi lengkap dari rekomendasi tersebut
- Tanggal Close (jika sudah ditutup)
- Link Evidence yang sudah dilampirkan
- **Last Updated** — kapan terakhir data ini diperbarui (berguna untuk konfirmasi bahwa update kamu sudah tersimpan)

---

## 8. Alur Kerja End-to-End (Siklus Lengkap)

Berikut adalah gambaran alur lengkap dari satu rekomendasi audit dari awal hingga selesai:

```
[1. TEMUAN AUDIT]
       │
       ▼
[2. ADMIN INPUT DATA]
   Admin memasukkan rekomendasi ke aplikasi
   Status: OPEN | Progres: 0%
       │
       ▼
[3. PIC NOTIFIKASI]
   PIC login → lihat rekomendasi baru di divisinya
   (Koordinasi di luar aplikasi jika perlu)
       │
       ▼
[4. PIC UPDATE BERKALA]
   PIC klik "Update" → isi progress & tindak lanjut
   Status: OPEN | Progres: bertambah (misal 30% → 60% → 90%)
       │
       ▼ (Saat progres sudah 100% dan ada bukti)
[5. PIC AJUKAN REQUEST CLOSE]
   PIC isi progress 100% + link evidence → pilih "Ya" → Ajukan
   Status: OPEN | Request Close: YA
       │
       ▼
[6. ADMIN REVIEW]
   Admin cek di tab "Request Close"
   Periksa tindak lanjut & link evidence
       │
       ├──[Setuju]──────────────────────────────────────────┐
       │                                                     │
       ▼                                                     ▼
[ADMIN TOLAK]                                    [ADMIN APPROVE]
Request Close → Belum                            Status: CLOSE ✅
PIC perbaiki & ajukan ulang                      Tanggal Close terisi otomatis
```

---

## 9. Real Case & Contoh Penggunaan Nyata

### 📋 Kasus 1 — Admin Input Temuan Baru

**Situasi:** Tim Audit baru selesai melakukan Audit Operasional pada Divisi Pelayanan. Ada 3 rekomendasi yang perlu dipantau.

**Yang dilakukan Admin (Ibu Ratna, Tim Audit):**

1. Login ke aplikasi
2. Buka tab **"Data Temuan"** → klik **"✏️ Tambah"**
3. Isi form untuk Rekomendasi 1:
   - Tanggal Laporan: `15/03/2025`
   - Jenis Pemeriksaan: `Audit Operasional`
   - Kategori: `Operasional`
   - Judul Audit: `Audit Operasional Divisi Pelayanan Q1 2025`
   - Temuan: *"Tidak terdapat SOP tertulis untuk penanganan keluhan penumpang di Halte Koridor 1"*
   - Rekomendasi: *"Divisi Pelayanan agar menyusun dan mengesahkan SOP Penanganan Keluhan Penumpang paling lambat 60 hari kerja sejak laporan ini diterbitkan"*
   - Due Date: `14/06/2025`
   - Kode Direktorat: `DIRTEKOPS`
   - Divisi: `Divisi Pelayanan`
   - Departemen: `Departemen Layanan Pelanggan`
   - Status: `Open`
4. Klik **"💾 Simpan"**
5. Ulangi untuk Rekomendasi 2 dan 3

**Hasilnya:** Tiga rekomendasi baru muncul di tabel dengan Status "Open" dan Progres 0%.

---

### 📋 Kasus 2 — PIC Update Progress

**Situasi:** Pak Budi (PIC Divisi Pelayanan) sudah mulai menyusun draft SOP dan ingin melaporkan progressnya.

**Yang dilakukan Pak Budi:**

1. Login ke aplikasi
2. Buka tab **"Data Divisi Saya"**
3. Melihat ada 3 rekomendasi dari Audit Operasional Q1 2025
4. Klik **"Update"** pada Rekomendasi "SOP Penanganan Keluhan"
5. Mengisi form:
   - Progres: `35`
   - Tindak Lanjut: *"Tanggal 20 Maret 2025 telah dibentuk tim penyusunan SOP yang terdiri dari 3 orang staf. Tim telah mengumpulkan referensi SOP dari Divisi Pelayanan TransMayo dan sedang dalam proses penyusunan draft. Target draft selesai minggu ke-4 April 2025."*
   - Tanggapan Auditee: *"Divisi Pelayanan berkomitmen untuk menyelesaikan SOP sesuai batas waktu."*
   - Request Close: `Belum`
6. Klik **"💾 Simpan Progress"**

**Hasilnya:** Progress bar di tabel berubah menjadi 35%. Kolom "Last Updated" terisi dengan waktu sekarang. Admin bisa melihat update ini kapan saja.

---

### 📋 Kasus 3 — PIC Ajukan Request Close

**Situasi:** Sebulan kemudian, SOP sudah selesai disusun, disahkan oleh Kepala Divisi, dan sudah disosialisasikan ke seluruh staf. Pak Budi ingin menutup rekomendasi ini.

**Yang dilakukan Pak Budi:**

1. Login → buka tab **"Data Divisi Saya"**
2. Klik **"Update"** pada rekomendasi SOP tersebut
3. Mengisi form:
   - Progres: `100`
   - Tindak Lanjut: *"SOP Penanganan Keluhan Penumpang No. SOP-DIV-LAY-001 telah disusun, disetujui oleh Kepala Divisi Pelayanan (12 Mei 2025), dan telah disosialisasikan kepada seluruh staf pada tanggal 20 Mei 2025. Dokumentasi training tercatat dalam Daftar Hadir No. DH-2025-051."*
   - Request Close: **Ya — Minta di-close**
4. Panel kuning muncul → isi Link Evidence:
   `https://drive.google.com/drive/folders/xxxx` *(link folder Google Drive berisi SOP dan Daftar Hadir)*
5. Klik **"💾 Simpan Progress"**
6. Muncul popup konfirmasi → periksa bahwa Progres 100% dan link sudah benar → klik **"✅ Ya, Ajukan"**

**Hasilnya:** Rekomendasi berubah jadi "Request Close: Ya". Badge merah bertambah di tab Request Close Admin.

---

### 📋 Kasus 4 — Admin Approve Close

**Situasi:** Ibu Ratna (Admin/Tim Audit) melihat ada notifikasi Request Close baru dari Divisi Pelayanan.

**Yang dilakukan Ibu Ratna:**

1. Login → melihat badge merah **"1"** di tab Request Close
2. Klik tab **"🔔 Request Close"**
3. Melihat baris rekomendasi SOP dari Pak Budi
4. Membaca Tindak Lanjut — sudah sangat jelas dan lengkap
5. Buka link evidence → memverifikasi dokumen SOP dan daftar hadir tersedia
6. Kembali ke aplikasi → klik **"✓ Approve"** → konfirmasi "OK"

**Hasilnya:** Status rekomendasi berubah menjadi **"Close"** ✅, tanggal close terisi otomatis (hari ini), badge Request Close berkurang. Dashboard Dashboard menampilkan angka Close yang bertambah 1.

---

### 📋 Kasus 5 — Admin Tolak Request Close

**Situasi:** Ada PIC yang ajukan Request Close tapi evidencenya tidak lengkap (link tidak bisa dibuka).

**Yang dilakukan Admin:**

1. Buka tab **"Request Close"**
2. Melihat Request Close dari Departemen XYZ
3. Klik link evidence → **link tidak bisa dibuka / error**
4. Klik **"✕ Tolak"** → konfirmasi "OK"

**Hasilnya:** Request Close kembali ke "Belum". PIC perlu update ulang dengan evidence yang benar, lalu ajukan Request Close lagi.

> 📞 **Catatan:** Setelah menolak, Admin perlu **menghubungi PIC secara langsung** (via chat/email/telepon) untuk memberitahu alasan penolakan dan apa yang perlu diperbaiki.

---

### 📋 Kasus 6 — Filter Dashboard untuk Laporan Bulanan

**Situasi:** Kepala Divisi Audit ingin tahu berapa rekomendasi yang Due Date-nya di bulan Juni 2025 dan bagaimana progressnya.

**Yang dilakukan Admin:**

1. Buka tab **"Dashboard"**
2. Klik pill bulan **"06 Jun"** di baris filter bulan
3. Pilih tahun **"2025"** di dropdown tahun

**Hasilnya:** Semua angka statistik, grafik, dan tabel distribusi berubah — hanya menampilkan rekomendasi yang Due Date-nya di Juni 2025. Data bisa langsung dipresentasikan atau di-screenshot untuk laporan.

---

## 10. Pertanyaan yang Sering Ditanyakan (FAQ)

**Q: Saya coba login tapi muncul pesan "Username atau password salah" — kenapa?**
> Cek kembali penulisan username (huruf kecil/kapital berpengaruh). Jika yakin sudah benar, hubungi Admin untuk reset password.

---

**Q: Saya tidak bisa melihat data divisi saya padahal sudah login sebagai PIC.**
> Kemungkinan nama Divisi di akun PIC kamu tidak persis sama dengan nama Divisi di data. Hubungi Admin untuk mengecek dan menyamakan nama Divisi di akun kamu.

---

**Q: Saya sudah klik Update dan Simpan, tapi kenapa datanya tidak berubah di tabel?**
> Setelah menyimpan, sistem otomatis memuat ulang data. Jika masih tidak berubah, coba tekan `F5` di keyboard (refresh halaman) lalu login kembali.

---

**Q: Kenapa tombol "Hapus Permanen" masih abu-abu meskipun saya sudah klik?**
> Kamu harus mengetik kata **HAPUS** (semua huruf kapital) di kotak teks konfirmasi dulu. Baru setelah itu tombol aktif.

---

**Q: Bolehkah saya mengajukan Request Close meskipun progres belum 100%?**
> Secara teknis aplikasi mengizinkan, tapi **sangat tidak direkomendasikan**. Tim Audit akan melihat angka progres yang belum 100% dan kemungkinan besar akan **menolak** request tersebut.

---

**Q: Link evidence apa yang bisa saya gunakan?**
> Bisa menggunakan link dari: Google Drive, SharePoint, OneDrive, link sistem internal perusahaan, atau link dokumen lainnya yang bisa diakses oleh Tim Audit. Pastikan link tidak memerlukan izin akses khusus (atau sudah dibagikan ke Tim Audit).

---

**Q: Apakah Admin bisa melihat update yang saya lakukan?**
> Ya. Admin bisa melihat semua perubahan termasuk isi Tindak Lanjut, Progress%, dan Link Evidence kapan saja. Kolom "Last Updated" juga mencatat waktu terakhir data diubah.

---

**Q: Jika Request Close saya ditolak, apa yang harus saya lakukan?**
> Hubungi Admin untuk tahu alasan penolakan. Setelah diperbaiki (misal: upload ulang evidence, lengkapi tindak lanjut), kamu bisa klik "Update" lagi dan pilih "Ya — Minta di-close" untuk mengajukan ulang.

---

**Q: Apakah data yang ada di aplikasi ini terhubung ke spreadsheet?**
> Ya. Data aplikasi disimpan di **Google Spreadsheet** yang dikelola Tim Audit. Kamu tidak perlu mengakses spreadsheet tersebut secara langsung — semua sudah tersedia di aplikasi.

---

**Q: Bagaimana cara logout dari aplikasi?**
> Klik tombol **"⇠ Keluar"** di pojok kanan atas. Selalu logout setelah selesai, terutama jika menggunakan komputer bersama.

---

## 11. Panduan Kolom & Istilah

Daftar penjelasan lengkap setiap kolom dan istilah yang ada di aplikasi:

| Istilah / Kolom | Penjelasan |
|----------------|-----------|
| **No** | Nomor urut otomatis, diisi sistem |
| **Tanggal Laporan** | Tanggal laporan audit resmi diterbitkan |
| **Jenis Pemeriksaan** | Tipe audit: Audit Reguler, Audit Khusus, Reviu, dll. |
| **Kategori Pemeriksaan** | Area yang diaudit: Keuangan, Operasional, IT, SDM, dll. |
| **Judul Audit** | Nama lengkap kegiatan audit |
| **Temuan Pemeriksaan** | Kondisi yang ditemukan auditor yang menjadi masalah |
| **Rekomendasi** | Saran/perintah dari auditor yang harus ditindaklanjuti |
| **Tindak Lanjut** | Laporan PIC tentang apa yang sudah dilakukan |
| **Due Date** | Batas waktu penyelesaian rekomendasi |
| **Tanggapan Auditee** | Respons formal dari pihak yang diaudit |
| **Status** | **Open** = belum selesai; **Close** = sudah selesai & disetujui |
| **Kode Direktorat** | Kode direktorat penanggung jawab (misal: DIRTEKOPS) |
| **Divisi** | Nama divisi yang bertanggung jawab |
| **Departemen** | Nama departemen spesifik di dalam divisi |
| **Request Close** | **Belum** = belum minta ditutup; **Ya** = PIC sudah minta close, menunggu Admin |
| **Progres%** | Persentase penyelesaian (0–100%), diisi PIC |
| **Link Evidence** | Link ke dokumen bukti penyelesaian (Google Drive, dll.) |
| **Tanggal Close** | Tanggal resmi rekomendasi ditutup (diisi otomatis saat Admin approve) |
| **Last Updated** | Waktu terakhir ada perubahan pada data ini (otomatis, format: Tgl Bulan Tahun — HH:MM:SS) |
| **Overdue** | Rekomendasi yang Due Date-nya sudah lewat tapi masih berstatus Open |
| **Approve** | Tindakan Admin menyetujui Request Close → Status jadi Close |
| **Tolak** | Tindakan Admin menolak Request Close → Request Close kembali Belum |

---

## 12. Kontak & Eskalasi Masalah

### Siapa yang Dihubungi Jika Ada Masalah?

| Jenis Masalah | Siapa yang Dihubungi |
|--------------|---------------------|
| Lupa password / tidak bisa login | Admin Audit (minta reset password) |
| Data divisi tidak muncul | Admin Audit (cek nama Divisi di akun) |
| Request Close ditolak | Admin Audit (tanya alasan & perbaikan) |
| Menemukan data yang salah | Admin Audit (minta koreksi) |
| Aplikasi error / tidak bisa dibuka | Admin Audit / Tim IT |
| Perlu tambah/ubah/hapus user | Admin Audit |
| Butuh data untuk laporan | Admin Audit |

---

### Catatan Penting untuk Semua Pengguna

> 🔒 **Keamanan:** Jangan bagikan username dan password ke orang lain. Setiap akun terikat ke satu orang dan aktivitas tercatat.

> 💾 **Data tersimpan otomatis:** Setiap kali kamu klik "Simpan", data langsung tersimpan ke server. Tidak perlu save manual seperti di Excel.

> 🌐 **Akses dari mana saja:** Aplikasi bisa dibuka dari laptop, komputer kantor, bahkan HP — selama ada koneksi internet dan browser.

> 🔄 **Data real-time:** Semua pengguna melihat data yang sama dan selalu up-to-date. Tidak ada lagi masalah "versi file yang berbeda".

---

*Dokumen ini dibuat untuk mendukung implementasi Monitoring Tindak Lanjut Audit PT Transportasi Jakarta.*
*Versi: 1.0 | Terakhir diperbarui: Maret 2025*
