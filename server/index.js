/**
 * ============================================================================
 * AUDIT MONITORING WEB APPLICATION — SERVER v2.0.0
 * ============================================================================
 *
 * Perubahan:
 *  - /api/health kini menampilkan queue depth & token bucket stats
 *  - Error handler menambahkan Retry-After header pada 503
 *  - Variabel .env baru didokumentasikan di startup log
 */

'use strict';

require('dotenv').config();

const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const compression = require('compression');
const morgan      = require('morgan');
const path        = require('path');

const authRoutes  = require('./routes/auth');
const dataRoutes  = require('./routes/data');
const usersRoutes = require('./routes/users');
const sheetsService = require('./services/sheetsService');

const app      = express();
const PORT     = process.env.PORT     || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

/* ── CORS ──────────────────────────────────────────── */
function cleanOrigin(o) { return typeof o === 'string' ? o.trim().replace(/\/$/, '') : o; }

const originAllowlist = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/,
];
if (process.env.ALLOWED_ORIGINS) {
  process.env.ALLOWED_ORIGINS.split(',').forEach(o => {
    const t = cleanOrigin(o); if (t) originAllowlist.push(t);
  });
}
function isOriginAllowed(origin) {
  if (!origin) return true;
  const c = cleanOrigin(origin);
  return originAllowlist.some(a => a instanceof RegExp ? a.test(c) : a === c);
}
app.use(cors({
  origin     : (origin, cb) => isOriginAllowed(origin) ? cb(null, true) : cb(new Error(`CORS blocked: ${origin}`)),
  credentials: true,
  methods    : ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());

/* ── Security / middleware ─────────────────────────── */
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(compression());
app.use(morgan(NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

/* ── Routes ────────────────────────────────────────── */

/**
 * GET /api/health
 * Tampilkan queue depth, token bucket, dan cache info.
 */
app.get('/api/health', (req, res) => {
  res.json({
    status     : 'ok',
    timestamp  : new Date().toISOString(),
    environment: NODE_ENV,
    uptime     : process.uptime(),
    version    : '2.0.0',
    sheets     : sheetsService.stats(),
  });
});

/**
 * GET /api/cache/invalidate  (opsional, untuk force-refresh manual)
 * Query: ?sheet=Data  atau tanpa param = semua sheet
 */
app.get('/api/cache/invalidate', (req, res) => {
  const sheet = req.query.sheet || null;
  sheetsService.invalidateCache(sheet);
  res.json({ success: true, invalidated: sheet || 'all' });
});

app.use('/api/auth',  authRoutes);
app.use('/api/data',  dataRoutes);
app.use('/api/users', usersRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found', path: req.originalUrl });
});

/* ── SPA fallback ──────────────────────────────────── */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

/* ── Error handler ─────────────────────────────────── */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status  = err.statusCode || err.status || 500;
  const message = NODE_ENV === 'development' ? err.message : 'Internal server error';
  if (NODE_ENV === 'development') console.error('Server error:', err);

  // Berikan petunjuk client untuk retry setelah 5 detik jika 503
  if (status === 503) res.set('Retry-After', '5');

  res.status(status).json({
    success: false,
    message,
    ...(NODE_ENV === 'development' && { stack: err.stack }),
  });
});

/* ── Start (lokal) ─────────────────────────────────── */
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT} [${NODE_ENV}]`);
    console.log(`📊 SPREADSHEET_ID    : ${process.env.SPREADSHEET_ID ? '✓' : '✗ missing'}`);
    console.log(`🔐 GOOGLE creds      : ${process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CREDENTIALS_JSON ? '✓' : '✗ missing'}`);
    console.log(`⚡ Write RPM limit   : ${process.env.SHEETS_WRITE_RPM  || 55}`);
    console.log(`📦 Read cache TTL    : ${process.env.SHEETS_READ_TTL   || 15000} ms`);
    console.log(`📋 Header cache TTL  : ${process.env.SHEETS_HDR_TTL    || 300000} ms`);
    console.log(`🔁 Max write retries : ${process.env.SHEETS_MAX_RETRY  || 4}`);
    console.log(`📬 Max queue depth   : ${process.env.SHEETS_MAX_QUEUE  || 200}`);
  });
}

module.exports = app;