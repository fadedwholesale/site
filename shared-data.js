// Shared Data Layer for Cart and Inventory Synchronization
// This script provides real-time data synchronization between partner portal and admin portal

class SharedDataManager {
    constructor() {
        this.storageKey = 'fadedSkiesSharedData';
        this.realTimeSync = null;
        this.initializeData();
        this.setupStorageListener();
        this.setupRealTimeSync();
    }

    initializeData() {
        // Initialize shared data structure if it doesn't exist
        if (!localStorage.getItem(this.storageKey)) {
            const initialData = {
                products: [],
                carts: {}, // keyed by user email
                orders: [],
                system: {
                    logos: {
                        main: 'https://cdn.builder.io/api/v1/image/assets%2F9ee94cd3e5524451b5a43eae8f0b9627%2F2a1db2e6b6bc4987bc3bab24606d5f80?format=webp&width=800',
                        favicon: '',
                        adminHeader: 'https://cdn.builder.io/api/v1/image/assets%2F9ee94cd3e5524451b5a43eae8f0b9627%2F2a1db2e6b6bc4987bc3bab24606d5f80?format=webp&width=800',
                        partnerHeader: 'https://cdn.builder.io/api/v1/image/assets%2F9ee94cd3e5524451b5a43eae8f0b9627%2F2a1db2e6b6bc4987bc3bab24606d5f80?format=webp&width=800'
                    },
                    branding: {
                        companyName: 'Faded Skies',
                        tagline: 'Premium THCA Wholesale'
                    }
                },
                lastSync: new Date().toISOString(),
                version: 1
            };
            this.saveData(initialData);
        }
    }

