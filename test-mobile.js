// Mobile Optimization Test Script for Faded Skies Portal

function testMobileOptimizations() {
    console.log('🧪 Starting Mobile Optimization Tests...');
    
    const tests = {
        mobileDetection: false,
        hamburgerMenu: false,
        mobileCSS: false,
        touchTargets: false,
        modalResponsiveness: false,
        cartMobile: false
    };
    
    // Test 1: Mobile Detection
    try {
        const isMobile = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const hasMobileClass = document.body.classList.contains('mobile-device');
        tests.mobileDetection = isMobile === hasMobileClass;
        console.log(`📱 Mobile Detection: ${tests.mobileDetection ? '✅' : '❌'}`);
    } catch (error) {
        console.error('Mobile detection test failed:', error);
    }
    
    // Test 2: Hamburger Menu
    try {
        const hamburgerBtn = document.querySelector('.mobile-menu-toggle');
        const navLinks = document.getElementById('mobileNavLinks');
        tests.hamburgerMenu = hamburgerBtn && navLinks;
        console.log(`🍔 Hamburger Menu: ${tests.hamburgerMenu ? '✅' : '❌'}`);
        
        // Test menu toggle function
        if (hamburgerBtn) {
            hamburgerBtn.click();
            setTimeout(() => {
                const isOpen = navLinks.classList.contains('open');
                console.log(`   Menu Toggle: ${isOpen ? '✅' : '❌'}`);
                if (isOpen) {
                    hamburgerBtn.click(); // Close it
                }
            }, 100);
        }
    } catch (error) {
        console.error('Hamburger menu test failed:', error);
    }
    
    // Test 3: Mobile CSS Responsiveness
    try {
        const windowWidth = window.innerWidth;
        if (windowWidth <= 768) {
            const computedStyle = window.getComputedStyle(document.querySelector('.btn'));
            const minHeight = computedStyle.getPropertyValue('min-height');
            tests.mobileCSS = parseInt(minHeight) >= 44;
            console.log(`🎨 Mobile CSS (Touch Targets): ${tests.mobileCSS ? '✅' : '❌'}`);
        } else {
            tests.mobileCSS = true; // Skip on desktop
            console.log(`🎨 Mobile CSS: ⏭️ (Desktop mode)`);
        }
    } catch (error) {
        console.error('Mobile CSS test failed:', error);
    }
    
    // Test 4: Touch Targets
    try {
        const buttons = document.querySelectorAll('.btn');
        let validTouchTargets = 0;
        
        buttons.forEach(btn => {
            const rect = btn.getBoundingClientRect();
            if (rect.height >= 44 && rect.width >= 44) {
                validTouchTargets++;
            }
        });
        
        tests.touchTargets = validTouchTargets > 0;
        console.log(`👆 Touch Targets (44px+): ${tests.touchTargets ? '✅' : '❌'} (${validTouchTargets}/${buttons.length})`);
    } catch (error) {
        console.error('Touch targets test failed:', error);
    }
    
    // Test 5: Modal Responsiveness
    try {
        const modal = document.getElementById('loginModal');
        if (modal) {
            // Temporarily open modal to test
            modal.style.display = 'block';
            const modalContent = modal.querySelector('.modal-content');
            const rect = modalContent.getBoundingClientRect();
            
            // Check if modal fits properly on mobile
            const fitsViewport = rect.width <= window.innerWidth && rect.height <= window.innerHeight;
            tests.modalResponsiveness = fitsViewport;
            
            console.log(`📱 Modal Responsiveness: ${tests.modalResponsiveness ? '✅' : '❌'}`);
            
            // Close modal
            modal.style.display = 'none';
        }
    } catch (error) {
        console.error('Modal responsiveness test failed:', error);
    }
    
    // Test 6: Mobile Cart
    try {
        const cart = document.querySelector('.cart');
        if (cart && window.innerWidth <= 768) {
            const computedStyle = window.getComputedStyle(cart);
            const width = computedStyle.getPropertyValue('width');
            tests.cartMobile = width === '100vw';
            console.log(`🛒 Mobile Cart: ${tests.cartMobile ? '✅' : '❌'}`);
        } else {
            tests.cartMobile = true; // Skip on desktop
            console.log(`🛒 Mobile Cart: ⏭️ (Desktop mode)`);
        }
    } catch (error) {
        console.error('Mobile cart test failed:', error);
    }
    
    // Summary
    const passedTests = Object.values(tests).filter(test => test === true).length;
    const totalTests = Object.keys(tests).length;
    
    console.log('\n📊 Mobile Optimization Test Results:');
    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All mobile optimizations working correctly!');
        return true;
    } else {
        console.log('⚠️ Some mobile optimizations need attention.');
        return false;
    }
}

// Auto-run test on mobile devices
if (typeof window !== 'undefined') {
    window.testMobileOptimizations = testMobileOptimizations;
    
    // Auto-run after page load
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            if (window.innerWidth <= 768) {
                console.log('📱 Mobile device detected - running optimization tests...');
                testMobileOptimizations();
            }
        }, 2000);
    });
}

// Export for external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testMobileOptimizations };
}
