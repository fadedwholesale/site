// Firebase Dynamic Data Manager for Faded Skies Portal
// Real-time Firestore integration for orders, applications, and inventory

import { initializeApp } from 'firebase/app';
import { 
    getFirestore, 
    collection, 
    doc, 
    getDocs, 
    getDoc,
    addDoc, 
    updateDoc, 
    deleteDoc, 
    onSnapshot, 
    query, 
    where, 
    orderBy, 
    limit,
    serverTimestamp,
    writeBatch
} from 'firebase/firestore';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';

class FirebaseDataManager {
    constructor() {
        this.app = null;
        this.db = null;
        this.auth = null;
        this.unsubscribers = new Map();
        this.isInitialized = false;
        this.currentUser = null;
        
        this.init();
    }

    async init() {
        try {
            console.log('🔥 Initializing Firebase Dynamic Data Manager...');
            
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
            this.app = initializeApp(firebaseConfig);
            this.db = getFirestore(this.app);
            this.auth = getAuth(this.app);

            // Set up authentication state listener
            this.setupAuthListener();

            // Initialize collections
            await this.initializeCollections();

            this.isInitialized = true;
            console.log('✅ Firebase Dynamic Data Manager initialized successfully');
            
            // Notify other systems
            window.dispatchEvent(new CustomEvent('firebaseInitialized', { 
                detail: { manager: this } 
            }));

        } catch (error) {
            console.error('❌ Firebase initialization error:', error);
            throw error;
        }
    }

    setupAuthListener() {
        onAuthStateChanged(this.auth, (user) => {
            this.currentUser = user;
            console.log('🔐 Auth state changed:', user ? user.email : 'logged out');
            
            // Notify app of auth state change
            window.dispatchEvent(new CustomEvent('firebaseAuthChanged', {
                detail: { user }
            }));
        });
    }

    async initializeCollections() {
        try {
            // Initialize with sample data if collections are empty
            await this.initializeProducts();
            await this.initializeSystemSettings();
        } catch (error) {
            console.error('Error initializing collections:', error);
        }
    }

    async initializeProducts() {
        const productsRef = collection(this.db, 'products');
        const snapshot = await getDocs(productsRef);
        
        if (snapshot.empty) {
            console.log('📦 Initializing products collection...');
            
            const sampleProducts = [
                {
                    grade: "A-GRADE",
                    strain: "Zkittlez",
                    thca: 29.8,
                    price: 950,
                    status: "AVAILABLE",
                    stock: 15,
                    type: "Indica-Hybrid",
                    image: "https://images.unsplash.com/photo-1610234815282-a78e82bbde8e?w=300&h=300&fit=crop&crop=center",
                    description: "Premium indoor grown Zkittlez with tropical fruit flavors and potent THCA levels",
                    createdAt: serverTimestamp(),
                    lastModified: serverTimestamp()
                },
                {
                    grade: "A-GRADE",
                    strain: "Banana Runtz",
                    thca: 31.2,
                    price: 1050,
                    status: "AVAILABLE",
                    stock: 22,
                    type: "Hybrid",
                    image: "https://images.unsplash.com/photo-1605069876632-6e30ff47b8bd?w=300&h=300&fit=crop&crop=center",
                    description: "Exotic Banana Runtz phenotype with sweet banana terps and exceptional bag appeal",
                    createdAt: serverTimestamp(),
                    lastModified: serverTimestamp()
                },
                {
                    grade: "ROSIN",
                    strain: "Live Rosin - Papaya",
                    thca: 82.6,
                    price: 45,
                    status: "AVAILABLE",
                    stock: 8,
                    type: "Concentrate",
                    image: "https://images.unsplash.com/photo-1644845499871-2b9c93cf69f5?w=300&h=300&fit=crop&crop=center",
                    description: "Solventless live rosin from fresh frozen Papaya buds with tropical terps",
                    createdAt: serverTimestamp(),
                    lastModified: serverTimestamp()
                }
            ];

            const batch = writeBatch(this.db);
            sampleProducts.forEach((product) => {
                const docRef = doc(collection(this.db, 'products'));
                batch.set(docRef, product);
            });
            
            await batch.commit();
            console.log('✅ Sample products added to Firestore');
        }
    }

