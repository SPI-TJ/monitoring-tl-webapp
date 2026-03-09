/**
 * server/index.js
 * ============================================================================
 * FIX LOG:
 * 1. CORS  — trailing slash di allowedOrigins & kondisi !origin di production
 * 2. CSP   — helmet blocking fetch() calls & inline onclick handlers
 * 3. Route order — 404 handler harus SEBELUM wildcard app.get('*')
 * ============================================================================
 */

const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const compression = require('compression');
const morgan      = require('morgan');
const path        = require('path');
require('dotenv').config();

const authRoutes  = require('./routes/auth');
const dataRoutes  = require('./routes/data');
const usersRoutes = require('./routes/users');

const app      = express();
const PORT     = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// =============================================================================
// CORS — FIX #1
// Bug lama: trailing slash + !origin di-block saat production
// =============================================================================
const ALLOWED_ORIGINS = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/,
];

if (process.env.ALLOWED_ORIGINS) {
  process.env.ALLOWED_ORIGINS.split(',').forEach(o => {
    const trimmed = o.trim().replace(/\/$/, '');
    if (trimmed) ALLOWED_ORIGINS.push(trimmed);
  });
}

function isOriginAllowed(origin) {
  if (!origin) return true; // same-origin (Vercel) atau curl - selalu izinkan
  const clean = origin.replace(/\/$/, '');
  return ALLOWED_ORIGINS.some(a => a instanceof RegExp ? a.test(clean) : a === clean);
}

app.use(cors({
  origin: (origin, cb) => {
    if (isOriginAllowed(origin)) return cb(null, true);
    console.warn(`[CORS] Blocked: ${origin}`);
    cb(new Error(`CORS: origin tidak diizinkan — ${origin}`));
  },
  credentials  : true,
  methods      : ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options('*', cors());

// =============================================================================
// HELMET / CSP — FIX #2
// Bug lama: CSP block fetch() calls dan inline onclick di innerHTML
// Solution: disable CSP (SPA dengan dynamic innerHTML sangat susah di-CSP)
// =============================================================================
app.use(helmet({
  contentSecurityPolicy    : false,
  crossOriginEmbedderPolicy: false,
}));

// =============================================================================
// MIDDLEWARE
// =============================================================================
app.use(compression());
app.use(morgan(NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public'), {
  maxAge: '1h',
  etag  : true,
}));

// =============================================================================
// API ROUTES — FIX #3: urutan WAJIB benar
// =============================================================================
app.get('/api/health', (req, res) => {
  res.json({
    status     : 'ok',
    timestamp  : new Date().toISOString(),
    uptime     : process.uptime(),
    environment: NODE_ENV,
    sheets     : process.env.GOOGLE_SHEETS_ID    ? 'OK' : 'MISSING',
    credentials: process.env.GOOGLE_CLIENT_EMAIL ? 'OK' : 'MISSING',
  });
});

app.use('/api/auth',  authRoutes);
app.use('/api/data',  dataRoutes);
app.use('/api/users', usersRoutes);

// API 404 — SEBELUM wildcard
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: `Endpoint tidak ditemukan: ${req.originalUrl}` });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global error handler — 4 params wajib, taruh paling akhir
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const isCors = err.message && err.message.includes('CORS');
  if (!isCors) console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: NODE_ENV === 'production' && !isCors ? 'Internal server error' : err.message,
  });
});

// =============================================================================
// START — lokal saja, Vercel pakai module.exports
// =============================================================================
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n🚀 http://localhost:${PORT} [${NODE_ENV}]`);
    console.log(`   Sheets : ${process.env.GOOGLE_SHEETS_ID    ? '✓' : '✗ GOOGLE_SHEETS_ID missing'}`);
    console.log(`   Google : ${process.env.GOOGLE_CLIENT_EMAIL ? '✓' : '✗ GOOGLE_CLIENT_EMAIL missing'}`);
    console.log(`   JWT    : ${process.env.JWT_SECRET          ? '✓' : '✗ JWT_SECRET missing'}\n`);
  });
}

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT',  () => process.exit(0));

module.exports = app;
