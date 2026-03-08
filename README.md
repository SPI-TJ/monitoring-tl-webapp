# 📊 Audit Monitoring Web Application

Sistem Monitoring Tindak Lanjut Audit berbasis web dengan Google Sheets sebagai database.

## 🌟 Fitur Utama

- ✅ **Autentikasi Multi-Role** - Admin & PIC dengan akses berbeda
- 📊 **Dashboard Interaktif** - Statistik real-time dengan Chart.js
- 📱 **Responsive Design** - Mobile-first UI dengan bottom navigation
- 🔄 **Real-time Data Sync** - Langsung tersinkronisasi dengan Google Sheets
- 📈 **Visualisasi Data** - Charts dan progress tracking
- 🔐 **Role-Based Access** - Admin full control, PIC filtered view
- 🔔 **Request Close Workflow** - PIC request, Admin approve

## 🏗️ Arsitektur Sistem

```
┌─────────────────┐
│   Frontend      │  → HTML/CSS/JavaScript (Vanilla)
│   (Client)      │     - UI Components
└────────┬────────┘     - Chart.js
         │
         ↓ HTTP/HTTPS
┌─────────────────┐
│   Backend API   │  → Node.js + Express
│   (Server)      │     - REST API Endpoints
└────────┬────────┘     - Google Sheets API Client
         │
         ↓ Google Sheets API v4
┌─────────────────┐
│  Google Sheets  │  → Database
│   (Database)    │     - Sheet "Data"
└─────────────────┘     - Sheet "Users"
```

## 📁 Struktur Project

```
audit-monitoring-webapp/
├── public/                     # Frontend files
│   ├── index.html             # Main UI (login + app)
│   ├── js/
│   │   └── app.js            # Frontend logic
│   └── assets/               # Static assets (optional)
│
├── server/                    # Backend API
│   ├── index.js              # Express server entry point
│   ├── config/
│   │   └── sheets.js         # Google Sheets configuration
│   ├── routes/
│   │   ├── auth.js           # Authentication routes
│   │   ├── data.js           # Data CRUD routes
│   │   └── users.js          # User management routes
│   └── services/
│       └── sheetsService.js  # Google Sheets API service
│
├── .env.example              # Environment variables template
├── .gitignore               # Git ignore file
├── package.json             # Node.js dependencies
└── README.md               # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 16.x
- npm atau yarn
- Google Cloud Project dengan Sheets API enabled
- Google Sheets dengan struktur yang sesuai

### 1. Clone & Install

```bash
# Clone atau download project
cd audit-monitoring-webapp

# Install dependencies
npm install
```

### 2. Setup Google Cloud Project

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru atau gunakan yang sudah ada
3. Enable **Google Sheets API**
4. Buat **Service Account**:
   - IAM & Admin → Service Accounts → Create Service Account
   - Download JSON key file
5. Share Google Sheets Anda dengan email service account (dengan permission Editor)

### 3. Konfigurasi Environment

```bash
# Copy template
cp .env.example .env

# Edit file .env
nano .env
```

Isi dengan konfigurasi Anda:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Google Sheets Configuration
SPREADSHEET_ID=your-spreadsheet-id-here
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com

# Path ke file JSON key (atau gunakan GOOGLE_CREDENTIALS_JSON)
GOOGLE_APPLICATION_CREDENTIALS=./credentials/service-account-key.json

# Atau paste langsung JSON credentials (untuk deployment)
# GOOGLE_CREDENTIALS_JSON={"type":"service_account",...}
```

### 4. Setup Google Sheets

Pastikan Google Sheets Anda memiliki 2 sheets dengan struktur berikut:

#### Sheet: "Data"
Kolom yang diperlukan:
- No
- Tanggal Laporan
- Jenis Pemeriksaan
- Judul Audit
- Rekomendasi
- Tindak Lanjut
- Due Date
- Kode Direktorat
- Divisi
- Departemen
- Progres%
- Request Close
- Status
- Tanggal Close
- Link Evidence
- Last Updated

#### Sheet: "Users"
Kolom yang diperlukan:
- Username
- Password
- Role (Admin/PIC)
- Divisi
- Nama

### 5. Jalankan Development Server

```bash
# Development mode dengan auto-reload
npm run dev

# Production mode
npm start
```

Buka browser: `http://localhost:3000`

## 📚 API Documentation

### Authentication

#### POST /api/auth/login
Login user

