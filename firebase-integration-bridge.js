// Firebase Integration Bridge for Faded Skies Portal - Production Version
// All data processing goes through Firebase - no localStorage fallback

class FirebaseIntegrationBridge {
    constructor() {
        this.firebase = null;
        this.db = null;
        this.auth = null;
        this.isOnline = navigator.onLine;
        this.isFirebaseReady = false;
        
        this.init();
    }

    async init() {
        console.log('🔄 Initializing Firebase Integration Bridge (Production Mode)...');
        
        try {
            // Load Firebase from CDN
            await this.loadFirebaseFromCDN();
            
            if (this.isFirebaseReady) {
                console.log('✅ Firebase loaded successfully - live mode active');
                this.setupFirebaseListeners();
                this.integrateWithExistingSystems();
            } else {
                console.error('❌ Firebase initialization failed - cannot operate without Firebase');
                throw new Error('Firebase is required for production mode');
            }
            
        } catch (error) {
            console.error('❌ Firebase initialization failed:', error);
            this.showNotification('Firebase connection required for live portal operation', 'error');
        }
    }

    async loadFirebaseFromCDN() {
        try {
            // Load Firebase scripts dynamically if not already loaded
            if (!window.firebase) {
                await this.loadScript('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
                await this.loadScript('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js');
                await this.loadScript('https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js');
            }

            if (window.firebase) {
                // Firebase configuration
                const firebaseConfig = {
                    apiKey: "AIzaSyD5Q45_-o5iZcsHeoWEwsQLtVC_A9Z8ixo",
                    authDomain: "wholesale-95ceb.firebaseapp.com",
                    projectId: "wholesale-95ceb",
                    storageBucket: "wholesale-95ceb.firebasestorage.app",
                    messagingSenderId: "719478576563",
                    appId: "1:719478576563:web:c4e06fbd5e59882f86a7c6",
                    measurementId: "G-Z3RXB38R19"
                };

                // Initialize Firebase
                this.firebase = window.firebase.initializeApp(firebaseConfig);
                this.db = window.firebase.firestore();
                this.auth = window.firebase.auth();
                
                this.isFirebaseReady = true;
                console.log('🔥 Firebase initialized successfully');
                
                return true;
            }
        } catch (error) {
            console.error('Firebase CDN loading failed:', error);
            return false;
        }
        
        return false;
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    setupFirebaseListeners() {
        if (!this.isFirebaseReady) return;

        // Listen for authentication state changes
        this.auth.onAuthStateChanged((user) => {
            console.log('🔐 Firebase auth state changed:', user ? user.email : 'logged out');
            
            // Notify the existing system
            window.dispatchEvent(new CustomEvent('firebaseAuthChanged', {
                detail: { user }
            }));
        });

        // Listen for connection state
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('🌐 Connection restored - Firebase operations resumed');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('📡 Connection lost - Firebase operations will queue');
        });
    }

    integrateWithExistingSystems() {
        // Enhance the existing SharedDataManager with Firebase capabilities
        if (window.sharedDataManager) {
            this.enhanceSharedDataManager();
        }

        // Enhance cart system
        if (window.cartManager) {
            this.enhanceCartManager();
        }

        // Set up order processing
        this.setupOrderProcessing();
        
        // Set up business applications
        this.setupBusinessApplications();
    }

    enhanceSharedDataManager() {
        const originalManager = window.sharedDataManager;
        
        // Override methods to use Firebase exclusively
        originalManager.addOrder = async (orderData) => {
            if (!this.isFirebaseReady) {
                throw new Error('Firebase connection required for order processing');
            }
            
            const result = await this.addOrderToFirebase(orderData);
            console.log('📦 Order added to Firebase:', result.id);
            return result;
        };

        originalManager.updateProduct = async (productId, updates) => {
            if (!this.isFirebaseReady) {
                throw new Error('Firebase connection required for product updates');
            }
            
            await this.updateProductInFirebase(productId, updates);
            console.log('📦 Product updated in Firebase:', productId);
            return true;
        };

        originalManager.getOrders = async () => {
            if (!this.isFirebaseReady) {
                throw new Error('Firebase connection required');
            }
            
            const snapshot = await this.db.collection('orders')
                .orderBy('createdAt', 'desc')
                .get();
            
            const orders = [];
            snapshot.forEach((doc) => {
                orders.push({ id: doc.id, ...doc.data() });
            });
            
            return orders;
        };

        originalManager.getProducts = async () => {
            if (!this.isFirebaseReady) {
                throw new Error('Firebase connection required');
            }
            
            const snapshot = await this.db.collection('products').get();
            const products = [];
            snapshot.forEach((doc) => {
                products.push({ id: doc.id, ...doc.data() });
            });
            
            return products;
        };

        console.log('✅ SharedDataManager enhanced with Firebase-only capabilities');
    }

    enhanceCartManager() {
        const originalManager = window.cartManager;
        
        // Override processOrder to use Firebase exclusively
        originalManager.processOrder = async () => {
            if (!this.isFirebaseReady) {
                throw new Error('Firebase connection required for order processing');
            }
            
            return await this.processOrderThroughFirebase();
        };

        console.log('✅ CartManager enhanced with Firebase-only capabilities');
    }

