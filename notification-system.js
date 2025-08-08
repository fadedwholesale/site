// Enhanced Real-Time Notification System for Faded Skies Portal
// Provides advanced notifications with queueing, categorization, and real-time updates

class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.queue = [];
        this.maxNotifications = 5;
        this.defaultDuration = 4000;
        this.isProcessing = false;
        this.notificationId = 0;
        this.categories = {
            'success': { icon: '✅', priority: 1 },
            'error': { icon: '❌', priority: 5 },
            'warning': { icon: '⚠️', priority: 4 },
            'info': { icon: 'ℹ️', priority: 2 },
            'realtime': { icon: '📡', priority: 3 },
            'order': { icon: '🛒', priority: 4 },
            'inventory': { icon: '📦', priority: 3 },
            'user': { icon: '👤', priority: 2 },
            'system': { icon: '⚙️', priority: 3 }
        };
        
        this.init();
    }

    init() {
        console.log('🔔 Initializing Enhanced Notification System...');
        
        // Create notification container
        this.createNotificationContainer();
        
        // Set up real-time listeners
        this.setupRealTimeListeners();
        
        // Replace existing showNotification function
        this.replaceGlobalNotificationFunction();
        
        console.log('✅ Enhanced Notification System initialized');
    }

    // Create notification container in DOM
    createNotificationContainer() {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.style.cssText = `
                position: fixed;
                top: 100px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
                max-width: 400px;
            `;
            document.body.appendChild(container);
        }
        this.container = container;
    }

    // Set up real-time event listeners
    setupRealTimeListeners() {
        if (window.realTimeSync) {
            this.connectToRealTimeSync();
        } else {
            // Wait for real-time sync to be available
            setTimeout(() => this.setupRealTimeListeners(), 100);
        }
    }

    connectToRealTimeSync() {
        // Listen for specific real-time events that should trigger notifications
        window.realTimeSync.on('order_added', (data, metadata) => {
            if (metadata.remote) {
                this.showRealTimeNotification('order', `New order: ${data.id}`, {
                    details: `$${data.total?.toFixed(2)} from ${data.customerInfo?.name || 'Customer'}`,
                    action: () => this.openOrderDetails(data.id)
                });
            }
        });

        window.realTimeSync.on('product_updated', (data, metadata) => {
            if (metadata.remote && data.updates?.stock !== undefined) {
                const product = data.after || data;
                const stockLevel = data.updates.stock;
                
                if (stockLevel < 5) {
                    this.showRealTimeNotification('inventory', `Low stock alert!`, {
                        details: `${product.strain}: ${stockLevel} remaining`,
                        type: 'warning',
                        duration: 6000
                    });
                } else {
                    this.showRealTimeNotification('inventory', `Stock updated`, {
                        details: `${product.strain}: ${stockLevel} available`
                    });
                }
            }
        });

        window.realTimeSync.on('user_action', (data, metadata) => {
            if (metadata.remote) {
                this.handleUserActionNotification(data);
            }
        });

        window.realTimeSync.on('heartbeat', (data, metadata) => {
            if (metadata.remote && data.userEmail && data.userEmail !== window.currentUser?.email) {
                // Show subtle activity indicator for other users
                this.showActivityIndicator(data);
            }
        });

        window.realTimeSync.on('client_online', (data, metadata) => {
            if (metadata.remote) {
                this.showRealTimeNotification('system', 'User connected', {
                    details: 'Someone joined the portal',
                    duration: 2000
                });
            }
        });

        console.log('🔔 Connected to Real-Time Sync for notifications');
    }

    // Show notification with enhanced features
    show(message, type = 'info', options = {}) {
        const notification = {
            id: ++this.notificationId,
            message,
            type,
            timestamp: Date.now(),
            duration: options.duration || this.defaultDuration,
            details: options.details,
            action: options.action,
            actionText: options.actionText || 'View',
            persistent: options.persistent || false,
            priority: this.categories[type]?.priority || 2
        };

        this.queue.push(notification);
        this.processQueue();
    }

    // Show real-time specific notifications
    showRealTimeNotification(category, message, options = {}) {
        const type = options.type || 'realtime';
        this.show(message, type, {
            ...options,
            category,
            icon: this.categories[category]?.icon || '📡'
        });
    }

    // Handle user action notifications
    handleUserActionNotification(actionData) {
        switch (actionData.action) {
            case 'order_placed':
                this.showRealTimeNotification('order', 'New order placed!', {
                    details: `${actionData.userName}: $${actionData.amount?.toFixed(2)}`,
                    type: 'success',
                    duration: 5000
                });
                break;
                
            case 'user_joined':
                this.showRealTimeNotification('user', 'User joined', {
                    details: actionData.userName,
                    duration: 3000
                });
                break;
                
            case 'inventory_low':
                this.showRealTimeNotification('inventory', 'Inventory alert!', {
                    details: `${actionData.productName} is running low`,
                    type: 'warning',
                    duration: 6000
                });
                break;
        }
    }

    // Process notification queue
    async processQueue() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        while (this.queue.length > 0) {
            // Sort queue by priority (higher priority first)
            this.queue.sort((a, b) => b.priority - a.priority);
            
            const notification = this.queue.shift();
            
            // Check if we're at max notifications
            if (this.notifications.length >= this.maxNotifications) {
                // Remove oldest non-persistent notification
                const oldestRemovable = this.notifications.find(n => !n.persistent);
                if (oldestRemovable) {
                    this.removeNotification(oldestRemovable.id);
                }
            }
            
            this.displayNotification(notification);
            await this.delay(100); // Small delay between notifications
        }

        this.isProcessing = false;
    }

    // Display individual notification
    displayNotification(notification) {
        this.notifications.push(notification);
        
        const element = this.createNotificationElement(notification);
        this.container.appendChild(element);
        
        // Trigger animation
        requestAnimationFrame(() => {
            element.classList.add('show');
        });
        
        // Auto-remove after duration (unless persistent)
        if (!notification.persistent) {
            setTimeout(() => {
                this.removeNotification(notification.id);
            }, notification.duration);
        }
        
        console.log(`🔔 Notification displayed: ${notification.message}`);
    }

    // Create notification DOM element
    createNotificationElement(notification) {
        const element = document.createElement('div');
        element.id = `notification-${notification.id}`;
        element.className = `notification notification-${notification.type}`;
        
        const categoryInfo = this.categories[notification.type] || {};
        const icon = notification.icon || categoryInfo.icon || 'ℹ️';
        
        element.style.cssText = `
            background: var(--surface-card);
            color: var(--text-primary);
            padding: 16px;
            margin-bottom: 12px;
            border-radius: 12px;
            border: 1px solid var(--border-subtle);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            transform: translateX(420px);
            transition: all 0.3s ease;
            pointer-events: auto;
            position: relative;
            overflow: hidden;
        `;

        // Type-specific styling
        switch (notification.type) {
            case 'success':
                element.style.borderColor = 'var(--brand-green)';
                element.style.boxShadow = '0 8px 32px rgba(0, 200, 81, 0.3)';
                break;
            case 'error':
                element.style.borderColor = 'var(--accent-red)';
                element.style.boxShadow = '0 8px 32px rgba(255, 68, 68, 0.3)';
                break;
            case 'warning':
                element.style.borderColor = 'var(--accent-orange)';
                element.style.boxShadow = '0 8px 32px rgba(255, 165, 0, 0.3)';
                break;
            case 'realtime':
                element.style.borderColor = 'var(--accent-blue)';
                element.style.boxShadow = '0 8px 32px rgba(0, 191, 255, 0.3)';
                break;
        }

        element.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <div style="font-size: 18px; flex-shrink: 0; margin-top: 2px;">${icon}</div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; margin-bottom: 4px; font-size: 14px;">${notification.message}</div>
                    ${notification.details ? `<div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">${notification.details}</div>` : ''}
                    ${notification.action ? `
                        <button onclick="window.notificationSystem.handleAction(${notification.id})" 
                                style="background: var(--brand-green); color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; margin-top: 8px;">
                            ${notification.actionText}
                        </button>
                    ` : ''}
                </div>
                <button onclick="window.notificationSystem.removeNotification(${notification.id})" 
                        style="background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 16px; padding: 0; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;">
                    ×
                </button>
            </div>
            ${!notification.persistent ? `
                <div style="position: absolute; bottom: 0; left: 0; height: 2px; background: var(--brand-green); width: 100%; transform-origin: left; animation: notificationProgress ${notification.duration}ms linear;"></div>
            ` : ''}
        `;

        // Add CSS animation for progress bar
        if (!document.getElementById('notification-progress-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-progress-styles';
            style.textContent = `
                @keyframes notificationProgress {
                    from { transform: scaleX(1); }
                    to { transform: scaleX(0); }
                }
                .notification.show {
                    transform: translateX(0) !important;
                }
            `;
            document.head.appendChild(style);
        }

        return element;
    }

    // Handle notification actions
    handleAction(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification && notification.action) {
            notification.action();
            this.removeNotification(notificationId);
        }
    }

    // Remove notification
    removeNotification(notificationId) {
        const element = document.getElementById(`notification-${notificationId}`);
        if (element) {
            element.style.transform = 'translateX(420px)';
            element.style.opacity = '0';
            
            setTimeout(() => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            }, 300);
        }
        
        // Remove from notifications array
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
    }

    // Show activity indicator for other users
    showActivityIndicator(userData) {
        const indicator = document.querySelector('.sync-indicator, #syncIndicator');
        if (indicator) {
            indicator.style.animation = 'pulse 1s ease-in-out';
            setTimeout(() => {
                indicator.style.animation = '';
            }, 1000);
        }
    }

    // Open order details (placeholder)
    openOrderDetails(orderId) {
        if (window.viewOrderDetails) {
            window.viewOrderDetails(orderId);
        } else {
            this.show(`Opening order ${orderId}...`, 'info');
        }
    }

    // Replace global showNotification function
    replaceGlobalNotificationFunction() {
        window.showNotification = (message, type = 'info', options = {}) => {
            this.show(message, type, options);
        };
        
        console.log('🔔 Global showNotification function replaced');
    }

    // Batch notifications for related events
    showBatchNotification(messages, type = 'info', options = {}) {
        const batchMessage = messages[0];
        const details = messages.length > 1 ? `+${messages.length - 1} more updates` : undefined;
        
        this.show(batchMessage, type, { ...options, details });
    }

    // Show system status notification
    showSystemStatus(status, message) {
        const types = {
            'online': 'success',
            'offline': 'warning',
            'error': 'error',
            'syncing': 'info'
        };
        
        this.show(message, types[status] || 'info', {
            category: 'system',
            duration: 3000
        });
    }

    // Clear all notifications
    clearAll() {
        this.notifications.forEach(notification => {
            this.removeNotification(notification.id);
        });
        this.queue = [];
    }

    // Utility delay function
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Get notification status
    getStatus() {
        return {
            active: this.notifications.length,
            queued: this.queue.length,
            maxNotifications: this.maxNotifications
        };
    }

    // Clean up
    destroy() {
        this.clearAll();
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        console.log('🔔 Notification System destroyed');
    }
}

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
    window.NotificationSystem = NotificationSystem;
    
    // Initialize after DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.notificationSystem) {
            window.notificationSystem = new NotificationSystem();
            console.log('🔔 Global Notification System initialized');
        }
    });
}
