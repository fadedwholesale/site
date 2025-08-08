// Data Persistence and Recovery System for Faded Skies Portal
// Handles automatic backup, recovery, and data integrity

class DataPersistence {
    constructor() {
        this.backupKey = 'fadedSkiesBackup';
        this.backupInterval = 30000; // 30 seconds
        this.maxBackups = 10;
        this.backupTimer = null;
        this.recoveryTimer = null;
        this.isRecovering = false;
        
        this.init();
    }

    init() {
        console.log('💾 Initializing Data Persistence System...');
        
        // Start automatic backup
        this.startAutomaticBackup();
        
        // Set up recovery mechanisms
        this.setupRecoveryMechanisms();
        
        // Check for corrupted data on startup
        this.performStartupCheck();
        
        console.log('✅ Data Persistence System initialized');
    }

    // Start automatic backup system
    startAutomaticBackup() {
        this.backupTimer = setInterval(() => {
            this.createBackup();
        }, this.backupInterval);
        
        console.log(`💾 Automatic backup started (every ${this.backupInterval / 1000} seconds)`);
    }

    // Create a backup of current data
    createBackup() {
        try {
            if (window.sharedDataManager) {
                const currentData = window.sharedDataManager.getData();
                const backup = {
                    timestamp: new Date().toISOString(),
                    data: currentData,
                    version: currentData.version || 1,
                    userEmail: window.currentUser?.email,
                    checksum: this.calculateChecksum(currentData)
                };
                
                this.saveBackup(backup);
                console.log('💾 Backup created:', backup.timestamp);
            }
        } catch (error) {
            console.error('❌ Error creating backup:', error);
        }
    }

    // Save backup to localStorage with rotation
    saveBackup(backup) {
        try {
            const backups = this.getBackups();
            backups.push(backup);
            
            // Keep only the latest backups
            if (backups.length > this.maxBackups) {
                backups.splice(0, backups.length - this.maxBackups);
            }
            
            localStorage.setItem(this.backupKey, JSON.stringify(backups));
        } catch (error) {
            console.error('❌ Error saving backup:', error);
            
            // If storage is full, clean old backups and try again
            this.cleanOldBackups();
            try {
                localStorage.setItem(this.backupKey, JSON.stringify([backup]));
            } catch (retryError) {
                console.error('❌ Failed to save backup after cleanup:', retryError);
            }
        }
    }

    // Get all backups
    getBackups() {
        try {
            const backups = localStorage.getItem(this.backupKey);
            return backups ? JSON.parse(backups) : [];
        } catch (error) {
            console.error('❌ Error loading backups:', error);
            return [];
        }
    }

