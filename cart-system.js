// Faded Skies Cart and Checkout System
// Complete rewrite for proper functionality

class CartManager {
    constructor() {
        this.cart = [];
        this.isOpen = false;
        this.listeners = [];
        this.addToCartLock = false;
        
        // Initialize cart system
        this.initialize();
    }

    initialize() {
        console.log('🛒 Initializing cart manager...');
        
        // Set up event listeners
        window.addEventListener('cartUpdate', () => this.updateDisplay());
        window.addEventListener('userAuthenticated', () => this.handleUserAuthentication());
        
        // Load existing cart if user is authenticated
        this.loadCartFromStorage();
        this.updateDisplay();
        
        console.log('✅ Cart manager initialized');
    }

    // Handle user authentication events
    handleUserAuthentication() {
        console.log('🔐 User authentication event received');
        this.loadCartFromStorage();
        this.updateDisplay();
    }

    // Get current authenticated user
    getCurrentUser() {
        // Check multiple sources for user data
        if (window.currentUser) {
            return window.currentUser;
        }
        
        // Try to get from localStorage as fallback
        try {
            const savedUser = localStorage.getItem('currentUser');
            if (savedUser) {
                const user = JSON.parse(savedUser);
                window.currentUser = user; // Set it for future use
                return user;
            }
        } catch (error) {
            console.error('Error loading user from localStorage:', error);
        }
        
        return null;
    }

    // Load cart from storage
    loadCartFromStorage() {
        const user = this.getCurrentUser();
        if (!user || !user.email) {
            console.log('🛒 No authenticated user, clearing cart');
            this.cart = [];
            return;
        }

        try {
            const cartKey = `cart_${user.email}`;
            const savedCart = localStorage.getItem(cartKey);
            if (savedCart) {
                this.cart = JSON.parse(savedCart);
                console.log(`🛒 Loaded cart for ${user.email}:`, this.cart.length, 'items');
            } else {
                this.cart = [];
                console.log(`🛒 No saved cart found for ${user.email}`);
            }
        } catch (error) {
            console.error('Error loading cart from storage:', error);
            this.cart = [];
        }
    }

    // Save cart to storage
    saveCartToStorage() {
        const user = this.getCurrentUser();
        if (!user || !user.email) return;

        try {
            const cartKey = `cart_${user.email}`;
            localStorage.setItem(cartKey, JSON.stringify(this.cart));
            console.log(`💾 Cart saved for ${user.email}:`, this.cart.length, 'items');
        } catch (error) {
            console.error('Error saving cart to storage:', error);
        }
    }

    // Add product to cart
    addProduct(productId, quantity = 1) {
        if (this.addToCartLock) return false;
        this.addToCartLock = true;
        setTimeout(() => { this.addToCartLock = false; }, 300);

        // Check authentication
        const user = this.getCurrentUser();
        if (!user || !user.email) {
            this.showNotification('🔒 Please log in to add items to cart', 'error');
            console.log('❌ Cart: No authenticated user found');
            return false;
        }

        console.log(`🛒 Adding product ${productId} (qty: ${quantity}) to cart for ${user.email}`);

        try {
            // Get products from shared data manager or window.products
            const products = this.getProducts();
            const product = products.find(p => p.id == productId);
            
            if (!product) {
                this.showNotification('❌ Product not found', 'error');
                console.error('Product not found:', productId);
                return false;
            }

            if (product.status !== 'AVAILABLE' || product.stock <= 0) {
                this.showNotification(`❌ ${product.strain} is not available`, 'error');
                return false;
            }

            // Check if item already exists in cart
            const existingItemIndex = this.cart.findIndex(item => item.id == productId);
            
            if (existingItemIndex !== -1) {
                // Update existing item
                const existingItem = this.cart[existingItemIndex];
                const newQuantity = Math.min(existingItem.quantity + quantity, product.stock);
                
                if (newQuantity === existingItem.quantity) {
                    this.showNotification(`⚠️ Maximum stock (${product.stock}) reached for ${product.strain}`, 'warning');
                    return false;
                }
                
                existingItem.quantity = newQuantity;
                this.showNotification(`⬆️ Updated ${product.strain} quantity to ${newQuantity}`, 'success');
            } else {
                // Add new item
                const cartItem = {
                    id: product.id,
                    strain: product.strain,
                    grade: product.grade,
                    price: this.getPartnerPrice(product.price),
                    originalPrice: product.price,
                    quantity: Math.min(quantity, product.stock),
                    maxStock: product.stock,
                    image: product.image || this.getPlaceholderImage(product.grade),
                    addedAt: new Date().toISOString()
                };
                
                this.cart.push(cartItem);
                this.showNotification(`✅ Added ${product.strain} to cart!`, 'success');
            }

            // Save and update display
            this.saveCartToStorage();
            this.updateDisplay();
            this.notifyListeners('item_added', { productId, quantity });

            // Auto-open cart for first item
            if (this.cart.length === 1) {
                setTimeout(() => {
                    if (confirm('Item added to cart! Would you like to view your cart?')) {
                        this.open();
                    }
                }, 1000);
            }

            return true;

        } catch (error) {
            console.error('Error adding to cart:', error);
            this.showNotification('❌ Error adding item to cart', 'error');
            return false;
        }
    }

