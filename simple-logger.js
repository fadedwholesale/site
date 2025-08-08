// Simple Logger System
// Clean, lightweight logging without circular reference issues

class SimpleLogger {
    constructor() {
        this.logKey = 'fadedSkiesSimpleLogs';
        this.maxLogs = 1000;
        this.sessionId = this.generateSessionId();
        
        console.log('📊 Simple Logger initialized');
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }

    // Main logging method - completely safe
    log(level, message, context = {}) {
        const logEntry = {
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            timestamp: new Date().toISOString(),
            level: level,
            message: String(message),
            sessionId: this.sessionId,
            page: window.location.pathname,
            user: window.currentUser?.email || 'anonymous',
            context: this.sanitizeContext(context)
        };

        // Console output with styling
        this.logToConsole(logEntry);

        // Store in background without blocking
        this.storeLogSafely(logEntry);

        return logEntry;
    }

    // Sanitize context to prevent circular references
    sanitizeContext(context) {
        if (!context || typeof context !== 'object') {
            return context;
        }

        const sanitized = {};
        const keys = Object.keys(context).slice(0, 10); // Limit keys

        for (const key of keys) {
            const value = context[key];
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
                sanitized[key] = value;
            } else if (Array.isArray(value)) {
                sanitized[key] = `[Array with ${value.length} items]`;
            } else if (typeof value === 'object') {
                sanitized[key] = '[Object]';
            } else {
                sanitized[key] = String(value);
            }
        }

        return sanitized;
    }

    // Safe storage without circular references
    storeLogSafely(logEntry) {
        try {
            const existingLogs = this.getLogs();
            const newLogs = [...existingLogs, logEntry].slice(-this.maxLogs);
            
            // Simple string serialization to avoid JSON.stringify issues
            const serialized = this.serializeLogsSafely(newLogs);
            localStorage.setItem(this.logKey, serialized);
        } catch (error) {
            console.warn('⚠️ Could not store log:', error.message);
        }
    }

    // Manual serialization to avoid circular reference issues
    serializeLogsSafely(logs) {
        const safeArray = logs.map(log => {
            return `${log.timestamp}|${log.level}|${log.message}|${log.sessionId}|${log.user}|${JSON.stringify(log.context)}`;
        });
        return JSON.stringify(safeArray);
    }

    // Get logs safely
    getLogs() {
        try {
            const stored = localStorage.getItem(this.logKey);
            if (!stored) return [];
            
            const parsed = JSON.parse(stored);
            return parsed.map(logStr => {
                const parts = logStr.split('|');
                return {
                    timestamp: parts[0],
                    level: parts[1],
                    message: parts[2],
                    sessionId: parts[3],
                    user: parts[4],
                    context: JSON.parse(parts[5] || '{}')
                };
            });
        } catch (error) {
            console.warn('⚠️ Could not load logs:', error.message);
            return [];
        }
    }

    // Console output with styling
    logToConsole(logEntry) {
        const styles = {
            error: 'color: #ff4444; font-weight: bold;',
            warning: 'color: #ff8800; font-weight: bold;',
            info: 'color: #0099ff;',
            debug: 'color: #888888;',
            system: 'color: #2196f3;',
            order: 'color: #ff9800; font-weight: bold;',
            inventory: 'color: #795548;'
        };

        const style = styles[logEntry.level] || '';
        const method = logEntry.level === 'error' ? 'error' : logEntry.level === 'warning' ? 'warn' : 'log';
        
        console[method](
            `%c[${logEntry.level.toUpperCase()}]%c ${logEntry.message}`,
            style,
            'color: inherit;',
            logEntry.context
        );
    }

    // Convenience methods for different log levels
    error(message, context) { return this.log('error', message, context); }
    warning(message, context) { return this.log('warning', message, context); }
    info(message, context) { return this.log('info', message, context); }
    debug(message, context) { return this.log('debug', message, context); }
    system(message, context) { return this.log('system', message, context); }
    order(message, context) { return this.log('order', message, context); }
    inventory(message, context) { return this.log('inventory', message, context); }

    // Get simple stats
    getStats() {
        const logs = this.getLogs();
        const stats = { total: logs.length };
        
        logs.forEach(log => {
            stats[log.level] = (stats[log.level] || 0) + 1;
        });
        
        return stats;
    }

    // Get status for integration tests
    getStatus() {
        return {
            initialized: true,
            sessionId: this.sessionId,
            totalLogs: this.getLogs().length,
            status: 'healthy'
        };
    }

    // Clear logs
    clearLogs() {
        localStorage.removeItem(this.logKey);
        console.log('🗑️ Logs cleared');
    }

    // Export logs
    exportLogs() {
        const logs = this.getLogs();
        const exportData = {
            metadata: {
                exportedAt: new Date().toISOString(),
                totalLogs: logs.length,
                sessionId: this.sessionId
            },
            logs: logs
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `simple-logs-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Auto-initialize
if (typeof window !== 'undefined') {
    window.SimpleLogger = SimpleLogger;
    
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.simpleLogger) {
            window.simpleLogger = new SimpleLogger();
            
            // Also create aliases for backward compatibility
            window.activityLogger = {
                log: (level, message, data) => window.simpleLogger.log(level, message, data),
                getStatus: () => window.simpleLogger.getStatus(),
                getStats: () => window.simpleLogger.getStats(),
                getLogs: () => window.simpleLogger.getLogs()
            };
            
            console.log('📊 Simple Logger ready');
        }
    });
}
