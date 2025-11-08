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
const path = require('path');
function sendVendorPage(res, filename){
  res.sendFile(path.join(__dirname, '..', 'public', filename));
}
router.get('/dashboard', requireVendor, (req, res) => sendVendorPage(res, 'vendor-dashboard.html'));
router.get('/orders-page', requireVendor, (req, res) => sendVendorPage(res, 'vendor-orders.html'));
router.get('/products-page', requireVendor, (req, res) => sendVendorPage(res, 'vendor-products.html'));
router.get('/product-edit', requireVendor, (req, res) => sendVendorPage(res, 'vendor-product-edit.html'));
router.get('/account', requireVendor, (req, res) => sendVendorPage(res, 'vendor-account.html'));
router.get('/products/new', requireVendor, (req, res) => sendVendorPage(res, 'vendor-product-new.html'));
router.get('/mystery-boxes/new', requireVendor, (req, res) => sendVendorPage(res, 'vendor-mystery-box-new.html'));
router.get('/schedule-offer', requireVendor, (req, res) => sendVendorPage(res, 'vendor-schedule-offer.html'));

// Create product
router.post('/products',
  requireVendor,
  [
    body('name').isString().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('price').isFloat({ gt: 0 }).withMessage('Price must be a positive number'),
    body('quantity').optional({ checkFalsy: true }).isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
    body('discount').optional({ checkFalsy: true, nullable: true }).customSanitizer(v => (v === '' || v === undefined ? null : v)).isFloat({ min: 0 }).withMessage('Discount must be a non-negative number'),
    body('is_premium').optional().isBoolean(),
    body('pickup_start_time').optional().isISO8601(),
    body('pickup_end_time').optional().isISO8601()
  ],
  async (req, res) => {
    try {
      const vendorId = req.session.userId;
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array().map(e => ({ field: e.path || e.param, message: e.msg }))
        });
      }

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

// Update product
router.put('/products/:id', requireVendor, [
  body('name').optional().isString().trim().isLength({ min: 2 }),
  body('price').optional().isFloat({ gt: 0 }),
  body('quantity').optional().isInt({ min: 0 }),
  body('discount').optional().isFloat({ min: 0 }),
  body('is_premium').optional().isBoolean(),
  body('enable_today').optional().isBoolean()
], async (req, res) => {
  try {
    const vendorId = req.session.userId; const productId = req.params.id;
    const verify = await executeQuery('SELECT id FROM products WHERE id = ? AND vendor_id = ?', [productId, vendorId]);
    if(!verify.success || verify.data.length === 0) return res.status(404).json({ success:false, error:'Product not found' });
    const fields = ['name','description','category','quantity','price','discount','is_premium','pickup_start_time','pickup_end_time','enable_today'];
    const updates = []; const params = [];
    fields.forEach(f => { if(req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(f === 'is_premium' || f === 'enable_today' ? (req.body[f] ? 1 : 0) : req.body[f]); } });
    if(updates.length === 0) return res.json({ success:true, data:{ id: productId } });
    params.push(productId);
    const q = `UPDATE products SET ${updates.join(', ')} WHERE id = ?`;
    const upd = await executeQuery(q, params);
    if(!upd.success) return res.status(500).json({ success:false, error:upd.error });
    const fresh = await executeQuery('SELECT * FROM products WHERE id = ?', [productId]);
    res.json({ success:true, data:fresh.data[0] });
  } catch(err){
    logger.error('Update product error', err);
    res.status(500).json({ success:false, error:'Failed to update product' });
  }
});

// Delete product
router.delete('/products/:id', requireVendor, async (req, res) => {
  try {
    const vendorId = req.session.userId; const productId = req.params.id;
    const verify = await executeQuery('SELECT id FROM products WHERE id = ? AND vendor_id = ?', [productId, vendorId]);
    if(!verify.success || verify.data.length === 0) return res.status(404).json({ success:false, error:'Product not found' });
    const del = await executeQuery('DELETE FROM products WHERE id = ?', [productId]);
    if(!del.success) return res.status(500).json({ success:false, error:del.error });
    res.json({ success:true, data:{ id: productId, deleted:true } });
  } catch(err){
    logger.error('Delete product error', err);
    res.status(500).json({ success:false, error:'Failed to delete product' });
  }
});

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