    async initializeSystemSettings() {
        const settingsRef = doc(this.db, 'system', 'settings');
        const snapshot = await getDoc(settingsRef);
        
        if (!snapshot.exists()) {
            console.log('⚙️ Initializing system settings...');
            
            const defaultSettings = {
                companyName: 'Faded Skies',
                tagline: 'Premium THCA Wholesale',
                logos: {
                    main: 'https://cdn.builder.io/api/v1/image/assets%2F9ee94cd3e5524451b5a43eae8f0b9627%2F2a1db2e6b6bc4987bc3bab24606d5f80?format=webp&width=800',
                    favicon: '',
                    adminHeader: 'https://cdn.builder.io/api/v1/image/assets%2F9ee94cd3e5524451b5a43eae8f0b9627%2F2a1db2e6b6bc4987bc3bab24606d5f80?format=webp&width=800',
                    partnerHeader: 'https://cdn.builder.io/api/v1/image/assets%2F9ee94cd3e5524451b5a43eae8f0b9627%2F2a1db2e6b6bc4987bc3bab24606d5f80?format=webp&width=800'
                },
                createdAt: serverTimestamp(),
                lastModified: serverTimestamp()
            };
            
            await updateDoc(settingsRef, defaultSettings);
            console.log('✅ System settings initialized');
        }
    }

    // PRODUCTS MANAGEMENT
    async getProducts() {
        try {
            const productsRef = collection(this.db, 'products');
            const q = query(productsRef, orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            
            const products = [];
            snapshot.forEach((doc) => {
                products.push({ id: doc.id, ...doc.data() });
            });
            
            return products;
        } catch (error) {
            console.error('Error getting products:', error);
            return [];
        }
    }

    subscribeToProducts(callback) {
        const productsRef = collection(this.db, 'products');
        const q = query(productsRef, orderBy('createdAt', 'desc'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const products = [];
            snapshot.forEach((doc) => {
                products.push({ id: doc.id, ...doc.data() });
            });
            
            console.log('📦 Products updated from Firestore:', products.length);
            callback(products);
        }, (error) => {
            console.error('Products subscription error:', error);
        });
        
        this.unsubscribers.set('products', unsubscribe);
        return unsubscribe;
    }

    async addProduct(product) {
        try {
            const productData = {
                ...product,
                createdAt: serverTimestamp(),
                lastModified: serverTimestamp()
            };
            
            const docRef = await addDoc(collection(this.db, 'products'), productData);
            console.log('✅ Product added to Firestore:', docRef.id);
            
            // Broadcast real-time update
            this.broadcastUpdate('product_added', { id: docRef.id, ...productData });
            
            return { id: docRef.id, ...productData };
        } catch (error) {
            console.error('Error adding product:', error);
            throw error;
        }
    }

    async updateProduct(productId, updates) {
        try {
            const productRef = doc(this.db, 'products', productId);
            const updateData = {
                ...updates,
                lastModified: serverTimestamp()
            };
            
            await updateDoc(productRef, updateData);
            console.log('✅ Product updated in Firestore:', productId);
            
            // Broadcast real-time update
            this.broadcastUpdate('product_updated', { id: productId, ...updateData });
            
            return true;
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    }

    async deleteProduct(productId) {
        try {
            await deleteDoc(doc(this.db, 'products', productId));
            console.log('✅ Product deleted from Firestore:', productId);
            
            // Broadcast real-time update
            this.broadcastUpdate('product_deleted', { id: productId });
            
            return true;
        } catch (error) {
            console.error('Error deleting product:', error);
            throw error;
        }
    }

    // ORDERS MANAGEMENT
    async getOrders(partnerEmail = null) {
        try {
            const ordersRef = collection(this.db, 'orders');
            let q;
            
            if (partnerEmail) {
                q = query(ordersRef, where('partnerEmail', '==', partnerEmail), orderBy('createdAt', 'desc'));
            } else {
                q = query(ordersRef, orderBy('createdAt', 'desc'));
            }
            
            const snapshot = await getDocs(q);
            const orders = [];
            
            snapshot.forEach((doc) => {
                orders.push({ id: doc.id, ...doc.data() });
            });
            
            return orders;
        } catch (error) {
            console.error('Error getting orders:', error);
            return [];
        }
    }

    subscribeToOrders(callback, partnerEmail = null) {
        const ordersRef = collection(this.db, 'orders');
        let q;
        
        if (partnerEmail) {
            q = query(ordersRef, where('partnerEmail', '==', partnerEmail), orderBy('createdAt', 'desc'));
        } else {
            q = query(ordersRef, orderBy('createdAt', 'desc'));
        }
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const orders = [];
            snapshot.forEach((doc) => {
                orders.push({ id: doc.id, ...doc.data() });
            });
            
            console.log('📋 Orders updated from Firestore:', orders.length);
            callback(orders);
        }, (error) => {
            console.error('Orders subscription error:', error);
        });
        
        const key = partnerEmail ? `orders_${partnerEmail}` : 'orders_all';
        this.unsubscribers.set(key, unsubscribe);
        return unsubscribe;
    }

