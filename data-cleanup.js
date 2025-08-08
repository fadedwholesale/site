// Data Cleanup Utility
// Fixes corrupted order data and other data structure issues

class DataCleanup {
    static cleanupCorruptedData() {
        console.log('🧹 Starting aggressive data cleanup...');

        // Clean up orders with invalid items structure
        this.cleanupOrders();

        // Clean up activity logs with circular references
        this.cleanupActivityLogs();

        // Clean up session data
        this.cleanupSessionData();

        // Force clear any corrupted real-time data
        this.clearCorruptedRealTimeData();

        console.log('✅ Aggressive data cleanup completed');
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
            
            logKeys.forEach(key => {
                const data = localStorage.getItem(key);
                if (data) {
                    try {
                        JSON.parse(data);
                        console.log(`✅ ${key} is valid JSON`);
                    } catch (error) {
                        console.log(`🧹 Removing corrupted ${key}`);
                        localStorage.removeItem(key);
                    }
                }
            });
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
    
    // Run cleanup on page load
    document.addEventListener('DOMContentLoaded', () => {
        DataCleanup.cleanupCorruptedData();
    });
}
