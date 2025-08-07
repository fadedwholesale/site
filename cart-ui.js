// Modern Cart UI Components
// Real-time updates, animations, and responsive design

class CartUIManager {
    constructor() {
        this.state = {
            isInitialized: false,
            animations: {
                addToCart: new Set(),
                removeFromCart: new Set(),
                quantityChange: new Set()
            }
        };
        
        this.templates = {};
        this.elements = {};
        
        this.init();
    }

    init() {
        console.log('🎨 Initializing Cart UI Manager...');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    initialize() {
        this.createCartContainer();
        this.loadTemplates();
        this.setupEventListeners();
        this.setupCartIntegration();
        this.injectStyles();
        
        this.state.isInitialized = true;
        console.log('✅ Cart UI Manager initialized');
    }

    createCartContainer() {
        // Remove existing cart if present
        const existingCart = document.getElementById('modernCart');
        if (existingCart) {
            existingCart.remove();
        }

        // Create modern cart container
        const cartHTML = `
            <div id="modernCart" class="modern-cart" role="dialog" aria-label="Shopping Cart" aria-hidden="true">
                <div class="cart-overlay"></div>
                <div class="cart-panel">
                    <div class="cart-header">
                        <h2 class="cart-title">
                            <span class="cart-icon">🛒</span>
                            Shopping Cart
                            <span class="cart-count-badge" id="cartCountBadge">0</span>
                        </h2>
                        <button class="cart-close-btn" aria-label="Close cart">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="cart-body">
                        <div class="cart-loading" id="cartLoading" style="display: none;">
                            <div class="loading-spinner"></div>
                            <p>Updating cart...</p>
                        </div>
                        
                        <div class="cart-empty" id="cartEmpty">
                            <div class="empty-icon">🛒</div>
                            <h3>Your cart is empty</h3>
                            <p>Add some premium products to get started!</p>
                            <button class="btn btn-primary continue-shopping-btn">
                                Continue Shopping
                            </button>
                        </div>
                        
                        <div class="cart-items" id="cartItems"></div>
                        
                        <div class="cart-summary" id="cartSummary" style="display: none;">
                            <div class="summary-line">
                                <span>Subtotal:</span>
                                <span id="cartSubtotal">$0.00</span>
                            </div>
                            <div class="summary-line">
                                <span>Shipping:</span>
                                <span id="cartShipping">$0.00</span>
                            </div>
                            <div class="summary-line">
                                <span>Tax:</span>
                                <span id="cartTax">$0.00</span>
                            </div>
                            <div class="summary-line total-line">
                                <span>Total:</span>
                                <span id="cartTotal">$0.00</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="cart-footer" id="cartFooter" style="display: none;">
                        <button class="btn btn-secondary clear-cart-btn">
                            Clear Cart
                        </button>
                        <button class="btn btn-primary checkout-btn">
                            <span class="btn-text">Checkout</span>
                            <span class="btn-spinner" style="display: none;">
                                <div class="loading-spinner small"></div>
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', cartHTML);
        this.elements.cart = document.getElementById('modernCart');
    }

    loadTemplates() {
        // Simple template - will be populated with string replacement
        this.templates.cartItem = 'CART_ITEM_TEMPLATE';
    }

    setupEventListeners() {
        if (!this.elements.cart) return;

        // Close cart events
        this.elements.cart.querySelector('.cart-close-btn')?.addEventListener('click', () => {
            window.modernCart?.closeCart();
        });

        this.elements.cart.querySelector('.cart-overlay')?.addEventListener('click', () => {
            window.modernCart?.closeCart();
        });

        this.elements.cart.querySelector('.continue-shopping-btn')?.addEventListener('click', () => {
            window.modernCart?.closeCart();
        });

        // Clear cart
        this.elements.cart.querySelector('.clear-cart-btn')?.addEventListener('click', () => {
            this.showConfirmDialog('Clear Cart', 'Are you sure you want to remove all items from your cart?')
                .then(confirmed => {
                    if (confirmed) {
                        window.modernCart?.clearCart();
                    }
                });
        });

        // Checkout
        this.elements.cart.querySelector('.checkout-btn')?.addEventListener('click', () => {
            this.handleCheckout();
        });

        // Delegate events for cart items
        this.elements.cart.addEventListener('click', (e) => {
            const target = e.target.closest('[data-item-id]');
            if (!target) return;

            const itemId = target.dataset.itemId;
            
            if (e.target.closest('.qty-decrease')) {
                this.handleQuantityChange(itemId, -1);
            } else if (e.target.closest('.qty-increase')) {
                this.handleQuantityChange(itemId, 1);
            } else if (e.target.closest('.remove-btn')) {
                this.handleRemoveItem(itemId);
            }
        });

        // Handle quantity input changes
        this.elements.cart.addEventListener('input', (e) => {
            if (e.target.classList.contains('qty-input')) {
                const itemId = e.target.dataset.itemId;
                const newQuantity = parseInt(e.target.value) || 1;
                this.handleQuantitySet(itemId, newQuantity);
            }
        });

        // Keyboard navigation
        this.elements.cart.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                window.modernCart?.closeCart();
            }
        });
    }

    setupCartIntegration() {
        if (!window.modernCart) {
            console.warn('Modern cart not found, retrying...');
            setTimeout(() => this.setupCartIntegration(), 500);
            return;
        }

        console.log('✅ Cart integration established');

        // Listen to cart events
        window.modernCart.on('state_changed', () => {
            this.render();
        });

        window.modernCart.on('cart_opened', () => {
            this.showCart();
        });

        window.modernCart.on('cart_closed', () => {
            this.hideCart();
        });

        window.modernCart.on('item_added', (event, data) => {
            this.animateItemAdd(data.productId);
        });

        window.modernCart.on('item_removed', (event, data) => {
            this.animateItemRemove(data.itemId);
        });

        // Initial render
        this.render();
    }

    // Rendering Methods
    render() {
        if (!window.modernCart) return;

        const state = window.modernCart.getState();
        
        this.renderCartCount(state.totals.itemCount);
        this.renderCartItems(state.items);
        this.renderCartSummary(state.totals);
        this.renderCartState(state);
    }

    renderCartCount(count) {
        // Update cart toggle button
        const cartToggle = document.getElementById('cartToggle');
        if (cartToggle) {
            const countElement = cartToggle.querySelector('.cart-count, #cartCount, #cartCount2');
            if (countElement) {
                countElement.textContent = count;
                countElement.style.display = count > 0 ? 'inline' : 'none';
            }
        }

        // Update cart badge
        const badge = document.getElementById('cartCountBadge');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline' : 'none';
        }
    }

    renderCartItems(items) {
        const container = document.getElementById('cartItems');
        if (!container) return;

        if (items.length === 0) {
            container.innerHTML = '';
            return;
        }

        const itemsHTML = items.map(item => this.renderCartItem(item)).join('');
        container.innerHTML = itemsHTML;
    }

    renderCartItem(item) {
        const maxQuantity = 10; // Could be from product data
        const unitLabel = this.getUnitLabel(item.grade);
        const subtotal = (item.price * item.quantity).toFixed(2);
        const isMinQuantity = item.quantity <= 1;
        const isMaxQuantity = item.quantity >= maxQuantity;
        const metaHTML = item.metadata?.thca ? `<p class="item-meta">${item.metadata.thca}% THCa</p>` : '';

        return `
            <div class="cart-item" data-item-id="${item.id}" role="listitem">
                <div class="item-image">
                    <img src="${item.image}" alt="${this.escapeHtml(item.name)}" loading="lazy"
                         onerror="this.src='${this.getDefaultImage(item.grade)}'">
                </div>

                <div class="item-details">
                    <h4 class="item-name">${this.escapeHtml(item.name)}</h4>
                    <p class="item-grade">${this.escapeHtml(item.grade)}</p>
                    <p class="item-price">$${item.price.toFixed(2)} ${unitLabel}</p>
                    ${metaHTML}
                </div>

                <div class="item-controls">
                    <div class="quantity-controls">
                        <button class="qty-btn qty-decrease" aria-label="Decrease quantity"
                                data-item-id="${item.id}" ${isMinQuantity ? 'disabled' : ''}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>

                        <input type="number" class="qty-input" value="${item.quantity}"
                               min="1" max="${maxQuantity}" data-item-id="${item.id}"
                               aria-label="Quantity for ${this.escapeHtml(item.name)}">

                        <button class="qty-btn qty-increase" aria-label="Increase quantity"
                                data-item-id="${item.id}" ${isMaxQuantity ? 'disabled' : ''}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>
                    </div>

                    <p class="item-subtotal">$${subtotal}</p>

                    <button class="remove-btn" aria-label="Remove ${this.escapeHtml(item.name)} from cart"
                            data-item-id="${item.id}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3,6 5,6 21,6"></polyline>
                            <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    renderCartSummary(totals) {
        const elements = {
            subtotal: document.getElementById('cartSubtotal'),
            shipping: document.getElementById('cartShipping'),
            tax: document.getElementById('cartTax'),
            total: document.getElementById('cartTotal'),
            summary: document.getElementById('cartSummary')
        };

        if (elements.subtotal) elements.subtotal.textContent = `$${totals.subtotal.toFixed(2)}`;
        
        if (elements.shipping) {
            elements.shipping.textContent = totals.shipping === 0 ? 'FREE' : `$${totals.shipping.toFixed(2)}`;
            elements.shipping.classList.toggle('free-shipping', totals.shipping === 0);
        }
        
        if (elements.tax) elements.tax.textContent = `$${totals.tax.toFixed(2)}`;
        if (elements.total) elements.total.textContent = `$${totals.total.toFixed(2)}`;
        
        if (elements.summary) {
            elements.summary.style.display = totals.itemCount > 0 ? 'block' : 'none';
        }
    }

    renderCartState(state) {
        const isEmpty = state.items.length === 0;
        const isLoading = state.isLoading;

        // Toggle visibility of sections
        this.toggleElement('cartEmpty', isEmpty && !isLoading);
        this.toggleElement('cartItems', !isEmpty && !isLoading);
        this.toggleElement('cartFooter', !isEmpty && !isLoading);
        this.toggleElement('cartLoading', isLoading);

        // Update cart panel classes
        if (this.elements.cart) {
            this.elements.cart.classList.toggle('cart-empty-state', isEmpty);
            this.elements.cart.classList.toggle('cart-loading-state', isLoading);
        }
    }

    // Event Handlers
    handleQuantityChange(itemId, delta) {
        const item = window.modernCart?.getItems().find(item => item.id === itemId);
        if (!item) return;

        const newQuantity = Math.max(1, item.quantity + delta);
        window.modernCart?.updateItemQuantity(itemId, newQuantity);
    }

    handleQuantitySet(itemId, quantity) {
        const validQuantity = Math.max(1, Math.min(10, quantity));
        window.modernCart?.updateItemQuantity(itemId, validQuantity);
    }

    handleRemoveItem(itemId) {
        const item = window.modernCart?.getItems().find(item => item.id === itemId);
        if (!item) return;

        this.showConfirmDialog(
            'Remove Item', 
            `Remove ${item.name} from your cart?`
        ).then(confirmed => {
            if (confirmed) {
                window.modernCart?.removeItem(itemId);
            }
        });
    }

    async handleCheckout() {
        const checkoutBtn = this.elements.cart?.querySelector('.checkout-btn');
        if (!checkoutBtn) return;

        // Show loading state
        this.setCheckoutLoading(true);

        try {
            const result = await window.modernCart?.checkout();
            
            if (result) {
                this.showSuccessMessage(`Order ${result.id} placed successfully!`);
            } else {
                this.showErrorMessage('Checkout failed. Please try again.');
            }
        } catch (error) {
            console.error('Checkout error:', error);
            this.showErrorMessage('Checkout failed. Please try again.');
        } finally {
            this.setCheckoutLoading(false);
        }
    }

    // Animation Methods
    animateItemAdd(productId) {
        if (this.state.animations.addToCart.has(productId)) return;
        
        this.state.animations.addToCart.add(productId);
        
        // Find the product button and animate
        const productBtn = document.querySelector(`[onclick*="${productId}"]`);
        if (productBtn) {
            productBtn.classList.add('btn-success-flash');
            setTimeout(() => {
                productBtn.classList.remove('btn-success-flash');
                this.state.animations.addToCart.delete(productId);
            }, 1000);
        }

        // Animate cart icon
        this.animateCartIcon();
    }

    animateItemRemove(itemId) {
        const itemElement = this.elements.cart?.querySelector(`[data-item-id="${itemId}"]`);
        if (itemElement) {
            itemElement.classList.add('item-removing');
            setTimeout(() => {
                this.render(); // Re-render after animation
            }, 300);
        }
    }

    animateCartIcon() {
        const cartToggle = document.getElementById('cartToggle');
        if (cartToggle) {
            cartToggle.classList.add('cart-bounce');
            setTimeout(() => {
                cartToggle.classList.remove('cart-bounce');
            }, 600);
        }
    }

    // UI Utilities
    showCart() {
        if (this.elements.cart) {
            this.elements.cart.classList.add('cart-open');
            this.elements.cart.setAttribute('aria-hidden', 'false');
            document.body.classList.add('cart-modal-open');
            
            // Focus management
            const closeBtn = this.elements.cart.querySelector('.cart-close-btn');
            if (closeBtn) closeBtn.focus();
        }
    }

    hideCart() {
        if (this.elements.cart) {
            this.elements.cart.classList.remove('cart-open');
            this.elements.cart.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('cart-modal-open');
        }
    }

    setCheckoutLoading(isLoading) {
        const checkoutBtn = this.elements.cart?.querySelector('.checkout-btn');
        if (!checkoutBtn) return;

        const btnText = checkoutBtn.querySelector('.btn-text');
        const btnSpinner = checkoutBtn.querySelector('.btn-spinner');

        if (btnText) btnText.style.display = isLoading ? 'none' : 'inline';
        if (btnSpinner) btnSpinner.style.display = isLoading ? 'inline' : 'none';
        
        checkoutBtn.disabled = isLoading;
    }

    toggleElement(id, show) {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = show ? 'block' : 'none';
        }
    }

    showConfirmDialog(title, message) {
        return new Promise((resolve) => {
            const confirmed = confirm(`${title}\n\n${message}`);
            resolve(confirmed);
        });
    }

    showSuccessMessage(message) {
        if (window.showNotification) {
            window.showNotification(message, 'success');
        } else {
            alert(message);
        }
    }

    showErrorMessage(message) {
        if (window.showNotification) {
            window.showNotification(message, 'error');
        } else {
            alert(message);
        }
    }

    // Utility Methods
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

    getDefaultImage(grade) {
        return `https://via.placeholder.com/80x80/1a1a1a/00C851?text=${encodeURIComponent(grade || 'Product')}`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    injectStyles() {
        if (document.getElementById('modernCartStyles')) return;

        const styles = `
            <style id="modernCartStyles">
                .modern-cart {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 10000;
                    visibility: hidden;
                    opacity: 0;
                    transition: all 0.3s ease;
                }

                .modern-cart.cart-open {
                    visibility: visible;
                    opacity: 1;
                }

                .cart-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(4px);
                }

                .cart-panel {
                    position: absolute;
                    top: 0;
                    right: 0;
                    width: min(480px, 90vw);
                    height: 100%;
                    background: var(--surface-primary, #ffffff);
                    box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
                    display: flex;
                    flex-direction: column;
                    transform: translateX(100%);
                    transition: transform 0.3s ease;
                }

                .modern-cart.cart-open .cart-panel {
                    transform: translateX(0);
                }

                .cart-header {
                    padding: 1.5rem;
                    border-bottom: 1px solid var(--border-subtle, #e5e7eb);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-shrink: 0;
                }

                .cart-title {
                    margin: 0;
                    font-size: 1.5rem;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: var(--text-primary, #111827);
                }

                .cart-count-badge {
                    background: var(--brand-green, #00C851);
                    color: white;
                    border-radius: 12px;
                    padding: 0.25rem 0.5rem;
                    font-size: 0.75rem;
                    font-weight: 600;
                    min-width: 24px;
                    text-align: center;
                }

                .cart-close-btn {
                    background: none;
                    border: none;
                    padding: 0.5rem;
                    border-radius: 6px;
                    color: var(--text-secondary, #6b7280);
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .cart-close-btn:hover {
                    background: var(--surface-secondary, #f9fafb);
                    color: var(--text-primary, #111827);
                }

                .cart-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 1rem 1.5rem;
                }

                .cart-empty {
                    text-align: center;
                    padding: 2rem 1rem;
                    color: var(--text-secondary, #6b7280);
                }

                .empty-icon {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                    opacity: 0.5;
                }

                .cart-empty h3 {
                    margin: 0 0 0.5rem 0;
                    color: var(--text-primary, #111827);
                }

                .cart-empty p {
                    margin: 0 0 1.5rem 0;
                }

                .cart-loading {
                    text-align: center;
                    padding: 2rem 1rem;
                    color: var(--text-secondary, #6b7280);
                }

                .loading-spinner {
                    width: 24px;
                    height: 24px;
                    border: 2px solid var(--border-subtle, #e5e7eb);
                    border-top: 2px solid var(--brand-green, #00C851);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 1rem auto;
                }

                .loading-spinner.small {
                    width: 16px;
                    height: 16px;
                    border-width: 1.5px;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .cart-item {
                    display: flex;
                    gap: 1rem;
                    padding: 1rem 0;
                    border-bottom: 1px solid var(--border-subtle, #e5e7eb);
                    transition: all 0.3s ease;
                }

                .cart-item.item-removing {
                    transform: translateX(100%);
                    opacity: 0;
                }

                .item-image img {
                    width: 64px;
                    height: 64px;
                    border-radius: 8px;
                    object-fit: cover;
                    background: var(--surface-secondary, #f9fafb);
                }

                .item-details {
                    flex: 1;
                    min-width: 0;
                }

                .item-name {
                    margin: 0 0 0.25rem 0;
                    font-size: 1rem;
                    font-weight: 600;
                    color: var(--text-primary, #111827);
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .item-grade, .item-price, .item-meta {
                    margin: 0 0 0.25rem 0;
                    font-size: 0.875rem;
                    color: var(--text-secondary, #6b7280);
                }

                .item-price {
                    color: var(--brand-green, #00C851);
                    font-weight: 600;
                }

                .item-controls {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    gap: 0.5rem;
                }

                .quantity-controls {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: var(--surface-secondary, #f9fafb);
                    border-radius: 6px;
                    padding: 0.25rem;
                }

                .qty-btn {
                    background: none;
                    border: none;
                    width: 28px;
                    height: 28px;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: var(--text-secondary, #6b7280);
                    transition: all 0.2s ease;
                }

                .qty-btn:hover:not(:disabled) {
                    background: var(--surface-primary, #ffffff);
                    color: var(--text-primary, #111827);
                }

                .qty-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .qty-input {
                    width: 40px;
                    text-align: center;
                    border: none;
                    background: none;
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--text-primary, #111827);
                }

                .qty-input:focus {
                    outline: none;
                }

                .item-subtotal {
                    margin: 0;
                    font-size: 1rem;
                    font-weight: 600;
                    color: var(--brand-green, #00C851);
                }

                .remove-btn {
                    background: none;
                    border: none;
                    padding: 0.5rem;
                    border-radius: 4px;
                    color: var(--text-muted, #9ca3af);
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .remove-btn:hover {
                    background: var(--accent-red-light, #fef2f2);
                    color: var(--accent-red, #ef4444);
                }

                .cart-summary {
                    margin-top: 1rem;
                    padding: 1rem;
                    background: var(--surface-secondary, #f9fafb);
                    border-radius: 8px;
                }

                .summary-line {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 0.5rem;
                    font-size: 0.875rem;
                    color: var(--text-secondary, #6b7280);
                }

                .summary-line.total-line {
                    font-size: 1rem;
                    font-weight: 600;
                    color: var(--text-primary, #111827);
                    border-top: 1px solid var(--border-subtle, #e5e7eb);
                    padding-top: 0.5rem;
                    margin-top: 0.5rem;
                    margin-bottom: 0;
                }

                .summary-line .free-shipping {
                    color: var(--brand-green, #00C851);
                    font-weight: 600;
                }

                .cart-footer {
                    padding: 1.5rem;
                    border-top: 1px solid var(--border-subtle, #e5e7eb);
                    display: flex;
                    gap: 1rem;
                    flex-shrink: 0;
                }

                .cart-footer .btn {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1.5rem;
                    border-radius: 6px;
                    font-weight: 600;
                    transition: all 0.2s ease;
                    cursor: pointer;
                    border: none;
                    text-decoration: none;
                }

                .btn-primary {
                    background: var(--brand-green, #00C851);
                    color: white;
                }

                .btn-primary:hover:not(:disabled) {
                    background: var(--brand-green-dark, #00A041);
                }

                .btn-secondary {
                    background: var(--surface-secondary, #f9fafb);
                    color: var(--text-secondary, #6b7280);
                    border: 1px solid var(--border-subtle, #e5e7eb);
                }

                .btn-secondary:hover:not(:disabled) {
                    background: var(--surface-primary, #ffffff);
                    color: var(--text-primary, #111827);
                }

                .btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .continue-shopping-btn {
                    background: var(--brand-green, #00C851);
                    color: white;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 6px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .continue-shopping-btn:hover {
                    background: var(--brand-green-dark, #00A041);
                }

                /* Cart toggle animations */
                #cartToggle.cart-bounce {
                    animation: cartBounce 0.6s ease-in-out;
                }

                @keyframes cartBounce {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }

                /* Add to cart button animation */
                .btn-success-flash {
                    background: var(--brand-green, #00C851) !important;
                    color: white !important;
                    transform: scale(1.05);
                    transition: all 0.3s ease;
                }

                /* Responsive design */
                @media (max-width: 768px) {
                    .cart-panel {
                        width: 100vw;
                    }
                    
                    .cart-item {
                        flex-direction: column;
                        gap: 0.75rem;
                    }
                    
                    .item-controls {
                        flex-direction: row;
                        justify-content: space-between;
                        align-items: center;
                    }
                }

                /* Modal body scroll lock */
                body.cart-modal-open {
                    overflow: hidden;
                }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
    }

    // Public API
    isOpen() {
        return this.elements.cart?.classList.contains('cart-open') || false;
    }

    refresh() {
        this.render();
    }

    // Cleanup
    destroy() {
        if (this.elements.cart) {
            this.elements.cart.remove();
        }
        
        const styles = document.getElementById('modernCartStyles');
        if (styles) {
            styles.remove();
        }
    }
}

// Initialize cart UI when DOM is ready
window.cartUI = new CartUIManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CartUIManager;
}

console.log('🎨 Modern Cart UI loaded and ready');
