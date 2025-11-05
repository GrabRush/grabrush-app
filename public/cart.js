// Cart page JavaScript
let cartItems = [];
let orderId = Math.floor(1000 + Math.random() * 9000); // Generate random order ID

// Update order ID display
function updateOrderId() {
    const orderIdElement = document.getElementById('orderId');
    if (orderIdElement) {
        orderIdElement.textContent = `Order ID #${orderId}`;
    }
}

// Load cart from API
async function loadCart() {
    try {
        const response = await fetch('/api/cart');
        const data = await response.json();
        if (data.success) {
            cartItems = data.cart || [];
            displayCart();
        }
    } catch (error) {
        console.error('Error loading cart:', error);
        document.getElementById('cartContent').innerHTML = '<div class="empty-cart"><h2>Error loading cart</h2></div>';
    }
}

// Display cart
function displayCart() {
    const cartContent = document.getElementById('cartContent');
    const restaurantNameHeader = document.getElementById('restaurantNameHeader');
    
    if (cartItems.length === 0) {
        cartContent.innerHTML = `
            <div class="empty-cart">
                <h2>Your cart is empty</h2>
                <p>Start adding items to your cart!</p>
            </div>
        `;
        restaurantNameHeader.textContent = '';
        return;
    }
    
    // Get restaurant name from first item
    const restaurantName = cartItems[0].restaurantName;
    restaurantNameHeader.textContent = restaurantName;
    
    // Calculate totals
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = 2.00;
    const platformFee = 1.00;
    const total = subtotal + deliveryFee + platformFee;
    
    // Group items for display
    const itemSummary = cartItems.map(item => {
        return `${item.quantity}x ${item.itemName} (Mystery Box)`;
    }).join(', ');
    
    let pickupTime = cartItems[0].pickupTime || '8:30 - 9:30';
    // Format pickup time (add PM if not present)
    if (!pickupTime.includes('PM') && !pickupTime.includes('AM')) {
        pickupTime = pickupTime.replace('8:30 - 9:30', '8:30 PM - 9:30 PM');
    }
    
    cartContent.innerHTML = `
        <!-- Pickup Section -->
        <div class="pickup-card">
            <div class="pickup-title">Pickup</div>
            
            <div class="location-section">
                <div class="location-info">
                    <svg class="location-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                    </svg>
                    <div class="location-details">
                        <div class="location-address">House 17, Block A, Road 16, Banani</div>
                        <div class="location-city">Dhaka</div>
                    </div>
                </div>
                <button class="change-location-btn">Change Location</button>
            </div>
            
            <div class="pickup-time-section">
                <div class="pickup-time-row">
                    <div class="pickup-time-label">Pickup Time</div>
                    <div class="time-slot selected">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <span>${pickupTime}</span>
                    </div>
                </div>
                <div class="pickup-time-row">
                    <div class="pickup-time-label"></div>
                    <div class="shop-closes">
                        <div class="shop-closes-label">Shop Closes</div>
                        <div class="time-slot">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="15" y1="9" x2="9" y2="15"/>
                                <line x1="9" y1="9" x2="15" y2="15"/>
                            </svg>
                            <span>10 PM</span>
                        </div>
                    </div>
                </div>
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
        
        <!-- Order Summary -->
        <div class="order-summary">
            <div class="order-summary-title">Order Summary</div>
            
            <div class="order-item">
                <div class="order-item-name">${itemSummary}</div>
                <div class="order-item-price">$${subtotal.toFixed(2)}</div>
            </div>
            
            <div class="cost-breakdown">
                <div class="cost-row">
                    <span class="cost-label">Subtotal</span>
                    <span class="cost-value">$${subtotal.toFixed(2)}</span>
                </div>
                <div class="cost-row">
                    <span class="cost-label">Delivery Fee</span>
                    <span class="cost-value">$${deliveryFee.toFixed(2)}</span>
                </div>
                <div class="cost-row">
                    <span class="cost-label">Platform Fee</span>
                    <span class="cost-value">$${platformFee.toFixed(2)}</span>
                </div>
            </div>
            
            <div class="disclaimer">
                <div class="disclaimer-title">Disclaimer</div>
                <div class="disclaimer-text">GrabRush is not responsible for allergy-related issues. Please contact the restaurant directly if you have any food allergies.</div>
            </div>
        </div>
        
        <!-- Total Section -->
        <div class="total-section">
            <div class="total-row">
                <span class="total-label">Total (Charges included)</span>
                <span class="total-amount">$${total.toFixed(2)}</span>
            </div>
            <a href="#" class="see-breakdown" onclick="toggleBreakdown(); return false;">See Breakdown</a>
            
            <button class="confirm-button" onclick="confirmOrder()">Confirm</button>
        </div>
    `;
}

function toggleBreakdown() {
    // TODO: Implement breakdown toggle
    alert('Breakdown feature coming soon!');
}

async function confirmOrder() {
    if (cartItems.length === 0) {
        alert('Your cart is empty!');
        return;
    }
    
    if (confirm('Confirm your order?')) {
        try {
            const response = await fetch('/api/order/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const data = await response.json();
            if (data.success) {
                // Redirect to order confirmation page
                window.location.href = '/order-confirmation';
            } else {
                alert('Error confirming order. Please try again.');
            }
        } catch (error) {
            console.error('Error confirming order:', error);
            alert('Error confirming order. Please try again.');
        }
    }
}

// Load cart on page load
loadCart();
updateOrderId();

