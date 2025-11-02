const express = require('express');
const { body, validationResult } = require('express-validator');
const logger = require('./logger');
const { executeQuery, pool } = require('../database');

const router = express.Router();

// Middleware to ensure vendor session
function requireVendor(req, res, next) {
  if (!req.session.userId || req.session.userType !== 'vendor') {
    return res.status(403).json({ success: false, error: 'Vendor authentication required' });
  }
  next();
}

// Serve vendor pages (HTML static files already in /public)
router.get('/dashboard', (req, res) => {
  if (!req.session.userId || req.session.userType !== 'vendor') return res.redirect('/');
  res.sendFile(require('path').join(__dirname, '..', 'public', 'vendor-dashboard.html'));
});
router.get('/products/new', (req, res) => {
  if (!req.session.userId || req.session.userType !== 'vendor') return res.redirect('/');
  res.sendFile(require('path').join(__dirname, '..', 'public', 'vendor-product-new.html'));
});
router.get('/mystery-boxes/new', (req, res) => {
  if (!req.session.userId || req.session.userType !== 'vendor') return res.redirect('/');
  res.sendFile(require('path').join(__dirname, '..', 'public', 'vendor-mystery-box-new.html'));
});

// Create product
router.post('/products',
  requireVendor,
  [
    body('name').isString().trim().isLength({ min: 2 }).withMessage('Name min length 2'),
    body('price').isFloat({ gt: 0 }).withMessage('Price must be > 0'),
    body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be >= 0'),
    body('discount').optional().isFloat({ min: 0 }).withMessage('Discount must be >= 0'),
    body('is_premium').optional().isBoolean(),
    body('pickup_start_time').optional().isISO8601(),
    body('pickup_end_time').optional().isISO8601()
  ],
  async (req, res) => {
    try {
      const vendorId = req.session.userId;
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });

      const { image_url, name, description, category, quantity, price, discount, is_premium, pickup_start_time, pickup_end_time, enable_today } = req.body;
      const insertQuery = `INSERT INTO products (vendor_id, image_url, name, description, category, quantity, price, discount, is_premium, pickup_start_time, pickup_end_time, enable_today) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      const params = [vendorId, image_url || null, name, description || null, category || null, quantity != null ? quantity : 0, price, discount != null ? discount : 0, is_premium ? 1 : 0, pickup_start_time || null, pickup_end_time || null, enable_today ? 1 : 0];
      const result = await executeQuery(insertQuery, params);
      if (!result.success) return res.status(500).json({ success: false, error: result.error });
      const productResult = await executeQuery('SELECT * FROM products WHERE id = LAST_INSERT_ID()');
      res.status(201).json({ success: true, data: productResult.data[0] });
    } catch (error) {
      logger.error('Create product error', error);
      res.status(500).json({ success: false, error: 'Failed to create product' });
    }
  }
);

// List products
router.get('/products', requireVendor, async (req, res) => {
  try {
    const vendorId = req.session.userId;
    const result = await executeQuery('SELECT * FROM products WHERE vendor_id = ? ORDER BY created_at DESC', [vendorId]);
    if (!result.success) return res.status(500).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    logger.error('List products error', error);
    res.status(500).json({ success: false, error: 'Failed to list products' });
  }
});

// Create mystery box
router.post('/mystery-boxes',
  requireVendor,
  [
    body('product_ids').isArray({ min: 1 }).withMessage('product_ids must be non-empty array'),
    body('price').isFloat({ gt: 0 }),
    body('quantity').optional().isInt({ min: 0 }),
    body('pickup_start_time').optional().isISO8601(),
    body('pickup_end_time').optional().isISO8601()
  ],
  async (req, res) => {
    try {
      const vendorId = req.session.userId;
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
      const { title, product_ids, price, quantity, pickup_start_time, pickup_end_time } = req.body;

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [boxInsert] = await connection.execute(`INSERT INTO mystery_boxes (vendor_id, title, price, quantity, pickup_start_time, pickup_end_time) VALUES (?, ?, ?, ?, ?, ?)`, [vendorId, title || null, price, quantity != null ? quantity : 0, pickup_start_time || null, pickup_end_time || null]);
        const boxId = boxInsert.insertId;
        if (!boxId) throw new Error('Failed to insert mystery box');
        const items = product_ids.map(p => [boxId, p.id || p, p.quantity != null ? p.quantity : 1]);
        const placeholders = items.map(() => '(?,?,?)').join(',');
        await connection.execute(`INSERT INTO mystery_box_items (mystery_box_id, product_id, quantity) VALUES ${placeholders}`, items.flat());
        const fetchQuery = `SELECT mb.*, GROUP_CONCAT(p.name) AS product_names FROM mystery_boxes mb LEFT JOIN mystery_box_items mbi ON mb.id = mbi.mystery_box_id LEFT JOIN products p ON mbi.product_id = p.id WHERE mb.id = ? GROUP BY mb.id`;
        const [rows] = await connection.execute(fetchQuery, [boxId]);
        await connection.commit();
        res.status(201).json({ success: true, data: rows[0] });
      } catch (txErr) {
        await connection.rollback();
        logger.error('Transaction error creating mystery box', txErr);
        res.status(500).json({ success: false, error: 'Failed to create mystery box' });
      } finally {
        connection.release();
      }
    } catch (error) {
      logger.error('Create mystery box error', error);
      res.status(500).json({ success: false, error: 'Failed to create mystery box' });
    }
  }
);

// List mystery boxes
router.get('/mystery-boxes', requireVendor, async (req, res) => {
  try {
    const vendorId = req.session.userId;
    const query = `SELECT mb.*, COUNT(mbi.id) AS item_count FROM mystery_boxes mb LEFT JOIN mystery_box_items mbi ON mb.id = mbi.mystery_box_id WHERE mb.vendor_id = ? GROUP BY mb.id ORDER BY mb.created_at DESC`;
    const result = await executeQuery(query, [vendorId]);
    if (!result.success) return res.status(500).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    logger.error('List mystery boxes error', error);
    res.status(500).json({ success: false, error: 'Failed to list mystery boxes' });
  }
});

// Dashboard metrics
router.get('/dashboard/metrics', requireVendor, async (req, res) => {
  try {
    const vendorId = req.session.userId;
    const [today, ready, completed] = await Promise.all([
      executeQuery('SELECT COUNT(*) AS count FROM orders WHERE vendor_id = ? AND DATE(created_at) = CURDATE()', [vendorId]),
      executeQuery("SELECT COUNT(*) AS count FROM orders WHERE vendor_id = ? AND status = 'ready'", [vendorId]),
      executeQuery("SELECT COUNT(*) AS count FROM orders WHERE vendor_id = ? AND status = 'completed'", [vendorId])
    ]);
    if (!today.success || !ready.success || !completed.success) return res.status(500).json({ success: false, error: 'Failed to compute metrics' });
    res.json({ success: true, data: { todaysOrders: today.data[0].count, readyOrders: ready.data[0].count, completedOrders: completed.data[0].count } });
  } catch (error) {
    logger.error('Dashboard metrics error', error);
    res.status(500).json({ success: false, error: 'Failed to load metrics' });
  }
});

// Recent orders
router.get('/orders', requireVendor, async (req, res) => {
  try {
    const vendorId = req.session.userId; const limit = parseInt(req.query.limit, 10) || 20;
    const ordersQuery = `SELECT o.id, o.price, o.description, o.pickup_start_time, o.pickup_end_time, o.status, o.order_type, o.created_at, CASE WHEN o.order_type = 'mystery_box' THEN mb.title ELSE p.name END AS item_title, CASE WHEN o.order_type = 'mystery_box' THEN (SELECT GROUP_CONCAT(DISTINCT prod.name SEPARATOR ', ') FROM mystery_box_items mbi2 JOIN products prod ON prod.id = mbi2.product_id WHERE mbi2.mystery_box_id = o.mystery_box_id) ELSE NULL END AS mystery_box_product_names FROM orders o LEFT JOIN mystery_boxes mb ON o.mystery_box_id = mb.id LEFT JOIN products p ON o.product_id = p.id WHERE o.vendor_id = ? ORDER BY o.created_at DESC LIMIT ?`;
    const result = await executeQuery(ordersQuery, [vendorId, limit]);
    if (!result.success) return res.status(500).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    logger.error('List orders error', error);
    res.status(500).json({ success: false, error: 'Failed to list orders' });
  }
});

// Update order status
router.put('/orders/:id/status', requireVendor, async (req, res) => {
  try {
    const vendorId = req.session.userId; const orderId = req.params.id; const { status } = req.body;
    const allowed = ['in_progress', 'ready', 'completed'];
    if (!allowed.includes(status)) return res.status(400).json({ success: false, error: 'Invalid status value' });
    const verifyResult = await executeQuery('SELECT id FROM orders WHERE id = ? AND vendor_id = ?', [orderId, vendorId]);
    if (!verifyResult.success || verifyResult.data.length === 0) return res.status(404).json({ success: false, error: 'Order not found' });
    const updateResult = await executeQuery('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
    if (!updateResult.success) return res.status(500).json({ success: false, error: updateResult.error });
    res.json({ success: true, data: { id: orderId, status } });
  } catch (error) {
    logger.error('Update order status error', error);
    res.status(500).json({ success: false, error: 'Failed to update order status' });
  }
});

module.exports = { router, requireVendor };