    // Remove product from cart
    removeProduct(productId) {
        try {
            const itemIndex = this.cart.findIndex(item => item.id == productId);
            if (itemIndex === -1) {
                this.showNotification('❌ Item not found in cart', 'error');
                return false;
            }

            const removedItem = this.cart.splice(itemIndex, 1)[0];
            this.saveCartToStorage();
            this.updateDisplay();
            this.notifyListeners('item_removed', { productId });
            
            this.showNotification(`🗑️ Removed ${removedItem.strain} from cart`, 'success');
            return true;

        } catch (error) {
            console.error('Error removing from cart:', error);
            this.showNotification('❌ Error removing item from cart', 'error');
            return false;
        }
    }

    // Update item quantity
    updateQuantity(productId, newQuantity) {
        try {
            if (newQuantity < 0) {
                this.showNotification('❌ Quantity cannot be negative', 'error');
                return false;
            }

            if (newQuantity === 0) {
                return this.removeProduct(productId);
            }

            const item = this.cart.find(item => item.id == productId);
            if (!item) {
                this.showNotification('❌ Item not found in cart', 'error');
                return false;
            }

            // Check stock availability
            const products = this.getProducts();
            const product = products.find(p => p.id == productId);
            const maxQuantity = product ? product.stock : item.maxStock;

            if (newQuantity > maxQuantity) {
                this.showNotification(`⚠️ Only ${maxQuantity} units available for ${item.strain}`, 'warning');
                newQuantity = maxQuantity;
            }

            const oldQuantity = item.quantity;
            item.quantity = newQuantity;

            this.saveCartToStorage();
            this.updateDisplay();
            this.notifyListeners('quantity_updated', { productId, oldQuantity, newQuantity });

            if (newQuantity > oldQuantity) {
                this.showNotification(`⬆️ Increased ${item.strain} quantity to ${newQuantity}`, 'success');
            } else {
                this.showNotification(`⬇️ Decreased ${item.strain} quantity to ${newQuantity}`, 'success');
            }

            return true;

        } catch (error) {
            console.error('Error updating quantity:', error);
            this.showNotification('❌ Error updating quantity', 'error');
            return false;
        }
    }

    // Clear entire cart
    clear() {
        if (this.cart.length === 0) {
            this.showNotification('🛒 Cart is already empty', 'warning');
            return;
        }

        if (confirm('Are you sure you want to clear your entire cart? This action cannot be undone.')) {
            const itemCount = this.cart.length;
            this.cart = [];
            this.saveCartToStorage();
            this.updateDisplay();
            this.notifyListeners('cart_cleared', { itemCount });
            
            this.showNotification(`🗑️ Cart cleared successfully (${itemCount} items removed)`, 'success');
        }
    }

    // Get cart totals
    getTotals() {
        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        const shipping = subtotal > 1000 ? 0 : 25;
        const total = subtotal + shipping;

        return {
            subtotal: subtotal,
            shipping: shipping,
            total: total,
            totalItems: totalItems,
            itemCount: this.cart.length
        };
    }

    // Update cart display
    updateDisplay() {
        try {
            console.log('🔄 Updating cart display...', this.cart.length, 'items');
            
            const cartItems = document.getElementById('cartItems');
            const cartCount = document.getElementById('cartCount');
            const cartCount2 = document.getElementById('cartCount2');
            const cartTotal = document.getElementById('cartTotal');

            const totals = this.getTotals();

            // Update cart counters
            if (cartCount) {
                cartCount.textContent = totals.totalItems;
            }
            if (cartCount2) {
                cartCount2.textContent = totals.totalItems;
            }

            // Update cart items if cart is open
            if (cartItems) {
                if (this.cart.length === 0) {
                    cartItems.innerHTML = this.getEmptyCartHTML();
                } else {
                    cartItems.innerHTML = this.cart.map(item => this.getCartItemHTML(item)).join('');
                }
            }

            // Update cart total
            if (cartTotal) {
                cartTotal.textContent = totals.total.toFixed(2);
            }

            // Update cart total section
            this.updateCartTotalSection(totals);

            console.log('✅ Cart display updated successfully');

        } catch (error) {
            console.error('Error updating cart display:', error);
        }
    }

