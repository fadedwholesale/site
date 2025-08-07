// Integration Test Suite for Faded Skies Portal
// Tests cart, orders, and profile functionality

console.log('🧪 Starting Integration Tests...');

// Test cart functionality integration
function testCartIntegration() {
    console.log('\n🛒 Testing Cart Integration...');
    
    // Check if all required components are available
    const required = [
        'window.sharedDataManager',
        'window.cartManager', 
        'window.CartManager',
        'window.addToCart',
        'window.toggleCart',
        'window.clearCart'
    ];
    
    let passed = 0;
    let failed = 0;
    
    required.forEach(component => {
        const exists = eval(component);
        if (exists) {
            console.log(`✅ ${component} - Available`);
            passed++;
        } else {
            console.log(`❌ ${component} - Missing`);
            failed++;
        }
    });
    
    // Test cart operations if available
    if (window.cartManager && window.sharedDataManager) {
        try {
            // Simulate user login
            window.currentUser = {
                email: 'test@example.com',
                name: 'Test User'
            };
            
            console.log('🔐 Simulated user login');
            
            // Test adding product to cart
            const products = window.sharedDataManager.getProducts();
            if (products.length > 0) {
                const testProduct = products[0];
                const result = window.cartManager.addProduct(testProduct.id, 1);
                
                if (result) {
                    console.log(`✅ Added ${testProduct.strain} to cart`);
                    passed++;
                } else {
                    console.log(`❌ Failed to add ${testProduct.strain} to cart`);
                    failed++;
                }
                
                // Test cart display update
                const totals = window.cartManager.getTotals();
                if (totals.totalItems > 0) {
                    console.log(`✅ Cart totals calculated: ${totals.totalItems} items, $${totals.total.toFixed(2)}`);
                    passed++;
                } else {
                    console.log(`❌ Cart totals calculation failed`);
                    failed++;
                }
                
                // Test cart clearing
                window.cartManager.clear();
                const clearedTotals = window.cartManager.getTotals();
                if (clearedTotals.totalItems === 0) {
                    console.log(`✅ Cart cleared successfully`);
                    passed++;
                } else {
                    console.log(`❌ Cart clearing failed`);
                    failed++;
                }
            }
            
        } catch (error) {
            console.error('❌ Cart integration test error:', error);
            failed++;
        }
    }
    
    return { passed, failed };
}

// Test orders functionality
function testOrdersIntegration() {
    console.log('\n📋 Testing Orders Integration...');
    
    let passed = 0;
    let failed = 0;
    
    // Check if orders functions exist
    const orderFunctions = [
        'window.updateOrdersDisplay',
        'window.viewOrderDetails',
        'window.downloadOrderHistory',
        'window.filterOrders'
    ];
    
    orderFunctions.forEach(func => {
        const exists = eval(func);
        if (exists) {
            console.log(`✅ ${func} - Available`);
            passed++;
        } else {
            console.log(`❌ ${func} - Missing`);
            failed++;
        }
    });
    
    // Test orders display
    try {
        if (window.updateOrdersDisplay) {
            window.updateOrdersDisplay();
            console.log('✅ Orders display updated');
            passed++;
        }
    } catch (error) {
        console.error('❌ Orders display error:', error);
        failed++;
    }
    
    return { passed, failed };
}

// Test profile functionality
function testProfileIntegration() {
    console.log('\n👤 Testing Profile Integration...');
    
    let passed = 0;
    let failed = 0;
    
    // Check if profile functions exist
    const profileFunctions = [
        'window.updateProfileDisplay',
        'window.openProfileEditModal'
    ];
    
    profileFunctions.forEach(func => {
        const exists = eval(func);
        if (exists) {
            console.log(`✅ ${func} - Available`);
            passed++;
        } else {
            console.log(`❌ ${func} - Missing`);
            failed++;
        }
    });
    
    // Test profile display
    try {
        if (window.updateProfileDisplay && window.currentUser) {
            window.updateProfileDisplay();
            console.log('✅ Profile display updated');
            passed++;
        }
    } catch (error) {
        console.error('❌ Profile display error:', error);
        failed++;
    }
    
    return { passed, failed };
}

// Test portal tab switching
function testPortalTabIntegration() {
    console.log('\n📊 Testing Portal Tab Integration...');
    
    let passed = 0;
    let failed = 0;
    
    const tabs = ['dashboard', 'products', 'orders', 'profile', 'bulk', 'analytics'];
    
    tabs.forEach(tab => {
        try {
            if (window.switchPortalTab) {
                window.switchPortalTab(tab);
                console.log(`✅ Switched to ${tab} tab`);
                passed++;
            } else {
                console.log(`❌ switchPortalTab function missing`);
                failed++;
            }
        } catch (error) {
            console.error(`❌ Error switching to ${tab} tab:`, error);
            failed++;
        }
    });
    
    return { passed, failed };
}

