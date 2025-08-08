// Main Application JavaScript for Faded Skies Portal
// Complete implementation with cart, orders, and profile functionality

// Global Variables - Authentication State
let currentUser = null;

// Ensure window.currentUser is always synchronized
function setCurrentUser(user) {
    currentUser = user;
    window.currentUser = user;
    
    if (user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
        console.log('✅ User authenticated globally:', user.email);
    } else {
        localStorage.removeItem('currentUser');
        console.log('✅ User logged out globally');
    }
    
    // Immediately notify cart manager of auth state change
    if (window.cartManager) {
        console.log('🔄 Refreshing cart manager after auth change');
        window.cartManager.refreshUserState();
        window.cartManager.updateDisplay();
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
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Faded Skies Portal initializing...');
    initializeApplication();
    loadInitialData();
    setupEventListeners();
    console.log('✅ Application initialized successfully');
});

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

    // Check if user is already logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            const userData = JSON.parse(savedUser);
            setCurrentUser(userData);
            showUserSession();
            console.log('✅ User session restored:', currentUser.email);
        } catch (error) {
            console.error('Error restoring user session:', error);
            localStorage.removeItem('currentUser');
        }
    }

    // Initialize live checkout system
    initializeLiveCheckout();

    // Initialize view state
    const urlParams = new URLSearchParams(window.location.search);
    const initialView = urlParams.get('view');
    if (initialView === 'portal' && currentUser) {
        showPartnerPortal();
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
            syncIcon.textContent = '📡';
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

function loadInitialData() {
    // Load products from shared data manager
    if (window.sharedDataManager) {
        products = window.sharedDataManager.getProducts() || [];
        orders = window.sharedDataManager.getOrders() || [];
        updateAllViews();
        console.log(`📦 Loaded ${products.length} products and ${orders.length} orders`);
    }
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

function handleSharedDataChange(event) {
    const { type, data } = event.detail;
    console.log('📡 Shared data changed:', type, data);
    
    switch (type) {
        case 'products_updated':
            products = data;
            updateAllViews();
            break;
        case 'order_added':
            orders = window.sharedDataManager.getOrders();
            updateOrdersDisplay();
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

// Authentication Functions
function login(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Simple authentication (in real app, this would be server-side)
    if (email && password) {
        const userData = {
            email: email,
            name: email.split('@')[0],
            tier: 'Gold Partner',
            loginTime: new Date().toISOString()
        };

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
        showNotification('❌ Please enter valid credentials', 'error');
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
}

function showGuestSession() {
    const guestSection = document.getElementById('guestSection');
    const userSession = document.getElementById('userSession');
    const cartToggle = document.getElementById('cartToggle');
    
    if (guestSection) guestSection.style.display = 'flex';
    if (userSession) userSession.classList.remove('show');
    if (cartToggle) cartToggle.style.display = 'none';
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
        console.error('❌ Cart manager not found');
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
    
    const availableProducts = products.filter(p => p.status === 'AVAILABLE');
    
    if (availableProducts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No products available at this time</td></tr>';
        return;
    }
    
    tbody.innerHTML = availableProducts.map(product => {
        const unitLabel = getUnitLabel(product.grade);
        return `
            <tr>
                <td class="product-image-container">
                    <img src="${product.image || 'https://via.placeholder.com/80x80/1a1a1a/00C851?text=' + product.grade}" 
                         alt="${product.strain}" class="product-image" 
                         onerror="this.src='https://via.placeholder.com/80x80/1a1a1a/00C851?text=${product.grade}'" />
                </td>
                <td><strong>${product.grade}</strong></td>
                <td>
                    <strong>${product.strain}</strong><br>
                    <small style="color: var(--text-muted);">${product.type || 'Premium'} • ${product.description || 'High quality product'}</small>
                </td>
                <td><strong style="color: var(--brand-green);">$${product.price}${unitLabel}</strong></td>
                <td><span style="color: var(--brand-green); font-weight: 700;">${product.thca}%</span></td>
                <td><span class="status-available">${product.stock} Available</span></td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="addToCart(${product.id})">
                        🛒 Add to Cart
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function updatePartnerProductsDisplay() {
    const tbody = document.getElementById('partnerProductBody');
    if (!tbody) return;
    
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
            <tr>
                <td class="product-image-container">
                    <img src="${product.image || 'https://via.placeholder.com/80x80/1a1a1a/00C851?text=' + product.grade}" 
                         alt="${product.strain}" class="product-image" 
                         onerror="this.src='https://via.placeholder.com/80x80/1a1a1a/00C851?text=${product.grade}'" />
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
            console.warn(`⚠️ Field ${fieldId} not found in DOM`);
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

                // Update localStorage and global state
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
    const availableCount = products.filter(p => p.status === 'AVAILABLE').length;
    const startingPrice = Math.min(...products.filter(p => p.status === 'AVAILABLE').map(p => p.price));
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

// Registration Functions
let currentRegistrationStep = 1;
let registrationData = {};

function nextRegistrationStep() {
    if (currentRegistrationStep === 1) {
        // Validate step 1
        const form = document.getElementById('businessInfoForm');
        const formData = new FormData(form);
        let isValid = true;
        
        // Basic validation
        const requiredFields = ['businessName', 'contactName', 'businessEmail', 'phone', 'businessAddress', 'businessType', 'licenseNumber', 'estimatedMonthlyVolume'];
        requiredFields.forEach(field => {
            const input = document.getElementById(field);
            if (!input.value.trim()) {
                isValid = false;
                input.style.borderColor = 'var(--accent-red)';
            } else {
                input.style.borderColor = 'var(--border-subtle)';
                registrationData[field] = input.value;
            }
        });
        
        if (!isValid) {
            showNotification('❌ Please fill in all required fields', 'error');
            return;
        }
        
        // Proceed to step 2
        document.getElementById('registrationStep1').classList.remove('active');
        document.getElementById('registrationStep2').classList.add('active');
        currentRegistrationStep = 2;
    } else if (currentRegistrationStep === 2) {
        // Check if required documents are uploaded
        const requiredDocs = ['businessLicense', 'cannabisLicense', 'taxId'];
        const uploadedDocs = requiredDocs.filter(doc => {
            const input = document.getElementById(doc);
            return input && input.files.length > 0;
        });
        
        if (uploadedDocs.length < 3) {
            showNotification('❌ Please upload all required documents', 'error');
            return;
        }
        
        // Proceed to step 3
        generateRegistrationReview();
        document.getElementById('registrationStep2').classList.remove('active');
        document.getElementById('registrationStep3').classList.add('active');
        currentRegistrationStep = 3;
    }
}

function previousRegistrationStep() {
    if (currentRegistrationStep === 2) {
        document.getElementById('registrationStep2').classList.remove('active');
        document.getElementById('registrationStep1').classList.add('active');
        currentRegistrationStep = 1;
    } else if (currentRegistrationStep === 3) {
        document.getElementById('registrationStep3').classList.remove('active');
        document.getElementById('registrationStep2').classList.add('active');
        currentRegistrationStep = 2;
    }
}

function generateRegistrationReview() {
    const reviewContainer = document.getElementById('registrationReview');
    if (!reviewContainer) return;
    
    reviewContainer.innerHTML = `
        <div class="review-section">
            <h4 style="color: var(--brand-green); margin-bottom: 16px;">Business Information</h4>
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
            </div>
        </div>
        
        <div class="review-section">
            <h4 style="color: var(--brand-green); margin-bottom: 16px;">Documents Uploaded</h4>
            <div class="review-documents">
                <div class="doc-item">✅ Business License</div>
                <div class="doc-item">✅ Cannabis License</div>
                <div class="doc-item">✅ Tax ID/EIN Document</div>
            </div>
        </div>
        
        <div style="margin-top: 24px; display: flex; gap: 12px;">
            <button type="button" class="btn btn-secondary" onclick="previousRegistrationStep()">← Back</button>
            <button type="button" class="btn btn-primary" onclick="submitRegistration()" style="flex: 1;">Submit Application 🚀</button>
        </div>
    `;
}

function submitRegistration() {
    // Simulate registration submission
    const submitBtn = document.querySelector('[onclick="submitRegistration()"]');
    if (submitBtn) {
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled = true;
    }
    
    setTimeout(() => {
        closeModal('registerModal');
        showNotification('🎉 Registration submitted successfully! You will receive an email confirmation shortly.', 'success');
        
        // Reset form
        currentRegistrationStep = 1;
        registrationData = {};
        document.getElementById('registrationStep3').classList.remove('active');
        document.getElementById('registrationStep1').classList.add('active');
        
        if (submitBtn) {
            submitBtn.textContent = 'Submit Application ���';
            submitBtn.disabled = false;
        }
    }, 2000);
}

function handleFileUpload(input, documentType) {
    if (input.files.length > 0) {
        const file = input.files[0];
        const previewContainer = document.getElementById(documentType + 'Preview');
        
        if (previewContainer) {
            previewContainer.innerHTML = `
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
        
        // Enable proceed button if all required docs are uploaded
        const proceedBtn = document.getElementById('proceedToReview');
        if (proceedBtn) {
            const requiredDocs = ['businessLicense', 'cannabisLicense', 'taxId'];
            const uploadedCount = requiredDocs.filter(doc => {
                const input = document.getElementById(doc);
                return input && input.files.length > 0;
            }).length;
            
            proceedBtn.disabled = uploadedCount < 3;
        }
    }
}

// Bulk Order Functions
function createBulkOrder() {
    showNotification('📦 Bulk order creation feature coming soon!', 'info');
}

function requestCustomQuote() {
    showNotification('💬 Custom quote request feature coming soon!', 'info');
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

// Debug function to check authentication state
function debugAuthState() {
    console.log('🔍 AUTHENTICATION DEBUG STATE:', {
        localCurrentUser: currentUser,
        windowCurrentUser: window.currentUser,
        localStorageUser: localStorage.getItem('currentUser'),
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
    setTimeout(() => {
        console.log('📦 Testing product update sync...');
        if (window.sharedDataManager) {
            const products = window.sharedDataManager.getProducts();
            if (products.length > 0) {
                const testProduct = products[0];
                const newStock = Math.floor(Math.random() * 50) + 1;

                window.sharedDataManager.updateProduct(testProduct.id, {
                    stock: newStock,
                    lastModified: new Date().toISOString()
                });

                console.log(`📦 Updated ${testProduct.strain} stock to ${newStock}`);
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
    console.log('👥 Testing multi-user sync simulation...');

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
    console.log('📊 Recovery Status:', recoveryStatus);

    // Test 3: Simulate data corruption and recovery
    setTimeout(() => {
        console.log('🧪 Simulating data recovery test...');
        if (confirm('Test data recovery? This will temporarily corrupt and then restore data.')) {
            // Backup current data first
            const currentData = window.sharedDataManager.getData();

            // Corrupt data temporarily
            localStorage.setItem('fadedSkiesSharedData', '{"invalid": "json",}');

            // Trigger recovery
            setTimeout(() => {
                window.dataPersistence.initiateRecovery();
            }, 1000);
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
window.createBulkOrder = createBulkOrder;
window.requestCustomQuote = requestCustomQuote;
window.openSupportModal = openSupportModal;
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
                message = isValid ? '✅' : '❌';
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
function checkInventoryLive() {
    if (!window.cartManager || !window.sharedDataManager) return;

    let hasChanges = false;
    const products = window.sharedDataManager.getProducts();

    window.cartManager.cart.forEach(cartItem => {
        const product = products.find(p => p.id === cartItem.id);
        if (!product || product.status !== 'AVAILABLE' || product.stock < cartItem.quantity) {
            hasChanges = true;
            showNotification(`⚠️ ${cartItem.strain} availability changed`, 'warning');
        }
    });

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

    console.log('✅ Live checkout system initialized');
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

        showNotification(`🎉 Welcome to Faded Skies, ${contactName}!`, 'success');

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