    // Generate empty cart HTML
    getEmptyCartHTML() {
        return `
            <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                <div style="font-size: 3rem; margin-bottom: 16px;">🛒</div>
                <h3 style="margin-bottom: 8px;">Your cart is empty</h3>
                <p>Browse our premium products to get started!</p>
                <button class="btn btn-primary" onclick="window.cartManager.close(); switchPortalTab('products')" style="margin-top: 16px;">
                    🌿 Browse Products
                </button>
            </div>
        `;
    }

    // Generate cart item HTML
    getCartItemHTML(item) {
        const currentQuantity = parseInt(item.quantity) || 1;
        const decreaseQuantity = Math.max(0, currentQuantity - 1);
        const increaseQuantity = currentQuantity + 1;
        const maxStock = item.maxStock || 999;

        return `
            <div class="cart-item" data-product-id="${item.id}">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                    <img src="${item.image}" alt="${item.strain}" class="cart-product-image" 
                         style="width: 60px; height: 60px; border-radius: 8px; object-fit: cover;"
                         onerror="this.src='${this.getPlaceholderImage(item.grade)}'" />
                    <div style="flex: 1;">
                        <h4 style="margin: 0; font-size: 14px; font-weight: 600;">${item.strain}</h4>
                        <p style="margin: 4px 0 0 0; color: var(--text-secondary); font-size: 12px;">
                            ${item.grade} • $${item.price}${this.getUnitLabel(item.grade)}
                        </p>
                    </div>
                </div>
                <div class="cart-item-controls" style="display: flex; justify-content: space-between; align-items: center;">
                    <div class="quantity-controls" style="display: flex; align-items: center; gap: 8px;">
                        <button class="quantity-btn" 
                                onclick="window.cartManager.updateQuantity(${item.id}, ${decreaseQuantity})"
                                ${currentQuantity <= 1 ? 'disabled' : ''}
                                style="background: var(--accent-red); color: white; border: none; border-radius: 4px; width: 30px; height: 30px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center;"
                                title="Decrease quantity">-</button>
                        <span class="quantity-display" style="font-weight: 600; min-width: 30px; text-align: center; font-size: 16px;">${currentQuantity}</span>
                        <button class="quantity-btn" 
                                onclick="window.cartManager.updateQuantity(${item.id}, ${increaseQuantity})"
                                ${currentQuantity >= maxStock ? 'disabled' : ''}
                                style="background: var(--brand-green); color: white; border: none; border-radius: 4px; width: 30px; height: 30px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center;"
                                title="Increase quantity">+</button>
                    </div>
                    <button class="btn btn-danger btn-sm" 
                            onclick="window.cartManager.removeProduct(${item.id})" 
                            style="padding: 6px 12px; font-size: 12px; background: var(--accent-red); border: none; color: white; border-radius: 4px; cursor: pointer;"
                            title="Remove from cart">Remove</button>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-subtle);">
                    <small style="color: var(--text-muted);">${maxStock} available</small>
                    <p style="font-weight: 700; color: var(--brand-green); margin: 0; font-size: 16px;">
                        $${(item.price * currentQuantity).toFixed(2)}
                    </p>
                </div>
            </div>
        `;
    }

    // Update cart total section
    updateCartTotalSection(totals) {
        const cartTotalSection = document.querySelector('.cart-total');
        if (cartTotalSection && this.cart.length > 0) {
            cartTotalSection.innerHTML = `
                <div style="margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span>Subtotal:</span>
                        <span>$${totals.subtotal.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span>Shipping:</span>
                        <span style="color: ${totals.shipping === 0 ? 'var(--brand-green)' : 'var(--text-primary)'};">
                            ${totals.shipping === 0 ? 'FREE' : '$' + totals.shipping.toFixed(2)}
                        </span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; border-top: 1px solid var(--border-subtle); padding-top: 8px;">
                        <span>Total:</span>
                        <span style="color: var(--brand-green);">$${totals.total.toFixed(2)}</span>
                    </div>
                    ${totals.shipping === 0 ? '<p style="color: var(--brand-green); font-size: 12px; margin: 8px 0 0 0;">🚚 FREE shipping on orders over $1,000!</p>' : ''}
                </div>
                <button class="btn btn-primary" style="width: 100%; padding: 12px; font-size: 16px; font-weight: 600; background: var(--brand-green); border: none; color: white; border-radius: 8px; cursor: pointer;" onclick="window.cartManager.checkout()">
                    Place Order 🚀
                </button>
                <button class="btn btn-secondary" style="width: 100%; margin-top: 8px; padding: 8px; background: var(--surface-elevated); border: 1px solid var(--border-subtle); color: var(--text-primary); border-radius: 8px; cursor: pointer;" onclick="window.cartManager.clear()">
                    Clear Cart
                </button>
            `;
        }
    }

