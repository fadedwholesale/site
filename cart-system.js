// Faded Skies Cart and Checkout System
// Complete implementation with real-time updates

class CartManager {
    constructor() {
        this.cart = [];
        this.isOpen = false;
        this.listeners = [];
        this.addToCartLock = false;
        
        // Initialize cart from shared data manager
        this.initialize();
    }

    initialize() {
        // Set up event listeners for cart updates
        window.addEventListener('cartUpdate', (event) => {
            this.updateDisplay();
        });

        // Listen for authentication state changes
        window.addEventListener('userAuthenticated', (event) => {
            console.log('🔐 Cart: User authenticated event received');
            this.refreshUserState();
        });

        // Load existing cart if user is logged in
        if (window.currentUser) {
            this.loadCart();
        }
    }

    // Refresh authentication state and reload cart
    refreshUserState() {
        console.log('🔄 Cart: Refreshing user state', { currentUser: !!window.currentUser });
        if (window.currentUser) {
            this.loadCart();
            this.updateDisplay();
            console.log('✅ Cart: User state refreshed successfully');
        }
    }

    // Load cart from shared data manager
    loadCart() {
        if (!window.currentUser || !window.sharedDataManager) return;
        
        try {
            const savedCart = window.sharedDataManager.getCart(window.currentUser.email);
            this.cart = savedCart || [];
            console.log('📦 Cart loaded:', this.cart.length, 'items');
            this.updateDisplay();
        } catch (error) {
            console.error('Error loading cart:', error);
            this.cart = [];
        }
    }

    // Save cart to shared data manager
    saveCart() {
        if (!window.currentUser || !window.sharedDataManager) return;
        
        try {
            window.sharedDataManager.updateCart(window.currentUser.email, this.cart);
            console.log('💾 Cart saved:', this.cart.length, 'items');
        } catch (error) {
            console.error('Error saving cart:', error);
        }
    }

