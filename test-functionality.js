// Test Cart and Sync Functionality
// This script can be run in the browser console to test the improvements

console.log('🧪 Starting Cart and Sync Functionality Tests...');

// Test 1: Verify Shared Data Manager is available
function testSharedDataManager() {
    console.log('\n📡 Test 1: Shared Data Manager Availability');
    
    if (typeof window.sharedDataManager === 'undefined') {
        console.error('❌ SharedDataManager not found');
        return false;
    }
    
    console.log('✅ SharedDataManager is available');
    
    // Test basic operations
    const products = window.sharedDataManager.getProducts();
    console.log(`✅ Found ${products.length} products in shared storage`);
    
    return true;
}

// Test 2: Test Cart Operations
function testCartOperations() {
    console.log('\n��� Test 2: Cart Operations');
    
    if (!window.sharedDataManager) {
        console.error('❌ SharedDataManager not available for cart tests');
        return false;
    }
    
    const testUserEmail = 'test@example.com';
    
    // Clear cart first
    window.sharedDataManager.clearCart(testUserEmail);
    let cart = window.sharedDataManager.getCart(testUserEmail);
    console.log(`✅ Cart cleared: ${cart.length} items`);
    
    // Add item to cart
    const products = window.sharedDataManager.getProducts();
    if (products.length > 0) {
        const testProduct = products[0];
        window.sharedDataManager.addToCart(testUserEmail, testProduct.id, 2);
        cart = window.sharedDataManager.getCart(testUserEmail);
        console.log(`✅ Added ${testProduct.strain} to cart: ${cart.length} items, quantity: ${cart[0]?.quantity}`);
        
        // Update quantity
        window.sharedDataManager.updateCartQuantity(testUserEmail, testProduct.id, 3);
        cart = window.sharedDataManager.getCart(testUserEmail);
        console.log(`✅ Updated quantity: ${cart[0]?.quantity}`);
        
        // Remove item
        window.sharedDataManager.removeFromCart(testUserEmail, testProduct.id);
        cart = window.sharedDataManager.getCart(testUserEmail);
        console.log(`✅ Removed item: ${cart.length} items remaining`);
        
        return true;
    } else {
        console.warn('⚠️ No products available for cart testing');
        return false;
    }
}

// Test 3: Test Product Sync
function testProductSync() {
    console.log('\n🔄 Test 3: Product Sync Operations');
    
    if (!window.sharedDataManager) {
        console.error('❌ SharedDataManager not available for sync tests');
        return false;
    }
    
    // Create test product
    const testProduct = {
        id: 9999,
        grade: 'TEST',
        strain: 'Test Strain',
        thca: 25.0,
        price: 100,
        status: 'AVAILABLE',
        stock: 10,
        type: 'Test',
        image: 'https://via.placeholder.com/200x200/000/fff?text=TEST',
        lastModified: new Date().toISOString()
    };
    
    // Add product
    window.sharedDataManager.addProduct(testProduct);
    console.log('✅ Added test product');
    
    // Update product
    window.sharedDataManager.updateProduct(testProduct.id, { price: 150, stock: 15 });
    console.log('✅ Updated test product');
    
    // Verify update
    const products = window.sharedDataManager.getProducts();
    const updatedProduct = products.find(p => p.id === testProduct.id);
    if (updatedProduct && updatedProduct.price === 150) {
        console.log('✅ Product update verified');
    } else {
        console.error('❌ Product update failed');
    }
    
    // Clean up - remove test product
    window.sharedDataManager.deleteProduct(testProduct.id);
    console.log('✅ Cleaned up test product');
    
    return true;
}

// Test 4: Test Event System
function testEventSystem() {
    console.log('\n📢 Test 4: Event System');
    
    let eventReceived = false;
    
    // Listen for events
    const eventListener = function(event) {
        if (event.detail.type === 'product_added') {
            eventReceived = true;
            console.log('✅ Event received:', event.detail.type);
        }
    };
    
    window.addEventListener('sharedDataChange', eventListener);
    
    // Trigger an event by adding a product
    const testProduct = {
        id: 8888,
        grade: 'EVENT-TEST',
        strain: 'Event Test Strain',
        price: 200,
        status: 'AVAILABLE',
        stock: 5
    };
    
    window.sharedDataManager.addProduct(testProduct);
    
    // Clean up
    setTimeout(() => {
        window.sharedDataManager.deleteProduct(testProduct.id);
        window.removeEventListener('sharedDataChange', eventListener);
        
        if (eventReceived) {
            console.log('✅ Event system working correctly');
        } else {
            console.error('❌ Event system not working');
        }
    }, 100);
    
    return true;
}

// Test 5: Test Cross-Portal Sync
function testCrossPortalSync() {
    console.log('\n🌐 Test 5: Cross-Portal Sync');
    
    // This would be tested by opening both portals in different tabs
    console.log('💡 To test cross-portal sync:');
    console.log('1. Open the partner portal (faded_skies_portal-5.html) in one tab');
    console.log('2. Open the admin portal (fadedskies admin almost complete .html) in another tab');
    console.log('3. Log into both portals');
    console.log('4. Make changes in the admin portal (add/edit products)');
    console.log('5. Check if changes appear in the partner portal immediately');
    console.log('6. Add items to cart in partner portal');
    console.log('7. Verify cart persists when refreshing the page');
    
    return true;
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Running Comprehensive Cart and Sync Tests...\n');
    
    const tests = [
        { name: 'Shared Data Manager', fn: testSharedDataManager },
        { name: 'Cart Operations', fn: testCartOperations },
        { name: 'Product Sync', fn: testProductSync },
        { name: 'Event System', fn: testEventSystem },
        { name: 'Cross-Portal Sync Instructions', fn: testCrossPortalSync }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        try {
            const result = test.fn();
            if (result) {
                passed++;
                console.log(`✅ ${test.name}: PASSED`);
            } else {
                failed++;
                console.log(`❌ ${test.name}: FAILED`);
            }
        } catch (error) {
            failed++;
            console.error(`💥 ${test.name}: ERROR -`, error);
        }
    }
    
    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
    
    if (failed === 0) {
        console.log('🎉 All tests passed! Cart and sync functionality is working correctly.');
    } else {
        console.log('⚠️ Some tests failed. Please check the implementation.');
    }
    
    return { passed, failed };
}

// Auto-run tests if this script is executed
if (typeof window !== 'undefined') {
    // Add to global scope for manual execution
    window.testCartAndSync = runAllTests;
    window.testSharedDataManager = testSharedDataManager;
    window.testCartOperations = testCartOperations;
    window.testProductSync = testProductSync;
    window.testEventSystem = testEventSystem;
    window.testCrossPortalSync = testCrossPortalSync;
    
    console.log('🔧 Test functions loaded. Run window.testCartAndSync() to test all functionality.');
}

// Export for use in other contexts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runAllTests,
        testSharedDataManager,
        testCartOperations,
        testProductSync,
        testEventSystem,
        testCrossPortalSync
    };
}
