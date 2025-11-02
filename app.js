const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
require('dotenv').config();
const { testConnection, executeQuery, closeConnection } = require('./database');
const rateLimit = require('express-rate-limit');
const winston = require('winston');

// Logger setup
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, stack }) => {
          return `[${timestamp}] ${level}: ${stack || message}`;
        })
      )
    })
  ]
});

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

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many login attempts. Please try again later.' }
});
const vendorApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, error: 'Rate limit exceeded. Slow down.' }
});

// Apply specific limiters
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

    // Redirect vendor to vendor dashboard
    if (userType === 'vendor') {
      return res.redirect('/vendor/dashboard');
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

// Vendor auth middleware
function requireVendor(req, res, next) {
  if (!req.session.userId || req.session.userType !== 'vendor') {
    return res.status(403).json({ success: false, error: 'Vendor authentication required' });
  }
  next();
}

// Serve vendor dashboard pages
app.get('/vendor/dashboard', (req, res) => {
  if (!req.session.userId || req.session.userType !== 'vendor') {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'vendor-dashboard.html'));
});

app.get('/vendor/products/new', (req, res) => {
  if (!req.session.userId || req.session.userType !== 'vendor') {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'vendor-product-new.html'));
});

app.get('/vendor/mystery-boxes/new', (req, res) => {
  if (!req.session.userId || req.session.userType !== 'vendor') {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'vendor-mystery-box-new.html'));
});

// Placeholder: Product & Mystery Box management APIs will be added below
// Endpoints to implement:
// POST /vendor/products
// GET /vendor/products
// POST /vendor/mystery-boxes
// GET /vendor/mystery-boxes
// GET /vendor/dashboard/metrics
// GET /vendor/orders
// PUT /vendor/orders/:id/status

// Create a new product
app.post('/vendor/products',
  requireVendor,
  [
    body('name').isString().trim().isLength({ min: 2 }).withMessage('Name min length 2'),
    body('price').isFloat({ gt: 0 }).withMessage('Price must be > 0'),
    body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be >= 0'),
    body('discount').optional().isFloat({ min: 0 }).withMessage('Discount must be >= 0'),
    body('is_premium').optional().isBoolean().withMessage('is_premium must be boolean'),
    body('pickup_start_time').optional().isISO8601().withMessage('pickup_start_time must be ISO8601'),
    body('pickup_end_time').optional().isISO8601().withMessage('pickup_end_time must be ISO8601')
  ],
  async (req, res) => {
  try {
    const vendorId = req.session.userId;
    const {
      image_url,
      name,
      description,
      category,
      quantity,
      price,
      discount,
      is_premium,
      pickup_start_time,
      pickup_end_time,
      enable_today
    } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }

    const insertQuery = `
      INSERT INTO products (
        vendor_id, image_url, name, description, category, quantity, price, discount, is_premium, 
        pickup_start_time, pickup_end_time, enable_today
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      vendorId,
      image_url || null,
      name,
      description || null,
      category || null,
      quantity != null ? quantity : 0,
      price,
      discount != null ? discount : 0,
      is_premium ? 1 : 0,
      pickup_start_time || null,
      pickup_end_time || null,
      enable_today ? 1 : 0
    ];

    const result = await executeQuery(insertQuery, params);
    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }

    // Fetch the created product
    const productIdQuery = 'SELECT * FROM products WHERE id = LAST_INSERT_ID()';
    const productResult = await executeQuery(productIdQuery);
    return res.status(201).json({ success: true, data: productResult.data[0] });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ success: false, error: 'Failed to create product' });
  }
});

// List products for vendor
app.get('/vendor/products', requireVendor, async (req, res) => {
  try {
    const vendorId = req.session.userId;
    const listQuery = 'SELECT * FROM products WHERE vendor_id = ? ORDER BY created_at DESC';
    const result = await executeQuery(listQuery, [vendorId]);
    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('List products error:', error);
    res.status(500).json({ success: false, error: 'Failed to list products' });
  }
});

// Create a new mystery box
app.post('/vendor/mystery-boxes',
  requireVendor,
  [
    body('product_ids').isArray({ min: 1 }).withMessage('product_ids must be non-empty array'),
    body('price').isFloat({ gt: 0 }).withMessage('Price must be > 0'),
    body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be >= 0'),
    body('pickup_start_time').optional().isISO8601().withMessage('pickup_start_time must be ISO8601'),
    body('pickup_end_time').optional().isISO8601().withMessage('pickup_end_time must be ISO8601')
  ],
  async (req, res) => {
  try {
    const vendorId = req.session.userId;
    const { title, product_ids, price, quantity, pickup_start_time, pickup_end_time } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }

    const insertMysteryBoxQuery = `
      INSERT INTO mystery_boxes (vendor_id, title, price, quantity, pickup_start_time, pickup_end_time)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const mysteryBoxParams = [
      vendorId,
      title || null,
      price,
      quantity != null ? quantity : 0,
      pickup_start_time || null,
      pickup_end_time || null
    ];
    // Use manual transaction for atomic creation with batch insert
    const pool = require('./database').pool; // promise pool
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [boxInsert] = await connection.execute(insertMysteryBoxQuery, mysteryBoxParams);
      const boxId = boxInsert.insertId;
      if (!boxId) {
        throw new Error('Failed to insert mystery box');
      }

      // Build batch insert values
      const items = product_ids.map(p => [boxId, p.id || p, p.quantity != null ? p.quantity : 1]);
      const itemInsertQuery = 'INSERT INTO mystery_box_items (mystery_box_id, product_id, quantity) VALUES ?';
      // mysql2 doesn't support VALUES ? for bulk unless using query with format
      // Prepare multi-row insert statement manually
      const placeholders = items.map(() => '(?,?,?)').join(',');
      const flatValues = items.flat();
      const bulkQuery = `INSERT INTO mystery_box_items (mystery_box_id, product_id, quantity) VALUES ${placeholders}`;
      await connection.execute(bulkQuery, flatValues);

      // Fetch complete mystery box with items
      const fetchQuery = `
        SELECT mb.*, GROUP_CONCAT(p.name) AS product_names
        FROM mystery_boxes mb
        LEFT JOIN mystery_box_items mbi ON mb.id = mbi.mystery_box_id
        LEFT JOIN products p ON mbi.product_id = p.id
        WHERE mb.id = ?
        GROUP BY mb.id
      `;
      const [rows] = await connection.execute(fetchQuery, [boxId]);

      await connection.commit();
      res.status(201).json({ success: true, data: rows[0] });
    } catch (txErr) {
      await connection.rollback();
      console.error('Transaction error creating mystery box:', txErr.message);
      res.status(500).json({ success: false, error: 'Failed to create mystery box' });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Create mystery box error:', error);
    res.status(500).json({ success: false, error: 'Failed to create mystery box' });
  }
});