    // Add product to cart
    addProduct(productId, quantity = 1) {
        if (this.addToCartLock) return false;
        this.addToCartLock = true;
        setTimeout(() => { this.addToCartLock = false; }, 300);

        // Check for authentication - ensure current user exists
        if (!window.currentUser || !window.currentUser.email) {
            this.showNotification('🔒 Please log in to add items to cart', 'error');
            console.log('❌ Cart: No authenticated user found', {
                hasCurrentUser: !!window.currentUser,
                hasEmail: window.currentUser?.email,
                windowHasCurrentUser: 'currentUser' in window
            });
            return false;
        }

        console.log('✅ Cart: Authenticated user found:', window.currentUser.email);

        try {
            const products = window.sharedDataManager?.getProducts() || window.products || [];
            const product = products.find(p => p.id == productId);
            
            if (!product) {
                this.showNotification('❌ Product not found', 'error');
                return false;
            }

            if (product.status !== 'AVAILABLE' || product.stock <= 0) {
                this.showNotification(`❌ ${product.strain} is not available`, 'error');
                return false;
            }

            // Check if product already exists in cart
            const existingItem = this.cart.find(item => item.id == productId);
            
            if (existingItem) {
                const newQuantity = Math.min(existingItem.quantity + quantity, product.stock);
                if (newQuantity === existingItem.quantity) {
                    this.showNotification(`⚠️ Maximum quantity (${product.stock}) reached for ${product.strain}`, 'warning');
                    return false;
                }
                existingItem.quantity = newQuantity;
                this.showNotification(`⬆️ Updated ${product.strain} quantity to ${newQuantity}`, 'success');
            } else {
                const cartItem = {
                    id: product.id,
                    strain: product.strain,
                    grade: product.grade,
                    price: product.price,
                    quantity: Math.min(quantity, product.stock),
                    maxStock: product.stock,
                    image: product.image || 'https://via.placeholder.com/60x60/1a1a1a/00C851?text=' + product.grade,
                    addedAt: new Date().toISOString()
                };
                
                this.cart.push(cartItem);
                this.showNotification(`✅ Added ${product.strain} to cart!`, 'success');
            }

            this.saveCart();
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
            this.saveCart();
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

            const products = window.sharedDataManager?.getProducts() || window.products || [];
            const product = products.find(p => p.id == productId);
            const maxQuantity = product ? product.stock : item.maxStock;

            if (newQuantity > maxQuantity) {
                this.showNotification(`⚠️ Only ${maxQuantity} units available for ${item.strain}`, 'warning');
                newQuantity = maxQuantity;
            }

            const oldQuantity = item.quantity;
            item.quantity = newQuantity;

            this.saveCart();
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
            this.saveCart();
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
            console.log('🔄 Updating cart display with', this.cart.length, 'unique items');
            
            const cartItems = document.getElementById('cartItems');
            const cartCount = document.getElementById('cartCount');
            const cartCount2 = document.getElementById('cartCount2');
            const cartTotal = document.getElementById('cartTotal');

            const totals = this.getTotals();

            // Update cart counters
            if (cartCount) {
                cartCount.textContent = totals.totalItems;
                console.log('✅ Updated cartCount to:', totals.totalItems);
            }
            if (cartCount2) {
                cartCount2.textContent = totals.totalItems;
                console.log('✅ Updated cartCount2 to:', totals.totalItems);
            }

            if (!cartItems || !cartTotal) {
                console.warn('Cart elements not found');
                return;
            }

            // Update cart total
            cartTotal.textContent = totals.total.toFixed(2);

            // Generate cart items HTML
            if (this.cart.length === 0) {
                cartItems.innerHTML = this.getEmptyCartHTML();
            } else {
                cartItems.innerHTML = this.cart.map(item => this.getCartItemHTML(item)).join('');
            }

            // Update cart total section
            this.updateCartTotalSection(totals);

            console.log('✅ Cart display updated successfully');
            console.log('📊 Cart stats:', totals);

        } catch (error) {
            console.error('Error updating cart display:', error);
            this.showNotification('❌ Error updating cart display', 'error');
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
        const products = window.sharedDataManager?.getProducts() || window.products || [];
        const product = products.find(p => p.id == item.id);
        const maxStock = product ? product.stock : item.maxStock;
        const currentQuantity = parseInt(item.quantity) || 1;
        const decreaseQuantity = Math.max(0, currentQuantity - 1);
        const increaseQuantity = currentQuantity + 1;

        return `
            <div class="cart-item" data-product-id="${item.id}">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                    <img src="${item.image}" alt="${item.strain}" class="cart-product-image" 
                         style="width: 60px; height: 60px; border-radius: 8px; object-fit: cover;"
                         onerror="this.src='https://via.placeholder.com/60x60/1a1a1a/00C851?text=${item.grade}'" />
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
                                style="background: var(--accent-red); color: white; border: none; border-radius: 4px; width: 30px; height: 30px; cursor: pointer;"
                                title="Decrease quantity">-</button>
                        <span class="quantity-display" style="font-weight: 600; min-width: 20px; text-align: center;">${currentQuantity}</span>
                        <button class="quantity-btn" 
                                onclick="window.cartManager.updateQuantity(${item.id}, ${increaseQuantity})"
                                ${currentQuantity >= maxStock ? 'disabled' : ''}
                                style="background: var(--brand-green); color: white; border: none; border-radius: 4px; width: 30px; height: 30px; cursor: pointer;"
                                title="Increase quantity">+</button>
                    </div>
                    <button class="btn btn-danger btn-sm" 
                            onclick="window.cartManager.removeProduct(${item.id})" 
                            style="padding: 4px 8px; font-size: 12px;"
                            title="Remove from cart">Remove</button>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
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
        if (cartTotalSection) {
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
                    <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; border-top: 1px solid var(--border-color); padding-top: 8px;">
                        <span>Total:</span>
                        <span style="color: var(--brand-green);">$${totals.total.toFixed(2)}</span>
                    </div>
                </div>
                <button class="btn btn-primary" style="width: 100%; padding: 12px; font-size: 16px; font-weight: 600;" onclick="window.cartManager.checkout()">
                    Place Order 🚀
                </button>
                <button class="btn btn-secondary" style="width: 100%; margin-top: 8px;" onclick="window.cartManager.clear()">
                    Clear Cart
                </button>
            `;
        }
    }

    // Get unit label based on grade
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

    // Toggle cart open/close
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    // Open cart
    open() {
        this.isOpen = true;
        const cartEl = document.getElementById('cart');
        if (cartEl) {
            cartEl.classList.add('open');
            this.updateDisplay(); // Refresh cart display when opening
        }
    }

