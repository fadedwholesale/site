// Real-Time Order Synchronization Manager
// Ensures orders placed in partner portal immediately appear in admin portal

class OrderSyncManager {
    constructor() {
        this.syncChannel = 'fadedSkiesOrderSync';
        this.orderQueue = [];
        this.processingQueue = false;
        this.syncInterval = 1000; // Check every second
        this.maxRetries = 3;
        this.retryDelay = 2000;
        
        this.orderListeners = new Set();
        this.adminListeners = new Set();
        
        this.init();
    }

    init() {
        console.log('📦 Initializing Order Sync Manager...');
        
        // Set up real-time order synchronization
        this.setupOrderSync();
        
        // Set up admin notifications
        this.setupAdminNotifications();
        
        // Start processing queue
        this.startQueueProcessor();
        
        // Set up storage listener for cross-tab communication
        window.addEventListener('storage', this.handleStorageSync.bind(this));
        
        console.log('✅ Order Sync Manager initialized');
    }

    setupOrderSync() {
        // Listen for new orders from real-time sync
        if (window.realTimeSync) {
            window.realTimeSync.on('order_placed', (orderData) => {
                this.handleNewOrder(orderData);
            });

            window.realTimeSync.on('order_status_changed', (orderData) => {
                this.handleOrderStatusChange(orderData);
            });

            window.realTimeSync.on('admin_order_update', (orderData) => {
                this.handleAdminOrderUpdate(orderData);
            });
        }

        // Set up polling for missed orders (backup mechanism)
        setInterval(() => {
            this.checkForMissedOrders();
        }, 10000); // Check every 10 seconds
    }

    setupAdminNotifications() {
        // Set up audio notification for new orders
        this.orderNotificationSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmceB0CA0fPTfT');
        this.orderNotificationSound.volume = 0.3;
    }

    // Handle new order placement
    handleNewOrder(orderData) {
        console.log('🛒 New order received:', orderData);
        
        try {
            // Add to processing queue
            this.orderQueue.push({
                type: 'new_order',
                data: orderData,
                timestamp: new Date().toISOString(),
                retries: 0
            });

            // Process immediately if not already processing
            if (!this.processingQueue) {
                this.processOrderQueue();
            }

            // Notify admin portal
            this.notifyAdminOfNewOrder(orderData);
            
            // Update admin UI in real-time
            this.updateAdminOrderDisplay(orderData);
            
            // Log the order sync event
            if (window.liveDataManager) {
                window.liveDataManager.log('order_sync', 'New order synced to admin', {
                    orderId: orderData.id,
                    partner: orderData.partner,
                    total: orderData.total,
                    itemCount: orderData.items?.length || 0
                });
            }

        } catch (error) {
            console.error('❌ Error handling new order:', error);
            this.logSyncError('new_order_error', orderData, error);
        }
    }

    // Handle order status changes
    handleOrderStatusChange(orderData) {
        console.log('📋 Order status changed:', orderData);
        
        try {
            // Add to processing queue
            this.orderQueue.push({
                type: 'status_change',
                data: orderData,
                timestamp: new Date().toISOString(),
                retries: 0
            });

            // Update both partner and admin views
            this.syncOrderStatusUpdate(orderData);

            // Log the status change
            if (window.liveDataManager) {
                window.liveDataManager.log('order_sync', 'Order status updated', {
                    orderId: orderData.id,
                    oldStatus: orderData.oldStatus,
                    newStatus: orderData.status,
                    updatedBy: orderData.updatedBy || 'system'
                });
            }

        } catch (error) {
            console.error('❌ Error handling order status change:', error);
            this.logSyncError('status_change_error', orderData, error);
        }
    }

    // Handle admin order updates
    handleAdminOrderUpdate(orderData) {
        console.log('🔧 Admin order update:', orderData);
        
        try {
            // Broadcast to partner portal
            if (window.realTimeSync) {
                window.realTimeSync.broadcast('admin_updated_order', {
                    orderId: orderData.id,
                    updates: orderData.updates,
                    timestamp: new Date().toISOString(),
                    adminUser: window.currentUser?.email
                });
            }

            // Update partner portal UI
            this.updatePartnerOrderDisplay(orderData);

            // Show notification to partners
            this.notifyPartnerOfUpdate(orderData);

        } catch (error) {
            console.error('❌ Error handling admin order update:', error);
            this.logSyncError('admin_update_error', orderData, error);
        }
    }

