// Activity Logger and Change Tracking System
// Comprehensive logging for all user actions, system events, and data changes

class ActivityLogger {
    constructor() {
        this.logStorageKey = 'fadedSkiesActivityLogs';
        this.changeStorageKey = 'fadedSkiesChangeTracking';
        this.sessionStorageKey = 'fadedSkiesSessionLogs';
        
        this.maxLogs = 5000;
        this.maxSessionLogs = 1000;
        this.logBuffer = [];
        this.changeBuffer = [];
        this.batchSize = 10;
        this.flushInterval = 5000; // 5 seconds
        
        this.currentSession = null;
        this.eventQueue = [];
        this.isProcessingQueue = false;
        this.lastFlushTime = null;
        
        this.logLevels = {
            ERROR: 'error',
            WARNING: 'warning', 
            INFO: 'info',
            DEBUG: 'debug',
            SECURITY: 'security',
            PERFORMANCE: 'performance',
            USER_ACTION: 'user_action',
            SYSTEM: 'system',
            ORDER: 'order',
            INVENTORY: 'inventory',
            ADMIN: 'admin'
        };

        this.init();
    }

    init() {
        console.log('📊 Initializing Activity Logger...');
        
        // Initialize session
        this.initializeSession();
        
        // Set up automatic flushing
        this.startAutoFlush();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Set up performance monitoring
        this.setupPerformanceMonitoring();
        
        // Set up error tracking
        this.setupErrorTracking();
        
        // Set up user interaction tracking
        this.setupUserInteractionTracking();
        
        // Set up cleanup on unload
        this.setupCleanup();
        
        console.log('✅ Activity Logger initialized');
        this.log(this.logLevels.SYSTEM, 'Activity Logger initialized', {
            sessionId: this.currentSession?.id,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
        });
    }

