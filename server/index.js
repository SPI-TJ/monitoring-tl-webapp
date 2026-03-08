/**
 * ============================================================================
 * AUDIT MONITORING WEB APPLICATION - SERVER ENTRY POINT
 * ============================================================================
 * 
 * Main Express server dengan Google Sheets API integration
 * 
 * @author Miftahur Rizki
 * @version 1.0.0
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');
const usersRoutes = require('./routes/users');

// =============================================================================
// APP INITIALIZATION
// =============================================================================

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// =============================================================================
// MIDDLEWARE CONFIGURATION
// =============================================================================

// Security headers - RELAXED FOR DEVELOPMENT
if (NODE_ENV === 'production') {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));
} else {
  // Development mode - disable CSP
  app.use(helmet({
    contentSecurityPolicy: false,
  }));
}

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1 && NODE_ENV === 'production') {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// Compression for response bodies
app.use(compression());

// Request logging (development mode)
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// =============================================================================
// API ROUTES
// =============================================================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    version: '1.0.0'
  });
});

// Authentication routes
app.use('/api/auth', authRoutes);

// Data management routes
app.use('/api/data', dataRoutes);

// User management routes
app.use('/api/users', usersRoutes);

// =============================================================================
// SERVE FRONTEND
// =============================================================================

// All other routes serve index.html (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = NODE_ENV === 'development' 
    ? err.message 
    : 'Internal server error';
  
  res.status(statusCode).json({
    success: false,
    message: message,
    ...(NODE_ENV === 'development' && { stack: err.stack })
  });
});

// =============================================================================
// SERVER START
// =============================================================================

app.listen(PORT, () => {
  console.log('='.repeat(70));
  console.log('🚀 AUDIT MONITORING WEB APPLICATION');
  console.log('='.repeat(70));
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`📊 Spreadsheet ID: ${process.env.SPREADSHEET_ID ? '✓ Configured' : '✗ Missing'}`);
  console.log(`🔐 Google Credentials: ${
    process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CREDENTIALS_JSON 
      ? '✓ Configured' 
      : '✗ Missing'
  }`);
  console.log('='.repeat(70));
  console.log(`\n📝 API Documentation:`);
  console.log(`   - Health Check: http://localhost:${PORT}/api/health`);
  console.log(`   - Login: POST http://localhost:${PORT}/api/auth/login`);
  console.log(`   - Get Data: GET http://localhost:${PORT}/api/data`);
  console.log(`\n💡 Press Ctrl+C to stop the server\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;