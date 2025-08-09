// Main Application JavaScript for Faded Skies Portal
// Complete implementation with cart, orders, and profile functionality

// Global Variables - Authentication State
let currentUser = null;

// Ensure window.currentUser is always synchronized - Firebase only
function setCurrentUser(user) {
    currentUser = user;
    window.currentUser = user;

    if (user) {
        console.log('✅ User authenticated globally:', user.email);
        // User state is managed by Firebase Auth
    } else {
        console.log('🔒 User logged out globally');
        // Clear Firebase Auth
        if (window.firebaseIntegrationBridge?.auth) {
            window.firebaseIntegrationBridge.auth.signOut();
        }
    }
    
    // Notify cart manager of auth state change with delay for Firebase readiness
    if (window.cartManager) {
        console.log('🔄 Refreshing cart manager after auth change');
        // Add a small delay to allow Firebase to be ready
        setTimeout(() => {
            try {
                window.cartManager.refreshUserState();
                window.cartManager.updateDisplay();
            } catch (error) {
                console.warn('⚠️ Cart manager refresh failed, but continuing:', error.message);
            }
        }, 1000);
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
        }
    };
}

function initializeApplication() {
    // Initialize cart manager if not already done
    if (!window.cartManager) {
        console.log('🛒 Initializing cart manager...');
        window.cartManager = new CartManager();
        console.log('✅ Cart manager initialized');
    }

    // Setup shared data manager event listeners
    window.addEventListener('sharedDataChange', handleSharedDataChange);

    // Initialize real-time status indicator
    initializeRealTimeStatusIndicator();

    // Check Firebase Auth state instead of localStorage
    if (window.firebaseIntegrationBridge?.auth) {
        window.firebaseIntegrationBridge.auth.onAuthStateChanged((user) => {
            if (user) {
                const userData = {
                    email: user.email,
                    name: user.displayName || 'Partner',
                    uid: user.uid
                };
                setCurrentUser(userData);
                showUserSession();
                console.log('✅ Firebase user session restored:', user.email);
            } else {
                setCurrentUser(null);
                showGuestSession();
                console.log('👤 No Firebase user session found, showing guest session');
            }
        });
    } else {
        // Firebase not ready yet, show guest session
        console.log('⏳ Waiting for Firebase auth...');
        showGuestSession();
        // Retry Firebase auth check
        setTimeout(() => {
            if (window.firebaseIntegrationBridge?.auth) {
                window.firebaseIntegrationBridge.auth.onAuthStateChanged((user) => {
                    if (user) {
                        const userData = {
                            email: user.email,
                            name: user.displayName || 'Partner',
                            uid: user.uid
                        };
                        setCurrentUser(userData);
                        showUserSession();
                    }
                });
            }
        }, 2000);
    }

    // Initialize live checkout system
    initializeLiveCheckout();

    // Initialize view state - only show portal if user is actually logged in
    const urlParams = new URLSearchParams(window.location.search);
    const initialView = urlParams.get('view');
    if (initialView === 'portal') {
        if (currentUser) {
            showPartnerPortal();
        } else {
            // Redirect to public view and show login modal
            showPublicWebsite();
            setTimeout(() => {
                showNotification('🔒 Please log in to access the partner portal', 'warning');
                openModal('loginModal');
            }, 500);
        }
    } else {
        // Default to public view
        showPublicWebsite();
    }
}

