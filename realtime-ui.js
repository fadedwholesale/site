// Real-Time UI Update System for Faded Skies Portal
// Handles automatic UI updates when data changes in real-time

class RealTimeUI {
    constructor() {
        this.updateQueue = [];
        this.isProcessing = false;
        this.observers = new Map();
        this.animationConfig = {
            duration: 300,
            easing: 'ease-in-out'
        };
        
        this.init();
    }

    init() {
        console.log('🎨 Initializing Real-Time UI System...');
        
        // Set up real-time sync listeners
        this.setupRealTimeSyncListeners();
        
        // Set up shared data manager listeners
        this.setupSharedDataListeners();
        
        // Set up mutation observers for dynamic content
        this.setupMutationObservers();
        
        console.log('✅ Real-Time UI System initialized');
    }

    // Set up listeners for real-time sync events
    setupRealTimeSyncListeners() {
        if (window.realTimeSync) {
            // Listen for all real-time events
            window.realTimeSync.on('*', (eventType, data, metadata) => {
                this.handleRealTimeEvent(eventType, data, metadata);
            });
            
            console.log('🔗 Connected to Real-Time Sync events');
        } else {
            // Wait for real-time sync to be available
            setTimeout(() => this.setupRealTimeSyncListeners(), 100);
        }
    }

    // Set up listeners for shared data manager events
    setupSharedDataListeners() {
        if (window.sharedDataManager) {
            window.addEventListener('sharedDataChange', (event) => {
                const { type, data } = event.detail;
                this.handleDataChange(type, data);
            });
            
            console.log('🔗 Connected to Shared Data Manager events');
        }
    }

    // Handle real-time events from sync system
    handleRealTimeEvent(eventType, data, metadata) {
        console.log(`🎨 Real-time UI event: ${eventType}`, { data, metadata });
        
        // Only process remote events (not our own)
        if (metadata.remote) {
            this.queueUpdate({
                type: eventType,
                data: data,
                metadata: metadata,
                timestamp: Date.now()
            });
        }
    }

    // Handle data changes from shared data manager
    handleDataChange(type, data) {
        console.log(`🎨 Data change UI update: ${type}`, data);
        
        this.queueUpdate({
            type: type,
            data: data,
            metadata: { local: true },
            timestamp: Date.now()
        });
    }

    // Queue UI updates to prevent overwhelming the browser
    queueUpdate(update) {
        this.updateQueue.push(update);
        
        if (!this.isProcessing) {
            this.processUpdateQueue();
        }
    }

    // Process the update queue
    async processUpdateQueue() {
        if (this.isProcessing || this.updateQueue.length === 0) return;
        
        this.isProcessing = true;
        
        while (this.updateQueue.length > 0) {
            const update = this.updateQueue.shift();
            await this.processUpdate(update);
            
            // Small delay to prevent UI blocking
            await this.delay(10);
        }
        
        this.isProcessing = false;
    }

    // Process individual update
    async processUpdate(update) {
        const { type, data, metadata } = update;
        
        try {
            switch (type) {
                case 'products_updated':
                    await this.updateProductsUI(data, metadata);
                    break;
                    
                case 'product_added':
                    await this.addProductUI(data, metadata);
                    break;
                    
                case 'product_updated':
                    await this.updateProductUI(data, metadata);
                    break;
                    
                case 'product_deleted':
                    await this.removeProductUI(data, metadata);
                    break;
                    
                case 'order_added':
                    await this.addOrderUI(data, metadata);
                    break;
                    
                case 'cart_updated':
                    await this.updateCartUI(data, metadata);
                    break;
                    
                case 'inventory_updated':
                    await this.updateInventoryUI(data, metadata);
                    break;
                    
                case 'user_action':
                    await this.handleUserActionUI(data, metadata);
                    break;
                    
                case 'heartbeat':
                    this.updateConnectionStatus(data, metadata);
                    break;
                    
                default:
                    console.log(`🎨 Unhandled UI update type: ${type}`);
            }
        } catch (error) {
            console.error(`❌ Error processing UI update for ${type}:`, error);
        }
    }