    // Process order queue
    async processOrderQueue() {
        if (this.processingQueue || this.orderQueue.length === 0) {
            return;
        }

        this.processingQueue = true;
        console.log(`🔄 Processing order queue (${this.orderQueue.length} items)`);

        while (this.orderQueue.length > 0) {
            const queueItem = this.orderQueue.shift();
            
            try {
                await this.processSingleOrder(queueItem);
            } catch (error) {
                console.error('❌ Error processing queue item:', error);
                
                // Retry logic
                if (queueItem.retries < this.maxRetries) {
                    queueItem.retries++;
                    console.log(`🔄 Retrying queue item (attempt ${queueItem.retries})`);
                    
                    // Add back to queue after delay
                    setTimeout(() => {
                        this.orderQueue.unshift(queueItem);
                    }, this.retryDelay * queueItem.retries);
                } else {
                    console.error('❌ Max retries exceeded for queue item:', queueItem);
                    this.logSyncError('queue_processing_failed', queueItem.data, error);
                }
            }
        }

        this.processingQueue = false;
        console.log('✅ Order queue processing completed');
    }

    // Process a single order from the queue
    async processSingleOrder(queueItem) {
        const { type, data } = queueItem;

        switch (type) {
            case 'new_order':
                await this.processNewOrderSync(data);
                break;
                
            case 'status_change':
                await this.processStatusChangeSync(data);
                break;
                
            default:
                console.warn('⚠️ Unknown queue item type:', type);
        }
    }

