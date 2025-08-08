// Data Cleanup Utility
// Fixes corrupted order data and other data structure issues

class DataCleanup {
    static cleanupCorruptedData() {
        console.log('🧹 Starting emergency data cleanup for circular references...');

        // Emergency: Clear all activity logs that might have circular references
        this.emergencyLogCleanup();

        // Clean up orders with invalid items structure
        this.cleanupOrders();

        // Clean up activity logs with circular references
        this.cleanupActivityLogs();

        // Clean up session data
        this.cleanupSessionData();

        // Force clear any corrupted real-time data
        this.clearCorruptedRealTimeData();

        console.log('✅ Emergency data cleanup completed');
    }
    
    static cleanupOrders() {
        try {
            const liveDataKey = 'fadedSkiesLiveData';
            const storedData = localStorage.getItem(liveDataKey);

            if (storedData) {
                let data;
                try {
                    data = JSON.parse(storedData);
                } catch (parseError) {
                    console.warn('🧹 Corrupted JSON data, resetting:', parseError);
                    localStorage.removeItem(liveDataKey);
                    return;
                }

                if (data.orders && Array.isArray(data.orders)) {
                    let fixedCount = 0;
                    let removedCount = 0;

                    data.orders = data.orders.filter(order => {
                        // Remove completely corrupted orders
                        if (!order || typeof order !== 'object' || !order.id) {
                            removedCount++;
                            return false;
                        }

                        // Fix orders with invalid items
                        if (order.items && !Array.isArray(order.items)) {
                            fixedCount++;
                            console.log(`Fixing order ${order.id} with invalid items:`, typeof order.items);
                            order.items = [];
                        }

                        // Ensure required fields
                        order.items = order.items || [];
                        order.total = order.total || 0;
                        order.status = order.status || 'pending';
                        order.created = order.created || new Date().toISOString();

                        return true;
                    });

                    if (fixedCount > 0 || removedCount > 0) {
                        localStorage.setItem(liveDataKey, JSON.stringify(data));
                        console.log(`🔧 Fixed ${fixedCount} and removed ${removedCount} corrupted orders`);
                    } else {
                        console.log('✅ All orders have valid structure');
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error cleaning up orders, clearing data:', error);
            localStorage.removeItem('fadedSkiesLiveData');
        }
    }
    
    static cleanupActivityLogs() {
        try {
            const logKeys = [
                'fadedSkiesActivityLogs',
                'fadedSkiesChangeTracking',
                'fadedSkiesSessionLogs'
            ];

            // More aggressive cleanup for circular reference issues
            logKeys.forEach(key => {
                const data = localStorage.getItem(key);
                if (data) {
                    try {
                        const parsed = JSON.parse(data);

                        // Check for potential circular reference patterns
                        const hasCircularReference = JSON.stringify(parsed).includes('events') &&
                                                   JSON.stringify(parsed).includes('currentSession');

                        if (hasCircularReference) {
                            console.log(`🧹 Removing ${key} due to potential circular references`);
                            localStorage.removeItem(key);
                        } else {
                            console.log(`✅ ${key} is valid JSON`);
                        }
                    } catch (error) {
                        console.log(`🧹 Removing corrupted ${key}: ${error.message}`);
                        localStorage.removeItem(key);
                    }
                }
            });

            // Also clear session storage that might have circular references
            const sessionKey = 'fadedSkiesSessionLogs';
            const sessionData = sessionStorage.getItem(sessionKey);
            if (sessionData) {
                try {
                    const parsed = JSON.parse(sessionData);
                    if (parsed.events && Array.isArray(parsed.events) && parsed.events.length > 0) {
                        // Check if any event has data that could cause circular references
                        const hasProblematicData = parsed.events.some(event =>
                            event.data && typeof event.data === 'object' &&
                            (event.data.sessionId || event.data.currentSession)
                        );

                        if (hasProblematicData) {
                            console.log('🧹 Removing session data with potential circular references');
                            sessionStorage.removeItem(sessionKey);
                        }
                    }
                } catch (error) {
                    console.log('🧹 Removing corrupted session data');
                    sessionStorage.removeItem(sessionKey);
                }
            }
        } catch (error) {
            console.error('❌ Error cleaning up activity logs:', error);
        }
    }
    
    static cleanupSessionData() {
        try {
            const sessionKey = 'fadedSkiesSessionLogs';
            const sessionData = sessionStorage.getItem(sessionKey);
            
            if (sessionData) {
                try {
                    const data = JSON.parse(sessionData);
                    // Remove circular references from session data
                    const cleanData = {
                        id: data.id,
                        startTime: data.startTime,
                        endTime: data.endTime,
                        userEmail: data.userEmail,
                        userType: data.userType,
                        page: data.page,
                        eventCount: data.events ? data.events.length : 0
                    };
                    sessionStorage.setItem(sessionKey, JSON.stringify(cleanData));
                    console.log('🔧 Cleaned session data');
                } catch (error) {
                    console.log('🧹 Removing corrupted session data');
                    sessionStorage.removeItem(sessionKey);
                }
            }
        } catch (error) {
            console.error('❌ Error cleaning up session data:', error);
        }
    }

    static clearCorruptedRealTimeData() {
        try {
            // Clear any cached real-time sync data that might be corrupted
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.includes('realtime') || key.includes('sync') || key.includes('broadcast')) {
                    try {
                        const data = localStorage.getItem(key);
                        JSON.parse(data); // Test if it's valid JSON
                    } catch (error) {
                        console.log(`🧹 Removing corrupted real-time data: ${key}`);
                        localStorage.removeItem(key);
                    }
                }
            });
        } catch (error) {
            console.error('❌ Error clearing real-time data:', error);
        }
    }