// Test modal functionality
function testModalIntegration() {
    console.log('\n🖼️ Testing Modal Integration...');
    
    let passed = 0;
    let failed = 0;
    
    const modals = ['loginModal', 'registerModal'];
    
    modals.forEach(modalId => {
        try {
            if (window.openModal) {
                window.openModal(modalId);
                console.log(`✅ Opened ${modalId}`);
                passed++;
                
                // Close it
                if (window.closeModal) {
                    window.closeModal(modalId);
                    console.log(`✅ Closed ${modalId}`);
                    passed++;
                }
            }
        } catch (error) {
            console.error(`❌ Error with ${modalId}:`, error);
            failed++;
        }
    });
    
    return { passed, failed };
}

// Run comprehensive test
function runComprehensiveTest() {
    console.log('🚀 Running Comprehensive Integration Test Suite...');    
    const results = {
        cart: testCartIntegration(),
        orders: testOrdersIntegration(),
        profile: testProfileIntegration(),
        portalTabs: testPortalTabIntegration(),
        modals: testModalIntegration()
    };
    
    // Calculate totals
    let totalPassed = 0;
    let totalFailed = 0;
    
    Object.keys(results).forEach(category => {
        totalPassed += results[category].passed;
        totalFailed += results[category].failed;
        console.log(`\n📊 ${category.toUpperCase()}: ${results[category].passed} passed, ${results[category].failed} failed`);
    });
    
    console.log(`\n🎯 FINAL RESULTS: ${totalPassed} passed, ${totalFailed} failed`);
    
    if (totalFailed === 0) {
        console.log('🎉 ALL TESTS PASSED! Portal is fully functional.');
        window.showNotification('🎉 All integration tests passed! Portal is fully functional.', 'success');
    } else {
        console.log('⚠️ Some tests failed. Please check the implementation.');
        window.showNotification(`⚠️ ${totalFailed} integration tests failed. Check console for details.`, 'warning');
    }
    
    return { totalPassed, totalFailed, results };
}

// Test specific workflow
function testCompleteWorkflow() {
    console.log('\n🔄 Testing Complete User Workflow...');
    
    try {
        // 1. Login
        console.log('Step 1: User login simulation');
        window.currentUser = {
            email: 'test@store.com',
            name: 'Test Store',
            tier: 'Gold Partner'
        };
        
        // 2. Show partner portal
        console.log('Step 2: Show partner portal');
        if (window.showPartnerPortal) {
            window.showPartnerPortal();
        }
        
        // 3. Switch to products tab
        console.log('Step 3: Switch to products tab');
        if (window.switchPortalTab) {
            window.switchPortalTab('products');
        }
        
        // 4. Add product to cart
        console.log('Step 4: Add product to cart');
        const products = window.sharedDataManager.getProducts();
        if (products.length > 0 && window.addToCart) {
            window.addToCart(products[0].id);
        }
        
        // 5. View cart
        console.log('Step 5: Toggle cart view');
        if (window.toggleCart) {
            window.toggleCart();
        }
        
        // 6. Check orders tab
        console.log('Step 6: Switch to orders tab');
        if (window.switchPortalTab) {
            window.switchPortalTab('orders');
        }
        
        // 7. Check profile tab
        console.log('Step 7: Switch to profile tab');
        if (window.switchPortalTab) {
            window.switchPortalTab('profile');
        }
        
        console.log('✅ Complete workflow test finished');
        return true;
        
    } catch (error) {
        console.error('❌ Workflow test failed:', error);
        return false;
    }
}

// Make functions available globally
window.testCartIntegration = testCartIntegration;
window.testOrdersIntegration = testOrdersIntegration;
window.testProfileIntegration = testProfileIntegration;
window.testPortalTabIntegration = testPortalTabIntegration;
window.testModalIntegration = testModalIntegration;
window.runComprehensiveTest = runComprehensiveTest;
window.testCompleteWorkflow = testCompleteWorkflow;

// Auto-run test if in test mode
if (window.location.search.includes('test=true')) {
    setTimeout(() => {
        runComprehensiveTest();
        testCompleteWorkflow();
    }, 2000);
}

console.log('🔧 Integration tests loaded. Run window.runComprehensiveTest() to test all functionality.');
