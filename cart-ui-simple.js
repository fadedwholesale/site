// Simple Cart UI - Minimal Implementation
// This is a fallback implementation that avoids complex template issues

class SimpleCartUI {
    constructor() {
        this.init();
    }

    init() {
        console.log('🎨 Initializing Simple Cart UI...');
        
        // Only proceed if DOM is ready
        if (document.readyState !== 'loading') {
            this.setup();
        } else {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        }
    }

    setup() {
        try {
            this.createSimpleCart();
            this.setupEventListeners();
            this.integrateWithModernCart();
            console.log('✅ Simple Cart UI initialized');
        } catch (error) {
            console.error('❌ Simple Cart UI failed to initialize:', error);
        }
    }

    createSimpleCart() {
        // Remove existing cart
        const existing = document.getElementById('simpleCart');
        if (existing) existing.remove();

        // Create simple cart overlay
        const cartHTML = `
            <div id="simpleCart" class="simple-cart" style="display: none;">
                <div class="cart-overlay" style="
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                    background: rgba(0,0,0,0.5); z-index: 9999;
                "></div>
                <div class="cart-panel" style="
                    position: fixed; top: 0; right: 0; width: 400px; height: 100%;
                    background: white; box-shadow: -2px 0 10px rgba(0,0,0,0.3);
                    padding: 20px; overflow-y: auto; z-index: 10000;
                ">
                    <div class="cart-header" style="
                        display: flex; justify-content: space-between; align-items: center;
                        border-bottom: 1px solid #eee; padding-bottom: 15px; margin-bottom: 20px;
                    ">
                        <h2>🛒 Cart (<span id="simpleCartCount">0</span>)</h2>
                        <button id="closeSimpleCart" style="
                            background: none; border: none; font-size: 24px; cursor: pointer;
                        ">×</button>
                    </div>
                    <div id="simpleCartItems"></div>
                    <div id="simpleCartTotal" style="
                        border-top: 1px solid #eee; padding-top: 15px; margin-top: 20px;
                        font-weight: bold; font-size: 18px;
                    ">Total: $0.00</div>
                    <button id="simpleCheckout" style="
                        width: 100%; padding: 12px; background: #00C851; color: white;
                        border: none; border-radius: 5px; font-size: 16px; margin-top: 15px;
                        cursor: pointer;
                    ">Checkout</button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', cartHTML);
    }

    setupEventListeners() {
        // Close cart
        const closeBtn = document.getElementById('closeSimpleCart');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideCart());
        }

        const overlay = document.querySelector('#simpleCart .cart-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => this.hideCart());
        }

        // Checkout
        const checkoutBtn = document.getElementById('simpleCheckout');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => this.checkout());
        }
    }

    integrateWithModernCart() {
        // Wait for modern cart to be available
        const checkForModernCart = () => {
            if (window.modernCart) {
                this.modernCart = window.modernCart;
                this.modernCart.on('*', () => this.refresh());
                this.refresh();
                console.log('✅ Connected to modern cart system');
            } else {
                setTimeout(checkForModernCart, 500);
            }
        };
        checkForModernCart();
    }

    showCart() {
        const cart = document.getElementById('simpleCart');
        if (cart) {
            cart.style.display = 'block';
            this.refresh();
        }
    }

    hideCart() {
        const cart = document.getElementById('simpleCart');
        if (cart) {
            cart.style.display = 'none';
        }
    }

    refresh() {
        if (!this.modernCart) return;

        try {
            const state = this.modernCart.getState();
            const items = state.items || [];
            const totals = state.totals || { total: 0, itemCount: 0 };

            // Update count
            const countEl = document.getElementById('simpleCartCount');
            if (countEl) countEl.textContent = totals.itemCount;

            // Update cart count in header
            const headerCount = document.getElementById('cartCount');
            if (headerCount) headerCount.textContent = totals.itemCount;

            // Update items
            const itemsEl = document.getElementById('simpleCartItems');
            if (itemsEl) {
                if (items.length === 0) {
                    itemsEl.innerHTML = '<p style="text-align: center; color: #666;">Your cart is empty</p>';
                } else {
                    itemsEl.innerHTML = items.map(item => this.renderItem(item)).join('');
                }
            }

            // Update total
            const totalEl = document.getElementById('simpleCartTotal');
            if (totalEl) totalEl.textContent = `Total: $${totals.total.toFixed(2)}`;

        } catch (error) {
            console.error('Error refreshing cart:', error);
        }
    }

    renderItem(item) {
        return `
            <div class="cart-item" style="
                display: flex; justify-content: space-between; align-items: center;
                padding: 10px 0; border-bottom: 1px solid #f0f0f0;
            ">
                <div>
                    <div style="font-weight: bold;">${item.name}</div>
                    <div style="color: #666; font-size: 14px;">
                        $${item.price} × ${item.quantity}
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: bold;">$${(item.price * item.quantity).toFixed(2)}</div>
                    <button onclick="window.simpleCartUI.removeItem('${item.id}')" style="
                        background: #ff4444; color: white; border: none; 
                        border-radius: 3px; padding: 2px 6px; font-size: 12px;
                        cursor: pointer; margin-top: 5px;
                    ">Remove</button>
                </div>
            </div>
        `;
    }

    removeItem(itemId) {
        if (this.modernCart) {
            this.modernCart.removeItem(itemId);
        }
    }

    checkout() {
        if (this.modernCart) {
            this.modernCart.checkout();
            this.hideCart();
        }
    }
}

// Create fallback toggle function
window.toggleSimpleCart = function() {
    if (window.simpleCartUI) {
        const cart = document.getElementById('simpleCart');
        if (cart && cart.style.display === 'block') {
            window.simpleCartUI.hideCart();
        } else {
            window.simpleCartUI.showCart();
        }
    }
};

// Initialize simple cart UI
try {
    window.simpleCartUI = new SimpleCartUI();
    console.log('✅ Simple Cart UI loaded as fallback');
} catch (error) {
    console.error('❌ Simple Cart UI failed to load:', error);
}
