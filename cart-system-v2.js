// Modern Real-Time Cart System
// Live sync, persistent storage, and real-time updates

class ModernCartManager {
    constructor() {
        this.state = {
            items: [],
            totals: { subtotal: 0, shipping: 0, tax: 0, total: 0, itemCount: 0 },
            isOpen: false,
            isLoading: false,
            lastSync: null,
            cartId: null
        };
        
        this.listeners = new Set();
        this.storageKey = 'faded-skies-cart';
        this.syncKey = 'faded-skies-cart-sync';
        this.config = {
            freeShippingThreshold: 1000,
            taxRate: 0.0875, // 8.75%
            maxQuantityPerItem: 10,
            debounceDelay: 300
        };
        
        this.debounceTimer = null;
        this.syncTimer = null;
        
        this.init();
    }

    init() {
        console.log('🛒 Initializing Modern Cart Manager...');
        
        // Set up cross-tab sync
        this.setupCrossTabSync();
        
        // Set up auth integration
        this.setupAuthIntegration();
        
        // Restore cart state
        this.restoreCart();
        
        // Set up periodic sync
        this.setupPeriodicSync();
        
        // Set up UI event listeners
        this.setupUIListeners();
        
        console.log('✅ Modern Cart Manager initialized');
    }

    setupCrossTabSync() {
        window.addEventListener('storage', (event) => {
            if (event.key === this.syncKey) {
                console.log('🔄 Cart sync signal received from another tab');
                this.handleExternalCartChange();
            }
        });

        window.addEventListener('focus', () => {
            this.syncWithStorage();
        });
    }

    setupAuthIntegration() {
        if (window.authManager) {
            window.authManager.on('login', (event, data) => {
                console.log('🔐 User logged in, syncing cart...');
                this.handleUserLogin(data.user);
            });

            window.authManager.on('logout', (event, data) => {
                console.log('🔐 User logged out, handling cart...');
                this.handleUserLogout(data.reason);
            });

            window.authManager.on('restore', (event, data) => {
                console.log('🔐 Session restored, syncing cart...');
                this.handleUserLogin(data.user);
            });
        }
    }

    setupPeriodicSync() {
        // Sync every 30 seconds if there are changes
        this.syncTimer = setInterval(() => {
            if (this.state.lastSync && Date.now() - this.state.lastSync > 30000) {
                this.syncCart();
            }
        }, 30000);
    }

