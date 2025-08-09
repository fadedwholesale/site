// Shared Data Layer for Cart and Inventory Synchronization - Firebase Production Version
// All data processing goes through Firebase real-time database

class SharedDataManager {
    constructor() {
        this.firebaseBridge = null;
        this.db = null;
        this.realTimeSync = null;
        this.initializeFirebase();
        this.setupRealTimeSync();
    }

    async initializeFirebase() {
        // Wait for Firebase Integration Bridge
        if (window.firebaseIntegrationBridge) {
            this.firebaseBridge = window.firebaseIntegrationBridge;
            this.db = this.firebaseBridge.db;
            await this.initializeData();
        } else {
            // Retry every second until Firebase is ready
            setTimeout(() => this.initializeFirebase(), 1000);
        }
    }

    async initializeData() {
        if (!this.db) {
            console.error('Firebase not ready for data initialization');
            return;
        }

        try {
            // Check if system configuration exists
            const systemDoc = await this.db.collection('system').doc('configuration').get();
            
            if (!systemDoc.exists) {
                // Initialize system configuration in Firebase
                const initialSystemData = {
                    logos: {
                        main: 'https://cdn.builder.io/api/v1/image/assets%2F9ee94cd3e5524451b5a43eae8f0b9627%2F2a1db2e6b6bc4987bc3bab24606d5f80?format=webp&width=800',
                        favicon: '',
                        adminHeader: 'https://cdn.builder.io/api/v1/image/assets%2F9ee94cd3e5524451b5a43eae8f0b9627%2F2a1db2e6b6bc4987bc3bab24606d5f80?format=webp&width=800',
                        partnerHeader: 'https://cdn.builder.io/api/v1/image/assets%2F9ee94cd3e5524451b5a43eae8f0b9627%2F2a1db2e6b6bc4987bc3bab24606d5f80?format=webp&width=800'
                    },
                    branding: {
                        companyName: 'Faded Skies',
                        tagline: 'Premium THCA Wholesale'
                    },
                    lastSync: new Date().toISOString(),
                    version: 1
                };
                
                await this.db.collection('system').doc('configuration').set(initialSystemData);
                console.log('🔥 System configuration initialized in Firebase');
            }
            
            console.log('✅ Firebase data layer initialized');
        } catch (error) {
            console.error('❌ Error initializing Firebase data:', error);
        }
    }

    // Product Management - Firebase only
    async updateProducts(products) {
        if (!this.db) throw new Error('Firebase not ready');

        try {
            // Update each product in Firebase
            const batch = this.db.batch();
            
            products.forEach(product => {
                const productRef = this.db.collection('products').doc(product.id.toString());
                batch.set(productRef, {
                    ...product,
                    lastModified: new Date().toISOString()
                }, { merge: true });
            });
            
            await batch.commit();
            this.notifyChange('products_updated', products);
            
            // Broadcast real-time update
            if (this.realTimeSync) {
                this.realTimeSync.broadcast('products_updated', products);
            }
            
            console.log('✅ Products updated in Firebase:', products.length);
        } catch (error) {
            console.error('❌ Error updating products in Firebase:', error);
            throw error;
        }
    }

    async getProducts() {
        if (!this.db) throw new Error('Firebase not ready');

        try {
            const snapshot = await this.db.collection('products').get();
            const products = [];
            snapshot.forEach(doc => {
                products.push({ id: doc.id, ...doc.data() });
            });
            return products;
        } catch (error) {
            console.error('❌ Error getting products from Firebase:', error);
            return [];
        }
    }

    async addProduct(product) {
        if (!this.db) throw new Error('Firebase not ready');

        try {
            // Generate ID if not provided
            if (!product.id) {
                product.id = Date.now() + Math.random();
            }

            // Ensure image field exists
            if (!product.image) {
                product.image = product.photo || '';
            }

            // Add timestamps
            product.createdAt = new Date().toISOString();
            product.lastModified = product.createdAt;

            await this.db.collection('products').doc(product.id.toString()).set(product);
            this.notifyChange('product_added', product);

            // Broadcast real-time update
            if (this.realTimeSync) {
                this.realTimeSync.broadcast('product_added', product);
            }

            console.log('✅ Product added to Firebase:', product.strain);
            return product;
        } catch (error) {
            console.error('❌ Error adding product to Firebase:', error);
            throw error;
        }
    }

    async updateProduct(productId, updates) {
        if (!this.db) throw new Error('Firebase not ready');

        try {
            updates.lastModified = new Date().toISOString();
            
            await this.db.collection('products').doc(productId.toString()).update(updates);
            this.notifyChange('product_updated', { productId, updates });

            // Broadcast real-time update
            if (this.realTimeSync) {
                this.realTimeSync.broadcast('product_updated', { productId, updates });
            }

            console.log('✅ Product updated in Firebase:', productId);
        } catch (error) {
            console.error('❌ Error updating product in Firebase:', error);
            throw error;
        }
    }

    // Order Management - Firebase only
    async addOrder(orderData) {
        if (!this.db) throw new Error('Firebase not ready');

        try {
            const order = {
                ...orderData,
                createdAt: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                status: orderData.status || 'PENDING'
            };

            const docRef = await this.db.collection('orders').add(order);
            const orderWithId = { id: docRef.id, ...order };
            
            this.notifyChange('order_added', orderWithId);

            // Broadcast real-time update
            if (this.realTimeSync) {
                this.realTimeSync.broadcast('order_added', orderWithId);
            }

            console.log('✅ Order added to Firebase:', docRef.id);
            return orderWithId;
        } catch (error) {
            console.error('❌ Error adding order to Firebase:', error);
            throw error;
        }
    }

