const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const logger = require('./logger');
const { executeQuery } = require('../database');
const { createTransporter, buildVerificationLink } = require('./email');

const router = express.Router();

// (createTransporter imported from email helper)

// Email verification request
router.post('/send-verification', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).send('Email is required');

    const checkUsersResult = await executeQuery('SELECT id FROM users WHERE email = ?', [email]);
    const checkVendorsResult = await executeQuery('SELECT id FROM vendors WHERE email = ?', [email]);
    if ((checkUsersResult.success && checkUsersResult.data.length > 0) || (checkVendorsResult.success && checkVendorsResult.data.length > 0)) {
      return res.status(400).send('Email already registered');
    }

    const token = crypto.randomBytes(32).toString('hex');

    await executeQuery('INSERT INTO users (email, verification_token, is_verified) VALUES (?, ?, FALSE) ON DUPLICATE KEY UPDATE verification_token = ?', [email, token, token]);
    await executeQuery('INSERT INTO vendors (email, verification_token, is_verified) VALUES (?, ?, FALSE) ON DUPLICATE KEY UPDATE verification_token = ?', [email, token, token]);

  const verificationLink = buildVerificationLink(token, email);

    const mailOptions = {
      from: process.env.EMAIL_USER || 'your-email@gmail.com',
      to: email,
      subject: 'Verify your email for Grabrush',
      html: `<h2>Welcome to Grabrush!</h2><p>Please click the link below to verify your email and complete your registration:</p><a href="${verificationLink}">Verify Email</a>`
    };

    try {
      const transporter = createTransporter();
      await transporter.sendMail(mailOptions);
      res.redirect('/verify-email?sent=true');
    } catch (emailError) {
      logger.error('Email sending failed', emailError);
      res.redirect(`/verify-email?error=${encodeURIComponent('Email sending failed. Please check config.')}`);
    }
  } catch (error) {
    logger.error('Email verification error', error);
    res.status(500).send('Error sending verification email');
  }
});

// Registration (user & vendor)
router.post('/register', async (req, res) => {
  try {
    const { userType, email, password, token, name, street, city, zip, phone, businessName, location, businessContact } = req.body;
    if (!token || !email) return res.status(400).send('Token and email are required');
    const hashedPassword = await bcrypt.hash(password, 10);

    if (userType === 'vendor') {
      if (!businessName || !password || !location || !businessContact) {
        return res.status(400).send('Business Name, Password, Location, and Business Contact No. are required');
      }

      const vendorTokenResult = await executeQuery('SELECT id FROM vendors WHERE email = ? AND verification_token = ?', [email, token]);
      if (!vendorTokenResult.success || vendorTokenResult.data.length === 0) {
        const vendorEmailResult = await executeQuery('SELECT id FROM vendors WHERE email = ?', [email]);
        if (vendorEmailResult.success && vendorEmailResult.data.length > 0) {
          await executeQuery('UPDATE vendors SET verification_token = ? WHERE email = ?', [token, email]);
        } else {
          await executeQuery('INSERT INTO vendors (email, verification_token, is_verified) VALUES (?, ?, FALSE)', [email, token]);
        }
      }

      const vendorResult = await executeQuery(`UPDATE vendors SET business_name = ?, password = ?, location = ?, business_contact = ?, is_verified = TRUE, verification_token = NULL WHERE email = ? AND verification_token = ?`, [businessName, hashedPassword, location, businessContact, email, token]);
      if (vendorResult.success) return res.redirect('/?success=Registration successful! Please login.');
      return res.redirect('/register?error=' + encodeURIComponent('Vendor registration failed'));
    }

    if (!name || !email || !password) return res.status(400).send('Name, email, and password are required');

    const tokenResult = await executeQuery('SELECT id FROM users WHERE email = ? AND verification_token = ?', [email, token]);
    if (!tokenResult.success || tokenResult.data.length === 0) return res.status(400).send('Invalid or expired verification token');

    const userUpdate = await executeQuery(`UPDATE users SET name = ?, password = ?, street = ?, city = ?, zip = ?, phone = ?, is_verified = TRUE, verification_token = NULL WHERE email = ? AND verification_token = ?`, [name, hashedPassword, street || null, city || null, zip || null, phone || null, email, token]);
    if (userUpdate.success) return res.redirect('/?success=Registration successful! Please login.');
    return res.redirect('/register?error=' + encodeURIComponent('Registration failed'));
  } catch (error) {
    logger.error('Registration error', error);
    res.redirect('/register?error=' + encodeURIComponent(error.message));
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).send('Email and password are required');

    const userResult = await executeQuery('SELECT * FROM users WHERE email = ? AND (is_verified = TRUE OR is_verified IS NULL)', [email]);
    let user = null; let userType = 'customer';
    if (userResult.success && userResult.data.length > 0) {
      user = userResult.data[0];
    } else {
      const vendorResult = await executeQuery('SELECT * FROM vendors WHERE email = ? AND (is_verified = TRUE OR is_verified IS NULL)', [email]);
      if (vendorResult.success && vendorResult.data.length > 0) { user = vendorResult.data[0]; userType = 'vendor'; }
    }
    if (!user) return res.redirect('/?error=' + encodeURIComponent('Invalid email or password'));
    if (!user.password) return res.redirect('/?error=' + encodeURIComponent('Please complete your registration first'));

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) return res.redirect('/?error=' + encodeURIComponent('Invalid email or password'));

    req.session.userId = user.id; req.session.userEmail = user.email; req.session.userType = userType;
    req.session.userName = userType === 'vendor' ? user.business_name : user.name;

    if (userType === 'vendor') return res.redirect('/vendor/dashboard');
    res.redirect('/welcome');
  } catch (error) {
    logger.error('Login error', error);
    res.redirect('/?error=' + encodeURIComponent('Login failed'));
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).send('Could not log out');
    res.redirect('/');
  });
});

module.exports = router;