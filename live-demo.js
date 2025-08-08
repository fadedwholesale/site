// Live Demo and Testing Functions for Faded Skies Portal
// Run these functions in the browser console to test live functionality

window.FadedSkiesLiveDemo = {
    
    // Test 1: Simulate a partner placing an order
    simulatePartnerOrder() {
        console.log('🛒 Simulating partner order placement...');
        
        if (!window.liveDataManager) {
            console.error('❌ Live Data Manager not available');
            return;
        }
        
        const testOrder = {
            id: 'DEMO_' + Date.now(),
            partner: 'demo@partner.com',
            partnerName: 'Demo Partnership Store',
            items: [
                { productId: 'FSP001', name: 'Purple Haze A-Grade', quantity: 2, price: 850 },
                { productId: 'FSP002', name: 'OG Kush B-Grade', quantity: 1, price: 550 }
            ],
            total: 2250,
            status: 'pending',
            created: new Date().toISOString(),
            paymentStatus: 'paid',
            shippingAddress: '123 Cannabis St, Los Angeles, CA 90210',
            notes: 'Demo order - please process quickly'
        };
        
        // Add order to live data manager
        window.liveDataManager.addOrder(testOrder);
        
        // Broadcast to admin portal
        if (window.realTimeSync) {
            window.realTimeSync.broadcast('order_placed', testOrder);
        }
        
        console.log('✅ Demo order placed:', testOrder.id);
        
        if (window.showNotification) {
            window.showNotification(`🛒 Demo order placed: ${testOrder.id} ($${testOrder.total})`, 'success');
        }
        
        return testOrder;
    },
    
    // Test 2: Simulate admin updating product inventory
    simulateAdminInventoryUpdate() {
        console.log('📦 Simulating admin inventory update...');
        
        if (!window.liveDataManager) {
            console.error('❌ Live Data Manager not available');
            return;
        }
        
        const products = window.liveDataManager.getProducts();
        
        if (products.length === 0) {
            console.error('❌ No products available to update');
            return;
        }
        
        // Update the first product
        const product = products[0];
        const newStock = Math.max(0, product.stock - 5);
        const newPrice = product.price + (Math.random() * 20 - 10); // ±$10 random change
        
        const updates = {
            stock: newStock,
            price: Math.round(newPrice),
            lastModified: new Date().toISOString(),
            modifiedBy: 'admin@demo.com'
        };
        
        window.liveDataManager.updateProduct(product.id, updates);
        
        // Broadcast the update
        if (window.realTimeSync) {
            window.realTimeSync.broadcast('admin_product_change', {
                productId: product.id,
                productName: product.strain,
                action: 'product_updated',
                updates: updates
            });
        }
        
        console.log('✅ Product updated:', product.strain, updates);
        
        if (window.showNotification) {
            window.showNotification(`📦 Admin updated ${product.strain} inventory`, 'info');
        }
        
        return { product, updates };
    },
    
    // Test 3: Simulate real-time price changes
    simulateRealTimePriceUpdate() {
        console.log('💰 Simulating real-time price update...');
        
        if (!window.liveDataManager || !window.realTimeSync) {
            console.error('❌ Required systems not available');
            return;
        }
        
        const products = window.liveDataManager.getProducts();
        const randomProduct = products[Math.floor(Math.random() * products.length)];
        
        if (!randomProduct) {
            console.error('❌ No products available');
            return;
        }
        
        // Simulate market-driven price change
        const priceChange = (Math.random() - 0.5) * 0.1; // ±5% change
        const newPrice = Math.round(randomProduct.price * (1 + priceChange));
        
        const priceUpdate = {
            price: newPrice,
            lastModified: new Date().toISOString(),
            modifiedBy: 'market-sync-system'
        };
        
        window.liveDataManager.updateProduct(randomProduct.id, priceUpdate);
        
        // Broadcast price change
        window.realTimeSync.broadcast('price_update', {
            productId: randomProduct.id,
            productName: randomProduct.strain,
            oldPrice: randomProduct.price,
            newPrice: newPrice,
            changePercent: Math.round(priceChange * 100)
        });
        
        console.log(`💰 Price updated: ${randomProduct.strain} $${randomProduct.price} → $${newPrice}`);
        
        if (window.showNotification) {
            window.showNotification(
                `💰 Price Update: ${randomProduct.strain} now $${newPrice}`, 
                'info'
            );
        }
        
        return { product: randomProduct, oldPrice: randomProduct.price, newPrice };
    },
    
    // Test 4: Simulate order status updates
    simulateOrderStatusUpdate() {
        console.log('📋 Simulating order status update...');
        
        if (!window.liveDataManager) {
            console.error('❌ Live Data Manager not available');
            return;
        }
        
        const orders = window.liveDataManager.getOrders();
        const pendingOrders = orders.filter(o => o.status === 'pending');
        
        if (pendingOrders.length === 0) {
            console.log('📋 No pending orders to update, creating one first...');
            this.simulatePartnerOrder();
            return this.simulateOrderStatusUpdate();
        }
        
        const order = pendingOrders[0];
        const newStatus = 'processing';
        const trackingNumber = 'TRK' + Date.now().toString().slice(-8);
        
        const statusUpdate = {
            status: newStatus,
            tracking: trackingNumber,
            lastModified: new Date().toISOString(),
            updatedBy: 'admin@demo.com'
        };
        
        window.liveDataManager.updateOrder(order.id, statusUpdate);
        
        // Broadcast status change
        if (window.realTimeSync) {
            window.realTimeSync.broadcast('order_status_changed', {
                orderId: order.id,
                partnerName: order.partnerName,
                oldStatus: order.status,
                newStatus: newStatus,
                tracking: trackingNumber
            });
        }
        
        console.log(`📋 Order ${order.id} status: ${order.status} → ${newStatus}`);
        
        if (window.showNotification) {
            window.showNotification(
                `📋 Order ${order.id} is now ${newStatus}`, 
                'success'
            );
        }
        
        return { order, statusUpdate };
    },
    
    // Test 5: Generate multiple rapid updates to test performance
    stressTestLiveSync() {
        console.log('🔥 Starting live sync stress test...');
        
        if (!window.liveDataManager || !window.realTimeSync) {
            console.error('❌ Required systems not available');
            return;
        }
        
        const startTime = Date.now();
        let updateCount = 0;
        
        // Create 20 rapid updates
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                const products = window.liveDataManager.getProducts();
                const randomProduct = products[Math.floor(Math.random() * products.length)];
                
                if (randomProduct) {
                    const stockChange = Math.floor(Math.random() * 10) - 5; // ±5 stock change
                    const newStock = Math.max(0, randomProduct.stock + stockChange);
                    
                    window.liveDataManager.updateProduct(randomProduct.id, {
                        stock: newStock,
                        lastModified: new Date().toISOString(),
                        modifiedBy: 'stress-test'
                    });
                    
                    window.realTimeSync.broadcast('stress_test_update', {
                        updateNumber: updateCount + 1,
                        productId: randomProduct.id,
                        productName: randomProduct.strain,
                        newStock: newStock
                    });
                    
                    updateCount++;
                    
                    if (updateCount === 20) {
                        const duration = Date.now() - startTime;
                        console.log(`🔥 Stress test complete: ${updateCount} updates in ${duration}ms`);
                        
                        if (window.showNotification) {
                            window.showNotification(
                                `🔥 Stress test complete: ${updateCount} updates in ${duration}ms`, 
                                'success'
                            );
                        }
                    }
                }
            }, i * 100); // 100ms between updates
        }
        
        return { startTime, expectedUpdates: 20 };
    },
    
    // Test 6: Check system status and logs
    checkSystemStatus() {
        console.log('📊 Checking live system status...');
        
        const status = {
            timestamp: new Date().toISOString(),
            systems: {}
        };
        
        // Check each system
        if (window.realTimeSync) {
            status.systems.realTimeSync = window.realTimeSync.getSyncStatus();
        }
        
        if (window.liveDataManager) {
            status.systems.liveDataManager = window.liveDataManager.getStatus();
        }
        
        if (window.orderSyncManager) {
            status.systems.orderSyncManager = window.orderSyncManager.getSyncStatus();
        }
        
        if (window.activityLogger) {
            status.systems.activityLogger = window.activityLogger.getStats();
        }
        
        if (window.dataPersistence) {
            status.systems.dataPersistence = window.dataPersistence.getRecoveryStatus();
        }
        
        if (window.liveSystemsIntegrator) {
            status.integration = window.liveSystemsIntegrator.getSystemStatus();
        }
        
        console.log('📊 System Status:', status);
        
        if (window.showNotification) {
            const systemCount = Object.keys(status.systems).length;
            window.showNotification(`📊 ${systemCount} live systems checked - see console for details`, 'info');
        }
        
        return status;
    },
    
    // Test 7: View recent activity logs
    viewRecentLogs() {
        console.log('📝 Viewing recent activity logs...');
        
        if (!window.activityLogger) {
            console.error('❌ Activity Logger not available');
            return;
        }
        
        const logs = window.activityLogger.getLogs({ limit: 10 });
        
        console.log('📝 Recent Activity Logs:');
        logs.forEach((log, index) => {
            console.log(`${index + 1}. [${log.level.toUpperCase()}] ${log.timestamp}: ${log.message}`, log.data);
        });
        
        if (window.showNotification) {
            window.showNotification(`📝 Showing ${logs.length} recent logs in console`, 'info');
        }
        
        return logs;
    },
    
    // Convenience method to run all tests
    runAllTests() {
        console.log('🚀 Running all live system tests...');
        
        const results = {
            startTime: new Date().toISOString(),
            tests: []
        };
        
        // Run tests with delays
        setTimeout(() => {
            results.tests.push({ name: 'Partner Order', result: this.simulatePartnerOrder() });
        }, 0);
        
        setTimeout(() => {
            results.tests.push({ name: 'Admin Inventory Update', result: this.simulateAdminInventoryUpdate() });
        }, 2000);
        
        setTimeout(() => {
            results.tests.push({ name: 'Price Update', result: this.simulateRealTimePriceUpdate() });
        }, 4000);
        
        setTimeout(() => {
            results.tests.push({ name: 'Order Status Update', result: this.simulateOrderStatusUpdate() });
        }, 6000);
        
        setTimeout(() => {
            results.tests.push({ name: 'System Status', result: this.checkSystemStatus() });
            results.endTime = new Date().toISOString();
            
            console.log('🎉 All tests completed!', results);
            
            if (window.showNotification) {
                window.showNotification('🎉 All live system tests completed successfully!', 'success');
            }
        }, 8000);
        
        return results;
    }
};

console.log(`
🌿 FADED SKIES LIVE DEMO FUNCTIONS LOADED 🌿
============================================

Run these commands in the console to test:

📋 Basic Tests:
• FadedSkiesLiveDemo.simulatePartnerOrder()
• FadedSkiesLiveDemo.simulateAdminInventoryUpdate()
• FadedSkiesLiveDemo.simulateRealTimePriceUpdate()
• FadedSkiesLiveDemo.simulateOrderStatusUpdate()

🔥 Advanced Tests:
• FadedSkiesLiveDemo.stressTestLiveSync()
• FadedSkiesLiveDemo.checkSystemStatus()
• FadedSkiesLiveDemo.viewRecentLogs()

🚀 Run All Tests:
• FadedSkiesLiveDemo.runAllTests()

🎯 Integration Tests:
• testLiveSync() (if available)
• getLiveSystemsStatus() (if available)
`);