// List mystery boxes
app.get('/vendor/mystery-boxes', requireVendor, async (req, res) => {
  try {
    const vendorId = req.session.userId;
    const listQuery = `
      SELECT mb.*, COUNT(mbi.id) AS item_count
      FROM mystery_boxes mb
      LEFT JOIN mystery_box_items mbi ON mb.id = mbi.mystery_box_id
      WHERE mb.vendor_id = ?
      GROUP BY mb.id
      ORDER BY mb.created_at DESC
    `;
    const result = await executeQuery(listQuery, [vendorId]);
    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('List mystery boxes error:', error);
    res.status(500).json({ success: false, error: 'Failed to list mystery boxes' });
  }
});

// Dashboard metrics for vendor
app.get('/vendor/dashboard/metrics', requireVendor, async (req, res) => {
  try {
    const vendorId = req.session.userId;
    const todayOrdersQuery = `SELECT COUNT(*) AS count FROM orders WHERE vendor_id = ? AND DATE(created_at) = CURDATE()`;
    const readyOrdersQuery = `SELECT COUNT(*) AS count FROM orders WHERE vendor_id = ? AND status = 'ready'`;
    const completedOrdersQuery = `SELECT COUNT(*) AS count FROM orders WHERE vendor_id = ? AND status = 'completed'`;

    const [today, ready, completed] = await Promise.all([
      executeQuery(todayOrdersQuery, [vendorId]),
      executeQuery(readyOrdersQuery, [vendorId]),
      executeQuery(completedOrdersQuery, [vendorId])
    ]);

    if (!today.success || !ready.success || !completed.success) {
      return res.status(500).json({ success: false, error: 'Failed to compute metrics' });
    }

    res.json({
      success: true,
      data: {
        todaysOrders: today.data[0].count,
        readyOrders: ready.data[0].count,
        completedOrders: completed.data[0].count
      }
    });
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    res.status(500).json({ success: false, error: 'Failed to load metrics' });
  }
});