    async addOrderToFirebase(orderData) {
        if (!this.isFirebaseReady) throw new Error('Firebase not ready');

        const order = {
            ...orderData,
            createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
            lastModified: window.firebase.firestore.FieldValue.serverTimestamp(),
            status: orderData.status || 'PENDING'
        };

        const docRef = await this.db.collection('orders').add(order);
        
        // Send admin notification
        await this.sendAdminNotification('new_order', {
            orderId: docRef.id,
            partnerEmail: order.partnerEmail,
            total: order.total
        });

        return { id: docRef.id, ...order };
    }

    async updateProductInFirebase(productId, updates) {
        if (!this.isFirebaseReady) throw new Error('Firebase not ready');

        const updateData = {
            ...updates,
            lastModified: window.firebase.firestore.FieldValue.serverTimestamp()
        };

        await this.db.collection('products').doc(productId).update(updateData);
        return true;
    }

    async processOrderThroughFirebase() {
        if (!window.cartManager || !window.cartManager.cart) {
            throw new Error('No cart data available');
        }

        const cart = window.cartManager.cart;
        const totals = window.cartManager.getTotals();
        const currentUser = window.currentUser;

        if (!currentUser) {
            throw new Error('User not authenticated');
        }

        const orderData = {
            partnerEmail: currentUser.email,
            partnerName: currentUser.name || 'Partner',
            items: cart.map(item => ({
                productId: item.id,
                strain: item.strain,
                grade: item.grade,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.price * item.quantity
            })),
            itemsSummary: cart.map(item => `${item.strain} (x${item.quantity})`).join(', '),
            subtotal: totals.subtotal,
            shipping: totals.shipping,
            total: totals.total,
            status: 'PENDING',
            paymentStatus: 'PAID'
        };

        return await this.addOrderToFirebase(orderData);
    }

    async sendAdminNotification(type, data) {
        if (!this.isFirebaseReady) return;

        try {
            const notification = {
                type,
                data,
                read: false,
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
            };

            await this.db.collection('admin_notifications').add(notification);
            console.log('📢 Admin notification sent:', type);
        } catch (error) {
            console.warn('Failed to send admin notification:', error);
        }
    }

    setupOrderProcessing() {
        // Listen for real-time order updates
        if (this.isFirebaseReady) {
            this.db.collection('orders')
                .orderBy('createdAt', 'desc')
                .limit(50)
                .onSnapshot((snapshot) => {
                    const orders = [];
                    snapshot.forEach((doc) => {
                        orders.push({ id: doc.id, ...doc.data() });
                    });
                    
                    console.log('📋 Orders updated from Firebase:', orders.length);
                    
                    // Update the existing system
                    if (window.updateOrdersDisplay) {
                        window.updateOrdersDisplay();
                    }
                });
        }
    }

    setupBusinessApplications() {
        // Override business application submission
        window.submitBusinessApplication = async (formData) => {
            if (!this.isFirebaseReady) {
                throw new Error('Firebase connection required for application submission');
            }
            
            return await this.submitApplicationToFirebase(formData);
        };
    }

    async submitApplicationToFirebase(formData) {
        if (!this.isFirebaseReady) throw new Error('Firebase not ready');

        const application = {
            ...formData,
            status: 'pending',
            submittedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
            lastModified: window.firebase.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await this.db.collection('applications').add(application);
        
        // Send admin notification
        await this.sendAdminNotification('new_application', {
            applicationId: docRef.id,
            businessName: application.businessName,
            contactEmail: application.businessEmail
        });

        if (window.showNotification) {
            window.showNotification(`🎉 Application submitted successfully! ID: ${docRef.id}`, 'success');
        }

        return { id: docRef.id, ...application };
    }

    // Get current status
    getStatus() {
        return {
            isFirebaseReady: this.isFirebaseReady,
            isOnline: this.isOnline,
            mode: 'firebase-production'
        };
    }

    // Utility method for notifications
    showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
}

// Initialize Firebase Integration Bridge
window.firebaseIntegrationBridge = new FirebaseIntegrationBridge();

// Update sync status indicator
function updateFirebaseSyncStatus() {
    const status = window.firebaseIntegrationBridge?.getStatus();
    if (!status) return;

    const syncIcon = document.getElementById('syncIcon');
    const syncText = document.getElementById('syncText');
    
    if (syncIcon && syncText) {
        if (status.isFirebaseReady) {
            syncIcon.textContent = '🔥';
            syncText.textContent = 'Firebase Live';
            syncIcon.parentElement.style.background = 'linear-gradient(135deg, var(--brand-green), var(--brand-green-light))';
        } else {
            syncIcon.textContent = '❌';
            syncText.textContent = 'Connecting...';
            syncIcon.parentElement.style.background = 'linear-gradient(135deg, var(--accent-red), #FF6666)';
        }
    }
}

// Update status periodically
setInterval(updateFirebaseSyncStatus, 5000);

// Show notification about the integration mode
setTimeout(() => {
    const status = window.firebaseIntegrationBridge?.getStatus();
    if (status && window.showNotification) {
        if (status.isFirebaseReady) {
            window.showNotification('🔥 Firebase production mode active - real-time processing enabled!', 'success');
        } else {
            window.showNotification('❌ Firebase connection required for portal operation', 'error');
        }
    }
}, 3000);

console.log('🔥 Firebase Integration Bridge initialized (Production Mode)');
