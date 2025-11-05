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

  const userAlterQueries = [
    'ALTER TABLE users MODIFY COLUMN name VARCHAR(100) NULL',
    'ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL',
    'ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE',
    'ALTER TABLE users ADD COLUMN verification_token VARCHAR(255)',
    'ALTER TABLE users ADD COLUMN favorites TEXT NULL',
    'ALTER TABLE users ADD COLUMN cart TEXT NULL'
  ];
  for (const q of userAlterQueries) {
    try { await executeQuery(q); } catch (e) { /* ignore duplicate/exists */ }
  }

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

  const vendorAlterQueries = [
    'ALTER TABLE vendors MODIFY COLUMN business_name VARCHAR(200) NULL',
    'ALTER TABLE vendors MODIFY COLUMN password VARCHAR(255) NULL',
    'ALTER TABLE vendors MODIFY COLUMN location VARCHAR(200) NULL',
    'ALTER TABLE vendors MODIFY COLUMN business_contact VARCHAR(20) NULL',
    'ALTER TABLE vendors ADD COLUMN is_verified BOOLEAN DEFAULT FALSE',
    'ALTER TABLE vendors ADD COLUMN verification_token VARCHAR(255)'
  ];
  for (const q of vendorAlterQueries) {
    try { await executeQuery(q); } catch (e) { /* ignore */ }
  }

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
}

module.exports = { initDatabase };