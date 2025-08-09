// Firebase Dynamic Cart System for Faded Skies Portal
// Real-time cart and order processing with Firestore integration

class FirebaseCartManager {
    constructor() {
        this.cart = [];
        this.isOpen = false;
        this.listeners = [];
        this.firebaseManager = null;
        this.currentUser = null;
        this.orderProcessing = false;
        
        this.initialize();
    }

    async initialize() {
        console.log('🛒 Initializing Firebase Cart Manager...');
        
        // Wait for Firebase to initialize
        if (window.firebaseDataManager) {
            this.firebaseManager = window.firebaseDataManager;
            this.setupFirebaseListeners();
        } else {
            window.addEventListener('firebaseInitialized', (event) => {
                this.firebaseManager = event.detail.manager;
                this.setupFirebaseListeners();
            });
        }
        
        // Listen for authentication changes
        window.addEventListener('firebaseAuthChanged', (event) => {
            this.currentUser = event.detail.user;
            if (this.currentUser) {
                this.loadUserCart();
            } else {
                this.cart = [];
                this.updateDisplay();
            }
        });
        
        console.log('✅ Firebase Cart Manager initialized');
    }

    setupFirebaseListeners() {
        // Listen for product updates to validate cart items
        this.firebaseManager.subscribeToProducts((products) => {
            this.validateCartAgainstProducts(products);
        });
    }

    async loadUserCart() {
        if (!this.currentUser || !this.firebaseManager) return;
        
        try {
            // Load cart from Firestore user data
            const userDoc = await this.firebaseManager.db.collection('users').doc(this.currentUser.uid).get();
            if (userDoc.exists() && userDoc.data().cart) {
                this.cart = userDoc.data().cart;
                console.log('🛒 Loaded cart from Firebase:', this.cart.length, 'items');
                this.updateDisplay();
            }
        } catch (error) {
            console.error('Error loading user cart:', error);
        }
    }

    async saveUserCart() {
        if (!this.currentUser || !this.firebaseManager) return;
        
        try {
            await this.firebaseManager.db.collection('users').doc(this.currentUser.uid).update({
                cart: this.cart,
                cartUpdated: new Date().toISOString()
            });
            console.log('💾 Cart saved to Firebase');
        } catch (error) {
            console.error('Error saving cart:', error);
        }
    }

    async addProduct(productId, quantity = 1) {
        if (!this.currentUser) {
            this.showNotification('🔒 Please log in to add items to cart', 'warning');
            return false;
        }

        if (!this.firebaseManager) {
            this.showNotification('❌ Firebase not initialized', 'error');
            return false;
        }

        try {
            // Get real-time product data from Firebase
            const products = await this.firebaseManager.getProducts();
            const product = products.find(p => p.id === productId);
            
            if (!product) {
                this.showNotification('❌ Product not found', 'error');
                return false;
            }

            if (product.status !== 'AVAILABLE' || product.stock <= 0) {
                this.showNotification(`❌ ${product.strain} is not available`, 'error');
                return false;
            }

            // Check if product already exists in cart
            const existingItem = this.cart.find(item => item.productId === productId);

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
                    productId: product.id,
                    strain: product.strain,
                    grade: product.grade,
                    price: product.price,
                    quantity: Math.min(quantity, product.stock),
                    maxStock: product.stock,
                    image: product.image,
                    addedAt: new Date().toISOString()
                };

                this.cart.push(cartItem);
                this.showNotification(`✅ Added ${product.strain} to cart!`, 'success');
            }

            // Save to Firebase and update display
            await this.saveUserCart();
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