    async addOrder(orderData) {
        try {
            const order = {
                ...orderData,
                createdAt: serverTimestamp(),
                lastModified: serverTimestamp(),
                status: orderData.status || 'PENDING',
                priority: orderData.total > 1000 ? 'HIGH' : 'NORMAL'
            };
            
            const docRef = await addDoc(collection(this.db, 'orders'), order);
            console.log('✅ Order added to Firestore:', docRef.id);
            
            // Update inventory immediately
            await this.updateInventoryAfterOrder(order.items);
            
            // Broadcast real-time update
            this.broadcastUpdate('order_added', { id: docRef.id, ...order });
            
            // Send admin notification
            await this.sendAdminNotification('new_order', {
                orderId: docRef.id,
                partnerEmail: order.partnerEmail,
                total: order.total,
                priority: order.priority
            });
            
            return { id: docRef.id, ...order };
        } catch (error) {
            console.error('Error adding order:', error);
            throw error;
        }
    }

    async updateOrder(orderId, updates) {
        try {
            const orderRef = doc(this.db, 'orders', orderId);
            const updateData = {
                ...updates,
                lastModified: serverTimestamp()
            };
            
            await updateDoc(orderRef, updateData);
            console.log('✅ Order updated in Firestore:', orderId);
            
            // Broadcast real-time update
            this.broadcastUpdate('order_updated', { id: orderId, ...updateData });
            
            return true;
        } catch (error) {
            console.error('Error updating order:', error);
            throw error;
        }
    }

    async updateInventoryAfterOrder(orderItems) {
        try {
            const batch = writeBatch(this.db);
            
            for (const item of orderItems) {
                const productRef = doc(this.db, 'products', item.productId);
                const productDoc = await getDoc(productRef);
                
                if (productDoc.exists()) {
                    const currentStock = productDoc.data().stock || 0;
                    const newStock = Math.max(0, currentStock - item.quantity);
                    const newStatus = newStock === 0 ? 'SOLD OUT' : 'AVAILABLE';
                    
                    batch.update(productRef, {
                        stock: newStock,
                        status: newStatus,
                        lastModified: serverTimestamp()
                    });
                }
            }
            
            await batch.commit();
            console.log('✅ Inventory updated after order');
        } catch (error) {
            console.error('Error updating inventory:', error);
        }
    }

    // BUSINESS APPLICATIONS MANAGEMENT
    async submitBusinessApplication(applicationData) {
        try {
            const application = {
                ...applicationData,
                status: 'pending',
                submittedAt: serverTimestamp(),
                lastModified: serverTimestamp()
            };
            
            const docRef = await addDoc(collection(this.db, 'applications'), application);
            console.log('✅ Business application submitted to Firestore:', docRef.id);
            
            // Send admin notification
            await this.sendAdminNotification('new_application', {
                applicationId: docRef.id,
                businessName: application.businessName,
                contactEmail: application.businessEmail
            });
            
            // Broadcast real-time update
            this.broadcastUpdate('application_submitted', { id: docRef.id, ...application });
            
            return { id: docRef.id, ...application };
        } catch (error) {
            console.error('Error submitting application:', error);
            throw error;
        }
    }

    async getBusinessApplications(status = null) {
        try {
            const applicationsRef = collection(this.db, 'applications');
            let q;
            
            if (status) {
                q = query(applicationsRef, where('status', '==', status), orderBy('submittedAt', 'desc'));
            } else {
                q = query(applicationsRef, orderBy('submittedAt', 'desc'));
            }
            
            const snapshot = await getDocs(q);
            const applications = [];
            
            snapshot.forEach((doc) => {
                applications.push({ id: doc.id, ...doc.data() });
            });
            
            return applications;
        } catch (error) {
            console.error('Error getting applications:', error);
            return [];
        }
    }

