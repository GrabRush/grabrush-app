const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();
const { testConnection, executeQuery, closeConnection } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Session middleware
app.use(session({
  secret: 'grabush-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

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

// Handle email verification request
app.post('/send-verification', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).send('Email is required');
    }

    // Check if email already exists in users or vendors
    const checkUsersQuery = 'SELECT id FROM users WHERE email = ?';
    const checkVendorsQuery = 'SELECT id FROM vendors WHERE email = ?';
    const checkUsersResult = await executeQuery(checkUsersQuery, [email]);
    const checkVendorsResult = await executeQuery(checkVendorsQuery, [email]);
    
    if ((checkUsersResult.success && checkUsersResult.data.length > 0) || 
        (checkVendorsResult.success && checkVendorsResult.data.length > 0)) {
      return res.status(400).send('Email already registered');
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Store token in database (create a temporary record in both tables for flexibility)
    // The actual registration will determine which table to use
    const insertUsersTokenQuery = 'INSERT INTO users (email, verification_token, is_verified) VALUES (?, ?, FALSE) ON DUPLICATE KEY UPDATE verification_token = ?';
    const insertVendorsTokenQuery = 'INSERT INTO vendors (email, verification_token, is_verified) VALUES (?, ?, FALSE) ON DUPLICATE KEY UPDATE verification_token = ?';
    await executeQuery(insertUsersTokenQuery, [email, token, token]);
    await executeQuery(insertVendorsTokenQuery, [email, token, token]);

    // Send verification email
    const baseUrl = process.env.NODE_ENV === 'production' ? 'https://grabrush.shop' : `http://localhost:${PORT}`;
    const verificationLink = `${baseUrl}/register?token=${token}&email=${encodeURIComponent(email)}`;
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'your-email@gmail.com',
      to: email,
      subject: 'Verify your email for Grabrush',
      html: `
        <h2>Welcome to Grabrush!</h2>
        <p>Please click the link below to verify your email and complete your registration:</p>
        <a href="${verificationLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
        <p>If the button doesn't work, copy and paste this link: ${verificationLink}</p>
      `
    };

    try {
      const transporter = createTransporter();
      await transporter.sendMail(mailOptions);
      res.redirect('/verify-email?sent=true');
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      res.redirect(`/verify-email?error=${encodeURIComponent('Email sending failed. Please check your email configuration.')}`);
    }

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).send('Error sending verification email');
  }
});

