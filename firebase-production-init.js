// Firebase Production Initialization for Faded Skies Portal
// Ensures all Firebase services are properly configured for production deployment
// No localhost dependencies - all data flows through Firebase

class FirebaseProductionManager {
    constructor() {
        this.isProduction = true;
        this.firebaseConfig = {
            apiKey: "AIzaSyD5Q45_-o5iZcsHeoWEwsQLtVC_A9Z8ixo",
            authDomain: "wholesale-95ceb.firebaseapp.com",
            projectId: "wholesale-95ceb",
            storageBucket: "wholesale-95ceb.firebasestorage.app",
            messagingSenderId: "719478576563",
            appId: "1:719478576563:web:c4e06fbd5e59882f86a7c6",
            measurementId: "G-Z3RXB38R19"
        };
        
        this.services = {
            app: null,
            db: null,
            auth: null,
            storage: null,
            analytics: null
        };
        
        this.connectionState = {
            online: navigator.onLine,
            firebaseReady: false,
            servicesInitialized: false,
            dataManagerReady: false
        };
        
        this.initialize();
    }

    async initialize() {
        console.log('🚀 Initializing Firebase for Production Deployment...');
        console.log('🌐 Environment: Production (No localhost dependencies)');
        
        try {
            // Step 1: Load Firebase SDK
            await this.loadFirebaseSDK();
            
            // Step 2: Initialize Firebase services
            await this.initializeFirebaseServices();
            
            // Step 3: Setup connection monitoring
            this.setupConnectionMonitoring();
            
            // Step 4: Initialize data manager
            await this.initializeDataManager();
            
            // Step 5: Setup real-time synchronization
            this.setupRealTimeSync();
            
            // Step 6: Initialize system integration
            this.initializeSystemIntegration();
            
            // Step 7: Validate all services
            await this.validateServices();
            
            console.log('✅ Firebase Production Manager initialized successfully');
            this.notifySystemReady();
            
        } catch (error) {
            console.error('❌ Firebase Production initialization failed:', error);
            this.handleInitializationError(error);
        }
    }

