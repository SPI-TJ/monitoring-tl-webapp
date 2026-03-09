/**
 * ============================================================================
 * AUDIT MONITORING WEB APPLICATION - SERVER ENTRY POINT
 * ============================================================================
 *
 * Express server untuk lokal & Vercel (serverless).
 * Di Vercel, server TIDAK boleh memanggil app.listen().
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');
const usersRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// =============================================================================
// CORS (kompatibel untuk Vercel preview + production)
// =============================================================================

function cleanOrigin(origin) {
  return typeof origin === 'string' ? origin.trim().replace(/\/$/, '') : origin;
}

const originAllowlist = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/,
];

if (process.env.ALLOWED_ORIGINS) {
  process.env.ALLOWED_ORIGINS.split(',').forEach((o) => {
    const trimmed = cleanOrigin(o);
    if (trimmed) originAllowlist.push(trimmed);
  });
}

function isOriginAllowed(origin) {
  // Tanpa Origin header: same-origin (umum di Vercel) atau server-to-server → izinkan
  if (!origin) return true;
  const clean = cleanOrigin(origin);
  return originAllowlist.some((allowed) => {
    if (allowed instanceof RegExp) return allowed.test(clean);
    return allowed === clean;
  });
}

app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options('*', cors());

// =============================================================================
// SECURITY HEADERS
// =============================================================================
// SPA ini banyak inline script/handler, jadi CSP ketat berpotensi memblokir UI.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// =============================================================================
// MIDDLEWARE
// =============================================================================

app.use(compression());
app.use(morgan(NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static frontend
app.use(express.static(path.join(__dirname, '../public')));

// =============================================================================
// API ROUTES
// =============================================================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    uptime: process.uptime(),
    version: '1.0.0',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/users', usersRoutes);

// API 404 harus sebelum fallback SPA
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl,
  });
});

// =============================================================================
// SPA FALLBACK
// =============================================================================

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = NODE_ENV === 'development' ? err.message : 'Internal server error';
  if (NODE_ENV === 'development') console.error('Server error:', err);
  res.status(statusCode).json({
    success: false,
    message,
    ...(NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// =============================================================================
// START SERVER (lokal saja)
// =============================================================================

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT} [${NODE_ENV}]`);
    console.log(`📊 SPREADSHEET_ID: ${process.env.SPREADSHEET_ID ? '✓' : '✗ missing'}`);
    console.log(`🔐 GOOGLE creds: ${
      process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CREDENTIALS_JSON
        ? '✓'
        : '✗ missing'
    }`);
  });
}

module.exports = app;