// Emergency System Disable Script
// Immediately disables problematic systems and clears corrupted data

console.log('🚨 EMERGENCY SYSTEM DISABLE ACTIVATED');

// 1. Clear ALL storage data that could contain circular references
try {
    const keysToRemove = [
        'fadedSkiesActivityLogs',
        'fadedSkiesChangeTracking', 
        'fadedSkiesSessionLogs',
        'fadedSkiesLiveData'
    ];
    
    keysToRemove.forEach(key => {
        if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
            console.log(`🗑️ Emergency: Removed ${key}`);
        }
    });
    
    // Clear session storage
    if (sessionStorage.getItem('fadedSkiesSessionLogs')) {
        sessionStorage.removeItem('fadedSkiesSessionLogs');
        console.log('🗑️ Emergency: Removed session logs');
    }
    
    console.log('✅ Emergency storage cleanup completed');
} catch (error) {
    console.error('❌ Error in emergency storage cleanup:', error);
}

// 2. Override ActivityLogger globally to prevent any circular reference issues
window.ActivityLogger = class EmergencyActivityLogger {
    constructor() {
        console.log('🚫 ActivityLogger: Emergency mode - all operations disabled');
        this.emergencyMode = true;
    }
    
    log() {
        // Do nothing - completely disabled
        return { id: 'emergency-disabled', timestamp: new Date().toISOString() };
    }
    
    flushLogs() {
        // Do nothing - completely disabled
        console.log('🚫 ActivityLogger: flushLogs disabled in emergency mode');
    }
    
    trackChange() {
        // Do nothing - completely disabled
        return { id: 'emergency-disabled', timestamp: new Date().toISOString() };
    }
    
    getStats() {
        return { emergencyMode: true, totalLogs: 0, totalChanges: 0 };
    }
    
    getStatus() {
        return { initialized: true, emergencyMode: true, status: 'disabled' };
    }
    
    getLogs() {
        return [];
    }
    
    getChanges() {
        return [];
    }
    
    destroy() {
        console.log('🚫 ActivityLogger: destroy called in emergency mode');
    }
};

// 3. Override the global instance immediately
if (window.activityLogger) {
    window.activityLogger = new window.ActivityLogger();
    console.log('🚫 Replaced global ActivityLogger with emergency version');
}

// 4. Fix order validation issues
window.emergencyOrderValidation = function(order) {
    if (!order || typeof order !== 'object') {
        return null;
    }
    
    // Ensure items is always an array
    if (!Array.isArray(order.items)) {
        order.items = [];
        console.warn('⚠️ Emergency: Fixed non-array order.items');
    }
    
    return order;
};

// 5. Patch LiveDataManager if it exists
if (window.liveDataManager && window.liveDataManager.addOrder) {
    const originalAddOrder = window.liveDataManager.addOrder.bind(window.liveDataManager);
    window.liveDataManager.addOrder = function(order, options = {}) {
        // Apply emergency validation
        order = window.emergencyOrderValidation(order);
        if (!order) {
            console.warn('⚠️ Emergency: Blocked invalid order');
            return null;
        }
        return originalAddOrder(order, options);
    };
    console.log('🔧 Emergency: Patched LiveDataManager.addOrder');
}

// 6. Disable auto-initialization of problematic systems
window.addEventListener('DOMContentLoaded', () => {
    // Prevent normal ActivityLogger initialization
    if (window.activityLogger && !window.activityLogger.emergencyMode) {
        window.activityLogger = new window.ActivityLogger();
        console.log('🚫 Emergency: Prevented normal ActivityLogger initialization');
    }
});

// 7. Add manual recovery functions
window.emergencyRecovery = {
    clearAllData: () => {
        localStorage.clear();
        sessionStorage.clear();
        console.log('🗑️ Emergency: Cleared all storage data');
        location.reload();
    },
    
    disableActivityLogger: () => {
        window.activityLogger = new window.ActivityLogger();
        console.log('🚫 Emergency: ActivityLogger disabled');
    },
    
    fixOrderData: () => {
        try {
            const data = localStorage.getItem('fadedSkiesLiveData');
            if (data) {
                const parsed = JSON.parse(data);
                if (parsed.orders && Array.isArray(parsed.orders)) {
                    parsed.orders.forEach(order => {
                        if (!Array.isArray(order.items)) {
                            order.items = [];
                        }
                    });
                    localStorage.setItem('fadedSkiesLiveData', JSON.stringify(parsed));
                    console.log('🔧 Emergency: Fixed order data');
                }
            }
        } catch (error) {
            console.error('❌ Error fixing order data:', error);
        }
    }
};

console.log('🚨 Emergency system disable complete. Use window.emergencyRecovery for manual fixes.');