    subscribeToApplications(callback, status = null) {
        const applicationsRef = collection(this.db, 'applications');
        let q;
        
        if (status) {
            q = query(applicationsRef, where('status', '==', status), orderBy('submittedAt', 'desc'));
        } else {
            q = query(applicationsRef, orderBy('submittedAt', 'desc'));
        }
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const applications = [];
            snapshot.forEach((doc) => {
                applications.push({ id: doc.id, ...doc.data() });
            });
            
            console.log('📝 Applications updated from Firestore:', applications.length);
            callback(applications);
        }, (error) => {
            console.error('Applications subscription error:', error);
        });
        
        const key = status ? `applications_${status}` : 'applications_all';
        this.unsubscribers.set(key, unsubscribe);
        return unsubscribe;
    }

    async updateApplicationStatus(applicationId, status, notes = '') {
        try {
            const applicationRef = doc(this.db, 'applications', applicationId);
            const updateData = {
                status,
                notes,
                reviewedAt: serverTimestamp(),
                lastModified: serverTimestamp()
            };
            
            await updateDoc(applicationRef, updateData);
            console.log('✅ Application status updated:', applicationId, status);
            
            // Broadcast real-time update
            this.broadcastUpdate('application_status_updated', { 
                id: applicationId, 
                status,
                notes 
            });
            
            return true;
        } catch (error) {
            console.error('Error updating application status:', error);
            throw error;
        }
    }

    // ADMIN NOTIFICATIONS
    async sendAdminNotification(type, data) {
        try {
            const notification = {
                type,
                data,
                read: false,
                createdAt: serverTimestamp()
            };
            
            const docRef = await addDoc(collection(this.db, 'admin_notifications'), notification);
            console.log('📢 Admin notification sent:', type);
            
            // Broadcast real-time notification
            this.broadcastUpdate('admin_notification', { id: docRef.id, ...notification });
            
            return { id: docRef.id, ...notification };
        } catch (error) {
            console.error('Error sending admin notification:', error);
        }
    }

    subscribeToAdminNotifications(callback) {
        const notificationsRef = collection(this.db, 'admin_notifications');
        const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(50));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifications = [];
            snapshot.forEach((doc) => {
                notifications.push({ id: doc.id, ...doc.data() });
            });
            
            console.log('🔔 Admin notifications updated:', notifications.length);
            callback(notifications);
        }, (error) => {
            console.error('Admin notifications subscription error:', error);
        });
        
        this.unsubscribers.set('admin_notifications', unsubscribe);
        return unsubscribe;
    }

    // AUTHENTICATION
    async signInUser(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            console.log('✅ User signed in:', userCredential.user.email);
            return userCredential.user;
        } catch (error) {
            console.error('Sign in error:', error);
            throw error;
        }
    }

    async signUpUser(email, password, userData) {
        try {
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            
            // Save additional user data
            const userRef = doc(this.db, 'users', userCredential.user.uid);
            await updateDoc(userRef, {
                ...userData,
                email,
                createdAt: serverTimestamp()
            });
            
            console.log('✅ User created:', userCredential.user.email);
            return userCredential.user;
        } catch (error) {
            console.error('Sign up error:', error);
            throw error;
        }
    }

    async signOutUser() {
        try {
            await signOut(this.auth);
            console.log('✅ User signed out');
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    }

    // REAL-TIME UPDATES
    broadcastUpdate(type, data) {
        window.dispatchEvent(new CustomEvent('firebaseDataUpdate', {
            detail: { type, data, timestamp: new Date().toISOString() }
        }));
    }

    // ANALYTICS
    async getAnalytics() {
        try {
            const [products, orders, applications] = await Promise.all([
                this.getProducts(),
                this.getOrders(),
                this.getBusinessApplications()
            ]);
            
            const analytics = {
                totalProducts: products.length,
                availableProducts: products.filter(p => p.status === 'AVAILABLE').length,
                totalOrders: orders.length,
                pendingOrders: orders.filter(o => o.status === 'PENDING').length,
                totalRevenue: orders.reduce((sum, order) => sum + (order.total || 0), 0),
                pendingApplications: applications.filter(a => a.status === 'pending').length,
                lastUpdated: new Date().toISOString()
            };
            
            return analytics;
        } catch (error) {
            console.error('Error getting analytics:', error);
            return {};
        }
    }

    // CLEANUP
    destroy() {
        console.log('🔥 Destroying Firebase subscriptions...');
        this.unsubscribers.forEach((unsubscribe) => {
            unsubscribe();
        });
        this.unsubscribers.clear();
    }
}

// Initialize Firebase Data Manager
window.firebaseDataManager = new FirebaseDataManager();

// Export for ES6 modules
export default FirebaseDataManager;