    // Process new order synchronization
    async processNewOrderSync(orderData) {
        // Ensure order is saved to live data
        if (window.liveDataManager) {
            const savedOrder = window.liveDataManager.addOrder(orderData);
            console.log('💾 Order saved to live data:', savedOrder.id);
        }

        // Update inventory immediately
        this.updateInventoryFromOrder(orderData);

        // Broadcast to all connected clients
        if (window.realTimeSync) {
            window.realTimeSync.broadcast('order_sync_complete', {
                orderId: orderData.id,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Process status change synchronization
    async processStatusChangeSync(orderData) {
        // Update order in live data
        if (window.liveDataManager) {
            const updatedOrder = window.liveDataManager.updateOrder(orderData.id, {
                status: orderData.status,
                tracking: orderData.tracking,
                notes: orderData.notes,
                updatedBy: orderData.updatedBy
            });
            console.log('📋 Order status updated in live data:', updatedOrder?.id);
        }

        // Broadcast status change
        if (window.realTimeSync) {
            window.realTimeSync.broadcast('order_status_synced', {
                orderId: orderData.id,
                status: orderData.status,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Update inventory based on order
    updateInventoryFromOrder(orderData) {
        if (!orderData.items || !window.liveDataManager) return;

        orderData.items.forEach(item => {
            const products = window.liveDataManager.getProducts();
            const product = products.find(p => p.id === item.productId);
            
            if (product) {
                const newStock = Math.max(0, product.stock - item.quantity);
                window.liveDataManager.updateProduct(product.id, { stock: newStock });
                
                console.log(`📦 Updated inventory for ${product.strain}: ${product.stock} → ${newStock}`);
                
                // Check for low stock alerts
                if (newStock <= 3 && newStock > 0) {
                    this.sendLowStockAlert(product, newStock);
                } else if (newStock === 0) {
                    this.sendOutOfStockAlert(product);
                }
            }
        });
    }

    // Send low stock alert
    sendLowStockAlert(product, currentStock) {
        const alertData = {
            type: 'low_stock',
            productId: product.id,
            productName: product.strain,
            currentStock: currentStock,
            timestamp: new Date().toISOString()
        };

        // Broadcast alert
        if (window.realTimeSync) {
            window.realTimeSync.broadcast('inventory_alert', alertData);
        }

        // Show notification
        if (window.showNotification) {
            window.showNotification(
                `⚠️ Low Stock Alert: ${product.strain} (${currentStock} remaining)`,
                'warning'
            );
        }

        // Log the alert
        if (window.liveDataManager) {
            window.liveDataManager.log('warning', 'Low stock alert triggered', alertData);
        }
    }

    // Send out of stock alert
    sendOutOfStockAlert(product) {
        const alertData = {
            type: 'out_of_stock',
            productId: product.id,
            productName: product.strain,
            timestamp: new Date().toISOString()
        };

        // Broadcast alert
        if (window.realTimeSync) {
            window.realTimeSync.broadcast('inventory_alert', alertData);
        }

        // Show notification
        if (window.showNotification) {
            window.showNotification(
                `🔴 Out of Stock: ${product.strain}`,
                'error'
            );
        }

        // Log the alert
        if (window.liveDataManager) {
            window.liveDataManager.log('error', 'Product out of stock', alertData);
        }
    }

    // Notify admin of new order
    notifyAdminOfNewOrder(orderData) {
        // Play sound notification if admin is viewing the page
        if (document.hasFocus() && this.isAdminPortal()) {
            try {
                this.orderNotificationSound.play().catch(e => {
                    console.log('Could not play notification sound:', e);
                });
            } catch (error) {
                console.log('Notification sound error:', error);
            }
        }

        // Show visual notification
        if (window.showNotification) {
            const message = `🛒 New Order: ${orderData.id} from ${orderData.partner} ($${orderData.total})`;
            window.showNotification(message, 'success');
        }

        // Update admin dashboard stats
        this.updateAdminStats();

        // Highlight new order in admin table
        if (this.isAdminPortal()) {
            setTimeout(() => {
                this.highlightNewOrder(orderData.id);
            }, 500);
        }
    }

    // Update admin order display
    updateAdminOrderDisplay(orderData) {
        if (!this.isAdminPortal()) return;

        // Add order to admin table
        this.addOrderToAdminTable(orderData);

        // Update order statistics
        this.updateOrderStatistics();

        // Refresh any admin charts or graphs
        this.refreshAdminDashboard();
    }

    // Update partner order display
    updatePartnerOrderDisplay(orderData) {
        if (this.isAdminPortal()) return;

        // Update order status in partner view
        this.updateOrderStatusInPartnerView(orderData);

        // Show update notification to partner
        if (window.showNotification) {
            window.showNotification(
                `📋 Order ${orderData.id} updated by admin`,
                'info'
            );
        }
    }

    // Add order to admin table
    addOrderToAdminTable(orderData) {
        const ordersTable = document.getElementById('ordersBody');
        if (!ordersTable) return;

        const row = document.createElement('tr');
        row.id = `order-row-${orderData.id}`;
        row.className = 'order-row new-order';
        
        row.innerHTML = `
            <td>${orderData.id}</td>
            <td>${orderData.partner || 'Unknown'}</td>
            <td>${orderData.items?.length || 0} items</td>
            <td>$${orderData.total?.toFixed(2) || '0.00'}</td>
            <td><span class="status-${orderData.status}">${orderData.status || 'pending'}</span></td>
            <td>${orderData.tracking || 'Not assigned'}</td>
            <td>${orderData.paymentStatus || 'pending'}</td>
            <td>${new Date(orderData.created).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="viewOrder('${orderData.id}')">View</button>
                <button class="btn btn-sm btn-primary" onclick="updateOrderStatus('${orderData.id}')">Update</button>
            </td>
        `;

        // Insert at the top of the table
        ordersTable.insertBefore(row, ordersTable.firstChild);

        // Add animation class
        setTimeout(() => {
            row.classList.add('slide-in');
        }, 100);

        // Remove new-order class after animation
        setTimeout(() => {
            row.classList.remove('new-order');
        }, 3000);
    }

    // Highlight new order
    highlightNewOrder(orderId) {
        const orderRow = document.getElementById(`order-row-${orderId}`);
        if (orderRow) {
            orderRow.classList.add('highlighted');
            setTimeout(() => {
                orderRow.classList.remove('highlighted');
            }, 5000);
        }
    }

    // Update admin statistics
    updateAdminStats() {
        if (!window.liveDataManager) return;

        const orders = window.liveDataManager.getOrders();
        const analytics = window.liveDataManager.getAnalytics();

        // Update stat cards
        this.updateStatCard('totalOrders', orders.length);
        this.updateStatCard('pendingOrders', orders.filter(o => o.status === 'pending').length);
        this.updateStatCard('totalRevenue', `$${(analytics.totalRevenue || 0).toFixed(2)}`);
        
        // Update today's stats
        const today = new Date().toDateString();
        const todaysOrders = orders.filter(o => new Date(o.created).toDateString() === today);
        this.updateStatCard('ordersToday', todaysOrders.length);
    }

    // Update stat card
    updateStatCard(statId, value) {
        const statElement = document.getElementById(statId);
        if (statElement) {
            statElement.textContent = value;
            
            // Add update animation
            statElement.classList.add('stat-updated');
            setTimeout(() => {
                statElement.classList.remove('stat-updated');
            }, 1000);
        }
    }

    // Check if current page is admin portal
    isAdminPortal() {
        return window.location.href.includes('admin') || 
               document.title.includes('Admin') ||
               document.getElementById('adminDashboard');
    }

    // Handle storage sync for cross-tab communication
    handleStorageSync(event) {
        if (event.key === this.syncChannel) {
            try {
                const syncData = JSON.parse(event.newValue);
                console.log('📡 Received order sync from another tab:', syncData);
                
                // Process the sync data
                this.processCrossTabSync(syncData);
                
            } catch (error) {
                console.error('❌ Error processing cross-tab sync:', error);
            }
        }
    }

    // Process cross-tab synchronization
    processCrossTabSync(syncData) {
        const { type, data, timestamp } = syncData;

        switch (type) {
            case 'order_placed':
                this.handleNewOrder(data);
                break;
                
            case 'order_updated':
                this.handleOrderStatusChange(data);
                break;
                
            case 'admin_action':
                this.handleAdminOrderUpdate(data);
                break;
        }
    }

    // Check for missed orders (backup mechanism)
    checkForMissedOrders() {
        if (!window.liveDataManager) return;

        const orders = window.liveDataManager.getOrders();
        const recentOrders = orders.filter(order => {
            const orderTime = new Date(order.created);
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            return orderTime > fiveMinutesAgo;
        });

        // Check if any recent orders are missing from admin view
        if (this.isAdminPortal()) {
            recentOrders.forEach(order => {
                const orderRow = document.getElementById(`order-row-${order.id}`);
                if (!orderRow) {
                    console.log('🔄 Found missed order, adding to admin view:', order.id);
                    this.addOrderToAdminTable(order);
                }
            });
        }
    }

    // Log sync errors
    logSyncError(errorType, data, error) {
        const errorLog = {
            type: errorType,
            data: data,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        if (window.liveDataManager) {
            window.liveDataManager.log('error', `Order sync error: ${errorType}`, errorLog);
        }

        console.error('📦 Order Sync Error:', errorLog);
    }

    // Start queue processor
    startQueueProcessor() {
        setInterval(() => {
            if (this.orderQueue.length > 0 && !this.processingQueue) {
                this.processOrderQueue();
            }
        }, this.syncInterval);
    }

    // Get sync status
    getSyncStatus() {
        return {
            queueLength: this.orderQueue.length,
            processingQueue: this.processingQueue,
            orderListenerCount: this.orderListeners.size,
            adminListenerCount: this.adminListeners.size,
            isAdminPortal: this.isAdminPortal()
        };
    }

    // Cleanup
    destroy() {
        window.removeEventListener('storage', this.handleStorageSync);
        this.orderQueue = [];
        this.orderListeners.clear();
        this.adminListeners.clear();
        console.log('📦 Order Sync Manager destroyed');
    }
}

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
    window.OrderSyncManager = OrderSyncManager;
    
    // Initialize after DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.orderSyncManager) {
            window.orderSyncManager = new OrderSyncManager();
            console.log('📦 Global Order Sync Manager initialized');
        }
    });
}