// Handle user registration
app.post('/register', async (req, res) => {
  try {
    const { userType, email, password, token, name, street, city, zip, phone, businessName, location, businessContact } = req.body;

    // Validate token first
    if (!token || !email) {
      return res.status(400).send('Token and email are required');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    if (userType === 'vendor') {
      // Vendor registration
      if (!businessName || !password || !location || !businessContact) {
        return res.status(400).send('Business Name, Password, Location, and Business Contact No. are required');
      }

      // Check if email exists in vendors table with matching token
      const checkVendorQuery = 'SELECT id FROM vendors WHERE email = ? AND verification_token = ?';
      const vendorTokenResult = await executeQuery(checkVendorQuery, [email, token]);
      
      if (!vendorTokenResult.success || vendorTokenResult.data.length === 0) {
        // Check if vendor email exists at all
        const checkVendorEmailQuery = 'SELECT id FROM vendors WHERE email = ?';
        const vendorEmailResult = await executeQuery(checkVendorEmailQuery, [email]);
        
        if (vendorEmailResult.success && vendorEmailResult.data.length > 0) {
          // Update existing vendor record with token
          const updateTokenQuery = 'UPDATE vendors SET verification_token = ? WHERE email = ?';
          await executeQuery(updateTokenQuery, [token, email]);
        } else {
          // Create new vendor entry with token
          const createVendorQuery = 'INSERT INTO vendors (email, verification_token, is_verified) VALUES (?, ?, FALSE)';
          await executeQuery(createVendorQuery, [email, token]);
        }
      }

      // Update vendor with registration details
      const updateVendorQuery = `
        UPDATE vendors 
        SET business_name = ?, password = ?, location = ?, business_contact = ?, is_verified = TRUE, verification_token = NULL 
        WHERE email = ? AND verification_token = ?
      `;
      
      const vendorResult = await executeQuery(updateVendorQuery, [
        businessName, hashedPassword, location, businessContact, email, token
      ]);

      if (vendorResult.success) {
        res.redirect('/?success=Registration successful! Please login.');
      } else {
        res.redirect('/register?error=' + encodeURIComponent('Vendor registration failed'));
      }
    } else {
      // Customer registration
      if (!name || !email || !password) {
        return res.status(400).send('Name, email, and password are required');
      }

      // Verify token
      const tokenQuery = 'SELECT id FROM users WHERE email = ? AND verification_token = ?';
      const tokenResult = await executeQuery(tokenQuery, [email, token]);
      
      if (!tokenResult.success || tokenResult.data.length === 0) {
        return res.status(400).send('Invalid or expired verification token');
      }

      // Update user with registration details
      const updateQuery = `
        UPDATE users 
        SET name = ?, password = ?, street = ?, city = ?, zip = ?, phone = ?, is_verified = TRUE, verification_token = NULL 
        WHERE email = ? AND verification_token = ?
      `;
      
      const result = await executeQuery(updateQuery, [
        name, hashedPassword, street || null, city || null, zip || null, phone || null, email, token
      ]);

      if (result.success) {
        res.redirect('/?success=Registration successful! Please login.');
      } else {
        res.redirect('/register?error=' + encodeURIComponent('Registration failed'));
      }
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.redirect('/register?error=' + encodeURIComponent(error.message));
  }
});

// Handle login
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send('Email and password are required');
    }

    // Check users table first
    const userQuery = 'SELECT * FROM users WHERE email = ? AND (is_verified = TRUE OR is_verified IS NULL)';
    const userResult = await executeQuery(userQuery, [email]);

    let user = null;
    let userType = 'customer';

    if (userResult.success && userResult.data.length > 0) {
      user = userResult.data[0];
    } else {
      // Check vendors table if not found in users
      const vendorQuery = 'SELECT * FROM vendors WHERE email = ? AND (is_verified = TRUE OR is_verified IS NULL)';
      const vendorResult = await executeQuery(vendorQuery, [email]);
      
      if (vendorResult.success && vendorResult.data.length > 0) {
        user = vendorResult.data[0];
        userType = 'vendor';
      }
    }

    if (!user) {
      return res.redirect('/?error=' + encodeURIComponent('Invalid email or password'));
    }

    // Check password
    if (!user.password) {
      return res.redirect('/?error=' + encodeURIComponent('Please complete your registration first'));
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.redirect('/?error=' + encodeURIComponent('Invalid email or password'));
    }

    // Set session
    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.userType = userType;
    
    // Set name based on user type
    if (userType === 'vendor') {
      req.session.userName = user.business_name;
    } else {
      req.session.userName = user.name;
    }

    res.redirect('/welcome');
  } catch (error) {
    console.error('Login error:', error);
    res.redirect('/?error=' + encodeURIComponent('Login failed'));
  }
});

// Handle logout
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Could not log out');
    }
    res.redirect('/');
  });
});