    // Close cart
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
            if (!window.currentUser) {
                this.showNotification('🔒 Please log in to complete checkout', 'error');
                return false;
            }

            if (this.cart.length === 0) {
                this.showNotification('⚠️ Your cart is empty! Add some products first.', 'error');
                return false;
            }

            // Validate cart items
            const validation = this.validateCart();
            if (!validation.valid) {
                this.showNotification('🔄 Please review your cart and try again', 'warning');
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
            this.showNotification('❌ Checkout failed. Please try again or contact support.', 'error');
            return false;
        }
    }

    // Validate cart before checkout
    validateCart() {
        const issues = [];
        const products = window.sharedDataManager?.getProducts() || window.products || [];

        this.cart.forEach(cartItem => {
            const product = products.find(p => p.id == cartItem.id);
            
            if (!product) {
                issues.push(`${cartItem.strain} is no longer available`);
                return;
            }
            
            if (product.status !== 'AVAILABLE') {
                issues.push(`${cartItem.strain} is no longer available`);
                return;
            }
            
            if (cartItem.quantity > product.stock) {
                issues.push(`Only ${product.stock} units of ${cartItem.strain} available`);
                cartItem.quantity = product.stock;
                this.updateDisplay();
            }
        });

        if (issues.length > 0) {
            issues.forEach(issue => this.showNotification(`⚠️ ${issue}`, 'warning'));
            return { valid: false, issues };
        }

        return { valid: true, issues: [] };
    }

    // Process order
    async processOrder() {
        return new Promise((resolve) => {
            setTimeout(() => {
                try {
                    const totals = this.getTotals();
                    const orderItems = this.cart.map(item => `${item.strain} (x${item.quantity})`).join(', ');
                    
                    const newOrder = {
                        id: `ORD-${String((window.sharedDataManager?.getOrders()?.length || 0) + 1).padStart(3, '0')}`,
                        partner: window.currentUser.email,
                        partnerName: window.currentUser.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + ' Store',
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
                        notes: '',
                        delivery: totals.total > 1000 ? 'priority' : 'standard',
                        created: new Date().toISOString()
                    };

                    // Add order to shared data manager
                    if (window.sharedDataManager) {
                        window.sharedDataManager.addOrder(newOrder);
                    }

                    // Update inventory
                    this.updateInventoryAfterOrder();

                    // Clear cart
                    this.cart = [];
                    this.saveCart();
                    this.updateDisplay();
                    this.close();

                    // Show success notifications
                    this.showNotification(`🎉 Order placed successfully! Order ID: ${newOrder.id}`, 'success');
                    
                    setTimeout(() => {
                        this.showNotification(`📧 Order confirmation sent to ${window.currentUser.email}`, 'success');
                    }, 2000);

                    if (totals.total > 1000) {
                        setTimeout(() => {
                            this.showNotification('🚚 FREE priority shipping included with your order!', 'success');
                        }, 4000);
                    }

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

    // Update inventory after successful order
    updateInventoryAfterOrder() {
        if (!window.sharedDataManager) return;

        this.cart.forEach(cartItem => {
            const product = window.sharedDataManager.getProducts().find(p => p.id == cartItem.id);
            if (product) {
                const newStock = Math.max(0, product.stock - cartItem.quantity);
                const newStatus = newStock === 0 ? 'SOLD OUT' : product.status;
                
                window.sharedDataManager.updateProduct(product.id, {
                    stock: newStock,
                    status: newStatus
                });
            }
        });
    }

    // Add event listener
    addListener(callback) {
        this.listeners.push(callback);
    }

    // Notify listeners of cart changes
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

    // Get cart state for debugging
    getState() {
        return {
            cart: this.cart,
            isOpen: this.isOpen,
            totals: this.getTotals(),
            hasUser: !!window.currentUser
        };
    }
}

// Initialize cart manager when DOM is ready
if (typeof window !== 'undefined') {
    window.CartManager = CartManager;
    
    // Initialize cart manager if not already done
    if (!window.cartManager) {
        window.cartManager = new CartManager();
        console.log('🛒 Cart manager initialized');
    }
}