**Request:**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "username": "admin",
    "role": "Admin",
    "divisi": "IT",
    "nama": "Administrator"
  }
}
```

### Data Management

#### GET /api/data
Ambil semua data (dengan filter role)

**Query Parameters:**
- `role` - User role (Admin/PIC)
- `divisi` - User division (untuk filter PIC)

**Response:**
```json
{
  "rows": [...],
  "stats": {
    "total": 100,
    "open": 45,
    "closed": 55,
    "requestClose": 5,
    "avgProgres": 65,
    "byDirektorat": {...},
    "byDepartemen": {...}
  }
}
```

#### POST /api/data/add
Tambah data baru (Admin only)

**Request:**
```json
{
  "rows": [
    {
      "Tanggal Laporan": "2025-01-15",
      "Jenis Pemeriksaan": "Internal",
      "Judul Audit": "Audit Keuangan Q4",
      "Rekomendasi": "Perbaikan proses...",
      ...
    }
  ]
}
```

#### PUT /api/data/update/:rowIndex
Update data (Admin full, PIC partial)

**Request:**
```json
{
  "role": "Admin",
  "data": {
    "Status": "Close",
    "Progres%": 100,
    ...
  }
}
```

#### DELETE /api/data/delete/:rowIndex
Hapus data (Admin only)

### User Management

#### GET /api/users
Ambil semua users (Admin only)

#### POST /api/users/add
Tambah user baru (Admin only)

#### PUT /api/users/update/:username
Update user (Admin only)

#### DELETE /api/users/delete/:username
Hapus user (Admin only)

## 🔒 Security Best Practices

1. **Environment Variables**
   - Jangan commit file `.env` ke Git
   - Gunakan `.env.example` sebagai template

2. **Service Account Key**
   - Simpan file JSON credentials dengan aman
   - Jangan commit ke Git
   - Set permission file: `chmod 600 service-account-key.json`

3. **HTTPS**
   - Gunakan HTTPS di production
   - Setup SSL/TLS certificate (Let's Encrypt)

4. **CORS**
   - Konfigurasi CORS sesuai domain production
   - Jangan gunakan wildcard (`*`) di production

5. **Rate Limiting**
   - Implementasi rate limiting untuk API
   - Lindungi dari brute force attacks

## 🚢 Deployment

### Deploy ke VPS (Ubuntu/Debian)

```bash
# 1. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Clone project
git clone <your-repo>
cd audit-monitoring-webapp

# 3. Install dependencies
npm install --production

# 4. Setup environment
cp .env.example .env
nano .env  # edit dengan credentials production

# 5. Setup PM2 (process manager)
sudo npm install -g pm2
pm2 start server/index.js --name audit-monitoring
pm2 startup
pm2 save

# 6. Setup Nginx (reverse proxy)
sudo apt install nginx
sudo nano /etc/nginx/sites-available/audit-monitoring
```

Nginx config:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site & restart nginx
sudo ln -s /etc/nginx/sites-available/audit-monitoring /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL (optional but recommended)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### Deploy ke Heroku

```bash
# 1. Install Heroku CLI
# 2. Login
heroku login

# 3. Create app
heroku create audit-monitoring-app

# 4. Set environment variables
heroku config:set SPREADSHEET_ID=your-id
heroku config:set GOOGLE_CREDENTIALS_JSON='paste-json-here'

# 5. Deploy
git push heroku main

# 6. Open app
heroku open
```

### Deploy ke Vercel (Serverless)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
vercel

# 3. Set environment variables di Vercel Dashboard
# - SPREADSHEET_ID
# - GOOGLE_CREDENTIALS_JSON
```

## 🧪 Testing

```bash
# Run tests (jika ada)
npm test

# Check linting
npm run lint

# Test API endpoints
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

## 🛠️ Troubleshooting

### Error: "Unable to open spreadsheet"
- Pastikan SPREADSHEET_ID benar
- Pastikan service account punya akses ke spreadsheet
- Check sharing permissions di Google Sheets

### Error: "Authentication failed"
- Verifikasi GOOGLE_APPLICATION_CREDENTIALS path
- Check format JSON credentials
- Pastikan service account aktif

### Error: "CORS blocked"
- Check CORS configuration di server
- Pastikan origin sesuai dengan frontend domain

### Port already in use
```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm start
```

## 📝 Changelog

### Version 1.0.0 (2025-03-08)
- ✅ Initial release
- ✅ Konversi dari Google Apps Script
- ✅ Google Sheets API integration
- ✅ RESTful API backend
- ✅ Responsive frontend (preserved from original)

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

MIT License - lihat file LICENSE

## 👥 Author

Converted from Google Apps Script to standalone web application.

---

**⚠️ IMPORTANT NOTES:**

1. Backup Google Sheets secara berkala
2. Monitor Google Sheets API quota usage
3. Implementasi proper error handling di production
4. Setup logging dan monitoring (PM2, Winston, dll)
5. Regular security updates untuk dependencies

Untuk pertanyaan atau issue, silakan buat issue di repository.
