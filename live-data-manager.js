// Enhanced Live Data Manager for Faded Skies Portal
// Provides persistent live data storage with real-time sync across all portals

class LiveDataManager {
    constructor() {
        this.storageKey = 'fadedSkiesLiveData';
        this.logKey = 'fadedSkiesLogs';
        this.sessionKey = 'fadedSkiesSession';
        this.maxLogs = 1000;
        this.saveInterval = 2000; // Save every 2 seconds
        this.saveTimer = null;
        this.pendingChanges = new Set();
        this.isInitialized = false;
        
        this.defaultData = {
            products: [],
            orders: [],
            carts: {},
            users: {},
            inventory: {},
            pricing: {},
            logs: [],
            sessions: {},
            analytics: {
                totalOrders: 0,
                totalRevenue: 0,
                productViews: {},
                ordersByStatus: {}
            },
            settings: {
                autoSync: true,
                realTimeUpdates: true,
                logLevel: 'info'
            },
            lastModified: new Date().toISOString(),
            version: 1
        };

        this.init();
    }

    async init() {
        console.log('🚀 Initializing Live Data Manager...');
        
        try {
            // Load existing data or initialize with defaults
            await this.loadData();
            
            // Set up auto-save
            this.startAutoSave();
            
            // Set up real-time sync
            this.setupRealTimeSync();
            
            // Set up session tracking
            this.initializeSession();
            
            // Set up cleanup on page unload
            this.setupCleanup();
            
            this.isInitialized = true;
            console.log('✅ Live Data Manager initialized successfully');
            
            this.log('system', 'Live Data Manager initialized', { 
                dataVersion: this.data.version,
                hasData: Object.keys(this.data.products || {}).length > 0 
            });
            
        } catch (error) {
            console.error('❌ Failed to initialize Live Data Manager:', error);
            this.log('error', 'Failed to initialize Live Data Manager', { error: error.message });
        }
    }

    async loadData() {
        try {
            // Try to load from localStorage first
            const stored = localStorage.getItem(this.storageKey);
            
            if (stored) {
                const parsedData = JSON.parse(stored);
                
                // Validate data structure
                if (this.validateDataStructure(parsedData)) {
                    this.data = { ...this.defaultData, ...parsedData };
                    console.log('📊 Loaded existing data:', {
                        products: this.data.products?.length || 0,
                        orders: this.data.orders?.length || 0,
                        lastModified: this.data.lastModified
                    });
                } else {
                    console.warn('⚠️ Invalid data structure, using defaults');
                    await this.resetToDefaults();
                }
            } else {
                console.log('📊 No existing data found, initializing with defaults');
                await this.resetToDefaults();
            }

            // Ensure all required properties exist
            this.data = { ...this.defaultData, ...this.data };
            
            // Update version and timestamp
            this.data.lastModified = new Date().toISOString();
            this.data.version = (this.data.version || 0) + 1;
            
        } catch (error) {
            console.error('❌ Error loading data:', error);
            await this.resetToDefaults();
        }
    }

    validateDataStructure(data) {
        const requiredKeys = ['products', 'orders', 'carts', 'analytics'];
        return requiredKeys.every(key => key in data);
    }

    async resetToDefaults() {
        console.log('🔄 Resetting to default data...');
        
        // Initialize with sample data if needed
        const sampleProducts = [
            {
                id: 'FSP001',
                strain: 'Purple Haze A-Grade',
                grade: 'A-Grade',
                price: 850,
                thca: 28.5,
                status: 'available',
                stock: 25,
                image: 'https://images.unsplash.com/photo-1566265784/36330-4f3e3b4b0b0b',
                description: 'Premium THCA flower with exceptional quality',
                created: new Date().toISOString(),
                lastModified: new Date().toISOString()
            },
            {
                id: 'FSP002', 
                strain: 'OG Kush B-Grade',
                grade: 'B-Grade',
                price: 550,
                thca: 24.2,
                status: 'available',
                stock: 40,
                image: 'https://images.unsplash.com/photo-1566265784/36330-4f3e3b4b0b0b',
                description: 'Quality THCA flower at great value',
                created: new Date().toISOString(),
                lastModified: new Date().toISOString()
            }
        ];

        this.data = {
            ...this.defaultData,
            products: sampleProducts,
            lastModified: new Date().toISOString(),
            version: 1
        };

        await this.saveData();
        this.log('system', 'Data reset to defaults', { productCount: sampleProducts.length });
    }

