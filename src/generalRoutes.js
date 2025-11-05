const express = require('express');
const path = require('path');
const router = express.Router();
const { executeQuery } = require('../database');

// Welcome page after successful login
router.get('/welcome', (req, res) => {
  if (!req.session.userId) return res.redirect('/');
  const fullName = req.session.userName || 'Food lover';
  const firstName = String(fullName).split(' ')[0] || 'Food lover';
  const userType = req.session.userType || 'customer';

  if (userType === 'vendor') {
    // Keep vendor view simple for now
    const restaurants = [
      { name: 'Bella Vista Restaurant', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop' },
      { name: 'The Gourmet Kitchen', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1200&auto=format&fit=crop' },
      { name: 'Seaside Bistro', image: 'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?q=80&w=1200&auto=format&fit=crop' },
      { name: 'Mountain View Cafe', image: 'https://images.unsplash.com/photo-1515669097368-22e68427d265?q=80&w=1200&auto=format&fit=crop' },
      { name: 'Downtown Diner', image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1200&auto=format&fit=crop' },
      { name: 'The Rustic Table', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop' }
    ];
    const grid = restaurants.map(r => `<div class="restaurant-item"><img src="${r.image}" alt="${r.name}" loading="lazy"><div class="restaurant-name">${r.name}</div></div>`).join('');
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Grabrush - Welcome</title><link rel="stylesheet" href="/style.css" /></head><body><div class="container"><div class="welcome-header"><div class="welcome-title">Welcome ${firstName}</div><form action="/logout" method="POST" style="margin:0;"><button type="submit" class="logout-button">Logout</button></form></div><div class="food-grid">${grid}</div><div class="footer-links"><a href="#">Contact us</a><a href="#">About</a></div></body></html>`;
    return res.send(html);
  }

  // New customer welcome page matching Figma design
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Grabrush - Home</title>
  <link rel="stylesheet" href="/style.css" />
  <style>
    body { max-width: 100% !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
  </style>
</head>
<body>
  <div class="app-container">
    <!-- Top Header -->
    <header class="app-header">
      <div class="header-top">
        <div class="location-selector">
          <svg class="location-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span class="location-text">House 32, Block A, Banani DOHS</span>
          <svg class="chevron-icon" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="notification-icon">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2C6.69 2 4 4.69 4 8v4.59l-1.71 1.7a1 1 0 00-.29.7v1a1 1 0 001 1h14a1 1 0 001-1v-1a1 1 0 00-.29-.7L16 12.59V8c0-3.31-2.69-6-6-6z" fill="currentColor"/>
          </svg>
          <span class="notification-badge"></span>
        </div>
      </div>
      <div class="search-bar">
        <svg class="search-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
          <path d="m13 13 3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <input type="text" placeholder="Search for food or restaurants" class="search-input" />
      </div>
    </header>

    <!-- Category Filter Bar -->
    <div class="category-bar">
      <div class="category-item active" data-category="all">
        <div class="category-icon">□</div>
        <span>All</span>
      </div>
          <a href="/mystery-box" class="category-item" data-category="mystery-box">
            <div class="category-icon">🎁</div>
            <span>Mystery Box</span>
          </a>
      <div class="category-item" data-category="premium-dine-in">
        <div class="category-icon">⭐</div>
        <span>Premium Dine-in</span>
      </div>
      <div class="category-item" data-category="grocery">
        <div class="category-icon">🛒</div>
        <span>Grocery</span>
      </div>
      <div class="category-item" data-category="deals">
        <div class="category-icon">🏷️</div>
        <span>Deals</span>
      </div>
    </div>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Grocery Deals Section -->
      <section class="deals-section">
        <div class="section-header">
          <h2>Grocery Deals</h2>
          <a href="#" class="see-all-link">See All ></a>
        </div>
        <div class="deals-scroll" id="groceryDeals">
          <!-- Populated by JavaScript -->
        </div>
      </section>

      <!-- Mystery Box Deals Section -->
      <section class="deals-section">
        <div class="section-header">
          <h2>Mystery box deals</h2>
          <a href="/mystery-box" class="see-all-link">See All ></a>
        </div>
        <div class="deals-scroll" id="mysteryBoxDeals">
          <!-- Populated by JavaScript -->
        </div>
      </section>

      <!-- Dish of the Day Section -->
      <section class="deals-section">
        <div class="section-header">
          <h2>Dish of the day</h2>
          <a href="#" class="see-all-link">See All ></a>
        </div>
        <div class="deals-scroll" id="dishOfTheDay">
          <!-- Populated by JavaScript -->
        </div>
      </section>
    </main>

    <!-- Bottom Navigation -->
    <nav class="bottom-nav">
      <a href="/welcome" class="nav-item active">
        <svg class="nav-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Home</span>
      </a>
      <a href="/cart" class="nav-item">
        <svg class="nav-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Cart</span>
      </a>
      <a href="/favorites" class="nav-item">
        <svg class="nav-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Favourites</span>
      </a>
      <a href="/account" class="nav-item">
        <svg class="nav-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
        </svg>
        <span>Account</span>
      </a>
    </nav>
  </div>

  <div id="locationMessage" style="display: none;"></div>
  <script src="/welcome-customer.js"></script>
</body>
</html>`;
  res.send(html);
});

// Location page with map
router.get('/location', (req, res) => {
  if (!req.session.userId || req.session.userType !== 'customer') return res.redirect('/');
  const fullName = req.session.userName || 'Food lover';
  const firstName = String(fullName).split(' ')[0] || 'Food lover';
  // Pass firstName via query or store in session for location.html
  req.session.tempFirstName = firstName;
  res.sendFile(require('path').join(__dirname, '..', 'public', 'location.html'));
});

// Get user info (first name)
router.get('/api/user-info', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  const fullName = req.session.userName || 'Food lover';
  const firstName = String(fullName).split(' ')[0] || 'Food lover';
  res.json({ success: true, firstName });
});

// Get user's favorites
router.get('/api/favorites', async (req, res) => {
  if (!req.session.userId || req.session.userType !== 'customer') {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  try {
    const result = await executeQuery('SELECT favorites FROM users WHERE id = ?', [req.session.userId]);
    if (result.success && result.data.length > 0) {
      const favorites = result.data[0].favorites ? JSON.parse(result.data[0].favorites) : [];
      res.json({ success: true, favorites });
    } else {
      res.json({ success: true, favorites: [] });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add store to favorites
router.post('/api/favorites/add', async (req, res) => {
  if (!req.session.userId || req.session.userType !== 'customer') {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  try {
    const { storeName, storeType, lat, lng } = req.body;
    if (!storeName) {
      return res.status(400).json({ success: false, error: 'Store name is required' });
    }
    
    // Get current favorites
    const result = await executeQuery('SELECT favorites FROM users WHERE id = ?', [req.session.userId]);
    let favorites = [];
    if (result.success && result.data.length > 0 && result.data[0].favorites) {
      favorites = JSON.parse(result.data[0].favorites);
    }
    
    // Check if already favorited
    const exists = favorites.find(fav => fav.name === storeName);
    if (exists) {
      return res.json({ success: true, message: 'Store already in favorites', favorites });
    }
    
    // Add new favorite
    favorites.push({ name: storeName, type: storeType, lat, lng });
    const favoritesJson = JSON.stringify(favorites);
    
    await executeQuery('UPDATE users SET favorites = ? WHERE id = ?', [favoritesJson, req.session.userId]);
    res.json({ success: true, message: 'Store added to favorites', favorites });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove store from favorites
router.post('/api/favorites/remove', async (req, res) => {
  if (!req.session.userId || req.session.userType !== 'customer') {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  try {
    const { storeName } = req.body;
    if (!storeName) {
      return res.status(400).json({ success: false, error: 'Store name is required' });
    }
    
    // Get current favorites
    const result = await executeQuery('SELECT favorites FROM users WHERE id = ?', [req.session.userId]);
    let favorites = [];
    if (result.success && result.data.length > 0 && result.data[0].favorites) {
      favorites = JSON.parse(result.data[0].favorites);
    }
    
    // Remove favorite
    favorites = favorites.filter(fav => fav.name !== storeName);
    const favoritesJson = JSON.stringify(favorites);
    
    await executeQuery('UPDATE users SET favorites = ? WHERE id = ?', [favoritesJson, req.session.userId]);
    res.json({ success: true, message: 'Store removed from favorites', favorites });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Favorites page
router.get('/favorites', (req, res) => {
  if (!req.session.userId || req.session.userType !== 'customer') return res.redirect('/');
  res.sendFile(require('path').join(__dirname, '..', 'public', 'favorites.html'));
});

// Get cart
router.get('/api/cart', async (req, res) => {
  if (!req.session.userId || req.session.userType !== 'customer') {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  try {
    const result = await executeQuery('SELECT cart FROM users WHERE id = ?', [req.session.userId]);
    if (result.success && result.data.length > 0) {
      const cart = result.data[0].cart ? JSON.parse(result.data[0].cart) : [];
      res.json({ success: true, cart });
    } else {
      res.json({ success: true, cart: [] });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add to cart
router.post('/api/cart/add', async (req, res) => {
  if (!req.session.userId || req.session.userType !== 'customer') {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  try {
    const { restaurantName, itemName, price, quantity = 1, image, pickupTime } = req.body;
    if (!restaurantName || !itemName || !price) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    // Get current cart
    const result = await executeQuery('SELECT cart FROM users WHERE id = ?', [req.session.userId]);
    let cart = [];
    if (result.success && result.data.length > 0 && result.data[0].cart) {
      cart = JSON.parse(result.data[0].cart);
    }
    
    // Check if item already exists (same restaurant and item name)
    const existingIndex = cart.findIndex(item => 
      item.restaurantName === restaurantName && item.itemName === itemName
    );
    
    if (existingIndex >= 0) {
      // Update quantity
      cart[existingIndex].quantity += quantity;
    } else {
      // Add new item
      cart.push({
        restaurantName,
        itemName,
        price: parseFloat(price),
        quantity,
        image: image || '',
        pickupTime: pickupTime || '8:30 - 9:30'
      });
    }
    
    const cartJson = JSON.stringify(cart);
    await executeQuery('UPDATE users SET cart = ? WHERE id = ?', [cartJson, req.session.userId]);
    res.json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove from cart
router.post('/api/cart/remove', async (req, res) => {
  if (!req.session.userId || req.session.userType !== 'customer') {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  try {
    const { restaurantName, itemName } = req.body;
    if (!restaurantName || !itemName) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    // Get current cart
    const result = await executeQuery('SELECT cart FROM users WHERE id = ?', [req.session.userId]);
    let cart = [];
    if (result.success && result.data.length > 0 && result.data[0].cart) {
      cart = JSON.parse(result.data[0].cart);
    }
    
    // Remove item
    cart = cart.filter(item => 
      !(item.restaurantName === restaurantName && item.itemName === itemName)
    );
    
    const cartJson = JSON.stringify(cart);
    await executeQuery('UPDATE users SET cart = ? WHERE id = ?', [cartJson, req.session.userId]);
    res.json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update cart item quantity
router.post('/api/cart/update', async (req, res) => {
  if (!req.session.userId || req.session.userType !== 'customer') {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  try {
    const { restaurantName, itemName, quantity } = req.body;
    if (!restaurantName || !itemName || quantity === undefined) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    // Get current cart
    const result = await executeQuery('SELECT cart FROM users WHERE id = ?', [req.session.userId]);
    let cart = [];
    if (result.success && result.data.length > 0 && result.data[0].cart) {
      cart = JSON.parse(result.data[0].cart);
    }
    
    // Update quantity
    const itemIndex = cart.findIndex(item => 
      item.restaurantName === restaurantName && item.itemName === itemName
    );
    
    if (itemIndex >= 0) {
      if (quantity <= 0) {
        cart.splice(itemIndex, 1);
      } else {
        cart[itemIndex].quantity = quantity;
      }
    }
    
    const cartJson = JSON.stringify(cart);
    await executeQuery('UPDATE users SET cart = ? WHERE id = ?', [cartJson, req.session.userId]);
    res.json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cart page
router.get('/cart', (req, res) => {
  if (!req.session.userId || req.session.userType !== 'customer') return res.redirect('/');
  res.sendFile(require('path').join(__dirname, '..', 'public', 'cart.html'));
});

// Confirm order
router.post('/api/order/confirm', async (req, res) => {
  if (!req.session.userId || req.session.userType !== 'customer') {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  try {
    // Get cart
    const cartResult = await executeQuery('SELECT cart FROM users WHERE id = ?', [req.session.userId]);
    let cart = [];
    if (cartResult.success && cartResult.data.length > 0 && cartResult.data[0].cart) {
      cart = JSON.parse(cartResult.data[0].cart);
    }
    
    if (cart.length === 0) {
      return res.status(400).json({ success: false, error: 'Cart is empty' });
    }
    
    // Generate order ID
    const orderId = Math.floor(1000 + Math.random() * 9000);
    
    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = 2.00;
    const platformFee = 1.00;
    const total = subtotal + deliveryFee + platformFee;
    
    // Store order in session for confirmation page
    req.session.orderId = orderId;
    req.session.orderCart = JSON.stringify(cart);
    req.session.orderTotal = total;
    req.session.orderSubtotal = subtotal;
    
    // Clear cart
    await executeQuery('UPDATE users SET cart = ? WHERE id = ?', ['[]', req.session.userId]);
    
    res.json({ success: true, orderId, redirect: '/order-confirmation' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get order data for confirmation page
router.get('/api/order/data', (req, res) => {
  if (!req.session.userId || req.session.userType !== 'customer') {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  if (!req.session.orderId) {
    return res.status(404).json({ success: false, error: 'No order found' });
  }
  
  const orderId = req.session.orderId;
  const cart = JSON.parse(req.session.orderCart || '[]');
  const total = req.session.orderTotal || 0;
  const restaurantName = cart.length > 0 ? cart[0].restaurantName : 'Restaurant';
  const pickupTime = cart.length > 0 ? (cart[0].pickupTime || '8:30 PM - 9:30 PM') : '8:30 PM - 9:30 PM';
  
  res.json({
    success: true,
    order: {
      orderId,
      cart,
      total,
      restaurantName,
      pickupTime
    }
  });
});

// Order confirmation page
router.get('/order-confirmation', (req, res) => {
  if (!req.session.userId || req.session.userType !== 'customer') return res.redirect('/');
  if (!req.session.orderId) return res.redirect('/cart');
  
  res.sendFile(require('path').join(__dirname, '..', 'public', 'order-confirmation.html'));
});

// Account page
router.get('/account', (req, res) => {
  if (!req.session.userId) return res.redirect('/');
  const fullName = req.session.userName || 'User';
  const firstName = String(fullName).split(' ')[0] || 'User';
  const userType = req.session.userType || 'customer';
  
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Grabrush - Account</title>
      <link rel="stylesheet" href="/style.css" />
      <style>
        body { max-width: 100% !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
      </style>
    </head>
    <body>
      <div class="app-container">
        <header class="app-header">
          <div class="header-top">
            <h1 style="color: white; font-size: 18px; margin: 0;">Account</h1>
          </div>
        </header>
        <main class="main-content" style="padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 80px; height: 80px; background: #4CAF50; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; color: white; font-size: 32px; font-weight: bold;">
              ${firstName.charAt(0).toUpperCase()}
            </div>
            <h2 style="margin: 0 0 8px 0; color: #333;">${fullName}</h2>
            <p style="color: #666; margin: 0;">${userType === 'customer' ? 'Customer' : 'Vendor'}</p>
          </div>
          <form action="/logout" method="POST" style="margin-top: 40px;">
            <button type="submit" class="logout-button" style="width: 100%;">Logout</button>
          </form>
        </main>
        <nav class="bottom-nav">
          <a href="/welcome" class="nav-item">
            <svg class="nav-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Home</span>
          </a>
          <a href="/cart" class="nav-item">
            <svg class="nav-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Cart</span>
          </a>
          <a href="/favorites" class="nav-item">
            <svg class="nav-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Favourites</span>
          </a>
          <a href="/account" class="nav-item active">
            <svg class="nav-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
            </svg>
            <span>Account</span>
          </a>
        </nav>
      </div>
    </body>
    </html>
  `);
});

// Mystery Box page
router.get('/mystery-box', (req, res) => {
  if (!req.session.userId || req.session.userType !== 'customer') return res.redirect('/');
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Grabrush - Mystery Box</title>
      <link rel="stylesheet" href="/style.css" />
      <style>
        body { max-width: 100% !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
      </style>
    </head>
    <body>
      <div class="app-container">
        <!-- Top Header -->
        <header class="app-header">
          <div class="header-top">
            <div class="location-selector">
              <svg class="location-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span class="location-text">House 32, Block A, Banani DOHS</span>
              <svg class="chevron-icon" width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="notification-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2C6.69 2 4 4.69 4 8v4.59l-1.71 1.7a1 1 0 00-.29.7v1a1 1 0 001 1h14a1 1 0 001-1v-1a1 1 0 00-.29-.7L16 12.59V8c0-3.31-2.69-6-6-6z" fill="currentColor"/>
              </svg>
              <span class="notification-badge"></span>
            </div>
          </div>
          <div class="search-bar">
            <svg class="search-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
              <path d="m13 13 3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <input type="text" placeholder="Search for food or restaurants" class="search-input" />
          </div>
        </header>

        <!-- Category Filter Bar -->
        <div class="category-bar">
          <a href="/welcome" class="category-item" data-category="all">
            <div class="category-icon">□</div>
            <span>All</span>
          </a>
          <div class="category-item active" data-category="mystery-box">
            <div class="category-icon">🎁</div>
            <span>Mystery Box</span>
          </div>
          <a href="/welcome" class="category-item" data-category="premium-dine-in">
            <div class="category-icon">⭐</div>
            <span>Premium Dine-in</span>
          </a>
          <a href="/welcome" class="category-item" data-category="grocery">
            <div class="category-icon">🛒</div>
            <span>Grocery</span>
          </a>
          <a href="/welcome" class="category-item" data-category="deals">
            <div class="category-icon">🏷️</div>
            <span>Deals</span>
          </a>
        </div>

        <!-- Filter Buttons -->
        <div class="filter-bar">
          <button class="filter-btn" data-filter="sort">
            Sort <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="margin-left: 4px;">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="filter-btn" data-filter="rating">
            Rating <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="margin-left: 4px;">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="filter-btn" data-filter="cuisines">
            Cuisines <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="margin-left: 4px;">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="filter-btn" data-filter="price">
            Price <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="margin-left: 4px;">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>

        <!-- Main Content -->
        <main class="main-content" style="padding: 16px;">
          <div id="mysteryBoxList" class="mystery-box-list">
            <!-- Mystery box items will be loaded here -->
          </div>
        </main>

        <!-- Bottom Navigation -->
        <nav class="bottom-nav">
          <a href="/welcome" class="nav-item">
            <svg class="nav-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Home</span>
          </a>
          <a href="/cart" class="nav-item">
            <svg class="nav-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Cart</span>
          </a>
          <a href="/favorites" class="nav-item">
            <svg class="nav-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Favourites</span>
          </a>
          <a href="/account" class="nav-item">
            <svg class="nav-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
            </svg>
            <span>Account</span>
          </a>
        </nav>
      </div>

      <script src="/mystery-box.js"></script>
    </body>
    </html>
  `);
});

module.exports = router;