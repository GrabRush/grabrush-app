// Welcome page script for customers - matches Figma design
let userLocation = null;
let userFavorites = [];
let currentRadius = 4.8; // Default radius in km (3 miles = ~4.8 km)
let mockStores = [];
let allStores = [];

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
        { name: 'Fresh Market', type: 'grocery', image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=800&auto=format&fit=crop', rating: 4.5 },
        { name: 'Green Grocers', type: 'grocery', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800&auto=format&fit=crop', rating: 4.3 },
        { name: 'Bella Vista Restaurant', type: 'restaurant', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800&auto=format&fit=crop', rating: 4.8 },
        { name: 'The Gourmet Kitchen', type: 'restaurant', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=800&auto=format&fit=crop', rating: 4.7 },
        { name: 'City Market', type: 'grocery', image: 'https://images.unsplash.com/photo-1587132137056-bfbf0166836f?q=80&w=800&auto=format&fit=crop', rating: 4.2 },
        { name: 'Seaside Bistro', type: 'restaurant', image: 'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?q=80&w=800&auto=format&fit=crop', rating: 4.6 },
        { name: 'Mountain View Cafe', type: 'restaurant', image: 'https://images.unsplash.com/photo-1515669097368-22e68427d265?q=80&w=800&auto=format&fit=crop', rating: 4.9 },
        { name: 'Downtown Diner', type: 'restaurant', image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=800&auto=format&fit=crop', rating: 4.4 },
        { name: 'Organic Foods', type: 'grocery', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800&auto=format&fit=crop', rating: 4.6 },
        { name: 'The Rustic Table', type: 'restaurant', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop', rating: 4.7 },
        { name: 'Super Mart', type: 'grocery', image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=800&auto=format&fit=crop', rating: 4.1 },
        { name: 'Food Express', type: 'grocery', image: 'https://images.unsplash.com/photo-1587132137056-bfbf0166836f?q=80&w=800&auto=format&fit=crop', rating: 4.3 },
        { name: 'Corner Store', type: 'grocery', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800&auto=format&fit=crop', rating: 4.0 },
        { name: 'Pizza Palace', type: 'restaurant', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800&auto=format&fit=crop', rating: 4.5 },
        { name: 'Quick Bite', type: 'restaurant', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=800&auto=format&fit=crop', rating: 4.2 },
        { name: 'Local Market', type: 'grocery', image: 'https://images.unsplash.com/photo-1587132137056-bfbf0166836f?q=80&w=800&auto=format&fit=crop', rating: 4.4 },
        { name: 'Ruen Busaba', type: 'restaurant', image: 'https://images.unsplash.com/photo-1551782450-17144efb9c50?q=80&w=800&auto=format&fit=crop', rating: 4.8 },
        { name: 'Pizzaria', type: 'restaurant', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop', rating: 4.8 },
        { name: 'Lonestar Steakhouse', type: 'restaurant', image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=800&auto=format&fit=crop', rating: 4.6 },
        { name: 'Yum Cha District', type: 'restaurant', image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=800&auto=format&fit=crop', rating: 4.7 }
    ];
    
    return storeTemplates.map((template) => {
        const distance = 0.3 + Math.random() * 9.7;
        const bearing = Math.random() * 360;
        
        const latOffset = (distance / 111) * Math.cos(bearing * Math.PI / 180);
        const lngOffset = (distance / (111 * Math.cos(userLat * Math.PI / 180))) * Math.sin(bearing * Math.PI / 180);
        
        return {
            name: template.name,
            type: template.type,
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
function displayGroceryDeals() {
    const groceryStores = allStores
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
function displayMysteryBoxDeals() {
    const container = document.getElementById('mysteryBoxDeals');
    if (!container) return;
    
    const mysteryStores = allStores
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
            <div class="food-deal-card">
                <img src="${store.image}" alt="${store.name}" class="card-image" loading="lazy">
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
                    <div class="card-title">${store.name}</div>
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
}

// Display Dish of the Day
function displayDishOfTheDay() {
    const container = document.getElementById('dishOfTheDay');
    if (!container) return;
    
    const dishStores = allStores
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
            <div class="food-deal-card">
                <img src="${store.image}" alt="${store.name}" class="card-image" loading="lazy">
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
                    <div class="card-title">${store.name}</div>
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
}

// Display all sections
function displayAllSections() {
    displayGroceryDeals();
    displayMysteryBoxDeals();
    displayDishOfTheDay();
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
}

// Initialize on page load
(async function() {
    await loadFavorites();
    getCurrentLocation();
    setupEventListeners();
})();