    // Update products UI
    async updateProductsUI(products, metadata) {
        console.log('🎨 Updating products UI');
        
        // Update all product displays
        if (window.updateAllViews) {
            window.updateAllViews();
        }
        
        // Show notification for remote changes
        if (metadata.remote && window.showNotification) {
            window.showNotification('📦 Product catalog updated', 'info');
        }
    }

    // Add new product to UI
    async addProductUI(product, metadata) {
        console.log('🎨 Adding product to UI:', product);
        
        // Update product displays
        if (window.updateAllViews) {
            window.updateAllViews();
        }
        
        // Highlight new product with animation
        setTimeout(() => {
            this.highlightNewProduct(product.id);
        }, 100);
        
        // Show notification for remote changes
        if (metadata.remote && window.showNotification) {
            window.showNotification(`✨ New product added: ${product.strain}`, 'success');
        }
    }

    // Update specific product in UI
    async updateProductUI(productData, metadata) {
        console.log('🎨 Updating product UI:', productData);
        
        // Update product displays
        if (window.updateAllViews) {
            window.updateAllViews();
        }
        
        // Highlight updated product
        if (productData.productId || productData.id) {
            const productId = productData.productId || productData.id;
            setTimeout(() => {
                this.highlightUpdatedProduct(productId);
            }, 100);
        }
        
        // Show notification for significant changes
        if (metadata.remote && productData.after && window.showNotification) {
            const product = productData.after;
            if (productData.updates && productData.updates.stock !== undefined) {
                window.showNotification(`📦 Stock updated: ${product.strain} (${productData.updates.stock} remaining)`, 'info');
            } else {
                window.showNotification(`📝 Product updated: ${product.strain}`, 'info');
            }
        }
    }

    // Remove product from UI
    async removeProductUI(product, metadata) {
        console.log('🎨 Removing product from UI:', product);
        
        // Update product displays
        if (window.updateAllViews) {
            window.updateAllViews();
        }
        
        // Show notification for remote changes
        if (metadata.remote && window.showNotification) {
            window.showNotification(`🗑️ Product removed: ${product.strain}`, 'warning');
        }
    }

    // Add new order to UI
    async addOrderUI(order, metadata) {
        console.log('🎨 Adding order to UI:', order);
        
        // Update order displays
        if (window.updateOrdersDisplay) {
            window.updateOrdersDisplay();
        }
        
        // Update dashboard stats
        if (window.updateDashboardStats) {
            window.updateDashboardStats();
        }
        
        // Show notification for new orders
        if (metadata.remote && window.showNotification) {
            if (order.customerInfo) {
                window.showNotification(`🛒 New order from ${order.customerInfo.name}: $${order.total.toFixed(2)}`, 'success');
            } else {
                window.showNotification(`🛒 New order: ${order.id}`, 'success');
            }
        }
    }

    // Update cart UI
    async updateCartUI(cartData, metadata) {
        console.log('🎨 Updating cart UI:', cartData);
        
        // Only update if it's the current user's cart
        if (window.currentUser && cartData.userEmail === window.currentUser.email) {
            if (window.cartManager) {
                // Don't trigger another broadcast by directly updating display
                window.cartManager.cart = cartData.cart || [];
                window.cartManager.updateDisplay();
            }
        }
    }

    // Update inventory UI
    async updateInventoryUI(inventoryData, metadata) {
        console.log('🎨 Updating inventory UI:', inventoryData);
        
        // Update all views to reflect inventory changes
        if (window.updateAllViews) {
            window.updateAllViews();
        }
        
        // Show stock alert if low
        if (inventoryData.newStock !== undefined && inventoryData.newStock < 5) {
            if (window.showNotification) {
                window.showNotification(`⚠️ Low stock alert: ${inventoryData.productName} (${inventoryData.newStock} remaining)`, 'warning');
            }
        }
    }

    // Handle user action notifications
    async handleUserActionUI(actionData, metadata) {
        console.log('🎨 Handling user action UI:', actionData);
        
        // Show user action notifications
        if (metadata.remote && window.showNotification) {
            let message = '';
            
            switch (actionData.action) {
                case 'order_placed':
                    message = `🛒 ${actionData.userName} placed an order: $${actionData.amount?.toFixed(2)}`;
                    break;
                case 'user_joined':
                    message = `👤 ${actionData.userName} joined the portal`;
                    break;
                case 'inventory_low':
                    message = `⚠️ Low inventory: ${actionData.productName}`;
                    break;
                default:
                    message = actionData.message || 'User action occurred';
            }
            
            window.showNotification(message, actionData.type || 'info');
        }
    }

