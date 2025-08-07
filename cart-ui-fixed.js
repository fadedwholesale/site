// Fixed Cart UI - Completely rewritten to avoid syntax errors

function createCartUI() {
    console.log('🎨 Creating fixed cart UI...');
    
    // Remove any existing cart
    const existing = document.getElementById('fixedCart');
    if (existing) {
        existing.remove();
    }
    
    // Create cart HTML
    const cartHTML = `
        <div id="fixedCart" class="fixed-cart-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000;">
            <div class="fixed-cart-panel" style="position: fixed; top: 0; right: 0; width: 400px; height: 100%; background: white; box-shadow: -2px 0 10px rgba(0,0,0,0.3); overflow-y: auto;">
                <div class="fixed-cart-header" style="padding: 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                        🛒 Cart 
                        <span id="fixedCartBadge" style="background: #00C851; color: white; border-radius: 12px; padding: 4px 8px; font-size: 12px;">0</span>
                    </h2>
                    <button id="closeFixedCart" style="background: none; border: none; font-size: 24px; cursor: pointer; padding: 5px;">×</button>
                </div>
                
                <div class="fixed-cart-body" style="padding: 20px;">
                    <div id="fixedCartItems">
                        <div style="text-align: center; color: #666; padding: 40px 20px;">
                            <div style="font-size: 48px; margin-bottom: 16px;">🛒</div>
                            <p>Your cart is empty</p>
                        </div>
                    </div>
                    
                    <div id="fixedCartSummary" style="display: none; border-top: 1px solid #eee; margin-top: 20px; padding-top: 20px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span>Subtotal:</span>
                            <span id="fixedCartSubtotal">$0.00</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span>Shipping:</span>
                            <span id="fixedCartShipping">$0.00</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; border-top: 1px solid #eee; padding-top: 10px;">
                            <span>Total:</span>
                            <span id="fixedCartTotal">$0.00</span>
                        </div>
                    </div>
                </div>
                
                <div class="fixed-cart-footer" style="padding: 20px; border-top: 1px solid #eee;">
                    <button id="fixedCartCheckout" style="width: 100%; padding: 12px; background: #00C851; color: white; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; margin-bottom: 10px;">
                        Checkout
                    </button>
                    <button id="fixedCartClear" style="width: 100%; padding: 8px; background: #f5f5f5; color: #666; border: none; border-radius: 5px; cursor: pointer;">
                        Clear Cart
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add to page
    document.body.insertAdjacentHTML('beforeend', cartHTML);
    
    console.log('✅ Fixed cart UI created');
}

function setupCartEvents() {
    console.log('🔗 Setting up cart events...');
    
    // Close cart
    const closeBtn = document.getElementById('closeFixedCart');
    if (closeBtn) {
        closeBtn.onclick = function() {
            hideFixedCart();
        };
    }
    
    // Close on overlay click
    const overlay = document.getElementById('fixedCart');
    if (overlay) {
        overlay.onclick = function(e) {
            if (e.target === overlay) {
                hideFixedCart();
            }
        };
    }
    
    // Checkout button
    const checkoutBtn = document.getElementById('fixedCartCheckout');
    if (checkoutBtn) {
        checkoutBtn.onclick = function() {
            handleFixedCartCheckout();
        };
    }
    
    // Clear cart button
    const clearBtn = document.getElementById('fixedCartClear');
    if (clearBtn) {
        clearBtn.onclick = function() {
            handleFixedCartClear();
        };
    }
    
    console.log('✅ Cart events set up');
}

function showFixedCart() {
    const cart = document.getElementById('fixedCart');
    if (cart) {
        cart.style.display = 'block';
        updateFixedCartDisplay();
    }
}

function hideFixedCart() {
    const cart = document.getElementById('fixedCart');
    if (cart) {
        cart.style.display = 'none';
    }
}

function updateFixedCartDisplay() {
    console.log('🔄 Updating fixed cart display...');
    
    try {
        let items = [];
        let totals = { subtotal: 0, shipping: 0, total: 0, itemCount: 0 };
        
        // Get data from modern cart if available
        if (window.modernCart && typeof window.modernCart.getState === 'function') {
            const state = window.modernCart.getState();
            items = state.items || [];
            totals = state.totals || totals;
        }
        
        // Update badge
        const badge = document.getElementById('fixedCartBadge');
        if (badge) {
            badge.textContent = totals.itemCount;
        }
        
        // Update header cart count
        const headerCount = document.getElementById('cartCount');
        if (headerCount) {
            headerCount.textContent = totals.itemCount;
        }
        
        const headerCount2 = document.getElementById('cartCount2');
        if (headerCount2) {
            headerCount2.textContent = totals.itemCount;
        }
        
        // Update items display
        const itemsContainer = document.getElementById('fixedCartItems');
        if (itemsContainer) {
            if (items.length === 0) {
                itemsContainer.innerHTML = `
                    <div style="text-align: center; color: #666; padding: 40px 20px;">
                        <div style="font-size: 48px; margin-bottom: 16px;">🛒</div>
                        <p>Your cart is empty</p>
                    </div>
                `;
            } else {
                itemsContainer.innerHTML = items.map(function(item) {
                    return renderFixedCartItem(item);
                }).join('');
            }
        }
        
        // Update summary
        const summary = document.getElementById('fixedCartSummary');
        if (summary) {
            if (items.length > 0) {
                summary.style.display = 'block';
                
                const subtotalEl = document.getElementById('fixedCartSubtotal');
                if (subtotalEl) subtotalEl.textContent = '$' + totals.subtotal.toFixed(2);
                
                const shippingEl = document.getElementById('fixedCartShipping');
                if (shippingEl) {
                    shippingEl.textContent = totals.shipping === 0 ? 'FREE' : '$' + totals.shipping.toFixed(2);
                }
                
                const totalEl = document.getElementById('fixedCartTotal');
                if (totalEl) totalEl.textContent = '$' + totals.total.toFixed(2);
            } else {
                summary.style.display = 'none';
            }
        }
        
    } catch (error) {
        console.error('Error updating cart display:', error);
    }
}

function renderFixedCartItem(item) {
    const subtotal = (item.price * item.quantity).toFixed(2);
    
    return `
        <div class="fixed-cart-item" style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #f0f0f0;">
            <div style="flex: 1;">
                <div style="font-weight: bold; margin-bottom: 5px;">${escapeHtml(item.name)}</div>
                <div style="color: #666; font-size: 14px;">${escapeHtml(item.grade)}</div>
                <div style="color: #00C851; font-weight: bold;">$${item.price} × ${item.quantity}</div>
            </div>
            <div style="text-align: right;">
                <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">$${subtotal}</div>
                <div style="display: flex; gap: 5px;">
                    <button onclick="changeFixedCartQuantity('${item.id}', -1)" style="background: #ff4444; color: white; border: none; border-radius: 3px; width: 25px; height: 25px; cursor: pointer; font-size: 14px;">-</button>
                    <span style="display: inline-block; width: 30px; text-align: center; line-height: 25px;">${item.quantity}</span>
                    <button onclick="changeFixedCartQuantity('${item.id}', 1)" style="background: #00C851; color: white; border: none; border-radius: 3px; width: 25px; height: 25px; cursor: pointer; font-size: 14px;">+</button>
                    <button onclick="removeFixedCartItem('${item.id}')" style="background: #666; color: white; border: none; border-radius: 3px; padding: 4px 8px; cursor: pointer; font-size: 12px; margin-left: 5px;">Remove</button>
                </div>
            </div>
        </div>
    `;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function changeFixedCartQuantity(itemId, delta) {
    if (window.modernCart && typeof window.modernCart.updateItemQuantity === 'function') {
        const items = window.modernCart.getItems();
        const item = items.find(function(i) { return i.id === itemId; });
        if (item) {
            const newQuantity = Math.max(1, item.quantity + delta);
            window.modernCart.updateItemQuantity(itemId, newQuantity);
            updateFixedCartDisplay();
        }
    }
}

function removeFixedCartItem(itemId) {
    if (window.modernCart && typeof window.modernCart.removeItem === 'function') {
        window.modernCart.removeItem(itemId);
        updateFixedCartDisplay();
    }
}

function handleFixedCartCheckout() {
    if (window.modernCart && typeof window.modernCart.checkout === 'function') {
        window.modernCart.checkout();
        hideFixedCart();
    } else {
        alert('Checkout functionality coming soon!');
    }
}

function handleFixedCartClear() {
    if (confirm('Are you sure you want to clear your cart?')) {
        if (window.modernCart && typeof window.modernCart.clearCart === 'function') {
            window.modernCart.clearCart();
            updateFixedCartDisplay();
        }
    }
}

// Global functions
window.showFixedCart = showFixedCart;
window.hideFixedCart = hideFixedCart;
window.updateFixedCartDisplay = updateFixedCartDisplay;
window.changeFixedCartQuantity = changeFixedCartQuantity;
window.removeFixedCartItem = removeFixedCartItem;

// Toggle function
window.toggleFixedCart = function() {
    const cart = document.getElementById('fixedCart');
    if (cart && cart.style.display === 'block') {
        hideFixedCart();
    } else {
        showFixedCart();
    }
};

// Initialize when DOM is ready
function initializeFixedCart() {
    try {
        createCartUI();
        setupCartEvents();
        
        // Connect to modern cart if available
        const connectToModernCart = function() {
            if (window.modernCart) {
                console.log('🔗 Connecting to modern cart system...');
                if (typeof window.modernCart.on === 'function') {
                    window.modernCart.on('*', function() {
                        updateFixedCartDisplay();
                    });
                }
                updateFixedCartDisplay();
            } else {
                setTimeout(connectToModernCart, 500);
            }
        };
        connectToModernCart();
        
        console.log('✅ Fixed cart UI initialized successfully');
    } catch (error) {
        console.error('❌ Fixed cart UI initialization failed:', error);
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFixedCart);
} else {
    initializeFixedCart();
}

console.log('🛒 Fixed Cart UI script loaded');