    static emergencyLogCleanup() {
        console.log('🚨 Emergency: Clearing all activity logs due to circular reference issues');

        try {
            // Remove all activity-related storage that might have circular references
            const keysToRemove = [
                'fadedSkiesActivityLogs',
                'fadedSkiesChangeTracking',
                'fadedSkiesSessionLogs'
            ];

            keysToRemove.forEach(key => {
                if (localStorage.getItem(key)) {
                    localStorage.removeItem(key);
                    console.log(`🗑️ Removed ${key}`);
                }
            });

            // Also clear session storage
            if (sessionStorage.getItem('fadedSkiesSessionLogs')) {
                sessionStorage.removeItem('fadedSkiesSessionLogs');
                console.log('🗑️ Removed session logs');
            }

            console.log('✅ Emergency log cleanup completed');
        } catch (error) {
            console.error('❌ Error in emergency cleanup:', error);
        }
    }

    static resetAllData() {
        const confirmed = confirm('Are you sure you want to reset all data? This cannot be undone.');
        if (confirmed) {
            const keys = [
                'fadedSkiesLiveData',
                'fadedSkiesActivityLogs', 
                'fadedSkiesChangeTracking'
            ];
            
            keys.forEach(key => {
                localStorage.removeItem(key);
                console.log(`🗑️ Removed ${key}`);
            });
            
            sessionStorage.removeItem('fadedSkiesSessionLogs');
            console.log('🗑️ Removed session data');
            
            console.log('✅ All data reset - please refresh the page');
        }
    }
}

// Auto-run cleanup when script loads
if (typeof window !== 'undefined') {
    window.DataCleanup = DataCleanup;

    // Run cleanup immediately
    DataCleanup.cleanupCorruptedData();

    // Also run on DOM load as backup
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            DataCleanup.cleanupCorruptedData();
        });
    }

    // Add manual cleanup function to window for debugging
    window.forceDataCleanup = () => {
        console.log('🔧 Manual data cleanup triggered');
        DataCleanup.cleanupCorruptedData();
    };

    window.emergencyCleanup = () => {
        console.log('🚨 Emergency cleanup triggered');
        DataCleanup.emergencyLogCleanup();
    };

    window.resetAllData = () => {
        DataCleanup.resetAllData();
    };

    // ALWAYS run emergency cleanup to prevent circular reference issues
    console.log('🚨 Running emergency cleanup to prevent circular references');
    DataCleanup.emergencyLogCleanup();
}
