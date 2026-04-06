// Welcome page script for customers - matches Figma design
let userLocation = null;
let userFavorites = [];
let currentRadius = 4.8; // Default radius in km (3 miles = ~4.8 km)
let mockStores = [];
let allStores = [];
let searchTerm = '';
let sortMode = 'distance';
let notifications = [];

// Load user's favorites
async function loadFavorites() {
    try {
        const response = await fetch('/api/favorites');
        const data = await response.json();
        if (data.success) {
            userFavorites = data.favorites || [];
        }
    } catch (error) {
        console.error('Error loading favorites:', error);
    }
}

// Update location text in header
async function updateLocationText(lat, lng) {
    try {
        // Try to get address from coordinates using reverse geocoding
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
        const data = await response.json();
        if (data && data.display_name) {
            const address = data.display_name.split(',').slice(0, 3).join(',');
            const locationText = document.querySelector('.location-text');
            if (locationText) {
                locationText.textContent = address;
            }
        }
    } catch (error) {
        console.error('Error fetching address:', error);
        // Keep default location text
    }
}

// Get user's current location
function getCurrentLocation() {
    if (!navigator.geolocation) {
        console.error('Geolocation is not supported by your browser.');
        // Use default location if geolocation not available
        userLocation = { lat: 23.7943, lng: 90.4064 }; // Default to Dhaka, Bangladesh
        initializeStores();
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        function(position) {
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            updateLocationText(userLocation.lat, userLocation.lng);
            initializeStores();
        },
        function(error) {
            console.error('Location error:', error);
            // Use default location if permission denied
            userLocation = { lat: 23.7943, lng: 90.4064 }; // Default to Dhaka, Bangladesh
            initializeStores();
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// Generate stores around user location
function generateStoresAroundLocation(userLat, userLng) {
    const storeTemplates = [
        { name: 'Fresh Market', type: 'grocery', itemName: 'Organic Fruit Box', image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=800&auto=format&fit=crop', rating: 4.5 },
        { name: 'Green Grocers', type: 'grocery', itemName: 'Seasonal Veg Basket', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800&auto=format&fit=crop', rating: 4.3 },
        { name: 'Bella Vista Restaurant', type: 'restaurant', itemName: 'Creamy Truffle Pasta', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800&auto=format&fit=crop', rating: 4.8 },
        { name: 'The Gourmet Kitchen', type: 'restaurant', itemName: 'Signature Burger', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=800&auto=format&fit=crop', rating: 4.7 },
        { name: 'City Market', type: 'grocery', itemName: 'Fresh Salad Kit', image: 'https://images.unsplash.com/photo-1587132137056-bfbf0166836f?q=80&w=800&auto=format&fit=crop', rating: 4.2 },
        { name: 'Seaside Bistro', type: 'restaurant', itemName: 'Grilled Salmon Bowl', image: 'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?q=80&w=800&auto=format&fit=crop', rating: 4.6 },
        { name: 'Mountain View Cafe', type: 'restaurant', itemName: 'Breakfast Stack', image: 'https://images.unsplash.com/photo-1515669097368-22e68427d265?q=80&w=800&auto=format&fit=crop', rating: 4.9 },
        { name: 'Downtown Diner', type: 'restaurant', itemName: 'Classic Diner Plate', image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=800&auto=format&fit=crop', rating: 4.4 },
        { name: 'Organic Foods', type: 'grocery', itemName: 'Whole Foods Pack', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800&auto=format&fit=crop', rating: 4.6 },
        { name: 'The Rustic Table', type: 'restaurant', itemName: 'Farmhouse Chicken', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop', rating: 4.7 },
        { name: 'Super Mart', type: 'grocery', itemName: 'Essentials Box', image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=800&auto=format&fit=crop', rating: 4.1 },
        { name: 'Food Express', type: 'grocery', itemName: 'Quick Meal Pack', image: 'https://images.unsplash.com/photo-1587132137056-bfbf0166836f?q=80&w=800&auto=format&fit=crop', rating: 4.3 },
        { name: 'Corner Store', type: 'grocery', itemName: 'Everyday Essentials', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800&auto=format&fit=crop', rating: 4.0 },
        { name: 'Pizza Palace', type: 'restaurant', itemName: 'Margherita Pizza', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800&auto=format&fit=crop', rating: 4.5 },
        { name: 'Quick Bite', type: 'restaurant', itemName: 'Spicy Wings Box', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=800&auto=format&fit=crop', rating: 4.2 },
        { name: 'Local Market', type: 'grocery', itemName: 'Local Produce Set', image: 'https://images.unsplash.com/photo-1587132137056-bfbf0166836f?q=80&w=800&auto=format&fit=crop', rating: 4.4 },
        { name: 'Ruen Busaba', type: 'restaurant', itemName: 'Thai Curry Bowl', image: 'https://images.unsplash.com/photo-1551782450-17144efb9c50?q=80&w=800&auto=format&fit=crop', rating: 4.8 },
        { name: 'Pizzaria', type: 'restaurant', itemName: 'Cheese Lovers Slice', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop', rating: 4.8 },
        { name: 'Lonestar Steakhouse', type: 'restaurant', itemName: 'Grilled Steak Plate', image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=800&auto=format&fit=crop', rating: 4.6 },
        { name: 'Yum Cha District', type: 'restaurant', itemName: 'Dim Sum Sampler', image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=800&auto=format&fit=crop', rating: 4.7 }
    ];
    
    return storeTemplates.map((template) => {
        const distance = 0.3 + Math.random() * 9.7;
        const bearing = Math.random() * 360;
        
        const latOffset = (distance / 111) * Math.cos(bearing * Math.PI / 180);
        const lngOffset = (distance / (111 * Math.cos(userLat * Math.PI / 180))) * Math.sin(bearing * Math.PI / 180);
        
        return {
            name: template.name,
            type: template.type,
            itemName: template.itemName,
            image: template.image,
            rating: template.rating,
            lat: userLat + latOffset,
            lng: userLng + lngOffset,
            price: (2.99 + Math.random() * 15).toFixed(2),
            discount: Math.random() > 0.5 ? (Math.random() * 20 + 10).toFixed(0) : null,
            timeRange: Math.random() > 0.5 ? '9-10 PM' : '11 AM-2 PM'
        };
    });
}

// Calculate distance between two coordinates
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Check if store is favorited
function isFavorited(storeName) {
    return userFavorites.some(fav => fav.name === storeName);
}

// Toggle favorite
async function toggleFavorite(storeName, storeType, lat, lng) {
    const isFavorited = userFavorites.some(fav => fav.name === storeName);
    
    try {
        const endpoint = isFavorited ? '/api/favorites/remove' : '/api/favorites/add';
        const body = isFavorited ? { storeName } : { storeName, storeType, lat, lng };
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        const data = await response.json();
        if (data.success) {
            userFavorites = data.favorites;
            displayAllSections();
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
    }
}

// Display Grocery Deals (brand logo style)
function displayGroceryDeals(stores) {
    const groceryStores = stores
        .filter(store => store.type === 'grocery' && store.distance <= currentRadius)
        .slice(0, 4);
    
    const container = document.getElementById('groceryDeals');
    if (!container) return;
    
    const groceryDeals = [
        { name: 'Arbys Free...', logo: 'https://logos-world.net/wp-content/uploads/2021/02/Arby-s-Logo.png', deal: 'Free Delivery' },
        { name: '7/11 - Gul...', logo: 'https://logos-world.net/wp-content/uploads/2021/03/7-Eleven-Logo.png', deal: 'Upto 25% Discount' },
        { name: 'Five Guys', logo: 'https://logos-world.net/wp-content/uploads/2021/08/Five-Guys-Logo.png', deal: 'BOGO' },
        { name: 'Burger King', logo: 'https://logos-world.net/wp-content/uploads/2021/03/Burger-King-Logo.png', deal: 'Upto 10% discounts' }
    ];
    
    container.innerHTML = groceryDeals.map(deal => `
        <div class="grocery-deal-card">
            <img src="${deal.logo}" alt="${deal.name}" class="brand-logo" onerror="this.style.display='none'">
            <div class="brand-name">${deal.name}</div>
            <span class="deal-tag">${deal.deal}</span>
        </div>
    `).join('');
}

// Display Mystery Box Deals
function displayMysteryBoxDeals(stores) {
    const container = document.getElementById('mysteryBoxDeals');
    if (!container) return;
    
    const mysteryStores = stores
        .filter(store => store.distance <= currentRadius)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 6);
    
    if (mysteryStores.length === 0) {
        container.innerHTML = '<p style="color: #999; padding: 20px; text-align: center;">No deals available near you</p>';
        return;
    }
    
    container.innerHTML = mysteryStores.map(store => {
        const favorited = isFavorited(store.name);
        const distanceMiles = (store.distance * 0.621371).toFixed(1);
        const discountPrice = store.discount ? (parseFloat(store.price) * (1 - store.discount / 100)).toFixed(2) : store.price;
        
        return `
            <div class="food-deal-card" data-vendor-name="${store.name.replace(/"/g, '&quot;')}" data-item-name="${store.itemName || store.name}" data-item-price="${store.price}" data-item-image="${store.image}">
                <img src="${store.image}" alt="${store.itemName || store.name}" class="card-image" loading="lazy">
                <button class="add-to-cart-btn" title="Add to cart">+</button>
                <div class="card-heart ${favorited ? 'filled' : ''}" 
                     data-store-name="${store.name.replace(/"/g, '&quot;')}"
                     data-store-type="${store.type}"
                     data-store-lat="${store.lat}"
                     data-store-lng="${store.lng}">
                    <svg viewBox="0 0 24 24" fill="${favorited ? '#e91e63' : 'none'}" stroke="${favorited ? '#e91e63' : 'currentColor'}" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                    </svg>
                </div>
                <div class="card-content">
                    <div class="card-title">${store.itemName || store.name}</div>
                    <div class="card-subtitle">${store.name}</div>
                    <div class="card-price-row">
                        ${store.discount ? `<span class="discount-tag">Save $${(parseFloat(store.price) - parseFloat(discountPrice)).toFixed(2)}</span>` : ''}
                        <span class="price-old">$${store.price}</span>
                        <span class="price-new">$${discountPrice}</span>
                    </div>
                    <div class="card-details">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <span>${store.timeRange}</span>
                        <span>${distanceMiles} Mile</span>
                        <div class="rating">
                            <svg class="rating-star" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                            <span>${store.rating}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Add event listeners to heart icons
    container.querySelectorAll('.card-heart').forEach(heart => {
        heart.addEventListener('click', function(e) {
            e.stopPropagation();
            const storeName = this.getAttribute('data-store-name');
            const storeType = this.getAttribute('data-store-type');
            const lat = parseFloat(this.getAttribute('data-store-lat'));
            const lng = parseFloat(this.getAttribute('data-store-lng'));
            toggleFavorite(storeName, storeType, lat, lng);
        });
    });

    wireVendorCardClicks(container);
}

// Display Dish of the Day
function displayDishOfTheDay(stores) {
    const container = document.getElementById('dishOfTheDay');
    if (!container) return;
    
    const dishStores = stores
        .filter(store => store.type === 'restaurant' && store.distance <= currentRadius)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 6);
    
    if (dishStores.length === 0) {
        container.innerHTML = '<p style="color: #999; padding: 20px; text-align: center;">No restaurants available near you</p>';
        return;
    }
    
    container.innerHTML = dishStores.map(store => {
        const favorited = isFavorited(store.name);
        const distanceMiles = (store.distance * 0.621371).toFixed(1);
        const discount = store.discount || Math.floor(Math.random() * 20 + 10);
        
        return `
            <div class="food-deal-card" data-vendor-name="${store.name.replace(/"/g, '&quot;')}" data-item-name="${store.itemName || store.name}" data-item-price="${store.price}" data-item-image="${store.image}">
                <img src="${store.image}" alt="${store.itemName || store.name}" class="card-image" loading="lazy">
                <button class="add-to-cart-btn" title="Add to cart">+</button>
                <div class="card-heart ${favorited ? 'filled' : ''}" 
                     data-store-name="${store.name.replace(/"/g, '&quot;')}"
                     data-store-type="${store.type}"
                     data-store-lat="${store.lat}"
                     data-store-lng="${store.lng}">
                    <svg viewBox="0 0 24 24" fill="${favorited ? '#e91e63' : 'none'}" stroke="${favorited ? '#e91e63' : 'currentColor'}" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                    </svg>
                </div>
                <div class="card-content">
                    <div class="card-title">${store.itemName || store.name}</div>
                    <div class="card-subtitle">${store.name}</div>
                    <div class="card-price-row">
                        <span class="discount-tag">${discount}% Discount</span>
                        <span class="price-new">$${store.price}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Add event listeners to heart icons
    container.querySelectorAll('.card-heart').forEach(heart => {
        heart.addEventListener('click', function(e) {
            e.stopPropagation();
            const storeName = this.getAttribute('data-store-name');
            const storeType = this.getAttribute('data-store-type');
            const lat = parseFloat(this.getAttribute('data-store-lat'));
            const lng = parseFloat(this.getAttribute('data-store-lng'));
            toggleFavorite(storeName, storeType, lat, lng);
        });
    });

    wireVendorCardClicks(container);
}

function openVendorProfile(vendorName) {
    if (!vendorName) return;
    window.location.href = `/vendor-profile?name=${encodeURIComponent(vendorName)}`;
}

function wireVendorCardClicks(container) {
    if (!container) return;
    container.querySelectorAll('.food-deal-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.add-to-cart-btn')) return;
            if (e.target.closest('.card-heart')) return;
            const vendorName = card.getAttribute('data-vendor-name');
            openVendorProfile(vendorName);
        });
    });

    container.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = btn.closest('.food-deal-card');
            if (card) addItemToCart(card);
        });
    });
}

async function addItemToCart(card) {
    const restaurantName = card.getAttribute('data-vendor-name');
    const itemName = card.getAttribute('data-item-name');
    const price = card.getAttribute('data-item-price');
    const image = card.getAttribute('data-item-image');
    if (!restaurantName || !itemName || !price) return;
    try {
        const response = await fetch('/api/cart/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                restaurantName,
                itemName,
                price: Number(price),
                quantity: 1,
                image,
                pickupTime: '8:30 PM - 9:30 PM'
            })
        });
        const data = await response.json();
        if (!data.success) {
            console.error('Add to cart failed', data.error);
        }
    } catch (error) {
        console.error('Add to cart error', error);
    }
}

// Display all sections
function displayAllSections() {
    const visibleStores = getVisibleStores();
    displayGroceryDeals(visibleStores);
    displayMysteryBoxDeals(visibleStores);
    displayDishOfTheDay(visibleStores);
}

function parseTimeString(timeStr) {
    const match = String(timeStr || '').trim().match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const meridian = match[3].toUpperCase();
    if (meridian === 'PM' && hours < 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
}

function parsePickupRange(rangeText) {
    const parts = String(rangeText || '').split('-').map(p => p.trim());
    if (parts.length < 2) return null;
    const start = parseTimeString(parts[0]);
    const end = parseTimeString(parts[1]);
    if (!start || !end) return null;
    return { start, end, labelStart: parts[0], labelEnd: parts[1] };
}

function buildPickupNotifications(restaurantName, pickupTime) {
    const range = parsePickupRange(pickupTime);
    if (!range) return [];
    const now = new Date();
    const thirtyMin = 30 * 60 * 1000;
    const formatRemaining = (ms) => {
        const mins = Math.max(0, Math.round(ms / 60000));
        if (mins < 60) return `${mins} min`;
        const hours = Math.floor(mins / 60);
        const rem = mins % 60;
        return `${hours}h ${rem}m`;
    };
    const notes = [];
    if (now < range.start && range.start - now <= thirtyMin) {
        notes.push({
            title: `Pickup window starts at ${range.labelStart}`,
            time: restaurantName,
            meta: `Starts in ${formatRemaining(range.start - now)}`
        });
    }
    if (now >= range.start && now <= range.end) {
        notes.push({
            title: `Pickup window is open until ${range.labelEnd}`,
            time: restaurantName,
            meta: `Ends in ${formatRemaining(range.end - now)}`
        });
    }
    if (now < range.end && range.end - now <= thirtyMin) {
        notes.push({
            title: `Pickup window ending at ${range.labelEnd}`,
            time: restaurantName,
            meta: `Ends in ${formatRemaining(range.end - now)}`
        });
    }
    return notes;
}

async function loadNotifications() {
    notifications = [];
    try {
        const cartRes = await fetch('/api/cart');
        const cartData = await cartRes.json();
        if (cartData.success && Array.isArray(cartData.cart) && cartData.cart.length) {
            const pickupTime = cartData.cart[0].pickupTime || '8:30 PM - 9:30 PM';
            const restaurantName = cartData.cart[0].restaurantName || 'Your order';
            notifications.push(...buildPickupNotifications(restaurantName, pickupTime));
        }
    } catch (error) {
        console.error('Error loading cart notifications:', error);
    }

    try {
        const orderRes = await fetch('/api/order/data');
        const orderData = await orderRes.json();
        if (orderData.success && orderData.order) {
            const pickupTime = orderData.order.pickupTime || '8:30 PM - 9:30 PM';
            const restaurantName = orderData.order.restaurantName || 'Your order';
            notifications.push(...buildPickupNotifications(restaurantName, pickupTime));
        }
    } catch (error) {
        // No active order, ignore
    }

    renderNotifications();
}

async function loadProfileSummary() {
    const avatarEl = document.getElementById('profileAvatar');
    if (!avatarEl) return;
    try {
        const response = await fetch('/api/profile-summary');
        const data = await response.json();
        if (!data.success) return;
        if (data.user && data.user.name) {
            const fullName = data.user.name;
            if (avatarEl && !data.user.avatar_url) {
                avatarEl.textContent = fullName.charAt(0).toUpperCase();
            }
        }
        if (avatarEl && data.user && data.user.avatar_url) {
            avatarEl.innerHTML = `<img src="${data.user.avatar_url}" alt="Profile">`;
        }
    } catch (error) {
        console.error('Error loading profile summary:', error);
    }
}

function renderNotifications() {
    const badge = document.getElementById('notificationBadge');
    const list = document.getElementById('notificationList');
    if (!list) return;
    if (!notifications.length) {
        list.innerHTML = '<div class="notification-item"><div class="notification-item-title">No new notifications</div></div>';
        if (badge) badge.style.display = 'none';
        return;
    }
    if (badge) badge.style.display = 'block';
    list.innerHTML = notifications.map(note => `
        <div class="notification-item">
            <div class="notification-item-title">${note.title}</div>
            <div class="notification-item-time">${note.time}</div>
            ${note.meta ? `<div class="notification-item-meta">${note.meta}</div>` : ''}
        </div>
    `).join('');
}

function getVisibleStores() {
    const term = searchTerm.trim().toLowerCase();
    let list = allStores.slice();
    if (term) {
        list = list.filter(store => {
            const vendor = store.name.toLowerCase();
            const item = (store.itemName || '').toLowerCase();
            return vendor.includes(term) || item.includes(term);
        });
    }
    if (sortMode === 'rating') {
        list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortMode === 'name') {
        list.sort((a, b) => a.name.localeCompare(b.name));
    } else {
        list.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }
    return list;
}

// Initialize stores
function initializeStores() {
    if (userLocation) {
        mockStores = generateStoresAroundLocation(userLocation.lat, userLocation.lng);
        
        // Calculate distances and filter stores
        allStores = mockStores.map(store => ({
            ...store,
            distance: calculateDistance(userLocation.lat, userLocation.lng, store.lat, store.lng)
        })).filter(store => store.distance <= currentRadius);
        
        displayAllSections();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Location selector - redirect to location page
    const locationSelector = document.querySelector('.location-selector');
    if (locationSelector) {
        locationSelector.addEventListener('click', function() {
            window.location.href = '/location';
        });
    }
    
    // Category filters
    const categoryItems = document.querySelectorAll('.category-item');
    categoryItems.forEach(item => {
        item.addEventListener('click', function() {
            categoryItems.forEach(cat => cat.classList.remove('active'));
            this.classList.add('active');
            // Filter functionality can be added here
        });
    });

    const searchInput = document.querySelector('.search-input');
    const clearButton = document.querySelector('.search-clear');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value || '';
            if (clearButton) {
                clearButton.classList.toggle('visible', searchTerm.trim().length > 0);
            }
            displayAllSections();
        });
    }
    if (clearButton) {
        clearButton.addEventListener('click', () => {
            searchTerm = '';
            if (searchInput) searchInput.value = '';
            clearButton.classList.remove('visible');
            displayAllSections();
        });
    }

    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            sortMode = e.target.value || 'distance';
            displayAllSections();
        });
    }

    const notificationIcon = document.getElementById('notificationIcon');
    const notificationPanel = document.getElementById('notificationPanel');
    if (notificationIcon && notificationPanel) {
        const togglePanel = () => {
            notificationPanel.classList.toggle('open');
            notificationPanel.setAttribute('aria-hidden', notificationPanel.classList.contains('open') ? 'false' : 'true');
        };
        notificationIcon.addEventListener('click', togglePanel);
        notificationIcon.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') togglePanel();
        });
        document.addEventListener('click', (e) => {
            if (!notificationPanel.contains(e.target) && !notificationIcon.contains(e.target)) {
                notificationPanel.classList.remove('open');
                notificationPanel.setAttribute('aria-hidden', 'true');
            }
        });
    }

    // Profile bubble navigates to /account
}

// Initialize on page load
(async function() {
    await loadFavorites();
    await loadProfileSummary();
    await loadNotifications();
    getCurrentLocation();
    setupEventListeners();
})();
