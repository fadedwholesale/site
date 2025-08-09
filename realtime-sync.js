// Real-Time Synchronization System for Faded Skies Portal
// Provides real-time data sync across tabs, sessions, and different user types

class RealTimeSync {
    constructor() {
        this.syncChannel = 'fadedSkiesRealTimeSync';
        this.dataVersion = 0;
        this.syncInterval = null;
        this.listeners = new Map();
        this.isOnline = navigator.onLine;
        this.lastHeartbeat = Date.now();
        this.clientId = this.generateClientId();
        this.isSharedDataManagerReady = false;

        this.init();
    }

    generateClientId() {
        return 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Wait for SharedDataManager to be ready
    async waitForSharedDataManager(maxAttempts = 15) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                // Check basic existence
                if (!window.sharedDataManager) {
                    console.log(`⏳ Waiting for SharedDataManager to exist... (${attempt + 1}/${maxAttempts})`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }

                // Check if getData method exists
                if (typeof window.sharedDataManager.getData !== 'function') {
                    console.log(`⏳ Waiting for SharedDataManager.getData method... (${attempt + 1}/${maxAttempts})`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }

                // Check if getStatus exists
                if (!window.sharedDataManager.getStatus || typeof window.sharedDataManager.getStatus !== 'function') {
                    console.log(`⏳ Waiting for SharedDataManager.getStatus method... (${attempt + 1}/${maxAttempts})`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }

                // Check Firebase readiness
                const status = window.sharedDataManager.getStatus();
                if (!status.firebaseReady) {
                    console.log(`⏳ Waiting for Firebase to be ready... (${attempt + 1}/${maxAttempts})`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }

                // Test getData method
                await window.sharedDataManager.getData();

                this.isSharedDataManagerReady = true;
                console.log('✅ SharedDataManager is ready for sync operations');
                return true;

            } catch (error) {
                console.log(`⏳ SharedDataManager test failed, retrying... (${attempt + 1}/${maxAttempts}):`, error.message);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        console.warn('⚠️ SharedDataManager readiness timeout after', maxAttempts, 'attempts');
        return false;
    }

    init() {
        console.log('🔄 Initializing Real-Time Sync System...', this.clientId);

        // Set up storage listener for cross-tab communication
        window.addEventListener('storage', this.handleStorageChange.bind(this));

        // Set up online/offline detection
        window.addEventListener('online', this.handleOnline.bind(this));
        window.addEventListener('offline', this.handleOffline.bind(this));

        // Set up periodic sync (with delay to allow SharedDataManager to initialize)
        this.waitForSharedDataManager().then(() => {
            this.startPeriodicSync();
            // Also start a readiness monitor
            this.startReadinessMonitor();
        }).catch(error => {
            console.warn('⚠️ SharedDataManager not ready, starting sync anyway:', error);
            this.startPeriodicSync();
            this.startReadinessMonitor();
        });

        // Set up heartbeat system
        this.startHeartbeat();

        // Set up beforeunload handler
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));

        console.log('✅ Real-Time Sync System initialized');
    }

    // Cross-tab communication via storage events
    handleStorageChange(event) {
        if (event.key === this.syncChannel) {
            try {
                const syncData = JSON.parse(event.newValue);
                console.log('📡 Received sync data from another tab:', syncData);
                
                if (syncData.clientId !== this.clientId) {
                    this.handleRemoteDataChange(syncData);
                }
            } catch (error) {
                console.error('Error parsing sync data:', error);
            }
        }
    }

    // Handle data changes from other tabs/sessions
    handleRemoteDataChange(syncData) {
        const { type, data, timestamp, version } = syncData;
        
        // Only apply changes that are newer than our current version
        if (version > this.dataVersion) {
            console.log(`🔄 Applying remote change: ${type}`, data);
            
            this.dataVersion = version;
            
            // Notify all listeners about the change
            this.notifyListeners(type, data, { remote: true, timestamp });
            
            // Update UI if necessary
            this.updateUI(type, data);
        }
    }

    // Broadcast data changes to other tabs
    broadcast(type, data, options = {}) {
        const syncData = {
            type,
            data,
            timestamp: new Date().toISOString(),
            version: ++this.dataVersion,
            clientId: this.clientId,
            userEmail: window.currentUser?.email,
            userRole: window.currentUser?.role,
            isAdmin: window.currentUser?.role === 'admin' || window.currentUser?.email?.includes('admin'),
            ...options
        };
        
        try {
            localStorage.setItem(this.syncChannel, JSON.stringify(syncData));
            console.log(`📡 Broadcasting ${type}:`, data);
            
            // Also notify local listeners
            this.notifyListeners(type, data, { local: true, timestamp: syncData.timestamp });
            
        } catch (error) {
            console.error('Error broadcasting data:', error);
        }
    }

    // Register event listeners
    on(eventType, callback) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, new Set());
        }
        this.listeners.get(eventType).add(callback);
        