// Unified catalog (products + mystery boxes) with filters
router.get('/catalog', requireVendor, async (req, res) => {
  try {
    const vendorId = req.session.userId; const filter = (req.query.filter || 'all').toLowerCase();
    const productsResult = await executeQuery('SELECT id, name, description, price, discount, quantity, is_premium, enable_today, created_at FROM products WHERE vendor_id = ? ORDER BY created_at DESC', [vendorId]);
    const boxesResult = await executeQuery('SELECT id, title, price, quantity, created_at FROM mystery_boxes WHERE vendor_id = ? ORDER BY created_at DESC', [vendorId]);
    if(!productsResult.success || !boxesResult.success) return res.status(500).json({ success:false, error:'Failed to load catalog' });
    let items = [];
    items.push(...productsResult.data.map(p => ({ id:p.id, name:p.name, description:p.description, price:p.price, discount:p.discount, quantity:p.quantity, is_premium: !!p.is_premium, enable_today: !!p.enable_today, type:'product', created_at:p.created_at })));
    items.push(...boxesResult.data.map(b => ({ id:b.id, title:b.title, price:b.price, quantity:b.quantity, type:'mystery_box', created_at:b.created_at })));
    if(filter === 'mystery') items = items.filter(i => i.type === 'mystery_box');
    else if(filter === 'premium') items = items.filter(i => i.type === 'product' && i.is_premium);
    else if(filter === 'discounted') items = items.filter(i => i.type === 'product' && Number(i.discount) > 0);
    res.json({ success:true, data: items });
  } catch(err){
    logger.error('Catalog load error', err);
    res.status(500).json({ success:false, error:'Failed to load catalog' });
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
    const vendorId = req.session.userId;
    const rawLimit = parseInt(req.query.limit, 10);
    const safeLimit = Number.isInteger(rawLimit) && rawLimit > 0 && rawLimit <= 200 ? rawLimit : 20;
    // Inline limit to avoid prepared statement issues with LIMIT ? on some MySQL versions
    const ordersQuery = `SELECT o.id, o.price, o.description, o.pickup_start_time, o.pickup_end_time, o.status, o.order_type, o.created_at,
      CASE WHEN o.order_type = 'mystery_box' THEN mb.title ELSE p.name END AS item_title,
      CASE WHEN o.order_type = 'mystery_box' THEN (
        SELECT GROUP_CONCAT(DISTINCT prod.name SEPARATOR ', ')
        FROM mystery_box_items mbi2 JOIN products prod ON prod.id = mbi2.product_id
        WHERE mbi2.mystery_box_id = o.mystery_box_id
      ) ELSE NULL END AS mystery_box_product_names
      FROM orders o
      LEFT JOIN mystery_boxes mb ON o.mystery_box_id = mb.id
      LEFT JOIN products p ON o.product_id = p.id
      WHERE o.vendor_id = ?
      ORDER BY o.created_at DESC
      LIMIT ${safeLimit}`;
    const result = await executeQuery(ordersQuery, [vendorId]);
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

// Create scheduled offers
router.post('/scheduled-offers', requireVendor, [
  body('offers').isArray({ min: 1 }).withMessage('offers must be non-empty array'),
  body('offers.*.product_id').isInt().withMessage('product_id must be integer'),
  body('offers.*.offer_date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('offer_date must be in YYYY-MM-DD format'),
  body('offers.*.offer_start_time').matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).withMessage('offer_start_time must be valid time'),
  body('offers.*.offer_end_time').matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).withMessage('offer_end_time must be valid time'),
  body('offers.*.discount_enabled').optional({ nullable: true }).isBoolean(),
  body('offers.*.discount_type').optional({ nullable: true }).isIn(['fixed_price', 'percentage']),
  body('offers.*.new_price').optional({ nullable: true }).isFloat({ min: 0 }),
  body('offers.*.discount_percentage').optional({ nullable: true }).isFloat({ min: 0, max: 100 }),
  body('offers.*.is_recurring').optional({ nullable: true }).isBoolean()
], async (req, res) => {
  try {
    const vendorId = req.session.userId;
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });

    const { offers } = req.body;
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      for (const offer of offers) {
        // Verify product belongs to vendor
        const productCheck = await connection.execute('SELECT id FROM products WHERE id = ? AND vendor_id = ?', [offer.product_id, vendorId]);
        if (productCheck[0].length === 0) {
          await connection.rollback();
          return res.status(403).json({ success: false, error: `Product ${offer.product_id} not found or does not belong to vendor` });
        }

        // Normalize values (avoid undefined which breaks prepared statements)
        const discountType = offer.discount_type || 'fixed_price';
        const discountEnabled = offer.discount_enabled !== false;
        // Normalize numeric inputs (avoid empty string / undefined)
        const rawNewPrice = offer.new_price;
        const rawPct = offer.discount_percentage;
        const newPrice = discountType === 'fixed_price'
          ? (rawNewPrice === '' || rawNewPrice === undefined || rawNewPrice === null ? null : Number(rawNewPrice))
          : null;
        const discountPct = discountType === 'percentage'
          ? (rawPct === '' || rawPct === undefined || rawPct === null ? null : Number(rawPct))
          : null;
        const startTime = offer.offer_start_time || '00:00';
        const endTime = offer.offer_end_time || '23:59';

        // Additional guard: if discount enabled and fixed price chosen but no newPrice provided -> validation error
        if (discountEnabled && discountType === 'fixed_price' && newPrice === null) {
          await connection.rollback();
          return res.status(400).json({ success: false, error: `Missing new_price for product ${offer.product_id}` });
        }
        if (discountEnabled && discountType === 'percentage' && (discountPct === null || isNaN(discountPct))) {
          await connection.rollback();
          return res.status(400).json({ success: false, error: `Missing discount_percentage for product ${offer.product_id}` });
        }

        try {
        await connection.execute(
          `INSERT INTO scheduled_offers (vendor_id, product_id, offer_date, offer_start_time, offer_end_time, discount_enabled, discount_type, new_price, discount_percentage, is_recurring) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            vendorId,
            offer.product_id,
            offer.offer_date,
            startTime,
            endTime,
            discountEnabled ? 1 : 0,
            discountType,
            newPrice,
            discountPct,
            offer.is_recurring ? 1 : 0
          ]
        );
        } catch (innerErr) {
          logger.error('Scheduled offer insert failed', { message: innerErr.message, product_id: offer.product_id, params: { startTime, endTime, discountEnabled, discountType, newPrice, discountPct } });
          throw innerErr; // triggers outer catch for rollback
        }
      }

      await connection.commit();
      res.status(201).json({ success: true, message: `${offers.length} offer(s) scheduled successfully` });
    } catch (txErr) {
      await connection.rollback();
      logger.error('Transaction error creating scheduled offers', txErr);
      res.status(500).json({ success: false, error: 'Failed to create scheduled offers' });
    } finally {
      connection.release();
    }
  } catch (error) {
    logger.error('Create scheduled offers error', error);
    res.status(500).json({ success: false, error: 'Failed to create scheduled offers' });
  }
});

// List scheduled offers
router.get('/scheduled-offers', requireVendor, async (req, res) => {
  try {
    const vendorId = req.session.userId;
    const query = `SELECT so.*, p.name AS product_name, p.price AS original_price 
                   FROM scheduled_offers so 
                   JOIN products p ON so.product_id = p.id 
                   WHERE so.vendor_id = ? 
                   ORDER BY so.offer_date DESC, so.offer_start_time ASC`;
    const result = await executeQuery(query, [vendorId]);
    if (!result.success) return res.status(500).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    logger.error('List scheduled offers error', error);
    res.status(500).json({ success: false, error: 'Failed to list scheduled offers' });
  }
});

// Account summary (vendor info + stats)
router.get('/account/summary', requireVendor, async (req, res) => {
  try {
    const vendorId = req.session.userId;
    const vendorInfo = await executeQuery('SELECT id, business_name, email, location, business_contact FROM vendors WHERE id = ?', [vendorId]);
    if(!vendorInfo.success || vendorInfo.data.length === 0) return res.status(404).json({ success:false, error:'Vendor not found' });
    const [totalOrders, monthlyEarnings, pendingOrders] = await Promise.all([
      executeQuery('SELECT COUNT(*) AS c FROM orders WHERE vendor_id = ?', [vendorId]),
      executeQuery('SELECT COALESCE(SUM(price),0) AS s FROM orders WHERE vendor_id = ? AND YEAR(created_at)=YEAR(CURDATE()) AND MONTH(created_at)=MONTH(CURDATE())', [vendorId]),
      executeQuery("SELECT COUNT(*) AS c FROM orders WHERE vendor_id = ? AND status = 'in_progress'", [vendorId])
    ]);
    if(!totalOrders.success || !monthlyEarnings.success || !pendingOrders.success) return res.status(500).json({ success:false, error:'Failed to compute stats' });
    res.json({ success:true, data:{ vendor: vendorInfo.data[0], stats:{ totalOrders: totalOrders.data[0].c, monthlyEarnings: monthlyEarnings.data[0].s, pendingOrders: pendingOrders.data[0].c } } });
  } catch(err){
    logger.error('Account summary error', err);
    res.status(500).json({ success:false, error:'Failed to load account summary' });
  }
});

module.exports = { router, requireVendor };