    // Calculate data checksum for integrity verification
    calculateChecksum(data) {
        const jsonString = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < jsonString.length; i++) {
            const char = jsonString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    // Verify data integrity
    verifyDataIntegrity(data, expectedChecksum) {
        const actualChecksum = this.calculateChecksum(data);
        return actualChecksum === expectedChecksum;
    }

    // Set up recovery mechanisms
    setupRecoveryMechanisms() {
        // Listen for data corruption events
        window.addEventListener('error', (event) => {
            if (event.message && event.message.includes('JSON')) {
                console.warn('🔄 Possible data corruption detected, initiating recovery...');
                this.initiateRecovery();
            }
        });
        
        // Periodic data integrity checks
        this.recoveryTimer = setInterval(() => {
            this.performIntegrityCheck();
        }, 60000); // Check every minute
    }

    // Perform startup check for data integrity
    performStartupCheck() {
        console.log('🔍 Performing startup data integrity check...');
        
        try {
            if (window.sharedDataManager) {
                const currentData = window.sharedDataManager.getData();
                
                // Check if data structure is valid
                if (!this.isValidDataStructure(currentData)) {
                    console.warn('⚠️ Invalid data structure detected during startup');
                    this.initiateRecovery();
                    return;
                }
                
                // Check for obvious corruption signs
                if (this.hasCorruptionSigns(currentData)) {
                    console.warn('⚠️ Corruption signs detected during startup');
                    this.initiateRecovery();
                    return;
                }
                
                console.log('✅ Startup data integrity check passed');
            }
        } catch (error) {
            console.error('❌ Startup check failed:', error);
            this.initiateRecovery();
        }
    }

    // Periodic integrity check
    performIntegrityCheck() {
        if (this.isRecovering) return;
        
        try {
            if (window.sharedDataManager) {
                const currentData = window.sharedDataManager.getData();
                
                if (!this.isValidDataStructure(currentData)) {
                    console.warn('⚠️ Data integrity check failed - invalid structure');
                    this.initiateRecovery();
                }
            }
        } catch (error) {
            console.error('❌ Integrity check error:', error);
            this.initiateRecovery();
        }
    }

    // Check if data structure is valid
    isValidDataStructure(data) {
        if (!data || typeof data !== 'object') return false;
        
        // Check required properties
        const requiredProps = ['products', 'orders', 'carts'];
        for (const prop of requiredProps) {
            if (!(prop in data)) {
                console.warn(`❌ Missing required property: ${prop}`);
                return false;
            }
        }
        
        // Check data types
        if (!Array.isArray(data.products)) {
            console.warn('❌ Products should be an array');
            return false;
        }
        
        if (!Array.isArray(data.orders)) {
            console.warn('❌ Orders should be an array');
            return false;
        }
        
        if (!data.carts || typeof data.carts !== 'object') {
            console.warn('❌ Carts should be an object');
            return false;
        }
        
        return true;
    }

    // Check for corruption signs
    hasCorruptionSigns(data) {
        try {
            // Check if products have required fields
            if (data.products && data.products.length > 0) {
                for (const product of data.products) {
                    if (!product.id || !product.strain || typeof product.price !== 'number') {
                        console.warn('❌ Corrupted product found:', product);
                        return true;
                    }
                }
            }
            
            // Check if orders have required fields
            if (data.orders && data.orders.length > 0) {
                for (const order of data.orders) {
                    if (!order.id || !order.total || typeof order.total !== 'number') {
                        console.warn('❌ Corrupted order found:', order);
                        return true;
                    }
                }
            }
            
            return false;
        } catch (error) {
            console.error('❌ Error checking for corruption:', error);
            return true;
        }
    }

    // Initiate recovery process
    async initiateRecovery() {
        if (this.isRecovering) {
            console.log('🔄 Recovery already in progress');
            return;
        }
        
        this.isRecovering = true;
        console.log('🔄 Initiating data recovery...');
        
        try {
            // Show recovery notification
            if (window.showNotification) {
                window.showNotification('🔄 Recovering data from backup...', 'warning');
            }
            
            const recoveredData = await this.recoverFromBackup();
            
            if (recoveredData) {
                console.log('✅ Data recovery successful');
                if (window.showNotification) {
                    window.showNotification('✅ Data recovered successfully!', 'success');
                }
                
                // Update UI
                if (window.updateAllViews) {
                    window.updateAllViews();
                }
            } else {
                console.error('❌ Data recovery failed');
                if (window.showNotification) {
                    window.showNotification('❌ Data recovery failed - using defaults', 'error');
                }
                
                // Reset to default data
                this.resetToDefaults();
            }
        } catch (error) {
            console.error('❌ Recovery process failed:', error);
            if (window.showNotification) {
                window.showNotification('❌ Recovery failed - resetting to defaults', 'error');
            }
            this.resetToDefaults();
        } finally {
            this.isRecovering = false;
        }
    }

    // Recover data from the most recent valid backup
    async recoverFromBackup() {
        const backups = this.getBackups();
        
        if (backups.length === 0) {
            console.warn('⚠️ No backups available for recovery');
            return null;
        }
        
        // Try backups from most recent to oldest
        for (let i = backups.length - 1; i >= 0; i--) {
            const backup = backups[i];
            console.log(`🔄 Trying backup from ${backup.timestamp}`);
            
            try {
                // Verify backup integrity
                if (backup.checksum && !this.verifyDataIntegrity(backup.data, backup.checksum)) {
                    console.warn('⚠️ Backup checksum verification failed');
                    continue;
                }
                
                // Validate backup data structure
                if (!this.isValidDataStructure(backup.data)) {
                    console.warn('⚠️ Backup has invalid structure');
                    continue;
                }
                
                // Restore the backup
                if (window.sharedDataManager) {
                    backup.data.lastSync = new Date().toISOString();
                    window.sharedDataManager.importData(backup.data);
                    console.log(`✅ Successfully recovered from backup: ${backup.timestamp}`);
                    return backup.data;
                }
            } catch (error) {
                console.error(`❌ Failed to restore backup from ${backup.timestamp}:`, error);
                continue;
            }
        }
        
        console.error('❌ All backup recovery attempts failed');
        return null;
    }

    // Reset to default data
    resetToDefaults() {
        console.log('🔄 Resetting to default data...');
        
        if (window.sharedDataManager) {
            // Clear corrupted data
            window.sharedDataManager.clearAllData();
            
            // The SharedDataManager will initialize with default products
            console.log('✅ Reset to defaults completed');
        }
    }

    // Clean old backups to free storage space
    cleanOldBackups() {
        try {
            const backups = this.getBackups();
            const recentBackups = backups.slice(-5); // Keep only 5 most recent
            localStorage.setItem(this.backupKey, JSON.stringify(recentBackups));
            console.log('🧹 Cleaned old backups');
        } catch (error) {
            console.error('❌ Error cleaning backups:', error);
        }
    }

    // Manual backup trigger
    createManualBackup() {
        console.log('💾 Creating manual backup...');
        this.createBackup();
        if (window.showNotification) {
            window.showNotification('💾 Manual backup created', 'success');
        }
    }

    // Get recovery status
    getRecoveryStatus() {
        const backups = this.getBackups();
        return {
            isRecovering: this.isRecovering,
            backupCount: backups.length,
            lastBackup: backups.length > 0 ? backups[backups.length - 1].timestamp : null,
            autoBackupEnabled: this.backupTimer !== null
        };
    }

    // Export data for manual backup
    exportData() {
        if (window.sharedDataManager) {
            const data = window.sharedDataManager.getData();
            const backup = {
                timestamp: new Date().toISOString(),
                data: data,
                checksum: this.calculateChecksum(data)
            };
            
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `faded-skies-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            if (window.showNotification) {
                window.showNotification('📁 Data exported successfully', 'success');
            }
        }
    }

    // Cleanup when destroyed
    destroy() {
        if (this.backupTimer) {
            clearInterval(this.backupTimer);
        }
        if (this.recoveryTimer) {
            clearInterval(this.recoveryTimer);
        }
        console.log('💾 Data Persistence System destroyed');
    }
}

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
    window.DataPersistence = DataPersistence;
    
    // Initialize after DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.dataPersistence) {
            window.dataPersistence = new DataPersistence();
            console.log('💾 Global Data Persistence initialized');
        }
    });
}