        console.log(`📝 Registered listener for: ${eventType}`);
    }

    // Remove event listeners
    off(eventType, callback) {
        if (this.listeners.has(eventType)) {
            this.listeners.get(eventType).delete(callback);
        }
    }

    // Notify all listeners of a specific event type
    notifyListeners(eventType, data, metadata = {}) {
        if (this.listeners.has(eventType)) {
            this.listeners.get(eventType).forEach(callback => {
                try {
                    callback(data, metadata);
                } catch (error) {
                    console.error(`Error in listener for ${eventType}:`, error);
                }
            });
        }

        // Also notify wildcard listeners
        if (this.listeners.has('*')) {
            this.listeners.get('*').forEach(callback => {
                try {
                    callback(eventType, data, metadata);
                } catch (error) {
                    console.error('Error in wildcard listener:', error);
                }
            });
        }
    }

    // Monitor SharedDataManager readiness
    startReadinessMonitor() {
        setInterval(() => {
            if (this.isSharedDataManagerReady) {
                // Double-check that it's still ready
                if (!window.sharedDataManager ||
                    typeof window.sharedDataManager.getData !== 'function') {
                    console.warn('⚠️ SharedDataManager became unavailable, marking as not ready');
                    this.isSharedDataManagerReady = false;
                }
            } else {
                // Try to re-establish readiness
                if (window.sharedDataManager &&
                    typeof window.sharedDataManager.getData === 'function' &&
                    window.sharedDataManager.getStatus &&
                    window.sharedDataManager.getStatus().firebaseReady) {
                    console.log('✅ SharedDataManager is ready again');
                    this.isSharedDataManagerReady = true;
                }
            }
        }, 10000); // Check every 10 seconds
    }

    // Periodic sync to catch missed updates
    startPeriodicSync() {
        this.syncInterval = setInterval(async () => {
            try {
                await this.performPeriodicSync();
            } catch (error) {
                console.warn('⚠️ Error in periodic sync:', error);
            }
        }, 5000); // Sync every 5 seconds
    }

    async performPeriodicSync() {
        console.log('🔄 Performing periodic sync...');

        try {
            // More comprehensive readiness check
            if (!window.sharedDataManager) {
                console.log('⏳ SharedDataManager not available, skipping sync check');
                this.lastHeartbeat = Date.now();
                return;
            }

            if (typeof window.sharedDataManager.getData !== 'function') {
                console.log('⏳ SharedDataManager.getData not available, skipping sync check');
                this.isSharedDataManagerReady = false; // Reset flag
                this.lastHeartbeat = Date.now();
                return;
            }

            if (window.sharedDataManager.getStatus && !window.sharedDataManager.getStatus().firebaseReady) {
                console.log('⏳ Firebase not ready, skipping sync check');
                this.lastHeartbeat = Date.now();
                return;
            }

            // If we get here, everything should be ready
            const currentData = await window.sharedDataManager.getData();

            if (currentData && currentData.lastSync) {
                const lastSync = new Date(currentData.lastSync || 0);
                const now = new Date();

                // If data is older than 30 seconds, broadcast a sync request
                if (now - lastSync > 30000) {
                    console.log('🔄 Data seems stale, requesting sync...');
                    this.broadcast('sync_request', { timestamp: now.toISOString() });
                }
            }
        } catch (error) {
            console.warn('⚠️ Error during periodic sync data check:', error);
            // Reset readiness flag on error
            this.isSharedDataManagerReady = false;
        }

        // Update heartbeat
        this.lastHeartbeat = Date.now();
    }

    // Heartbeat system to detect active clients
    startHeartbeat() {
        setInterval(() => {
            this.broadcast('heartbeat', { 
                clientId: this.clientId,
                userEmail: window.currentUser?.email,
                timestamp: new Date().toISOString()
            });
        }, 10000); // Heartbeat every 10 seconds
    }

    // Handle online status changes
    async handleOnline() {
        console.log('🌐 Connection restored');
        this.isOnline = true;
        this.broadcast('client_online', { clientId: this.clientId });

        // Force sync when coming back online
        try {
            await this.performPeriodicSync();
        } catch (error) {
            console.warn('⚠️ Error in online sync:', error);
        }

        if (window.showNotification) {
            window.showNotification('🌐 Connection restored - syncing data', 'success');
        }
    }

    handleOffline() {
        console.log('📡 Connection lost');
        this.isOnline = false;
        
        if (window.showNotification) {
            window.showNotification('📡 Connection lost - working offline', 'warning');
        }
    }

    // Handle page unload
    handleBeforeUnload() {
        this.broadcast('client_disconnect', { clientId: this.clientId });
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
    }

    // Update UI based on data changes
    updateUI(type, data) {
        console.log(`🎨 Updating UI for: ${type}`);
        
        switch (type) {
            case 'products_updated':
            case 'product_added':
            case 'product_updated':
            case 'product_deleted':
                if (window.updateAllViews) {
                    window.updateAllViews();
                }
                break;
                
            case 'order_added':
            case 'order_updated':
                if (window.updateOrdersDisplay) {
                    window.updateOrdersDisplay();
                }
                break;
                
            case 'cart_updated':
                if (window.cartManager && data.userEmail === window.currentUser?.email) {
                    window.cartManager.updateDisplay();
                }
                break;
                
            case 'inventory_updated':
                this.showInventoryNotification(data);
                break;
                
            case 'user_action':
                this.showUserActionNotification(data);
                break;

            case 'product_image_updated':
                this.handleProductImageUpdate(data);
                break;

            case 'admin_product_change':
                this.handleAdminProductChange(data);
                break;
        }
    }

    // Show inventory change notifications
    showInventoryNotification(data) {
        if (window.showNotification && data.productName) {
            const message = `📦 ${data.productName} inventory updated: ${data.newStock} remaining`;
            window.showNotification(message, 'info');
        }
    }

    // Show user action notifications with user context
    showUserActionNotification(data) {
        if (window.showNotification && data.action) {
            const currentUser = window.currentUser;
            const isAdmin = currentUser?.role === 'admin' || currentUser?.email?.includes('admin');
            const isPartner = currentUser && !isAdmin;

            let message = '';
            let shouldShow = false;

            switch (data.action) {
                case 'order_placed':
                    if (isAdmin) {
                        // Admin sees all orders
                        message = `🛒 New order placed: ${data.orderId}`;
                        shouldShow = true;
                    } else if (isPartner && data.userEmail === currentUser.email) {
                        // Partner only sees their own orders
                        message = `✅ Your order ${data.orderId} was confirmed`;
                        shouldShow = true;
                    }
                    break;
                case 'user_joined':
                    // Only show to admin
                    if (isAdmin) {
                        message = `👤 ${data.userName} joined the portal`;
                        shouldShow = true;
                    }
                    break;
                case 'inventory_low':
                    // Show to admin, limited to partners
                    if (isAdmin) {
                        message = `⚠️ Low inventory alert: ${data.productName}`;
                        shouldShow = true;
                    }
                    break;
                default:
                    // Generic messages only to admin
                    if (isAdmin) {
                        message = `📢 ${data.message}`;
                        shouldShow = true;
                    }
            }

            if (shouldShow) {
                window.showNotification(message, data.type || 'info');
            }
        }
    }

    // Force sync all data
    async forceSyncAll() {
        console.log('🔄 Force syncing all data...');

        try {
            if (!window.sharedDataManager) {
                console.warn('⚠️ SharedDataManager not available for force sync');
                return;
            }

            if (typeof window.sharedDataManager.exportData !== 'function') {
                console.warn('⚠️ SharedDataManager.exportData not available for force sync');
                return;
            }

            const allData = await window.sharedDataManager.exportData();
            this.broadcast('full_sync', allData, { force: true });
            console.log('✅ Force sync completed');
        } catch (error) {
            console.error('❌ Error during force sync:', error);
            // Reset readiness flag on error
            this.isSharedDataManagerReady = false;
        }
    }

    // Handle product image updates
    handleProductImageUpdate(data) {
        console.log('🖼️ Product image updated:', data);

        // Update product images in the UI
        const productImages = document.querySelectorAll(`.product-image[alt*="${data.productName}"]`);
        productImages.forEach(img => {
            if (data.newImage) {
                img.src = data.newImage;
                // Add a subtle animation to indicate the image was updated
                img.style.transition = 'opacity 0.3s ease';
                img.style.opacity = '0.7';
                setTimeout(() => {
                    img.style.opacity = '1';
                }, 300);
            }
        });

        // Show notification for image updates
        if (window.showNotification) {
            window.showNotification(`📸 ${data.productName} image updated in real-time`, 'info');
        }
    }

    // Handle admin product changes
    handleAdminProductChange(data) {
        console.log('🔧 Admin product change:', data);

        // Trigger UI updates for admin changes
        if (window.updateAllViews) {
            window.updateAllViews();
        }

        // Show notification for admin changes
        if (window.showNotification) {
            const actionText = data.action === 'product_added' ? 'added' : 'updated';
            window.showNotification(`🔧 Admin ${actionText} ${data.productName}`, 'success');
        }

        // If viewing the partner portal, animate the updated product
        if (data.productId && window.highlightUpdatedProduct) {
            window.highlightUpdatedProduct(data.productId);
        }
    }

    // Get sync status
    getSyncStatus() {
        return {
            isOnline: this.isOnline,
            clientId: this.clientId,
            dataVersion: this.dataVersion,
            lastHeartbeat: this.lastHeartbeat,
            listenerCount: Array.from(this.listeners.values()).reduce((sum, set) => sum + set.size, 0)
        };
    }

    // Clean up
    destroy() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        window.removeEventListener('storage', this.handleStorageChange);
        window.removeEventListener('online', this.handleOnline);
        window.removeEventListener('offline', this.handleOffline);
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
        
        this.listeners.clear();
        console.log('🔄 Real-Time Sync System destroyed');
    }
}

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
    window.RealTimeSync = RealTimeSync;

    // Initialize the real-time sync system with proper timing
    function initializeRealTimeSync() {
        if (!window.realTimeSync) {
            window.realTimeSync = new RealTimeSync();
            console.log('🔄 Global Real-Time Sync initialized');
        }
    }

    // If SharedDataManager is already available, initialize immediately
    if (window.sharedDataManager) {
        initializeRealTimeSync();
    } else {
        // Otherwise, wait for SharedDataManager to be available
        let initAttempts = 0;
        const maxInitAttempts = 20;

        const checkForSharedDataManager = () => {
            initAttempts++;
            if (window.sharedDataManager) {
                console.log('✅ SharedDataManager detected, initializing RealTimeSync');
                initializeRealTimeSync();
            } else if (initAttempts < maxInitAttempts) {
                setTimeout(checkForSharedDataManager, 500);
            } else {
                console.warn('⚠️ SharedDataManager not found after', maxInitAttempts, 'attempts, initializing RealTimeSync anyway');
                initializeRealTimeSync();
            }
        };

        // Start checking immediately
        setTimeout(checkForSharedDataManager, 100);
    }
}