    // Initialize session tracking
    initializeSession() {
        this.currentSession = {
            id: this.generateSessionId(),
            startTime: new Date().toISOString(),
            userEmail: window.currentUser?.email || 'anonymous',
            userType: this.detectUserType(),
            page: window.location.pathname,
            userAgent: navigator.userAgent,
            screen: {
                width: screen.width,
                height: screen.height,
                colorDepth: screen.colorDepth
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            events: []
        };

        // Store session in session storage for quick access (completely safe)
        const safeSession = this.getSafeSessionData();
        // Always use safe stringify for session storage
        sessionStorage.setItem(this.sessionStorageKey, this.safeJSONStringify(safeSession));
        
        this.log(this.logLevels.SYSTEM, 'Session started', this.currentSession);
    }

    // Detect user type based on current page and permissions
    detectUserType() {
        if (window.location.href.includes('admin')) {
            return 'admin';
        } else if (window.currentUser?.email) {
            return 'partner';
        } else {
            return 'anonymous';
        }
    }

    // Generate unique session ID
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Main logging method
    log(level, message, data = null, options = {}) {
        const logEntry = {
            id: this.generateLogId(),
            timestamp: new Date().toISOString(),
            level: level,
            message: message,
            data: data,
            sessionId: this.currentSession?.id,
            userEmail: window.currentUser?.email || 'anonymous',
            userType: this.currentSession?.userType || 'unknown',
            page: window.location.pathname,
            url: window.location.href,
            stack: options.includeStack ? new Error().stack : null,
            clientInfo: {
                userAgent: navigator.userAgent,
                language: navigator.language,
                platform: navigator.platform,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine
            }
        };

        // Add to session events (completely safe to prevent circular references)
        if (this.currentSession) {
            // Only store basic, safe data in session events
            this.currentSession.events.push({
                timestamp: logEntry.timestamp,
                level: level,
                message: message.length > 100 ? message.substring(0, 100) + '...' : message,
                hasData: data !== null && data !== undefined
            });

            // Limit session events more aggressively
            if (this.currentSession.events.length > 50) {
                this.currentSession.events = this.currentSession.events.slice(-50);
            }
        }

        // Add to buffer for batch processing
        this.logBuffer.push(logEntry);

        // Console logging with appropriate level
        this.logToConsole(logEntry);

        // Immediate logging for critical events
        if (level === this.logLevels.ERROR || level === this.logLevels.SECURITY) {
            this.flushLogs();
        }

        // Real-time broadcast for important events
        if (this.shouldBroadcast(level)) {
            this.broadcastLogEvent(logEntry);
        }

        return logEntry;
    }

    // Track data changes with before/after snapshots
    trackChange(entity, action, entityId, beforeData, afterData, metadata = {}) {
        const changeEntry = {
            id: this.generateChangeId(),
            timestamp: new Date().toISOString(),
            sessionId: this.currentSession?.id,
            userEmail: window.currentUser?.email || 'anonymous',
            userType: this.currentSession?.userType || 'unknown',
            entity: entity, // 'product', 'order', 'user', etc.
            action: action, // 'create', 'update', 'delete'
            entityId: entityId,
            beforeData: beforeData,
            afterData: afterData,
            diff: this.calculateDiff(beforeData, afterData),
            metadata: {
                ...metadata,
                userAgent: navigator.userAgent,
                page: window.location.pathname,
                timestamp: new Date().toISOString()
            }
        };

        // Add to change buffer
        this.changeBuffer.push(changeEntry);

        // Log the change
        this.log(this.logLevels.INFO, `${entity} ${action}`, {
            changeId: changeEntry.id,
            entityId: entityId,
            changedFields: Object.keys(changeEntry.diff),
            ...metadata
        });

        // Real-time broadcast for data changes
        this.broadcastChangeEvent(changeEntry);

        return changeEntry;
    }

    // Calculate differences between before and after data
    calculateDiff(beforeData, afterData) {
        const diff = {};

        if (!beforeData && afterData) {
            // New entity
            return { __created: afterData };
        }

        if (beforeData && !afterData) {
            // Deleted entity
            return { __deleted: beforeData };
        }

        if (beforeData && afterData) {
            // Compare objects
            const allKeys = new Set([...Object.keys(beforeData), ...Object.keys(afterData)]);
            
            allKeys.forEach(key => {
                const beforeValue = beforeData[key];
                const afterValue = afterData[key];
                
                try {
                    // Safe comparison without JSON.stringify
                    let valuesEqual = false;
                    if (beforeValue === afterValue) {
                        valuesEqual = true;
                    } else if (typeof beforeValue !== typeof afterValue) {
                        valuesEqual = false;
                    } else if (typeof beforeValue === 'object' && beforeValue !== null && afterValue !== null) {
                        // For objects, do shallow comparison to avoid circular references
                        valuesEqual = Object.keys(beforeValue).length === Object.keys(afterValue).length &&
                                    Object.keys(beforeValue).every(k => beforeValue[k] === afterValue[k]);
                    } else {
                        valuesEqual = beforeValue === afterValue;
                    }

                    if (!valuesEqual) {
                        diff[key] = {
                            before: typeof beforeValue === 'object' ? '[Object]' : beforeValue,
                            after: typeof afterValue === 'object' ? '[Object]' : afterValue
                        };
                    }
                } catch (error) {
                    // Handle any comparison errors
                    diff[key] = {
                        before: '[Complex Object]',
                        after: '[Complex Object]'
                    };
                }
            });
        }

        return diff;
    }

    // Log user actions with context
    logUserAction(action, target, details = {}) {
        const actionData = {
            action: action,
            target: target,
            details: details,
            timing: {
                timestamp: new Date().toISOString(),
                performanceNow: performance.now()
            },
            context: {
                page: window.location.pathname,
                referrer: document.referrer,
                userAgent: navigator.userAgent
            }
        };

        return this.log(this.logLevels.USER_ACTION, `User ${action}`, actionData);
    }

    // Log order events with full context
    logOrderEvent(event, orderId, orderData, additionalData = {}) {
        const orderLogData = {
            event: event,
            orderId: orderId,
            orderData: orderData,
            additionalData: additionalData,
            timestamp: new Date().toISOString(),
            userEmail: window.currentUser?.email,
            sessionId: this.currentSession?.id
        };

        return this.log(this.logLevels.ORDER, `Order ${event}`, orderLogData);
    }

    // Log inventory changes
    logInventoryChange(productId, changeType, oldValue, newValue, reason) {
        const inventoryData = {
            productId: productId,
            changeType: changeType, // 'stock_update', 'price_change', 'status_change'
            oldValue: oldValue,
            newValue: newValue,
            reason: reason,
            timestamp: new Date().toISOString(),
            userEmail: window.currentUser?.email
        };

        return this.log(this.logLevels.INVENTORY, `Inventory ${changeType}`, inventoryData);
    }

    // Log admin actions
    logAdminAction(action, target, details = {}) {
        const adminData = {
            action: action,
            target: target,
            details: details,
            adminUser: window.currentUser?.email,
            timestamp: new Date().toISOString(),
            sessionId: this.currentSession?.id,
            ipAddress: this.getClientIP() // Note: This would need server-side implementation
        };

        return this.log(this.logLevels.ADMIN, `Admin ${action}`, adminData);
    }

    // Setup event listeners for automatic tracking
    setupEventListeners() {
        // Track page visibility changes
        document.addEventListener('visibilitychange', () => {
            this.log(this.logLevels.INFO, `Page ${document.hidden ? 'hidden' : 'visible'}`);
        });

        // Track window focus/blur
        window.addEventListener('focus', () => {
            this.log(this.logLevels.INFO, 'Window focused');
        });

        window.addEventListener('blur', () => {
            this.log(this.logLevels.INFO, 'Window blurred');
        });

        // Track network status
        window.addEventListener('online', () => {
            this.log(this.logLevels.INFO, 'Network online');
        });

        window.addEventListener('offline', () => {
            this.log(this.logLevels.WARNING, 'Network offline');
        });

        // Track window resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.log(this.logLevels.INFO, 'Window resized', {
                    width: window.innerWidth,
                    height: window.innerHeight
                });
            }, 500);
        });
    }

    // Setup performance monitoring
    setupPerformanceMonitoring() {
        // Track page load performance
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfData = performance.getEntriesByType('navigation')[0];
                if (perfData) {
                    this.log(this.logLevels.PERFORMANCE, 'Page load performance', {
                        loadTime: perfData.loadEventEnd - perfData.loadEventStart,
                        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
                        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
                        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime
                    });
                }
            }, 1000);
        });

        // Monitor long tasks
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.duration > 50) { // Long task > 50ms
                            this.log(this.logLevels.PERFORMANCE, 'Long task detected', {
                                duration: entry.duration,
                                startTime: entry.startTime,
                                name: entry.name
                            });
                        }
                    }
                });
                observer.observe({ entryTypes: ['longtask'] });
            } catch (error) {
                console.log('PerformanceObserver not fully supported');
            }
        }
    }

    // Setup error tracking
    setupErrorTracking() {
        // Global error handler
        window.addEventListener('error', (event) => {
            this.log(this.logLevels.ERROR, 'JavaScript error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            }, { includeStack: true });
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            this.log(this.logLevels.ERROR, 'Unhandled promise rejection', {
                reason: event.reason,
                promise: event.promise
            });
        });
    }

    // Setup user interaction tracking
    setupUserInteractionTracking() {
        // Track clicks on important elements
        document.addEventListener('click', (event) => {
            const element = event.target;
            
            // Track button clicks
            if (element.tagName === 'BUTTON' || element.classList.contains('btn')) {
                this.logUserAction('click', 'button', {
                    buttonText: element.textContent?.trim(),
                    buttonClass: element.className,
                    buttonId: element.id
                });
            }
            
            // Track link clicks
            if (element.tagName === 'A') {
                this.logUserAction('click', 'link', {
                    href: element.href,
                    linkText: element.textContent?.trim()
                });
            }
        });

        // Track form submissions
        document.addEventListener('submit', (event) => {
            const form = event.target;
            this.logUserAction('submit', 'form', {
                formId: form.id,
                formClass: form.className,
                action: form.action,
                method: form.method
            });
        });

        // Track input changes on important fields
        document.addEventListener('change', (event) => {
            const element = event.target;
            if (element.classList.contains('search-input') || 
                element.classList.contains('editable') ||
                element.tagName === 'SELECT') {
                
                this.logUserAction('change', 'input', {
                    inputType: element.type,
                    inputId: element.id,
                    inputClass: element.className,
                    valueLength: element.value?.length || 0
                });
            }
        });
    }

    // Check if log should be broadcast to other tabs
    shouldBroadcast(level) {
        const broadcastLevels = [
            this.logLevels.ERROR,
            this.logLevels.SECURITY,
            this.logLevels.ORDER,
            this.logLevels.ADMIN,
            this.logLevels.INVENTORY
        ];
        return broadcastLevels.includes(level);
    }

    // Broadcast log event to other tabs
    broadcastLogEvent(logEntry) {
        if (window.realTimeSync) {
            window.realTimeSync.broadcast('log_event', {
                logId: logEntry.id,
                level: logEntry.level,
                message: logEntry.message,
                timestamp: logEntry.timestamp,
                userEmail: logEntry.userEmail
            });
        }
    }

    // Broadcast change event to other tabs
    broadcastChangeEvent(changeEntry) {
        if (window.realTimeSync) {
            window.realTimeSync.broadcast('data_change', {
                changeId: changeEntry.id,
                entity: changeEntry.entity,
                action: changeEntry.action,
                entityId: changeEntry.entityId,
                timestamp: changeEntry.timestamp,
                userEmail: changeEntry.userEmail
            });
        }
    }

    // Console logging with appropriate styling
    logToConsole(logEntry) {
        const style = this.getConsoleStyle(logEntry.level);
        const method = this.getConsoleMethod(logEntry.level);
        
        console[method](
            `%c[${logEntry.level.toUpperCase()}]%c ${logEntry.message}`,
            style,
            'color: inherit;',
            logEntry.data
        );
    }

    // Get console styling for log level
    getConsoleStyle(level) {
        const styles = {
            [this.logLevels.ERROR]: 'color: #ff4444; font-weight: bold;',
            [this.logLevels.WARNING]: 'color: #ffa500; font-weight: bold;',
            [this.logLevels.INFO]: 'color: #00bfff;',
            [this.logLevels.DEBUG]: 'color: #888888;',
            [this.logLevels.SECURITY]: 'color: #ff1744; font-weight: bold; background: #ffebee;',
            [this.logLevels.PERFORMANCE]: 'color: #9c27b0;',
            [this.logLevels.USER_ACTION]: 'color: #4caf50;',
            [this.logLevels.SYSTEM]: 'color: #2196f3;',
            [this.logLevels.ORDER]: 'color: #ff9800; font-weight: bold;',
            [this.logLevels.INVENTORY]: 'color: #795548;',
            [this.logLevels.ADMIN]: 'color: #e91e63; font-weight: bold;'
        };
        return styles[level] || '';
    }

    // Get console method for log level
    getConsoleMethod(level) {
        if (level === this.logLevels.ERROR) return 'error';
        if (level === this.logLevels.WARNING) return 'warn';
        return 'log';
    }

    // Start automatic log flushing
    startAutoFlush() {
        setInterval(() => {
            this.flushLogs();
        }, this.flushInterval);
    }

    // Completely safe JSON serialization without using JSON.stringify
    safeJSONStringify(obj, maxDepth = 3) {
        const seen = new WeakSet();
        let depth = 0;

        const serialize = (value, currentDepth = 0) => {
            // Handle primitives
            if (value === null) return 'null';
            if (value === undefined) return '"[Undefined]"';
            if (typeof value === 'boolean') return value.toString();
            if (typeof value === 'number') {
                return isFinite(value) ? value.toString() : 'null';
            }
            if (typeof value === 'string') {
                return '"' + value.replace(/"/g, '\\"').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t') + '"';
            }
            if (typeof value === 'function') {
                return '"[Function]"';
            }

            // Handle depth limit
            if (currentDepth >= maxDepth) {
                return '"[Max depth reached]"';
            }

            // Handle circular references
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) {
                    return '"[Circular Reference]"';
                }
                seen.add(value);
            }

            try {
                // Handle arrays
                if (Array.isArray(value)) {
                    if (value.length === 0) return '[]';
                    if (value.length > 20) {
                        return `"[Array with ${value.length} items - truncated]"`;
                    }

                    const items = [];
                    for (let i = 0; i < Math.min(value.length, 20); i++) {
                        items.push(serialize(value[i], currentDepth + 1));
                    }
                    return '[' + items.join(',') + ']';
                }

                // Handle objects
                if (typeof value === 'object') {
                    const keys = Object.keys(value);
                    if (keys.length === 0) return '{}';

                    // Skip problematic keys
                    const safeKeys = keys.filter(key => {
                        if (key === 'events' && Array.isArray(value[key]) && value[key].length > 5) return false;
                        if (key === 'currentSession' && typeof value[key] === 'object') return false;
                        if (key === 'data' && typeof value[key] === 'object' && value[key] && (value[key].sessionId || value[key].currentSession)) return false;
                        return true;
                    });

                    if (safeKeys.length > 15) {
                        return `"{Object with ${keys.length} properties - truncated}"`;
                    }

                    const pairs = [];
                    for (const key of safeKeys.slice(0, 15)) {
                        const keyStr = '"' + key.replace(/"/g, '\\"') + '"';
                        const valueStr = serialize(value[key], currentDepth + 1);
                        pairs.push(keyStr + ':' + valueStr);
                    }
                    return '{' + pairs.join(',') + '}';
                }

                return '"[Unknown type]"';
            } catch (error) {
                return '"[Serialization error]"';
            } finally {
                if (typeof value === 'object' && value !== null) {
                    seen.delete(value);
                }
            }
        };

        try {
            return serialize(obj);
        } catch (error) {
            return '{"error":"Complete serialization failure","message":"' + (error.message || 'Unknown error').replace(/"/g, '\\"') + '"}';
        }
    }

    // Create safe session data without circular references
    getSafeSessionData() {
        if (!this.currentSession) return null;

        return {
            id: this.currentSession.id,
            startTime: this.currentSession.startTime,
            endTime: this.currentSession.endTime,
            userEmail: this.currentSession.userEmail,
            userType: this.currentSession.userType,
            page: this.currentSession.page,
            userAgent: this.currentSession.userAgent,
            screen: this.currentSession.screen,
            viewport: this.currentSession.viewport,
            eventCount: this.currentSession.events ? this.currentSession.events.length : 0,
            duration: this.currentSession.duration
        };
    }

    // Flush logs to storage
    flushLogs() {
        if (this.logBuffer.length === 0 && this.changeBuffer.length === 0) {
            return;
        }

        try {
            // Flush activity logs
            if (this.logBuffer.length > 0) {
                const existingLogs = this.getStoredLogs();
                const newLogs = [...existingLogs, ...this.logBuffer];

                // Keep only recent logs
                const trimmedLogs = newLogs.slice(-this.maxLogs);

                localStorage.setItem(this.logStorageKey, this.safeJSONStringify(trimmedLogs));
                console.log(`💾 Flushed ${this.logBuffer.length} logs to storage`);
                this.logBuffer = [];
            }

            // Flush change tracking
            if (this.changeBuffer.length > 0) {
                const existingChanges = this.getStoredChanges();
                const newChanges = [...existingChanges, ...this.changeBuffer];

                // Keep only recent changes
                const trimmedChanges = newChanges.slice(-this.maxLogs);

                localStorage.setItem(this.changeStorageKey, this.safeJSONStringify(trimmedChanges));
                console.log(`📝 Flushed ${this.changeBuffer.length} changes to storage`);
                this.changeBuffer = [];
            }

            // Update session in session storage (completely safe)
            if (this.currentSession) {
                const safeSession = this.getSafeSessionData();
                // Always use safe stringify for session storage
                sessionStorage.setItem(this.sessionStorageKey, this.safeJSONStringify(safeSession));
            }

            // Update last flush time
            this.lastFlushTime = new Date().toISOString();

        } catch (error) {
            console.error('❌ Error flushing logs:', error);

            // Clear some space and try again
            this.cleanupOldLogs();
            try {
                const safeLogBuffer = this.logBuffer.slice(-100).map(log => ({
                    ...log,
                    data: log.data ? '[Simplified]' : null
                }));
                const safeChangeBuffer = this.changeBuffer.slice(-100).map(change => ({
                    ...change,
                    beforeData: '[Simplified]',
                    afterData: '[Simplified]'
                }));

                localStorage.setItem(this.logStorageKey, this.safeJSONStringify(safeLogBuffer));
                localStorage.setItem(this.changeStorageKey, this.safeJSONStringify(safeChangeBuffer));
                this.logBuffer = [];
                this.changeBuffer = [];
            } catch (retryError) {
                console.error('��� Failed to flush logs even after cleanup:', retryError);
                // Clear buffers to prevent infinite retry
                this.logBuffer = [];
                this.changeBuffer = [];
            }
        }
    }

    // Get stored logs
    getStoredLogs() {
        try {
            const logs = localStorage.getItem(this.logStorageKey);
            return logs ? JSON.parse(logs) : [];
        } catch (error) {
            console.error('❌ Error loading stored logs:', error);
            return [];
        }
    }

    // Get stored changes
    getStoredChanges() {
        try {
            const changes = localStorage.getItem(this.changeStorageKey);
            return changes ? JSON.parse(changes) : [];
        } catch (error) {
            console.error('❌ Error loading stored changes:', error);
            return [];
        }
    }

    // Generate unique log ID
    generateLogId() {
        return 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }

    // Generate unique change ID
    generateChangeId() {
        return 'chg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }

    // Get logs with filtering options
    getLogs(options = {}) {
        const { level, startDate, endDate, userEmail, limit = 100 } = options;
        let logs = this.getStoredLogs();

        // Apply filters
        if (level) {
            logs = logs.filter(log => log.level === level);
        }

        if (startDate) {
            logs = logs.filter(log => new Date(log.timestamp) >= new Date(startDate));
        }

        if (endDate) {
            logs = logs.filter(log => new Date(log.timestamp) <= new Date(endDate));
        }

        if (userEmail) {
            logs = logs.filter(log => log.userEmail === userEmail);
        }

        // Return most recent logs
        return logs.slice(-limit);
    }

    // Get changes with filtering options
    getChanges(options = {}) {
        const { entity, action, entityId, userEmail, startDate, endDate, limit = 100 } = options;
        let changes = this.getStoredChanges();

        // Apply filters
        if (entity) {
            changes = changes.filter(change => change.entity === entity);
        }

        if (action) {
            changes = changes.filter(change => change.action === action);
        }

        if (entityId) {
            changes = changes.filter(change => change.entityId === entityId);
        }

        if (userEmail) {
            changes = changes.filter(change => change.userEmail === userEmail);
        }

        if (startDate) {
            changes = changes.filter(change => new Date(change.timestamp) >= new Date(startDate));
        }

        if (endDate) {
            changes = changes.filter(change => new Date(change.timestamp) <= new Date(endDate));
        }

        return changes.slice(-limit);
    }

    // Get session information
    getSessionInfo() {
        return {
            current: this.currentSession,
            stored: JSON.parse(sessionStorage.getItem(this.sessionStorageKey) || 'null')
        };
    }

    // Export logs for download
    exportLogs(format = 'json') {
        const logs = this.getStoredLogs();
        const changes = this.getStoredChanges();
        
        const exportData = {
            metadata: {
                exportedAt: new Date().toISOString(),
                exportedBy: window.currentUser?.email || 'anonymous',
                totalLogs: logs.length,
                totalChanges: changes.length,
                format: format
            },
            session: this.currentSession,
            logs: logs,
            changes: changes
        };

        const filename = `faded-skies-logs-${new Date().toISOString().split('T')[0]}.${format}`;
        
        if (format === 'json') {
            this.downloadJSON(exportData, filename);
        } else if (format === 'csv') {
            this.downloadCSV(logs, filename.replace('.csv', '-logs.csv'));
            this.downloadCSV(changes, filename.replace('.csv', '-changes.csv'));
        }
    }

    // Download JSON data
    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Download CSV data
    downloadCSV(data, filename) {
        if (data.length === 0) return;
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    const value = row[header];
                    if (typeof value === 'object') {
                        return `"${this.safeJSONStringify(value).replace(/"/g, '""')}"`;
                    }
                    return `"${String(value).replace(/"/g, '""')}"`;
                }).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Cleanup old logs
    cleanupOldLogs() {
        try {
            const logs = this.getStoredLogs();
            const changes = this.getStoredChanges();
            
            // Keep only recent logs and changes
            const recentLogs = logs.slice(-Math.floor(this.maxLogs * 0.5));
            const recentChanges = changes.slice(-Math.floor(this.maxLogs * 0.5));
            
            localStorage.setItem(this.logStorageKey, this.safeJSONStringify(recentLogs));
            localStorage.setItem(this.changeStorageKey, this.safeJSONStringify(recentChanges));
            
            console.log('🧹 Cleaned up old logs and changes');
        } catch (error) {
            console.error('❌ Error cleaning up logs:', error);
        }
    }

    // Get client IP (would need server-side implementation)
    getClientIP() {
        // This is a placeholder - actual IP detection would require server-side support
        return 'client-side-unknown';
    }

    // Setup cleanup on page unload
    setupCleanup() {
        window.addEventListener('beforeunload', () => {
            // End session
            if (this.currentSession) {
                this.currentSession.endTime = new Date().toISOString();
                this.currentSession.duration = new Date() - new Date(this.currentSession.startTime);
            }

            // Flush any remaining logs
            this.flushLogs();
            
            this.log(this.logLevels.SYSTEM, 'Session ended', {
                sessionId: this.currentSession?.id,
                duration: this.currentSession?.duration
            });
        });
    }

    // Get logging statistics
    getStats() {
        const logs = this.getStoredLogs();
        const changes = this.getStoredChanges();

        const logsByLevel = {};
        Object.values(this.logLevels).forEach(level => {
            logsByLevel[level] = logs.filter(log => log.level === level).length;
        });

        const changesByEntity = {};
        changes.forEach(change => {
            changesByEntity[change.entity] = (changesByEntity[change.entity] || 0) + 1;
        });

        return {
            totalLogs: logs.length,
            totalChanges: changes.length,
            logsByLevel: logsByLevel,
            changesByEntity: changesByEntity,
            currentSession: this.currentSession?.id,
            bufferSize: this.logBuffer.length + this.changeBuffer.length
        };
    }

    // Get system status for integration testing
    getStatus() {
        return {
            initialized: true,
            sessionActive: this.currentSession !== null,
            sessionId: this.currentSession?.id,
            bufferSize: this.logBuffer.length + this.changeBuffer.length,
            totalLogs: this.getStoredLogs().length,
            totalChanges: this.getStoredChanges().length,
            autoFlushEnabled: true,
            lastFlush: this.lastFlushTime || 'Never',
            status: 'healthy'
        };
    }

    // Destroy logger
    destroy() {
        // Flush any remaining logs
        this.flushLogs();
        
        // Clear buffers
        this.logBuffer = [];
        this.changeBuffer = [];
        
        // End session
        if (this.currentSession) {
            this.currentSession.endTime = new Date().toISOString();
            this.log(this.logLevels.SYSTEM, 'Activity Logger destroyed');
        }
        
        console.log('📊 Activity Logger destroyed');
    }
}

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
    window.ActivityLogger = ActivityLogger;
    
    // Initialize after DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.activityLogger) {
            window.activityLogger = new ActivityLogger();
            console.log('📊 Global Activity Logger initialized');
        }
    });
}