    async getOrders() {
        if (!this.db) throw new Error('Firebase not ready');

        try {
            const snapshot = await this.db.collection('orders')
                .orderBy('createdAt', 'desc')
                .get();
            
            const orders = [];
            snapshot.forEach(doc => {
                orders.push({ id: doc.id, ...doc.data() });
            });
            return orders;
        } catch (error) {
            console.error('❌ Error getting orders from Firebase:', error);
            return [];
        }
    }

    async updateOrder(orderId, updates) {
        if (!this.db) throw new Error('Firebase not ready');

        try {
            updates.lastModified = new Date().toISOString();
            
            await this.db.collection('orders').doc(orderId).update(updates);
            this.notifyChange('order_updated', { orderId, updates });

            // Broadcast real-time update
            if (this.realTimeSync) {
                this.realTimeSync.broadcast('order_updated', { orderId, updates });
            }

            console.log('✅ Order updated in Firebase:', orderId);
        } catch (error) {
            console.error('❌ Error updating order in Firebase:', error);
            throw error;
        }
    }

    // Cart Management - Firebase only (user-specific)
    async updateCart(userEmail, cartItems) {
        if (!this.db) throw new Error('Firebase not ready');

        try {
            const cartData = {
                items: cartItems,
                userEmail: userEmail,
                lastModified: new Date().toISOString()
            };

            await this.db.collection('carts').doc(userEmail).set(cartData);
            this.notifyChange('cart_updated', { userEmail, cartItems });

            console.log('✅ Cart updated in Firebase for:', userEmail);
        } catch (error) {
            console.error('❌ Error updating cart in Firebase:', error);
            throw error;
        }
    }

    async getCart(userEmail) {
        if (!this.db) throw new Error('Firebase not ready');

        try {
            const doc = await this.db.collection('carts').doc(userEmail).get();
            
            if (doc.exists) {
                return doc.data().items || [];
            }
            return [];
        } catch (error) {
            console.error('❌ Error getting cart from Firebase:', error);
            return [];
        }
    }

    // System Configuration - Firebase only
    async getSystemConfig() {
        if (!this.db) throw new Error('Firebase not ready');

        try {
            const doc = await this.db.collection('system').doc('configuration').get();
            
            if (doc.exists) {
                return doc.data();
            }
            return {};
        } catch (error) {
            console.error('❌ Error getting system config from Firebase:', error);
            return {};
        }
    }

    async updateLogos(logoData) {
        if (!this.db) throw new Error('Firebase not ready');

        try {
            await this.db.collection('system').doc('configuration').update({
                logos: logoData,
                lastModified: new Date().toISOString()
            });

            this.notifyChange('logos_updated', logoData);
            console.log('✅ Logos updated in Firebase');
            return logoData;
        } catch (error) {
            console.error('❌ Error updating logos in Firebase:', error);
            throw error;
        }
    }

    async getLogos() {
        try {
            const config = await this.getSystemConfig();
            return config.logos || {};
        } catch (error) {
            console.error('❌ Error getting logos from Firebase:', error);
            return {};
        }
    }

    // Real-time sync setup
    setupRealTimeSync() {
        // Set up real-time listeners for products
        if (this.db) {
            this.db.collection('products').onSnapshot((snapshot) => {
                console.log('📡 Products updated in real-time from Firebase');
                this.notifyChange('products_realtime_update', snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })));
            });

            // Set up real-time listeners for orders
            this.db.collection('orders').onSnapshot((snapshot) => {
                console.log('📡 Orders updated in real-time from Firebase');
                this.notifyChange('orders_realtime_update', snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })));
            });
        }
    }

    // Notification system
    notifyChange(eventType, data) {
        try {
            window.dispatchEvent(new CustomEvent('sharedDataChanged', {
                detail: { type: eventType, data }
            }));
        } catch (error) {
            console.warn('Error dispatching data change event:', error);
        }
    }

    // Real-time broadcasting
    broadcastRealTimeUpdate(eventType, data) {
        try {
            const updateData = {
                type: eventType,
                data: data,
                timestamp: new Date().toISOString(),
                source: window.location.pathname.includes('admin') ? 'admin' : 'partner'
            };

            // Store in Firebase for cross-session sync
            if (this.db) {
                this.db.collection('realtime_updates').add(updateData);
            }

            console.log('📡 Broadcasting real-time update:', eventType, data);
        } catch (error) {
            console.error('Error broadcasting real-time update:', error);
        }
    }

    // Get consolidated data (for sync operations)
    async getData() {
        try {
            const products = await this.getProducts();
            const orders = await this.getOrders();
            const systemConfig = await this.getSystemConfig();

            return {
                products,
                orders,
                systemConfig,
                lastSync: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Error getting consolidated data:', error);
            return {
                products: [],
                orders: [],
                systemConfig: {},
                lastSync: new Date().toISOString()
            };
        }
    }

    // Export all data (for sync operations)
    async exportData() {
        try {
            return await this.getData();
        } catch (error) {
            console.error('❌ Error exporting data:', error);
            return {
                products: [],
                orders: [],
                systemConfig: {},
                lastSync: new Date().toISOString()
            };
        }
    }

    // Status and debugging
    getStatus() {
        return {
            firebaseReady: !!this.db,
            integration: !!this.firebaseBridge,
            mode: 'firebase-production'
        };
    }
}

// Initialize shared data manager
window.sharedDataManager = new SharedDataManager();

// Set up event listeners for cross-component communication
window.addEventListener('sharedDataChanged', (event) => {
    const { type, data } = event.detail;
    
    // Trigger UI updates based on data changes
    if (typeof updateAllViews === 'function') {
        updateAllViews();
    }
    
    if (typeof updateOrdersDisplay === 'function') {
        updateOrdersDisplay();
    }
});

console.log('🔥 Shared Data Manager initialized (Firebase Production Mode)');