    setupUIListeners() {
        // Set up keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.state.isOpen) {
                this.closeCart();
            } else if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                this.toggleCart();
            }
        });

        // Set up click outside to close
        document.addEventListener('click', (e) => {
            const cartElement = document.getElementById('modernCart');
            const cartToggle = document.getElementById('cartToggle');
            
            if (this.state.isOpen && cartElement && 
                !cartElement.contains(e.target) && 
                !cartToggle?.contains(e.target)) {
                this.closeCart();
            }
        });
    }

    // Cart Operations
    async addItem(productId, quantity = 1, options = {}) {
        console.log('🛒 Adding item to cart:', { productId, quantity, options });
        
        this.setState({ isLoading: true });
        
        try {
            // Get product data
            const product = await this.getProductData(productId);
            if (!product) {
                throw new Error('Product not found');
            }

            // Process quantity
            quantity = this.processQuantity(quantity, product);
            
            // Check if item already exists
            const existingItemIndex = this.state.items.findIndex(item => 
                item.productId === productId && this.itemOptionsMatch(item.options, options)
            );

            if (existingItemIndex >= 0) {
                // Update existing item
                const existingItem = this.state.items[existingItemIndex];
                const newQuantity = Math.min(
                    existingItem.quantity + quantity, 
                    Math.min(product.stock, this.config.maxQuantityPerItem)
                );
                
                if (newQuantity === existingItem.quantity) {
                    this.showNotification(
                        `Maximum quantity reached for ${product.strain}`, 
                        'warning'
                    );
                    return false;
                }

                this.updateItemQuantity(existingItem.id, newQuantity);
                this.showNotification(
                    `Updated ${product.strain} quantity to ${newQuantity}`, 
                    'success'
                );
            } else {
                // Add new item
                const cartItem = this.createCartItem(product, quantity, options);
                this.state.items.push(cartItem);
                
                this.showNotification(
                    `Added ${product.strain} to cart!`, 
                    'success'
                );
            }

            this.updateTotals();
            this.saveCart();
            this.notifyListeners('item_added', { productId, quantity, options });
            
            // Auto-open cart for first item
            if (this.state.items.length === 1 && !this.state.isOpen) {
                setTimeout(() => this.openCart(), 500);
            }

            return true;

        } catch (error) {
            console.error('Error adding item to cart:', error);
            this.showNotification(`Error adding item: ${error.message}`, 'error');
            return false;
        } finally {
            this.setState({ isLoading: false });
        }
    }

    updateItemQuantity(itemId, newQuantity) {
        const item = this.state.items.find(item => item.id === itemId);
        if (!item) return false;

        if (newQuantity <= 0) {
            return this.removeItem(itemId);
        }

        const oldQuantity = item.quantity;
        item.quantity = newQuantity;
        item.lastModified = new Date().toISOString();

        this.updateTotals();
        this.saveCart();
        this.notifyListeners('quantity_updated', { 
            itemId, 
            oldQuantity, 
            newQuantity,
            item 
        });

        return true;
    }

    removeItem(itemId) {
        const itemIndex = this.state.items.findIndex(item => item.id === itemId);
        if (itemIndex === -1) return false;

        const removedItem = this.state.items.splice(itemIndex, 1)[0];
        
        this.updateTotals();
        this.saveCart();
        this.notifyListeners('item_removed', { itemId, item: removedItem });
        
        this.showNotification(
            `Removed ${removedItem.name} from cart`, 
            'success'
        );

        return true;
    }

    clearCart() {
        if (this.state.items.length === 0) {
            this.showNotification('Cart is already empty', 'info');
            return;
        }

        const itemCount = this.state.items.length;
        this.state.items = [];
        this.updateTotals();
        this.saveCart();
        
        this.notifyListeners('cart_cleared', { itemCount });
        this.showNotification(`Cart cleared (${itemCount} items removed)`, 'success');
    }

    // Cart UI Management
    openCart() {
        this.setState({ isOpen: true });
        this.renderCart();
        this.notifyListeners('cart_opened', {});
        
        // Focus management for accessibility
        const cartElement = document.getElementById('modernCart');
        if (cartElement) {
            cartElement.focus();
        }
    }

    closeCart() {
        this.setState({ isOpen: false });
        this.notifyListeners('cart_closed', {});
    }

    toggleCart() {
        if (this.state.isOpen) {
            this.closeCart();
        } else {
            this.openCart();
        }
    }

    // Data Management
    async getProductData(productId) {
        // Try from shared data manager first
        if (window.sharedDataManager) {
            const products = window.sharedDataManager.getProducts();
            const product = products.find(p => p.id == productId);
            if (product) return product;
        }

        // Fallback to global products array
        if (window.products) {
            return window.products.find(p => p.id == productId);
        }

        return null;
    }

    createCartItem(product, quantity, options = {}) {
        return {
            id: this.generateItemId(),
            productId: product.id,
            name: product.strain,
            grade: product.grade,
            price: this.calculateItemPrice(product),
            quantity: quantity,
            options: options,
            image: product.image || this.getDefaultImage(product.grade),
            addedAt: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            metadata: {
                thca: product.thca,
                type: product.type,
                description: product.description
            }
        };
    }

    calculateItemPrice(product) {
        // Apply partner discount if authenticated
        const isPartner = window.authManager?.isAuthenticated();
        const basePrice = product.price;
        
        if (isPartner) {
            return Math.round(basePrice * 0.8); // 20% partner discount
        }
        
        return basePrice;
    }

    processQuantity(quantity, product) {
        quantity = Math.max(1, parseInt(quantity) || 1);
        quantity = Math.min(quantity, product.stock || 999);
        quantity = Math.min(quantity, this.config.maxQuantityPerItem);
        return quantity;
    }

    updateTotals() {
        const subtotal = this.state.items.reduce((sum, item) => 
            sum + (item.price * item.quantity), 0
        );
        
        const itemCount = this.state.items.reduce((sum, item) => 
            sum + item.quantity, 0
        );
        
        const shipping = subtotal >= this.config.freeShippingThreshold ? 0 : 25;
        const tax = subtotal * this.config.taxRate;
        const total = subtotal + shipping + tax;

        this.state.totals = {
            subtotal: subtotal,
            shipping: shipping,
            tax: tax,
            total: total,
            itemCount: itemCount
        };

        this.notifyListeners('totals_updated', { totals: this.state.totals });
    }

    // Sync and Storage
    saveCart() {
        try {
            const cartData = {
                ...this.state,
                userId: window.authManager?.getUser()?.id || 'guest',
                lastSaved: new Date().toISOString()
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(cartData));
            this.broadcastSync();
            
        } catch (error) {
            console.error('Error saving cart:', error);
        }
    }

    restoreCart() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const cartData = JSON.parse(stored);
                
                // Load cart data
                if (cartData && cartData.items) {
                    this.state = {
                        ...this.state,
                        ...cartData,
                        isOpen: false, // Never restore open state
                        isLoading: false
                    };
                    
                    this.updateTotals();
                    console.log('✅ Cart restored:', this.state.items.length, 'items');
                }
            }
        } catch (error) {
            console.error('Error restoring cart:', error);
            this.clearStoredCart();
        }
    }

    syncCart() {
        this.restoreCart();
        this.state.lastSync = Date.now();
    }

    broadcastSync() {
        try {
            localStorage.setItem(this.syncKey, JSON.stringify({
                timestamp: Date.now(),
                cartId: this.state.cartId
            }));
        } catch (error) {
            console.error('Error broadcasting sync:', error);
        }
    }

    handleExternalCartChange() {
        this.debouncedSync();
    }

    debouncedSync() {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.syncCart();
        }, this.config.debounceDelay);
    }

    syncWithStorage() {
        this.restoreCart();
    }

    // Auth Integration
    handleUserLogin(user) {
        // Merge guest cart with user cart if needed
        this.mergeUserCart(user.id);
        this.saveCart();
    }

    handleUserLogout(reason) {
        if (reason === 'INACTIVE') {
            // Keep cart for inactive logout
            return;
        }
        
        // Clear cart on explicit logout
        this.clearCart();
    }

    mergeUserCart(userId) {
        // In a real app, this would sync with server
        console.log('🔄 Merging guest cart with user cart for:', userId);
        this.state.cartId = `cart_${userId}_${Date.now()}`;
    }

    // Checkout
    async checkout() {
        if (this.state.items.length === 0) {
            this.showNotification('Your cart is empty', 'warning');
            return false;
        }

        this.setState({ isLoading: true });

        try {
            // Process checkout directly

            // Process checkout
            const order = await this.processCheckout();
            
            if (order) {
                this.clearCart();
                this.closeCart();
                this.showNotification(
                    `Order ${order.id} placed successfully!`, 
                    'success'
                );
                
                this.notifyListeners('checkout_complete', { order });
                return order;
            }

        } catch (error) {
            console.error('Checkout error:', error);
            this.showNotification('Checkout failed. Please try again.', 'error');
        } finally {
            this.setState({ isLoading: false });
        }

        return false;
    }

    async validateCartForCheckout() {
        const issues = [];
        
        for (const item of this.state.items) {
            const product = await this.getProductData(item.productId);
            
            if (!product) {
                issues.push(`${item.name} is no longer available`);
                continue;
            }
            
            if (product.status !== 'AVAILABLE') {
                issues.push(`${item.name} is no longer available`);
                continue;
            }
            
            if (item.quantity > product.stock) {
                issues.push(`Only ${product.stock} units of ${item.name} available`);
                this.updateItemQuantity(item.id, product.stock);
            }
        }

        if (issues.length > 0) {
            issues.forEach(issue => this.showNotification(issue, 'warning'));
            return { valid: false, issues };
        }

        return { valid: true, issues: [] };
    }

    async processCheckout() {
        // Simulate order processing
        return new Promise((resolve) => {
            setTimeout(() => {
                const order = {
                    id: `ORD-${Date.now().toString().slice(-6)}`,
                    items: this.state.items.map(item => ({
                        productId: item.productId,
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                        subtotal: item.price * item.quantity
                    })),
                    totals: { ...this.state.totals },
                    customer: window.authManager?.getUser() || { 
                        email: 'guest@example.com',
                        name: 'Guest Customer' 
                    },
                    status: 'PENDING',
                    createdAt: new Date().toISOString()
                };

                // Add to shared data manager if available
                if (window.sharedDataManager) {
                    window.sharedDataManager.addOrder(order);
                }

                resolve(order);
            }, 2000);
        });
    }

    // Utilities
    generateItemId() {
        return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getDefaultImage(grade) {
        return `https://via.placeholder.com/80x80/1a1a1a/00C851?text=${encodeURIComponent(grade || 'Product')}`;
    }

    itemOptionsMatch(options1, options2) {
        return JSON.stringify(options1) === JSON.stringify(options2);
    }

    isValidCartData(data) {
        return data && 
               Array.isArray(data.items) && 
               typeof data.totals === 'object';
    }

    clearStoredCart() {
        try {
            localStorage.removeItem(this.storageKey);
        } catch (error) {
            console.error('Error clearing stored cart:', error);
        }
    }

    setState(updates) {
        this.state = { ...this.state, ...updates };
        this.notifyListeners('state_changed', { state: this.state });
    }

    // Event System
    on(event, callback) {
        this.listeners.add({ event, callback });
        return () => this.listeners.delete({ event, callback });
    }

    off(callback) {
        this.listeners.forEach(listener => {
            if (listener.callback === callback) {
                this.listeners.delete(listener);
            }
        });
    }

    notifyListeners(event, data) {
        this.listeners.forEach(listener => {
            if (listener.event === event || listener.event === '*') {
                try {
                    listener.callback(event, data);
                } catch (error) {
                    console.error('Error in cart listener:', error);
                }
            }
        });

        // Dispatch global events
        window.dispatchEvent(new CustomEvent(`cart:${event}`, {
            detail: { event, data, timestamp: new Date().toISOString() }
        }));
    }

    showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    // Public API
    getState() {
        return { ...this.state };
    }

    getItems() {
        return [...this.state.items];
    }

    getTotals() {
        return { ...this.state.totals };
    }

    getItemCount() {
        return this.state.totals.itemCount;
    }

    isEmpty() {
        return this.state.items.length === 0;
    }

    // Debug utilities
    getDebugInfo() {
        return {
            state: this.state,
            config: this.config,
            listenerCount: this.listeners.size,
            isAuthenticated: window.authManager?.isAuthenticated(),
            storageSize: this.getStorageSize()
        };
    }

    getStorageSize() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? new Blob([data]).size : 0;
        } catch {
            return 0;
        }
    }

    // Cleanup
    destroy() {
        clearInterval(this.syncTimer);
        clearTimeout(this.debounceTimer);
        this.listeners.clear();
    }
}

// Create global cart manager instance
try {
    window.modernCart = new ModernCartManager();

    // Legacy compatibility - but don't override if main-app.js already set it
    if (!window.cartManager) {
        window.cartManager = window.modernCart;
    }

    console.log('✅ Modern cart manager created successfully');
} catch (error) {
    console.error('❌ Failed to create modern cart manager:', error);
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModernCartManager;
}

console.log('🛒 Modern Cart System loaded and ready');
