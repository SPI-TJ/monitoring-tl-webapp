# ⚡ Quick Start Guide

Panduan singkat untuk memulai aplikasi Audit Monitoring dalam 5 menit.

## 🚀 Setup Cepat (5 Menit)

### 1️⃣ Install Dependencies

```bash
npm install
```

### 2️⃣ Setup Google Sheets API

1. Buat project di [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **Google Sheets API**
3. Buat **Service Account** dan download JSON key
4. Share Google Spreadsheet dengan email service account

### 3️⃣ Configure Environment

```bash
# Copy template
cp .env.example .env

# Edit dengan credentials Anda
nano .env
```

Minimal configuration:

```env
SPREADSHEET_ID=your-spreadsheet-id-here
GOOGLE_APPLICATION_CREDENTIALS=./credentials/service-account-key.json
```

### 4️⃣ Put Service Account Key

```bash
mkdir credentials
cp ~/Downloads/your-key.json ./credentials/service-account-key.json
```

### 5️⃣ Start Server

```bash
# Development
npm run dev

# Production
npm start
```

### 6️⃣ Open Browser

```
http://localhost:3000
```

Login dengan credentials dari Google Sheets (sheet "Users").

---

## 📊 Google Sheets Structure

Buat 2 sheets:

### Sheet: "Data"

Headers (Row 1):
```
No | Tanggal Laporan | Jenis Pemeriksaan | Kategori Pemeriksaan | Judul Audit | Temuan Pemeriksaan | Rekomendasi | Tindak Lanjut | Due Date | Tanggapan Auditee | Status | Kode Direktorat | Divisi | Departemen | Progres% | Request Close | Link Evidence | Tanggal Close | Last Updated
```

### Sheet: "Users"

Headers (Row 1):
```
Username | Password | Role | Divisi | Nama
```

Example:
```
admin | admin123 | Admin | IT | Administrator
```

---

## 🆘 Troubleshooting

**Server won't start?**
- Check Node.js version: `node --version` (need >=16)
- Check port 3000 availability
- Review .env configuration

**Can't login?**
- Verify users in Google Sheets "Users" sheet
- Check credentials match exactly

**"Unable to open spreadsheet"?**
- Verify SPREADSHEET_ID
- Check service account has access to spreadsheet
- Verify JSON key path

---

## 📚 Full Documentation

Untuk panduan lengkap, lihat:
- [README.md](README.md) - Complete documentation
- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Detailed setup instructions

---

**Need help?** Check troubleshooting section atau buka GitHub Issues.

**Happy coding! 🎉**
