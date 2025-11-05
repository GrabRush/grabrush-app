// Mystery Box page JavaScript
const mysteryBoxItems = [
    {
        restaurantName: 'Ruen Busaba',
        itemName: 'Surprise Bento Box',
        description: 'A mystery selection of our best-selling Asian dishes, perfect for 2 people',
        pickupTime: '8:30 PM - 9:30 PM',
        priceOld: 45.99,
        priceNew: 20.19,
        savePercent: 55,
        logo: 'https://logos-world.net/wp-content/uploads/2021/03/Chipotle-Logo.png',
        image: 'https://images.unsplash.com/photo-1551782450-17144efb9c50?q=80&w=800&auto=format&fit=crop'
    },
    {
        restaurantName: 'Charlie 14',
        itemName: 'Surprise Bento Box',
        description: 'A mystery selection of our best-selling Asian dishes, perfect for 2 people',
        pickupTime: '8:30 PM - 9:30 PM',
        priceOld: 45.99,
        priceNew: 20.19,
        savePercent: 55,
        logo: 'https://logos-world.net/wp-content/uploads/2021/08/Sawasdee-Logo.png',
        image: 'https://images.unsplash.com/photo-1551782450-17144efb9c50?q=80&w=800&auto=format&fit=crop'
    },
    {
        restaurantName: 'La Mirchi',
        itemName: 'Surprise Bento Box',
        description: 'A mystery selection of our best-selling Asian dishes, perfect for 2 people',
        pickupTime: '8:30 PM - 9:30 PM',
        priceOld: 45.99,
        priceNew: 20.19,
        savePercent: 55,
        logo: 'https://logos-world.net/wp-content/uploads/2021/02/Arby-s-Logo.png',
        image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800&auto=format&fit=crop'
    },
    {
        restaurantName: 'Ruen Busaba',
        itemName: 'Surprise Bento Box',
        description: 'A mystery selection of our best-selling Asian dishes, perfect for 2 people',
        pickupTime: '8:30 PM - 9:30 PM',
        priceOld: 45.99,
        priceNew: 20.19,
        savePercent: 55,
        logo: 'https://logos-world.net/wp-content/uploads/2021/03/Chipotle-Logo.png',
        image: 'https://images.unsplash.com/photo-1551782450-17144efb9c50?q=80&w=800&auto=format&fit=crop'
    },
    {
        restaurantName: 'Bella Vista Restaurant',
        itemName: 'Surprise Bento Box',
        description: 'A mystery selection of our best-selling Asian dishes, perfect for 2 people',
        pickupTime: '8:30 PM - 9:30 PM',
        priceOld: 45.99,
        priceNew: 20.19,
        savePercent: 55,
        logo: 'https://logos-world.net/wp-content/uploads/2021/03/Burger-King-Logo.png',
        image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=800&auto=format&fit=crop'
    },
    {
        restaurantName: 'The Gourmet Kitchen',
        itemName: 'Surprise Bento Box',
        description: 'A mystery selection of our best-selling Asian dishes, perfect for 2 people',
        pickupTime: '8:30 PM - 9:30 PM',
        priceOld: 45.99,
        priceNew: 20.19,
        savePercent: 55,
        logo: 'https://logos-world.net/wp-content/uploads/2021/08/Five-Guys-Logo.png',
        image: 'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?q=80&w=800&auto=format&fit=crop'
    }
];

let filteredItems = [...mysteryBoxItems];

// Display mystery box items
function displayMysteryBoxItems(items = filteredItems) {
    const container = document.getElementById('mysteryBoxList');
    if (!container) return;
    
    if (items.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">No mystery box items available</p>';
        return;
    }
    
    container.innerHTML = items.map(item => `
        <div class="mystery-box-card">
            <img src="${item.image}" alt="${item.restaurantName}" class="restaurant-image" loading="lazy">
            <div class="restaurant-name-below-image">${item.restaurantName}</div>
            <div class="mystery-box-card-content">
                <div class="item-name">${item.itemName}</div>
                <div class="item-description">${item.description}</div>
                <div class="pickup-info">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span>Pickup: ${item.pickupTime}</span>
                </div>
                <div class="price-section">
                    <span class="price-old">$${item.priceOld.toFixed(2)}</span>
                    <span class="price-new">$${item.priceNew.toFixed(2)}</span>
                    <span class="save-tag">Save ${item.savePercent}%</span>
                </div>
                <div class="button-container">
                    <button class="add-button" onclick="handleAddToCart(event, '${item.restaurantName}', '${item.itemName}', ${item.priceNew}, '${item.image.replace(/'/g, "\\'")}', '${item.pickupTime}')">Add +</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Handle add to cart with event
function handleAddToCart(event, restaurantName, itemName, price, image, pickupTime) {
    addToCart(event, restaurantName, itemName, price, image, pickupTime);
}

// Add to cart
async function addToCart(event, restaurantName, itemName, price, image, pickupTime) {
    try {
        const response = await fetch('/api/cart/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                restaurantName,
                itemName,
                price,
                quantity: 1,
                image,
                pickupTime
            })
        });
        
        const data = await response.json();
        if (data.success) {
            // Show success feedback
            const button = event.target;
            if (button && button.classList.contains('add-button')) {
                const originalText = button.textContent;
                button.textContent = 'Added!';
                button.style.background = '#4CAF50';
                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.background = '#FFC107';
                }, 1500);
            }
        } else {
            alert('Error adding to cart. Please try again.');
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        alert('Error adding to cart. Please try again.');
    }
}

// Filter functionality
function setupFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const filterType = this.getAttribute('data-filter');
            // TODO: Implement filter dropdowns
            console.log(`Filter by ${filterType}`);
            // For now, just show an alert
            alert(`Filtering by ${filterType} - Feature coming soon!`);
        });
    });
}

// Location selector functionality
function setupLocationSelector() {
    const locationSelector = document.querySelector('.location-selector');
    if (locationSelector) {
        locationSelector.addEventListener('click', function() {
            window.location.href = '/location';
        });
    }
}

// Update location text dynamically
async function updateLocationText() {
    try {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async function(position) {
                    try {
                        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&zoom=18&addressdetails=1`);
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
                    }
                },
                function(error) {
                    console.error('Location error:', error);
                }
            );
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Initialize on page load
(function() {
    displayMysteryBoxItems();
    setupFilters();
    setupLocationSelector();
    updateLocationText();
})();

