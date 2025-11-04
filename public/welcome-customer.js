// Welcome page script for customers - shows store cards with favorites
let userLocation = null;
let userFavorites = [];
let currentRadius = 4.8; // Default radius in km (3 miles = ~4.8 km)
let mockStores = [];

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

// Get user's current location
function getCurrentLocation() {
    const locationMessage = document.getElementById('locationMessage');
    
    if (!navigator.geolocation) {
        locationMessage.textContent = 'Geolocation is not supported by your browser.';
        return;
    }
    
    locationMessage.textContent = 'Requesting location access...';
    
    navigator.geolocation.getCurrentPosition(
        function(position) {
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            locationMessage.style.display = 'none';
            initializeStores();
        },
        function(error) {
            let errorMsg = 'Unable to retrieve your location. ';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMsg += 'Please allow location access to see nearby stores.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMsg += 'Location information is unavailable.';
                    break;
                case error.TIMEOUT:
                    errorMsg += 'Location request timed out.';
                    break;
            }
            locationMessage.textContent = errorMsg;
            locationMessage.style.color = '#721c24';
            locationMessage.style.background = '#f8d7da';
            locationMessage.style.padding = '15px';
            locationMessage.style.borderRadius = '5px';
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
        { name: 'Fresh Market', type: 'grocery', image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=800&auto=format&fit=crop' },
        { name: 'Green Grocers', type: 'grocery', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800&auto=format&fit=crop' },
        { name: 'Bella Vista Restaurant', type: 'restaurant', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800&auto=format&fit=crop' },
        { name: 'The Gourmet Kitchen', type: 'restaurant', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=800&auto=format&fit=crop' },
        { name: 'City Market', type: 'grocery', image: 'https://images.unsplash.com/photo-1587132137056-bfbf0166836f?q=80&w=800&auto=format&fit=crop' },
        { name: 'Seaside Bistro', type: 'restaurant', image: 'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?q=80&w=800&auto=format&fit=crop' },
        { name: 'Mountain View Cafe', type: 'restaurant', image: 'https://images.unsplash.com/photo-1515669097368-22e68427d265?q=80&w=800&auto=format&fit=crop' },
        { name: 'Downtown Diner', type: 'restaurant', image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=800&auto=format&fit=crop' },
        { name: 'Organic Foods', type: 'grocery', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800&auto=format&fit=crop' },
        { name: 'The Rustic Table', type: 'restaurant', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop' },
        { name: 'Super Mart', type: 'grocery', image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=800&auto=format&fit=crop' },
        { name: 'Food Express', type: 'grocery', image: 'https://images.unsplash.com/photo-1587132137056-bfbf0166836f?q=80&w=800&auto=format&fit=crop' },
        { name: 'Corner Store', type: 'grocery', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800&auto=format&fit=crop' },
        { name: 'Pizza Palace', type: 'restaurant', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800&auto=format&fit=crop' },
        { name: 'Quick Bite', type: 'restaurant', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=800&auto=format&fit=crop' },
        { name: 'Local Market', type: 'grocery', image: 'https://images.unsplash.com/photo-1587132137056-bfbf0166836f?q=80&w=800&auto=format&fit=crop' }
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
            lat: userLat + latOffset,
            lng: userLng + lngOffset
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
            displayStores();
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
    }
}

// Display stores within radius
function displayStores() {
    if (!userLocation || mockStores.length === 0) return;
    
    const storesGrid = document.getElementById('storesGrid');
    
    // Calculate distances and filter stores
    const storesWithDistance = mockStores.map(store => ({
        ...store,
        distance: calculateDistance(userLocation.lat, userLocation.lng, store.lat, store.lng)
    }));
    
    const nearbyStores = storesWithDistance
        .filter(store => store.distance <= currentRadius)
        .sort((a, b) => a.distance - b.distance);
    
    if (nearbyStores.length === 0) {
        storesGrid.innerHTML = '<p style="text-align: center; color: #666; grid-column: 1 / -1;">No stores found within this radius. Try increasing the radius.</p>';
        return;
    }
    
    storesGrid.innerHTML = nearbyStores.map((store, index) => {
        const favorited = isFavorited(store.name);
        const heartClass = favorited ? 'heart-icon filled' : 'heart-icon unfilled';
        return `
            <div class="store-card">
                <span class="${heartClass}" 
                      data-store-name="${store.name.replace(/"/g, '&quot;')}"
                      data-store-type="${store.type}"
                      data-store-lat="${store.lat}"
                      data-store-lng="${store.lng}">
                    ${favorited ? '❤️' : '🤍'}
                </span>
                <img src="${store.image}" alt="${store.name}" class="store-image" loading="lazy">
                <div class="store-content">
                    <span class="store-type ${store.type}">
                        ${store.type === 'restaurant' ? '🍽️ Restaurant' : '🛒 Grocery'}
                    </span>
                    <h4>${store.name}</h4>
                    <div class="store-distance">📍 ${store.distance.toFixed(1)} km away</div>
                </div>
            </div>
        `;
    }).join('');
    
    // Add event listeners to heart icons
    document.querySelectorAll('.heart-icon').forEach(heart => {
        heart.addEventListener('click', function() {
            const storeName = this.getAttribute('data-store-name');
            const storeType = this.getAttribute('data-store-type');
            const lat = parseFloat(this.getAttribute('data-store-lat'));
            const lng = parseFloat(this.getAttribute('data-store-lng'));
            toggleFavorite(storeName, storeType, lat, lng);
        });
    });
}

// Initialize stores
function initializeStores() {
    if (userLocation) {
        mockStores = generateStoresAroundLocation(userLocation.lat, userLocation.lng);
        displayStores();
    }
}

// Initialize on page load
(async function() {
    await loadFavorites();
    getCurrentLocation();
})();