// Get all users endpoint (for admin purposes)
app.get('/users', async (req, res) => {
  try {
    const result = await executeQuery('SELECT id, name, email, street, city, zip, phone, created_at FROM users WHERE is_verified = TRUE ORDER BY created_at DESC');
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Welcome page after successful login
app.get('/welcome', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/');
  }
  const fullName = req.session.userName || 'Food lover';
  const firstName = String(fullName).split(' ')[0] || 'Food lover';
  const userType = req.session.userType || 'customer';
  
  let grid = '';
  
  if (userType === 'vendor') {
    // Restaurant photos with names for vendors
    const restaurants = [
      { name: 'Bella Vista Restaurant', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop' },
      { name: 'The Gourmet Kitchen', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1200&auto=format&fit=crop' },
      { name: 'Seaside Bistro', image: 'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?q=80&w=1200&auto=format&fit=crop' },
      { name: 'Mountain View Cafe', image: 'https://images.unsplash.com/photo-1515669097368-22e68427d265?q=80&w=1200&auto=format&fit=crop' },
      { name: 'Downtown Diner', image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1200&auto=format&fit=crop' },
      { name: 'The Rustic Table', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop' }
    ];
    grid = restaurants.map(restaurant => `
      <div class="restaurant-item">
        <img src="${restaurant.image}" alt="${restaurant.name}" loading="lazy">
        <div class="restaurant-name">${restaurant.name}</div>
      </div>
    `).join('');
  } else {
    // Food photos for customers
    const images = [
      'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1543339308-43f6c2d88c36?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1526318472351-c75fcf070305?q=80&w=1200&auto=format&fit=crop'
    ];
    grid = images.map(src => `<img src="${src}" alt="Food" loading="lazy">`).join('');
  }
  
  const html = `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Grabush - Welcome</title>
    <link rel="stylesheet" href="/style.css" />
  </head>
  <body>
    <div class="container">
      <div class="welcome-header">
        <div class="welcome-title">Welcome ${firstName}</div>
        <form action="/logout" method="POST" style="margin:0;">
          <button type="submit" class="logout-button">Logout</button>
        </form>
      </div>

      <div class="food-grid">${grid}</div>

      <div class="footer-links">
        <a href="#">Contact us</a>
        <a href="#">About</a>
      </div>
    </div>
  </body>
  </html>`;
  res.send(html);
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);

  // Test database connection
  const isConnected = await testConnection();
  if (!isConnected) {
    console.log('❌ Database connection failed. Please check your configuration.');
  } else {
    console.log('✅ Database connected successfully');

    // Create users table if it doesn't exist
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255),
        street VARCHAR(200),
        city VARCHAR(100),
        zip VARCHAR(20),
        phone VARCHAR(20),
        is_verified BOOLEAN DEFAULT FALSE,
        verification_token VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createResult = await executeQuery(createTableQuery);
    if (createResult.success) {
      console.log('✅ Users table ready');
      
      // Ensure columns allow NULLs for pre-verification records and exist if missing
      const alterQueries = [
        'ALTER TABLE users MODIFY COLUMN name VARCHAR(100) NULL',
        'ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL',
        'ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE',
        'ALTER TABLE users ADD COLUMN verification_token VARCHAR(255)'
      ];
      
      for (const alterQuery of alterQueries) {
        try {
          await executeQuery(alterQuery);
          console.log('✅ Column added successfully');
        } catch (error) {
          // Column might already exist or already modified; ignore specific errors
          if (error.message.includes('Duplicate column name') || error.message.includes('check that column/key exists')) {
            console.log('Column already exists, skipping...');
          } else {
            console.log('Error adding column:', error.message);
          }
        }
      }
    }

    // Create vendors table if it doesn't exist
    const createVendorsTableQuery = `
      CREATE TABLE IF NOT EXISTS vendors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_name VARCHAR(200),
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255),
        location VARCHAR(200),
        business_contact VARCHAR(20),
        is_verified BOOLEAN DEFAULT FALSE,
        verification_token VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createVendorsResult = await executeQuery(createVendorsTableQuery);
    if (createVendorsResult.success) {
      console.log('✅ Vendors table ready');
      
      // Ensure columns allow NULLs for pre-verification records and exist if missing
      const vendorAlterQueries = [
        'ALTER TABLE vendors MODIFY COLUMN business_name VARCHAR(200) NULL',
        'ALTER TABLE vendors MODIFY COLUMN password VARCHAR(255) NULL',
        'ALTER TABLE vendors MODIFY COLUMN location VARCHAR(200) NULL',
        'ALTER TABLE vendors MODIFY COLUMN business_contact VARCHAR(20) NULL',
        'ALTER TABLE vendors ADD COLUMN is_verified BOOLEAN DEFAULT FALSE',
        'ALTER TABLE vendors ADD COLUMN verification_token VARCHAR(255)'
      ];
      
      for (const alterQuery of vendorAlterQueries) {
        try {
          await executeQuery(alterQuery);
          console.log('✅ Vendor column added successfully');
        } catch (error) {
          // Column might already exist or already modified; ignore specific errors
          if (error.message.includes('Duplicate column name') || error.message.includes('check that column/key exists')) {
            console.log('Vendor column already exists, skipping...');
          } else {
            console.log('Error adding vendor column:', error.message);
          }
        }
      }
    }
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await closeConnection();
  process.exit(0);
});