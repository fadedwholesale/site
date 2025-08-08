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
        console.log('🔄 Cart: Refreshing user state', {
            currentUser: !!window.currentUser,
            userEmail: window.currentUser?.email,
            localStorage: !!localStorage.getItem('currentUser')
        });

        if (window.currentUser && window.currentUser.email) {
            console.log('✅ Cart: Valid user found, loading cart');
            this.loadCart();
            this.updateDisplay();
            console.log('✅ Cart: User state refreshed successfully');
        } else {
            console.log('⚠️ Cart: No valid user found during refresh');
            this.cart = [];
            this.updateDisplay();
        }
    }

    // Load cart from shared data manager
    loadCart() {
        if (!window.sharedDataManager) return;

        try {
            const userEmail = window.currentUser?.email || 'guest';
            const savedCart = window.sharedDataManager.getCart(userEmail);
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
        if (!window.sharedDataManager) return;

        try {
            const userEmail = window.currentUser?.email || 'guest';
            window.sharedDataManager.updateCart(userEmail, this.cart);
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

        console.log('📝 Cart: Adding product', { productId, quantity });

        console.log('�� Cart: Authenticated user found:', window.currentUser.email);

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
                const oldQuantity = existingItem.quantity;
                const newQuantity = Math.min(existingItem.quantity + quantity, product.stock);
                if (newQuantity === existingItem.quantity) {
                    this.showNotification(`⚠️ Maximum quantity (${product.stock}) reached for ${product.strain}`, 'warning');
                    return false;
                }
                existingItem.quantity = newQuantity;
                console.log(`🔄 Updated existing cart item: ${product.strain} from ${oldQuantity} to ${newQuantity}`);
                this.showNotification(`⬆️ Updated ${product.strain} quantity to ${newQuantity}`, 'success');
            } else {
                const cartItem = {
                    id: product.id,
                    strain: product.strain,
                    grade: product.grade,
                    price: product.price,
                    quantity: Math.min(quantity, product.stock),
                    maxStock: product.stock,
                    image: product.image || 'https://via.placeholder.com/60x60/1a1a1a/00C851?text=' + encodeURIComponent(product.grade),
                    addedAt: new Date().toISOString()
                };

                this.cart.push(cartItem);
                console.log(`➕ Added new cart item:`, cartItem);
                this.showNotification(`✅ Added ${product.strain} to cart!`, 'success');
            }

            console.log(`🛒 Cart now contains ${this.cart.length} unique items:`, this.cart.map(item => `${item.strain} (x${item.quantity})`));

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
            this.showNotification('��� Error updating quantity', 'error');
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
        try {
            console.log('💰 Calculating totals for cart items:', this.cart.map(item => `${item.strain}: $${item.price} x ${item.quantity}`));

            let subtotal = 0;
            let totalItems = 0;

            this.cart.forEach((item, index) => {
                const itemPrice = parseFloat(item.price) || 0;
                const itemQuantity = parseInt(item.quantity) || 0;
                const itemSubtotal = itemPrice * itemQuantity;

                console.log(`💰 Item ${index + 1} (${item.strain}): $${itemPrice} x ${itemQuantity} = $${itemSubtotal}`);

                subtotal += itemSubtotal;
                totalItems += itemQuantity;
            });

            const shipping = subtotal > 1000 ? 0 : 25;
            const total = subtotal + shipping;

            const totals = {
                subtotal: Math.round(subtotal * 100) / 100, // Round to 2 decimal places
                shipping: shipping,
                total: Math.round(total * 100) / 100, // Round to 2 decimal places
                totalItems: totalItems,
                itemCount: this.cart.length
            };

            console.log('💰 Final totals calculated:', totals);
            return totals;

        } catch (error) {
            console.error('Error calculating totals:', error);
            return {
                subtotal: 0,
                shipping: 25,
                total: 25,
                totalItems: 0,
                itemCount: 0
            };
        }
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
            } else {
                console.warn('⚠️ cartCount element not found');
            }

            if (cartCount2) {
                cartCount2.textContent = totals.totalItems;
                console.log('✅ Updated cartCount2 to:', totals.totalItems);
            } else {
                console.warn('⚠️ cartCount2 element not found');
            }

            // Also update any other cart counters in the DOM
            const allCartCounters = document.querySelectorAll('[id*="cartCount"], .cart-counter');
            allCartCounters.forEach((counter, index) => {
                if (counter.id !== 'cartCount' && counter.id !== 'cartCount2') {
                    counter.textContent = totals.totalItems;
                    console.log(`✅ Updated additional cart counter ${index}:`, counter.id || counter.className);
                }
            });

            if (!cartItems) {
                console.warn('Cart items container not found');
                return;
            }

            // Update cart total
            if (cartTotal) {
                cartTotal.textContent = totals.total.toFixed(2);
                console.log('✅ Updated cart total to:', totals.total.toFixed(2));
            }

            // Generate cart items HTML - ensure all items are displayed
            if (this.cart.length === 0) {
                cartItems.innerHTML = this.getEmptyCartHTML();
                console.log('🛒 Cart is empty - showing empty state');
            } else {
                console.log('🛒 Generating HTML for', this.cart.length, 'cart items');
                const cartItemsHTML = this.cart.map((item, index) => {
                    console.log(`🛒 Item ${index + 1}:`, {
                        strain: item.strain,
                        quantity: item.quantity,
                        price: item.price,
                        total: (item.price * item.quantity).toFixed(2)
                    });
                    return this.getCartItemHTML(item);
                }).join('');

                cartItems.innerHTML = cartItemsHTML;
                console.log('✅ Cart items HTML updated with', this.cart.length, 'items');

                // Verify DOM update
                setTimeout(() => {
                    const cartItemElements = document.querySelectorAll('.cart-item');
                    console.log('🔍 Cart items in DOM:', cartItemElements.length);
                    if (cartItemElements.length !== this.cart.length) {
                        console.warn('⚠️ Mismatch between cart items and DOM elements!');
                    }
                }, 100);
            }

            // Update cart total section
            this.updateCartTotalSection(totals);

            console.log('✅ Cart display updated successfully');
            console.log('���� Cart stats:', totals);

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
        try {
            const products = window.sharedDataManager?.getProducts() || window.products || [];
            const product = products.find(p => p.id == item.id);
            const maxStock = product ? product.stock : (item.maxStock || 999);
            const currentQuantity = parseInt(item.quantity) || 1;
            const decreaseQuantity = Math.max(0, currentQuantity - 1);
            const increaseQuantity = currentQuantity + 1;
            const itemPrice = parseFloat(item.price) || 0;
            const itemTotal = itemPrice * currentQuantity;

            console.log(`🛒 Generating HTML for cart item:`, {
                strain: item.strain,
                quantity: currentQuantity,
                price: itemPrice,
                total: itemTotal,
                maxStock: maxStock
            });

            return `
                <div class="cart-item" data-product-id="${item.id}" style="margin-bottom: 16px; border: 1px solid var(--border-subtle); border-radius: 12px; padding: 16px; background: var(--surface-dark);">
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
                                    onclick="window.cartManager.updateQuantity(${item.id}, ${decreaseQuantity})"
                                    ${currentQuantity <= 1 ? 'disabled' : ''}
                                    style="background: ${currentQuantity <= 1 ? '#666' : 'var(--accent-red)'}; color: white; border: none; border-radius: 6px; width: 32px; height: 32px; cursor: ${currentQuantity <= 1 ? 'not-allowed' : 'pointer'}; font-weight: bold;"
                                    title="Decrease quantity">−</button>
                            <span class="quantity-display" style="font-weight: 700; min-width: 30px; text-align: center; color: var(--text-primary); font-size: 16px; background: var(--surface-card); padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border-subtle);">${currentQuantity}</span>
                            <button class="quantity-btn"
                                    onclick="window.cartManager.updateQuantity(${item.id}, ${increaseQuantity})"
                                    ${currentQuantity >= maxStock ? 'disabled' : ''}
                                    style="background: ${currentQuantity >= maxStock ? '#666' : 'var(--brand-green)'}; color: white; border: none; border-radius: 6px; width: 32px; height: 32px; cursor: ${currentQuantity >= maxStock ? 'not-allowed' : 'pointer'}; font-weight: bold;"
                                    title="Increase quantity">+</button>
                        </div>
                        <button class="btn btn-danger btn-sm"
                                onclick="window.cartManager.removeProduct(${item.id})"
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
        } catch (error) {
            console.error('Error generating cart item HTML for:', item, error);
            return `<div class="cart-item" style="padding: 16px; color: var(--accent-red); border: 1px solid var(--accent-red); border-radius: 8px; margin-bottom: 8px;">
                        ❌ Error loading item: ${item.strain || 'Unknown'}
                    </div>`;
        }
    }

    // Update cart total section
    updateCartTotalSection(totals) {
        const cartTotalSection = document.querySelector('.cart-total');
        if (cartTotalSection) {
            console.log('💰 Updating cart total section with:', totals);
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
                <button class="btn btn-primary" style="width: 100%; padding: 14px; font-size: 16px; font-weight: 700; border-radius: 8px;" onclick="window.cartManager.openCheckoutModal()">
                    🛒 Checkout - $${totals.total.toFixed(2)}
                </button>
                <button class="btn btn-secondary" style="width: 100%; margin-top: 8px; padding: 10px; border-radius: 8px;" onclick="window.cartManager.clear()">
                    🗑️ Clear Cart
                </button>
            `;
        } else {
            console.warn('Cart total section not found');
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

    // Open checkout modal (new method)
    openCheckoutModal() {
        try {
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

            // Check authentication
            if (!window.currentUser) {
                this.showNotification('🔒 Please log in to complete your order', 'error');
                openModal('loginModal');
                return false;
            }

            // Populate checkout modal with cart data
            this.populateCheckoutModal();

            // Open checkout modal
            openModal('checkoutModal');

            console.log('🛒 Checkout modal opened');
            return true;

        } catch (error) {
            console.error('Checkout modal error:', error);
            this.showNotification('❌ Unable to open checkout. Please try again.', 'error');
            return false;
        }
    }

    // Populate checkout modal with cart and user data
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

        // Pre-populate user information
        const currentUser = window.currentUser;
        if (currentUser) {
            const fields = {
                'checkoutCustomerName': currentUser.contactName || currentUser.name || '',
                'checkoutCustomerEmail': currentUser.email || '',
                'checkoutCustomerPhone': currentUser.phone || '',
                'checkoutBusinessName': currentUser.businessName || '',
                'checkoutShippingAddress': currentUser.businessAddress || ''
            };

            Object.entries(fields).forEach(([fieldId, value]) => {
                const element = document.getElementById(fieldId);
                if (element) {
                    element.value = value;
                }
            });
        }

        console.log('✅ Checkout modal populated with', this.cart.length, 'items');
    }

    // Process checkout and move to payment
    async processCheckout() {
        try {
            // Validate checkout form
            const validation = this.validateCheckoutForm();
            if (!validation.valid) {
                this.showNotification(`❌ ${validation.message}`, 'error');
                return false;
            }

            // Store checkout data
            this.checkoutData = validation.data;

            // Close checkout modal
            closeModal('checkoutModal');

            // Open payment modal with order details
            this.openPaymentModal();

            return true;

        } catch (error) {
            console.error('Checkout processing error:', error);
            this.showNotification('❌ Checkout processing failed. Please try again.', 'error');
            return false;
        }
    }

    // Validate checkout form
    validateCheckoutForm() {
        const customerName = document.getElementById('checkoutCustomerName').value.trim();
        const customerEmail = document.getElementById('checkoutCustomerEmail').value.trim();
        const customerPhone = document.getElementById('checkoutCustomerPhone').value.trim();
        const businessName = document.getElementById('checkoutBusinessName').value.trim();
        const shippingAddress = document.getElementById('checkoutShippingAddress').value.trim();
        const deliveryMethod = document.querySelector('input[name="deliveryMethod"]:checked')?.value || 'standard';
        const orderNotes = document.getElementById('checkoutOrderNotes').value.trim();

        // Required field validation
        if (!customerName) {
            return { valid: false, message: 'Customer name is required' };
        }

        if (!customerEmail || !customerEmail.includes('@')) {
            return { valid: false, message: 'Valid email address is required' };
        }

        if (!customerPhone) {
            return { valid: false, message: 'Phone number is required' };
        }

        if (!businessName) {
            return { valid: false, message: 'Business name is required' };
        }

        if (!shippingAddress) {
            return { valid: false, message: 'Shipping address is required' };
        }

        return {
            valid: true,
            data: {
                customerName,
                customerEmail,
                customerPhone,
                businessName,
                shippingAddress,
                deliveryMethod,
                orderNotes
            }
        };
    }

    // Open payment modal with order summary
    openPaymentModal() {
        const totals = this.getTotals();

        // Populate order summary
        this.populateOrderSummary(totals);

        // Set payment method to card by default
        this.selectPaymentMethod('card');

        // Open payment modal
        openModal('paymentModal');

        console.log('💳 Payment modal opened with order total:', totals.total);
    }

    // Populate order summary in payment modal
    populateOrderSummary(totals) {
        const orderSummaryItems = document.getElementById('orderSummaryItems');
        const orderTotalAmount = document.getElementById('orderTotalAmount');

        if (!orderSummaryItems || !orderTotalAmount) {
            console.error('Order summary elements not found');
            return;
        }

        // Generate order items HTML
        const itemsHTML = this.cart.map(item => {
            const itemTotal = item.price * item.quantity;
            return `
                <div class="order-summary-item">
                    <div class="order-item-details">
                        <img src="${item.image || 'https://via.placeholder.com/40x40/1a1a1a/00C851?text=' + encodeURIComponent(item.grade)}"
                             alt="${item.strain}" class="order-item-image" />
                        <div class="order-item-info">
                            <h5>${item.strain}</h5>
                            <p>${item.grade} • $${item.price.toFixed(2)}${this.getUnitLabel(item.grade)}</p>
                        </div>
                    </div>
                    <div class="order-item-price">
                        <div class="order-item-quantity">Qty: ${item.quantity}</div>
                        <div class="order-item-total">$${itemTotal.toFixed(2)}</div>
                    </div>
                </div>
            `;
        }).join('');

        orderSummaryItems.innerHTML = itemsHTML;
        orderTotalAmount.textContent = `$${totals.total.toFixed(2)}`;

        console.log('✅ Order summary populated with', this.cart.length, 'items');
    }

    // Select payment method
    selectPaymentMethod(method) {
        // Update tab styles
        document.querySelectorAll('.payment-tab').forEach(tab => {
            tab.classList.remove('active');
            tab.style.background = 'transparent';
            tab.style.color = 'var(--text-secondary)';
        });

        const activeTab = document.querySelector(`[data-method="${method}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
            activeTab.style.background = 'var(--brand-green)';
            activeTab.style.color = 'white';
        }

        // Hide all payment forms
        document.querySelectorAll('.payment-form').forEach(form => {
            form.style.display = 'none';
            form.classList.remove('active');
        });

        // Show selected payment form
        const activeForm = document.getElementById(`${method}PaymentForm`);
        if (activeForm) {
            activeForm.style.display = 'block';
            activeForm.classList.add('active');
        }

        console.log('💳 Payment method selected:', method);
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
                    
                    const userEmail = window.currentUser?.email || 'guest@example.com';
                    const userName = window.currentUser?.name || 'Guest User';

                    const newOrder = {
                        id: `ORD-${String((window.sharedDataManager?.getOrders()?.length || 0) + 1).padStart(3, '0')}`,
                        partner: userEmail,
                        partnerName: userName + ' Store',
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
                        const userEmail = window.currentUser?.email || 'your email';
                        this.showNotification(`📧 Order confirmation sent to ${userEmail}`, 'success');
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

    // Make methods globally available for easier access
    window.openCheckoutModal = () => window.cartManager?.openCheckoutModal();
    window.processCheckout = () => window.cartManager?.processCheckout();
}
