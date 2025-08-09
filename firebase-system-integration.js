// Firebase System Integration for Faded Skies Portal
// Replaces static localStorage with dynamic Firebase real-time data

class FirebaseSystemIntegration {
    constructor() {
        this.isInitialized = false;
        this.currentUser = null;
        this.subscriptions = new Map();
        this.dataCache = new Map();
        this.syncStatus = 'initializing';
        
        this.init();
    }

    async init() {
        console.log('🔄 Initializing Firebase System Integration...');
        
        try {
            // Wait for Firebase Data Manager to initialize
            await this.waitForFirebase();
            
            // Replace old data managers
            this.replaceStaticSystems();
            
            // Set up real-time subscriptions
            this.setupRealTimeSync();
            
            // Initialize UI updates
            this.initializeUIUpdates();
            
            this.isInitialized = true;
            this.syncStatus = 'connected';
            
            console.log('✅ Firebase System Integration completed');
            this.showNotification('🔥 Dynamic Firebase system activated!', 'success');
            
        } catch (error) {
            console.error('❌ Firebase System Integration failed:', error);
            this.syncStatus = 'error';
            this.showNotification('❌ Failed to connect to Firebase', 'error');
        }
    }

    async waitForFirebase() {
        return new Promise((resolve, reject) => {
            if (window.firebaseDataManager && window.firebaseDataManager.isInitialized) {
                resolve();
                return;
            }

            const checkInterval = setInterval(() => {
                if (window.firebaseDataManager && window.firebaseDataManager.isInitialized) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);

            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                reject(new Error('Firebase initialization timeout'));
            }, 10000);
        });
    }

    replaceStaticSystems() {
        console.log('🔄 Replacing static systems with Firebase...');
        
        // Replace SharedDataManager methods with Firebase versions
        if (window.sharedDataManager) {
            const originalManager = window.sharedDataManager;
            
            // Override critical methods to use Firebase
            originalManager.getProducts = async () => {
                return await window.firebaseDataManager.getProducts();
            };
            
            originalManager.getOrders = async (partnerEmail = null) => {
                return await window.firebaseDataManager.getOrders(partnerEmail);
            };
            
            originalManager.addOrder = async (orderData) => {
                return await window.firebaseDataManager.addOrder(orderData);
            };
            
            originalManager.updateProduct = async (productId, updates) => {
                return await window.firebaseDataManager.updateProduct(productId, updates);
            };
            
            originalManager.addProduct = async (product) => {
                return await window.firebaseDataManager.addProduct(product);
            };
            
            console.log('✅ SharedDataManager methods redirected to Firebase');
        }

        // Replace CartManager with FirebaseCartManager
        if (window.cartManager && window.firebaseCartManager) {
            window.cartManager = window.firebaseCartManager;
            console.log('✅ CartManager replaced with FirebaseCartManager');
        }

        // Update global functions to use Firebase
        window.addToCart = (productId, quantity) => {
            if (window.firebaseCartManager) {
                return window.firebaseCartManager.addProduct(productId, quantity);
            }
        };

        window.toggleCart = () => {
            if (window.firebaseCartManager) {
                window.firebaseCartManager.toggle();
            }
        };

        window.submitBusinessApplication = (formData) => {
            if (window.firebaseApplicationManager) {
                return window.firebaseApplicationManager.submitBusinessApplication(formData);
            }
        };
    }

    setupRealTimeSync() {
        console.log('📡 Setting up real-time synchronization...');
        
        // Products real-time sync
        const productsUnsubscribe = window.firebaseDataManager.subscribeToProducts((products) => {
            console.log('📦 Products updated from Firebase:', products.length);
            this.dataCache.set('products', products);
            this.updateProductDisplays(products);
            this.broadcastUpdate('products_updated', products);
        });
        this.subscriptions.set('products', productsUnsubscribe);

        // Orders real-time sync
        const ordersUnsubscribe = window.firebaseDataManager.subscribeToOrders((orders) => {
            console.log('📋 Orders updated from Firebase:', orders.length);
            this.dataCache.set('orders', orders);
            this.updateOrderDisplays(orders);
            this.broadcastUpdate('orders_updated', orders);
        });
        this.subscriptions.set('orders', ordersUnsubscribe);

        // Applications real-time sync (admin only)
        if (this.isAdminPortal()) {
            const applicationsUnsubscribe = window.firebaseDataManager.subscribeToApplications((applications) => {
                console.log('📝 Applications updated from Firebase:', applications.length);
                this.dataCache.set('applications', applications);
                this.updateApplicationDisplays(applications);
                this.broadcastUpdate('applications_updated', applications);
            });
            this.subscriptions.set('applications', applicationsUnsubscribe);

            // Admin notifications
            const notificationsUnsubscribe = window.firebaseDataManager.subscribeToAdminNotifications((notifications) => {
                console.log('🔔 Notifications updated from Firebase:', notifications.length);
                this.handleAdminNotifications(notifications);
            });
            this.subscriptions.set('notifications', notificationsUnsubscribe);
        }

        // Listen for Firebase data updates
        window.addEventListener('firebaseDataUpdate', (event) => {
            this.handleFirebaseUpdate(event.detail);
        });

        // Listen for authentication changes
        window.addEventListener('firebaseAuthChanged', (event) => {
            this.handleAuthChange(event.detail.user);
        });
    }

    updateProductDisplays(products) {
        // Update public inventory display
        this.updatePublicInventoryDisplay(products);
        
        // Update partner products display
        this.updatePartnerProductsDisplay(products);
        
        // Update admin inventory display
        this.updateAdminInventoryDisplay(products);
        
        // Update inventory statistics
        this.updateInventoryStats(products);
    }

    updatePublicInventoryDisplay(products) {
        const tbody = document.getElementById('publicInventoryBody');
        if (!tbody) return;

        const availableProducts = products.filter(p => p.status === 'AVAILABLE');

        if (availableProducts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No products available at this time</td></tr>';
            return;
        }

        const isAuthenticated = !!(this.currentUser || window.currentUser);

        tbody.innerHTML = availableProducts.map(product => {
            const unitLabel = this.getUnitLabel(product.grade);
            
            let actionColumn;
            if (isAuthenticated) {
                actionColumn = `
                    <button class="btn btn-primary btn-sm" onclick="addToCart('${product.id}')" title="Add ${product.strain} to cart">
                        🛒 Add to Cart
                    </button>
                `;
            } else {
                actionColumn = `
                    <button class="btn btn-secondary btn-sm" onclick="showAuthRequiredNotification()" title="Login required to add to cart">
                        🔒 Partner Login Required
                    </button>
                `;
            }

            return `
                <tr data-product-id="${product.id}">
                    <td class="product-image-container">
                        <img src="${product.image || 'https://via.placeholder.com/80x80/1a1a1a/00C851?text=' + encodeURIComponent(product.grade)}"
                             alt="${product.strain}" class="product-image"
                             onerror="this.src='https://via.placeholder.com/80x80/1a1a1a/00C851?text=${encodeURIComponent(product.grade)}'" />
                    </td>
                    <td><strong>${product.grade}</strong></td>
                    <td>
                        <strong>${product.strain}</strong><br>
                        <small style="color: var(--text-muted);">${product.type || 'Premium'} • ${product.description || 'High quality product'}</small>
                    </td>
                    <td><strong style="color: var(--brand-green);">$${product.price}${unitLabel}</strong></td>
                    <td><span style="color: var(--brand-green); font-weight: 700;">${product.thca}%</span></td>
                    <td><span class="status-available">${product.stock} Available</span></td>
                    <td>${actionColumn}</td>
                </tr>
            `;
        }).join('');
    }

    updatePartnerProductsDisplay(products) {
        const tbody = document.getElementById('partnerProductBody');
        if (!tbody) return;
        
        // Apply current filter if it exists
        let filteredProducts = products;
        if (window.currentFilter) {
            if (window.currentFilter === 'available') {
                filteredProducts = products.filter(p => p.status === 'AVAILABLE');
            } else if (window.currentFilter === 'coming') {
                filteredProducts = products.filter(p => p.status === 'COMING SOON');
            }
        }
        
        if (filteredProducts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No products match your filter</td></tr>';
            return;
        }
        
        tbody.innerHTML = filteredProducts.map(product => {
            const unitLabel = this.getUnitLabel(product.grade);
            const partnerPrice = Math.round(product.price * 0.8); // 20% discount
            const isAvailable = product.status === 'AVAILABLE' && product.stock > 0;
            
            return `
                <tr data-product-id="${product.id}">
                    <td class="product-image-container">
                        <img src="${product.image || 'https://via.placeholder.com/80x80/1a1a1a/00C851?text=' + encodeURIComponent(product.grade)}"
                             alt="${product.strain}" class="product-image"
                             onerror="this.src='https://via.placeholder.com/80x80/1a1a1a/00C851?text=${encodeURIComponent(product.grade)}'" />
                    </td>
                    <td><strong>${product.grade}</strong></td>
                    <td>
                        <strong>${product.strain}</strong><br>
                        <small style="color: var(--text-muted);">${product.type || 'Premium'} • ${product.description || 'High quality product'}</small>
                    </td>
                    <td><strong style="color: var(--brand-green);">$${partnerPrice}${unitLabel}</strong></td>
                    <td><span style="color: var(--brand-green); font-weight: 700;">${product.thca}%</span></td>
                    <td>${product.stock}</td>
                    <td><span class="status-${product.status.toLowerCase().replace(' ', '')}">${product.status}</span></td>
                    <td>
                        ${isAvailable ?
                            `<button class="btn btn-primary btn-sm" onclick="addToCart('${product.id}', 1)" title="Add ${product.strain} to cart">
                                🛒 Add to Cart
                            </button>` :
                            `<button class="btn btn-secondary btn-sm" disabled title="${product.status}">
                                ${product.status}
                            </button>`
                        }
                    </td>
                </tr>
            `;
        }).join('');
    }

    updateAdminInventoryDisplay(products) {
        const tbody = document.getElementById('inventoryBody');
        if (!tbody) return;

        tbody.innerHTML = products.map(product => {
            const lastModified = product.lastModified ? 
                new Date(product.lastModified.seconds ? product.lastModified.seconds * 1000 : product.lastModified).toLocaleDateString() : 
                'Unknown';

            return `
                <tr data-product-id="${product.id}">
                    <td class="product-image-container">
                        <img src="${product.image || 'https://via.placeholder.com/80x80/1a1a1a/00C851?text=' + encodeURIComponent(product.grade)}"
                             alt="${product.strain}" class="product-image"
                             onerror="this.src='https://via.placeholder.com/80x80/1a1a1a/00C851?text=${encodeURIComponent(product.grade)}'" />
                    </td>
                    <td>${product.id}</td>
                    <td><strong>${product.grade}</strong></td>
                    <td>
                        <strong>${product.strain}</strong><br>
                        <small style="color: var(--text-muted);">${product.type || 'Premium'} • ${product.description || 'High quality product'}</small>
                    </td>
                    <td>
                        <input type="number" class="editable" value="${product.price}" 
                               onchange="updateProductField('${product.id}', 'price', this.value)"
                               style="width: 80px;" />
                    </td>
                    <td>
                        <input type="number" class="editable" value="${product.thca}" 
                               onchange="updateProductField('${product.id}', 'thca', this.value)"
                               style="width: 60px;" step="0.1" />
                    </td>
                    <td>
                        <select class="editable" onchange="updateProductField('${product.id}', 'status', this.value)">
                            <option value="AVAILABLE" ${product.status === 'AVAILABLE' ? 'selected' : ''}>Available</option>
                            <option value="COMING SOON" ${product.status === 'COMING SOON' ? 'selected' : ''}>Coming Soon</option>
                            <option value="SOLD OUT" ${product.status === 'SOLD OUT' ? 'selected' : ''}>Sold Out</option>
                        </select>
                    </td>
                    <td>
                        <input type="number" class="editable" value="${product.stock}" 
                               onchange="updateProductField('${product.id}', 'stock', this.value)"
                               style="width: 60px;" min="0" />
                    </td>
                    <td><small>${lastModified}</small></td>
                    <td>
                        <button class="btn btn-sm btn-secondary" onclick="editProduct('${product.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteProduct('${product.id}')">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    updateOrderDisplays(orders) {
        // Update partner order display
        this.updatePartnerOrdersDisplay(orders);
        
        // Update admin orders display
        this.updateAdminOrdersDisplay(orders);
        
        // Update order statistics
        this.updateOrderStats(orders);
    }

    updatePartnerOrdersDisplay(orders) {
        const tbody = document.getElementById('orderHistoryBody');
        if (!tbody || !this.currentUser) return;
        
        const userOrders = orders.filter(order => order.partnerEmail === this.currentUser.email);
        
        if (userOrders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No orders found</td></tr>';
            return;
        }
        
        tbody.innerHTML = userOrders.map(order => {
            const orderDate = new Date(order.createdAt.seconds ? order.createdAt.seconds * 1000 : order.createdAt).toLocaleDateString();
            
            return `
                <tr>
                    <td><strong>${order.id}</strong></td>
                    <td>${orderDate}</td>
                    <td>
                        <small style="color: var(--text-muted);">${order.itemsSummary}</small>
                    </td>
                    <td><strong style="color: var(--brand-green);">$${order.total.toFixed(2)}</strong></td>
                    <td><span class="status-${order.status.toLowerCase()}">${order.status}</span></td>
                    <td>${order.tracking || 'Pending'}</td>
                    <td>
                        <button class="btn btn-secondary btn-sm" onclick="viewOrderDetails('${order.id}')">
                            👁️ View
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    updateAdminOrdersDisplay(orders) {
        const tbody = document.getElementById('ordersBody');
        if (!tbody) return;

        tbody.innerHTML = orders.map(order => {
            const orderDate = new Date(order.createdAt.seconds ? order.createdAt.seconds * 1000 : order.createdAt).toLocaleDateString();
            
            return `
                <tr>
                    <td><strong>${order.id}</strong></td>
                    <td>${order.partnerName || order.partnerEmail}</td>
                    <td>${order.items ? order.items.length : 0} items</td>
                    <td><strong style="color: var(--brand-green);">$${order.total.toFixed(2)}</strong></td>
                    <td>
                        <select class="editable" onchange="updateOrderStatus('${order.id}', this.value)">
                            <option value="PENDING" ${order.status === 'PENDING' ? 'selected' : ''}>Pending</option>
                            <option value="PROCESSING" ${order.status === 'PROCESSING' ? 'selected' : ''}>Processing</option>
                            <option value="SHIPPED" ${order.status === 'SHIPPED' ? 'selected' : ''}>Shipped</option>
                            <option value="DELIVERED" ${order.status === 'DELIVERED' ? 'selected' : ''}>Delivered</option>
                            <option value="CANCELLED" ${order.status === 'CANCELLED' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </td>
                    <td>${order.tracking || 'Not assigned'}</td>
                    <td>${order.paymentStatus || 'pending'}</td>
                    <td>${orderDate}</td>
                    <td>
                        <button class="btn btn-sm btn-secondary" onclick="viewOrder('${order.id}')">View</button>
                        <button class="btn btn-sm btn-primary" onclick="updateOrderModal('${order.id}')">Update</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    updateApplicationDisplays(applications) {
        if (window.firebaseApplicationManager) {
            window.firebaseApplicationManager.updateAdminApplicationsDisplay(applications);
        }
    }

    updateInventoryStats(products) {
        const availableCount = products.filter(p => p.status === 'AVAILABLE').length;
        const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
        
        // Update stat cards
        this.updateStatCard('totalProducts', products.length);
        this.updateStatCard('availableProducts', availableCount);
        this.updateStatCard('totalValue', `$${totalValue.toFixed(0)}`);
        this.updateStatCard('publicAvailableCount', availableCount);
        this.updateStatCard('liveProductCount', availableCount);
    }

    updateOrderStats(orders) {
        const pending = orders.filter(o => o.status === 'PENDING').length;
        const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
        
        this.updateStatCard('totalOrders', orders.length);
        this.updateStatCard('pendingOrders', pending);
        this.updateStatCard('totalRevenue', `$${totalRevenue.toFixed(0)}`);
    }

    updateStatCard(statId, value) {
        const statElement = document.getElementById(statId);
        if (statElement) {
            statElement.textContent = value;
            statElement.classList.add('updated');
            setTimeout(() => {
                statElement.classList.remove('updated');
            }, 1000);
        }
    }

    handleFirebaseUpdate(updateData) {
        const { type, data } = updateData;
        console.log('🔄 Firebase update received:', type, data);
        
        // Show real-time update notifications
        switch (type) {
            case 'product_added':
                this.showNotification(`📦 New product added: ${data.strain}`, 'success');
                break;
            case 'product_updated':
                this.showNotification(`📦 Product updated: ${data.strain || 'Product'}`, 'info');
                break;
            case 'order_added':
                if (this.isAdminPortal()) {
                    this.showNotification(`🛒 New order: ${data.id} ($${data.total})`, 'success');
                }
                break;
            case 'application_submitted':
                if (this.isAdminPortal()) {
                    this.showNotification(`📝 New application: ${data.businessName}`, 'info');
                }
                break;
        }
    }

    handleAuthChange(user) {
        this.currentUser = user;
        
        if (user) {
            console.log('🔐 User authenticated:', user.email);
            this.setupUserSpecificSubscriptions(user);
        } else {
            console.log('🔐 User logged out');
            this.cleanupUserSubscriptions();
        }
    }

    setupUserSpecificSubscriptions(user) {
        // Set up user-specific order subscription
        if (this.subscriptions.has('user_orders')) {
            this.subscriptions.get('user_orders')();
        }
        
        const userOrdersUnsubscribe = window.firebaseDataManager.subscribeToOrders((orders) => {
            this.updatePartnerOrdersDisplay(orders);
        }, user.email);
        
        this.subscriptions.set('user_orders', userOrdersUnsubscribe);
    }

    cleanupUserSubscriptions() {
        if (this.subscriptions.has('user_orders')) {
            this.subscriptions.get('user_orders')();
            this.subscriptions.delete('user_orders');
        }
    }

    initializeUIUpdates() {
        // Set up sync status indicator
        this.updateSyncStatusIndicator();
        
        // Set up periodic status updates
        setInterval(() => {
            this.updateSyncStatusIndicator();
        }, 5000);
        
        // Override legacy update functions
        window.updateAllViews = () => {
            console.log('🔄 Updating all views with Firebase data...');
            const products = this.dataCache.get('products') || [];
            const orders = this.dataCache.get('orders') || [];
            
            this.updateProductDisplays(products);
            this.updateOrderDisplays(orders);
        };
    }

    updateSyncStatusIndicator() {
        const syncIcon = document.getElementById('syncIcon');
        const syncText = document.getElementById('syncText');
        
        if (syncIcon && syncText) {
            switch (this.syncStatus) {
                case 'connected':
                    syncIcon.textContent = '🔥';
                    syncText.textContent = 'Firebase Live';
                    syncIcon.parentElement.style.background = 'linear-gradient(135deg, var(--brand-green), var(--brand-green-light))';
                    break;
                case 'error':
                    syncIcon.textContent = '❌';
                    syncText.textContent = 'Error';
                    syncIcon.parentElement.style.background = 'linear-gradient(135deg, var(--accent-red), #FF6666)';
                    break;
                default:
                    syncIcon.textContent = '🔄';
                    syncText.textContent = 'Connecting...';
                    syncIcon.parentElement.style.background = 'linear-gradient(135deg, var(--accent-orange), #FFB366)';
            }
        }
    }

    broadcastUpdate(type, data) {
        window.dispatchEvent(new CustomEvent('firebaseSystemUpdate', {
            detail: { type, data, timestamp: new Date().toISOString() }
        }));
    }

    isAdminPortal() {
        return window.location.href.includes('admin') || 
               document.title.includes('Admin') ||
               document.getElementById('adminDashboard');
    }

    getUnitLabel(grade) {
        if (!grade) return '/unit';
        
        const gradeUpper = grade.toString().toUpperCase();
        if (gradeUpper.includes('ROSIN') || gradeUpper.includes('CONCENTRATE')) {
            return '/g';
        } else if (gradeUpper.includes('VAPE') || gradeUpper.includes('CART')) {
            return '/cart';
        } else {
            return '/lb';
        }
    }

    showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    destroy() {
        console.log('🔄 Destroying Firebase System Integration...');
        this.subscriptions.forEach((unsubscribe) => {
            unsubscribe();
        });
        this.subscriptions.clear();
        this.dataCache.clear();
    }
}

// Make global functions available for admin operations
window.updateProductField = async (productId, field, value) => {
    try {
        await window.firebaseDataManager.updateProduct(productId, { [field]: value });
        window.firebaseSystemIntegration.showNotification(`✅ Product ${field} updated`, 'success');
    } catch (error) {
        console.error('Error updating product:', error);
        window.firebaseSystemIntegration.showNotification('❌ Error updating product', 'error');
    }
};

window.updateOrderStatus = async (orderId, status) => {
    try {
        await window.firebaseDataManager.updateOrder(orderId, { status });
        window.firebaseSystemIntegration.showNotification(`✅ Order status updated to ${status}`, 'success');
    } catch (error) {
        console.error('Error updating order:', error);
        window.firebaseSystemIntegration.showNotification('❌ Error updating order', 'error');
    }
};

window.deleteProduct = async (productId) => {
    if (confirm('Are you sure you want to delete this product?')) {
        try {
            await window.firebaseDataManager.deleteProduct(productId);
            window.firebaseSystemIntegration.showNotification('✅ Product deleted', 'success');
        } catch (error) {
            console.error('Error deleting product:', error);
            window.firebaseSystemIntegration.showNotification('❌ Error deleting product', 'error');
        }
    }
};

// Initialize Firebase System Integration
window.firebaseSystemIntegration = new FirebaseSystemIntegration();

console.log('🔥 Firebase System Integration initialized');
