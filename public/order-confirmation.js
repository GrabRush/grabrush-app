// Order confirmation page JavaScript
let orderData = null;

// Load order data from session
async function loadOrderData() {
    try {
        // Get order data from session (stored after confirmation)
        const response = await fetch('/api/order/data');
        const data = await response.json();
        if (data.success) {
            orderData = data.order;
            displayOrder();
        } else {
            // If no order data, redirect to cart
            window.location.href = '/cart';
        }
    } catch (error) {
        console.error('Error loading order data:', error);
        window.location.href = '/cart';
    }
}

// Display order confirmation
function displayOrder() {
    if (!orderData) return;
    
    const restaurantNameHeader = document.getElementById('restaurantNameHeader');
    const orderIdDisplay = document.getElementById('orderIdDisplay');
    const orderContent = document.getElementById('orderContent');
    
    restaurantNameHeader.textContent = orderData.restaurantName;
    orderIdDisplay.textContent = `Order ID #${orderData.orderId}`;
    
    const restaurantLogos = {
        'Ruen Busaba': 'https://logos-world.net/wp-content/uploads/2021/03/Chipotle-Logo.png',
        'Charlie 14': 'https://logos-world.net/wp-content/uploads/2021/08/Sawasdee-Logo.png',
        'La Mirchi': 'https://logos-world.net/wp-content/uploads/2021/02/Arby-s-Logo.png',
        'Bella Vista Restaurant': 'https://logos-world.net/wp-content/uploads/2021/03/Burger-King-Logo.png',
        'The Gourmet Kitchen': 'https://logos-world.net/wp-content/uploads/2021/08/Five-Guys-Logo.png'
    };
    
    const logo = restaurantLogos[orderData.restaurantName] || 'https://logos-world.net/wp-content/uploads/2021/03/Chipotle-Logo.png';
    const itemCount = orderData.cart.reduce((sum, item) => sum + item.quantity, 0);
    
    orderContent.innerHTML = `
        <!-- Order Status Section -->
        <div class="order-status-section">
            <div class="order-status-card">
                <div class="order-status-left">
                    <div class="order-status-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                    </div>
                    <div class="order-status-text">Order Placed</div>
                </div>
                <img src="${logo}" alt="${orderData.restaurantName}" class="restaurant-logo-small" onerror="this.style.display='none'">
            </div>
            
            <div style="margin-bottom: 8px;">
                <div style="font-size: 14px; color: #666; margin-bottom: 4px;">Pickup</div>
                <div class="pickup-time-large">${orderData.pickupTime}</div>
            </div>
            
            <div class="shop-closes-row">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="6" x2="12" y2="12"/>
                    <line x1="16" y1="10" x2="12" y2="12"/>
                </svg>
                <span>Shop Closes</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <span style="font-weight: 600;">10 PM</span>
            </div>
            
            <div class="pickup-instructions">
                <div class="pickup-instructions-title">Pickup your order from the shop</div>
                <div class="pickup-instructions-text">Your order is waiting for you at the restaurant. Please show your order ID at the counter to pickup your box.</div>
            </div>
            
            <div class="warning-message">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <span>Late pickup will result in no food or refund.</span>
            </div>
        </div>
        
        <!-- Order Details Section -->
        <div class="order-details-section">
            <div class="order-details-title">Order Details</div>
            
            <div class="detail-row">
                <span class="detail-label">Order from</span>
                <span class="detail-value">${orderData.restaurantName}</span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Pickup Location</span>
                <span class="detail-value">House 17, Block A, Road 16, Banani</span>
            </div>
            
            <div class="detail-row">
                <span class="detail-label">Total (Charges Included)</span>
                <span class="detail-value">$${orderData.total.toFixed(2)}</span>
            </div>
            
            <div class="view-details-toggle" onclick="toggleOrderItems()">
                <span class="view-details-text">View Details (${itemCount} Items)</span>
                <svg id="chevronIcon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 6l4 4 4-4"/>
                </svg>
            </div>
            
            <div id="orderItemsList" style="display: none; margin-top: 12px; padding-top: 12px; border-top: 1px solid #e0e0e0;">
                ${orderData.cart.map(item => `
                    <div class="detail-row">
                        <span class="detail-label">${item.quantity}x ${item.itemName}</span>
                        <span class="detail-value">$${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <!-- Disclaimer Section -->
        <div class="disclaimer-section">
            <div class="disclaimer-title">Disclaimer</div>
            <div class="disclaimer-text">GrabRush is not responsible for allergy-related issues. Please contact the restaurant directly if you have any food allergies.</div>
        </div>
    `;
}

function toggleOrderItems() {
    const itemsList = document.getElementById('orderItemsList');
    const chevronIcon = document.getElementById('chevronIcon');
    
    if (itemsList.style.display === 'none') {
        itemsList.style.display = 'block';
        chevronIcon.style.transform = 'rotate(180deg)';
    } else {
        itemsList.style.display = 'none';
        chevronIcon.style.transform = 'rotate(0deg)';
    }
}

// Load order data on page load
loadOrderData();

