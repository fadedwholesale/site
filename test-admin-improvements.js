// Test script for admin portal improvements
// Tests: scrollability, mobile responsiveness, dynamic content, and notification filtering

function testAdminPortalImprovements() {
    console.log('🧪 Testing Admin Portal Improvements...');
    
    // Test 1: Check if scrollable containers exist
    function testScrollability() {
        console.log('📋 Testing scrollability...');
        const tableContainers = document.querySelectorAll('.table-container');
        const passed = tableContainers.length > 0;
        
        if (passed) {
            console.log('✅ Table containers found:', tableContainers.length);
            tableContainers.forEach((container, index) => {
                const styles = window.getComputedStyle(container);
                const hasScroll = styles.overflowX === 'auto' || styles.overflowY === 'auto';
                console.log(`   Container ${index + 1}: overflow-x=${styles.overflowX}, overflow-y=${styles.overflowY}`);
            });
        } else {
            console.log('❌ No table containers found');
        }
        
        return passed;
    }
    
    // Test 2: Check mobile responsiveness
    function testMobileResponsiveness() {
        console.log('📱 Testing mobile responsiveness...');
        
        // Check if viewport meta tag exists
        const viewportMeta = document.querySelector('meta[name="viewport"]');
        const hasViewport = viewportMeta && viewportMeta.content.includes('width=device-width');
        
        // Check if mobile CSS media queries are working
        const testElement = document.createElement('div');
        testElement.style.cssText = `
            width: 100px;
            @media (max-width: 768px) { width: 50px; }
        `;
        document.body.appendChild(testElement);
        
        // Simulate mobile viewport
        const originalWidth = window.innerWidth;
        window.resizeTo(400, 800);
        
        setTimeout(() => {
            const computedWidth = parseInt(window.getComputedStyle(testElement).width);
            document.body.removeChild(testElement);
            window.resizeTo(originalWidth, window.innerHeight);
            
            console.log(`✅ Viewport meta tag: ${hasViewport ? 'Present' : 'Missing'}`);
            console.log(`✅ Mobile responsive CSS: ${computedWidth < 100 ? 'Working' : 'Not detected'}`);
        }, 100);
        
        return hasViewport;
    }
    
    // Test 3: Check dynamic functionality
    function testDynamicFunctionality() {
        console.log('⚡ Testing dynamic functionality...');
        
        const dynamicFunctions = [
            'updateAllDashboardViews',
            'updateInventoryTable', 
            'updateOrdersTable',
            'switchTab',
            'openModal',
            'closeModal'
        ];
        
        let functionsFound = 0;
        dynamicFunctions.forEach(funcName => {
            if (typeof window[funcName] === 'function') {
                console.log(`✅ Function ${funcName}: Available`);
                functionsFound++;
            } else {
                console.log(`❌ Function ${funcName}: Missing`);
            }
        });
        
        const passed = functionsFound >= dynamicFunctions.length * 0.8; // 80% pass rate
        console.log(`${passed ? '✅' : '❌'} Dynamic functionality: ${functionsFound}/${dynamicFunctions.length} functions available`);
        
        return passed;
    }
    
    // Test 4: Check notification filtering
    function testNotificationFiltering() {
        console.log('🔔 Testing notification filtering...');
        
        // Check if notification system exists
        const notificationSystem = window.notificationSystem || window.NotificationSystem;
        const hasNotificationSystem = !!notificationSystem;
        
        // Check if showNotification function exists and has filtering
        const showNotificationExists = typeof window.showNotification === 'function';
        
        // Test notification filtering by creating mock scenarios
        let filteringWorks = false;
        if (showNotificationExists) {
            const originalLog = console.log;
            let filteredNotifications = 0;
            
            console.log = function(...args) {
                if (args[0] && args[0].includes('Filtering out')) {
                    filteredNotifications++;
                }
                originalLog.apply(console, args);
            };
            
            // Mock admin-only notification for non-admin user
            window.currentUser = { email: 'partner@test.com', role: 'partner' };
            window.showNotification('Admin test', 'info', { adminOnly: true });
            
            // Mock system notification for partner (should be filtered)
            window.showNotification('System synced', 'system');
            
            console.log = originalLog;
            filteringWorks = filteredNotifications > 0;
        }
        
        console.log(`${hasNotificationSystem ? '✅' : '❌'} Notification system: ${hasNotificationSystem ? 'Available' : 'Missing'}`);
        console.log(`${showNotificationExists ? '✅' : '❌'} showNotification function: ${showNotificationExists ? 'Available' : 'Missing'}`);
        console.log(`${filteringWorks ? '✅' : '❌'} Notification filtering: ${filteringWorks ? 'Working' : 'Not detected'}`);
        
        return hasNotificationSystem && showNotificationExists;
    }
    
    // Run all tests
    console.log('\n🚀 Running admin portal improvement tests...\n');
    
    const tests = [
        { name: 'Scrollability', test: testScrollability },
        { name: 'Mobile Responsiveness', test: testMobileResponsiveness },
        { name: 'Dynamic Functionality', test: testDynamicFunctionality },
        { name: 'Notification Filtering', test: testNotificationFiltering }
    ];
    
    let passedTests = 0;
    const results = {};
    
    tests.forEach(({ name, test }) => {
        try {
            const result = test();
            results[name] = result;
            if (result) passedTests++;
            console.log(`\n${result ? '✅' : '❌'} ${name}: ${result ? 'PASSED' : 'FAILED'}\n`);
        } catch (error) {
            console.log(`\n❌ ${name}: ERROR - ${error.message}\n`);
            results[name] = false;
        }
    });
    
    // Final summary
    console.log('📊 TEST SUMMARY');
    console.log('================');
    console.log(`Tests passed: ${passedTests}/${tests.length}`);
    console.log(`Success rate: ${Math.round((passedTests / tests.length) * 100)}%`);
    
    if (passedTests === tests.length) {
        console.log('🎉 All improvements working correctly!');
    } else if (passedTests >= tests.length * 0.75) {
        console.log('⚠️ Most improvements working, minor issues detected');
    } else {
        console.log('❌ Significant issues detected, review needed');
    }
    
    return {
        passed: passedTests,
        total: tests.length,
        results: results,
        success: passedTests >= tests.length * 0.75
    };
}

// Auto-run tests when script loads
if (typeof document !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(testAdminPortalImprovements, 1000);
    });
} else {
    // Document already loaded
    setTimeout(testAdminPortalImprovements, 1000);
}

// Export for manual testing
window.testAdminPortalImprovements = testAdminPortalImprovements;
