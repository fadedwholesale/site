// Force Refresh Script to bypass browser cache
// This script forces a hard refresh to ensure new code is loaded

(function() {
    const currentTime = new Date().getTime();
    const lastRefresh = localStorage.getItem('lastEmergencyRefresh');
    
    // Only force refresh once per session to avoid infinite loops
    if (!lastRefresh || (currentTime - parseInt(lastRefresh)) > 30000) { // 30 seconds
        console.log('🔄 Force refreshing to bypass cache...');
        localStorage.setItem('lastEmergencyRefresh', currentTime.toString());
        
        // Clear cache-related items
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => {
                    caches.delete(name);
                });
            });
        }
        
        // Force hard refresh
        window.location.reload(true);
    } else {
        console.log('✅ Recent refresh detected, proceeding normally');
    }
})();