    // Start auto-save functionality
    startAutoSave() {
        this.saveTimer = setInterval(() => {
            if (this.pendingChanges.size > 0) {
                this.saveData();
            }
        }, this.saveInterval);
        
        console.log(`💾 Auto-save started (every ${this.saveInterval / 1000} seconds)`);
    }

    // Save data to localStorage with error handling
    async saveData() {
        try {
            this.data.lastModified = new Date().toISOString();
            this.data.version = (this.data.version || 0) + 1;
            
            localStorage.setItem(this.storageKey, JSON.stringify(this.data));
            
            // Broadcast changes to other tabs/windows
            if (window.realTimeSync) {
                window.realTimeSync.broadcast('data_updated', {
                    timestamp: this.data.lastModified,
                    version: this.data.version,
                    changes: Array.from(this.pendingChanges)
                });
            }
            
            console.log('💾 Data saved successfully', { 
                version: this.data.version,
                changes: Array.from(this.pendingChanges)
            });
            
            this.pendingChanges.clear();
            
        } catch (error) {
            console.error('❌ Error saving data:', error);
            this.log('error', 'Failed to save data', { error: error.message });
            
            // Try to free up space and retry
            this.cleanupOldData();
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(this.data));
                console.log('💾 Data saved after cleanup');
            } catch (retryError) {
                console.error('❌ Failed to save data even after cleanup:', retryError);
            }
        }
    }

    // Set up real-time sync with other tabs/windows
    setupRealTimeSync() {
        if (window.realTimeSync) {
            // Listen for data updates from other tabs
            window.realTimeSync.on('data_updated', (data) => {
                if (data.version > this.data.version) {
                    console.log('🔄 Received newer data from another tab');
                    this.loadData();
                }
            });

            // Listen for specific change events
            window.realTimeSync.on('product_added', (product) => {
                this.addProduct(product, { fromRemote: true });
            });

            window.realTimeSync.on('product_updated', (product) => {
                this.updateProduct(product.id, product, { fromRemote: true });
            });

            window.realTimeSync.on('order_added', (order) => {
                // Validate and clean order data before processing
                const cleanOrder = this.validateAndCleanOrder(order);
                if (cleanOrder) {
                    this.addOrder(cleanOrder, { fromRemote: true });
                } else {
                    console.warn('⚠️ Received invalid order data:', order);
                }
            });

            window.realTimeSync.on('order_updated', (order) => {
                this.updateOrder(order.id, order, { fromRemote: true });
            });

            console.log('🔗 Real-time sync connected');
        }
    }

    // Initialize session tracking
    initializeSession() {
        const sessionId = this.generateSessionId();
        const sessionData = {
            id: sessionId,
            startTime: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            user: window.currentUser?.email || 'anonymous'
        };

        this.data.sessions[sessionId] = sessionData;
        this.currentSession = sessionData;
        
        // Store session info separately for quick access
        sessionStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
        
        this.log('session', 'Session started', sessionData);
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Product management methods
    addProduct(product, options = {}) {
        if (!product.id) {
            product.id = this.generateProductId();
        }

        product.created = product.created || new Date().toISOString();
        product.lastModified = new Date().toISOString();

        this.data.products.push(product);
        this.pendingChanges.add('products');

        this.log('product', 'Product added', { 
            productId: product.id, 
            strain: product.strain,
            user: window.currentUser?.email 
        });

        if (!options.fromRemote && window.realTimeSync) {
            window.realTimeSync.broadcast('product_added', product);
        }

        this.updateAnalytics('product_added');
        return product;
    }

    updateProduct(productId, updates, options = {}) {
        const productIndex = this.data.products.findIndex(p => p.id === productId);
        
        if (productIndex === -1) {
            console.error('❌ Product not found:', productId);
            return null;
        }

        const oldProduct = { ...this.data.products[productIndex] };
        this.data.products[productIndex] = {
            ...this.data.products[productIndex],
            ...updates,
            lastModified: new Date().toISOString()
        };

        this.pendingChanges.add('products');

        this.log('product', 'Product updated', {
            productId,
            changes: Object.keys(updates),
            user: window.currentUser?.email
        });

        if (!options.fromRemote && window.realTimeSync) {
            window.realTimeSync.broadcast('product_updated', this.data.products[productIndex]);
        }

        this.updateAnalytics('product_updated');
        return this.data.products[productIndex];
    }

    deleteProduct(productId, options = {}) {
        const productIndex = this.data.products.findIndex(p => p.id === productId);
        
        if (productIndex === -1) {
            console.error('❌ Product not found:', productId);
            return false;
        }

        const deletedProduct = this.data.products.splice(productIndex, 1)[0];
        this.pendingChanges.add('products');

        this.log('product', 'Product deleted', {
            productId,
            strain: deletedProduct.strain,
            user: window.currentUser?.email
        });

        if (!options.fromRemote && window.realTimeSync) {
            window.realTimeSync.broadcast('product_deleted', { id: productId });
        }

        this.updateAnalytics('product_deleted');
        return true;
    }

    // Validate and clean order data
    validateAndCleanOrder(order) {
        if (!order || typeof order !== 'object') {
            return null;
        }

        // Create a clean copy to avoid modifying the original
        const cleanOrder = { ...order };

        // Ensure items is an array
        if (cleanOrder.items && !Array.isArray(cleanOrder.items)) {
            if (typeof cleanOrder.items === 'string') {
                // Convert string to basic array format
                cleanOrder.items = [{
                    productId: 'unknown',
                    name: cleanOrder.items,
                    quantity: 1,
                    price: cleanOrder.total || 0
                }];
            } else {
                console.warn('⚠️ Invalid items format, setting to empty array:', cleanOrder.items);
                cleanOrder.items = [];
            }
        }

        // Ensure required fields exist
        cleanOrder.id = cleanOrder.id || this.generateOrderId();
        cleanOrder.items = cleanOrder.items || [];
        cleanOrder.total = cleanOrder.total || 0;
        cleanOrder.status = cleanOrder.status || 'pending';
        cleanOrder.created = cleanOrder.created || new Date().toISOString();

        return cleanOrder;
    }

    // Order management methods
    addOrder(order, options = {}) {
        // Validate and clean order before processing
        order = this.validateAndCleanOrder(order);
        if (!order) {
            console.error('❌ Invalid order data provided');
            return null;
        }

        order.lastModified = new Date().toISOString();

        this.data.orders.push(order);
        this.pendingChanges.add('orders');

        this.log('order', 'Order placed', {
            orderId: order.id,
            total: order.total,
            itemCount: order.items?.length || 0,
            partner: order.partner,
            user: window.currentUser?.email
        });

        if (!options.fromRemote && window.realTimeSync) {
            window.realTimeSync.broadcast('order_added', order);
        }

        this.updateAnalytics('order_added', order);
        this.processOrderInventory(order);
        
        return order;
    }

    updateOrder(orderId, updates, options = {}) {
        const orderIndex = this.data.orders.findIndex(o => o.id === orderId);
        
        if (orderIndex === -1) {
            console.error('❌ Order not found:', orderId);
            return null;
        }

        const oldOrder = { ...this.data.orders[orderIndex] };
        this.data.orders[orderIndex] = {
            ...this.data.orders[orderIndex],
            ...updates,
            lastModified: new Date().toISOString()
        };

        this.pendingChanges.add('orders');

        this.log('order', 'Order updated', {
            orderId,
            changes: Object.keys(updates),
            oldStatus: oldOrder.status,
            newStatus: updates.status,
            user: window.currentUser?.email
        });

        if (!options.fromRemote && window.realTimeSync) {
            window.realTimeSync.broadcast('order_updated', this.data.orders[orderIndex]);
        }

        this.updateAnalytics('order_updated', this.data.orders[orderIndex]);
        return this.data.orders[orderIndex];
    }

    // Process inventory changes from orders
    processOrderInventory(order) {
        if (!order || typeof order !== 'object') {
            console.warn('⚠️ Invalid order object:', order);
            return;
        }

        if (!order.items) {
            console.warn('⚠️ Order has no items:', order.id);
            return;
        }

        // Ensure items is an array with very defensive approach
        if (!Array.isArray(order.items)) {
            console.warn('⚠️ Order items is not an array:', typeof order.items, order.items);
            // Try to fix corrupted data
            if (typeof order.items === 'string') {
                order.items = [];
                console.warn('⚠️ Converted string items to empty array for order:', order.id);
            } else {
                order.items = [];
                console.warn('⚠️ Set items to empty array for order:', order.id);
            }
            return;
        }

        // Additional safety check
        if (order.items.length === 0) {
            console.log('ℹ️ Order has no items to process:', order.id);
            return;
        }

        try {
            order.items.forEach(item => {
            const product = this.data.products.find(p => p.id === item.productId);
            if (product) {
                const newStock = Math.max(0, (product.stock || 0) - (item.quantity || 0));
                this.updateProduct(product.id, { stock: newStock });
                
                // Log inventory change
                this.log('inventory', 'Stock updated from order', {
                    productId: product.id,
                    strain: product.strain,
                    oldStock: product.stock,
                    newStock: newStock,
                    orderId: order.id
                });

                // Check for low stock
                if (newStock <= 5) {
                    this.log('warning', 'Low stock alert', {
                        productId: product.id,
                        strain: product.strain,
                        currentStock: newStock
                    });

                    if (window.showNotification) {
                        window.showNotification(
                            `⚠️ Low stock alert: ${product.strain} (${newStock} remaining)`,
                            'warning'
                        );
                    }
                }
            }
            });
        } catch (error) {
            console.error('❌ Error processing order inventory:', error, order);
            // If there's any error with forEach, the order data is corrupted
            // Reset the items to prevent future errors
            if (order && order.id) {
                const orderIndex = this.data.orders.findIndex(o => o.id === order.id);
                if (orderIndex !== -1) {
                    this.data.orders[orderIndex].items = [];
                    console.warn('⚠️ Reset corrupted items for order:', order.id);
                }
            }
        }
    }

    // Analytics and metrics
    updateAnalytics(event, data = null) {
        if (!this.data.analytics) {
            this.data.analytics = {};
        }

        switch (event) {
            case 'order_added':
                this.data.analytics.totalOrders = (this.data.analytics.totalOrders || 0) + 1;
                this.data.analytics.totalRevenue = (this.data.analytics.totalRevenue || 0) + (data?.total || 0);
                break;
                
            case 'product_viewed':
                if (!this.data.analytics.productViews) this.data.analytics.productViews = {};
                const productId = data?.productId;
                if (productId) {
                    this.data.analytics.productViews[productId] = (this.data.analytics.productViews[productId] || 0) + 1;
                }
                break;
        }

        this.pendingChanges.add('analytics');
    }

    // Logging system
    log(level, message, data = null) {
        const logEntry = {
            id: this.generateLogId(),
            timestamp: new Date().toISOString(),
            level,
            message,
            data,
            session: this.currentSession?.id,
            user: window.currentUser?.email || 'anonymous',
            url: window.location.href
        };

        if (!this.data.logs) {
            this.data.logs = [];
        }

        this.data.logs.push(logEntry);

        // Keep only recent logs
        if (this.data.logs.length > this.maxLogs) {
            this.data.logs = this.data.logs.slice(-this.maxLogs);
        }

        this.pendingChanges.add('logs');

        // Console logging
        const consoleMethod = level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'log';
        console[consoleMethod](`[${level.toUpperCase()}]`, message, data);

        // Also store in separate log storage
        this.saveLogToStorage(logEntry);
    }

    saveLogToStorage(logEntry) {
        try {
            const logs = JSON.parse(localStorage.getItem(this.logKey) || '[]');
            logs.push(logEntry);
            
            // Keep only recent logs in separate storage
            if (logs.length > this.maxLogs) {
                logs.splice(0, logs.length - this.maxLogs);
            }
            
            localStorage.setItem(this.logKey, JSON.stringify(logs));
        } catch (error) {
            console.error('Failed to save log to storage:', error);
        }
    }

    // Utility methods
    generateProductId() {
        return 'FSP' + Date.now().toString().slice(-6) + Math.random().toString(36).substr(2, 3).toUpperCase();
    }

    generateOrderId() {
        return 'ORD' + Date.now().toString().slice(-6) + Math.random().toString(36).substr(2, 3).toUpperCase();
    }

    generateLogId() {
        return 'LOG' + Date.now().toString().slice(-6) + Math.random().toString(36).substr(2, 3).toUpperCase();
    }

    // Data access methods
    getProducts() {
        return this.data.products || [];
    }

    getOrders() {
        return this.data.orders || [];
    }

    getLogs(level = null, limit = 100) {
        let logs = this.data.logs || [];
        
        if (level) {
            logs = logs.filter(log => log.level === level);
        }
        
        return logs.slice(-limit);
    }

    getAnalytics() {
        return this.data.analytics || {};
    }

    // Data export/import
    exportData() {
        return {
            ...this.data,
            exportedAt: new Date().toISOString(),
            exportedBy: window.currentUser?.email || 'anonymous'
        };
    }

    importData(importedData) {
        if (this.validateDataStructure(importedData)) {
            this.data = { ...this.defaultData, ...importedData };
            this.saveData();
            this.log('system', 'Data imported', { 
                source: importedData.exportedBy,
                timestamp: importedData.exportedAt 
            });
            return true;
        }
        return false;
    }

    // Cleanup old data
    cleanupOldData() {
        try {
            // Remove old sessions (older than 24 hours)
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            
            if (this.data.sessions) {
                Object.keys(this.data.sessions).forEach(sessionId => {
                    if (this.data.sessions[sessionId].startTime < dayAgo) {
                        delete this.data.sessions[sessionId];
                    }
                });
            }

            // Limit logs
            if (this.data.logs && this.data.logs.length > this.maxLogs) {
                this.data.logs = this.data.logs.slice(-this.maxLogs);
            }

            console.log('🧹 Cleaned up old data');
        } catch (error) {
            console.error('❌ Error cleaning up data:', error);
        }
    }

    // Setup cleanup on page unload
    setupCleanup() {
        window.addEventListener('beforeunload', () => {
            if (this.currentSession) {
                this.currentSession.endTime = new Date().toISOString();
                this.log('session', 'Session ended', this.currentSession);
                this.saveData();
            }
        });
    }

    // Get system status
    getStatus() {
        return {
            initialized: this.isInitialized,
            dataVersion: this.data.version,
            lastModified: this.data.lastModified,
            pendingChanges: Array.from(this.pendingChanges),
            productCount: this.data.products?.length || 0,
            orderCount: this.data.orders?.length || 0,
            logCount: this.data.logs?.length || 0,
            currentSession: this.currentSession?.id
        };
    }

    // Destroy and cleanup
    destroy() {
        if (this.saveTimer) {
            clearInterval(this.saveTimer);
        }
        
        // Save any pending changes
        if (this.pendingChanges.size > 0) {
            this.saveData();
        }
        
        this.log('system', 'Live Data Manager destroyed');
        console.log('💾 Live Data Manager destroyed');
    }
}

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
    window.LiveDataManager = LiveDataManager;
    
    // Initialize after DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.liveDataManager) {
            window.liveDataManager = new LiveDataManager();
            console.log('🚀 Global Live Data Manager initialized');
        }
    });
}
