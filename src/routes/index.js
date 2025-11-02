const express = require('express');
const authRoutes = require('../authRoutes');
const { router: vendorRoutes } = require('../vendorRoutes');
const generalRoutes = require('../generalRoutes');

function buildRouter() {
  const router = express.Router();
  // Root-level auth & general pages
  router.use('/', authRoutes);
  router.use('/', generalRoutes);
  // Vendor namespace
  router.use('/vendor', vendorRoutes);
  return router;
}

module.exports = { buildRouter };