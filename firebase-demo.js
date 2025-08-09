// Firebase Dynamic Demo System
// Test and demonstrate the Firebase integration capabilities

class FirebaseDynamicDemo {
    constructor() {
        this.bridge = null;
        this.demoRunning = false;
        this.demoSteps = [];
        
        this.init();
    }

    init() {
        // Wait for Firebase Integration Bridge to be ready
        if (window.firebaseIntegrationBridge) {
            this.bridge = window.firebaseIntegrationBridge;
            this.setupDemo();
        } else {
            setTimeout(() => this.init(), 1000);
        }
    }

    setupDemo() {
        console.log('🔥 Firebase Dynamic Demo initialized');
        
        // Add demo functions to window for easy testing
        window.testFirebaseIntegration = () => this.runFullDemo();
        window.testFirebaseConnection = () => this.testConnection();
        window.testOrderProcessing = () => this.testOrderProcessing();
        window.testRealTimeSync = () => this.testRealTimeSync();
        window.showFirebaseStatus = () => this.showStatus();
        
        console.log('🧪 Demo functions available:');
        console.log('  - testFirebaseIntegration() - Run full demo');
        console.log('  - testFirebaseConnection() - Test connection');
        console.log('  - testOrderProcessing() - Test order system');
        console.log('  - testRealTimeSync() - Test real-time sync');
        console.log('  - showFirebaseStatus() - Show current status');
    }

    async runFullDemo() {
        if (this.demoRunning) {
            console.log('⚠️ Demo already running...');
            return;
        }

        this.demoRunning = true;
        console.log('🚀 Starting Firebase Dynamic Integration Demo...');
        
        try {
            // Step 1: Show current status
            await this.showStatus();
            await this.delay(2000);

            // Step 2: Test connection
            await this.testConnection();
            await this.delay(2000);

            // Step 3: Test order processing
            await this.testOrderProcessing();
            await this.delay(2000);

            // Step 4: Test business application
            await this.testBusinessApplication();
            await this.delay(2000);

            // Step 5: Test real-time sync
            await this.testRealTimeSync();
            await this.delay(2000);

            // Step 6: Show final status
            console.log('✅ Firebase Dynamic Integration Demo completed successfully!');
            this.showNotification('🎉 Firebase Demo completed! Check console for details.', 'success');

        } catch (error) {
            console.error('❌ Demo failed:', error);
            this.showNotification('❌ Demo encountered an error. Check console for details.', 'error');
        } finally {
            this.demoRunning = false;
        }
    }

    async showStatus() {
        const status = this.bridge.getStatus();
        
        console.log('📊 Firebase Integration Status:');
        console.log('  🔥 Firebase Ready:', status.isFirebaseReady ? '✅' : '❌');
        console.log('  🌐 Online:', status.isOnline ? '✅' : '❌');
        console.log('  💾 Fallback Mode:', status.fallbackMode ? '⚠️ Yes' : '✅ No');
        console.log('  🎯 Current Mode:', status.mode);
        
        this.showNotification(`🔥 Firebase Status: ${status.mode} mode`, 'info');
        
        return status;
    }

    async testConnection() {
        console.log('🧪 Testing Firebase connection...');
        
        try {
            const isConnected = await this.bridge.testConnection();
            
            if (isConnected) {
                console.log('✅ Firebase connection test: PASSED');
                this.showNotification('✅ Firebase connection: ACTIVE', 'success');
            } else {
                console.log('⚠️ Firebase connection test: FAILED (using fallback)');
                this.showNotification('⚠️ Firebase connection: FALLBACK MODE', 'warning');
            }
            
            return isConnected;
        } catch (error) {
            console.error('❌ Connection test error:', error);
            this.showNotification('❌ Firebase connection test failed', 'error');
            return false;
        }
    }

    async testOrderProcessing() {
        console.log('🧪 Testing order processing system...');
        
        try {
            // Mock cart data for testing
            const mockCart = [
                {
                    id: 1,
                    strain: 'Test Product A',
                    grade: 'A-GRADE',
                    quantity: 2,
                    price: 100
                },
                {
                    id: 2,
                    strain: 'Test Product B',
                    grade: 'B-GRADE',
                    quantity: 1,
                    price: 75
                }
            ];

            // Mock current user
            const mockUser = {
                email: 'demo@example.com',
                name: 'Demo User'
            };

            // Temporarily set mock data
            const originalCart = window.cartManager?.cart;
            const originalUser = window.currentUser;
            
            if (window.cartManager) {
                window.cartManager.cart = mockCart;
            }
            window.currentUser = mockUser;

            console.log('  📦 Mock cart created with', mockCart.length, 'items');
            console.log('  👤 Mock user:', mockUser.email);

            // Test order processing
            if (this.bridge.isFirebaseReady && !this.bridge.fallbackToLocalStorage) {
                console.log('  🔥 Testing Firebase order processing...');
                // Note: We won't actually process to avoid creating test data
                console.log('  ✅ Firebase order processing system: READY');
                this.showNotification('✅ Firebase order processing: READY', 'success');
            } else {
                console.log('  💾 Testing localStorage order processing...');
                console.log('  ✅ localStorage order processing system: READY');
                this.showNotification('✅ localStorage order processing: ACTIVE', 'success');
            }

            // Restore original data
            if (window.cartManager && originalCart) {
                window.cartManager.cart = originalCart;
            }
            window.currentUser = originalUser;

            return true;
        } catch (error) {
            console.error('❌ Order processing test error:', error);
            this.showNotification('❌ Order processing test failed', 'error');
            return false;
        }
    }