// Recent orders for vendor
app.get('/vendor/orders', requireVendor, async (req, res) => {
  try {
    const vendorId = req.session.userId;
    const limit = parseInt(req.query.limit, 10) || 20;
    const ordersQuery = `
      SELECT o.id, o.price, o.description, o.pickup_start_time, o.pickup_end_time, o.status, o.order_type,
             o.created_at,
             CASE 
               WHEN o.order_type = 'mystery_box' THEN mb.title
               ELSE p.name
             END AS item_title,
             CASE 
               WHEN o.order_type = 'mystery_box' THEN (
                 SELECT GROUP_CONCAT(DISTINCT prod.name SEPARATOR ', ')
                 FROM mystery_box_items mbi2
                 JOIN products prod ON prod.id = mbi2.product_id
                 WHERE mbi2.mystery_box_id = o.mystery_box_id
               )
               ELSE NULL
             END AS mystery_box_product_names
      FROM orders o
      LEFT JOIN mystery_boxes mb ON o.mystery_box_id = mb.id
      LEFT JOIN products p ON o.product_id = p.id
      WHERE o.vendor_id = ?
      ORDER BY o.created_at DESC
      LIMIT ?
    `;
    const result = await executeQuery(ordersQuery, [vendorId, limit]);
    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('List orders error:', error);
    res.status(500).json({ success: false, error: 'Failed to list orders' });
  }
});

// Update order status
app.put('/vendor/orders/:id/status', requireVendor, async (req, res) => {
  try {
    const vendorId = req.session.userId;
    const orderId = req.params.id;
    const { status } = req.body;
    const allowed = ['in_progress', 'ready', 'completed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status value' });
    }

    // Verify order belongs to vendor
    const verifyQuery = 'SELECT id FROM orders WHERE id = ? AND vendor_id = ?';
    const verifyResult = await executeQuery(verifyQuery, [orderId, vendorId]);
    if (!verifyResult.success || verifyResult.data.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const updateQuery = 'UPDATE orders SET status = ? WHERE id = ?';
    const updateResult = await executeQuery(updateQuery, [status, orderId]);
    if (!updateResult.success) {
      return res.status(500).json({ success: false, error: updateResult.error });
    }
    res.json({ success: true, data: { id: orderId, status } });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, error: 'Failed to update order status' });
  }
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
          logger.info('Column ensured/added');
        } catch (error) {
          // Column might already exist or already modified; ignore specific errors
          if (error.message.includes('Duplicate column name') || error.message.includes('check that column/key exists')) {
            logger.info('Column already exists, skipping');
          } else {
            logger.error('Error adding user column', error);
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
          logger.info('Vendor column ensured/added');
        } catch (error) {
          // Column might already exist or already modified; ignore specific errors
          if (error.message.includes('Duplicate column name') || error.message.includes('check that column/key exists')) {
            logger.info('Vendor column already exists, skipping');
          } else {
            logger.error('Error adding vendor column', error);
          }
        }
      }
    }

    // Create products table (vendor products)
    const createProductsTableQuery = `
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vendor_id INT NOT NULL,
        image_url VARCHAR(500),
        name VARCHAR(200) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        quantity INT DEFAULT 0,
        price DECIMAL(10,2) NOT NULL,
        discount DECIMAL(5,2) DEFAULT 0.00,
        is_premium BOOLEAN DEFAULT FALSE,
        pickup_start_time DATETIME NULL,
        pickup_end_time DATETIME NULL,
        enable_today BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
      )
    `;
    await executeQuery(createProductsTableQuery);
    console.log('✅ Products table ready');

    // Create mystery_boxes table
    const createMysteryBoxesTableQuery = `
      CREATE TABLE IF NOT EXISTS mystery_boxes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vendor_id INT NOT NULL,
        title VARCHAR(200) NULL,
        price DECIMAL(10,2) NOT NULL,
        quantity INT DEFAULT 0,
        pickup_start_time DATETIME NULL,
        pickup_end_time DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
      )
    `;
    await executeQuery(createMysteryBoxesTableQuery);
    console.log('✅ Mystery Boxes table ready');

    // Create mystery_box_items junction table
    const createMysteryBoxItemsTableQuery = `
      CREATE TABLE IF NOT EXISTS mystery_box_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        mystery_box_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (mystery_box_id) REFERENCES mystery_boxes(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `;
    await executeQuery(createMysteryBoxItemsTableQuery);
    console.log('✅ Mystery Box Items table ready');

    // Create orders table (for both products and mystery boxes)
    const createOrdersTableQuery = `
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vendor_id INT NOT NULL,
        user_id INT NULL,
        mystery_box_id INT NULL,
        product_id INT NULL,
        order_type ENUM('product','mystery_box') NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        description TEXT NULL,
        pickup_start_time DATETIME NULL,
        pickup_end_time DATETIME NULL,
        status ENUM('in_progress','ready','completed') DEFAULT 'in_progress',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (mystery_box_id) REFERENCES mystery_boxes(id) ON DELETE SET NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
      )
    `;
    await executeQuery(createOrdersTableQuery);
    console.log('✅ Orders table ready');
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await closeConnection();
  process.exit(0);
});