    async loadFirebaseSDK() {
        console.log('📦 Loading Firebase SDK from CDN...');
        
        const scripts = [
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage-compat.js',
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics-compat.js'
        ];

        for (const scriptUrl of scripts) {
            await this.loadScript(scriptUrl);
        }

        if (!window.firebase) {
            throw new Error('Firebase SDK failed to load');
        }

        console.log('✅ Firebase SDK loaded successfully');
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            // Check if script already exists
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.head.appendChild(script);
        });
    }

    async initializeFirebaseServices() {
        console.log('🔥 Initializing Firebase services...');
        
        try {
            // Initialize Firebase app
            this.services.app = window.firebase.initializeApp(this.firebaseConfig);
            console.log('✅ Firebase app initialized');

            // Initialize Firestore
            this.services.db = window.firebase.firestore();
            console.log('✅ Firestore initialized');

            // Initialize Authentication
            this.services.auth = window.firebase.auth();
            console.log('✅ Firebase Auth initialized');

            // Initialize Storage
            this.services.storage = window.firebase.storage();
            console.log('✅ Firebase Storage initialized');

            // Initialize Analytics (if available)
            try {
                this.services.analytics = window.firebase.analytics();
                console.log('✅ Firebase Analytics initialized');
            } catch (analyticsError) {
                console.log('⚠️ Firebase Analytics not available (optional)');
            }

            // Enable offline persistence for Firestore
            try {
                await this.services.db.enablePersistence();
                console.log('✅ Firestore offline persistence enabled');
            } catch (persistenceError) {
                console.log('⚠️ Firestore persistence already enabled or unavailable');
            }

            this.connectionState.servicesInitialized = true;
            this.connectionState.firebaseReady = true;

        } catch (error) {
            console.error('❌ Firebase services initialization failed:', error);
            throw error;
        }
    }

    setupConnectionMonitoring() {
        console.log('📡 Setting up connection monitoring...');

        // Monitor online/offline status
        window.addEventListener('online', () => {
            console.log('🌐 Connection restored');
            this.connectionState.online = true;
            this.handleConnectionChange();
        });

        window.addEventListener('offline', () => {
            console.log('📵 Connection lost - using offline persistence');
            this.connectionState.online = false;
            this.handleConnectionChange();
        });

        // Monitor Firestore connection state
        if (this.services.db) {
            this.services.db.enableNetwork().then(() => {
                console.log('✅ Firestore network enabled');
            });
        }
    }

    handleConnectionChange() {
        // Notify other systems about connection state changes
        window.dispatchEvent(new CustomEvent('firebaseConnectionChanged', {
            detail: {
                online: this.connectionState.online,
                firebaseReady: this.connectionState.firebaseReady
            }
        }));

        // Update UI indicators
        this.updateConnectionIndicators();
    }

    updateConnectionIndicators() {
        const syncIndicators = document.querySelectorAll('#syncStatus, .sync-indicator, .sync-status');
        
        syncIndicators.forEach(indicator => {
            if (this.connectionState.online && this.connectionState.firebaseReady) {
                indicator.textContent = '🔄 Synced with Firebase';
                indicator.style.color = '#00C851';
            } else if (!this.connectionState.online) {
                indicator.textContent = '📵 Offline Mode';
                indicator.style.color = '#FFA500';
            } else {
                indicator.textContent = '⏳ Connecting...';
                indicator.style.color = '#FFA500';
            }
        });
    }

    async initializeDataManager() {
        console.log('🔧 Initializing Firebase Data Manager...');

        // Wait for Firebase Data Manager to be available
        let attempts = 0;
        const maxAttempts = 30;

        while (!window.firebaseDataManager && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }

        if (window.firebaseDataManager) {
            // Ensure it's properly initialized
            if (!window.firebaseDataManager.isInitialized) {
                await new Promise(resolve => {
                    const checkInit = () => {
                        if (window.firebaseDataManager.isInitialized) {
                            resolve();
                        } else {
                            setTimeout(checkInit, 500);
                        }
                    };
                    checkInit();
                });
            }
            
            this.connectionState.dataManagerReady = true;
            console.log('✅ Firebase Data Manager ready');
        } else {
            console.log('⚠️ Firebase Data Manager not found, initializing basic version...');
            // Initialize basic Firebase operations
            this.initializeBasicFirebaseOperations();
        }
    }

    initializeBasicFirebaseOperations() {
        // Create basic Firebase operations for production
        window.firebaseOps = {
            db: this.services.db,
            auth: this.services.auth,
            storage: this.services.storage,
            
            // Basic operations
            addDocument: async (collection, data) => {
                const ref = await this.services.db.collection(collection).add(data);
                console.log(`✅ Added document to ${collection}:`, ref.id);
                return ref;
            },
            
            getDocuments: async (collection, limit = null) => {
                let query = this.services.db.collection(collection);
                if (limit) query = query.limit(limit);
                
                const snapshot = await query.get();
                const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                console.log(`✅ Retrieved ${docs.length} documents from ${collection}`);
                return docs;
            },
            
            updateDocument: async (collection, docId, updates) => {
                await this.services.db.collection(collection).doc(docId).update(updates);
                console.log(`✅ Updated document ${docId} in ${collection}`);
            }
        };
    }

    setupRealTimeSync() {
        console.log('📡 Setting up real-time synchronization...');

        // Initialize real-time sync if available
        if (window.RealTimeSync && !window.realTimeSync) {
            window.realTimeSync = new window.RealTimeSync();
            console.log('✅ Real-time sync initialized');
        }

        // Setup Firebase real-time listeners
        this.setupFirebaseListeners();
    }

    setupFirebaseListeners() {
        if (!this.services.db) return;

        // Listen for products changes
        this.services.db.collection('products').onSnapshot((snapshot) => {
            console.log('📦 Products collection updated');
            const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Notify other systems
            window.dispatchEvent(new CustomEvent('firebaseProductsUpdated', {
                detail: { products }
            }));
        });

        // Listen for applications changes
        this.services.db.collection('applications').onSnapshot((snapshot) => {
            console.log('📝 Applications collection updated');
            const applications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Notify other systems
            window.dispatchEvent(new CustomEvent('firebaseApplicationsUpdated', {
                detail: { applications }
            }));
        });

        // Listen for orders changes
        this.services.db.collection('orders').onSnapshot((snapshot) => {
            console.log('📋 Orders collection updated');
            const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Notify other systems
            window.dispatchEvent(new CustomEvent('firebaseOrdersUpdated', {
                detail: { orders }
            }));
        });
    }

    initializeSystemIntegration() {
        console.log('🔗 Initializing system integration...');

        // Replace localStorage operations with Firebase operations
        this.replaceLocalStorageOperations();

        // Initialize Firebase system integration if available
        if (window.FirebaseSystemIntegration && !window.firebaseSystemIntegration) {
            window.firebaseSystemIntegration = new window.FirebaseSystemIntegration();
            console.log('✅ Firebase System Integration initialized');
        }
    }

    replaceLocalStorageOperations() {
        // Override localStorage operations to use Firebase
        const originalSetItem = localStorage.setItem;
        const originalGetItem = localStorage.getItem;

        localStorage.setItem = (key, value) => {
            console.log(`⚠️ localStorage.setItem intercepted for key: ${key}`);
            console.log('🔄 Redirecting to Firebase storage...');
            
            // Allow certain keys for backwards compatibility
            const allowedKeys = ['userPreferences', 'theme', 'language'];
            if (allowedKeys.includes(key)) {
                return originalSetItem.call(localStorage, key, value);
            }
            
            // Redirect to Firebase for data storage
            if (this.services.db) {
                this.services.db.collection('appData').doc(key).set({
                    value: value,
                    timestamp: new Date()
                });
            }
        };

        localStorage.getItem = (key) => {
            console.log(`⚠️ localStorage.getItem intercepted for key: ${key}`);
            
            // Allow certain keys for backwards compatibility
            const allowedKeys = ['userPreferences', 'theme', 'language'];
            if (allowedKeys.includes(key)) {
                return originalGetItem.call(localStorage, key);
            }
            
            console.log('🔄 Data should be retrieved from Firebase instead');
            return null;
        };
    }

    async validateServices() {
        console.log('🔍 Validating Firebase services...');

        const validationResults = {
            app: !!this.services.app,
            firestore: !!this.services.db,
            auth: !!this.services.auth,
            storage: !!this.services.storage,
            connectivity: this.connectionState.online
        };

        // Test Firestore connectivity
        try {
            await this.services.db.collection('test').limit(1).get();
            validationResults.firestoreConnectivity = true;
            console.log('✅ Firestore connectivity test passed');
        } catch (error) {
            validationResults.firestoreConnectivity = false;
            console.log('❌ Firestore connectivity test failed:', error.message);
        }

        // Log validation results
        console.log('🔍 Validation Results:', validationResults);

        const allValid = Object.values(validationResults).every(result => result);
        if (allValid) {
            console.log('✅ All Firebase services validated successfully');
        } else {
            console.log('⚠️ Some Firebase services failed validation');
        }

        return validationResults;
    }

    notifySystemReady() {
        // Notify all systems that Firebase is ready
        window.dispatchEvent(new CustomEvent('firebaseProductionReady', {
            detail: {
                services: this.services,
                connectionState: this.connectionState,
                isProduction: this.isProduction
            }
        }));

        // Update global Firebase reference
        window.firebaseProductionManager = this;

        // Show success notification
        this.showNotification('🔥 Firebase Production Services Active', 'success');
    }

    handleInitializationError(error) {
        console.error('❌ Firebase Production initialization failed:', error);
        
        // Show error notification
        this.showNotification('❌ Firebase connection failed - some features may be limited', 'error');
        
        // Attempt fallback initialization
        this.initializeFallbackMode();
    }

    initializeFallbackMode() {
        console.log('🔄 Initializing fallback mode...');
        
        // Provide minimal functionality for critical operations
        window.firebaseFallback = {
            ready: false,
            error: true,
            message: 'Firebase services unavailable'
        };
    }

    showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    // Public methods for service access
    getService(serviceName) {
        return this.services[serviceName];
    }

    getConnectionState() {
        return this.connectionState;
    }

    isReady() {
        return this.connectionState.firebaseReady && this.connectionState.servicesInitialized;
    }
}

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
    console.log('🚀 Starting Firebase Production Manager...');
    window.firebaseProductionManager = new FirebaseProductionManager();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirebaseProductionManager;
}