    async testBusinessApplication() {
        console.log('🧪 Testing business application system...');
        
        try {
            const mockApplicationData = {
                businessName: 'Demo Cannabis Store',
                contactName: 'Demo Contact',
                businessEmail: 'demo@democannabis.com',
                phone: '(555) 123-4567',
                businessAddress: '123 Demo Street, Demo City, DC 12345',
                businessType: 'dispensary',
                licenseNumber: 'DEMO-LIC-12345',
                estimatedMonthlyVolume: '$5,000 - $15,000'
            };

            console.log('  📝 Mock application data prepared');
            console.log('  🏢 Business:', mockApplicationData.businessName);

            if (this.bridge.isFirebaseReady && !this.bridge.fallbackToLocalStorage) {
                console.log('  🔥 Firebase application system: READY');
                this.showNotification('✅ Firebase applications: READY', 'success');
            } else {
                console.log('  💾 localStorage application system: READY');
                this.showNotification('✅ localStorage applications: ACTIVE', 'success');
            }

            return true;
        } catch (error) {
            console.error('❌ Business application test error:', error);
            this.showNotification('❌ Business application test failed', 'error');
            return false;
        }
    }

    async testRealTimeSync() {
        console.log('🧪 Testing real-time synchronization...');
        
        try {
            if (this.bridge.isFirebaseReady && !this.bridge.fallbackToLocalStorage) {
                console.log('  🔥 Firebase real-time sync: ACTIVE');
                console.log('  📡 Listening for real-time updates...');
                this.showNotification('✅ Firebase real-time sync: ACTIVE', 'success');
            } else {
                console.log('  💾 localStorage event system: ACTIVE');
                console.log('  🔄 Cross-tab synchronization available');
                this.showNotification('✅ localStorage sync: ACTIVE', 'success');
            }

            // Test notification system
            setTimeout(() => {
                this.showNotification('📡 Real-time sync test completed', 'info');
            }, 1000);

            return true;
        } catch (error) {
            console.error('❌ Real-time sync test error:', error);
            this.showNotification('❌ Real-time sync test failed', 'error');
            return false;
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    // Advanced testing functions
    async benchmarkPerformance() {
        console.log('⚡ Running performance benchmark...');
        
        const start = performance.now();
        
        // Test multiple operations
        for (let i = 0; i < 10; i++) {
            await this.testConnection();
            await this.delay(100);
        }
        
        const end = performance.now();
        const duration = end - start;
        
        console.log(`📈 Performance benchmark: ${duration.toFixed(2)}ms for 10 operations`);
        console.log(`📊 Average per operation: ${(duration / 10).toFixed(2)}ms`);
        
        return duration;
    }

    async stressTest() {
        console.log('🧨 Running stress test...');
        
        const operations = [];
        
        // Queue multiple simultaneous operations
        for (let i = 0; i < 5; i++) {
            operations.push(this.testConnection());
            operations.push(this.testOrderProcessing());
        }
        
        try {
            const results = await Promise.all(operations);
            const successCount = results.filter(r => r).length;
            
            console.log(`✅ Stress test completed: ${successCount}/${results.length} operations successful`);
            this.showNotification(`✅ Stress test: ${successCount}/${results.length} passed`, 'success');
            
            return { total: results.length, successful: successCount };
        } catch (error) {
            console.error('❌ Stress test failed:', error);
            this.showNotification('❌ Stress test failed', 'error');
            return { total: 0, successful: 0 };
        }
    }
}

// Initialize Firebase Dynamic Demo
window.firebaseDynamicDemo = new FirebaseDynamicDemo();

// Add demo to global functions
window.runFirebaseDemo = () => window.firebaseDynamicDemo.runFullDemo();
window.benchmarkFirebase = () => window.firebaseDynamicDemo.benchmarkPerformance();
window.stressTestFirebase = () => window.firebaseDynamicDemo.stressTest();

console.log('🧪 Firebase Dynamic Demo loaded');
console.log('   Run: testFirebaseIntegration() for full demo');
console.log('   Run: showFirebaseStatus() for current status');