    getData() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey)) || {};
        } catch (error) {
            console.error('Error parsing shared data:', error);
            return {};
        }
    }

    saveData(data) {
        try {
            data.lastSync = new Date().toISOString();
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            this.notifyChange('data_updated', data);
        } catch (error) {
            console.error('Error saving shared data:', error);
        }
    }

    // Product Management
    updateProducts(products) {
        const data = this.getData();
        data.products = products;
        this.saveData(data);
        this.notifyChange('products_updated', products);

        // Broadcast real-time update
        if (this.realTimeSync) {
            this.realTimeSync.broadcast('products_updated', products);
        }
    }

    getProducts() {
        return this.getData().products || [];
    }

    addProduct(product) {
        const data = this.getData();
        if (!data.products) data.products = [];

        // Generate ID if not provided
        if (!product.id) {
            product.id = Date.now() + Math.random();
        }

        // Ensure image field exists
        if (!product.image) {
            product.image = product.photo || ''; // Support both 'image' and 'photo' fields
        }

        // Add creation timestamp
        product.createdAt = new Date().toISOString();
        if (!product.lastModified) {
            product.lastModified = product.createdAt;
        }

        data.products.push(product);
        this.saveData(data);
        this.notifyChange('product_added', product);

        // Broadcast real-time update
        if (this.realTimeSync) {
            this.realTimeSync.broadcast('product_added', {
                ...product,
                isNewProduct: true
            });

            // Also broadcast admin action for notifications
            this.realTimeSync.broadcast('admin_product_change', {
                productId: product.id,
                productName: product.strain,
                changes: ['new_product'],
                action: 'product_added',
                newProduct: product,
                timestamp: new Date().toISOString()
            });
        }

        console.log('📦 Product added with real-time sync:', product.strain);
        return product;
    }

    updateProduct(productId, updates) {
        const data = this.getData();
        const productIndex = data.products.findIndex(p => p.id === productId);

        if (productIndex !== -1) {
            const oldProduct = { ...data.products[productIndex] };
            data.products[productIndex] = { ...data.products[productIndex], ...updates };
            this.saveData(data);
            this.notifyChange('product_updated', data.products[productIndex]);

            // Broadcast real-time update with before/after data
            if (this.realTimeSync) {
                this.realTimeSync.broadcast('product_updated', {
                    productId,
                    before: oldProduct,
                    after: data.products[productIndex],
                    updates
                });

                // If stock changed, broadcast inventory update
                if (updates.stock !== undefined && updates.stock !== oldProduct.stock) {
                    this.realTimeSync.broadcast('inventory_updated', {
                        productId,
                        productName: data.products[productIndex].strain,
                        oldStock: oldProduct.stock,
                        newStock: updates.stock,
                        timestamp: new Date().toISOString()
                    });
                }

                // If image changed, broadcast image update
                if (updates.image !== undefined && updates.image !== oldProduct.image) {
                    this.realTimeSync.broadcast('product_image_updated', {
                        productId,
                        productName: data.products[productIndex].strain,
                        oldImage: oldProduct.image,
                        newImage: updates.image,
                        timestamp: new Date().toISOString()
                    });
                }

                // If product metadata changed (price, status, etc.), broadcast admin change
                const significantChanges = ['price', 'status', 'thca', 'grade'];
                const hasSignificantChange = significantChanges.some(field =>
                    updates[field] !== undefined && updates[field] !== oldProduct[field]
                );

                if (hasSignificantChange) {
                    this.realTimeSync.broadcast('admin_product_change', {
                        productId,
                        productName: data.products[productIndex].strain,
                        changes: Object.keys(updates).filter(key => updates[key] !== oldProduct[key]),
                        updatedProduct: data.products[productIndex],
                        timestamp: new Date().toISOString()
                    });
                }
            }

            return data.products[productIndex];
        }
        return null;
    }

    deleteProduct(productId) {
        const data = this.getData();
        const productIndex = data.products.findIndex(p => p.id === productId);

        if (productIndex !== -1) {
            const deletedProduct = data.products.splice(productIndex, 1)[0];
            this.saveData(data);
            this.notifyChange('product_deleted', deletedProduct);

            // Broadcast real-time update
            if (this.realTimeSync) {
                this.realTimeSync.broadcast('product_deleted', deletedProduct);
            }

            return deletedProduct;
        }
        return null;
    }

    // Cart Management
    getCart(userEmail) {
        const data = this.getData();
        return data.carts[userEmail] || [];
    }

    updateCart(userEmail, cart) {
        const data = this.getData();
        if (!data.carts) data.carts = {};
        data.carts[userEmail] = cart;
        this.saveData(data);
        this.notifyChange('cart_updated', { userEmail, cart });

        // Broadcast real-time update
        if (this.realTimeSync) {
            this.realTimeSync.broadcast('cart_updated', { userEmail, cart });
        }
    }

    addToCart(userEmail, productId, quantity = 1) {
        console.log('📡 SharedDataManager: addToCart called', { userEmail, productId, quantity });

        const cart = this.getCart(userEmail);
        const products = this.getProducts();
        const product = products.find(p => p.id == productId); // Use loose equality

        if (!product) {
            console.error('❌ Product not found:', productId);
            throw new Error('Product not found');
        }

        const existingItem = cart.find(item => item.id == productId);

        if (existingItem) {
            const newQuantity = Math.min(existingItem.quantity + quantity, product.stock);
            console.log('📡 Updating existing item quantity:', existingItem.quantity, '->', newQuantity);
            existingItem.quantity = newQuantity;
        } else {
            const newItem = {
                id: product.id,
                strain: product.strain,
                grade: product.grade,
                price: product.price,
                quantity: Math.min(quantity, product.stock),
                maxStock: product.stock,
                image: product.image,
                addedAt: new Date().toISOString()
            };
            console.log('📡 Adding new item to cart:', newItem);
            cart.push(newItem);
        }

        this.updateCart(userEmail, cart);
        console.log('📡 Cart after add:', cart.map(item => `${item.strain}: ${item.quantity}x`));
        return cart;
    }

    removeFromCart(userEmail, productId) {
        const cart = this.getCart(userEmail);
        const updatedCart = cart.filter(item => item.id !== productId);
        this.updateCart(userEmail, updatedCart);
        return updatedCart;
    }

    updateCartQuantity(userEmail, productId, quantity) {
        try {
            console.log('📡 SharedDataManager: updateCartQuantity called', { userEmail, productId, quantity });

            if (!userEmail || !productId) {
                console.error('❌ SharedDataManager: Invalid parameters', { userEmail, productId, quantity });
                throw new Error('Invalid parameters for updateCartQuantity');
            }

            const cart = this.getCart(userEmail);
            const item = cart.find(item => item.id == productId); // Use loose equality to handle string/number mismatch

            console.log('📡 SharedDataManager: Found cart item:', item);

            if (item) {
                if (quantity <= 0) {
                    console.log('📡 SharedDataManager: Removing item with zero/negative quantity');
                    return this.removeFromCart(userEmail, productId);
                } else {
                    const products = this.getProducts();
                    const product = products.find(p => p.id == productId); // Use loose equality
                    console.log('📡 SharedDataManager: Found product:', product);

                    const maxAllowed = product ? product.stock : (item.maxStock || 999);
                    const newQuantity = Math.min(quantity, maxAllowed);

                    console.log('📡 SharedDataManager: Updating quantity', { oldQuantity: item.quantity, newQuantity, maxAllowed });

                    item.quantity = newQuantity;
                    this.updateCart(userEmail, cart);
                }
            } else {
                console.warn('📡 SharedDataManager: Item not found in cart', { productId, cartItems: cart.map(i => i.id) });
            }

            console.log('📡 SharedDataManager: Returning updated cart with', cart.length, 'items');
            return cart;
        } catch (error) {
            console.error('❌ SharedDataManager: Error in updateCartQuantity:', error);
            throw error;
        }
    }

    clearCart(userEmail) {
        this.updateCart(userEmail, []);
    }

    // Order Management
    addOrder(order) {
        console.log('📡 SharedDataManager: Adding new order', order);

        const data = this.getData();
        if (!data.orders) data.orders = [];

        order.id = order.id || `ORD-${Date.now()}`;
        order.createdAt = new Date().toISOString();
        order.status = order.status || 'PENDING';

        data.orders.push(order);
        this.saveData(data);

        // Enhanced notification with real-time broadcasting
        this.notifyChange('order_added', order);

        // New real-time sync broadcasting
        if (this.realTimeSync) {
            this.realTimeSync.broadcast('order_added', {
                ...order,
                isUrgent: order.total > 1000,
                customerInfo: {
                    email: order.partner,
                    name: order.partnerName
                }
            });

            // Also broadcast user action for notifications
            this.realTimeSync.broadcast('user_action', {
                action: 'order_placed',
                orderId: order.id,
                userEmail: order.partner,
                userName: order.partnerName,
                amount: order.total,
                type: 'success'
            });
        }

        // Legacy broadcast for admin portal
        this.broadcastRealTimeUpdate('new_order', {
            ...order,
            isUrgent: order.total > 1000,
            customerInfo: {
                email: order.partner,
                name: order.partnerName
            }
        });

        console.log('📡 Order added and broadcasted:', order.id);
        return order;
    }

    getOrders() {
        return this.getData().orders || [];
    }

    updateOrder(orderId, updates) {
        const data = this.getData();
        const orderIndex = data.orders.findIndex(o => o.id === orderId);
        
        if (orderIndex !== -1) {
            data.orders[orderIndex] = { ...data.orders[orderIndex], ...updates };
            this.saveData(data);
            this.notifyChange('order_updated', data.orders[orderIndex]);
            return data.orders[orderIndex];
        }
        return null;
    }

    // Event System
    setupRealTimeSync() {
        // Wait for RealTimeSync to be available
        if (window.RealTimeSync) {
            this.initializeRealTimeSync();
        } else {
            // Wait for it to load
            setTimeout(() => this.setupRealTimeSync(), 100);
        }
    }

    initializeRealTimeSync() {
        if (window.realTimeSync) {
            this.realTimeSync = window.realTimeSync;
            console.log('📡 Connected to Real-Time Sync system');

            // Set up listeners for real-time events
            this.realTimeSync.on('products_updated', (data) => {
                console.log('📡 Real-time products update received:', data);
                this.handleRealTimeProductsUpdate(data);
            });

            this.realTimeSync.on('order_added', (data) => {
                console.log('📡 Real-time order added:', data);
                this.handleRealTimeOrderUpdate(data);
            });

            this.realTimeSync.on('inventory_updated', (data) => {
                console.log('📡 Real-time inventory update:', data);
                this.handleRealTimeInventoryUpdate(data);
            });

            this.realTimeSync.on('sync_request', () => {
                console.log('📡 Sync request received, broadcasting current data');
                this.broadcastCurrentData();
            });

            this.realTimeSync.on('full_sync', (data) => {
                console.log('📡 Full sync received:', data);
                this.handleFullSync(data);
            });

            this.realTimeSync.on('product_image_updated', (data) => {
                console.log('📡 Real-time product image update:', data);
                this.handleRealTimeImageUpdate(data);
            });

            this.realTimeSync.on('admin_product_change', (data) => {
                console.log('📡 Real-time admin product change:', data);
                this.handleRealTimeAdminChange(data);
            });
        }
    }

    setupStorageListener() {
        window.addEventListener('storage', (e) => {
            if (e.key === this.storageKey) {
                this.notifyChange('external_update', JSON.parse(e.newValue || '{}'));
            }

            // Listen for real-time updates (legacy support)
            if (e.key === 'fadedSkiesRealTimeUpdate') {
                try {
                    const updateData = JSON.parse(e.newValue || '{}');
                    console.log('📡 Received legacy real-time update:', updateData);

                    // Dispatch the real-time update
                    window.dispatchEvent(new CustomEvent('realTimeUpdate', {
                        detail: updateData
                    }));
                } catch (error) {
                    console.error('Error processing real-time update:', error);
                }
            }
        });
    }

    notifyChange(eventType, data) {
        // Dispatch custom event for components to listen to
        window.dispatchEvent(new CustomEvent('sharedDataChange', {
            detail: { type: eventType, data, timestamp: new Date().toISOString() }
        }));

        // Enhanced real-time broadcasting
        this.broadcastRealTimeUpdate(eventType, data);
    }

    broadcastRealTimeUpdate(eventType, data) {
        // Store the latest update for cross-tab communication
        const updateData = {
            type: eventType,
            data: data,
            timestamp: new Date().toISOString(),
            id: Math.random().toString(36).substr(2, 9)
        };

        // Use a separate key for real-time updates
        try {
            localStorage.setItem('fadedSkiesRealTimeUpdate', JSON.stringify(updateData));
            console.log('📡 Broadcasting real-time update:', eventType, data);
        } catch (error) {
            console.error('Error broadcasting update:', error);
        }
    }

    // Sync operations
    forceSyncProducts(products) {
        console.log('🔄 Force syncing products...', products.length, 'products');
        this.updateProducts(products);
        return true;
    }

    getLastSync() {
        return this.getData().lastSync;
    }

    // Utility methods
    exportData() {
        return this.getData();
    }

    importData(data) {
        this.saveData(data);
        this.notifyChange('data_imported', data);
    }

    clearAllData() {
        localStorage.removeItem(this.storageKey);
        this.initializeData();
        this.notifyChange('data_cleared', {});
    }

    // Real-time event handlers
    handleRealTimeProductsUpdate(products) {
        console.log('���� Handling real-time products update');
        // Update local data without triggering another broadcast
        const data = this.getData();
        data.products = products;
        data.lastSync = new Date().toISOString();
        localStorage.setItem(this.storageKey, JSON.stringify(data));

        // Notify local components
        this.notifyChange('products_updated', products);
    }

    handleRealTimeOrderUpdate(order) {
        console.log('📡 Handling real-time order update:', order);
        // Update local data
        const data = this.getData();
        if (!data.orders) data.orders = [];

        // Check if order already exists
        const existingIndex = data.orders.findIndex(o => o.id === order.id);
        if (existingIndex === -1) {
            data.orders.push(order);
        } else {
            data.orders[existingIndex] = order;
        }

        data.lastSync = new Date().toISOString();
        localStorage.setItem(this.storageKey, JSON.stringify(data));

        // Notify local components
        this.notifyChange('order_added', order);
    }

    handleRealTimeInventoryUpdate(inventoryData) {
        console.log('📡 Handling real-time inventory update:', inventoryData);
        const { productId, newStock } = inventoryData;

        if (productId && newStock !== undefined) {
            // Update the specific product's stock
            const data = this.getData();
            const productIndex = data.products.findIndex(p => p.id === productId);

            if (productIndex !== -1) {
                data.products[productIndex].stock = newStock;
                data.lastSync = new Date().toISOString();
                localStorage.setItem(this.storageKey, JSON.stringify(data));

                // Notify local components
                this.notifyChange('product_updated', data.products[productIndex]);
            }
        }
    }

    handleFullSync(syncData) {
        console.log('📡 Handling full data sync');
        if (syncData && typeof syncData === 'object') {
            // Replace all data with synced data
            syncData.lastSync = new Date().toISOString();
            localStorage.setItem(this.storageKey, JSON.stringify(syncData));

            // Notify all components of the update
            this.notifyChange('full_sync', syncData);
            if (syncData.products) {
                this.notifyChange('products_updated', syncData.products);
            }
            if (syncData.orders) {
                this.notifyChange('orders_updated', syncData.orders);
            }
        }
    }

    broadcastCurrentData() {
        if (this.realTimeSync) {
            const currentData = this.getData();
            this.realTimeSync.broadcast('full_sync', currentData, { force: true });
        }
    }

    // Handle real-time image updates
    handleRealTimeImageUpdate(imageData) {
        console.log('📡 Handling real-time image update:', imageData);
        const { productId, newImage } = imageData;

        if (productId && newImage !== undefined) {
            // Update the specific product's image
            const data = this.getData();
            const productIndex = data.products.findIndex(p => p.id === productId);

            if (productIndex !== -1) {
                data.products[productIndex].image = newImage;
                data.products[productIndex].lastModified = new Date().toISOString();
                data.lastSync = new Date().toISOString();
                localStorage.setItem(this.storageKey, JSON.stringify(data));

                // Notify local components of image update
                this.notifyChange('product_updated', data.products[productIndex]);
                this.notifyChange('product_image_updated', imageData);

                // Show notification if appropriate
                if (window.showNotification) {
                    window.showNotification(`📸 ${imageData.productName} image updated`, 'info');
                }
            }
        }
    }

    // Handle real-time admin changes
    handleRealTimeAdminChange(adminData) {
        console.log('📡 Handling real-time admin change:', adminData);

        if (window.showNotification && adminData.productName) {
            const changeSummary = adminData.changes.join(', ');
            const message = `🔧 Admin updated ${adminData.productName}: ${changeSummary}`;
            window.showNotification(message, 'info');
        }

        // If this was a new product, ensure it's properly displayed
        if (adminData.action === 'product_added' && adminData.newProduct) {
            // Force refresh of product displays
            if (window.updateAllViews) {
                setTimeout(() => window.updateAllViews(), 500);
            }
        }
    }

    // Get real-time sync status
    getRealTimeSyncStatus() {
        return this.realTimeSync ? this.realTimeSync.getSyncStatus() : null;
    }

    // System Configuration Management
    getSystemConfig() {
        const data = this.getData();
        return data.system || {};
    }

    updateSystemConfig(config) {
        const data = this.getData();
        if (!data.system) data.system = {};
        data.system = { ...data.system, ...config };
        this.saveData(data);
        this.notifyChange('system_config_updated', data.system);

        // Broadcast real-time update
        if (this.realTimeSync) {
            this.realTimeSync.broadcast('system_config_updated', data.system);
        }
        return data.system;
    }

    updateLogos(logos) {
        const data = this.getData();
        if (!data.system) data.system = {};
        if (!data.system.logos) data.system.logos = {};
        data.system.logos = { ...data.system.logos, ...logos };
        this.saveData(data);
        this.notifyChange('logos_updated', data.system.logos);

        // Broadcast real-time update
        if (this.realTimeSync) {
            this.realTimeSync.broadcast('logos_updated', data.system.logos);
        }
        return data.system.logos;
    }

    getLogos() {
        const data = this.getData();
        return data.system?.logos || {};
    }
}

