// Real-Time Notification System for Faded Skies Portal
// Displays dynamic updates to users in real-time

class RealTimeNotificationSystem {
    constructor() {
        this.notificationContainer = null;
        this.notificationQueue = [];
        this.isDisplaying = false;
        this.userId = null;
        this.userRole = null;
        this.notificationCount = 0;
        this.unreadCount = 0;
        
        this.initialize();
        this.setupNotificationContainer();
        this.startNotificationListener();
    }

    initialize() {
        // Get current user info
        if (window.currentUser) {
            this.userId = window.currentUser.id || window.currentUser.uid;
            this.userRole = window.currentUser.role || 'partner';
        }

        // Create notification container if it doesn't exist
        this.createNotificationContainer();
        
        // Setup notification badge
        this.setupNotificationBadge();
        
        console.log('🔔 Real-time notification system initialized');
    }

    createNotificationContainer() {
        // Remove existing container if present
        const existingContainer = document.getElementById('notification-container');
        if (existingContainer) {
            existingContainer.remove();
        }

        // Create notification container
        this.notificationContainer = document.createElement('div');
        this.notificationContainer.id = 'notification-container';
        this.notificationContainer.className = 'notification-container';
        this.notificationContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
            max-height: 80vh;
            overflow-y: auto;
            pointer-events: none;
        `;

        document.body.appendChild(this.notificationContainer);
    }

    setupNotificationBadge() {
        // Create notification badge in header
        const header = document.querySelector('header') || document.querySelector('.header') || document.querySelector('.main-header');
        if (header) {
            const badge = document.createElement('div');
            badge.id = 'notification-badge';
            badge.className = 'notification-badge';
            badge.style.cssText = `
                position: absolute;
                top: 10px;
                right: 20px;
                background: #ff4444;
                color: white;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
                cursor: pointer;
                z-index: 1000;
                display: none;
            `;
            badge.textContent = '0';
            
            badge.addEventListener('click', () => {
                this.showNotificationPanel();
            });

            header.appendChild(badge);
        }
    }

    startNotificationListener() {
        // Listen for Firebase notifications
        if (window.dynamicDataProcessor && window.dynamicDataProcessor.firestore) {
            this.setupFirebaseNotificationListener();
        }

        // Listen for custom notification events
        document.addEventListener('showRealtimeNotification', (event) => {
            this.displayRealtimeNotification(event.detail);
        });

        // Listen for Firebase real-time updates
        if (window.dynamicDataProcessor) {
            this.setupDynamicDataListener();
        }
    }

    setupFirebaseNotificationListener() {
        try {
            const { collection, onSnapshot, query, where } = window.dynamicDataProcessor.firestore;
            
            const notificationsQuery = query(
                collection(window.dynamicDataProcessor.firestore, 'notifications'),
                where('userId', 'in', [this.userId, 'admin', 'all'])
            );

            onSnapshot(notificationsQuery, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const notification = { id: change.doc.id, ...change.doc.data() };
                        this.displayRealtimeNotification(notification);
                    }
                });
            });
        } catch (error) {
            console.error('❌ Failed to setup Firebase notification listener:', error);
        }
    }

    setupDynamicDataListener() {
        // Listen for dynamic data processor events
        if (window.dynamicDataProcessor) {
            window.dynamicDataProcessor.on('notification', (notification) => {
                this.displayRealtimeNotification(notification);
            });
        }
    }

    displayRealtimeNotification(notification) {
        if (!this.shouldShowNotification(notification)) {
            return;
        }

        // Add to queue
        this.notificationQueue.push(notification);
        this.notificationCount++;
        this.unreadCount++;

        // Update badge
        this.updateNotificationCount();

        // Display if not already showing
        if (!this.isDisplaying) {
            this.displayNextNotification();
        }
    }

    shouldShowNotification(notification) {
        // Check if user should see this notification
        if (!notification) return false;

        // Filter by user role and ID
        const isForUser = notification.userId === this.userId || 
                         notification.userId === 'all' || 
                         (this.userRole === 'admin' && notification.userId === 'admin');

        if (!isForUser) return false;

        // Check if notification is recent (within last 24 hours)
        const notificationTime = new Date(notification.createdAt);
        const now = new Date();
        const timeDiff = now - notificationTime;
        const oneDay = 24 * 60 * 60 * 1000;

        return timeDiff < oneDay;
    }

    async displayNextNotification() {
        if (this.notificationQueue.length === 0) {
            this.isDisplaying = false;
            return;
        }

        this.isDisplaying = true;
        const notification = this.notificationQueue.shift();

        try {
            const notificationElement = this.createNotificationElement(notification);
            this.notificationContainer.appendChild(notificationElement);

            // Animate in
            setTimeout(() => {
                notificationElement.style.transform = 'translateX(0)';
                notificationElement.style.opacity = '1';
            }, 100);

            // Auto-remove after 5 seconds
            setTimeout(() => {
                this.removeNotification(notificationElement);
                this.displayNextNotification();
            }, 5000);

        } catch (error) {
            console.error('❌ Error displaying notification:', error);
            this.displayNextNotification();
        }
    }

    createNotificationElement(notification) {
        const element = document.createElement('div');
        element.className = 'realtime-notification';
        element.style.cssText = `
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateX(100%);
            opacity: 0;
            transition: all 0.3s ease;
            pointer-events: auto;
            cursor: pointer;
            max-width: 350px;
        `;

        const icon = this.getNotificationIcon(notification.type);
        const color = this.getNotificationColor(notification.type);

        element.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 10px;">
                <div style="color: ${color}; font-size: 18px; flex-shrink: 0;">
                    ${icon}
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: bold; margin-bottom: 5px; font-size: 14px; color: #333;">
                        ${notification.title || 'Notification'}
                    </div>
                    <div style="color: #666; font-size: 13px; line-height: 1.4;">
                        ${notification.message}
                    </div>
                    <div style="font-size: 11px; color: #999; margin-top: 5px;">
                        ${this.formatTimestamp(notification.createdAt)}
                    </div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; color: #999; cursor: pointer; font-size: 16px; padding: 0; line-height: 1; flex-shrink: 0;">
                    ×
                </button>
            </div>
        `;

        // Add click handler
        element.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') {
                this.handleNotificationClick(notification);
            }
        });

        return element;
    }

    getNotificationIcon(type) {
        const icons = {
            'order_update': '📦',
            'product_change': '🌿',
            'system': '⚙️',
            'partner_signup': '👥',
            'inventory': '📊',
            'document': '📄',
            'notification': '🔔',
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };
        return icons[type] || '🔔';
    }

    getNotificationColor(type) {
        const colors = {
            'order_update': '#007bff',
            'product_change': '#28a745',
            'system': '#6c757d',
            'partner_signup': '#17a2b8',
            'inventory': '#ffc107',
            'document': '#fd7e14',
            'notification': '#6f42c1',
            'success': '#28a745',
            'error': '#dc3545',
            'warning': '#ffc107',
            'info': '#17a2b8'
        };
        return colors[type] || '#6f42c1';
    }

    formatTimestamp(timestamp) {
        if (!timestamp) return '';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    }

    handleNotificationClick(notification) {
        try {
            // Mark as read
            this.markNotificationAsRead(notification.id);

            // Navigate based on notification type
            switch (notification.type) {
                case 'order_update':
                    this.navigateToOrder(notification);
                    break;
                case 'product_change':
                    this.navigateToProduct(notification);
                    break;
                case 'partner_signup':
                    this.navigateToPartner(notification);
                    break;
                case 'document':
                    this.navigateToDocument(notification);
                    break;
                case 'inventory':
                    this.navigateToInventory(notification);
                    break;
                default:
                    // Default behavior - show notification panel
                    this.showNotificationPanel();
            }
        } catch (error) {
            console.error('❌ Error handling notification click:', error);
        }
    }

    navigateToOrder(notification) {
        if (this.userRole === 'admin') {
            this.showAdminOrderDetails(notification.orderId);
        } else {
            this.showPartnerOrderDetails(notification.orderId);
        }
    }

    navigateToProduct(notification) {
        if (this.userRole === 'admin') {
            this.showAdminProductDetails(notification.productId);
        } else {
            this.showPartnerProductDetails(notification.productId);
        }
    }

    navigateToPartner(notification) {
        this.showPartnerDetails(notification.partnerId);
    }

    navigateToDocument(notification) {
        this.showDocumentReview(notification.documentId);
    }

    navigateToInventory(notification) {
        this.showInventoryManagement(notification.productId);
    }

    showAdminOrderDetails(orderId) {
        // Navigate to admin order details
        console.log('Navigate to admin order:', orderId);
    }

    showAdminProductDetails(productId) {
        // Navigate to admin product details
        console.log('Navigate to admin product:', productId);
    }

    showPartnerDetails(partnerId) {
        // Navigate to partner details
        console.log('Navigate to partner:', partnerId);
    }

    showDocumentReview(documentId) {
        // Navigate to document review
        console.log('Navigate to document:', documentId);
    }

    showInventoryManagement(productId) {
        // Navigate to inventory management
        console.log('Navigate to inventory:', productId);
    }

    showPartnerOrderDetails(orderId) {
        // Navigate to partner order details
        console.log('Navigate to partner order:', orderId);
    }

    showPartnerProductDetails(productId) {
        // Navigate to partner product details
        console.log('Navigate to partner product:', productId);
    }

    removeNotification(element) {
        if (element && element.parentElement) {
            element.style.transform = 'translateX(100%)';
            element.style.opacity = '0';
            setTimeout(() => {
                if (element.parentElement) {
                    element.remove();
                }
            }, 300);
        }
    }

    async markNotificationAsRead(notificationId) {
        try {
            if (window.dynamicDataProcessor && window.dynamicDataProcessor.firestore) {
                const { doc, updateDoc } = window.dynamicDataProcessor.firestore;
                const notificationRef = doc(window.dynamicDataProcessor.firestore, 'notifications', notificationId);
                await updateDoc(notificationRef, { read: true });
                
                this.unreadCount = Math.max(0, this.unreadCount - 1);
                this.updateNotificationCount();
            }
        } catch (error) {
            console.error('❌ Failed to mark notification as read:', error);
        }
    }

    updateNotificationCount() {
        const badge = document.getElementById('notification-badge');
        if (badge) {
            if (this.unreadCount > 0) {
                badge.style.display = 'flex';
                badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount.toString();
            } else {
                badge.style.display = 'none';
            }
        }
    }

    showNotificationPanel() {
        // Create notification panel if it doesn't exist
        let panel = document.getElementById('notification-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'notification-panel';
            panel.style.cssText = `
                position: fixed;
                top: 0;
                right: 0;
                width: 400px;
                height: 100vh;
                background: white;
                border-left: 1px solid #ddd;
                z-index: 10001;
                transform: translateX(100%);
                transition: transform 0.3s ease;
                display: flex;
                flex-direction: column;
            `;

            panel.innerHTML = `
                <div style="padding: 20px; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; color: #333;">Notifications</h3>
                    <button onclick="document.getElementById('notification-panel').style.transform='translateX(100%)'" 
                            style="background: none; border: none; font-size: 20px; cursor: pointer; color: #999;">
                        ×
                    </button>
                </div>
                <div id="notification-list" style="flex: 1; overflow-y: auto; padding: 20px;">
                    <div style="text-align: center; color: #999;">Loading notifications...</div>
                </div>
            `;

            document.body.appendChild(panel);
        }

        // Show panel
        panel.style.transform = 'translateX(0)';
        
        // Load notifications
        this.loadNotificationsForPanel();
    }

    async loadNotificationsForPanel() {
        try {
            if (window.dynamicDataProcessor && window.dynamicDataProcessor.firestore) {
                const { collection, query, where, orderBy, limit, getDocs } = window.dynamicDataProcessor.firestore;
                
                const notificationsQuery = query(
                    collection(window.dynamicDataProcessor.firestore, 'notifications'),
                    where('userId', 'in', [this.userId, 'admin', 'all']),
                    orderBy('createdAt', 'desc'),
                    limit(50)
                );

                const snapshot = await getDocs(notificationsQuery);
                const notifications = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                this.displayNotificationsInPanel(notifications);
            } else {
                const listElement = document.getElementById('notification-list');
                if (listElement) {
                    listElement.innerHTML = '<div style="text-align: center; color: #999;">No notifications available</div>';
                }
            }
        } catch (error) {
            console.error('❌ Failed to load notifications:', error);
            const listElement = document.getElementById('notification-list');
            if (listElement) {
                listElement.innerHTML = '<div style="text-align: center; color: #999;">Failed to load notifications</div>';
            }
        }
    }

    displayNotificationsInPanel(notifications) {
        const listElement = document.getElementById('notification-list');
        if (!listElement) return;

        if (notifications.length === 0) {
            listElement.innerHTML = '<div style="text-align: center; color: #999;">No notifications</div>';
            return;
        }

        const filteredNotifications = notifications.filter(n => this.shouldShowNotification(n));
        
        listElement.innerHTML = filteredNotifications.map(notification => `
            <div class="notification-panel-item" style="
                padding: 15px;
                border-bottom: 1px solid #eee;
                cursor: pointer;
                ${notification.read ? 'opacity: 0.7;' : ''}
            " onclick="window.realtimeNotificationSystem.handleNotificationClick(${JSON.stringify(notification)})">
                <div style="display: flex; align-items: flex-start; gap: 10px;">
                    <div style="color: ${this.getNotificationColor(notification.type)}; font-size: 18px;">
                        ${this.getNotificationIcon(notification.type)}
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: bold; margin-bottom: 5px;">
                            ${notification.title}
                        </div>
                        <div style="color: #666; font-size: 14px; line-height: 1.4;">
                            ${notification.message}
                        </div>
                        <div style="font-size: 12px; color: #999; margin-top: 5px;">
                            ${this.formatTimestamp(notification.createdAt)}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Mark all as read
        this.markAllNotificationsAsRead();
    }

    async markAllNotificationsAsRead() {
        try {
            if (window.dynamicDataProcessor && window.dynamicDataProcessor.firestore) {
                const { collection, query, where, getDocs, updateDoc } = window.dynamicDataProcessor.firestore;
                
                const notificationsQuery = query(
                    collection(window.dynamicDataProcessor.firestore, 'notifications'),
                    where('userId', 'in', [this.userId, 'admin', 'all']),
                    where('read', '==', false)
                );

                const snapshot = await getDocs(notificationsQuery);
                const updatePromises = snapshot.docs.map(doc => 
                    updateDoc(doc.ref, { read: true })
                );

                await Promise.all(updatePromises);
                
                // Reset badge
                this.unreadCount = 0;
                const badge = document.getElementById('notification-badge');
                if (badge) {
                    badge.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('❌ Failed to mark notifications as read:', error);
        }
    }

    // Public method to show notifications programmatically
    static displayRealtimeNotification(message, type = 'notification', title = 'Notification') {
        const notification = {
            title,
            message,
            type,
            userId: 'all',
            createdAt: new Date()
        };

        if (window.realtimeNotificationSystem) {
            window.realtimeNotificationSystem.displayRealtimeNotification(notification);
        }
    }
}

// Initialize notification system with a different name to avoid conflicts
window.realtimeNotificationSystem = new RealTimeNotificationSystem();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RealTimeNotificationSystem;
}
