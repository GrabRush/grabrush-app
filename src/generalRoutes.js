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

  let grid = '';
  if (userType === 'vendor') {
    const restaurants = [
      { name: 'Bella Vista Restaurant', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop' },
      { name: 'The Gourmet Kitchen', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1200&auto=format&fit=crop' },
      { name: 'Seaside Bistro', image: 'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?q=80&w=1200&auto=format&fit=crop' },
      { name: 'Mountain View Cafe', image: 'https://images.unsplash.com/photo-1515669097368-22e68427d265?q=80&w=1200&auto=format&fit=crop' },
      { name: 'Downtown Diner', image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1200&auto=format&fit=crop' },
      { name: 'The Rustic Table', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop' }
    ];
    grid = restaurants.map(r => `<div class="restaurant-item"><img src="${r.image}" alt="${r.name}" loading="lazy"><div class="restaurant-name">${r.name}</div></div>`).join('');
  } else {
    // For customers, show store cards (loaded dynamically via JavaScript)
    grid = '<div id="storesGrid" class="stores-list"></div><div id="locationMessage" style="text-align: center; padding: 20px; color: #666;">Requesting location access...</div>';
  }

  // Add Favorites and Location buttons only for customers (Favorites on left, Location on right)
  const customerButtons = userType === 'customer' 
    ? '<a href="/favorites" class="location-button" style="background-color: #2196F3;">❤️ Favorites</a><a href="/location" class="location-button">📍 Location</a>' 
    : '';
  
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Grabrush - Welcome</title><link rel="stylesheet" href="/style.css" /></head><body><div class="container"><div class="welcome-header"><div class="welcome-title">Welcome ${firstName}</div><div style="display: flex; gap: 10px; align-items: center;">${customerButtons}<form action="/logout" method="POST" style="margin:0;"><button type="submit" class="logout-button">Logout</button></form></div></div>${userType === 'customer' ? grid : `<div class="food-grid">${grid}</div>`}${userType === 'customer' ? '' : '<div class="footer-links"><a href="#">Contact us</a><a href="#">About</a></div>'}${userType === 'customer' ? '<script src="/welcome-customer.js"></script>' : ''}</body></html>`;
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

module.exports = router;