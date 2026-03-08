# 📘 Setup Guide - Audit Monitoring Web Application

Panduan lengkap untuk setup dan deployment aplikasi Audit Monitoring.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Google Cloud Setup](#google-cloud-setup)
3. [Google Sheets Setup](#google-sheets-setup)
4. [Local Development Setup](#local-development-setup)
5. [Testing](#testing)
6. [Production Deployment](#production-deployment)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Sebelum memulai, pastikan Anda memiliki:

- ✅ Node.js versi 16 atau lebih baru
- ✅ npm atau yarn package manager
- ✅ Google Account
- ✅ Google Spreadsheet dengan data audit
- ✅ Text editor (VS Code recommended)
- ✅ Terminal/Command Prompt

---

## Google Cloud Setup

### Step 1: Buat Google Cloud Project

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Isi nama project (contoh: `audit-monitoring-prod`)
4. Click **Create**

### Step 2: Enable Google Sheets API

1. Di Google Cloud Console, buka **APIs & Services** → **Library**
2. Cari "Google Sheets API"
3. Click **Enable**

### Step 3: Buat Service Account

1. Buka **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service Account**
3. Isi detail:
   - **Service account name**: `audit-monitoring-sa`
   - **Service account ID**: (auto-generated)
   - **Description**: `Service account for Audit Monitoring App`
4. Click **Create and Continue**
5. Grant role: **Editor** (atau minimal **Google Sheets Editor**)
6. Click **Done**

### Step 4: Download Service Account Key

1. Di halaman **Credentials**, find service account yang baru dibuat
2. Click email service account
3. Tab **Keys** → **Add Key** → **Create new key**
4. Pilih format **JSON**
5. Click **Create** - file JSON akan ter-download
6. **PENTING**: Simpan file ini dengan aman!

---

## Google Sheets Setup

### Step 1: Persiapkan Spreadsheet

Buat atau gunakan Google Spreadsheet existing dengan 2 sheets:

#### Sheet: "Data"

Header row (Row 1):

```
No | Tanggal Laporan | Jenis Pemeriksaan | Kategori Pemeriksaan | Judul Audit | Temuan Pemeriksaan | Rekomendasi | Tindak Lanjut | Due Date | Tanggapan Auditee | Status | Kode Direktorat | Divisi | Departemen | Progres% | Request Close | Link Evidence | Tanggal Close | Last Updated
```

#### Sheet: "Users"

Header row (Row 1):

```
Username | Password | Role | Divisi | Nama
```

**Contoh data users:**

| Username | Password | Role | Divisi | Nama |
|----------|----------|------|--------|------|
| admin | admin123 | Admin | IT | Administrator |
| pic.finance | pass123 | PIC | Finance | John Doe |

### Step 2: Share Spreadsheet dengan Service Account

1. Buka Google Spreadsheet Anda
2. Click **Share** button
3. Paste **email service account** (dari step Google Cloud)
   - Format: `audit-monitoring-sa@project-id.iam.gserviceaccount.com`
4. Berikan permission **Editor**
5. Uncheck "Notify people"
6. Click **Share**

### Step 3: Copy Spreadsheet ID

Dari URL spreadsheet:
```
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
```

Copy bagian `SPREADSHEET_ID_HERE`

---

## Local Development Setup

### Step 1: Clone/Download Project

```bash
# Jika dari Git
git clone <repository-url>
cd audit-monitoring-webapp

# Atau extract ZIP file
cd audit-monitoring-webapp
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Setup Environment Variables

```bash
# Copy template
cp .env.example .env

# Edit file
nano .env   # atau gunakan text editor favorit
```

Isi file `.env`:

```env
# Server
PORT=3000
NODE_ENV=development

# Google Sheets
SPREADSHEET_ID=your-spreadsheet-id-here
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@project.iam.gserviceaccount.com

# Path ke JSON credentials
GOOGLE_APPLICATION_CREDENTIALS=./credentials/service-account-key.json
```

### Step 4: Setup Credentials

```bash
# Buat folder credentials
mkdir credentials

# Copy file JSON key yang di-download ke folder credentials
cp ~/Downloads/your-service-account-key.json ./credentials/service-account-key.json

# Set permission (Linux/Mac only)
chmod 600 ./credentials/service-account-key.json
```

### Step 5: Verify Configuration

File structure Anda sekarang:

```
audit-monitoring-webapp/
├── credentials/
│   └── service-account-key.json  ✓
├── public/
│   ├── index.html
│   └── js/
│       └── api.js
├── server/
│   ├── index.js
│   ├── routes/
│   └── services/
├── .env                          ✓
├── .env.example
├── package.json
└── README.md
```

---

## Testing

### Step 1: Start Development Server

```bash
npm run dev
```

Anda akan melihat output:

```
======================================================================
🚀 AUDIT MONITORING WEB APPLICATION
======================================================================
📡 Server running on: http://localhost:3000
🌍 Environment: development
📊 Spreadsheet ID: ✓ Configured
🔐 Google Credentials: ✓ Configured
======================================================================
```

### Step 2: Test di Browser

1. Buka browser: `http://localhost:3000`
2. Anda akan melihat halaman login
3. Test login dengan credentials dari Google Sheets
   - Username: `admin`
   - Password: `admin123`

### Step 3: Test Functionality

**Sebagai Admin:**
- ✅ View dashboard dengan statistik
- ✅ View semua data dari semua divisi
- ✅ Add new audit items
- ✅ Edit existing items
- ✅ Delete items
- ✅ Approve close requests
- ✅ Manage users

**Sebagai PIC:**
- ✅ View dashboard filtered by divisi
- ✅ View only own divisi data
- ✅ Update progress
- ✅ Request close items
- ✅ Cannot edit other divisi data

### Step 4: Test API Endpoints

```bash
# Health check
curl http://localhost:3000/api/health

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Get data (replace with your actual credentials)
curl http://localhost:3000/api/data?role=Admin
```

---

## Production Deployment

### Option 1: VPS (Ubuntu/Debian)

#### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx (reverse proxy)
sudo apt install -y nginx
```

#### Step 2: Deploy Application

```bash
# Upload files ke server (gunakan scp, rsync, atau Git)
scp -r audit-monitoring-webapp user@your-server:/var/www/

# SSH ke server
ssh user@your-server

# Navigate to project
cd /var/www/audit-monitoring-webapp

# Install dependencies (production only)
npm install --production

# Setup environment
cp .env.example .env
nano .env  # Edit dengan production credentials
```

#### Step 3: Upload Credentials

```bash
# Upload service account key
scp ~/Downloads/service-account-key.json user@your-server:/var/www/audit-monitoring-webapp/credentials/

# Set permission
chmod 600 /var/www/audit-monitoring-webapp/credentials/service-account-key.json
```

#### Step 4: Start with PM2

```bash
# Start application
pm2 start server/index.js --name audit-monitoring

# Setup auto-restart on reboot
pm2 startup
pm2 save

# Check status
pm2 status
pm2 logs audit-monitoring
```

#### Step 5: Configure Nginx

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/audit-monitoring
```

Paste configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:

```bash
# Enable configuration
sudo ln -s /etc/nginx/sites-available/audit-monitoring /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

#### Step 6: Setup SSL (Optional but Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal test
sudo certbot renew --dry-run
```

### Option 2: Heroku

```bash
# Install Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# Create app
heroku create audit-monitoring-app

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set SPREADSHEET_ID=your-spreadsheet-id
heroku config:set GOOGLE_SERVICE_ACCOUNT_EMAIL=your-email

# Set credentials (paste entire JSON as single line)
heroku config:set GOOGLE_CREDENTIALS_JSON='{"type":"service_account",...}'

# Deploy
git push heroku main

# Open app
heroku open

# View logs
heroku logs --tail
```

### Option 3: Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Set environment variables in Vercel Dashboard
# - SPREADSHEET_ID
# - GOOGLE_SERVICE_ACCOUNT_EMAIL  
# - GOOGLE_CREDENTIALS_JSON

# Deploy to production
vercel --prod
```

---

## Troubleshooting

### Error: "Unable to open spreadsheet"

**Solusi:**
1. Verify SPREADSHEET_ID di `.env`
2. Check sharing permissions di Google Sheets
3. Verify service account email yang di-share

### Error: "Authentication failed"

**Solusi:**
1. Check GOOGLE_APPLICATION_CREDENTIALS path
2. Verify JSON file tidak corrupt
3. Regenerate service account key jika perlu

### Error: "Port already in use"

**Solusi:**
```bash
# Find process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm start
```

### Error: "CORS blocked"

**Solusi:**
1. Update ALLOWED_ORIGINS di `.env`
2. Restart server

### Google Sheets quota exceeded

**Solusi:**
1. Monitor usage di Google Cloud Console
2. Implement caching jika perlu
3. Optimize API calls

---

## 🎉 Selesai!

Aplikasi Anda sekarang sudah running. Untuk pertanyaan lebih lanjut, check:

- 📖 [README.md](README.md) - Overview & API documentation
- 🐛 GitHub Issues - Report bugs
- 📧 Email support

**Good luck! 🚀**
