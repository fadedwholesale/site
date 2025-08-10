// Dynamic Data Processor for Faded Skies Portal
// Real-time data processing through Firebase and PostgreSQL
// Handles automatic updates when orders are placed, partners sign up, or admins submit changes

class DynamicDataProcessor {
    constructor() {
        this.firebaseApp = null;
        this.firestore = null;
        this.auth = null;
        this.dataConnect = null;
        this.realTimeListeners = new Map();
        this.processingQueue = [];
        this.isProcessing = false;
        this.notificationQueue = [];
        this.auditQueue = [];
        
        this.initializeFirebase();
        this.setupDataConnect();
        this.setupRealTimeListeners();
        this.startProcessingLoop();
    }

    async initializeFirebase() {
        try {
            // Import Firebase modules
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
            const { getFirestore, onSnapshot, doc, collection, query, where, orderBy } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const { getAuth, onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');

            const firebaseConfig = {
                apiKey: "AIzaSyD5Q45_-o5iZcsHeoWEwsQLtVC_A9Z8ixo",
                authDomain: "wholesale-95ceb.firebaseapp.com",
                projectId: "wholesale-95ceb",
                storageBucket: "wholesale-95ceb.firebasestorage.app",
                messagingSenderId: "719478576563",
                appId: "1:719478576563:web:c4e06fbd5e59882f86a7c6",
                measurementId: "G-Z3RXB38R19"
            };

            this.firebaseApp = initializeApp(firebaseConfig);
            this.firestore = getFirestore(this.firebaseApp);
            this.auth = getAuth(this.firebaseApp);

            console.log('✅ Firebase initialized for dynamic data processing');
        } catch (error) {
            console.error('❌ Firebase initialization failed:', error);
        }
    }

    async setupDataConnect() {
        try {
            // Initialize Data Connect client
            this.dataConnect = new DataConnectClient({
                projectId: 'wholesale-95ceb',
                location: 'us-central1',
                serviceId: 'wholesale-95ceb-service'
            });

            console.log('✅ Data Connect initialized');
        } catch (error) {
            console.error('❌ Data Connect initialization failed:', error);
        }
    }

    setupRealTimeListeners() {
        // Listen for new partner registrations
        this.setupPartnerRegistrationListener();
        
        // Listen for order changes
        this.setupOrderListener();
        
        // Listen for product changes
        this.setupProductListener();
        
        // Listen for inventory changes
        this.setupInventoryListener();
        
        // Listen for document uploads
        this.setupDocumentListener();
    }

    setupPartnerRegistrationListener() {
        const partnersQuery = query(
            collection(this.firestore, 'users'),
            where('role', '==', 'partner'),
            where('status', '==', 'pending')
        );

        const unsubscribe = onSnapshot(partnersQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    this.processNewPartnerRegistration(change.doc.data());
                }
            });
        });

        this.realTimeListeners.set('partners', unsubscribe);
        console.log('👥 Partner registration listener active');
    }

    setupOrderListener() {
        const ordersQuery = query(
            collection(this.firestore, 'orders'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    this.processNewOrder(change.doc.data());
                } else if (change.type === 'modified') {
                    this.processOrderUpdate(change.doc.data(), change.doc.metadata.hasPendingWrites);
                }
            });
        });

        this.realTimeListeners.set('orders', unsubscribe);
        console.log('📦 Order listener active');
    }

    setupProductListener() {
        const productsQuery = query(
            collection(this.firestore, 'products'),
            where('status', '==', 'active')
        );

        const unsubscribe = onSnapshot(productsQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'modified') {
                    this.processProductUpdate(change.doc.data());
                }
            });
        });

        this.realTimeListeners.set('products', unsubscribe);
        console.log('🛍️ Product listener active');
    }

    setupInventoryListener() {
        const inventoryQuery = query(
            collection(this.firestore, 'inventoryTransactions'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(inventoryQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    this.processInventoryChange(change.doc.data());
                }
            });
        });

        this.realTimeListeners.set('inventory', unsubscribe);
        console.log('📊 Inventory listener active');
    }

    setupDocumentListener() {
        const documentsQuery = query(
            collection(this.firestore, 'partnerDocuments'),
            where('status', '==', 'pending')
        );

        const unsubscribe = onSnapshot(documentsQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    this.processDocumentUpload(change.doc.data());
                }
            });
        });

        this.realTimeListeners.set('documents', unsubscribe);
        console.log('📄 Document listener active');
    }

    // Process new partner registration
    async processNewPartnerRegistration(partnerData) {
        try {
            console.log('🆕 Processing new partner registration:', partnerData.email);

            // Add to processing queue
            this.processingQueue.push({
                type: 'partner_registration',
                data: partnerData,
                timestamp: Date.now()
            });

            // Create notification for admin
            await this.createNotification({
                userId: 'admin', // Notify all admins
                type: 'partner_signup',
                title: 'New Partner Registration',
                message: `${partnerData.companyName} has registered for partnership`,
                data: JSON.stringify({
                    partnerId: partnerData.id,
                    companyName: partnerData.companyName,
                    email: partnerData.email
                })
            });

            // Update partner count in system stats
            await this.updateSystemStats('partner_count', 'increment');

            console.log('✅ Partner registration processed');
        } catch (error) {
            console.error('❌ Partner registration processing failed:', error);
        }
    }

    // Process new order
    async processNewOrder(orderData) {
        try {
            console.log('🆕 Processing new order:', orderData.orderNumber);

            // Add to processing queue
            this.processingQueue.push({
                type: 'new_order',
                data: orderData,
                timestamp: Date.now()
            });

            // Update inventory
            await this.updateInventoryForOrder(orderData);

            // Create notifications
            await this.createOrderNotifications(orderData);

            // Update order count in system stats
            await this.updateSystemStats('order_count', 'increment');

            console.log('✅ New order processed');
        } catch (error) {
            console.error('❌ New order processing failed:', error);
        }
    }

    // Process order status updates
    async processOrderUpdate(orderData, isPendingWrite = false) {
        if (isPendingWrite) return; // Skip pending writes

        try {
            console.log('📝 Processing order update:', orderData.orderNumber, orderData.status);

            // Add to processing queue
            this.processingQueue.push({
                type: 'order_update',
                data: orderData,
                timestamp: Date.now()
            });

            // Create status update notification
            await this.createNotification({
                userId: orderData.partnerId,
                type: 'order_update',
                title: 'Order Status Updated',
                message: `Order ${orderData.orderNumber} status changed to ${orderData.status}`,
                data: JSON.stringify({
                    orderId: orderData.id,
                    orderNumber: orderData.orderNumber,
                    status: orderData.status
                })
            });

            // If order is completed, update partner stats
            if (orderData.status === 'delivered') {
                await this.updatePartnerStats(orderData.partnerId, 'completed_orders', 'increment');
            }

            console.log('✅ Order update processed');
        } catch (error) {
            console.error('❌ Order update processing failed:', error);
        }
    }

    // Process product updates
    async processProductUpdate(productData) {
        try {
            console.log('🛍️ Processing product update:', productData.name);

            // Add to processing queue
            this.processingQueue.push({
                type: 'product_update',
                data: productData,
                timestamp: Date.now()
            });

            // Notify partners about product changes
            await this.notifyPartnersAboutProductChange(productData);

            // Update product stats
            await this.updateProductStats(productData.id, productData);

            console.log('✅ Product update processed');
        } catch (error) {
            console.error('❌ Product update processing failed:', error);
        }
    }

    // Process inventory changes
    async processInventoryChange(transactionData) {
        try {
            console.log('📊 Processing inventory change:', transactionData.type);

            // Add to processing queue
            this.processingQueue.push({
                type: 'inventory_change',
                data: transactionData,
                timestamp: Date.now()
            });

            // Check for low stock alerts
            if (transactionData.newStock <= 10) {
                await this.createLowStockAlert(transactionData);
            }

            // Update inventory stats
            await this.updateInventoryStats(transactionData);

            console.log('✅ Inventory change processed');
        } catch (error) {
            console.error('❌ Inventory change processing failed:', error);
        }
    }

    // Process document uploads
    async processDocumentUpload(documentData) {
        try {
            console.log('📄 Processing document upload:', documentData.fileName);

            // Add to processing queue
            this.processingQueue.push({
                type: 'document_upload',
                data: documentData,
                timestamp: Date.now()
            });

            // Notify admins about new document
            await this.createNotification({
                userId: 'admin',
                type: 'document_upload',
                title: 'New Document Uploaded',
                message: `${documentData.documentType} document uploaded by partner`,
                data: JSON.stringify({
                    documentId: documentData.id,
                    partnerId: documentData.partnerId,
                    documentType: documentData.documentType,
                    fileName: documentData.fileName
                })
            });

            console.log('✅ Document upload processed');
        } catch (error) {
            console.error('❌ Document upload processing failed:', error);
        }
    }

    // Update inventory for order
    async updateInventoryForOrder(orderData) {
        try {
            // Get order items from Firestore
            const orderItemsSnapshot = await getDocs(
                query(collection(this.firestore, 'orderItems'), where('orderId', '==', orderData.id))
            );

            for (const itemDoc of orderItemsSnapshot.docs) {
                const itemData = itemDoc.data();
                
                // Update product stock
                const productRef = doc(this.firestore, 'products', itemData.productId);
                await updateDoc(productRef, {
                    stockQuantity: increment(-itemData.quantity),
                    updatedAt: serverTimestamp()
                });

                // Create inventory transaction
                await addDoc(collection(this.firestore, 'inventoryTransactions'), {
                    productId: itemData.productId,
                    type: 'sale',
                    quantity: -itemData.quantity,
                    orderId: orderData.id,
                    reason: `Order ${orderData.orderNumber}`,
                    createdBy: orderData.partnerId,
                    createdAt: serverTimestamp()
                });
            }
        } catch (error) {
            console.error('❌ Inventory update failed:', error);
        }
    }

    // Create order notifications
    async createOrderNotifications(orderData) {
        try {
            // Notify partner
            await this.createNotification({
                userId: orderData.partnerId,
                type: 'order_created',
                title: 'Order Confirmed',
                message: `Order ${orderData.orderNumber} has been confirmed`,
                data: JSON.stringify({
                    orderId: orderData.id,
                    orderNumber: orderData.orderNumber,
                    totalAmount: orderData.totalAmount
                })
            });

            // Notify admin
            await this.createNotification({
                userId: 'admin',
                type: 'new_order',
                title: 'New Order Received',
                message: `New order ${orderData.orderNumber} from ${orderData.partnerId}`,
                data: JSON.stringify({
                    orderId: orderData.id,
                    orderNumber: orderData.orderNumber,
                    partnerId: orderData.partnerId,
                    totalAmount: orderData.totalAmount
                })
            });
        } catch (error) {
            console.error('❌ Order notification creation failed:', error);
        }
    }

    // Notify partners about product changes
    async notifyPartnersAboutProductChange(productData) {
        try {
            // Get all active partners
            const partnersSnapshot = await getDocs(
                query(collection(this.firestore, 'users'), where('role', '==', 'partner'), where('status', '==', 'approved'))
            );

            for (const partnerDoc of partnersSnapshot.docs) {
                const partnerData = partnerDoc.data();
                
                await this.createNotification({
                    userId: partnerData.id,
                    type: 'product_change',
                    title: 'Product Updated',
                    message: `${productData.name} has been updated`,
                    data: JSON.stringify({
                        productId: productData.id,
                        productName: productData.name,
                        changes: {
                            price: productData.price,
                            stock: productData.stockQuantity,
                            status: productData.status
                        }
                    })
                });
            }
        } catch (error) {
            console.error('❌ Partner notification failed:', error);
        }
    }

    // Create low stock alert
    async createLowStockAlert(transactionData) {
        try {
            await this.createNotification({
                userId: 'admin',
                type: 'low_stock',
                title: 'Low Stock Alert',
                message: `Product ${transactionData.productId} is running low on stock (${transactionData.newStock} remaining)`,
                data: JSON.stringify({
                    productId: transactionData.productId,
                    currentStock: transactionData.newStock,
                    threshold: 10
                })
            });
        } catch (error) {
            console.error('❌ Low stock alert creation failed:', error);
        }
    }

    // Create notification
    async createNotification(notificationData) {
        try {
            await addDoc(collection(this.firestore, 'notifications'), {
                ...notificationData,
                read: false,
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error('❌ Notification creation failed:', error);
        }
    }

    // Update system stats
    async updateSystemStats(statName, operation) {
        try {
            const statsRef = doc(this.firestore, 'systemStats', statName);
            await updateDoc(statsRef, {
                value: increment(operation === 'increment' ? 1 : -1),
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error('❌ System stats update failed:', error);
        }
    }

    // Update partner stats
    async updatePartnerStats(partnerId, statName, operation) {
        try {
            const partnerStatsRef = doc(this.firestore, 'partnerStats', partnerId);
            await updateDoc(partnerStatsRef, {
                [statName]: increment(operation === 'increment' ? 1 : -1),
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error('❌ Partner stats update failed:', error);
        }
    }

    // Update product stats
    async updateProductStats(productId, productData) {
        try {
            const productStatsRef = doc(this.firestore, 'productStats', productId);
            await setDoc(productStatsRef, {
                lastUpdated: serverTimestamp(),
                currentStock: productData.stockQuantity,
                currentPrice: productData.price,
                status: productData.status
            }, { merge: true });
        } catch (error) {
            console.error('❌ Product stats update failed:', error);
        }
    }

    // Update inventory stats
    async updateInventoryStats(transactionData) {
        try {
            const inventoryStatsRef = doc(this.firestore, 'inventoryStats', 'overall');
            await updateDoc(inventoryStatsRef, {
                totalTransactions: increment(1),
                lastTransaction: serverTimestamp(),
                [`${transactionData.type}Count`]: increment(1)
            });
        } catch (error) {
            console.error('❌ Inventory stats update failed:', error);
        }
    }

    // Processing loop for queued operations
    startProcessingLoop() {
        setInterval(() => {
            if (this.processingQueue.length > 0 && !this.isProcessing) {
                this.processQueue();
            }
        }, 1000); // Process every second
    }

    async processQueue() {
        this.isProcessing = true;

        while (this.processingQueue.length > 0) {
            const item = this.processingQueue.shift();
            
            try {
                await this.processQueueItem(item);
            } catch (error) {
                console.error('❌ Queue item processing failed:', error);
                // Re-add to queue for retry
                this.processingQueue.push(item);
            }
        }

        this.isProcessing = false;
    }

    async processQueueItem(item) {
        switch (item.type) {
            case 'partner_registration':
                await this.handlePartnerRegistration(item.data);
                break;
            case 'new_order':
                await this.handleNewOrder(item.data);
                break;
            case 'order_update':
                await this.handleOrderUpdate(item.data);
                break;
            case 'product_update':
                await this.handleProductUpdate(item.data);
                break;
            case 'inventory_change':
                await this.handleInventoryChange(item.data);
                break;
            case 'document_upload':
                await this.handleDocumentUpload(item.data);
                break;
            default:
                console.warn('⚠️ Unknown queue item type:', item.type);
        }
    }

    // Handle partner registration
    async handlePartnerRegistration(data) {
        // Additional processing logic for partner registration
        console.log('👥 Handling partner registration:', data.email);
    }

    // Handle new order
    async handleNewOrder(data) {
        // Additional processing logic for new orders
        console.log('📦 Handling new order:', data.orderNumber);
    }

    // Handle order update
    async handleOrderUpdate(data) {
        // Additional processing logic for order updates
        console.log('📝 Handling order update:', data.orderNumber);
    }

    // Handle product update
    async handleProductUpdate(data) {
        // Additional processing logic for product updates
        console.log('🛍️ Handling product update:', data.name);
    }

    // Handle inventory change
    async handleInventoryChange(data) {
        // Additional processing logic for inventory changes
        console.log('📊 Handling inventory change:', data.type);
    }

    // Handle document upload
    async handleDocumentUpload(data) {
        // Additional processing logic for document uploads
        console.log('📄 Handling document upload:', data.fileName);
    }

    // Cleanup listeners
    cleanup() {
        this.realTimeListeners.forEach((unsubscribe) => {
            unsubscribe();
        });
        this.realTimeListeners.clear();
        console.log('🧹 Dynamic data processor cleaned up');
    }

    // Get processing status
    getStatus() {
        return {
            isProcessing: this.isProcessing,
            queueLength: this.processingQueue.length,
            activeListeners: this.realTimeListeners.size,
            firebaseReady: !!this.firebaseApp,
            dataConnectReady: !!this.dataConnect
        };
    }
}

// Initialize the dynamic data processor
window.dynamicDataProcessor = new DynamicDataProcessor();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DynamicDataProcessor;
}
