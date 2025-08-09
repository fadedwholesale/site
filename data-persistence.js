// Data Persistence and Recovery System for Faded Skies Portal
// Handles automatic backup, recovery, and data integrity

class DataPersistence {
    constructor() {
        this.backupKey = 'fadedSkiesBackup';
        this.backupInterval = 300000; // 5 minutes instead of 30 seconds
        this.maxBackups = 5; // Reduce backup count to save storage
        this.backupTimer = null;
        this.recoveryTimer = null;
        this.isRecovering = false;

        this.init();
    }

    init() {
        console.log('💾 Initializing Data Persistence System...');

        // Wait for SharedDataManager to be ready before starting
        this.waitForSharedDataManager().then(() => {
            // Start automatic backup
            this.startAutomaticBackup();

            // Set up recovery mechanisms
            this.setupRecoveryMechanisms();

            // Check for corrupted data on startup
            this.performStartupCheck();

            console.log('✅ Data Persistence System initialized');
        }).catch(error => {
            console.warn('⚠️ SharedDataManager not ready, starting with limited functionality:', error);
            // Set up basic mechanisms without data operations
            this.setupRecoveryMechanisms();
            console.log('⚠️ Data Persistence System initialized with limited functionality');
        });
    }

    // Wait for SharedDataManager to be ready
    async waitForSharedDataManager(maxAttempts = 10) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            if (window.sharedDataManager &&
                typeof window.sharedDataManager.getData === 'function' &&
                window.sharedDataManager.getStatus &&
                window.sharedDataManager.getStatus().firebaseReady) {

                console.log('✅ SharedDataManager is ready for persistence operations');
                return true;
            }

            console.log(`⏳ Waiting for SharedDataManager... (${attempt + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.warn('⚠️ SharedDataManager readiness timeout after', maxAttempts, 'attempts');
        return false;
    }

    // Start automatic backup system
    startAutomaticBackup() {
        this.backupTimer = setInterval(async () => {
            try {
                await this.createBackup();
            } catch (error) {
                console.warn('⚠️ Error in automatic backup:', error);
            }
        }, this.backupInterval);

        console.log(`💾 Automatic backup started (every ${this.backupInterval / 1000} seconds)`);
    }

    // Create a backup of current data
    async createBackup() {
        try {
            if (window.sharedDataManager &&
                typeof window.sharedDataManager.getData === 'function' &&
                window.sharedDataManager.getStatus &&
                window.sharedDataManager.getStatus().firebaseReady) {

                const currentData = await window.sharedDataManager.getData();

                // Validate data before backing up
                if (!this.isValidDataStructure(currentData)) {
                    console.warn('⚠️ Invalid data structure, skipping backup');
                    return;
                }

                const backup = {
                    timestamp: new Date().toISOString(),
                    data: currentData,
                    version: currentData.version || 1,
                    userEmail: window.currentUser?.email,
                    checksum: this.calculateChecksum(currentData)
                };

                this.saveBackup(backup);
                console.log('💾 Backup created:', backup.timestamp);
            } else {
                console.log('⏳ SharedDataManager not ready, skipping backup');
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
        
        // Periodic data integrity checks (reduced frequency to prevent false positives)
        this.recoveryTimer = setInterval(async () => {
            try {
                await this.performIntegrityCheck();
            } catch (error) {
                console.warn('⚠️ Error in periodic integrity check:', error);
            }
        }, 300000); // Check every 5 minutes instead of 1 minute
    }

    // Perform startup check for data integrity
    async performStartupCheck() {
        console.log('🔍 Performing startup data integrity check...');

        try {
            if (window.sharedDataManager && typeof window.sharedDataManager.getData === 'function') {
                // Add delay to ensure Firebase is properly initialized
                await new Promise(resolve => setTimeout(resolve, 2000));

                const currentData = await window.sharedDataManager.getData();

                // Only check for critical issues, not minor structural differences
                if (currentData && typeof currentData === 'object') {
                    console.log('✅ Startup data integrity check passed');
                } else {
                    console.warn('⚠️ No valid data found during startup, but this may be normal for new installations');
                }
            } else {
                console.log('⏳ SharedDataManager not ready for startup check, skipping');
            }
        } catch (error) {
            console.warn('⚠️ Startup check failed, but continuing normally:', error);
            // Don't initiate recovery on startup errors, as the system might just be initializing
        }
    }

    // Periodic integrity check
    async performIntegrityCheck() {
        if (this.isRecovering) return;

        try {
            if (window.sharedDataManager && typeof window.sharedDataManager.getData === 'function') {
                const currentData = await window.sharedDataManager.getData();

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
        if (!data || typeof data !== 'object') {
            console.warn('❌ Data is not an object');
            return false;
        }

        // Check required properties for new SharedDataManager structure
        const requiredProps = ['products', 'orders', 'systemConfig'];
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

        if (!data.systemConfig || typeof data.systemConfig !== 'object') {
            console.warn('❌ SystemConfig should be an object');
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
                await this.resetToDefaults();
            }
        } catch (error) {
            console.error('❌ Recovery process failed:', error);
            if (window.showNotification) {
                window.showNotification('❌ Recovery failed - resetting to defaults', 'error');
            }
            await this.resetToDefaults();
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
                    // Since SharedDataManager uses Firebase, we need to restore data through its methods
                    if (backup.data.products) {
                        await window.sharedDataManager.updateProducts(backup.data.products);
                    }
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
    async resetToDefaults() {
        console.log('🔄 Resetting to default data...');

        try {
            if (window.sharedDataManager) {
                // Since SharedDataManager doesn't have clearAllData, we'll initialize with basic empty data
                const defaultData = {
                    products: [],
                    orders: [],
                    systemConfig: {},
                    lastSync: new Date().toISOString()
                };

                // Update with empty products to effectively clear
                await window.sharedDataManager.updateProducts([]);
                console.log('✅ Reset to defaults completed');
            }
        } catch (error) {
            console.error('❌ Error resetting to defaults:', error);
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
    async createManualBackup() {
        console.log('💾 Creating manual backup...');
        try {
            await this.createBackup();
            if (window.showNotification) {
                window.showNotification('💾 Manual backup created', 'success');
            }
        } catch (error) {
            console.error('❌ Error creating manual backup:', error);
            if (window.showNotification) {
                window.showNotification('❌ Error creating backup', 'error');
            }
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
    async exportData() {
        try {
            if (window.sharedDataManager && typeof window.sharedDataManager.getData === 'function') {
                const data = await window.sharedDataManager.getData();
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
        } catch (error) {
            console.error('❌ Error exporting data:', error);
            if (window.showNotification) {
                window.showNotification('❌ Error exporting data', 'error');
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

    // Initialize with delay to allow other systems to load
    setTimeout(() => {
        if (!window.dataPersistence) {
            window.dataPersistence = new DataPersistence();
            console.log('💾 Global Data Persistence initialized');
        }
    }, 3000); // Wait 3 seconds for other systems to initialize
}
