// Modal Debug Script for Faded Skies Portal
// Run this in the browser console to debug modal issues

console.log('🔍 Modal Debug Script Loaded');

// Check if modal elements exist
function checkModals() {
    console.log('🔍 Checking modal elements...');
    
    const modals = ['loginModal', 'registerModal', 'profileEditModal', 'bulkOrderModal'];
    
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            console.log(`✅ ${modalId} found:`, modal);
            console.log(`   Display: ${modal.style.display}`);
            console.log(`   Classes: ${modal.className}`);
        } else {
            console.error(`❌ ${modalId} NOT FOUND`);
        }
    });
}

// Check if modal functions exist
function checkModalFunctions() {
    console.log('🔍 Checking modal functions...');
    
    const functions = ['openModal', 'closeModal', 'testModal'];
    
    functions.forEach(funcName => {
        if (typeof window[funcName] === 'function') {
            console.log(`✅ ${funcName} function exists`);
        } else {
            console.error(`❌ ${funcName} function NOT FOUND`);
        }
    });
}

// Test modal opening
function testModalOpening() {
    console.log('🔍 Testing modal opening...');
    
    try {
        // Test login modal
        console.log('Testing loginModal...');
        if (typeof openModal === 'function') {
            openModal('loginModal');
            console.log('✅ openModal called for loginModal');
        } else {
            console.error('❌ openModal function not available');
        }
    } catch (error) {
        console.error('❌ Error testing modal:', error);
    }
}

// Check for JavaScript errors
function checkForErrors() {
    console.log('🔍 Checking for JavaScript errors...');
    
    // Check if showNotification exists
    if (typeof showNotification === 'function') {
        console.log('✅ showNotification function exists');
    } else {
        console.error('❌ showNotification function NOT FOUND');
    }
    
    // Check if realtimeNotificationSystem exists
    if (window.realtimeNotificationSystem) {
        console.log('✅ realtimeNotificationSystem exists');
    } else {
        console.error('❌ realtimeNotificationSystem NOT FOUND');
    }
    
    // Check if dynamicDataProcessor exists
    if (window.dynamicDataProcessor) {
        console.log('✅ dynamicDataProcessor exists');
    } else {
        console.error('❌ dynamicDataProcessor NOT FOUND');
    }
}

// Run all checks
function runAllChecks() {
    console.log('🚀 Running all modal checks...');
    checkModals();
    checkModalFunctions();
    checkForErrors();
    console.log('✅ All checks complete');
}

// Auto-run checks when script loads
runAllChecks();

// Make functions globally available
window.checkModals = checkModals;
window.checkModalFunctions = checkModalFunctions;
window.testModalOpening = testModalOpening;
window.checkForErrors = checkForErrors;
window.runAllChecks = runAllChecks;

console.log('🔍 Modal Debug Script Ready - Use runAllChecks() to test again');
