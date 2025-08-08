// Cleanup Script for Invalid FS-TEST_INTEGRATION Products
// This script removes all invalid test integration products and fixes notification system

function cleanupInvalidProducts() {
    console.log('🧹 Starting cleanup of invalid FS-TEST_INTEGRATION products...');
    
    if (!window.sharedDataManager) {
        console.error('❌ SharedDataManager not available');
        return false;
    }
    
    const currentProducts = window.sharedDataManager.getProducts();
    const initialCount = currentProducts.length;
    
    // Filter out all FS-TEST_INTEGRATION products
    const validProducts = currentProducts.filter(product => {
        const isTestProduct = product.id && (
            product.id.toString().includes('TEST_INTEGRATION') ||
            product.id.toString().includes('FS-TEST') ||
            product.strain?.includes('TEST_INTEGRATION') ||
            product.strain?.includes('Integration Test')
        );
        
        if (isTestProduct) {
            console.log(`🗑️ Removing invalid product: ${product.id} - ${product.strain}`);
            return false;
        }
        return true;
    });
    
    // Update the products list
    window.sharedDataManager.updateProducts(validProducts);
    
    const removedCount = initialCount - validProducts.length;
    console.log(`✅ Cleanup complete: Removed ${removedCount} invalid products`);
    console.log(`📦 Remaining valid products: ${validProducts.length}`);
    
    // Clear localStorage cache to ensure clean state
    try {
        const storageKeys = Object.keys(localStorage);
        storageKeys.forEach(key => {
            if (key.includes('TEST_INTEGRATION') || key.includes('FS-TEST')) {
                localStorage.removeItem(key);
                console.log(`🗑️ Removed cached data: ${key}`);
            }
        });
    } catch (error) {
        console.warn('⚠️ Could not clean localStorage cache:', error);
    }
    
    // Refresh all views
    if (window.updateAllViews) {
        window.updateAllViews();
    }
    
    // Show success notification
    if (window.showNotification) {
        window.showNotification(
            `🧹 Cleanup complete: Removed ${removedCount} invalid test products`, 
            'success'
        );
    }
    
    return true;
}

function fixLowStockNotifications() {
    console.log('🔧 Fixing low stock notification thresholds...');
    
    // Update notification thresholds to be more realistic
    const REALISTIC_LOW_STOCK_THRESHOLD = 3; // Only alert when 3 or fewer items remain
    const REALISTIC_OUT_OF_STOCK_THRESHOLD = 0;
    
    // Override the low stock alert function in order-sync-manager
    if (window.orderSyncManager && window.orderSyncManager.sendLowStockAlert) {
        const originalSendAlert = window.orderSyncManager.sendLowStockAlert;
        
        window.orderSyncManager.sendLowStockAlert = function(product, currentStock) {
            // Only send alerts for genuinely low stock (3 or fewer)
            if (currentStock <= REALISTIC_LOW_STOCK_THRESHOLD && currentStock > 0) {
                // Check if we already sent an alert for this product recently
                const alertKey = `lowStockAlert_${product.id}`;
                const lastAlert = localStorage.getItem(alertKey);
                const now = Date.now();
                
                // Only send alert once per hour to avoid spam
                if (!lastAlert || (now - parseInt(lastAlert)) > 3600000) {
                    originalSendAlert.call(this, product, currentStock);
                    localStorage.setItem(alertKey, now.toString());
                    console.log(`📢 Low stock alert sent for ${product.strain}: ${currentStock} remaining`);
                }
            }
        };
    }
    
    // Update live data manager low stock logic
    if (window.liveDataManager) {
        // Store original method
        const originalProcessInventory = window.liveDataManager.processOrderInventory;
        
        if (originalProcessInventory) {
            window.liveDataManager.processOrderInventory = function(order) {
                // Call original method first
                const result = originalProcessInventory.call(this, order);
                
                // Then apply our improved low stock logic
                if (order && Array.isArray(order.items)) {
                    order.items.forEach(item => {
                        const product = this.data.products.find(p => p.id === item.productId);
                        if (product && product.stock <= REALISTIC_LOW_STOCK_THRESHOLD && product.stock > 0) {
                            // Check if alert was already sent recently
                            const alertKey = `lowStockAlert_${product.id}`;
                            const lastAlert = localStorage.getItem(alertKey);
                            const now = Date.now();
                            
                            if (!lastAlert || (now - parseInt(lastAlert)) > 3600000) {
                                if (window.showNotification) {
                                    window.showNotification(
                                        `⚠️ Low Stock: ${product.strain} (${product.stock} remaining)`,
                                        'warning'
                                    );
                                }
                                localStorage.setItem(alertKey, now.toString());
                            }
                        }
                    });
                }
                
                return result;
            };
        }
    }
    
    console.log('✅ Low stock notification system updated with realistic thresholds');
    
    if (window.showNotification) {
        window.showNotification('🔧 Notification system optimized - reduced false alerts', 'success');
    }
}

function resetNotificationHistory() {
    console.log('🔄 Resetting notification history...');
    
    // Clear all low stock alert timestamps
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.startsWith('lowStockAlert_')) {
            localStorage.removeItem(key);
        }
    });
    
    console.log('✅ Notification history reset');
}

function runCompleteCleanup() {
    console.log('🚀 Running complete cleanup and optimization...');
    
    // Step 1: Clean up invalid products
    const cleanupSuccess = cleanupInvalidProducts();
    
    // Step 2: Fix notification system
    setTimeout(() => {
        fixLowStockNotifications();
    }, 1000);
    
    // Step 3: Reset notification history
    setTimeout(() => {
        resetNotificationHistory();
    }, 2000);
    
    // Step 4: Final status report
    setTimeout(() => {
        console.log('🎉 Complete cleanup finished!');
        if (window.showNotification) {
            window.showNotification('🎉 System cleanup complete - invalid products removed and notifications optimized!', 'success');
        }
    }, 3000);
    
    return cleanupSuccess;
}

// Make functions available globally
window.cleanupInvalidProducts = cleanupInvalidProducts;
window.fixLowStockNotifications = fixLowStockNotifications;
window.resetNotificationHistory = resetNotificationHistory;
window.runCompleteCleanup = runCompleteCleanup;

console.log(`
🧹 CLEANUP TOOLS LOADED
======================

Available functions:
• cleanupInvalidProducts() - Remove all FS-TEST_INTEGRATION products
• fixLowStockNotifications() - Fix false low inventory alerts
• resetNotificationHistory() - Clear notification spam history
• runCompleteCleanup() - Run all cleanup operations

To fix your issues, run: runCompleteCleanup()
`);
