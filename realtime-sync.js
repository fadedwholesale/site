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
        
        this.init();
    }

    generateClientId() {
        return 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    init() {
        console.log('🔄 Initializing Real-Time Sync System...', this.clientId);
        
        // Set up storage listener for cross-tab communication
        window.addEventListener('storage', this.handleStorageChange.bind(this));
        
        // Set up online/offline detection
        window.addEventListener('online', this.handleOnline.bind(this));
        window.addEventListener('offline', this.handleOffline.bind(this));
        
        // Set up periodic sync
        this.startPeriodicSync();
        
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

    // Periodic sync to catch missed updates
    startPeriodicSync() {
        this.syncInterval = setInterval(() => {
            this.performPeriodicSync();
        }, 5000); // Sync every 5 seconds
    }

    performPeriodicSync() {
        console.log('🔄 Performing periodic sync...');
        
        // Check for data consistency
        if (window.sharedDataManager) {
            const currentData = window.sharedDataManager.getData();
            const lastSync = new Date(currentData.lastSync || 0);
            const now = new Date();
            
            // If data is older than 30 seconds, broadcast a sync request
            if (now - lastSync > 30000) {
                console.log('🔄 Data seems stale, requesting sync...');
                this.broadcast('sync_request', { timestamp: now.toISOString() });
            }
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
    handleOnline() {
        console.log('🌐 Connection restored');
        this.isOnline = true;
        this.broadcast('client_online', { clientId: this.clientId });
        
        // Force sync when coming back online
        this.performPeriodicSync();
        
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

    // Show user action notifications
    showUserActionNotification(data) {
        if (window.showNotification && data.action) {
            let message = '';
            switch (data.action) {
                case 'order_placed':
                    message = `🛒 New order placed: ${data.orderId}`;
                    break;
                case 'user_joined':
                    message = `👤 ${data.userName} joined the portal`;
                    break;
                case 'inventory_low':
                    message = `⚠️ Low inventory alert: ${data.productName}`;
                    break;
                default:
                    message = `📢 ${data.message}`;
            }
            window.showNotification(message, data.type || 'info');
        }
    }

    // Force sync all data
    forceSyncAll() {
        console.log('🔄 Force syncing all data...');
        
        if (window.sharedDataManager) {
            const allData = window.sharedDataManager.exportData();
            this.broadcast('full_sync', allData, { force: true });
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
    
    // Initialize the real-time sync system
    if (!window.realTimeSync) {
        window.realTimeSync = new RealTimeSync();
        console.log('🔄 Global Real-Time Sync initialized');
    }
}