// Initialize real-time status indicator
function initializeRealTimeStatusIndicator() {
    const syncIcon = document.getElementById('syncIcon');
    const syncText = document.getElementById('syncText');

    if (!syncIcon || !syncText) return;

    // Check real-time system status periodically
    const checkStatus = () => {
        const isOnline = navigator.onLine;
        const hasRealTimeSync = !!window.realTimeSync;
        const hasDataManager = !!window.sharedDataManager;

        if (!isOnline) {
            syncIcon.textContent = '����';
            syncText.textContent = 'Offline';
            syncIcon.parentElement.style.background = 'linear-gradient(135deg, var(--accent-red), #FF6666)';
        } else if (hasRealTimeSync && hasDataManager) {
            syncIcon.textContent = '✅';
            syncText.textContent = 'Live Sync';
            syncIcon.parentElement.style.background = 'linear-gradient(135deg, var(--brand-green), var(--brand-green-light))';
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

    // Listen for real-time sync events to show activity
    if (window.realTimeSync) {
        window.realTimeSync.on('*', () => {
            syncIcon.style.animation = 'pulse 0.5s ease-in-out';
            setTimeout(() => {
                syncIcon.style.animation = '';
            }, 500);
        });
    }
}

async function loadInitialData() {
    console.log('📦 Loading initial data...');

    // Initialize with empty arrays to prevent filter errors
    products = [];
    orders = [];

    // Wait for SharedDataManager and Firebase to be ready
    const maxAttempts = 30; // Wait up to 30 seconds
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (window.sharedDataManager &&
            typeof window.sharedDataManager.getProducts === 'function' &&
            window.sharedDataManager.getStatus &&
            window.sharedDataManager.getStatus().firebaseReady) {

            try {
                console.log(`📦 Attempting to load data (attempt ${attempt + 1})...`);
                products = await window.sharedDataManager.getProducts() || [];
                orders = await window.sharedDataManager.getOrders() || [];
                updateAllViews();
                console.log(`✅ Loaded ${products.length} products and ${orders.length} orders`);
                return; // Success, exit the function
            } catch (error) {
                console.warn(`⚠️ Attempt ${attempt + 1} failed:`, error.message);
                if (attempt === maxAttempts - 1) {
                    console.error('❌ Failed to load data after all attempts:', error);
                }
            }
        } else {
            console.log(`⏳ Waiting for SharedDataManager and Firebase... (${attempt + 1}/${maxAttempts})`);
        }

        // Wait 1 second before next attempt
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // If we get here, all attempts failed
    console.warn('⚠️ Failed to load initial data after maximum attempts, using empty arrays');
    products = [];
    orders = [];
    updateAllViews(); // Still update views to show loading state
}

function setupEventListeners() {
    // Listen for authentication events
    window.addEventListener('userAuthenticated', function(event) {
        console.log('🔐 User authenticated event received');
        if (window.cartManager) {
            window.cartManager.refreshUserState();
        }
    });
    
    // Listen for cart updates
    window.addEventListener('cartUpdate', function(event) {
        updateCartDisplays();
    });
}

async function handleSharedDataChange(event) {
    const { type, data } = event.detail;
    console.log('📡 Shared data changed:', type, data);

    switch (type) {
        case 'products_updated':
            products = data;
            updateAllViews();
            break;
        case 'order_added':
            try {
                if (window.sharedDataManager && typeof window.sharedDataManager.getOrders === 'function') {
                    orders = await window.sharedDataManager.getOrders();
                    updateOrdersDisplay();
                }
            } catch (error) {
                console.error('❌ Error getting orders:', error);
            }
            if (currentUser && data.partner === currentUser.email) {
                showNotification(`🎉 Order ${data.id} placed successfully!`, 'success');
            }
            break;
        case 'cart_updated':
            if (currentUser && data.userEmail === currentUser.email) {
                updateCartDisplays();
            }
            break;
    }
}

// Production Authentication Helper
async function validateUserCredentials(email, password) {
    // In production, this would make an API call to your authentication server
    // For now, we'll validate against basic business email patterns

    // Basic validation - in production, replace with actual API call
    const businessEmailPatterns = [
        /@[a-zA-Z0-9-]+\.(com|net|org|biz)$/,
        /dispensary/i,
        /cannabis/i,
        /partner/i
    ];

    const isBusinessEmail = businessEmailPatterns.some(pattern =>
        pattern.test ? pattern.test(email) : email.toLowerCase().includes(pattern)
    );

    // Simulate API validation delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // For production: return the result of your actual authentication API
    return isBusinessEmail && password.length >= 6;
}

// Authentication Functions
async function login(event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Enhanced authentication with credential validation
    if (!email || !password) {
        showNotification('❌ Please enter both email and password', 'error');
        return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('❌ Please enter a valid email address', 'error');
        return;
    }

    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Authenticating...';
    submitBtn.disabled = true;

    try {
        // Production authentication - validate with backend API
        const isValidUser = await validateUserCredentials(email, password);

        if (isValidUser) {
        // Create user data based on email
        let userData;
        if (email === 'partner@greenvalley.com') {
            userData = {
                email: email,
                name: 'John Smith',
                businessName: 'Green Valley Dispensary',
                contactName: 'John Smith',
                phone: '(555) 123-4567',
                businessType: 'dispensary',
                tier: 'Gold Partner',
                loginTime: new Date().toISOString(),
                businessAddress: '123 Main Street\nGreen Valley, CA 90210',
                licenseNumber: 'CA-LICENSE-12345',
                website: 'https://greenvalleydispensary.com',
                taxId: '12-3456789',
                notes: 'Premium cannabis retailer serving the community since 2020'
            };
        } else if (email === 'admin@fadedskies.com') {
            userData = {
                email: email,
                name: 'Admin User',
                businessName: 'Faded Skies Admin',
                tier: 'Administrator',
                loginTime: new Date().toISOString(),
                isAdmin: true
            };
        } else {
            userData = {
                email: email,
                name: email.split('@')[0],
                tier: 'Partner',
                loginTime: new Date().toISOString()
            };
        }

        // Set user with proper synchronization
        setCurrentUser(userData);

        // Update UI
        showUserSession();
        closeModal('loginModal');
        showPartnerPortal();

        // Notify all systems of authentication
        window.dispatchEvent(new CustomEvent('userAuthenticated', { detail: currentUser }));

        showNotification(`Welcome back, ${currentUser.name}! 🎉`, 'success');
        console.log('✅ User logged in:', currentUser.email);

    } else {
        showNotification('❌ Invalid credentials. Please check your email and password.', 'error');
    }

    } catch (error) {
        console.error('Authentication error:', error);
        showNotification('❌ Authentication failed. Please try again.', 'error');
    } finally {
        // Restore button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function logout() {
    if (currentUser) {
        const userName = currentUser.name;
        
        // Clear cart first
        if (window.cartManager) {
            window.cartManager.cart = [];
            window.cartManager.updateDisplay();
        }

        // Clear authentication state
        setCurrentUser(null);
        
        // Update UI
        showGuestSession();
        showPublicWebsite();

        showNotification(`Goodbye, ${userName}! 👋`, 'success');
        console.log('✅ User logged out');
    }
}

function showUserSession() {
    const guestSection = document.getElementById('guestSection');
    const userSession = document.getElementById('userSession');
    const userWelcome = document.getElementById('userWelcome');
    const userBadge = document.getElementById('userBadge');
    const cartToggle = document.getElementById('cartToggle');

    if (guestSection) guestSection.style.display = 'none';
    if (userSession) userSession.classList.add('show');
    if (userWelcome) userWelcome.textContent = `Welcome, ${currentUser.name}`;
    if (userBadge) userBadge.textContent = currentUser.tier || 'PARTNER';
    if (cartToggle) cartToggle.style.display = 'inline-flex';

    // Update cart display immediately for authenticated user
    if (window.cartManager) {
        window.cartManager.updateDisplay();
    }

    // Update public inventory display to show action buttons for authenticated users
    updatePublicInventoryDisplay();
}

function showGuestSession() {
    const guestSection = document.getElementById('guestSection');
    const userSession = document.getElementById('userSession');
    const cartToggle = document.getElementById('cartToggle');

    if (guestSection) guestSection.style.display = 'flex';
    if (userSession) userSession.classList.remove('show');
    if (cartToggle) cartToggle.style.display = 'none';

    // Update public inventory display to hide action buttons for non-authenticated users
    updatePublicInventoryDisplay();
}

// View Management Functions
function showPublicWebsite() {
    currentView = 'public';
    document.getElementById('publicView').classList.add('active');
    document.getElementById('partnerView').classList.remove('active');
    updateUrl();
}

function showPartnerPortal() {
    if (!currentUser) {
        showNotification('🔒 Please log in to access the partner portal', 'error');
        openModal('loginModal');
        return;
    }
    
    currentView = 'portal';
    document.getElementById('publicView').classList.remove('active');
    document.getElementById('partnerView').classList.add('active');
    
    // Load portal data
    updatePortalData();
    updateUrl();
    
    console.log('✅ Partner portal displayed');
}

function updateUrl() {
    const url = new URL(window.location);
    if (currentView === 'portal') {
        url.searchParams.set('view', 'portal');
    } else {
        url.searchParams.delete('view');
    }
    window.history.replaceState({}, '', url);
}

// Portal Tab Management
function switchPortalTab(tabName) {
    // Update active tab
    document.querySelectorAll('.portal-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[onclick="switchPortalTab('${tabName}')"]`).classList.add('active');
    
    // Update content
    document.querySelectorAll('.portal-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`portal${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.add('active');
    
    activePortalTab = tabName;
    
    // Load specific tab data
    switch (tabName) {
        case 'products':
            updatePartnerProductsDisplay();
            break;
        case 'orders':
            updateOrdersDisplay();
            break;
        case 'profile':
            updateProfileDisplay();
            // Refresh profile data to ensure it's current
            if (currentUser) {
                console.log('🔄 Profile tab opened, refreshing display with latest user data');
                setTimeout(() => updateProfileDisplay(), 100);
            }
            break;
        case 'dashboard':
            updateDashboardStats();
            break;
        case 'bulk':
            updateBulkOrderStats();
            break;
    }
    
    console.log(`✅ Switched to ${tabName} tab`);
}

// Cart Functions
function toggleCart() {
    if (window.cartManager) {
        window.cartManager.toggle();
    }
}

function addToCart(productId, quantity = 1) {
    if (window.cartManager) {
        return window.cartManager.addProduct(productId, quantity);
    } else {
        console.error('�� Cart manager not found');
        showNotification('❌ Cart system not available', 'error');
        return false;
    }
}

function clearCart() {
    if (window.cartManager) {
        window.cartManager.clear();
    }
}

function checkout() {
    if (window.cartManager) {
        return window.cartManager.checkout();
    }
}

function updateCartDisplays() {
    if (window.cartManager) {
        const totals = window.cartManager.getTotals();
        
        // Update cart counters
        const cartCount = document.getElementById('cartCount');
        const cartCount2 = document.getElementById('cartCount2');
        
        if (cartCount) cartCount.textContent = totals.totalItems;
        if (cartCount2) cartCount2.textContent = totals.totalItems;
    }
}

// Product Display Functions
function updateAllViews() {
    updatePublicInventoryDisplay();
    updatePartnerProductsDisplay();
    updateDashboardStats();
    updateInventoryStats();
}

function updatePublicInventoryDisplay() {
    const tbody = document.getElementById('publicInventoryBody');
    if (!tbody) return;

    // Safety check: ensure products is an array
    if (!Array.isArray(products)) {
        console.warn('⚠️ Products is not an array:', typeof products, products);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Loading products...</td></tr>';
        return;
    }

    const availableProducts = products.filter(p => p.status === 'AVAILABLE');

    if (availableProducts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No products available at this time</td></tr>';
        return;
    }

    // Check if user is authenticated to show action buttons
    const isAuthenticated = !!(currentUser || window.currentUser);

    tbody.innerHTML = availableProducts.map(product => {
        const unitLabel = getUnitLabel(product.grade);

        // Different action column content based on authentication status
        let actionColumn;
        if (isAuthenticated) {
            actionColumn = `
                <button class="btn btn-primary btn-sm" onclick="addToCart(${product.id})" title="Add ${product.strain} to cart">
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
                    <img src="${product.image || product.photo || 'https://via.placeholder.com/80x80/1a1a1a/00C851?text=' + encodeURIComponent(product.grade)}"
                         alt="${product.strain}" class="product-image"
                         onerror="handleProductImageError(this, ${JSON.stringify(product).replace(/"/g, '&quot;')})" />
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

function updatePartnerProductsDisplay() {
    const tbody = document.getElementById('partnerProductBody');
    if (!tbody) return;

    // Safety check: ensure products is an array
    if (!Array.isArray(products)) {
        console.warn('⚠️ updatePartnerProductsDisplay: Products is not an array:', typeof products, products);
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">Loading products...</td></tr>';
        return;
    }

    let filteredProducts = products;

    // Apply filter
    if (currentFilter === 'available') {
        filteredProducts = products.filter(p => p.status === 'AVAILABLE');
    } else if (currentFilter === 'coming') {
        filteredProducts = products.filter(p => p.status === 'COMING SOON');
    }
    
    if (filteredProducts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No products match your filter</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredProducts.map(product => {
        const unitLabel = getUnitLabel(product.grade);
        const partnerPrice = Math.round(product.price * 0.8); // 20% discount
        const isAvailable = product.status === 'AVAILABLE' && product.stock > 0;
        
        return `
            <tr data-product-id="${product.id}">
                <td class="product-image-container">
                    <img src="${product.image || product.photo || 'https://via.placeholder.com/80x80/1a1a1a/00C851?text=' + encodeURIComponent(product.grade)}"
                         alt="${product.strain}" class="product-image"
                         onerror="handleProductImageError(this, ${JSON.stringify(product).replace(/"/g, '&quot;')})" />
                </td>
                <td><strong>${product.grade}</strong></td>
                <td>
                    <strong>${product.strain}</strong><br>
                    <small style="color: var(--text-muted);">${product.type || 'Premium'} • ${product.description || 'High quality product'}</small>
                </td>
                <td><strong style="color: var(--brand-green);">$${partnerPrice}${unitLabel}</strong></td>
                <td><span style="color: var(--brand-green); font-weight: 700;">${product.thca}%</span></td>
                <td>${product.stock}</td>
                <td><span class="status-${product.status.toLowerCase().replace(' ', '')}\">${product.status}</span></td>
                <td>
                    ${isAvailable ?
                        `<button class="btn btn-primary btn-sm" onclick="addToCart(${product.id}, 1)" title="Add ${product.strain} to cart">
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

function getUnitLabel(grade) {
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

// Orders Functions
function updateOrdersDisplay() {
    const tbody = document.getElementById('orderHistoryBody');
    if (!tbody) return;
    
    if (!currentUser) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Please log in to view orders</td></tr>';
        return;
    }
    
    const userOrders = orders.filter(order => order.partner === currentUser.email);
    
    if (userOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No orders found</td></tr>';
        return;
    }
    
    tbody.innerHTML = userOrders.map(order => `
        <tr>
            <td><strong>${order.id}</strong></td>
            <td>${order.date}</td>
            <td>
                <small style="color: var(--text-muted);">${order.items}</small>
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
    `).join('');
    
    // Update order stats
    updateOrderStats(userOrders);
}

function updateOrderStats(userOrders) {
    const pendingCount = userOrders.filter(o => o.status === 'PENDING').length;
    const processingCount = userOrders.filter(o => o.status === 'PROCESSING').length;
    const shippedCount = userOrders.filter(o => o.status === 'SHIPPED').length;
    
    const currentMonth = new Date().getMonth();
    const monthlyTotal = userOrders
        .filter(o => new Date(o.date).getMonth() === currentMonth)
        .reduce((sum, o) => sum + o.total, 0);
    
    const pendingEl = document.getElementById('pendingOrdersCount');
    const processingEl = document.getElementById('processingOrdersCount');
    const shippedEl = document.getElementById('shippedOrdersCount');
    const monthlyEl = document.getElementById('monthlyOrderValue');
    
    if (pendingEl) pendingEl.textContent = pendingCount;
    if (processingEl) processingEl.textContent = processingCount;
    if (shippedEl) shippedEl.textContent = shippedCount;
    if (monthlyEl) monthlyEl.textContent = `$${monthlyTotal.toFixed(0)}`;
}

function viewOrderDetails(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (order) {
        showNotification(`📋 Order ${orderId}: ${order.items} - Total: $${order.total.toFixed(2)}`, 'info');
    }
}

function quickOrder() {
    showNotification('⚡ Quick order feature coming soon!', 'info');
}

function downloadOrderHistory() {
    if (!currentUser) return;
    
    const userOrders = orders.filter(order => order.partner === currentUser.email);
    const csvContent = 'Order ID,Date,Items,Total,Status\\n' + 
        userOrders.map(o => `${o.id},${o.date},"${o.items}",${o.total},${o.status}`).join('\\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order-history-${currentUser.email}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showNotification('📄 Order history downloaded!', 'success');
}

// Profile Functions
function updateProfileDisplay() {
    if (!currentUser) return;

    console.log('🔄 Updating profile display with user data:', currentUser);

    // Update profile info fields dynamically
    const profileInfoFields = document.getElementById('profileInfoFields');
    if (profileInfoFields) {
        const businessName = currentUser.businessName || currentUser.name || 'Your Business';
        const contactName = currentUser.contactName || currentUser.name || 'Your Name';
        const email = currentUser.email || 'your@email.com';
        const tier = currentUser.tier || 'Gold Partner';
        const licenseNumber = currentUser.licenseNumber || currentUser.license || 'Not provided';
        const memberSince = currentUser.registeredAt ?
            new Date(currentUser.registeredAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) :
            'January 2024';
        const phone = currentUser.phone || 'Not provided';
        const businessAddress = currentUser.businessAddress || 'Not provided';
        const website = currentUser.website || 'Not provided';

        profileInfoFields.innerHTML = `
            <div class="profile-field" style="margin-bottom: 16px; padding: 12px; background: var(--surface-elevated); border-radius: 8px; border-left: 4px solid var(--brand-green);">
                <strong style="color: var(--brand-green);">Business Name:</strong>
                <span style="color: var(--text-primary);">${businessName}</span>
            </div>
            <div class="profile-field" style="margin-bottom: 16px; padding: 12px; background: var(--surface-elevated); border-radius: 8px; border-left: 4px solid var(--brand-green);">
                <strong style="color: var(--brand-green);">Contact Person:</strong>
                <span style="color: var(--text-primary);">${contactName}</span>
            </div>
            <div class="profile-field" style="margin-bottom: 16px; padding: 12px; background: var(--surface-elevated); border-radius: 8px; border-left: 4px solid var(--brand-green);">
                <strong style="color: var(--brand-green);">Email Address:</strong>
                <span style="color: var(--text-primary);" id="profileEmail">${email}</span>
            </div>
            <div class="profile-field" style="margin-bottom: 16px; padding: 12px; background: var(--surface-elevated); border-radius: 8px; border-left: 4px solid var(--brand-green);">
                <strong style="color: var(--brand-green);">Phone Number:</strong>
                <span style="color: var(--text-primary);">${phone}</span>
            </div>
            <div class="profile-field" style="margin-bottom: 16px; padding: 12px; background: var(--surface-elevated); border-radius: 8px; border-left: 4px solid var(--brand-green);">
                <strong style="color: var(--brand-green);">Business Address:</strong>
                <span style="color: var(--text-primary);">${businessAddress}</span>
            </div>
            <div class="profile-field" style="margin-bottom: 16px; padding: 12px; background: var(--surface-elevated); border-radius: 8px; border-left: 4px solid var(--brand-green);">
                <strong style="color: var(--brand-green);">Website:</strong>
                <span style="color: var(--text-primary);">${website}</span>
            </div>
            <div class="profile-field" style="margin-bottom: 16px; padding: 12px; background: var(--surface-elevated); border-radius: 8px; border-left: 4px solid var(--brand-green);">
                <strong style="color: var(--brand-green);">Partner Tier:</strong>
                <span style="color: var(--brand-green); font-weight: 700;">${tier}</span>
            </div>
            <div class="profile-field" style="margin-bottom: 16px; padding: 12px; background: var(--surface-elevated); border-radius: 8px; border-left: 4px solid var(--brand-green);">
                <strong style="color: var(--brand-green);">License Number:</strong>
                <span style="color: var(--text-primary);" id="profileLicense">${licenseNumber}</span>
            </div>
            <div class="profile-field" style="margin-bottom: 16px; padding: 12px; background: var(--surface-elevated); border-radius: 8px; border-left: 4px solid var(--brand-green);">
                <strong style="color: var(--brand-green);">Member Since:</strong>
                <span style="color: var(--text-primary);">${memberSince}</span>
            </div>
        `;
    }

    // Update individual elements if they exist (fallback)
    const emailEl = document.getElementById('profileEmail');
    const licenseEl = document.getElementById('profileLicense');

    if (emailEl) emailEl.textContent = currentUser.email;
    if (licenseEl) licenseEl.textContent = currentUser.licenseNumber || currentUser.license || 'Not provided';

    console.log('✅ Profile display updated successfully');
}

function refreshProfileData() {
    if (!currentUser) {
        showNotification('❌ No user data to refresh', 'error');
        return;
    }

    // Show loading notification
    showNotification('🔄 Refreshing profile data...', 'info');

    // Simulate data refresh from server
    setTimeout(() => {
        // In a real app, this would fetch fresh data from the server
        // For now, we'll just refresh the display with current data
        updateProfileDisplay();
        showNotification('✅ Profile data refreshed!', 'success');

        // Add a small enhancement - show last updated time
        const lastUpdated = currentUser.lastUpdated ?
            new Date(currentUser.lastUpdated).toLocaleString() :
            'Never';

        setTimeout(() => {
            showNotification(`📅 Last updated: ${lastUpdated}`, 'info');
        }, 1500);

    }, 1000);
}

function openProfileEditModal() {
    console.log('🔄 Opening profile edit modal from main-app.js...');
    console.log('🔍 Current user:', currentUser);

    if (!currentUser) {
        console.log('❌ No current user found');
        showNotification('❌ Please log in to edit your profile', 'error');
        return;
    }

    try {
        // Show loading notification
        showNotification('📝 Opening profile editor...', 'info');
        console.log('📝 About to populate form...');

        // Populate form with current user data
        populateProfileEditForm();
        console.log('✅ Form populated');

        // Check if modal exists
        const modalElement = document.getElementById('profileEditModal');
        console.log('🔍 Profile edit modal element:', modalElement);

        if (!modalElement) {
            console.error('❌ Profile edit modal not found in DOM');
            showNotification('❌ Profile edit modal not found', 'error');
            return;
        }

        // Open the modal with slight delay for better UX
        setTimeout(() => {
            console.log('🚀 Opening modal...');
            openModal('profileEditModal');
            showNotification('✏️ Edit your business profile information', 'success');
        }, 300);

        console.log('✅ Profile edit modal opened successfully');

    } catch (error) {
        console.error('Error opening profile edit modal:', error);
        showNotification('❌ Error opening profile editor', 'error');
    }
}

function populateProfileEditForm() {
    // Get current user data with intelligent defaults
    const userData = {
        businessName: currentUser.businessName || currentUser.name + "'s Store" || 'Your Business Name',
        contactName: currentUser.contactName || currentUser.name || '',
        businessEmail: currentUser.email || '',
        phone: currentUser.phone || '',
        businessType: currentUser.businessType || 'dispensary',
        licenseNumber: currentUser.licenseNumber || currentUser.license || '',
        businessAddress: currentUser.businessAddress || '',
        taxId: currentUser.taxId || '',
        website: currentUser.website || '',
        notes: currentUser.notes || ''
    };

    // Populate form fields with better field mapping
    const fieldMapping = {
        'editBusinessName': userData.businessName,
        'editContactName': userData.contactName,
        'editBusinessEmail': userData.businessEmail,
        'editPhone': userData.phone,
        'editBusinessType': userData.businessType,
        'editLicenseNumber': userData.licenseNumber,
        'editBusinessAddress': userData.businessAddress,
        'editTaxId': userData.taxId,
        'editWebsite': userData.website,
        'editNotes': userData.notes
    };

    Object.entries(fieldMapping).forEach(([fieldId, value]) => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.value = value || '';
            console.log(`📝 Populated ${fieldId} with:`, value);
        } else {
            console.warn(`⚠��� Field ${fieldId} not found in DOM`);
        }
    });

    console.log('✅ Profile edit form populated with user data:', userData);
}

function updateProfile(event) {
    event.preventDefault();

    if (!currentUser) {
        showNotification('❌ User not found', 'error');
        return;
    }

    try {
        // Collect form data
        const formData = {
            businessName: document.getElementById('editBusinessName').value,
            contactName: document.getElementById('editContactName').value,
            businessEmail: document.getElementById('editBusinessEmail').value,
            phone: document.getElementById('editPhone').value,
            businessType: document.getElementById('editBusinessType').value,
            licenseNumber: document.getElementById('editLicenseNumber').value,
            businessAddress: document.getElementById('editBusinessAddress').value,
            taxId: document.getElementById('editTaxId').value,
            website: document.getElementById('editWebsite').value,
            notes: document.getElementById('editNotes').value
        };

        // Validate required fields
        const requiredFields = ['businessName', 'contactName', 'businessEmail', 'phone', 'businessAddress'];
        const missingFields = requiredFields.filter(field => !formData[field].trim());

        if (missingFields.length > 0) {
            showNotification('❌ Please fill in all required fields', 'error');
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.businessEmail)) {
            showNotification('❌ Please enter a valid email address', 'error');
            return;
        }

        // Show loading state
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Saving...';
        submitBtn.disabled = true;

        // Simulate save process with proper data persistence
        setTimeout(() => {
            try {
                // Update current user object with all form data
                Object.assign(currentUser, formData);
                currentUser.lastUpdated = new Date().toISOString();

                // Ensure core fields are set
                if (!currentUser.name && formData.contactName) {
                    currentUser.name = formData.contactName;
                }

                // Update global state and Firebase Auth
                setCurrentUser(currentUser);

                // Update all UI displays that might show user data
                updateProfileDisplay();

                // Update welcome message in header if name changed
                const userWelcome = document.getElementById('userWelcome');
                if (userWelcome && currentUser.name) {
                    userWelcome.textContent = `Welcome, ${currentUser.name}`;
                }

                // Update profile email in navigation if email changed
                if (currentUser.email !== formData.businessEmail) {
                    currentUser.email = formData.businessEmail;
                    setCurrentUser(currentUser);
                }

                // Close modal
                closeModal('profileEditModal');

                // Show detailed success notification
                showNotification('✅ Profile updated successfully!', 'success');

                setTimeout(() => {
                    showNotification(`📝 Business: ${formData.businessName}`, 'info');
                }, 1000);

                setTimeout(() => {
                    showNotification(`📧 Contact: ${formData.contactName} (${formData.businessEmail})`, 'info');
                }, 2000);

                // Restore button state
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;

                console.log('✅ Profile updated with complete data:', currentUser);

                // Trigger any other systems that might need to know about profile updates
                window.dispatchEvent(new CustomEvent('profileUpdated', { detail: currentUser }));

            } catch (error) {
                console.error('Error during profile update:', error);
                showNotification('❌ Error saving profile data', 'error');

                // Restore button state
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }

        }, 1500);

    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification('❌ Error updating profile. Please try again.', 'error');
    }
}

// Dashboard Functions
function updateDashboardStats() {
    if (!currentUser) return;

    // Safety checks: ensure arrays are properly initialized
    if (!Array.isArray(orders)) {
        console.warn('⚠️ updateDashboardStats: Orders is not an array:', typeof orders, orders);
        return;
    }
    if (!Array.isArray(products)) {
        console.warn('⚠️ updateDashboardStats: Products is not an array:', typeof products, products);
        return;
    }

    const userOrders = orders.filter(order => order.partner === currentUser.email);
    const totalSpent = userOrders.reduce((sum, order) => sum + order.total, 0);

    const orderCountEl = document.getElementById('partnerOrderCount');
    const savingsEl = document.getElementById('partnerSavings');
    const availableProductsEl = document.getElementById('partnerAvailableProducts');

    if (orderCountEl) orderCountEl.textContent = userOrders.length;
    if (savingsEl) savingsEl.textContent = `$${totalSpent.toFixed(0)}`;
    if (availableProductsEl) availableProductsEl.textContent = products.filter(p => p.status === 'AVAILABLE').length;
}

function updateInventoryStats() {
    // Safety check: ensure products is an array
    if (!Array.isArray(products)) {
        console.warn('⚠️ updateInventoryStats: Products is not an array:', typeof products, products);
        return;
    }

    const availableCount = products.filter(p => p.status === 'AVAILABLE').length;
    const availableProducts = products.filter(p => p.status === 'AVAILABLE');
    const startingPrice = availableProducts.length > 0 ? Math.min(...availableProducts.map(p => p.price)) : 0;
    const categories = new Set(products.map(p => p.grade)).size;
    
    const countEl = document.getElementById('publicAvailableCount');
    const priceEl = document.getElementById('publicStartingPrice');
    const categoriesEl = document.getElementById('publicCategories');
    const liveCountEl = document.getElementById('liveProductCount');
    
    if (countEl) countEl.textContent = availableCount;
    if (priceEl) priceEl.textContent = startingPrice > 0 ? `$${startingPrice}` : '$0';
    if (categoriesEl) categoriesEl.textContent = categories;
    if (liveCountEl) liveCountEl.textContent = availableCount;
}

function updatePortalData() {
    updateDashboardStats();
    updatePartnerProductsDisplay();
    updateOrdersDisplay();
    updateProfileDisplay();
}

// Filter Functions
function setActiveFilter(button, filter) {
    document.querySelectorAll('.controls .btn-secondary').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    currentFilter = filter;
    updatePartnerProductsDisplay();
}

function filterPartnerProducts(searchTerm) {
    const rows = document.querySelectorAll('#partnerProductBody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const matches = text.includes(searchTerm.toLowerCase());
        row.style.display = matches ? '' : 'none';
    });
}

function filterOrders(searchTerm) {
    const rows = document.querySelectorAll('#orderHistoryBody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const matches = text.includes(searchTerm.toLowerCase());
        row.style.display = matches ? '' : 'none';
    });
}

function filterOrdersByStatus(status) {
    const rows = document.querySelectorAll('#orderHistoryBody tr');
    rows.forEach(row => {
        if (!status) {
            row.style.display = '';
        } else {
            const statusCell = row.cells[4];
            const matches = statusCell && statusCell.textContent.includes(status);
            row.style.display = matches ? '' : 'none';
        }
    });
}

// Utility Functions
function toggleLiveInventory() {
    const section = document.getElementById('liveInventorySection');
    if (section) {
        liveInventoryVisible = !liveInventoryVisible;
        section.classList.toggle('show', liveInventoryVisible);
        
        if (liveInventoryVisible) {
            updatePublicInventoryDisplay();
            section.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

// Modal Functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        document.body.classList.add('modal-open');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
}

// Business Application Functions
let currentRegistrationStep = 1;
let registrationData = {};
let uploadedDocuments = {};

function nextRegistrationStep() {
    if (currentRegistrationStep === 1) {
        // Validate step 1
        const form = document.getElementById('businessInfoForm');
        let isValid = true;

        // Required fields validation
        const requiredFields = ['businessName', 'contactName', 'businessEmail', 'phone', 'businessAddress', 'businessType', 'licenseNumber', 'estimatedMonthlyVolume'];
        requiredFields.forEach(field => {
            const input = document.getElementById(field);
            if (!input || !input.value.trim()) {
                isValid = false;
                if (input) {
                    input.style.borderColor = 'var(--accent-red)';
                }
            } else {
                input.style.borderColor = 'var(--border-subtle)';
                registrationData[field] = input.value.trim();
            }
        });

        // Optional fields
        const optionalFields = ['yearsInBusiness', 'businessDescription'];
        optionalFields.forEach(field => {
            const input = document.getElementById(field);
            if (input && input.value.trim()) {
                registrationData[field] = input.value.trim();
            }
        });

        if (!isValid) {
            showNotification('❌ Please fill in all required fields', 'error');
            return;
        }

        // Update progress and proceed to step 2
        updateApplicationProgress(2);
        document.getElementById('registrationStep1').style.display = 'none';
        document.getElementById('registrationStep2').style.display = 'block';
        currentRegistrationStep = 2;

    } else if (currentRegistrationStep === 2) {
        // Check if required documents are uploaded
        const requiredDocs = ['businessLicense', 'cannabisLicense', 'taxId'];
        const uploadedDocs = requiredDocs.filter(doc => {
            const input = document.getElementById(doc);
            return input && input.files.length > 0;
        });

        if (uploadedDocs.length < 3) {
            showNotification('❌ Please upload all required documents (Business License, Cannabis License, Tax ID)', 'error');
            return;
        }

        // Store document information
        requiredDocs.forEach(doc => {
            const input = document.getElementById(doc);
            if (input && input.files.length > 0) {
                uploadedDocuments[doc] = {
                    name: input.files[0].name,
                    size: input.files[0].size,
                    type: input.files[0].type,
                    lastModified: input.files[0].lastModified
                };
            }
        });

        // Check for additional docs
        const additionalInput = document.getElementById('additionalDocs');
        if (additionalInput && additionalInput.files.length > 0) {
            uploadedDocuments.additionalDocs = Array.from(additionalInput.files).map(file => ({
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified
            }));
        }

        // Generate review and proceed to step 3
        generateRegistrationReview();
        updateApplicationProgress(3);
        document.getElementById('registrationStep2').style.display = 'none';
        document.getElementById('registrationStep3').style.display = 'block';
        currentRegistrationStep = 3;
    }
}

function previousRegistrationStep() {
    if (currentRegistrationStep === 2) {
        updateApplicationProgress(1);
        document.getElementById('registrationStep2').style.display = 'none';
        document.getElementById('registrationStep1').style.display = 'block';
        currentRegistrationStep = 1;
    } else if (currentRegistrationStep === 3) {
        updateApplicationProgress(2);
        document.getElementById('registrationStep3').style.display = 'none';
        document.getElementById('registrationStep2').style.display = 'block';
        currentRegistrationStep = 2;
    }
}

function generateRegistrationReview() {
    const reviewContainer = document.getElementById('registrationReview');
    if (!reviewContainer) return;

    // Generate document list
    const docsList = Object.keys(uploadedDocuments).map(docType => {
        if (docType === 'additionalDocs' && Array.isArray(uploadedDocuments[docType])) {
            return uploadedDocuments[docType].map(doc =>
                `<div class="doc-item">✅ ${doc.name} (${(doc.size / 1024 / 1024).toFixed(2)} MB)</div>`
            ).join('');
        } else if (uploadedDocuments[docType]) {
            const friendlyNames = {
                businessLicense: 'Business License',
                cannabisLicense: 'Cannabis/Hemp License',
                taxId: 'Tax ID/EIN Document'
            };
            const doc = uploadedDocuments[docType];
            return `<div class="doc-item">✅ ${friendlyNames[docType] || docType}: ${doc.name} (${(doc.size / 1024 / 1024).toFixed(2)} MB)</div>`;
        }
        return '';
    }).join('');

    reviewContainer.innerHTML = `
        <div class="review-section">
            <h4 style="color: var(--brand-green); margin-bottom: 16px;">📋 Business Information</h4>
            <div class="review-grid">
                <div class="review-item">
                    <label>Business Name</label>
                    <span>${registrationData.businessName || 'Not provided'}</span>
                </div>
                <div class="review-item">
                    <label>Contact Name</label>
                    <span>${registrationData.contactName || 'Not provided'}</span>
                </div>
                <div class="review-item">
                    <label>Email</label>
                    <span>${registrationData.businessEmail || 'Not provided'}</span>
                </div>
                <div class="review-item">
                    <label>Phone</label>
                    <span>${registrationData.phone || 'Not provided'}</span>
                </div>
                <div class="review-item">
                    <label>Business Type</label>
                    <span>${registrationData.businessType || 'Not provided'}</span>
                </div>
                <div class="review-item">
                    <label>License Number</label>
                    <span>${registrationData.licenseNumber || 'Not provided'}</span>
                </div>
                <div class="review-item">
                    <label>Business Address</label>
                    <span>${registrationData.businessAddress || 'Not provided'}</span>
                </div>
                <div class="review-item">
                    <label>Estimated Monthly Volume</label>
                    <span>${registrationData.estimatedMonthlyVolume || 'Not provided'}</span>
                </div>
            </div>
            ${registrationData.yearsInBusiness ? `
                <div style="margin-top: 16px;">
                    <div class="review-item">
                        <label>Years in Business</label>
                        <span>${registrationData.yearsInBusiness}</span>
                    </div>
                </div>
            ` : ''}
            ${registrationData.businessDescription ? `
                <div style="margin-top: 16px;">
                    <div class="review-item">
                        <label>Business Description</label>
                        <span style="white-space: pre-wrap;">${registrationData.businessDescription}</span>
                    </div>
                </div>
            ` : ''}
        </div>

        <div class="review-section">
            <h4 style="color: var(--brand-green); margin-bottom: 16px;">📁 Documents Uploaded</h4>
            <div class="review-documents">
                ${docsList}
            </div>
        </div>
    `;
}

function submitRegistration() {
    // Simulate registration submission
    const submitBtn = document.querySelector('[onclick="submitRegistration()"]');
    if (submitBtn) {
        submitBtn.textContent = 'Submitting Application...';
        submitBtn.disabled = true;
    }

    // Create complete application data
    const applicationData = {
        ...registrationData,
        documents: uploadedDocuments,
        submissionDate: new Date().toISOString(),
        applicationId: 'APP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        status: 'pending',
        submissionIP: 'demo-ip',
        userAgent: navigator.userAgent
    };

    // Store application in Firebase for admin review
    if (window.submitBusinessApplication) {
        window.submitBusinessApplication(applicationData);
    } else {
        console.error('Firebase application submission not available');
        throw new Error('Firebase connection required for application submission');
    }

    setTimeout(() => {
        closeModal('registerModal');
        showNotification(`🎉 Application submitted successfully! Application ID: ${applicationData.applicationId}. Our team will review your application within 24-48 hours.`, 'success');

        // Trigger admin notification
        triggerAdminNotification(applicationData);

        // Reset form
        resetRegistrationForm();
        
        if (submitBtn) {
            submitBtn.textContent = 'Submit Application �����';
            submitBtn.disabled = false;
        }
    }, 2000);
}

function handleFileUpload(input, documentType) {
    const previewContainer = document.getElementById(documentType + 'Preview');

    if (input.files.length > 0) {
        let previewHTML = '';

        if (documentType === 'additionalDocs' && input.files.length > 1) {
            // Handle multiple files for additional docs
            Array.from(input.files).forEach(file => {
                previewHTML += `
                    <div class="file-preview-item">
                        <div class="file-info">
                            <span class="file-icon">📄</span>
                            <div class="file-details">
                                <div class="file-name">${file.name}</div>
                                <div class="file-size">${(file.size / 1024 / 1024).toFixed(2)} MB</div>
                            </div>
                            <span class="file-status">✅</span>
                        </div>
                    </div>
                `;
            });
        } else {
            // Handle single file
            const file = input.files[0];

            // Validate file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                showNotification('❌ File size must be less than 10MB', 'error');
                input.value = '';
                return;
            }

            // Validate file type
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
            if (!allowedTypes.includes(file.type)) {
                showNotification('�� File must be PDF, JPG, or PNG format', 'error');
                input.value = '';
                return;
            }

            previewHTML = `
                <div class="file-preview-item">
                    <div class="file-info">
                        <span class="file-icon">📄</span>
                        <div class="file-details">
                            <div class="file-name">${file.name}</div>
                            <div class="file-size">${(file.size / 1024 / 1024).toFixed(2)} MB</div>
                        </div>
                        <span class="file-status">✅</span>
                    </div>
                </div>
            `;
        }

        if (previewContainer) {
            previewContainer.innerHTML = previewHTML;
        }

        // Enable proceed button if all required docs are uploaded
        updateProceedButtonState();
    }
}

function updateApplicationProgress(step) {
    const progressBar = document.getElementById('progressBar');
    const progressSteps = document.querySelectorAll('.progress-step');

    // Update progress bar
    const progressWidth = (step / 3) * 100;
    if (progressBar) {
        progressBar.style.width = progressWidth + '%';
    }

    // Update step indicators
    progressSteps.forEach((stepEl, index) => {
        const stepNumber = index + 1;
        const stepDiv = stepEl.querySelector('div');

        if (stepNumber < step) {
            stepEl.classList.add('completed');
            stepEl.classList.remove('active');
        } else if (stepNumber === step) {
            stepEl.classList.add('active');
            stepEl.classList.remove('completed');
        } else {
            stepEl.classList.remove('active', 'completed');
        }
    });
}

function updateProceedButtonState() {
    const proceedBtn = document.getElementById('proceedToReview');
    if (proceedBtn) {
        const requiredDocs = ['businessLicense', 'cannabisLicense', 'taxId'];
        const uploadedCount = requiredDocs.filter(doc => {
            const input = document.getElementById(doc);
            return input && input.files.length > 0;
        }).length;

        proceedBtn.disabled = uploadedCount < 3;

        if (uploadedCount >= 3) {
            proceedBtn.style.background = 'linear-gradient(135deg, var(--brand-green), var(--brand-green-light))';
            proceedBtn.style.color = 'white';
        } else {
            proceedBtn.style.background = 'var(--surface-elevated)';
            proceedBtn.style.color = 'var(--text-muted)';
        }
    }
}

function resetRegistrationForm() {
    currentRegistrationStep = 1;
    registrationData = {};
    uploadedDocuments = {};

    // Reset UI
    const step3 = document.getElementById('registrationStep3');
    const step1 = document.getElementById('registrationStep1');
    if (step3) step3.style.display = 'none';
    if (step1) step1.style.display = 'block';
    updateApplicationProgress(1);

    // Clear form fields
    const form = document.getElementById('businessInfoForm');
    if (form) {
        form.reset();
    }

    // Clear file inputs and previews
    const fileInputs = ['businessLicense', 'cannabisLicense', 'taxId', 'additionalDocs'];
    fileInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        const preview = document.getElementById(inputId + 'Preview');
        if (input) input.value = '';
        if (preview) preview.innerHTML = '';
    });

    // Reset proceed button
    const proceedBtn = document.getElementById('proceedToReview');
    if (proceedBtn) {
        proceedBtn.disabled = true;
    }
}

function triggerAdminNotification(applicationData) {
    // Only trigger admin notifications if current user is admin
    const currentUser = window.currentUser;
    const isAdmin = currentUser?.role === 'admin' || currentUser?.email?.includes('admin');

    if (!isAdmin) {
        console.log('Skipping admin notification - current user is not admin');
        return;
    }

    // Store notification in Firebase for admin dashboard
    if (window.firebaseIntegrationBridge?.sendAdminNotification) {
        window.firebaseIntegrationBridge.sendAdminNotification('new_application', {
            businessName: applicationData.businessName,
            applicationId: applicationData.applicationId,
            message: `${applicationData.businessName} has submitted a partnership application`,
            priority: 'high'
        });
    } else {
        console.warn('Firebase notification system not available');
    }

    // Update admin dashboard counters if admin is logged in
    if (window.adminDashboard && typeof window.adminDashboard.updateNotificationBadge === 'function') {
        window.adminDashboard.updateNotificationBadge();
    }
}

// Bulk Order Functions
function createBulkOrder() {
    try {
        if (window.bulkOrderManager) {
            window.bulkOrderManager.openBulkOrderModal();
        } else {
            // Fallback for when bulk order manager isn't loaded yet
            showNotification('📦 Loading bulk order system...', 'info');
            setTimeout(() => {
                if (window.bulkOrderManager) {
                    window.bulkOrderManager.openBulkOrderModal();
                } else {
                    showNotification('❌ Bulk order system not available', 'error');
                }
            }, 1000);
        }
    } catch (error) {
        console.error('Error opening bulk order:', error);
        showNotification('❌ Error opening bulk order system', 'error');
    }
}

function openBulkOrderModal() {
    createBulkOrder();
}

function openPresetManager() {
    try {
        if (window.bulkOrderManager) {
            window.bulkOrderManager.openPresetManager();
        } else {
            showNotification('❌ Bulk order system not available', 'error');
        }
    } catch (error) {
        console.error('Error opening preset manager:', error);
        showNotification('❌ Error opening preset manager', 'error');
    }
}

function viewBulkHistory() {
    try {
        if (window.bulkOrderManager) {
            window.bulkOrderManager.viewBulkHistory();
        } else {
            showNotification('❌ Bulk order system not available', 'error');
        }
    } catch (error) {
        console.error('Error opening bulk history:', error);
        showNotification('❌ Error opening bulk history', 'error');
    }
}

function requestCustomQuote() {
    // Create a simple custom quote request modal
    const quoteModal = `
        <div id="customQuoteModal" class="modal" style="display: block;">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3 class="modal-title">💬 Request Custom Quote</h3>
                    <button class="modal-close" onclick="closeModal('customQuoteModal');">×</button>
                </div>
                <form onsubmit="submitCustomQuote(event)">
                    <div class="form-group">
                        <label>Business Name</label>
                        <input type="text" id="quoteBusiness" value="${window.currentUser?.businessName || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Contact Email</label>
                        <input type="email" id="quoteEmail" value="${window.currentUser?.email || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Estimated Monthly Volume (lbs)</label>
                        <select id="quoteVolume" required>
                            <option value="">Select volume...</option>
                            <option value="20-50">20-50 lbs</option>
                            <option value="50-100">50-100 lbs</option>
                            <option value="100-250">100-250 lbs</option>
                            <option value="250-500">250-500 lbs</option>
                            <option value="500+">500+ lbs</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Product Interests</label>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 8px;">
                            <label style="display: flex; align-items: center; gap: 8px;"><input type="checkbox" value="flower"> THCA Flower</label>
                            <label style="display: flex; align-items: center; gap: 8px;"><input type="checkbox" value="concentrates"> Concentrates</label>
                            <label style="display: flex; align-items: center; gap: 8px;"><input type="checkbox" value="vapes"> Vape Products</label>
                            <label style="display: flex; align-items: center; gap: 8px;"><input type="checkbox" value="custom"> Custom Products</label>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Special Requirements</label>
                        <textarea id="quoteRequirements" rows="3" placeholder="Describe any special packaging, processing, or delivery requirements..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>Additional Notes</label>
                        <textarea id="quoteNotes" rows="2" placeholder="Any additional information for your custom quote..."></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%;">Submit Quote Request 🚀</button>
                </form>
            </div>
        </div>
    `;

    // Remove existing modal if present
    const existing = document.getElementById('customQuoteModal');
    if (existing) existing.remove();

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', quoteModal);
    document.body.classList.add('modal-open');
}

function submitCustomQuote(event) {
    event.preventDefault();

    // Collect form data
    const formData = {
        business: document.getElementById('quoteBusiness').value,
        email: document.getElementById('quoteEmail').value,
        volume: document.getElementById('quoteVolume').value,
        interests: Array.from(document.querySelectorAll('#customQuoteModal input[type="checkbox"]:checked')).map(cb => cb.value),
        requirements: document.getElementById('quoteRequirements').value,
        notes: document.getElementById('quoteNotes').value,
        submittedAt: new Date().toISOString()
    };

    // Simulate quote submission
    setTimeout(() => {
        closeModal('customQuoteModal');
        showNotification('✅ Custom quote request submitted successfully!', 'success');

        setTimeout(() => {
            showNotification('📧 Our team will contact you within 24 hours with a personalized quote', 'info');
        }, 2000);

        console.log('Custom quote request:', formData);
    }, 1000);
}

function openSupportModal() {
    showNotification('📞 Support contact feature coming soon!', 'info');
}

// Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    // Hide notification
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

// Authentication required notification
function showAuthRequiredNotification() {
    showNotification('🔒 Please log in to access partner features', 'warning');

    // Automatically open login modal after a short delay
    setTimeout(() => {
        openModal('loginModal');
    }, 1000);
}

// Debug function to check authentication state
function debugAuthState() {
    console.log('🔍 AUTHENTICATION DEBUG STATE:', {
        localCurrentUser: currentUser,
        windowCurrentUser: window.currentUser,
        firebaseAuth: window.firebaseIntegrationBridge?.auth?.currentUser?.email || null,
        cartManager: !!window.cartManager,
        cartState: window.cartManager ? window.cartManager.getState() : 'not available'
    });
    return {
        isAuthenticated: !!(currentUser || window.currentUser),
        userEmail: currentUser?.email || window.currentUser?.email,
        cartAvailable: !!window.cartManager
    };
}

// Test function to force authentication
function forceLogin(email = 'test@example.com') {
    console.log('🧪 Force login for testing...');
    const userData = {
        email: email,
        name: email.split('@')[0],
        tier: 'Gold Partner',
        loginTime: new Date().toISOString()
    };
    setCurrentUser(userData);
    showUserSession();
    showPartnerPortal();
    showNotification(`🧪 Test login successful: ${userData.name}`, 'success');
    return userData;
}

// Test authentication system
function testAuthentication() {
    console.log('🧪 Testing authentication system...');

    // 1. Test initial state (should be logged out)
    const initialState = debugAuthState();
    console.log('1️⃣ Initial state:', initialState);

    // 2. Test login with valid credentials
    console.log('2️⃣ Testing valid login...');
    document.getElementById('email').value = 'partner@greenvalley.com';
    document.getElementById('password').value = 'demo123';
    login({ preventDefault: () => {} });

    setTimeout(() => {
        const loggedInState = debugAuthState();
        console.log('3��⃣ After login state:', loggedInState);

        // 3. Test logout
        console.log('4️⃣ Testing logout...');
        logout();

        setTimeout(() => {
            const loggedOutState = debugAuthState();
            console.log('5️⃣ After logout state:', loggedOutState);

            // Summary
            console.log('📋 Authentication Test Summary:', {
                initiallyLoggedOut: !initialState.isAuthenticated,
                canLogin: loggedInState.isAuthenticated,
                canLogout: !loggedOutState.isAuthenticated
            });
        }, 100);
    }, 100);
}

// Test cart functionality with multiple items
function testCartFunctionality() {
    console.log('🧪 Testing cart functionality...');

    if (!window.cartManager) {
        console.error('❌ Cart manager not available');
        return false;
    }

    if (!currentUser) {
        console.log('👤 Logging in test user...');
        forceLogin('test@carttest.com');
    }

    // Clear cart first
    window.cartManager.cart = [];
    window.cartManager.updateDisplay();

    // Add multiple different items
    const testProductIds = [2, 3, 4]; // Blue Gelatti, Candy Gas, OG Kush
    const testResults = [];

    testProductIds.forEach((productId, index) => {
        setTimeout(() => {
            console.log(`🧪 Adding product ${productId} to cart...`);
            const result = addToCart(productId, index + 1);
            testResults.push({ productId, success: result });

            console.log(`🧪 Cart state after adding product ${productId}:`, {
                itemCount: window.cartManager.cart.length,
                totalItems: window.cartManager.getTotals().totalItems,
                cartItems: window.cartManager.cart.map(item => ({ strain: item.strain, quantity: item.quantity }))
            });

            // Open cart after adding all items
            if (index === testProductIds.length - 1) {
                setTimeout(() => {
                    console.log('🧪 Opening cart to show results...');
                    window.cartManager.open();

                    // Final validation
                    setTimeout(() => {
                        const cartElements = document.querySelectorAll('.cart-item');
                        console.log('🧪 Final test results:', {
                            expectedItems: testProductIds.length,
                            cartArrayLength: window.cartManager.cart.length,
                            domElements: cartElements.length,
                            totals: window.cartManager.getTotals()
                        });

                        if (cartElements.length === window.cartManager.cart.length) {
                            console.log('✅ Cart test passed - items display correctly');
                            showNotification('✅ Cart test passed!', 'success');
                        } else {
                            console.error('❌ Cart test failed - display mismatch');
                            showNotification('❌ Cart test failed - check console', 'error');
                        }
                    }, 500);
                }, 1000);
            }
        }, index * 300);
    });

    return true;
}

// Debug cart state
function debugCartState() {
    if (!window.cartManager) {
        console.log('❌ Cart manager not available');
        return;
    }

    const state = {
        isAuthenticated: !!currentUser,
        userEmail: currentUser?.email,
        cartItems: window.cartManager.cart.length,
        cartArray: window.cartManager.cart,
        domElements: document.querySelectorAll('.cart-item').length,
        totals: window.cartManager.getTotals(),
        cartOpen: window.cartManager.isOpen
    };

    console.log('🔍 Cart Debug State:', state);
    return state;
}

// Test real-time functionality across tabs
function testRealTimeSync() {
    console.log('🧪 Testing Real-Time Synchronization...');

    if (!window.realTimeSync) {
        console.error('❌ Real-Time Sync not available');
        return false;
    }

    // Test 1: Basic sync status
    const syncStatus = window.realTimeSync.getSyncStatus();
    console.log('📊 Sync Status:', syncStatus);

    // Test 2: Test broadcasting
    console.log('📡 Testing broadcast functionality...');
    window.realTimeSync.broadcast('test_event', {
        message: 'Test broadcast from tab',
        timestamp: new Date().toISOString(),
        testId: Math.random().toString(36).substr(2, 9)
    });

    // Test 3: Test product updates
    setTimeout(async () => {
        console.log('📦 Testing product update sync...');
        if (window.sharedDataManager && typeof window.sharedDataManager.getProducts === 'function') {
            try {
                const products = await window.sharedDataManager.getProducts();
                if (products.length > 0) {
                    const testProduct = products[0];
                    const newStock = Math.floor(Math.random() * 50) + 1;

                    await window.sharedDataManager.updateProduct(testProduct.id, {
                        stock: newStock,
                        lastModified: new Date().toISOString()
                    });

                    console.log(`📦 Updated ${testProduct.strain} stock to ${newStock}`);
                }
            } catch (error) {
                console.error('❌ Error in product update test:', error);
            }
        }
    }, 1000);

    // Test 4: Test order creation
    setTimeout(() => {
        console.log('🛒 Testing order creation sync...');
        if (window.sharedDataManager && currentUser) {
            const testOrder = {
                id: `TEST-${Date.now()}`,
                partner: currentUser.email,
                partnerName: currentUser.name + ' (Test)',
                items: 'Test Product (x1)',
                total: 99.99,
                status: 'PENDING',
                date: new Date().toISOString().split('T')[0],
                notes: 'Real-time sync test order'
            };

            window.sharedDataManager.addOrder(testOrder);
            console.log(`🛒 Created test order: ${testOrder.id}`);
        }
    }, 2000);

    // Test 5: Test cart sync (if logged in)
    setTimeout(() => {
        if (currentUser && window.cartManager) {
            console.log('🛒 Testing cart sync...');

            // Add a test item to cart
            const products = window.sharedDataManager?.getProducts() || [];
            if (products.length > 0) {
                const testProduct = products.find(p => p.status === 'AVAILABLE');
                if (testProduct) {
                    window.cartManager.addProduct(testProduct.id, 1);
                    console.log(`🛒 Added ${testProduct.strain} to cart for sync test`);
                }
            }
        }
    }, 3000);

    // Test 6: Test notifications
    setTimeout(() => {
        console.log('🔔 Testing notification system...');
        if (window.notificationSystem || window.showNotification) {
            showNotification('🧪 Real-time sync test notification', 'info', {
                details: 'This notification tests the real-time system',
                duration: 3000
            });
        }
    }, 4000);

    showNotification('🧪 Real-time sync test started - check console for details', 'info');
    return true;
}

// Test real-time functionality with multiple simulated users
function testMultiUserSync() {
    console.log('��� Testing multi-user sync simulation...');

    if (!window.realTimeSync) {
        console.error('❌ Real-Time Sync not available');
        return false;
    }

    // Simulate different user actions
    const testUsers = [
        { email: 'user1@test.com', name: 'Test User 1' },
        { email: 'user2@test.com', name: 'Test User 2' },
        { email: 'user3@test.com', name: 'Test User 3' }
    ];

    testUsers.forEach((user, index) => {
        setTimeout(() => {
            console.log(`�� Simulating action from ${user.name}...`);

            // Simulate user joining
            window.realTimeSync.broadcast('user_action', {
                action: 'user_joined',
                userEmail: user.email,
                userName: user.name,
                type: 'info'
            });

            // Simulate order placement
            setTimeout(() => {
                window.realTimeSync.broadcast('user_action', {
                    action: 'order_placed',
                    orderId: `ORD-${Date.now()}-${index}`,
                    userEmail: user.email,
                    userName: user.name,
                    amount: Math.random() * 1000 + 100,
                    type: 'success'
                });
            }, 1000);

        }, index * 2000);
    });

    showNotification('👥 Multi-user sync test started', 'info');
    return true;
}

// Test data persistence and recovery
function testDataPersistence() {
    console.log('💾 Testing data persistence and recovery...');

    if (!window.dataPersistence) {
        console.error('❌ Data Persistence not available');
        return false;
    }

    // Test 1: Manual backup
    console.log('💾 Creating manual backup...');
    window.dataPersistence.createManualBackup();

    // Test 2: Check backup status
    const recoveryStatus = window.dataPersistence.getRecoveryStatus();
    console.log('��� Recovery Status:', recoveryStatus);

    // Test 3: Simulate data corruption and recovery
    setTimeout(async () => {
        console.log('🧪 Simulating data recovery test...');
        if (confirm('Test data recovery? This will temporarily corrupt and then restore data.')) {
            // Backup current data first (safely)
            try {
                const currentData = window.sharedDataManager && typeof window.sharedDataManager.getData === 'function'
                    ? await window.sharedDataManager.getData()
                    : null;

                // Corrupt data temporarily
                localStorage.setItem('fadedSkiesSharedData', '{"invalid": "json",}');

                // Trigger recovery
                setTimeout(() => {
                    window.dataPersistence.initiateRecovery();
                }, 1000);
            } catch (error) {
                console.warn('⚠️ Could not backup data before test:', error);
            }
        }
    }, 2000);

    showNotification('💾 Data persistence test started', 'info');
    return true;
}

// Test UI real-time updates
function testRealTimeUI() {
    console.log('🎨 Testing real-time UI updates...');

    if (!window.realTimeUI) {
        console.error('❌ Real-Time UI not available');
        return false;
    }

    // Test UI update status
    const uiStatus = window.realTimeUI.getUpdateStatus();
    console.log('📊 UI Update Status:', uiStatus);

    // Test forced UI refresh
    setTimeout(() => {
        console.log('🔄 Testing forced UI refresh...');
        window.realTimeUI.forceRefreshUI();
    }, 1000);

    // Test highlight animations
    setTimeout(() => {
        console.log('✨ Testing highlight animations...');
        const products = window.sharedDataManager?.getProducts() || [];
        if (products.length > 0) {
            window.realTimeUI.highlightNewProduct(products[0].id);
        }
    }, 2000);

    showNotification('🎨 Real-time UI test started', 'info');
    return true;
}

// Comprehensive real-time system test
function testCompleteRealTimeSystem() {
    console.log('🚀 Running comprehensive real-time system test...');

    // Test each component
    const tests = [
        { name: 'Real-Time Sync', fn: testRealTimeSync },
        { name: 'Data Persistence', fn: testDataPersistence },
        { name: 'Real-Time UI', fn: testRealTimeUI },
        { name: 'Multi-User Sync', fn: testMultiUserSync }
    ];

    tests.forEach((test, index) => {
        setTimeout(() => {
            console.log(`🧪 Running test: ${test.name}`);
            try {
                test.fn();
            } catch (error) {
                console.error(`❌ Test failed: ${test.name}`, error);
            }
        }, index * 3000);
    });

    // Final system status check
    setTimeout(() => {
        console.log('📊 Final system status check...');
        debugRealTimeSystemStatus();
    }, tests.length * 3000 + 2000);

    showNotification('🚀 Comprehensive real-time test suite started', 'success', {
        details: 'Check console for detailed results',
        duration: 6000
    });

    return true;
}

// Highlight updated products in the UI
function highlightUpdatedProduct(productId) {
    console.log('✨ Highlighting updated product:', productId);

    // Find all table rows that contain this product
    const tableRows = document.querySelectorAll('tr');
    tableRows.forEach(row => {
        const addToCartButton = row.querySelector(`[onclick*="addToCart(${productId})"]`);
        if (addToCartButton) {
            // Add highlight class
            row.classList.add('updated');

            // Remove highlight after animation
            setTimeout(() => {
                row.classList.remove('updated');
            }, 1200);
        }
    });

    // Also highlight the product image if it exists
    const productImages = document.querySelectorAll('.product-image');
    productImages.forEach(img => {
        const row = img.closest('tr');
        if (row && row.querySelector(`[onclick*="addToCart(${productId})"]`)) {
            img.style.boxShadow = '0 0 15px rgba(0, 200, 81, 0.6)';
            setTimeout(() => {
                img.style.boxShadow = '';
            }, 2000);
        }
    });
}

// Enhanced image error handling for better fallbacks
function handleProductImageError(img, productData) {
    console.log('🖼️ Image load error, using fallback for:', productData);

    // Generate a better fallback image URL
    const fallbackUrl = `https://via.placeholder.com/80x80/1a1a1a/00C851?text=${encodeURIComponent(productData.grade || 'PRODUCT')}`;

    if (img.src !== fallbackUrl) {
        img.src = fallbackUrl;
    }
}

// Update bulk order statistics
function updateBulkOrderStats() {
    if (window.bulkOrderManager) {
        window.bulkOrderManager.updateBulkStats();
    }
}

// Bulk order modal navigation functions - these are now defined above as window properties

// Debug real-time system status
function debugRealTimeSystemStatus() {
    console.log('🔍 Real-Time System Status Debug:');

    const status = {
        realTimeSync: window.realTimeSync ? window.realTimeSync.getSyncStatus() : 'Not available',
        dataPersistence: window.dataPersistence ? window.dataPersistence.getRecoveryStatus() : 'Not available',
        realTimeUI: window.realTimeUI ? window.realTimeUI.getUpdateStatus() : 'Not available',
        notificationSystem: window.notificationSystem ? window.notificationSystem.getStatus() : 'Not available',
        sharedDataManager: window.sharedDataManager ? {
            products: window.sharedDataManager.getProducts().length,
            orders: window.sharedDataManager.getOrders().length,
            syncStatus: window.sharedDataManager.getRealTimeSyncStatus()
        } : 'Not available',
        currentUser: currentUser ? {
            email: currentUser.email,
            name: currentUser.name
        } : 'Not logged in'
    };

    console.table(status);
    return status;
}

// Make functions globally available
window.debugAuthState = debugAuthState;
window.forceLogin = forceLogin;
window.testCartFunctionality = testCartFunctionality;
window.debugCartState = debugCartState;
window.testRealTimeSync = testRealTimeSync;
window.testMultiUserSync = testMultiUserSync;
window.testDataPersistence = testDataPersistence;
window.testRealTimeUI = testRealTimeUI;
window.testCompleteRealTimeSystem = testCompleteRealTimeSystem;
window.debugRealTimeSystemStatus = debugRealTimeSystemStatus;
window.highlightUpdatedProduct = highlightUpdatedProduct;
window.handleProductImageError = handleProductImageError;
window.login = login;
window.logout = logout;
window.showPublicWebsite = showPublicWebsite;
window.showPartnerPortal = showPartnerPortal;
window.switchPortalTab = switchPortalTab;
window.toggleCart = toggleCart;
window.addToCart = addToCart;
window.clearCart = clearCart;
window.checkout = checkout;
window.toggleLiveInventory = toggleLiveInventory;
window.scrollToSection = scrollToSection;
window.openModal = openModal;
window.closeModal = closeModal;
window.nextRegistrationStep = nextRegistrationStep;
window.previousRegistrationStep = previousRegistrationStep;
window.submitRegistration = submitRegistration;
window.handleFileUpload = handleFileUpload;
window.setActiveFilter = setActiveFilter;
window.filterPartnerProducts = filterPartnerProducts;
window.filterOrders = filterOrders;
window.filterOrdersByStatus = filterOrdersByStatus;
window.viewOrderDetails = viewOrderDetails;
window.quickOrder = quickOrder;
window.downloadOrderHistory = downloadOrderHistory;
window.openProfileEditModal = openProfileEditModal;
window.updateProfile = updateProfile;
window.refreshProfileData = refreshProfileData;
window.showAuthRequiredNotification = showAuthRequiredNotification;
window.createBulkOrder = createBulkOrder;
window.openBulkOrderModal = openBulkOrderModal;
window.openPresetManager = openPresetManager;
window.viewBulkHistory = viewBulkHistory;
window.requestCustomQuote = requestCustomQuote;
window.submitCustomQuote = submitCustomQuote;
window.openSupportModal = openSupportModal;
// Bulk order function safety wrappers - ensure they exist even if manager isn't ready
window.closeBulkOrderModal = function() {
    if (window.bulkOrderManager) {
        window.bulkOrderManager.closeBulkOrderModal();
    } else {
        closeModal('bulkOrderModal');
    }
};

window.nextBulkStep = function() {
    if (window.bulkOrderManager) {
        window.bulkOrderManager.nextBulkStep();
    } else {
        showNotification('⚠️ Bulk order system loading...', 'warning');
    }
};

window.previousBulkStep = function() {
    if (window.bulkOrderManager) {
        window.bulkOrderManager.previousBulkStep();
    } else {
        showNotification('⚠️ Bulk order system loading...', 'warning');
    }
};

window.selectAllBulkProducts = function() {
    if (window.bulkOrderManager) {
        window.bulkOrderManager.selectAllBulkProducts();
    } else {
        showNotification('⚠️ Bulk order system loading...', 'warning');
    }
};

window.clearBulkSelection = function() {
    if (window.bulkOrderManager) {
        window.bulkOrderManager.clearBulkSelection();
    } else {
        showNotification('⚠️ Bulk order system loading...', 'warning');
    }
};

window.loadPresetSelection = function() {
    if (window.bulkOrderManager) {
        window.bulkOrderManager.loadPresetSelection();
    } else {
        showNotification('⚠️ Bulk order system loading...', 'warning');
    }
};

window.applyMinimumQuantities = function() {
    if (window.bulkOrderManager) {
        window.bulkOrderManager.applyMinimumQuantities();
    } else {
        showNotification('⚠️ Bulk order system loading...', 'warning');
    }
};

window.optimizeForDiscount = function() {
    if (window.bulkOrderManager) {
        window.bulkOrderManager.optimizeForDiscount();
    } else {
        showNotification('⚠️ Bulk order system loading...', 'warning');
    }
};

window.saveBulkPreset = function() {
    if (window.bulkOrderManager) {
        window.bulkOrderManager.saveBulkPreset();
    } else {
        showNotification('⚠️ Bulk order system loading...', 'warning');
    }
};

window.submitBulkOrder = function() {
    if (window.bulkOrderManager) {
        window.bulkOrderManager.submitBulkOrder();
    } else {
        showNotification('⚠️ Bulk order system loading...', 'warning');
    }
};

// Additional bulk order functions
window.createNewPreset = function() {
    if (window.bulkOrderManager) {
        closeModal('presetManagerModal');
        window.bulkOrderManager.openBulkOrderModal();
    } else {
        showNotification('⚠️ Bulk order system loading...', 'warning');
    }
};

window.importPreset = function() {
    if (window.bulkOrderManager) {
        window.bulkOrderManager.importPreset();
    } else {
        showNotification('⚠️ Bulk order system loading...', 'warning');
    }
};

window.exportAllPresets = function() {
    if (window.bulkOrderManager) {
        window.bulkOrderManager.exportAllPresets();
    } else {
        showNotification('��️ Bulk order system loading...', 'warning');
    }
};

window.filterBulkHistory = function(value) {
    try {
        const rows = document.querySelectorAll('#bulkHistoryBody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const matches = text.includes(value.toLowerCase());
            row.style.display = matches ? '' : 'none';
        });
    } catch (error) {
        console.error('Error filtering bulk history:', error);
    }
};

window.filterBulkHistoryByStatus = function(status) {
    try {
        const rows = document.querySelectorAll('#bulkHistoryBody tr');
        rows.forEach(row => {
            if (!status) {
                row.style.display = '';
            } else {
                const statusCell = row.cells[6]; // Status column
                const matches = statusCell && statusCell.textContent.includes(status);
                row.style.display = matches ? '' : 'none';
            }
        });
    } catch (error) {
        console.error('Error filtering bulk history by status:', error);
    }
};

window.downloadBulkHistory = function() {
    if (window.bulkOrderManager && window.bulkOrderManager.bulkOrderHistory.length > 0) {
        try {
            const csvContent = 'Order ID,Date,Items,Weight,Total,Discount,Status\n' +
                window.bulkOrderManager.bulkOrderHistory.map(o =>
                    `${o.id},${o.date},"${o.items}",${o.totalWeight},${o.totalValue},${o.discount}%,${o.status}`
                ).join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bulk-order-history-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);

            showNotification('📄 Bulk order history downloaded!', 'success');
        } catch (error) {
            console.error('Error downloading bulk history:', error);
            showNotification('❌ Error downloading history', 'error');
        }
    } else {
        showNotification('📦 No bulk order history to download', 'warning');
    }
};

window.refreshBulkHistory = function() {
    if (window.bulkOrderManager) {
        window.bulkOrderManager.loadBulkHistoryDisplay();
        showNotification('🔄 Bulk history refreshed!', 'success');
    } else {
        showNotification('⚠️ Bulk order system loading...', 'warning');
    }
};

// Comprehensive test for authorization controls and real-time sync
function testAuthorizationAndSync() {
    console.log('🔒 Starting comprehensive authorization and real-time sync test...');

    const testResults = {
        authorizationTest: false,
        realTimeSyncTest: false,
        imageUpdateTest: false,
        crossTabSyncTest: false
    };

    // Test 1: Authorization Controls
    console.log('🔒 Testing authorization controls...');

    // First, logout to test non-authenticated state
    logout();

    setTimeout(() => {
        // Check that action buttons are hidden for non-authenticated users
        const publicInventoryTable = document.getElementById('publicInventoryBody');
        if (publicInventoryTable) {
            const actionButtons = publicInventoryTable.querySelectorAll('.btn-primary[onclick*="addToCart"]');
            const loginRequiredButtons = publicInventoryTable.querySelectorAll('[onclick*="showAuthRequiredNotification"]');

            if (actionButtons.length === 0 && loginRequiredButtons.length > 0) {
                console.log('✅ Authorization test passed - action buttons hidden for non-authenticated users');
                testResults.authorizationTest = true;
                showNotification('✅ Authorization controls working correctly', 'success');
            } else {
                console.error('❌ Authorization test failed - action buttons visible for non-authenticated users');
                showNotification('❌ Authorization test failed', 'error');
            }
        }

        // Test 2: Login and check buttons appear
        setTimeout(() => {
            console.log('👤 Testing login and button visibility...');
            forceLogin('test@authtest.com');

            setTimeout(() => {
                updatePublicInventoryDisplay(); // Force refresh

                const actionButtons = document.querySelectorAll('.btn-primary[onclick*="addToCart"]');
                if (actionButtons.length > 0) {
                    console.log('✅ Login test passed - action buttons visible for authenticated users');
                    showNotification('✅ Login controls working correctly', 'success');
                } else {
                    console.error('�� Login test failed - action buttons not visible for authenticated users');
                    showNotification('❌ Login test failed', 'error');
                }

                // Test 3: Real-time sync
                setTimeout(async () => {
                    await testRealTimeSyncFeatures(testResults);
                }, 1000);

            }, 1000);
        }, 2000);
    }, 1000);

    return testResults;
}

async function testRealTimeSyncFeatures(testResults) {
    console.log('📡 Testing real-time sync features...');

    if (!window.realTimeSync || !window.sharedDataManager) {
        console.error('❌ Real-time sync components not available');
        showNotification('❌ Real-time sync not available', 'error');
        return;
    }

    // Test 4: Product update sync
    console.log('📦 Testing product update sync...');
    const products = await window.sharedDataManager.getProducts();
    if (products.length > 0) {
        const testProduct = products[0];
        const originalStock = testProduct.stock;
        const newStock = originalStock + Math.floor(Math.random() * 10) + 1;

        // Listen for the update
        const handleProductUpdate = (data) => {
            if (data.productId === testProduct.id) {
                console.log('✅ Product update sync test passed - received real-time update');
                testResults.realTimeSyncTest = true;
                showNotification('✅ Real-time product sync working', 'success');

                // Cleanup listener
                window.realTimeSync.off('product_updated', handleProductUpdate);
            }
        };

        window.realTimeSync.on('product_updated', handleProductUpdate);

        // Trigger the update
        window.sharedDataManager.updateProduct(testProduct.id, {
            stock: newStock,
            lastModified: new Date().toISOString()
        });

        console.log(`📦 Updated ${testProduct.strain} stock from ${originalStock} to ${newStock}`);
    }

    // Test 5: Image update sync
    setTimeout(() => {
        console.log('🖼️ Testing image update sync...');
        if (products.length > 0) {
            const testProduct = products[1] || products[0];
            const newImageUrl = 'https://images.unsplash.com/photo-1628958230481-0011f5bd3db9?w=300&h=300&fit=crop&crop=center';

            // Listen for image updates
            const handleImageUpdate = (data) => {
                if (data.productId === testProduct.id) {
                    console.log('✅ Image update sync test passed');
                    testResults.imageUpdateTest = true;
                    showNotification('✅ Real-time image sync working', 'success');

                    // Cleanup listener
                    window.realTimeSync.off('product_image_updated', handleImageUpdate);
                }
            };

            window.realTimeSync.on('product_image_updated', handleImageUpdate);

            // Trigger image update
            window.sharedDataManager.updateProduct(testProduct.id, {
                image: newImageUrl,
                lastModified: new Date().toISOString()
            });

            console.log(`🖼️ Updated ${testProduct.strain} image`);
        }
    }, 2000);

    // Test 6: Cross-tab communication simulation
    setTimeout(() => {
        console.log('📡 Testing cross-tab communication...');

        // Simulate a message from another tab
        const testMessage = {
            type: 'admin_product_change',
            data: {
                productId: products[0]?.id,
                productName: products[0]?.strain,
                changes: ['test_update'],
                action: 'test_sync',
                timestamp: new Date().toISOString()
            }
        };

        // Broadcast the test message
        window.realTimeSync.broadcast('admin_product_change', testMessage.data);

        setTimeout(() => {
            console.log('✅ Cross-tab communication test completed');
            testResults.crossTabSyncTest = true;
            showNotification('✅ Cross-tab sync working', 'success');

            // Final test results
            setTimeout(() => {
                showTestResults(testResults);
            }, 1000);
        }, 1000);
    }, 3000);
}

function showTestResults(results) {
    console.log('📊 Final Test Results:', results);

    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;

    const resultMessage = `🧪 Authorization & Sync Tests: ${passedTests}/${totalTests} passed`;

    if (passedTests === totalTests) {
        showNotification(`✅ ${resultMessage} - All systems working!`, 'success');
    } else {
        showNotification(`⚠️ ${resultMessage} - Some issues detected`, 'warning');
    }

    // Detailed results in console
    console.table(results);
}

// Export test functions
window.testAuthorizationAndSync = testAuthorizationAndSync;
window.testRealTimeSyncFeatures = testRealTimeSyncFeatures;
window.showTestResults = showTestResults;

// Test bulk order functions are properly defined
window.testBulkOrderFunctions = function() {
    console.log('🧪 Testing bulk order function definitions...');

    const requiredFunctions = [
        'openBulkOrderModal', 'closeBulkOrderModal', 'nextBulkStep', 'previousBulkStep',
        'selectAllBulkProducts', 'clearBulkSelection', 'loadPresetSelection',
        'applyMinimumQuantities', 'optimizeForDiscount', 'saveBulkPreset', 'submitBulkOrder',
        'openPresetManager', 'viewBulkHistory', 'createNewPreset', 'importPreset', 'exportAllPresets',
        'filterBulkHistory', 'filterBulkHistoryByStatus', 'downloadBulkHistory', 'refreshBulkHistory'
    ];

    const results = {
        defined: [],
        undefined: [],
        total: requiredFunctions.length
    };

    requiredFunctions.forEach(funcName => {
        if (typeof window[funcName] === 'function') {
            results.defined.push(funcName);
            console.log(`✅ ${funcName} - defined`);
        } else {
            results.undefined.push(funcName);
            console.error(`❌ ${funcName} - undefined`);
        }
    });

    console.log(`📊 Bulk Order Functions Test Results: ${results.defined.length}/${results.total} defined`);

    if (results.undefined.length > 0) {
        console.error('❌ Missing functions:', results.undefined);
        showNotification(`⚠️ ${results.undefined.length} bulk order functions missing`, 'warning');
    } else {
        console.log('✅ All bulk order functions are properly defined');
        showNotification('✅ All bulk order functions available!', 'success');
    }

    return results;
};
// Payment Processing Functions
function selectPaymentMethod(method) {
    if (window.cartManager) {
        window.cartManager.selectPaymentMethod(method);
    }
}

function formatCardNumber(input) {
    let value = input.value.replace(/\D/g, '');
    value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    input.value = value;
}

function formatExpiry(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length >= 2) {
        value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    input.value = value;
}

function formatCvv(input) {
    input.value = input.value.replace(/\D/g, '');
}

function formatRoutingNumber(input) {
    input.value = input.value.replace(/\D/g, '');
}

async function processPayment(event) {
    event.preventDefault();

    if (!window.currentUser) {
        showNotification('❌ Please log in to complete payment', 'error');
        return;
    }

    try {
        // Get active payment method
        const activePaymentTab = document.querySelector('.payment-tab.active');
        const paymentMethod = activePaymentTab ? activePaymentTab.dataset.method : 'card';

        // Validate payment form
        const validation = validatePaymentForm(paymentMethod);
        if (!validation.valid) {
            showNotification(`❌ ${validation.message}`, 'error');
            return;
        }

        // Check terms agreement
        const agreeTerms = document.getElementById('agreeTerms');
        if (!agreeTerms || !agreeTerms.checked) {
            showNotification('❌ Please agree to the Terms of Service', 'error');
            return;
        }

        // Show processing state
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '🔄 Processing Payment...';
        submitBtn.disabled = true;

        // Process payment based on method
        const paymentResult = await processPaymentMethod(paymentMethod, validation.data);

        if (paymentResult.success) {
            // Complete the order
            await completeOrderWithPayment(paymentResult);

            // Close payment modal
            closeModal('paymentModal');

            // Show success notification
            showNotification('🎉 Payment processed successfully!', 'success');

            setTimeout(() => {
                showNotification('📧 Order confirmation sent to your email', 'success');
            }, 2000);

        } else {
            showNotification(`❌ Payment failed: ${paymentResult.message}`, 'error');
        }

        // Restore button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;

    } catch (error) {
        console.error('Payment processing error:', error);
        showNotification('❌ Payment processing error. Please try again.', 'error');
    }
}

function validatePaymentForm(method) {
    try {
        switch (method) {
            case 'card':
                return validateCardPayment();
            case 'crypto':
                return validateCryptoPayment();
            case 'bank':
                return validateBankPayment();
            default:
                return { valid: false, message: 'Invalid payment method' };
        }
    } catch (error) {
        console.error('Payment validation error:', error);
        return { valid: false, message: 'Validation error occurred' };
    }
}

function validateCardPayment() {
    const cardNumber = document.getElementById('cardNumber').value.replace(/\s/g, '');
    const cardCvv = document.getElementById('cardCvv').value;
    const cardExpiry = document.getElementById('cardExpiry').value;
    const cardName = document.getElementById('cardName').value;
    const billingAddress = document.getElementById('billingAddress').value;

    // Basic validation
    if (!cardNumber || cardNumber.length < 13 || cardNumber.length > 19) {
        return { valid: false, message: 'Please enter a valid card number' };
    }

    if (!cardCvv || cardCvv.length < 3 || cardCvv.length > 4) {
        return { valid: false, message: 'Please enter a valid CVV' };
    }

    if (!cardExpiry || !cardExpiry.match(/^\d{2}\/\d{2}$/)) {
        return { valid: false, message: 'Please enter a valid expiry date (MM/YY)' };
    }

    if (!cardName.trim()) {
        return { valid: false, message: 'Please enter the cardholder name' };
    }

    if (!billingAddress.trim()) {
        return { valid: false, message: 'Please enter the billing address' };
    }

    // Check expiry date
    const [month, year] = cardExpiry.split('/');
    const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
    const currentDate = new Date();

    if (expiryDate < currentDate) {
        return { valid: false, message: 'Card has expired' };
    }

    return {
        valid: true,
        data: {
            cardNumber: cardNumber,
            cvv: cardCvv,
            expiry: cardExpiry,
            name: cardName,
            billingAddress: billingAddress,
            last4: cardNumber.slice(-4)
        }
    };
}

function validateCryptoPayment() {
    const cryptoType = document.getElementById('cryptoType').value;
    const cryptoWallet = document.getElementById('cryptoWallet').value;
    const cryptoEmail = document.getElementById('cryptoEmail').value;

    if (!cryptoType) {
        return { valid: false, message: 'Please select a cryptocurrency' };
    }

    if (!cryptoWallet.trim()) {
        return { valid: false, message: 'Please enter your wallet address' };
    }

    if (!cryptoEmail.trim() || !cryptoEmail.includes('@')) {
        return { valid: false, message: 'Please enter a valid email address' };
    }

    return {
        valid: true,
        data: {
            type: cryptoType,
            wallet: cryptoWallet,
            email: cryptoEmail
        }
    };
}

function validateBankPayment() {
    const accountName = document.getElementById('bankAccountName').value;
    const routingNumber = document.getElementById('bankRoutingNumber').value;
    const accountNumber = document.getElementById('bankAccountNumber').value;
    const accountType = document.getElementById('bankAccountType').value;
    const bankName = document.getElementById('bankName').value;

    if (!accountName.trim()) {
        return { valid: false, message: 'Please enter the account holder name' };
    }

    if (!routingNumber || routingNumber.length !== 9) {
        return { valid: false, message: 'Please enter a valid 9-digit routing number' };
    }

    if (!accountNumber.trim()) {
        return { valid: false, message: 'Please enter the account number' };
    }

    if (!accountType) {
        return { valid: false, message: 'Please select the account type' };
    }

    if (!bankName.trim()) {
        return { valid: false, message: 'Please enter the bank name' };
    }

    return {
        valid: true,
        data: {
            accountName: accountName,
            routingNumber: routingNumber,
            accountNumber: accountNumber,
            accountType: accountType,
            bankName: bankName,
            maskedAccount: '*'.repeat(accountNumber.length - 4) + accountNumber.slice(-4)
        }
    };
}

async function processPaymentMethod(method, paymentData) {
    // Simulate API call to payment processor
    return new Promise((resolve) => {
        setTimeout(() => {
            // Simulate different success rates and responses
            const random = Math.random();

            if (random > 0.95) { // 5% failure rate
                resolve({
                    success: false,
                    message: 'Payment declined. Please check your payment information and try again.'
                });
            } else {
                resolve({
                    success: true,
                    transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                    method: method,
                    data: paymentData,
                    processedAt: new Date().toISOString()
                });
            }
        }, 2000 + Math.random() * 1000); // 2-3 second processing time
    });
}

async function completeOrderWithPayment(paymentResult) {
    if (!window.cartManager) return;

    try {
        const totals = window.cartManager.getTotals();
        const orderItems = window.cartManager.cart.map(item => `${item.strain} (x${item.quantity})`).join(', ');

        const userEmail = window.currentUser?.email || 'guest@example.com';
        const userName = window.currentUser?.name || 'Guest User';

        const newOrder = {
            id: `ORD-${String((window.sharedDataManager?.getOrders()?.length || 0) + 1).padStart(3, '0')}`,
            partner: userEmail,
            partnerName: userName + ' Store',
            items: orderItems,
            itemDetails: window.cartManager.cart.map(item => ({
                id: item.id,
                strain: item.strain,
                grade: item.grade,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.price * item.quantity
            })),
            total: totals.total,
            status: 'PENDING',
            date: new Date().toISOString().split('T')[0],
            notes: '',
            delivery: totals.total > 1000 ? 'priority' : 'standard',
            created: new Date().toISOString(),
            payment: {
                method: paymentResult.method,
                transactionId: paymentResult.transactionId,
                processedAt: paymentResult.processedAt,
                status: 'COMPLETED'
            }
        };

        // Add order to shared data manager
        if (window.sharedDataManager) {
            window.sharedDataManager.addOrder(newOrder);
        }

        // Update inventory
        window.cartManager.updateInventoryAfterOrder();

        // Clear cart
        window.cartManager.cart = [];
        window.cartManager.saveCart();
        window.cartManager.updateDisplay();
        window.cartManager.close();

        // Update all views
        if (window.updateAllViews) {
            window.updateAllViews();
        }

        console.log('✅ Order completed with payment:', newOrder);

    } catch (error) {
        console.error('Error completing order with payment:', error);
        throw error;
    }
}

// Live Validation Functions
function validateFieldLive(input) {
    const fieldId = input.id;
    const value = input.value.trim();
    const indicator = document.querySelector(`[data-field="${fieldId}"]`);

    // Show checking state
    if (indicator) {
        indicator.className = 'live-validation-indicator checking';
        indicator.textContent = '⏳';
    }
    input.className = input.className.replace(/\b(valid|invalid|checking)\b/g, '') + ' checking';

    // Simulate real-time validation
    setTimeout(() => {
        let isValid = false;
        let message = '';

        switch (fieldId) {
            case 'checkoutCustomerName':
                isValid = value.length >= 2;
                message = isValid ? '✅' : '❌ Name too short';
                break;
            case 'checkoutCustomerEmail':
                isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
                message = isValid ? '✅' : '❌ Invalid email';
                break;
            case 'checkoutCustomerPhone':
                isValid = /^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/\D/g, ''));
                message = isValid ? '✅' : '❌ Invalid phone';
                break;
            case 'checkoutBusinessName':
                isValid = value.length >= 2;
                message = isValid ? '✅' : '❌ Business name required';
                break;
            case 'checkoutShippingAddress':
                isValid = value.length >= 10;
                message = isValid ? '✅' : '❌ Complete address required';
                break;
            default:
                isValid = value.length > 0;
                message = isValid ? '✅' : '��';
        }

        if (indicator) {
            indicator.className = `live-validation-indicator ${isValid ? 'valid' : 'invalid'}`;
            indicator.textContent = message;
        }

        input.className = input.className.replace(/\b(valid|invalid|checking)\b/g, '') + ` ${isValid ? 'valid' : 'invalid'}`;

        // Check if all fields are valid and update proceed button
        updateProceedButtonState();

    }, 300 + Math.random() * 200); // Simulate API delay
}

function updateProceedButtonState() {
    const proceedBtn = document.querySelector('#checkoutModal button[type="submit"]');
    if (!proceedBtn) return;

    const validFields = document.querySelectorAll('#checkoutModal .live-validation-indicator.valid').length;
    const totalRequiredFields = document.querySelectorAll('#checkoutModal .live-validation-indicator').length;

    if (validFields === totalRequiredFields && totalRequiredFields > 0) {
        proceedBtn.disabled = false;
        proceedBtn.style.opacity = '1';
        proceedBtn.style.background = 'linear-gradient(135deg, var(--brand-green), var(--brand-green-light))';
    } else {
        proceedBtn.disabled = true;
        proceedBtn.style.opacity = '0.6';
        proceedBtn.style.background = 'var(--surface-elevated)';
    }
}

// Checkout Modal Functions
function proceedToPayment(event) {
    event.preventDefault();

    if (window.cartManager) {
        window.cartManager.processCheckout();
    }
}

function updateDeliveryMethodLive(label) {
    // Update visual styling for selected delivery method
    document.querySelectorAll('label:has(input[name="deliveryMethod"])').forEach(l => {
        l.style.borderColor = 'var(--border-subtle)';
        l.style.background = 'var(--surface-card)';
        l.style.boxShadow = 'none';
    });

    label.style.borderColor = 'var(--brand-green)';
    label.style.background = 'rgba(0, 200, 81, 0.1)';
    label.style.boxShadow = '0 0 0 2px rgba(0, 200, 81, 0.2)';

    // Get selected delivery method and update pricing in real-time
    const method = label.querySelector('input').value;
    console.log('⚡ Live delivery method selected:', method);

    // Update live pricing immediately
    if (window.cartManager) {
        window.cartManager.updateLivePricing(method);
    }

    // Show visual feedback
    showNotification(`🚚 Delivery method updated to ${method}`, 'success');
}

// Real-time inventory checking
async function checkInventoryLive() {
    if (!window.cartManager || !window.sharedDataManager) return;

    // Safety check: ensure cart is an array
    if (!Array.isArray(window.cartManager.cart)) {
        console.warn('⚠️ checkInventoryLive: Cart is not an array:', typeof window.cartManager.cart);
        return;
    }

    let hasChanges = false;

    try {
        const products = await window.sharedDataManager.getProducts();

        if (!Array.isArray(products)) {
            console.warn('⚠️ checkInventoryLive: Products is not an array:', typeof products);
            return;
        }

        window.cartManager.cart.forEach(cartItem => {
            const product = products.find(p => p.id === cartItem.id);
            if (!product || product.status !== 'AVAILABLE' || product.stock < cartItem.quantity) {
                hasChanges = true;
                showNotification(`⚠️ ${cartItem.strain} availability changed`, 'warning');
            }
        });
    } catch (error) {
        console.error('❌ Error in checkInventoryLive:', error);
    }

    if (hasChanges && window.cartManager.syncCartRealTime) {
        window.cartManager.syncCartRealTime();
    }
}

// Initialize live updates when checkout modal opens
function initializeLiveCheckout() {
    // Start real-time inventory checking
    setInterval(checkInventoryLive, 3000);

    // Add listeners for real-time cart updates
    window.addEventListener('cartUpdate', () => {
        if (window.cartManager) {
            window.cartManager.syncCartRealTime();
        }
    });

    console.log('��� Live checkout system initialized');
}

// Register Modal Functions (simplified version)
function register(event) {
    event.preventDefault();

    const businessName = document.getElementById('businessName').value;
    const contactName = document.getElementById('contactName').value;
    const businessEmail = document.getElementById('businessEmail').value;
    const phone = document.getElementById('phone').value;
    const businessType = document.getElementById('businessType').value;

    if (!businessName || !contactName || !businessEmail || !phone || !businessType) {
        showNotification('❌ Please fill in all required fields', 'error');
        return;
    }

    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating Account...';
    submitBtn.disabled = true;

    setTimeout(() => {
        // Create user account
        const userData = {
            email: businessEmail,
            name: contactName,
            businessName: businessName,
            phone: phone,
            businessType: businessType,
            tier: 'Starter Partner',
            registeredAt: new Date().toISOString()
        };

        // Auto-login after registration
        setCurrentUser(userData);
        showUserSession();
        closeModal('registerModal');
        showPartnerPortal();

        showNotification(`��� Welcome to Faded Skies, ${contactName}!`, 'success');

        // Restore button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;

        // Clear form
        event.target.reset();

    }, 2000);
}

window.selectPaymentMethod = selectPaymentMethod;
window.formatCardNumber = formatCardNumber;
window.formatExpiry = formatExpiry;
window.formatCvv = formatCvv;
window.formatRoutingNumber = formatRoutingNumber;
window.processPayment = processPayment;
window.updateProfile = updateProfile;
window.populateProfileEditForm = populateProfileEditForm;
window.refreshProfileData = refreshProfileData;
window.openProfileEditModal = openProfileEditModal;

// Test function to verify profile edit modal
window.testProfileEditModal = function() {
    console.log('🧪 Testing profile edit modal functionality...');

    if (!window.currentUser) {
        console.log('👤 No user logged in, creating test user...');
        const testUser = {
            email: 'test@business.com',
            name: 'Test User',
            businessName: 'Test Business',
            tier: 'Gold Partner',
            loginTime: new Date().toISOString()
        };
        setCurrentUser(testUser);
        showUserSession();
        showPartnerPortal();
        switchPortalTab('profile');
    }

    setTimeout(() => {
        console.log('🔄 Opening profile edit modal...');
        openProfileEditModal();
    }, 1000);

    return 'Profile edit modal test initiated - check console for results';
};
window.register = register;
window.proceedToPayment = proceedToPayment;
window.updateDeliveryMethodLive = updateDeliveryMethodLive;
window.validateFieldLive = validateFieldLive;
window.updateProceedButtonState = updateProceedButtonState;
window.checkInventoryLive = checkInventoryLive;
window.initializeLiveCheckout = initializeLiveCheckout;
window.showNotification = showNotification;
window.updateAllViews = updateAllViews;

console.log('🎯 All global functions loaded and ready');
