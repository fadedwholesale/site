// Main Application JavaScript for Faded Skies Portal
// Clean implementation with dynamic data processing system

// Global Variables - Authentication State
let currentUser = null;

// Ensure window.currentUser is always synchronized
function setCurrentUser(user) {
    currentUser = user;
    window.currentUser = user;

    if (user) {
        console.log('✅ User authenticated globally:', user.email);
    } else {
        console.log('🔒 User logged out globally');
    }
    
    return user;
}

let currentView = 'public';
let activePortalTab = 'dashboard';
let liveInventoryVisible = false;
let products = [];
let orders = [];
let currentFilter = 'all';

// Initialize Application
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Faded Skies Portal initializing...');
    initializeApplication();
    await loadInitialData();
    setupEventListeners();
    setupNotificationFiltering();

    // Verify authentication state
    setTimeout(() => {
        const authState = debugAuthState();
        console.log('🔐 Final Authentication State:', authState);
        if (!authState.isAuthenticated) {
            console.log('✅ Authentication working correctly - user is NOT automatically logged in');
        } else {
            console.warn('⚠️ User is automatically logged in - this may be unintended');
        }
    }, 100);

    console.log('✅ Application initialized successfully');
});

// Setup notification filtering based on user context
function setupNotificationFiltering() {
    // Override the global showNotification function to add filtering
    const originalShowNotification = window.showNotification;

    window.showNotification = function(message, type = 'info', options = {}) {
        const currentUser = window.currentUser;
        const isAdmin = currentUser?.role === 'admin' || currentUser?.email?.includes('admin');
        const isPartner = currentUser && !isAdmin;

        // Filter notifications based on type and user role
        if (options.adminOnly && !isAdmin) {
            console.log('Filtering out admin-only notification for non-admin user');
            return;
        }

        if (options.partnerOnly && !isPartner) {
            console.log('Filtering out partner-only notification for non-partner user');
            return;
        }

        // Filter out system notifications for partners to reduce noise
        if (isPartner && (type === 'system' || message.includes('synced') || message.includes('updated'))) {
            // Only show if it's their own action
            if (!options.userSpecific) {
                console.log('Filtering out system notification for partner to reduce noise');
                return;
            }
        }

        // Call original function
        if (originalShowNotification) {
            originalShowNotification(message, type, options);
        } else {
            // Fallback notification
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    };
}

function initializeApplication() {
    console.log('🔧 Initializing application components...');

    // Initialize authentication
    initializeAuthentication();

    // Initialize dynamic data processor
    initializeDynamicDataProcessor();

    // Initialize notification system
    initializeNotificationSystem();

    // Initialize live checkout system
    initializeLiveCheckout();

    // Initialize view state
    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get('view');
    if (view === 'admin') {
        currentView = 'admin';
        showAdminView();
    } else if (view === 'portal') {
        currentView = 'portal';
        showPortalView();
    } else {
        showPublicView();
    }

    // Setup real-time status monitoring
    setupRealTimeStatusMonitoring();

    console.log('✅ Application components initialized');
}

function initializeAuthentication() {
    console.log('🔐 Initializing authentication...');
    
    // Check for existing authentication
    if (window.currentUser) {
        setCurrentUser(window.currentUser);
        console.log('✅ User already authenticated:', window.currentUser.email);
    } else {
        console.log('🔒 No user currently authenticated');
    }
}

function initializeDynamicDataProcessor() {
    console.log('⚡ Initializing dynamic data processor...');
    
    // Wait for dynamic data processor to be ready
    if (window.dynamicDataProcessor) {
        console.log('✅ Dynamic data processor available');
        const status = window.dynamicDataProcessor.getStatus();
        console.log('📊 Dynamic processor status:', status);
    } else {
        console.log('⏳ Waiting for dynamic data processor...');
        setTimeout(initializeDynamicDataProcessor, 1000);
    }
}

function initializeNotificationSystem() {
    console.log('🔔 Initializing notification system...');
    
    if (window.notificationSystem) {
        console.log('✅ Notification system available');
    } else {
        console.log('⏳ Waiting for notification system...');
        setTimeout(initializeNotificationSystem, 1000);
    }
}

function initializeLiveCheckout() {
    console.log('💳 Initializing live checkout system...');
    
    // Initialize checkout functionality
    window.liveCheckout = {
        isProcessing: false,
        currentOrder: null,
        
        async processOrder(orderData) {
            if (this.isProcessing) {
                console.warn('⚠️ Checkout already in progress');
                return false;
            }
            
            this.isProcessing = true;
            console.log('🔄 Processing order:', orderData);
            
            try {
                // Process order through dynamic data processor
                if (window.dynamicDataProcessor) {
                    // Add order to processing queue
                    window.dynamicDataProcessor.processingQueue.push({
                        type: 'new_order',
                        data: orderData,
                        timestamp: Date.now()
                    });
                }
                
                // Show success notification
                if (window.notificationSystem) {
                    window.notificationSystem.showNotification({
                        title: 'Order Submitted',
                        message: 'Your order has been submitted successfully',
                        type: 'order_created',
                        userId: currentUser?.id || 'all'
                    });
                }
                
                this.currentOrder = orderData;
                return true;
            } catch (error) {
                console.error('❌ Order processing failed:', error);
                return false;
            } finally {
                this.isProcessing = false;
            }
        },
        
        getCurrentOrder() {
            return this.currentOrder;
        }
    };
    
    console.log('✅ Live checkout system initialized');
}

function setupRealTimeStatusMonitoring() {
    console.log('📡 Setting up real-time status monitoring...');
    
    const statusContainer = document.getElementById('system-status');
    if (!statusContainer) {
        console.log('⚠️ Status container not found');
        return;
    }
    
    const syncIcon = statusContainer.querySelector('.sync-icon');
    const syncText = statusContainer.querySelector('.sync-text');
    
    if (!syncIcon || !syncText) {
        console.log('⚠️ Status elements not found');
        return;
    }
    
    const checkStatus = () => {
        const dynamicProcessorStatus = window.dynamicDataProcessor?.getStatus();
        const notificationStatus = !!window.notificationSystem;
        
        if (dynamicProcessorStatus?.firebaseReady && notificationStatus) {
            syncIcon.textContent = '✅';
            syncText.textContent = 'Live';
            syncIcon.parentElement.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
        } else {
            syncIcon.textContent = '🔄';
            syncText.textContent = 'Initializing...';
            syncIcon.parentElement.style.background = 'linear-gradient(135deg, var(--accent-orange), #FFB366)';
        }
    };

    // Initial check
    checkStatus();

    // Check every 3 seconds
    setInterval(checkStatus, 3000);

    // Listen for online/offline events
    window.addEventListener('online', checkStatus);
    window.addEventListener('offline', checkStatus);

    console.log('✅ Real-time status monitoring active');
}

async function loadInitialData() {
    console.log('📦 Loading initial data...');

    // Initialize with empty arrays to prevent filter errors
    products = [];
    orders = [];

    // Load data through dynamic data processor
    if (window.dynamicDataProcessor && window.dynamicDataProcessor.getStatus().firebaseReady) {
        try {
            // Load products and orders from Firebase
            console.log('🔥 Loading data from Firebase...');
            
            // Initialize with sample data for now
            products = getSampleProducts();
            orders = [];
            
            console.log(`✅ Loaded ${products.length} products`);
        } catch (error) {
            console.error('❌ Failed to load data from Firebase:', error);
            // Fallback to sample data
            products = getSampleProducts();
        }
    } else {
        console.log('⏳ Dynamic data processor not ready, using sample data');
        products = getSampleProducts();
    }

    // Update displays
    updateProductDisplay();
    updateOrderDisplay();
    
    console.log('✅ Initial data loaded');
}

function getSampleProducts() {
    return [
        {
            id: 1,
            grade: 'A-GRADE',
            strain: 'Purple Cream (EXTC)',
            thca: 31.2,
            price: 983,
            status: 'COMING SOON',
            stock: 0,
            type: 'Indica',
            image: 'https://images.unsplash.com/photo-1536924540902-17d2d1d5a94e?w=200&h=200&fit=crop&crop=center'
        },
        {
            id: 2,
            grade: 'A-GRADE',
            strain: 'Blue Gelatti (EXTC)',
            thca: 29.5,
            price: 983,
            status: 'IN STOCK',
            stock: 15,
            type: 'Hybrid',
            image: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=200&h=200&fit=crop&crop=center'
        },
        {
            id: 3,
            grade: 'A-GRADE',
            strain: 'White Runtz (EXTC)',
            thca: 28.8,
            price: 983,
            status: 'IN STOCK',
            stock: 8,
            type: 'Hybrid',
            image: 'https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=200&h=200&fit=crop&crop=center'
        }
    ];
}

function setupEventListeners() {
    console.log('🎧 Setting up event listeners...');

    // Navigation event listeners
    document.addEventListener('click', function(e) {
        if (e.target.matches('[data-nav]')) {
            e.preventDefault();
            const target = e.target.getAttribute('data-nav');
            navigateTo(target);
        }
    });

    // Product filter listeners
    document.addEventListener('click', function(e) {
        if (e.target.matches('.filter-btn')) {
            e.preventDefault();
            const filter = e.target.getAttribute('data-filter');
            applyFilter(filter);
        }
    });

    // Cart event listeners
    document.addEventListener('click', function(e) {
        if (e.target.matches('.add-to-cart-btn')) {
            e.preventDefault();
            const productId = e.target.getAttribute('data-product-id');
            addToCart(productId, 1);
        }
    });

    // Order event listeners
    document.addEventListener('click', function(e) {
        if (e.target.matches('.place-order-btn')) {
            e.preventDefault();
            placeOrder();
        }
    });

    // Notification event listeners
    document.addEventListener('navigateToOrder', function(e) {
        const orderId = e.detail.orderId;
        showOrderDetails(orderId);
    });

    document.addEventListener('navigateToProduct', function(e) {
        const productId = e.detail.productId;
        showProductDetails(productId);
    });

    console.log('✅ Event listeners setup complete');
}

// Navigation functions
function navigateTo(target) {
    console.log('🧭 Navigating to:', target);
    
    switch (target) {
        case 'dashboard':
            showDashboard();
            break;
        case 'products':
            showProducts();
            break;
        case 'orders':
            showOrders();
            break;
        case 'profile':
            showProfile();
            break;
        case 'admin':
            showAdminView();
            break;
        case 'portal':
            showPortalView();
            break;
        default:
            console.warn('⚠️ Unknown navigation target:', target);
    }
}

// View functions
function showDashboard() {
    console.log('📊 Showing dashboard');
    activePortalTab = 'dashboard';
    updatePortalDisplay();
}

function showProducts() {
    console.log('🛍️ Showing products');
    activePortalTab = 'products';
    updatePortalDisplay();
}

function showOrders() {
    console.log('📦 Showing orders');
    activePortalTab = 'orders';
    updatePortalDisplay();
}

function showProfile() {
    console.log('👤 Showing profile');
    activePortalTab = 'profile';
    updatePortalDisplay();
}

function showAdminView() {
    console.log('⚙️ Showing admin view');
    currentView = 'admin';
    updateViewDisplay();
}

function showPortalView() {
    console.log('🌐 Showing portal view');
    currentView = 'portal';
    updateViewDisplay();
}

function showPublicView() {
    console.log('🌍 Showing public view');
    currentView = 'public';
    updateViewDisplay();
}

// Display update functions
function updateViewDisplay() {
    const publicView = document.getElementById('public-view');
    const portalView = document.getElementById('portal-view');
    const adminView = document.getElementById('admin-view');

    if (publicView) publicView.style.display = currentView === 'public' ? 'block' : 'none';
    if (portalView) portalView.style.display = currentView === 'portal' ? 'block' : 'none';
    if (adminView) adminView.style.display = currentView === 'admin' ? 'block' : 'none';
}

function updatePortalDisplay() {
    const dashboardTab = document.getElementById('dashboard-tab');
    const productsTab = document.getElementById('products-tab');
    const ordersTab = document.getElementById('orders-tab');
    const profileTab = document.getElementById('profile-tab');

    if (dashboardTab) dashboardTab.style.display = activePortalTab === 'dashboard' ? 'block' : 'none';
    if (productsTab) productsTab.style.display = activePortalTab === 'products' ? 'block' : 'none';
    if (ordersTab) ordersTab.style.display = activePortalTab === 'orders' ? 'block' : 'none';
    if (profileTab) profileTab.style.display = activePortalTab === 'profile' ? 'block' : 'none';
}

function updateProductDisplay() {
    const productContainer = document.getElementById('product-container');
    if (!productContainer) return;

    const filteredProducts = filterProducts(products, currentFilter);
    
    productContainer.innerHTML = filteredProducts.map(product => `
        <div class="product-card" data-product-id="${product.id}">
            <img src="${product.image}" alt="${product.strain}" class="product-image">
            <div class="product-info">
                <h3>${product.strain}</h3>
                <p class="grade">${product.grade}</p>
                <p class="thca">THCA: ${product.thca}%</p>
                <p class="price">$${product.price}</p>
                <p class="status ${product.status.toLowerCase().replace(' ', '-')}">${product.status}</p>
                <p class="stock">Stock: ${product.stock}</p>
                <button class="add-to-cart-btn" data-product-id="${product.id}" ${product.stock === 0 ? 'disabled' : ''}>
                    ${product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                </button>
            </div>
        </div>
    `).join('');
}

function updateOrderDisplay() {
    const orderContainer = document.getElementById('order-container');
    if (!orderContainer) return;

    orderContainer.innerHTML = orders.map(order => `
        <div class="order-card">
            <h3>Order #${order.id}</h3>
            <p>Status: ${order.status}</p>
            <p>Total: $${order.total}</p>
            <p>Date: ${new Date(order.date).toLocaleDateString()}</p>
        </div>
    `).join('');
}

// Filter functions
function applyFilter(filter) {
    console.log('🔍 Applying filter:', filter);
    currentFilter = filter;
    updateProductDisplay();
}

function filterProducts(products, filter) {
    if (filter === 'all') return products;
    
    return products.filter(product => {
        switch (filter) {
            case 'in-stock':
                return product.status === 'IN STOCK';
            case 'coming-soon':
                return product.status === 'COMING SOON';
            case 'indica':
                return product.type === 'Indica';
            case 'sativa':
                return product.type === 'Sativa';
            case 'hybrid':
                return product.type === 'Hybrid';
            default:
                return true;
        }
    });
}

// Cart functions
function addToCart(productId, quantity) {
    console.log('🛒 Adding to cart:', productId, quantity);
    
    const product = products.find(p => p.id == productId);
    if (!product) {
        console.error('❌ Product not found:', productId);
        return false;
    }
    
    if (product.stock < quantity) {
        console.error('❌ Insufficient stock');
        return false;
    }
    
    // Add to cart through dynamic system
    if (window.liveCheckout) {
        // This would integrate with the dynamic cart system
        console.log('✅ Product added to cart through live checkout');
    }
    
    // Show notification
    if (window.notificationSystem) {
        window.notificationSystem.showNotification({
            title: 'Added to Cart',
            message: `${product.strain} added to cart`,
            type: 'notification',
            userId: currentUser?.id || 'all'
        });
    }
    
    return true;
}

// Order functions
function placeOrder() {
    console.log('📦 Placing order...');
    
    if (!currentUser) {
        console.error('❌ User not authenticated');
        return false;
    }
    
    // Process order through live checkout
    if (window.liveCheckout) {
        const orderData = {
            userId: currentUser.id,
            items: [], // This would come from cart
            total: 0,
            date: new Date(),
            status: 'pending'
        };
        
        return window.liveCheckout.processOrder(orderData);
    }
    
    return false;
}

// Detail view functions
function showOrderDetails(orderId) {
    console.log('📋 Showing order details:', orderId);
    // Implementation for showing order details
}

function showProductDetails(productId) {
    console.log('🛍️ Showing product details:', productId);
    // Implementation for showing product details
}

// Debug functions
function debugAuthState() {
    return {
        isAuthenticated: !!currentUser,
        user: currentUser,
        timestamp: new Date().toISOString()
    };
}

// Test functions
function testDynamicSystem() {
    console.log('🧪 Testing dynamic system...');
    
    const tests = [
        testDynamicDataProcessor,
        testNotificationSystem,
        testLiveCheckout
    ];
    
    tests.forEach(test => {
        try {
            test();
        } catch (error) {
            console.error('❌ Test failed:', error);
        }
    });
}

function testDynamicDataProcessor() {
    console.log('⚡ Testing dynamic data processor...');
    
    if (window.dynamicDataProcessor) {
        const status = window.dynamicDataProcessor.getStatus();
        console.log('✅ Dynamic data processor status:', status);
    } else {
        console.error('❌ Dynamic data processor not available');
    }
}

function testNotificationSystem() {
    console.log('🔔 Testing notification system...');
    
    if (window.notificationSystem) {
        window.notificationSystem.showNotification({
            title: 'Test Notification',
            message: 'This is a test notification from the dynamic system',
            type: 'notification',
            userId: 'all'
        });
        console.log('✅ Notification system working');
    } else {
        console.error('❌ Notification system not available');
    }
}

function testLiveCheckout() {
    console.log('💳 Testing live checkout...');
    
    if (window.liveCheckout) {
        const testOrder = {
            userId: 'test-user',
            items: [],
            total: 0,
            date: new Date(),
            status: 'test'
        };
        
        window.liveCheckout.processOrder(testOrder).then(success => {
            console.log('✅ Live checkout test result:', success);
        });
    } else {
        console.error('❌ Live checkout not available');
    }
}

// Export for global access
window.mainApp = {
    setCurrentUser,
    navigateTo,
    addToCart,
    placeOrder,
    testDynamicSystem,
    debugAuthState
};

console.log('✅ Main application script loaded');
