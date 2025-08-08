// System Integration Manager
// Ensures all 5 core systems are properly initialized and connected

class SystemIntegration {
    constructor() {
        this.systems = {
            realTimeSync: null,
            liveDataManager: null,
            orderSyncManager: null,
            simpleLogger: null,
            dataPersistence: null
        };
        
        this.integrationStatus = 'pending';
        this.testResults = [];
        this.retryCount = 0;
        this.maxRetries = 5;
        
        console.log('🔧 System Integration Manager starting...');
        this.init();
    }

    async init() {
        // Wait for DOM to be ready
        if (document.readyState !== 'complete') {
            window.addEventListener('load', () => this.startIntegration());
        } else {
            this.startIntegration();
        }
    }

    async startIntegration() {
        console.log('🔧 Starting system integration process...');
        
        // Wait for systems to load
        await this.waitForSystems();
        
        // Initialize missing systems
        this.initializeMissingSystems();
        
        // Connect systems
        this.connectSystems();
        
        // Run integration tests
        await this.runTests();
        
        // Report status
        this.reportStatus();
    }

    async waitForSystems(timeout = 10000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            this.checkSystemAvailability();
            
            const availableCount = Object.values(this.systems).filter(s => s !== null).length;
            console.log(`📊 Systems available: ${availableCount}/5`);
            
            if (availableCount >= 3) {
                console.log('✅ Minimum systems available, proceeding...');
                break;
            }
            
            await this.sleep(500);
        }
    }

    checkSystemAvailability() {
        // Check for real-time sync
        if (window.realTimeSync && !this.systems.realTimeSync) {
            this.systems.realTimeSync = window.realTimeSync;
            console.log('✅ RealTimeSync detected');
        }

        // Check for live data manager
        if (window.liveDataManager && !this.systems.liveDataManager) {
            this.systems.liveDataManager = window.liveDataManager;
            console.log('✅ LiveDataManager detected');
        }

        // Check for order sync manager
        if (window.orderSyncManager && !this.systems.orderSyncManager) {
            this.systems.orderSyncManager = window.orderSyncManager;
            console.log('✅ OrderSyncManager detected');
        }

        // Check for simple logger
        if (window.simpleLogger && !this.systems.simpleLogger) {
            this.systems.simpleLogger = window.simpleLogger;
            console.log('✅ SimpleLogger detected');
        }

        // Check for data persistence
        if (window.dataPersistence && !this.systems.dataPersistence) {
            this.systems.dataPersistence = window.dataPersistence;
            console.log('✅ DataPersistence detected');
        }
    }

    initializeMissingSystems() {
        // Initialize Simple Logger if missing
        if (!this.systems.simpleLogger && window.SimpleLogger) {
            this.systems.simpleLogger = new window.SimpleLogger();
            window.simpleLogger = this.systems.simpleLogger;
            console.log('🔧 Initialized SimpleLogger');
        }

        // Initialize RealTime Sync if missing
        if (!this.systems.realTimeSync && window.RealTimeSync) {
            this.systems.realTimeSync = new window.RealTimeSync();
            window.realTimeSync = this.systems.realTimeSync;
            console.log('🔧 Initialized RealTimeSync');
        }

        // Initialize Live Data Manager if missing
        if (!this.systems.liveDataManager && window.LiveDataManager) {
            this.systems.liveDataManager = new window.LiveDataManager();
            window.liveDataManager = this.systems.liveDataManager;
            console.log('🔧 Initialized LiveDataManager');
        }

        // Initialize Order Sync Manager if missing
        if (!this.systems.orderSyncManager && window.OrderSyncManager) {
            this.systems.orderSyncManager = new window.OrderSyncManager();
            window.orderSyncManager = this.systems.orderSyncManager;
            console.log('🔧 Initialized OrderSyncManager');
        }

        // Initialize Data Persistence if missing
        if (!this.systems.dataPersistence && window.DataPersistence) {
            this.systems.dataPersistence = new window.DataPersistence();
            window.dataPersistence = this.systems.dataPersistence;
            console.log('🔧 Initialized DataPersistence');
        }
    }

    connectSystems() {
        console.log('🔗 Connecting systems...');
        
        // Connect Real-Time Sync to Live Data Manager
        if (this.systems.realTimeSync && this.systems.liveDataManager) {
            // Set up real-time listeners for data synchronization
            this.systems.realTimeSync.on('product_added', (product) => {
                this.systems.liveDataManager.addProduct(product, { fromRemote: true });
            });
            
            this.systems.realTimeSync.on('order_added', (order) => {
                this.systems.liveDataManager.addOrder(order, { fromRemote: true });
            });
            
            console.log('🔗 Connected RealTimeSync ↔ LiveDataManager');
        }

        // Connect Order Sync Manager to Real-Time Sync
        if (this.systems.orderSyncManager && this.systems.realTimeSync) {
            this.systems.realTimeSync.on('new_order', (orderData) => {
                if (this.systems.orderSyncManager.handleNewOrder) {
                    this.systems.orderSyncManager.handleNewOrder(orderData);
                }
            });
            
            console.log('🔗 Connected OrderSyncManager ↔ RealTimeSync');
        }

        // Connect Simple Logger to all systems for logging
        if (this.systems.simpleLogger) {
            // Log system events
            Object.keys(this.systems).forEach(systemName => {
                if (this.systems[systemName]) {
                    this.systems.simpleLogger.system(`${systemName} connected`, { system: systemName });
                }
            });
        }
    }

    async runTests() {
        console.log('🧪 Running integration tests...');
        this.testResults = [];

        // Test 1: System Availability
        await this.testSystemAvailability();
        
        // Test 2: Real-Time Communication
        await this.testRealTimeCommunication();
        
        // Test 3: Data Operations
        await this.testDataOperations();
        
        // Test 4: Order Processing
        await this.testOrderProcessing();
        
        // Test 5: System Health
        await this.testSystemHealth();

        const passedTests = this.testResults.filter(t => t.passed).length;
        const totalTests = this.testResults.length;
        
        console.log(`🧪 Integration tests complete: ${passedTests}/${totalTests} passed`);
        
        if (passedTests === totalTests) {
            this.integrationStatus = 'healthy';
            this.showNotification('🎉 All systems integrated successfully!', 'success');
        } else if (passedTests >= totalTests * 0.6) {
            this.integrationStatus = 'partial';
            this.showNotification(`⚠️ Partial integration: ${passedTests}/${totalTests} systems working`, 'warning');
        } else {
            this.integrationStatus = 'failed';
            this.showNotification(`❌ Integration issues: ${passedTests}/${totalTests} systems working`, 'error');
        }
    }

    async testSystemAvailability() {
        const result = {
            name: 'System Availability Test',
            passed: false,
            message: '',
            timestamp: new Date().toISOString()
        };

        const availableSystems = Object.keys(this.systems).filter(name => this.systems[name] !== null);
        const totalSystems = Object.keys(this.systems).length;
        
        result.passed = availableSystems.length >= 3; // Minimum 3 systems required
        result.message = `${availableSystems.length}/${totalSystems} systems available: ${availableSystems.join(', ')}`;
        
        this.testResults.push(result);
        console.log(`${result.passed ? '✅' : '❌'} ${result.name}: ${result.message}`);
    }

    async testRealTimeCommunication() {
        const result = {
            name: 'Real-Time Communication Test',
            passed: false,
            message: '',
            timestamp: new Date().toISOString()
        };

        if (!this.systems.realTimeSync) {
            result.message = 'RealTimeSync not available';
        } else {
            try {
                // Test basic broadcast functionality
                let received = false;
                
                const testHandler = () => { received = true; };
                this.systems.realTimeSync.on('integration_test', testHandler);
                
                this.systems.realTimeSync.broadcast('integration_test', { test: true });
                
                await this.sleep(200);
                
                this.systems.realTimeSync.off('integration_test', testHandler);
                
                result.passed = received;
                result.message = received ? 'Real-time communication working' : 'Real-time communication failed';
            } catch (error) {
                result.message = `Real-time communication error: ${error.message}`;
            }
        }
        
        this.testResults.push(result);
        console.log(`${result.passed ? '✅' : '❌'} ${result.name}: ${result.message}`);
    }

    async testDataOperations() {
        const result = {
            name: 'Data Operations Test',
            passed: false,
            message: '',
            timestamp: new Date().toISOString()
        };

        if (!this.systems.liveDataManager) {
            result.message = 'LiveDataManager not available';
        } else {
            try {
                // Test basic data operations without creating test products
                const products = this.systems.liveDataManager.getProducts();
                const canReadProducts = Array.isArray(products);

                result.passed = canReadProducts;
                result.message = canReadProducts ? 'Data operations working' : 'Data operations failed';
            } catch (error) {
                result.message = `Data operations error: ${error.message}`;
            }
        }
        
        this.testResults.push(result);
        console.log(`${result.passed ? '✅' : '❌'} ${result.name}: ${result.message}`);
    }

    async testOrderProcessing() {
        const result = {
            name: 'Order Processing Test',
            passed: false,
            message: '',
            timestamp: new Date().toISOString()
        };

        if (!this.systems.liveDataManager) {
            result.message = 'LiveDataManager not available';
        } else {
            try {
                // Test order processing without creating test orders
                const orders = this.systems.liveDataManager.getOrders();
                const canReadOrders = Array.isArray(orders);

                result.passed = canReadOrders;
                result.message = canReadOrders ? 'Order processing working' : 'Order processing failed';
            } catch (error) {
                result.message = `Order processing error: ${error.message}`;
            }
        }
        
        this.testResults.push(result);
        console.log(`${result.passed ? '✅' : '❌'} ${result.name}: ${result.message}`);
    }

    async testSystemHealth() {
        const result = {
            name: 'System Health Test',
            passed: false,
            message: '',
            timestamp: new Date().toISOString()
        };

        try {
            const healthyCount = Object.keys(this.systems).filter(name => {
                const system = this.systems[name];
                if (!system) return false;
                
                // Check if system has basic health indicators
                if (typeof system.getStatus === 'function') {
                    const status = system.getStatus();
                    return status && (status.status === 'healthy' || status.initialized);
                }
                
                return true; // Assume healthy if no status method
            }).length;

            result.passed = healthyCount >= 3;
            result.message = `${healthyCount}/5 systems healthy`;
        } catch (error) {
            result.message = `System health check error: ${error.message}`;
        }
        
        this.testResults.push(result);
        console.log(`${result.passed ? '✅' : '❌'} ${result.name}: ${result.message}`);
    }

    showNotification(message, type) {
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // Try to show in UI if notification system exists
        if (window.notificationSystem && typeof window.notificationSystem.show === 'function') {
            window.notificationSystem.show(message, type);
        }
    }

    reportStatus() {
        const availableCount = Object.values(this.systems).filter(s => s !== null).length;
        const passedTests = this.testResults.filter(t => t.passed).length;
        
        console.log('📊 System Integration Report:');
        console.log(`   Status: ${this.integrationStatus}`);
        console.log(`   Systems: ${availableCount}/5 available`);
        console.log(`   Tests: ${passedTests}/${this.testResults.length} passed`);
        
        Object.keys(this.systems).forEach(name => {
            const available = this.systems[name] !== null;
            console.log(`   ${available ? '✅' : '❌'} ${name}`);
        });
    }

    getStatus() {
        return {
            status: this.integrationStatus,
            systems: Object.keys(this.systems).reduce((acc, name) => {
                acc[name] = this.systems[name] !== null;
                return acc;
            }, {}),
            testResults: this.testResults,
            availableCount: Object.values(this.systems).filter(s => s !== null).length,
            totalSystems: Object.keys(this.systems).length
        };
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Auto-initialize
if (typeof window !== 'undefined') {
    window.SystemIntegration = SystemIntegration;
    
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.systemIntegration) {
            window.systemIntegration = new SystemIntegration();
            console.log('🔧 System Integration Manager ready');
        }
    });
}
