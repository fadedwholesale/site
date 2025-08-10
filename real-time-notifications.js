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

        // Listen for custom events
        document.addEventListener('showNotification', (event) => {
            this.showNotification(event.detail);
        });

        // Listen for storage events (cross-tab communication)
        window.addEventListener('storage', (event) => {
            if (event.key === 'fadedSkiesNotification') {
                const notification = JSON.parse(event.newValue);
                if (notification && notification.userId === this.userId) {
                    this.showNotification(notification);
                }
            }
        });

        console.log('👂 Notification listeners active');
    }

    setupFirebaseNotificationListener() {
        const { collection, query, where, onSnapshot, orderBy } = window.dynamicDataProcessor.firestore;
        
        const notificationsQuery = query(
            collection(window.dynamicDataProcessor.firestore, 'notifications'),
            where('userId', 'in', [this.userId, 'admin', 'all']),
            orderBy('createdAt', 'desc')
        );

        onSnapshot(notificationsQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const notification = change.doc.data();
                    this.showNotification(notification);
                    this.updateNotificationCount();
                }
            });
        });
    }

    showNotification(notification) {
        // Filter notifications based on user role
        if (!this.shouldShowNotification(notification)) {
            return;
        }

        // Add to queue
        this.notificationQueue.push({
            ...notification,
            timestamp: Date.now(),
            id: notification.id || Date.now()
        });

        // Display if not currently showing
        if (!this.isDisplaying) {
            this.displayNextNotification();
        }

        // Update badge
        this.updateNotificationCount();
    }

    shouldShowNotification(notification) {
        // Admin notifications
        if (notification.userId === 'admin' && this.userRole !== 'admin') {
            return false;
        }

        // Partner notifications
        if (notification.userId === 'partner' && this.userRole !== 'partner') {
            return false;
        }

        // User-specific notifications
        if (notification.userId && notification.userId !== this.userId && notification.userId !== 'all') {
            return false;
        }

        // Filter by notification type based on user role
        const adminOnlyTypes = ['partner_signup', 'document_upload', 'low_stock', 'system'];
        const partnerOnlyTypes = ['order_update', 'product_change'];

        if (this.userRole === 'admin' && partnerOnlyTypes.includes(notification.type)) {
            return false;
        }

        if (this.userRole === 'partner' && adminOnlyTypes.includes(notification.type)) {
            return false;
        }

        return true;
    }

    async displayNextNotification() {
        if (this.notificationQueue.length === 0) {
            this.isDisplaying = false;
            return;
        }

        this.isDisplaying = true;
        const notification = this.notificationQueue.shift();

        // Create notification element
        const notificationElement = this.createNotificationElement(notification);
        
        // Add to container
        this.notificationContainer.appendChild(notificationElement);

        // Animate in
        setTimeout(() => {
            notificationElement.style.transform = 'translateX(0)';
            notificationElement.style.opacity = '1';
        }, 100);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            this.removeNotification(notificationElement);
        }, 5000);

        // Mark as read
        this.markNotificationAsRead(notification.id);
    }

    createNotificationElement(notification) {
        const element = document.createElement('div');
        element.className = 'notification-item';
        element.style.cssText = `
            background: white;
            border-left: 4px solid ${this.getNotificationColor(notification.type)};
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            margin-bottom: 10px;
            padding: 15px;
            border-radius: 4px;
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
                <div style="color: ${color}; font-size: 20px; flex-shrink: 0;">
                    ${icon}
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: bold; margin-bottom: 5px; color: #333;">
                        ${notification.title}
                    </div>
                    <div style="color: #666; font-size: 14px; line-height: 1.4;">
                        ${notification.message}
                    </div>
                    <div style="font-size: 12px; color: #999; margin-top: 5px;">
                        ${this.formatTimestamp(notification.createdAt)}
                    </div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; color: #999; cursor: pointer; font-size: 16px; padding: 0;">
                    ×
                </button>
            </div>
        `;

        // Add click handler for notification actions
        element.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') {
                this.handleNotificationClick(notification);
            }
        });

        return element;
    }

    getNotificationIcon(type) {
        const icons = {
            'order_created': '📦',
            'order_update': '📝',
            'product_change': '🛍️',
            'partner_signup': '👥',
            'document_upload': '📄',
            'low_stock': '⚠️',
            'system': '⚙️',
            'inventory_change': '📊',
            'notification': '🔔'
        };
        return icons[type] || '🔔';
    }

    getNotificationColor(type) {
        const colors = {
            'order_created': '#4CAF50',
            'order_update': '#2196F3',
            'product_change': '#FF9800',
            'partner_signup': '#9C27B0',
            'document_upload': '#607D8B',
            'low_stock': '#F44336',
            'system': '#795548',
            'inventory_change': '#00BCD4',
            'notification': '#FF5722'
        };
        return colors[type] || '#FF5722';
    }

    formatTimestamp(timestamp) {
        if (!timestamp) return 'Just now';
        
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    }

    handleNotificationClick(notification) {
        // Handle different notification types
        switch (notification.type) {
            case 'order_created':
            case 'order_update':
                this.navigateToOrder(notification);
                break;
            case 'product_change':
                this.navigateToProduct(notification);
                break;
            case 'partner_signup':
                this.navigateToPartner(notification);
                break;
            case 'document_upload':
                this.navigateToDocument(notification);
                break;
            case 'low_stock':
                this.navigateToInventory(notification);
                break;
            default:
                console.log('Notification clicked:', notification);
        }
    }

    navigateToOrder(notification) {
        const data = JSON.parse(notification.data || '{}');
        if (data.orderId) {
            // Navigate to order details
            if (this.userRole === 'admin') {
                this.showAdminOrderDetails(data.orderId);
            } else {
                this.showPartnerOrderDetails(data.orderId);
            }
        }
    }

    navigateToProduct(notification) {
        const data = JSON.parse(notification.data || '{}');
        if (data.productId) {
            // Navigate to product details
            if (this.userRole === 'admin') {
                this.showAdminProductDetails(data.productId);
            } else {
                this.showPartnerProductDetails(data.productId);
            }
        }
    }

    navigateToPartner(notification) {
        const data = JSON.parse(notification.data || '{}');
        if (data.partnerId && this.userRole === 'admin') {
            this.showPartnerDetails(data.partnerId);
        }
    }

    navigateToDocument(notification) {
        const data = JSON.parse(notification.data || '{}');
        if (data.documentId && this.userRole === 'admin') {
            this.showDocumentReview(data.documentId);
        }
    }

    navigateToInventory(notification) {
        const data = JSON.parse(notification.data || '{}');
        if (data.productId && this.userRole === 'admin') {
            this.showInventoryManagement(data.productId);
        }
    }

    // Navigation methods for admin portal
    showAdminOrderDetails(orderId) {
        // Trigger admin portal navigation
        const event = new CustomEvent('navigateToOrder', { detail: { orderId } });
        document.dispatchEvent(event);
    }

    showAdminProductDetails(productId) {
        const event = new CustomEvent('navigateToProduct', { detail: { productId } });
        document.dispatchEvent(event);
    }

    showPartnerDetails(partnerId) {
        const event = new CustomEvent('navigateToPartner', { detail: { partnerId } });
        document.dispatchEvent(event);
    }

    showDocumentReview(documentId) {
        const event = new CustomEvent('navigateToDocument', { detail: { documentId } });
        document.dispatchEvent(event);
    }

    showInventoryManagement(productId) {
        const event = new CustomEvent('navigateToInventory', { detail: { productId } });
        document.dispatchEvent(event);
    }

    // Navigation methods for partner portal
    showPartnerOrderDetails(orderId) {
        const event = new CustomEvent('navigateToOrder', { detail: { orderId } });
        document.dispatchEvent(event);
    }

    showPartnerProductDetails(productId) {
        const event = new CustomEvent('navigateToProduct', { detail: { productId } });
        document.dispatchEvent(event);
    }

    removeNotification(element) {
        element.style.transform = 'translateX(100%)';
        element.style.opacity = '0';
        
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            this.displayNextNotification();
        }, 300);
    }

    async markNotificationAsRead(notificationId) {
        if (!notificationId) return;

        try {
            if (window.dynamicDataProcessor && window.dynamicDataProcessor.firestore) {
                const { doc, updateDoc } = window.dynamicDataProcessor.firestore;
                const notificationRef = doc(window.dynamicDataProcessor.firestore, 'notifications', notificationId);
                await updateDoc(notificationRef, { read: true });
            }
        } catch (error) {
            console.error('❌ Failed to mark notification as read:', error);
        }
    }

    updateNotificationCount() {
        const badge = document.getElementById('notification-badge');
        if (badge) {
            this.notificationCount++;
            this.unreadCount++;
            badge.textContent = this.unreadCount;
            badge.style.display = this.unreadCount > 0 ? 'flex' : 'none';
        }
    }

    showNotificationPanel() {
        // Create notification panel
        const panel = document.createElement('div');
        panel.id = 'notification-panel';
        panel.style.cssText = `
            position: fixed;
            top: 0;
            right: 0;
            width: 400px;
            height: 100vh;
            background: white;
            box-shadow: -2px 0 10px rgba(0,0,0,0.1);
            z-index: 10001;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            overflow-y: auto;
        `;

        panel.innerHTML = `
            <div style="padding: 20px; border-bottom: 1px solid #eee;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0;">Notifications</h3>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                            style="background: none; border: none; font-size: 20px; cursor: pointer;">
                        ×
                    </button>
                </div>
            </div>
            <div id="notification-list" style="padding: 20px;">
                <div style="text-align: center; color: #999;">Loading notifications...</div>
            </div>
        `;

        document.body.appendChild(panel);

        // Animate in
        setTimeout(() => {
            panel.style.transform = 'translateX(0)';
        }, 100);

        // Load notifications
        this.loadNotificationsForPanel();
    }

    async loadNotificationsForPanel() {
        const listElement = document.getElementById('notification-list');
        if (!listElement) return;

        try {
            // Load notifications from Firebase
            if (window.dynamicDataProcessor && window.dynamicDataProcessor.firestore) {
                const { collection, query, where, getDocs, orderBy } = window.dynamicDataProcessor.firestore;
                
                const notificationsQuery = query(
                    collection(window.dynamicDataProcessor.firestore, 'notifications'),
                    where('userId', 'in', [this.userId, 'admin', 'all']),
                    orderBy('createdAt', 'desc')
                );

                const snapshot = await getDocs(notificationsQuery);
                const notifications = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                this.displayNotificationsInPanel(notifications);
            }
        } catch (error) {
            console.error('❌ Failed to load notifications:', error);
            listElement.innerHTML = '<div style="text-align: center; color: #999;">Failed to load notifications</div>';
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
            " onclick="window.notificationSystem.handleNotificationClick(${JSON.stringify(notification)})">
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
    static show(message, type = 'notification', title = 'Notification') {
        const notification = {
            title,
            message,
            type,
            userId: 'all',
            createdAt: new Date()
        };

        if (window.notificationSystem) {
            window.notificationSystem.showNotification(notification);
        }
    }
}

// Initialize notification system
window.notificationSystem = new RealTimeNotificationSystem();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RealTimeNotificationSystem;
}
