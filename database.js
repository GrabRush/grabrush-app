  const mysql = require('mysql2');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'testdb',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool for better performance
const pool = mysql.createPool(dbConfig);

// Get a promise-based connection
const promisePool = pool.promise();

// Test database connection
async function testConnection() {
  try {
    const connection = await promisePool.getConnection();
    console.log('✅ Successfully connected to MySQL database!');
    console.log(`Connected to: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

    // Test query
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Test query executed successfully:', rows);

    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Execute a query
async function executeQuery(sql, params = []) {
  try {
    const [rows] = await promisePool.execute(sql, params);
    return { success: true, data: rows };
  } catch (error) {
    console.error('Query execution failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Close all connections
async function closeConnection() {
  try {
    await promisePool.end();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error closing connection:', error.message);
  }
}

module.exports = {
  testConnection,
  executeQuery,
  closeConnection,
  pool: promisePool
};