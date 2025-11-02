const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();
const { testConnection, executeQuery, closeConnection } = require('./database');
const rateLimit = require('express-rate-limit');
// Modular routers & shared logger
const authRoutes = require('./src/authRoutes');
const { router: vendorRoutes } = require('./src/vendorRoutes');
const logger = require('./src/logger');

const app = express();
const PORT = process.env.PORT || 9000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Session middleware
app.use(session({
  secret: 'grabush-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true, sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 }
}));

// Rate limiters (kept central)
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { success: false, error: 'Too many login attempts. Please try again later.' } });
const vendorApiLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, message: { success: false, error: 'Rate limit exceeded. Slow down.' } });
app.use('/login', loginLimiter);
app.use('/vendor', vendorApiLimiter);

// Email configuration function (using Gmail as example)
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',  // Replace with your Gmail
      pass: process.env.EMAIL_PASS || 'your-app-password'      // Replace with your App Password
    }
  });
};

// Serve the login page
app.get('/', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/food-photos');
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve the email verification page
app.get('/verify-email', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'verify-email.html'));
});

// Serve the register page
app.get('/register', (req, res) => {
  const token = req.query.token;
  if (!token) {
    return res.redirect('/verify-email');
  }
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Serve the food photos page
app.get('/food-photos', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'food-photos.html'));
});

// Aggregated router mounts auth, general, and vendor routes
const { buildRouter } = require('./src/routes');
app.use('/', buildRouter());

// (Removed large inline auth & vendor route implementations - now handled by modular routers)

// Get all users endpoint (for admin purposes)
app.get('/users', async (req, res) => {
  try {
    const result = await executeQuery('SELECT id, name, email, street, city, zip, phone, created_at FROM users WHERE is_verified = TRUE ORDER BY created_at DESC');
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// /welcome now handled in generalRoutes

// Start server
const { initDatabase } = require('./src/bootstrap');
app.listen(PORT, async () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  const isConnected = await testConnection();
  if (!isConnected) {
    logger.error('Database connection failed. Please check configuration.');
    return;
  }
  logger.info('Database connected successfully');
  await initDatabase();
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await closeConnection();
  process.exit(0);
});