// Create global instance
window.sharedDataManager = new SharedDataManager();

// Initialize default products if none exist
if (window.sharedDataManager.getProducts().length === 0) {
    const defaultProducts = [
        {
            id: 1,
            grade: "A-GRADE",
            strain: "Blue Runtz",
            thca: 31.6,
            price: 847,
            status: "AVAILABLE",
            stock: 25,
            type: "Hybrid",
            image: "https://images.unsplash.com/photo-1610234815282-a78e82bbde8e?w=300&h=300&fit=crop&crop=center",
            description: "Premium A-grade indoor flower with exceptional terpene profile",
            lastModified: new Date().toISOString()
        },
        {
            id: 2,
            grade: "A-GRADE",
            strain: "Wedding Cake",
            thca: 28.9,
            price: 723,
            status: "AVAILABLE",
            stock: 18,
            type: "Hybrid",
            image: "https://images.unsplash.com/photo-1605069876632-6e30ff47b8bd?w=300&h=300&fit=crop&crop=center",
            description: "Sweet and tangy hybrid with relaxing effects",
            lastModified: new Date().toISOString()
        },
        {
            id: 3,
            grade: "B-GRADE",
            strain: "OG Kush",
            thca: 24.3,
            price: 550,
            status: "AVAILABLE",
            stock: 30,
            type: "Indica",
            image: "https://images.unsplash.com/photo-1607249146552-4e34b69cd4b3?w=300&h=300&fit=crop&crop=center",
            description: "Classic strain with earthy pine flavors",
            lastModified: new Date().toISOString()
        },
        {
            id: 4,
            grade: "ROSIN",
            strain: "Live Rosin - Purple Punch",
            thca: 78.2,
            price: 35,
            status: "AVAILABLE",
            stock: 12,
            type: "Concentrate",
            image: "https://images.unsplash.com/photo-1644845499871-2b9c93cf69f5?w=300&h=300&fit=crop&crop=center",
            description: "Premium live rosin concentrate",
            lastModified: new Date().toISOString()
        },
        {
            id: 5,
            grade: "VAPE",
            strain: "Gelato Cart",
            thca: 85.4,
            price: 45,
            status: "COMING SOON",
            stock: 0,
            type: "Vape",
            image: "https://images.unsplash.com/photo-1628958230481-0011f5bd3db9?w=300&h=300&fit=crop&crop=center",
            description: "Premium live resin vape cartridge",
            lastModified: new Date().toISOString()
        }
    ];
    
    window.sharedDataManager.updateProducts(defaultProducts);
    console.log('✅ Initialized default products in shared data manager');
}

console.log('📡 Shared Data Manager initialized successfully');
