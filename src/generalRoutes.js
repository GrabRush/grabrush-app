const express = require('express');
const path = require('path');
const router = express.Router();

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

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Grabrush - Welcome</title><link rel="stylesheet" href="/style.css" /></head><body><div class="container"><div class="welcome-header"><div class="welcome-title">Welcome ${firstName}</div><form action="/logout" method="POST" style="margin:0;"><button type="submit" class="logout-button">Logout</button></form></div><div class="food-grid">${grid}</div><div class="footer-links"><a href="#">Contact us</a><a href="#">About</a></div></div></body></html>`;
  res.send(html);
});

module.exports = router;