    // Update connection status indicator
    updateConnectionStatus(heartbeatData, metadata) {
        const statusElement = document.querySelector('#syncIndicator, .sync-indicator');
        if (statusElement) {
            // Update visual indicator based on heartbeat
            statusElement.classList.add('active');
            setTimeout(() => {
                statusElement.classList.remove('active');
            }, 500);
        }
    }

    // Highlight new product with animation
    highlightNewProduct(productId) {
        const productElements = document.querySelectorAll(`[data-product-id="${productId}"], tr[data-id="${productId}"]`);
        
        productElements.forEach(element => {
            this.animateHighlight(element, '#00C851');
        });
    }

    // Highlight updated product with animation
    highlightUpdatedProduct(productId) {
        const productElements = document.querySelectorAll(`[data-product-id="${productId}"], tr[data-id="${productId}"]`);
        
        productElements.forEach(element => {
            this.animateHighlight(element, '#FFA500');
        });
    }

    // Animate highlight effect
    animateHighlight(element, color) {
        if (!element) return;
        
        const originalBackground = element.style.backgroundColor;
        const originalTransition = element.style.transition;
        
        // Apply highlight
        element.style.transition = `background-color ${this.animationConfig.duration}ms ${this.animationConfig.easing}`;
        element.style.backgroundColor = color + '20'; // 20% opacity
        
        // Remove highlight after animation
        setTimeout(() => {
            element.style.backgroundColor = originalBackground;
            
            setTimeout(() => {
                element.style.transition = originalTransition;
            }, this.animationConfig.duration);
        }, this.animationConfig.duration * 2);
    }

    // Set up mutation observers for dynamic content
    setupMutationObservers() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.processNewElement(node);
                        }
                    });
                }
            });
        });
        
        // Observe the main content areas
        const targetElements = [
            document.querySelector('#partnerProductBody'),
            document.querySelector('#publicInventoryBody'),
            document.querySelector('#orderHistoryBody'),
            document.querySelector('#cartItems')
        ].filter(Boolean);
        
        targetElements.forEach(element => {
            observer.observe(element, {
                childList: true,
                subtree: true
            });
        });
        
        this.observers.set('mutation', observer);
    }

    // Process newly added elements
    processNewElement(element) {
        // Add fade-in animation to new elements
        if (element.classList && (element.classList.contains('cart-item') || element.tagName === 'TR')) {
            element.style.opacity = '0';
            element.style.transform = 'translateY(10px)';
            element.style.transition = `opacity ${this.animationConfig.duration}ms ${this.animationConfig.easing}, transform ${this.animationConfig.duration}ms ${this.animationConfig.easing}`;
            
            // Trigger animation
            setTimeout(() => {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, 10);
        }
    }

    // Utility function for delays
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Create visual notification for data changes
    showDataChangeNotification(type, message) {
        if (window.showNotification) {
            window.showNotification(message, 'info');
        }
    }

    // Force refresh all UI components
    forceRefreshUI() {
        console.log('🎨 Force refreshing all UI components...');
        
        if (window.updateAllViews) {
            window.updateAllViews();
        }
        
        if (window.cartManager) {
            window.cartManager.updateDisplay();
        }
        
        if (window.showNotification) {
            window.showNotification('🔄 UI refreshed', 'success');
        }
    }

    // Get UI update status
    getUpdateStatus() {
        return {
            queueLength: this.updateQueue.length,
            isProcessing: this.isProcessing,
            observerCount: this.observers.size
        };
    }

    // Clean up observers and timers
    destroy() {
        this.observers.forEach((observer) => {
            observer.disconnect();
        });
        this.observers.clear();
        
        this.updateQueue = [];
        this.isProcessing = false;
        
        console.log('🎨 Real-Time UI System destroyed');
    }
}

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
    window.RealTimeUI = RealTimeUI;
    
    // Initialize after DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.realTimeUI) {
            window.realTimeUI = new RealTimeUI();
            console.log('🎨 Global Real-Time UI initialized');
        }
    });
}
