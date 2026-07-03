// ============================================================
// server.js
// Application entry point. Wires together middleware, static
// assets, and API routes; starts the HTTP server.
// ============================================================

require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { testConnection } = require('./config/db');
const checkRoutes = require('./routes/checkRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// ------------------------------------------------------------
// Trust the first proxy in front of this app (Nginx, Heroku,
// AWS, Cloudflare, etc.) so req.ip reflects the real visitor
// IP from X-Forwarded-For rather than the proxy's own address.
// If you are NOT behind a proxy, set this to false.
// ------------------------------------------------------------
app.set('trust proxy', true);

// ------------------------------------------------------------
// Security headers
// ------------------------------------------------------------
app.use(helmet());

// ------------------------------------------------------------
// Basic rate limiting to slow down abuse/scraping of the
// public check endpoint. Tune limits to your expected traffic.
// ------------------------------------------------------------
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per IP per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please try again in a moment.',
  },
});
app.use('/api/', apiLimiter);

// ------------------------------------------------------------
// Body parsing (not strictly needed for GET-only endpoints,
// but included for completeness / future POST endpoints)
// ------------------------------------------------------------
app.use(express.json());

// ------------------------------------------------------------
// Static frontend assets (HTML/CSS/JS)
// ------------------------------------------------------------
app.use(express.static(path.join(__dirname, 'public')));

// ------------------------------------------------------------
// API routes
// ------------------------------------------------------------
app.use('/api', checkRoutes);

// ------------------------------------------------------------
// The public-facing link:  https://example.com/check?agent_id=ABC123
// Serves the frontend page; the page's JS reads agent_id from
// the URL itself and calls /api/check.
// ------------------------------------------------------------
app.get('/check', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'check.html'));
});

// Friendly root redirect
app.get('/', (req, res) => {
  res.redirect('/check');
});

// ------------------------------------------------------------
// 404 handler
// ------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found.' });
});

// ------------------------------------------------------------
// Centralized error handler (catches anything thrown/passed
// via next(err) that wasn't already handled)
// ------------------------------------------------------------
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ success: false, error: 'Internal server error.' });
});

// ------------------------------------------------------------
// Start server after verifying DB connectivity
// ------------------------------------------------------------
async function start() {
  try {
    await testConnection();
    app.listen(PORT, () => {
      console.log(`[Server] IP Checker running on http://localhost:${PORT}`);
      console.log(`[Server] Example link: http://localhost:${PORT}/check?agent_id=ABC123`);
    });
  } catch (err) {
    console.error('[Startup] Failed to connect to database:', err.message);
    process.exit(1);
  }
}

start();
