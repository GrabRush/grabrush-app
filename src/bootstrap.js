const { executeQuery } = require('../database');
const logger = require('./logger');

async function initDatabase() {
  logger.info('Initializing database schema...');

  // Users table
  await executeQuery(`CREATE TABLE IF NOT EXISTS users (
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
  )`);
  logger.info('Users table ensured');

  // Idempotent column additions (MySQL pre-8 lacks IF NOT EXISTS for MODIFY ADD multiple times)
  // Use INFORMATION_SCHEMA to avoid parameter placeholder issues with SHOW COLUMNS
  async function columnExists(table, column) {
    const q = `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`;
    const check = await executeQuery(q, [table, column]);
    return check.success && check.data.length === 1;
  }
  async function getIsNullable(table, column) {
    const q = `SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`;
    const check = await executeQuery(q, [table, column]);
    if(check.success && check.data.length === 1) return check.data[0].IS_NULLABLE; // 'YES' | 'NO'
    return null;
  }
  async function ensureColumn(table, column, definition){
    const exists = await columnExists(table, column);
    if(!exists){
      await executeQuery(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
      logger.info(`Added column ${table}.${column}`);
    }
  }
  async function ensureModifyNullable(table, column, type){
    const exists = await columnExists(table, column);
    if(!exists) return; // nothing to modify yet
    const nullable = await getIsNullable(table, column);
    if(nullable === 'NO'){
      await executeQuery(`ALTER TABLE ${table} MODIFY COLUMN ${column} ${type} NULL`);
      logger.info(`Modified column ${table}.${column} to NULLABLE`);
    }
  }
  await ensureModifyNullable('users','name','VARCHAR(100)');
  await ensureModifyNullable('users','password','VARCHAR(255)');
  await ensureColumn('users','is_verified','is_verified BOOLEAN DEFAULT FALSE');
  await ensureColumn('users','verification_token','verification_token VARCHAR(255)');
  await ensureColumn('users','favorites','favorites TEXT NULL');
  await ensureColumn('users','cart','cart TEXT NULL');

  // Vendors table
  await executeQuery(`CREATE TABLE IF NOT EXISTS vendors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    business_name VARCHAR(200),
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255),
    location VARCHAR(200),
    business_contact VARCHAR(20),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  logger.info('Vendors table ensured');

  await ensureModifyNullable('vendors','business_name','VARCHAR(200)');
  await ensureModifyNullable('vendors','password','VARCHAR(255)');
  await ensureModifyNullable('vendors','location','VARCHAR(200)');
  await ensureModifyNullable('vendors','business_contact','VARCHAR(20)');
  await ensureColumn('vendors','is_verified','is_verified BOOLEAN DEFAULT FALSE');
  await ensureColumn('vendors','verification_token','verification_token VARCHAR(255)');

  // Products table
  await executeQuery(`CREATE TABLE IF NOT EXISTS products (
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
  )`);
  logger.info('Products table ensured');

  // Mystery boxes table
  await executeQuery(`CREATE TABLE IF NOT EXISTS mystery_boxes (
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
  )`);
  logger.info('Mystery Boxes table ensured');

  // Mystery box items table
  await executeQuery(`CREATE TABLE IF NOT EXISTS mystery_box_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mystery_box_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mystery_box_id) REFERENCES mystery_boxes(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  )`);
  logger.info('Mystery Box Items table ensured');

  // Orders table
  await executeQuery(`CREATE TABLE IF NOT EXISTS orders (
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
  )`);
  logger.info('Orders table ensured');

  // Scheduled offers table
  await executeQuery(`CREATE TABLE IF NOT EXISTS scheduled_offers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_id INT NOT NULL,
    product_id INT NOT NULL,
    offer_date DATE NOT NULL,
    offer_start_time TIME NOT NULL,
    offer_end_time TIME NOT NULL,
    discount_enabled BOOLEAN DEFAULT TRUE,
    discount_type ENUM('fixed_price','percentage') DEFAULT 'fixed_price',
    new_price DECIMAL(10,2) NULL,
    discount_percentage DECIMAL(5,2) NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  )`);
  logger.info('Scheduled offers table ensured');
}

module.exports = { initDatabase };