/**
 * server/index.js
 * Entry point Express — bisa dijalankan lokal & Vercel serverless.
 */

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');
const userRoutes = require('./routes/users');

const app = express();

// ─── CORS CONFIG ──────────────────────────────────────────────────────────────
/**
 * Kenapa tidak pakai ALLOWED_ORIGIN saja?
 * - Frontend & backend ada di domain Vercel yang SAMA → browser tidak kirim Origin header
 *   untuk same-origin request, jadi cors() tidak perlu di-trigger sama sekali.
 * - Vercel preview deployments punya URL dinamis (xxx-git-branch-xxx.vercel.app)
 *   yang tidak bisa di-hardcode.
 * - Solusi terbaik: izinkan semua *.vercel.app + localhost + origin yang dikonfigurasi.
 */
const ALLOWED_ORIGINS = [
  // Localhost untuk development
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  // Semua subdomain Vercel (termasuk preview deployments)
  /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/,
];

// Jika ALLOWED_ORIGIN di-set (custom domain), tambahkan ke whitelist
if (process.env.ALLOWED_ORIGIN) {
  // Bisa berupa comma-separated list: "https://a.com,https://b.com"
  process.env.ALLOWED_ORIGIN.split(',').forEach(o => {
    const trimmed = o.trim();
    if (trimmed) ALLOWED_ORIGINS.push(trimmed);
  });
}

function isOriginAllowed(origin) {
  // Tidak ada Origin header = same-origin request atau server-to-server → izinkan
  if (!origin) return true;

  return ALLOWED_ORIGINS.some(allowed => {
    if (allowed instanceof RegExp) return allowed.test(origin);
    return allowed === origin;
  });
}

app.use(cors({
  origin: function (origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error(`The CORS policy for this site does not allow access from origin: ${origin}`));
    }
  },
  credentials: true,
  methods     : ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Pastikan preflight OPTIONS request selalu dijawab
app.options('*', cors());

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── STATIC FILES ─────────────────────────────────────────────────────────────
// Sajikan folder public/ — berisi index.html dan asset frontend
app.use(express.static(path.join(__dirname, '../public')));

// ─── API ROUTES ───────────────────────────────────────────────────────────────
app.use('/api/auth',  authRoutes);
app.use('/api/data',  dataRoutes);
app.use('/api/users', userRoutes);

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status   : 'ok',
    timestamp: new Date().toISOString(),
    env      : process.env.NODE_ENV || 'development',
  });
});

// ─── SPA FALLBACK ─────────────────────────────────────────────────────────────
// Semua request non-API yang tidak match dikembalikan ke index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ─── ERROR HANDLER GLOBAL ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ success: false, message: 'Internal server error: ' + err.message });
});

// ─── START SERVER (local dev) ─────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`
  ╔══════════════════════════════════════════════╗
  ║  🚀 Audit Monitoring Server Running           ║
  ║  ➜ Local:   http://localhost:${PORT}           ║
  ║  ➜ Mode:    ${(process.env.NODE_ENV || 'development').padEnd(14)}              ║
  ╚══════════════════════════════════════════════╝
    `);
  });
}

// Ekspor untuk Vercel serverless
module.exports = app;
