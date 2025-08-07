// Main Application JavaScript for Faded Skies Portal
// Complete implementation with cart, orders, and profile functionality

// Global Variables
let currentUser = null;
window.currentUser = null;
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
        window.cartManager = new CartManager();
    }
    
    // Setup shared data manager event listeners
    window.addEventListener('sharedDataChange', handleSharedDataChange);
    
    // Check if user is already logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            window.currentUser = currentUser;
            showUserSession();
            console.log('✅ User session restored:', currentUser.email);
        } catch (error) {
            console.error('Error restoring user session:', error);
            localStorage.removeItem('currentUser');
        }
    }
    
    // Initialize view state
    const urlParams = new URLSearchParams(window.location.search);
    const initialView = urlParams.get('view');
    if (initialView === 'portal' && currentUser) {
        showPartnerPortal();
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
        currentUser = {
            email: email,
            name: email.split('@')[0],
            tier: 'Gold Partner',
            loginTime: new Date().toISOString()
        };

        // Set global user reference for cart manager
        window.currentUser = currentUser;

        // Save user session
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Update UI
        showUserSession();
        closeModal('loginModal');
        showPartnerPortal();
        
        // Notify cart manager and refresh its state
        window.dispatchEvent(new CustomEvent('userAuthenticated', { detail: currentUser }));

        // Explicitly refresh cart manager state
        if (window.cartManager) {
            window.cartManager.refreshUserState();
        }
        
        showNotification(`Welcome back, ${currentUser.name}! 🎉`, 'success');
        console.log('✅ User logged in:', currentUser.email);
    } else {
        showNotification('❌ Please enter valid credentials', 'error');
    }
}

function logout() {
    if (currentUser) {
        const userName = currentUser.name;
        currentUser = null;
        window.currentUser = null;
        localStorage.removeItem('currentUser');
        
        // Clear cart
        if (window.cartManager) {
            window.cartManager.cart = [];
            window.cartManager.updateDisplay();
        }
        
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
    if (!currentUser) {
        showNotification('🔒 Please log in to add items to cart', 'error');
        openModal('loginModal');
        return false;
    }
    
    if (window.cartManager) {
        return window.cartManager.addProduct(productId, quantity);
    }
    
    return false;
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
                    <button class="btn btn-primary btn-sm" onclick="openModal('loginModal')">
                        🔒 Login to Order
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
                        `<button class="btn btn-primary btn-sm" onclick="addToCart(${product.id})">
                            🛒 Add to Cart
                        </button>` :
                        `<button class="btn btn-secondary btn-sm" disabled>
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
    
    const emailEl = document.getElementById('profileEmail');
    const licenseEl = document.getElementById('profileLicense');
    
    if (emailEl) emailEl.textContent = currentUser.email;
    if (licenseEl) licenseEl.textContent = currentUser.license || 'Not provided';
}

function openProfileEditModal() {
    showNotification('✏️ Profile editing feature coming soon!', 'info');
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
            submitBtn.textContent = 'Submit Application 🚀';
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

// Make functions globally available
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
window.showNotification = showNotification;
window.updateAllViews = updateAllViews;

console.log('🎯 All global functions loaded and ready');