    // Helper methods
    getProducts() {
        return window.sharedDataManager?.getProducts() || window.products || [];
    }

    getPartnerPrice(originalPrice) {
        // 20% discount for partners
        return Math.round(originalPrice * 0.8);
    }

    getPlaceholderImage(grade) {
        return `https://via.placeholder.com/60x60/1a1a1a/00C851?text=${encodeURIComponent(grade)}`;
    }

    getUnitLabel(grade) {
        if (!grade) return '/unit';
        
        const gradeUpper = grade.toString().toUpperCase();
        if (gradeUpper.includes('ROSIN') || gradeUpper.includes('CONCENTRATE')) {
            return '/g';
        } else if (gradeUpper.includes('VAPE') || gradeUpper.includes('CART')) {
            return '/cart';
        } else {
            return '/lb';
        }
    }

    // Cart UI methods
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.isOpen = true;
        const cartEl = document.getElementById('cart');
        if (cartEl) {
            cartEl.classList.add('open');
            this.updateDisplay();
        }
    }

    close() {
        this.isOpen = false;
        const cartEl = document.getElementById('cart');
        if (cartEl) {
            cartEl.classList.remove('open');
        }
    }

    // Checkout process
    async checkout() {
        try {
            const user = this.getCurrentUser();
            if (!user) {
                this.showNotification('🔒 Please log in to complete checkout', 'error');
                return false;
            }

            if (this.cart.length === 0) {
                this.showNotification('⚠️ Your cart is empty! Add some products first.', 'error');
                return false;
            }

            // Show loading state
            const checkoutBtn = document.querySelector('.cart-total .btn-primary');
            const originalText = checkoutBtn ? checkoutBtn.textContent : '';
            if (checkoutBtn) {
                checkoutBtn.textContent = 'Processing Order...';
                checkoutBtn.disabled = true;
            }

            // Process order
            const success = await this.processOrder();

            // Restore button state
            if (checkoutBtn) {
                checkoutBtn.textContent = originalText;
                checkoutBtn.disabled = false;
            }

            return success;

        } catch (error) {
            console.error('Checkout error:', error);
            this.showNotification('❌ Checkout failed. Please try again.', 'error');
            return false;
        }
    }

    // Process order
    async processOrder() {
        return new Promise((resolve) => {
            setTimeout(() => {
                try {
                    const user = this.getCurrentUser();
                    const totals = this.getTotals();
                    const orderItems = this.cart.map(item => `${item.strain} (x${item.quantity})`).join(', ');
                    
                    const newOrder = {
                        id: `ORD-${Date.now()}`,
                        partner: user.email,
                        partnerName: user.name || user.email.split('@')[0],
                        items: orderItems,
                        itemDetails: this.cart.map(item => ({
                            id: item.id,
                            strain: item.strain,
                            grade: item.grade,
                            quantity: item.quantity,
                            price: item.price,
                            subtotal: item.price * item.quantity
                        })),
                        total: totals.total,
                        status: 'PENDING',
                        date: new Date().toISOString().split('T')[0],
                        created: new Date().toISOString()
                    };

                    // Add order to shared data manager
                    if (window.sharedDataManager) {
                        window.sharedDataManager.addOrder(newOrder);
                    }

                    // Clear cart
                    this.cart = [];
                    this.saveCartToStorage();
                    this.updateDisplay();
                    this.close();

                    // Show success notification
                    this.showNotification(`🎉 Order placed successfully! Order ID: ${newOrder.id}`, 'success');

                    // Update all views
                    if (window.updateAllViews) {
                        window.updateAllViews();
                    }

                    resolve(true);

                } catch (error) {
                    console.error('Order processing error:', error);
                    this.showNotification('❌ Order processing failed', 'error');
                    resolve(false);
                }
            }, 2000);
        });
    }

    // Event system
    addListener(callback) {
        this.listeners.push(callback);
    }

    notifyListeners(event, data) {
        this.listeners.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Error in cart listener:', error);
            }
        });
    }

    // Show notification
    showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    // Debug method
    getState() {
        return {
            cart: this.cart,
            isOpen: this.isOpen,
            totals: this.getTotals(),
            hasUser: !!this.getCurrentUser()
        };
    }
}

// Initialize cart manager
if (typeof window !== 'undefined') {
    window.CartManager = CartManager;
    
    // Initialize cart manager if not already done
    if (!window.cartManager) {
        window.cartManager = new CartManager();
        console.log('🛒 Cart manager initialized and ready');
    }
}