    async updateQuantity(productId, newQuantity) {
        if (!this.currentUser) return false;

        try {
            if (newQuantity <= 0) {
                return this.removeProduct(productId);
            }

            const item = this.cart.find(item => item.productId === productId);
            if (!item) {
                this.showNotification('❌ Item not found in cart', 'error');
                return false;
            }

            // Validate against current product data
            const products = await this.firebaseManager.getProducts();
            const product = products.find(p => p.id === productId);
            const maxQuantity = product ? product.stock : item.maxStock;

            if (newQuantity > maxQuantity) {
                this.showNotification(`⚠️ Only ${maxQuantity} units available for ${item.strain}`, 'warning');
                newQuantity = maxQuantity;
            }

            item.quantity = newQuantity;
            await this.saveUserCart();
            this.updateDisplay();
            this.notifyListeners('quantity_updated', { productId, newQuantity });

            this.showNotification(`🔄 Updated ${item.strain} quantity to ${newQuantity}`, 'success');
            return true;

        } catch (error) {
            console.error('Error updating quantity:', error);
            this.showNotification('❌ Error updating quantity', 'error');
            return false;
        }
    }

    async removeProduct(productId) {
        try {
            const itemIndex = this.cart.findIndex(item => item.productId === productId);
            if (itemIndex === -1) {
                this.showNotification('❌ Item not found in cart', 'error');
                return false;
            }

            const removedItem = this.cart.splice(itemIndex, 1)[0];
            await this.saveUserCart();
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

    async clear() {
        if (this.cart.length === 0) {
            this.showNotification('🛒 Cart is already empty', 'warning');
            return;
        }

        if (confirm('Are you sure you want to clear your entire cart? This action cannot be undone.')) {
            const itemCount = this.cart.length;
            this.cart = [];
            await this.saveUserCart();
            this.updateDisplay();
            this.notifyListeners('cart_cleared', { itemCount });
            
            this.showNotification(`🗑️ Cart cleared successfully (${itemCount} items removed)`, 'success');
        }
    }

    async validateCartAgainstProducts(products) {
        if (this.cart.length === 0) return;

        let cartChanged = false;
        const issues = [];

        for (let i = this.cart.length - 1; i >= 0; i--) {
            const cartItem = this.cart[i];
            const product = products.find(p => p.id === cartItem.productId);
            
            if (!product) {
                issues.push(`${cartItem.strain} is no longer available`);
                this.cart.splice(i, 1);
                cartChanged = true;
                continue;
            }
            
            if (product.status !== 'AVAILABLE') {
                issues.push(`${cartItem.strain} is no longer available`);
                this.cart.splice(i, 1);
                cartChanged = true;
                continue;
            }
            
            if (cartItem.quantity > product.stock) {
                issues.push(`Only ${product.stock} units of ${cartItem.strain} available`);
                cartItem.quantity = product.stock;
                cartItem.maxStock = product.stock;
                cartChanged = true;
            }

            // Update price if changed
            if (cartItem.price !== product.price) {
                cartItem.price = product.price;
                cartChanged = true;
            }
        }

        if (cartChanged) {
            await this.saveUserCart();
            this.updateDisplay();
            
            if (issues.length > 0) {
                issues.forEach(issue => this.showNotification(`⚠️ ${issue}`, 'warning'));
            }
        }
    }

    async processOrder(orderData) {
        if (this.orderProcessing) {
            this.showNotification('⏳ Order already being processed...', 'warning');
            return false;
        }

        if (!this.currentUser) {
            this.showNotification('🔒 Please log in to place an order', 'error');
            return false;
        }

        if (this.cart.length === 0) {
            this.showNotification('🛒 Cart is empty', 'error');
            return false;
        }

        this.orderProcessing = true;

        try {
            const totals = this.getTotals();
            
            // Prepare order data for Firebase
            const firebaseOrderData = {
                partnerEmail: this.currentUser.email,
                partnerName: orderData.customerName || this.currentUser.displayName || 'Partner',
                businessName: orderData.businessName || '',
                items: this.cart.map(item => ({
                    productId: item.productId,
                    strain: item.strain,
                    grade: item.grade,
                    quantity: item.quantity,
                    price: item.price,
                    subtotal: item.price * item.quantity
                })),
                itemsSummary: this.cart.map(item => `${item.strain} (x${item.quantity})`).join(', '),
                subtotal: totals.subtotal,
                shipping: totals.shipping,
                total: totals.total,
                shippingAddress: orderData.shippingAddress || '',
                deliveryMethod: orderData.deliveryMethod || 'standard',
                orderNotes: orderData.orderNotes || '',
                customerPhone: orderData.customerPhone || '',
                status: 'PENDING',
                paymentStatus: 'PAID'
            };

            // Submit order to Firebase
            const newOrder = await this.firebaseManager.addOrder(firebaseOrderData);
            
            // Clear cart after successful order
            this.cart = [];
            await this.saveUserCart();
            this.updateDisplay();
            this.close();

            // Show success notifications
            this.showNotification(`🎉 Order placed successfully! Order ID: ${newOrder.id}`, 'success');
            
            setTimeout(() => {
                this.showNotification(`📧 Order confirmation sent to ${this.currentUser.email}`, 'success');
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

            this.orderProcessing = false;
            return newOrder;

        } catch (error) {
            console.error('Order processing error:', error);
            this.showNotification('❌ Order processing failed. Please try again.', 'error');
            this.orderProcessing = false;
            return false;
        }
    }

    getTotals() {
        let subtotal = 0;
        let totalItems = 0;

        this.cart.forEach(item => {
            const itemPrice = parseFloat(item.price) || 0;
            const itemQuantity = parseInt(item.quantity) || 0;
            subtotal += itemPrice * itemQuantity;
            totalItems += itemQuantity;
        });

        const shipping = subtotal > 1000 ? 0 : 25;
        const total = subtotal + shipping;

        return {
            subtotal: Math.round(subtotal * 100) / 100,
            shipping: shipping,
            total: Math.round(total * 100) / 100,
            totalItems: totalItems,
            itemCount: this.cart.length
        };
    }

    updateDisplay() {
        try {
            const cartItems = document.getElementById('cartItems');
            const cartCount = document.getElementById('cartCount');
            const cartCount2 = document.getElementById('cartCount2');
            const cartTotal = document.getElementById('cartTotal');

            const totals = this.getTotals();

            // Update cart counters
            if (cartCount) cartCount.textContent = totals.totalItems;
            if (cartCount2) cartCount2.textContent = totals.totalItems;

            // Update all cart counters in the DOM
            const allCartCounters = document.querySelectorAll('[id*="cartCount"], .cart-counter');
            allCartCounters.forEach(counter => {
                counter.textContent = totals.totalItems;
            });

            if (!cartItems) return;

            // Update cart total
            if (cartTotal) {
                cartTotal.textContent = totals.total.toFixed(2);
            }

            // Generate cart items HTML
            if (this.cart.length === 0) {
                cartItems.innerHTML = this.getEmptyCartHTML();
            } else {
                const cartItemsHTML = this.cart.map(item => this.getCartItemHTML(item)).join('');
                cartItems.innerHTML = cartItemsHTML;
            }

            // Update cart total section
            this.updateCartTotalSection(totals);

        } catch (error) {
            console.error('Error updating cart display:', error);
        }
    }

    getEmptyCartHTML() {
        return `
            <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                <div style="font-size: 3rem; margin-bottom: 16px;">🛒</div>
                <h3 style="margin-bottom: 8px;">Your cart is empty</h3>
                <p>Browse our premium products to get started!</p>
                <button class="btn btn-primary" onclick="window.firebaseCartManager.close(); switchPortalTab('products')" style="margin-top: 16px;">
                    🌿 Browse Products
                </button>
            </div>
        `;
    }

    getCartItemHTML(item) {
        const currentQuantity = parseInt(item.quantity) || 1;
        const decreaseQuantity = Math.max(0, currentQuantity - 1);
        const increaseQuantity = currentQuantity + 1;
        const itemPrice = parseFloat(item.price) || 0;
        const itemTotal = itemPrice * currentQuantity;
        const maxStock = item.maxStock || 999;

        return `
            <div class="cart-item" data-product-id="${item.productId}" style="margin-bottom: 16px; border: 1px solid var(--border-subtle); border-radius: 12px; padding: 16px; background: var(--surface-dark);">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                    <img src="${item.image || 'https://via.placeholder.com/60x60/1a1a1a/00C851?text=' + encodeURIComponent(item.grade)}"
                         alt="${item.strain}" class="cart-product-image"
                         style="width: 60px; height: 60px; border-radius: 8px; object-fit: cover; border: 2px solid var(--border-subtle);"
                         onerror="this.src='https://via.placeholder.com/60x60/1a1a1a/00C851?text=${encodeURIComponent(item.grade)}'" />
                    <div style="flex: 1;">
                        <h4 style="margin: 0; font-size: 16px; font-weight: 600; color: var(--text-primary);">${item.strain}</h4>
                        <p style="margin: 4px 0 0 0; color: var(--text-secondary); font-size: 13px;">
                            ${item.grade} • $${itemPrice.toFixed(2)}${this.getUnitLabel(item.grade)}
                        </p>
                    </div>
                </div>
                <div class="cart-item-controls" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <div class="quantity-controls" style="display: flex; align-items: center; gap: 10px;">
                        <button class="quantity-btn"
                                onclick="window.firebaseCartManager.updateQuantity('${item.productId}', ${decreaseQuantity})"
                                ${currentQuantity <= 1 ? 'disabled' : ''}
                                style="background: ${currentQuantity <= 1 ? '#666' : 'var(--accent-red)'}; color: white; border: none; border-radius: 6px; width: 32px; height: 32px; cursor: ${currentQuantity <= 1 ? 'not-allowed' : 'pointer'}; font-weight: bold;"
                                title="Decrease quantity">−</button>
                        <span class="quantity-display" style="font-weight: 700; min-width: 30px; text-align: center; color: var(--text-primary); font-size: 16px; background: var(--surface-card); padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border-subtle);">${currentQuantity}</span>
                        <button class="quantity-btn"
                                onclick="window.firebaseCartManager.updateQuantity('${item.productId}', ${increaseQuantity})"
                                ${currentQuantity >= maxStock ? 'disabled' : ''}
                                style="background: ${currentQuantity >= maxStock ? '#666' : 'var(--brand-green)'}; color: white; border: none; border-radius: 6px; width: 32px; height: 32px; cursor: ${currentQuantity >= maxStock ? 'not-allowed' : 'pointer'}; font-weight: bold;"
                                title="Increase quantity">+</button>
                    </div>
                    <button class="btn btn-danger btn-sm"
                            onclick="window.firebaseCartManager.removeProduct('${item.productId}')"
                            style="padding: 6px 12px; font-size: 12px; border-radius: 6px; background: var(--accent-red); color: white; border: none;"
                            title="Remove ${item.strain} from cart">🗑️ Remove</button>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 12px;">
                    <small style="color: var(--text-muted);">${maxStock} in stock</small>
                    <div style="text-align: right;">
                        <div style="font-weight: 700; color: var(--brand-green); font-size: 18px;">
                            $${itemTotal.toFixed(2)}
                        </div>
                        <small style="color: var(--text-muted);">Item Total</small>
                    </div>
                </div>
            </div>
        `;
    }

    updateCartTotalSection(totals) {
        const cartTotalSection = document.querySelector('.cart-total');
        if (cartTotalSection) {
            cartTotalSection.innerHTML = `
                <div style="margin-bottom: 20px; padding: 16px; background: var(--surface-elevated); border-radius: 12px; border: 1px solid var(--border-subtle);">
                    <h4 style="margin: 0 0 12px 0; color: var(--brand-green); font-size: 16px;">Order Summary</h4>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: var(--text-primary);">
                        <span>Subtotal (${totals.itemCount} items):</span>
                        <span style="font-weight: 600;">$${totals.subtotal.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px; color: var(--text-primary);">
                        <span>Shipping:</span>
                        <span style="color: ${totals.shipping === 0 ? 'var(--brand-green)' : 'var(--text-primary)'}; font-weight: 600;">
                            ${totals.shipping === 0 ? 'FREE 🚚' : '$' + totals.shipping.toFixed(2)}
                        </span>
                    </div>
                    ${totals.shipping === 0 ? '<div style="color: var(--brand-green); font-size: 12px; margin-bottom: 12px;">✅ Free shipping on orders over $1,000!</div>' : ''}
                    <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 20px; border-top: 2px solid var(--border-subtle); padding-top: 12px; color: var(--text-primary);">
                        <span>Total:</span>
                        <span style="color: var(--brand-green);">$${totals.total.toFixed(2)}</span>
                    </div>
                </div>
                <button class="btn btn-primary" style="width: 100%; padding: 14px; font-size: 16px; font-weight: 700; border-radius: 8px;" onclick="window.firebaseCartManager.openCheckoutModal()">
                    🛒 Checkout - $${totals.total.toFixed(2)}
                </button>
                <button class="btn btn-secondary" style="width: 100%; margin-top: 8px; padding: 10px; border-radius: 8px;" onclick="window.firebaseCartManager.clear()">
                    🗑️ Clear Cart
                </button>
            `;
        }
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

    openCheckoutModal() {
        if (this.cart.length === 0) {
            this.showNotification('⚠️ Your cart is empty! Add some products first.', 'error');
            return false;
        }

        if (!this.currentUser) {
            this.showNotification('🔒 Please log in to complete your order', 'error');
            return false;
        }

        // Populate and open checkout modal
        this.populateCheckoutModal();
        openModal('checkoutModal');
        return true;
    }

    populateCheckoutModal() {
        const totals = this.getTotals();

        // Update checkout order summary
        const checkoutOrderItems = document.getElementById('checkoutOrderItems');
        const checkoutOrderTotal = document.getElementById('checkoutOrderTotal');

        if (checkoutOrderItems) {
            const itemsHTML = this.cart.map(item => {
                const itemTotal = item.price * item.quantity;
                return `
                    <div class="checkout-order-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-subtle);">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <img src="${item.image || 'https://via.placeholder.com/40x40/1a1a1a/00C851?text=' + encodeURIComponent(item.grade)}"
                                 alt="${item.strain}" style="width: 40px; height: 40px; border-radius: 6px; object-fit: cover;" />
                            <div>
                                <div style="font-weight: 600; color: var(--text-primary);">${item.strain}</div>
                                <div style="font-size: 12px; color: var(--text-secondary);">${item.grade} • Qty: ${item.quantity}</div>
                            </div>
                        </div>
                        <div style="font-weight: 600; color: var(--brand-green);">$${itemTotal.toFixed(2)}</div>
                    </div>
                `;
            }).join('');

            checkoutOrderItems.innerHTML = itemsHTML;
        }

        if (checkoutOrderTotal) {
            checkoutOrderTotal.textContent = `$${totals.total.toFixed(2)}`;
        }

        // Pre-populate user information if available
        if (this.currentUser) {
            const fields = {
                'checkoutCustomerName': this.currentUser.displayName || '',
                'checkoutCustomerEmail': this.currentUser.email || '',
                'checkoutCustomerPhone': '',
                'checkoutBusinessName': '',
                'checkoutShippingAddress': ''
            };

            Object.entries(fields).forEach(([fieldId, value]) => {
                const element = document.getElementById(fieldId);
                if (element) {
                    element.value = value;
                }
            });
        }
    }

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

    showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    getState() {
        return {
            cart: this.cart,
            isOpen: this.isOpen,
            totals: this.getTotals(),
            hasUser: !!this.currentUser,
            orderProcessing: this.orderProcessing
        };
    }
}

// Initialize Firebase Cart Manager
window.firebaseCartManager = new FirebaseCartManager();

// Make methods globally available
window.addToCart = (productId, quantity) => window.firebaseCartManager?.addProduct(productId, quantity);
window.toggleCart = () => window.firebaseCartManager?.toggle();
window.clearCart = () => window.firebaseCartManager?.clear();

console.log('🛒 Firebase Cart System initialized');
