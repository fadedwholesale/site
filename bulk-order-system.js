// Faded Skies Bulk Order System
// Complete implementation with presets, quantity discounts, and order management

class BulkOrderManager {
    constructor() {
        this.currentStep = 1;
        this.selectedProducts = new Map(); // productId -> quantity
        this.bulkPresets = new Map(); // presetId -> preset data
        this.bulkOrderHistory = [];
        this.currentPreset = null;
        
        this.init();
    }

    init() {
        // Load saved presets and history from localStorage
        this.loadPresets();
        this.loadBulkHistory();
        
        // Set up event listeners
        this.setupEventListeners();
        
        console.log('📦 Bulk Order Manager initialized');
    }

    setupEventListeners() {
        // Listen for save as preset checkbox
        document.addEventListener('change', (event) => {
            if (event.target.id === 'saveAsPreset') {
                const presetNameSection = document.getElementById('presetNameSection');
                if (presetNameSection) {
                    presetNameSection.style.display = event.target.checked ? 'block' : 'none';
                }
            }
        });

        // Real-time quantity updates
        document.addEventListener('input', (event) => {
            if (event.target.classList.contains('bulk-quantity-input')) {
                this.updateQuantityFromInput(event.target);
            }
        });
    }

    // Open bulk order modal and initialize
    openBulkOrderModal() {
        try {
            // Reset to step 1
            this.currentStep = 1;
            this.selectedProducts.clear();
            
            // Load available products
            this.loadAvailableProducts();
            
            // Update step display
            this.updateStepDisplay();
            
            // Open modal
            openModal('bulkOrderModal');
            
            console.log('📦 Bulk order modal opened');
            
        } catch (error) {
            console.error('Error opening bulk order modal:', error);
            showNotification('❌ Error opening bulk order modal', 'error');
        }
    }

    // Load available products for bulk ordering
    loadAvailableProducts() {
        const productsList = document.getElementById('bulkProductsList');
        if (!productsList) return;

        const products = window.sharedDataManager?.getProducts() || [];
        const availableProducts = products.filter(p => p.status === 'AVAILABLE' && p.stock > 0);

        if (availableProducts.length === 0) {
            productsList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    <div style="font-size: 2rem; margin-bottom: 16px;">📦</div>
                    <h3>No products available for bulk ordering</h3>
                    <p>Please check back later or contact support.</p>
                </div>
            `;
            return;
        }

        const productsHTML = availableProducts.map(product => {
            const unitLabel = this.getUnitLabel(product.grade);
            const partnerPrice = Math.round(product.price * 0.8); // 20% discount
            
            return `
                <div class="bulk-product-item" data-product-id="${product.id}" style="display: flex; align-items: center; padding: 12px; border: 2px solid var(--border-subtle); border-radius: 8px; margin-bottom: 12px; cursor: pointer; transition: all 0.3s ease;">
                    <input type="checkbox" class="bulk-product-checkbox" data-product-id="${product.id}" style="margin-right: 12px; transform: scale(1.2);">
                    <img src="${product.image || 'https://via.placeholder.com/60x60/1a1a1a/00C851?text=' + encodeURIComponent(product.grade)}"
                         alt="${product.strain}" style="width: 60px; height: 60px; border-radius: 8px; object-fit: cover; margin-right: 16px;">
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 4px 0; color: var(--text-primary);">${product.strain}</h4>
                        <p style="margin: 0; color: var(--text-secondary); font-size: 14px;">${product.grade} • ${product.stock} available</p>
                        <p style="margin: 4px 0 0 0; color: var(--brand-green); font-weight: 600;">$${partnerPrice}${unitLabel} <span style="font-size: 12px; color: var(--text-muted);">(Partner Price)</span></p>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: var(--brand-green); font-weight: 700;">${product.thca}% THCA</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">Max: ${product.stock}</div>
                    </div>
                </div>
            `;
        }).join('');

        productsList.innerHTML = productsHTML;

        // Add click handlers for product selection
        productsList.querySelectorAll('.bulk-product-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') {
                    const checkbox = item.querySelector('.bulk-product-checkbox');
                    checkbox.checked = !checkbox.checked;
                    this.toggleProductSelection(checkbox);
                }
            });
        });

        productsList.querySelectorAll('.bulk-product-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.toggleProductSelection(checkbox);
            });
        });
    }

    // Toggle product selection
    toggleProductSelection(checkbox) {
        const productId = parseInt(checkbox.dataset.productId);
        const item = checkbox.closest('.bulk-product-item');
        
        if (checkbox.checked) {
            // Add to selection with default quantity of 1
            this.selectedProducts.set(productId, 1);
            item.style.borderColor = 'var(--brand-green)';
            item.style.background = 'rgba(0, 200, 81, 0.1)';
        } else {
            // Remove from selection
            this.selectedProducts.delete(productId);
            item.style.borderColor = 'var(--border-subtle)';
            item.style.background = 'transparent';
        }

        this.updateSelectedCount();
    }

    // Update selected products count
    updateSelectedCount() {
        const countElement = document.getElementById('selectedProductsCount');
        if (countElement) {
            countElement.textContent = this.selectedProducts.size;
        }

        // Enable/disable next button
        const nextButton = document.getElementById('bulkStep1Next');
        if (nextButton) {
            nextButton.disabled = this.selectedProducts.size === 0;
            nextButton.style.opacity = this.selectedProducts.size === 0 ? '0.5' : '1';
        }
    }

    // Select all available products
    selectAllBulkProducts() {
        const checkboxes = document.querySelectorAll('.bulk-product-checkbox');
        checkboxes.forEach(checkbox => {
            if (!checkbox.checked) {
                checkbox.checked = true;
                this.toggleProductSelection(checkbox);
            }
        });
    }

    // Clear all selections
    clearBulkSelection() {
        const checkboxes = document.querySelectorAll('.bulk-product-checkbox');
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                checkbox.checked = false;
                this.toggleProductSelection(checkbox);
            }
        });
    }

    // Load preset selection
    loadPresetSelection() {
        if (this.bulkPresets.size === 0) {
            showNotification('📦 No saved presets found', 'warning');
            return;
        }

        // Create preset selection UI
        const presetOptions = Array.from(this.bulkPresets.values()).map(preset => 
            `<option value="${preset.id}">${preset.name} (${preset.products.length} items)</option>`
        ).join('');

        const presetSelector = `
            <div style="background: var(--surface-elevated); padding: 16px; border-radius: 8px; margin: 16px 0;">
                <h4 style="color: var(--brand-green); margin: 0 0 12px 0;">Load Saved Preset</h4>
                <select id="presetSelect" style="width: 100%; padding: 8px; border-radius: 4px; margin-bottom: 12px;">
                    <option value="">Choose a preset...</option>
                    ${presetOptions}
                </select>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-primary btn-sm" onclick="window.bulkOrderManager.loadSelectedPreset()">Load Preset</button>
                    <button class="btn btn-secondary btn-sm" onclick="this.parentElement.parentElement.remove()">Cancel</button>
                </div>
            </div>
        `;

        const productsList = document.getElementById('bulkProductsList');
        if (productsList) {
            productsList.insertAdjacentHTML('afterbegin', presetSelector);
        }
    }

    // Load selected preset
    loadSelectedPreset() {
        const selector = document.getElementById('presetSelect');
        if (!selector || !selector.value) return;

        const preset = this.bulkPresets.get(selector.value);
        if (!preset) return;

        // Clear current selection
        this.clearBulkSelection();

        // Apply preset selections
        preset.products.forEach(presetProduct => {
            const checkbox = document.querySelector(`[data-product-id="${presetProduct.productId}"]`);
            if (checkbox) {
                checkbox.checked = true;
                this.selectedProducts.set(presetProduct.productId, presetProduct.quantity);
                this.toggleProductSelection(checkbox);
            }
        });

        // Remove preset selector
        selector.closest('div').remove();

        showNotification(`📦 Loaded preset: ${preset.name}`, 'success');
    }

    // Navigate to next step
    nextBulkStep() {
        if (this.currentStep === 1) {
            if (this.selectedProducts.size === 0) {
                showNotification('⚠️ Please select at least one product', 'warning');
                return;
            }
            this.currentStep = 2;
            this.loadQuantityStep();
        } else if (this.currentStep === 2) {
            if (!this.validateQuantities()) {
                return;
            }
            this.currentStep = 3;
            this.loadReviewStep();
        }

        this.updateStepDisplay();
    }

    // Navigate to previous step
    previousBulkStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepDisplay();
        }
    }

    // Update step display
    updateStepDisplay() {
        // Update step indicators
        document.querySelectorAll('.bulk-order-steps .step').forEach(step => {
            const stepNum = parseInt(step.dataset.step);
            if (stepNum === this.currentStep) {
                step.style.background = 'var(--brand-green)';
                step.style.color = 'white';
                step.classList.add('active');
            } else if (stepNum < this.currentStep) {
                step.style.background = 'var(--brand-green-dark)';
                step.style.color = 'white';
                step.classList.remove('active');
            } else {
                step.style.background = 'var(--surface-elevated)';
                step.style.color = 'var(--text-secondary)';
                step.classList.remove('active');
            }
        });

        // Show/hide step content
        document.querySelectorAll('.bulk-step').forEach(step => {
            step.style.display = 'none';
        });

        const currentStepElement = document.getElementById(`bulkStep${this.currentStep}`);
        if (currentStepElement) {
            currentStepElement.style.display = 'block';
        }
    }

    // Load quantity selection step
    loadQuantityStep() {
        const container = document.getElementById('bulkQuantitiesContainer');
        if (!container) return;

        const products = window.sharedDataManager?.getProducts() || [];
        
        const quantitiesHTML = Array.from(this.selectedProducts.keys()).map(productId => {
            const product = products.find(p => p.id === productId);
            if (!product) return '';

            const quantity = this.selectedProducts.get(productId);
            const unitLabel = this.getUnitLabel(product.grade);
            const partnerPrice = Math.round(product.price * 0.8);

            return `
                <div class="bulk-quantity-item" data-product-id="${productId}" style="display: flex; align-items: center; padding: 16px; border: 1px solid var(--border-subtle); border-radius: 8px; margin-bottom: 12px;">
                    <img src="${product.image || 'https://via.placeholder.com/60x60/1a1a1a/00C851?text=' + encodeURIComponent(product.grade)}"
                         alt="${product.strain}" style="width: 60px; height: 60px; border-radius: 8px; object-fit: cover; margin-right: 16px;">
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 4px 0; color: var(--text-primary);">${product.strain}</h4>
                        <p style="margin: 0; color: var(--text-secondary); font-size: 14px;">${product.grade} • $${partnerPrice}${unitLabel}</p>
                        <p style="margin: 4px 0 0 0; color: var(--text-muted); font-size: 12px;">Available: ${product.stock}</p>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <button type="button" onclick="window.bulkOrderManager.adjustQuantity(${productId}, -1)" 
                                style="background: var(--accent-red); color: white; border: none; border-radius: 4px; width: 32px; height: 32px; cursor: pointer;">−</button>
                        <input type="number" class="bulk-quantity-input" data-product-id="${productId}" 
                               value="${quantity}" min="1" max="${product.stock}" 
                               style="width: 80px; text-align: center; padding: 8px; border: 2px solid var(--border-subtle); border-radius: 4px; background: var(--surface-dark); color: var(--text-primary);">
                        <button type="button" onclick="window.bulkOrderManager.adjustQuantity(${productId}, 1)"
                                style="background: var(--brand-green); color: white; border: none; border-radius: 4px; width: 32px; height: 32px; cursor: pointer;">+</button>
                    </div>
                    <div style="margin-left: 16px; text-align: right;">
                        <div style="font-weight: 700; color: var(--brand-green);" class="item-total-${productId}">$${(partnerPrice * quantity).toFixed(2)}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">Subtotal</div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = quantitiesHTML;
        this.updateBulkPricingSummary();
    }

    // Adjust quantity for a product
    adjustQuantity(productId, change) {
        const currentQuantity = this.selectedProducts.get(productId) || 0;
        const newQuantity = Math.max(1, currentQuantity + change);
        
        const products = window.sharedDataManager?.getProducts() || [];
        const product = products.find(p => p.id === productId);
        
        if (product && newQuantity <= product.stock) {
            this.selectedProducts.set(productId, newQuantity);
            
            // Update input
            const input = document.querySelector(`[data-product-id="${productId}"].bulk-quantity-input`);
            if (input) {
                input.value = newQuantity;
            }
            
            this.updateItemTotal(productId, product, newQuantity);
            this.updateBulkPricingSummary();
        } else if (product) {
            showNotification(`⚠️ Maximum ${product.stock} units available for ${product.strain}`, 'warning');
        }
    }

    // Update quantity from input field
    updateQuantityFromInput(input) {
        const productId = parseInt(input.dataset.productId);
        const newQuantity = Math.max(1, parseInt(input.value) || 1);
        
        const products = window.sharedDataManager?.getProducts() || [];
        const product = products.find(p => p.id === productId);
        
        if (product && newQuantity <= product.stock) {
            this.selectedProducts.set(productId, newQuantity);
            this.updateItemTotal(productId, product, newQuantity);
            this.updateBulkPricingSummary();
        } else if (product) {
            input.value = this.selectedProducts.get(productId) || 1;
            showNotification(`⚠️ Maximum ${product.stock} units available for ${product.strain}`, 'warning');
        }
    }

    // Update individual item total
    updateItemTotal(productId, product, quantity) {
        const partnerPrice = Math.round(product.price * 0.8);
        const itemTotal = partnerPrice * quantity;
        
        const totalElement = document.querySelector(`.item-total-${productId}`);
        if (totalElement) {
            totalElement.textContent = `$${itemTotal.toFixed(2)}`;
            totalElement.style.transform = 'scale(1.1)';
            setTimeout(() => {
                totalElement.style.transform = 'scale(1)';
            }, 200);
        }
    }

    // Update bulk pricing summary with discounts
    updateBulkPricingSummary() {
        const products = window.sharedDataManager?.getProducts() || [];
        let totalWeight = 0;
        let subtotal = 0;

        // Calculate totals
        this.selectedProducts.forEach((quantity, productId) => {
            const product = products.find(p => p.id === productId);
            if (product) {
                const partnerPrice = Math.round(product.price * 0.8);
                subtotal += partnerPrice * quantity;
                
                // Calculate weight (assume flower is in lbs, concentrates in grams)
                if (this.getUnitLabel(product.grade) === '/lb') {
                    totalWeight += quantity;
                } else if (this.getUnitLabel(product.grade) === '/g') {
                    totalWeight += quantity / 453.592; // Convert grams to lbs
                }
            }
        });

        // Calculate bulk discount
        let bulkDiscountPercent = 0;
        if (totalWeight >= 100) {
            bulkDiscountPercent = 15;
        } else if (totalWeight >= 50) {
            bulkDiscountPercent = 10;
        } else if (totalWeight >= 20) {
            bulkDiscountPercent = 5;
        }

        const bulkDiscountAmount = subtotal * (bulkDiscountPercent / 100);
        const finalTotal = subtotal - bulkDiscountAmount;

        // Update display
        const elements = {
            'bulkTotalWeight': `${totalWeight.toFixed(1)} lbs`,
            'bulkSubtotal': `$${subtotal.toFixed(2)}`,
            'bulkDiscount': `${bulkDiscountPercent}% (-$${bulkDiscountAmount.toFixed(2)})`,
            'bulkFinalTotal': `$${finalTotal.toFixed(2)}`
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                element.style.transform = 'scale(1.05)';
                setTimeout(() => {
                    element.style.transform = 'scale(1)';
                }, 300);
            }
        });

        // Update discount color based on level
        const discountElement = document.getElementById('bulkDiscount');
        if (discountElement) {
            if (bulkDiscountPercent >= 15) {
                discountElement.style.color = 'var(--accent-lime)';
            } else if (bulkDiscountPercent >= 10) {
                discountElement.style.color = 'var(--brand-green)';
            } else if (bulkDiscountPercent >= 5) {
                discountElement.style.color = 'var(--accent-orange)';
            } else {
                discountElement.style.color = 'var(--text-secondary)';
            }
        }

        return { totalWeight, subtotal, bulkDiscountPercent, bulkDiscountAmount, finalTotal };
    }

    // Apply minimum quantities to reach discount thresholds
    applyMinimumQuantities() {
        const products = window.sharedDataManager?.getProducts() || [];
        let totalWeight = 0;

        // Calculate current weight
        this.selectedProducts.forEach((quantity, productId) => {
            const product = products.find(p => p.id === productId);
            if (product && this.getUnitLabel(product.grade) === '/lb') {
                totalWeight += quantity;
            }
        });

        // Find the next discount threshold
        let targetWeight = 20;
        if (totalWeight >= 20) targetWeight = 50;
        if (totalWeight >= 50) targetWeight = 100;

        if (totalWeight >= 100) {
            showNotification('🎉 You already have maximum bulk discount!', 'success');
            return;
        }

        const weightNeeded = targetWeight - totalWeight;
        showNotification(`📊 Adding ${weightNeeded.toFixed(1)} lbs to reach ${targetWeight}lb threshold...`, 'info');

        // Distribute additional weight across selected flower products
        const flowerProducts = Array.from(this.selectedProducts.keys())
            .map(id => products.find(p => p.id === id))
            .filter(p => p && this.getUnitLabel(p.grade) === '/lb');

        if (flowerProducts.length === 0) {
            showNotification('⚠️ No flower products selected for weight optimization', 'warning');
            return;
        }

        const additionalPerProduct = Math.ceil(weightNeeded / flowerProducts.length);
        
        flowerProducts.forEach(product => {
            const currentQuantity = this.selectedProducts.get(product.id) || 0;
            const newQuantity = Math.min(currentQuantity + additionalPerProduct, product.stock);
            this.selectedProducts.set(product.id, newQuantity);
            
            const input = document.querySelector(`[data-product-id="${product.id}"].bulk-quantity-input`);
            if (input) {
                input.value = newQuantity;
            }
            
            this.updateItemTotal(product.id, product, newQuantity);
        });

        this.updateBulkPricingSummary();
        showNotification('✅ Quantities optimized for bulk discount!', 'success');
    }

    // Optimize for best discount
    optimizeForDiscount() {
        this.applyMinimumQuantities(); // Same logic for now
    }

    // Validate quantities before proceeding
    validateQuantities() {
        const products = window.sharedDataManager?.getProducts() || [];
        
        for (const [productId, quantity] of this.selectedProducts) {
            const product = products.find(p => p.id === productId);
            if (!product) {
                showNotification(`❌ Product ${productId} not found`, 'error');
                return false;
            }
            
            if (quantity <= 0) {
                showNotification(`❌ Invalid quantity for ${product.strain}`, 'error');
                return false;
            }
            
            if (quantity > product.stock) {
                showNotification(`❌ Not enough stock for ${product.strain} (${quantity} requested, ${product.stock} available)`, 'error');
                return false;
            }
        }
        
        return true;
    }

    // Load review step
    loadReviewStep() {
        const container = document.getElementById('bulkOrderReview');
        if (!container) return;

        const products = window.sharedDataManager?.getProducts() || [];
        const pricingSummary = this.updateBulkPricingSummary();

        const reviewHTML = `
            <div style="border: 1px solid var(--border-subtle); border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <h4 style="color: var(--brand-green); margin: 0 0 16px 0;">Order Items (${this.selectedProducts.size} products)</h4>
                ${Array.from(this.selectedProducts.entries()).map(([productId, quantity]) => {
                    const product = products.find(p => p.id === productId);
                    if (!product) return '';
                    
                    const partnerPrice = Math.round(product.price * 0.8);
                    const unitLabel = this.getUnitLabel(product.grade);
                    const itemTotal = partnerPrice * quantity;
                    
                    return `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border-subtle);">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <img src="${product.image || 'https://via.placeholder.com/40x40/1a1a1a/00C851?text=' + encodeURIComponent(product.grade)}"
                                     alt="${product.strain}" style="width: 40px; height: 40px; border-radius: 6px;">
                                <div>
                                    <div style="font-weight: 600; color: var(--text-primary);">${product.strain}</div>
                                    <div style="font-size: 12px; color: var(--text-secondary);">${product.grade} • $${partnerPrice}${unitLabel}</div>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-weight: 600;">Qty: ${quantity}</div>
                                <div style="color: var(--brand-green); font-weight: 700;">$${itemTotal.toFixed(2)}</div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            
            <div style="background: var(--surface-elevated); border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <h4 style="color: var(--brand-green); margin: 0 0 16px 0;">Pricing Summary</h4>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span>Total Weight:</span>
                    <span style="font-weight: 600;">${pricingSummary.totalWeight.toFixed(1)} lbs</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span>Subtotal:</span>
                    <span>$${pricingSummary.subtotal.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span>Bulk Discount (${pricingSummary.bulkDiscountPercent}%):</span>
                    <span style="color: var(--brand-green);">-$${pricingSummary.bulkDiscountAmount.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 700; border-top: 1px solid var(--border-subtle); padding-top: 8px;">
                    <span>Total:</span>
                    <span style="color: var(--brand-green);">$${pricingSummary.finalTotal.toFixed(2)}</span>
                </div>
                ${pricingSummary.totalWeight >= 50 ? '<div style="color: var(--brand-green); font-size: 12px; margin-top: 8px;">✅ Includes FREE overnight shipping!</div>' : ''}
            </div>
        `;

        container.innerHTML = reviewHTML;
    }

    // Save bulk order as preset
    saveBulkPreset() {
        const presetName = document.getElementById('presetName')?.value.trim();
        if (!presetName) {
            showNotification('❌ Please enter a preset name', 'error');
            return;
        }

        if (this.selectedProducts.size === 0) {
            showNotification('❌ No products selected to save', 'error');
            return;
        }

        const preset = {
            id: Date.now().toString(),
            name: presetName,
            products: Array.from(this.selectedProducts.entries()).map(([productId, quantity]) => ({
                productId,
                quantity
            })),
            createdAt: new Date().toISOString(),
            lastUsed: null
        };

        this.bulkPresets.set(preset.id, preset);
        this.savePresets();
        this.updateBulkStats();

        showNotification(`✅ Preset "${presetName}" saved successfully!`, 'success');
    }

    // Submit bulk order (add to cart)
    submitBulkOrder() {
        try {
            if (this.selectedProducts.size === 0) {
                showNotification('❌ No products selected', 'error');
                return;
            }

            // Save as preset if requested
            const saveAsPreset = document.getElementById('saveAsPreset')?.checked;
            if (saveAsPreset) {
                this.saveBulkPreset();
            }

            // Add all products to cart
            const addedProducts = [];
            const products = window.sharedDataManager?.getProducts() || [];

            this.selectedProducts.forEach((quantity, productId) => {
                const product = products.find(p => p.id === productId);
                if (product && window.cartManager) {
                    const success = window.cartManager.addProduct(productId, quantity);
                    if (success) {
                        addedProducts.push(`${product.strain} (x${quantity})`);
                    }
                }
            });

            if (addedProducts.length > 0) {
                // Close bulk order modal
                this.closeBulkOrderModal();
                
                // Show success notification
                showNotification(`🛒 Added ${addedProducts.length} bulk items to cart!`, 'success');
                
                // Update bulk order history
                this.addToBulkHistory(addedProducts);
                
                // Open cart to show items
                setTimeout(() => {
                    if (window.cartManager) {
                        window.cartManager.open();
                    }
                }, 1000);
            } else {
                showNotification('❌ Failed to add products to cart', 'error');
            }

        } catch (error) {
            console.error('Error submitting bulk order:', error);
            showNotification('❌ Error submitting bulk order', 'error');
        }
    }

    // Add to bulk order history
    addToBulkHistory(addedProducts) {
        const pricingSummary = this.updateBulkPricingSummary();
        
        const historyEntry = {
            id: `BULK-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            items: addedProducts.join(', '),
            itemCount: addedProducts.length,
            totalWeight: pricingSummary.totalWeight,
            totalValue: pricingSummary.finalTotal,
            discount: pricingSummary.bulkDiscountPercent,
            status: 'IN_CART',
            createdAt: new Date().toISOString()
        };

        this.bulkOrderHistory.unshift(historyEntry);
        this.saveBulkHistory();
        this.updateBulkStats();
    }

    // Close bulk order modal
    closeBulkOrderModal() {
        closeModal('bulkOrderModal');
        
        // Reset state
        this.currentStep = 1;
        this.selectedProducts.clear();
        this.currentPreset = null;
        
        // Clear preset name input
        const presetNameInput = document.getElementById('presetName');
        if (presetNameInput) {
            presetNameInput.value = '';
        }
        
        const saveAsPresetCheckbox = document.getElementById('saveAsPreset');
        if (saveAsPresetCheckbox) {
            saveAsPresetCheckbox.checked = false;
        }
        
        const presetNameSection = document.getElementById('presetNameSection');
        if (presetNameSection) {
            presetNameSection.style.display = 'none';
        }
    }

    // Preset management functions
    openPresetManager() {
        this.loadPresetsDisplay();
        openModal('presetManagerModal');
    }

    loadPresetsDisplay() {
        const container = document.getElementById('presetsList');
        if (!container) return;

        if (this.bulkPresets.size === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    <div style="font-size: 2rem; margin-bottom: 16px;">📦</div>
                    <h3>No saved presets</h3>
                    <p>Create your first bulk order preset to get started!</p>
                    <button class="btn btn-primary" onclick="window.bulkOrderManager.openBulkOrderModal(); closeModal('presetManagerModal');">Create First Preset</button>
                </div>
            `;
            return;
        }

        const presetsHTML = Array.from(this.bulkPresets.values()).map(preset => `
            <div class="preset-item" style="border: 1px solid var(--border-subtle); border-radius: 8px; padding: 16px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <div>
                        <h4 style="margin: 0; color: var(--text-primary);">${preset.name}</h4>
                        <p style="margin: 4px 0 0 0; color: var(--text-secondary); font-size: 14px;">
                            ${preset.products.length} products • Created ${new Date(preset.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-primary btn-sm" onclick="window.bulkOrderManager.usePreset('${preset.id}')">Use Preset</button>
                        <button class="btn btn-secondary btn-sm" onclick="window.bulkOrderManager.editPreset('${preset.id}')">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="window.bulkOrderManager.deletePreset('${preset.id}')">Delete</button>
                    </div>
                </div>
                <div style="background: var(--surface-elevated); padding: 12px; border-radius: 6px;">
                    <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">Products:</div>
                    ${preset.products.map(p => {
                        const product = (window.sharedDataManager?.getProducts() || []).find(prod => prod.id === p.productId);
                        return product ? `<div style="font-size: 12px; color: var(--text-primary);">• ${product.strain} (${p.quantity}x)</div>` : '';
                    }).join('')}
                </div>
            </div>
        `).join('');

        container.innerHTML = presetsHTML;
    }

    // Use a saved preset
    usePreset(presetId) {
        const preset = this.bulkPresets.get(presetId);
        if (!preset) return;

        // Update last used
        preset.lastUsed = new Date().toISOString();
        this.savePresets();

        // Close preset manager and open bulk order with preset
        closeModal('presetManagerModal');
        this.openBulkOrderModal();

        // Load preset data after a short delay
        setTimeout(() => {
            this.clearBulkSelection();
            
            preset.products.forEach(presetProduct => {
                const checkbox = document.querySelector(`[data-product-id="${presetProduct.productId}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                    this.selectedProducts.set(presetProduct.productId, presetProduct.quantity);
                    this.toggleProductSelection(checkbox);
                }
            });

            showNotification(`📦 Loaded preset: ${preset.name}`, 'success');
        }, 500);
    }

    // Delete a preset
    deletePreset(presetId) {
        const preset = this.bulkPresets.get(presetId);
        if (!preset) return;

        if (confirm(`Are you sure you want to delete the preset "${preset.name}"? This action cannot be undone.`)) {
            this.bulkPresets.delete(presetId);
            this.savePresets();
            this.loadPresetsDisplay();
            this.updateBulkStats();
            showNotification(`🗑️ Preset "${preset.name}" deleted`, 'success');
        }
    }

    // Bulk order history functions
    viewBulkHistory() {
        this.loadBulkHistoryDisplay();
        openModal('bulkHistoryModal');
    }

    loadBulkHistoryDisplay() {
        const tbody = document.getElementById('bulkHistoryBody');
        if (!tbody) return;

        if (this.bulkOrderHistory.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                        <div style="font-size: 2rem; margin-bottom: 16px;">📦</div>
                        <div>No bulk order history found</div>
                        <div style="font-size: 14px; margin-top: 8px;">Create your first bulk order to see history here!</div>
                    </td>
                </tr>
            `;
            return;
        }

        const historyHTML = this.bulkOrderHistory.map(order => `
            <tr>
                <td><strong>${order.id}</strong></td>
                <td>${order.date}</td>
                <td>
                    <div style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${order.items}</div>
                    <small style="color: var(--text-muted);">${order.itemCount} products</small>
                </td>
                <td><strong>${order.totalWeight.toFixed(1)} lbs</strong></td>
                <td style="color: var(--brand-green); font-weight: 600;">$${order.totalValue.toFixed(2)}</td>
                <td style="color: var(--brand-green);">${order.discount}%</td>
                <td><span class="status-${order.status.toLowerCase().replace('_', '')}">${order.status.replace('_', ' ')}</span></td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="window.bulkOrderManager.reorderBulk('${order.id}')">🔄 Reorder</button>
                </td>
            </tr>
        `).join('');

        tbody.innerHTML = historyHTML;
    }

    // Reorder from bulk history (create preset from history entry)
    reorderBulk(orderId) {
        showNotification('🔄 Bulk reorder feature coming soon!', 'info');
    }

    // Storage functions
    savePresets() {
        try {
            const presetsData = Array.from(this.bulkPresets.entries());
            localStorage.setItem('fadedSkiesBulkPresets', JSON.stringify(presetsData));
        } catch (error) {
            console.error('Error saving presets:', error);
        }
    }

    loadPresets() {
        try {
            const saved = localStorage.getItem('fadedSkiesBulkPresets');
            if (saved) {
                const presetsData = JSON.parse(saved);
                this.bulkPresets = new Map(presetsData);
            }
        } catch (error) {
            console.error('Error loading presets:', error);
            this.bulkPresets = new Map();
        }
    }

    saveBulkHistory() {
        try {
            localStorage.setItem('fadedSkiesBulkHistory', JSON.stringify(this.bulkOrderHistory));
        } catch (error) {
            console.error('Error saving bulk history:', error);
        }
    }

    loadBulkHistory() {
        try {
            const saved = localStorage.getItem('fadedSkiesBulkHistory');
            if (saved) {
                this.bulkOrderHistory = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Error loading bulk history:', error);
            this.bulkOrderHistory = [];
        }
    }

    // Update bulk order statistics
    updateBulkStats() {
        // Update stats in the bulk orders tab
        const statsElements = {
            'bulkOrdersCount': this.bulkOrderHistory.length,
            'savedPresetsCount': this.bulkPresets.size,
            'totalBulkValue': this.bulkOrderHistory.reduce((sum, order) => sum + order.totalValue, 0)
        };

        Object.entries(statsElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                if (id === 'totalBulkValue') {
                    element.textContent = `$${value.toFixed(0)}`;
                } else {
                    element.textContent = value;
                }
            }
        });

        // Update saved presets display in the bulk tab
        this.updateSavedPresetsSection();
    }

    // Update saved presets section in bulk tab
    updateSavedPresetsSection() {
        const container = document.getElementById('savedPresetsList');
        if (!container) return;

        if (this.bulkPresets.size === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--text-secondary); border: 2px dashed var(--border-subtle); border-radius: 8px;">
                    <div style="font-size: 1.5rem; margin-bottom: 8px;">📦</div>
                    <div>No saved presets</div>
                    <div style="font-size: 12px; margin-top: 4px;">Create your first bulk order to save a preset!</div>
                </div>
            `;
            return;
        }

        const presetsHTML = Array.from(this.bulkPresets.values()).slice(0, 3).map(preset => `
            <div class="preset-card" style="border: 1px solid var(--border-subtle); border-radius: 8px; padding: 12px; cursor: pointer; transition: all 0.3s ease;"
                 onclick="window.bulkOrderManager.usePreset('${preset.id}')"
                 onmouseover="this.style.borderColor='var(--brand-green)'; this.style.transform='translateY(-2px)'"
                 onmouseout="this.style.borderColor='var(--border-subtle)'; this.style.transform='translateY(0)'">
                <h5 style="margin: 0 0 8px 0; color: var(--text-primary);">${preset.name}</h5>
                <p style="margin: 0; color: var(--text-secondary); font-size: 12px;">
                    ${preset.products.length} products • ${preset.lastUsed ? 'Last used ' + new Date(preset.lastUsed).toLocaleDateString() : 'Never used'}
                </p>
                <div style="margin-top: 8px;">
                    <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); window.bulkOrderManager.usePreset('${preset.id}')" style="font-size: 11px; padding: 4px 8px;">Use Preset</button>
                </div>
            </div>
        `).join('');

        if (this.bulkPresets.size > 3) {
            container.innerHTML = presetsHTML + `
                <div style="display: flex; align-items: center; justify-content: center; border: 2px dashed var(--border-subtle); border-radius: 8px; padding: 20px; cursor: pointer; transition: all 0.3s ease;"
                     onclick="window.bulkOrderManager.openPresetManager()"
                     onmouseover="this.style.borderColor='var(--brand-green)'"
                     onmouseout="this.style.borderColor='var(--border-subtle)'">
                    <div style="text-align: center; color: var(--text-secondary);">
                        <div style="font-size: 1.2rem; margin-bottom: 4px;">➕</div>
                        <div style="font-size: 12px;">View all ${this.bulkPresets.size} presets</div>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = presetsHTML;
        }
    }

    // Utility functions
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

    // Export/Import functions
    exportAllPresets() {
        if (this.bulkPresets.size === 0) {
            showNotification('📦 No presets to export', 'warning');
            return;
        }

        const exportData = {
            presets: Array.from(this.bulkPresets.values()),
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `faded-skies-bulk-presets-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        showNotification('📤 Presets exported successfully!', 'success');
    }

    importPreset() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importData = JSON.parse(e.target.result);
                    if (importData.presets && Array.isArray(importData.presets)) {
                        let imported = 0;
                        importData.presets.forEach(preset => {
                            if (preset.id && preset.name && preset.products) {
                                // Generate new ID to avoid conflicts
                                const newPreset = {
                                    ...preset,
                                    id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
                                    importedAt: new Date().toISOString()
                                };
                                this.bulkPresets.set(newPreset.id, newPreset);
                                imported++;
                            }
                        });

                        if (imported > 0) {
                            this.savePresets();
                            this.updateBulkStats();
                            this.loadPresetsDisplay();
                            showNotification(`✅ Imported ${imported} presets successfully!`, 'success');
                        } else {
                            showNotification('❌ No valid presets found in file', 'error');
                        }
                    } else {
                        showNotification('❌ Invalid preset file format', 'error');
                    }
                } catch (error) {
                    console.error('Import error:', error);
                    showNotification('❌ Error importing presets', 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
}

// Initialize bulk order manager
if (typeof window !== 'undefined') {
    window.BulkOrderManager = BulkOrderManager;

    // Immediately define placeholder functions to prevent undefined errors
    window.closeBulkOrderModal = window.closeBulkOrderModal || function() {
        console.warn('Bulk order manager not ready yet');
        if (document.getElementById('bulkOrderModal')) {
            document.getElementById('bulkOrderModal').style.display = 'none';
            document.body.classList.remove('modal-open');
        }
    };
    window.nextBulkStep = window.nextBulkStep || function() { console.warn('Bulk order manager not ready yet'); };
    window.previousBulkStep = window.previousBulkStep || function() { console.warn('Bulk order manager not ready yet'); };
    window.selectAllBulkProducts = window.selectAllBulkProducts || function() { console.warn('Bulk order manager not ready yet'); };
    window.clearBulkSelection = window.clearBulkSelection || function() { console.warn('Bulk order manager not ready yet'); };
    window.loadPresetSelection = window.loadPresetSelection || function() { console.warn('Bulk order manager not ready yet'); };
    window.applyMinimumQuantities = window.applyMinimumQuantities || function() { console.warn('Bulk order manager not ready yet'); };
    window.optimizeForDiscount = window.optimizeForDiscount || function() { console.warn('Bulk order manager not ready yet'); };
    window.saveBulkPreset = window.saveBulkPreset || function() { console.warn('Bulk order manager not ready yet'); };
    window.submitBulkOrder = window.submitBulkOrder || function() { console.warn('Bulk order manager not ready yet'); };

    // Initialize immediately if DOM is already loaded, otherwise wait
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeBulkManager);
    } else {
        initializeBulkManager();
    }

    function initializeBulkManager() {
        if (!window.bulkOrderManager) {
            window.bulkOrderManager = new BulkOrderManager();
            console.log('📦 Bulk Order Manager initialized');

            // Now replace placeholder functions with actual implementations
            setupBulkOrderGlobalFunctions();
        }
    }

    function setupBulkOrderGlobalFunctions() {
        // Replace all global functions with actual implementations
        window.openBulkOrderModal = () => window.bulkOrderManager?.openBulkOrderModal();
        window.openPresetManager = () => window.bulkOrderManager?.openPresetManager();
        window.viewBulkHistory = () => window.bulkOrderManager?.viewBulkHistory();
        window.closeBulkOrderModal = () => window.bulkOrderManager?.closeBulkOrderModal();
        window.nextBulkStep = () => window.bulkOrderManager?.nextBulkStep();
        window.previousBulkStep = () => window.bulkOrderManager?.previousBulkStep();
        window.selectAllBulkProducts = () => window.bulkOrderManager?.selectAllBulkProducts();
        window.clearBulkSelection = () => window.bulkOrderManager?.clearBulkSelection();
        window.loadPresetSelection = () => window.bulkOrderManager?.loadPresetSelection();
        window.applyMinimumQuantities = () => window.bulkOrderManager?.applyMinimumQuantities();
        window.optimizeForDiscount = () => window.bulkOrderManager?.optimizeForDiscount();
        window.saveBulkPreset = () => window.bulkOrderManager?.saveBulkPreset();
        window.submitBulkOrder = () => window.bulkOrderManager?.submitBulkOrder();
        window.createNewPreset = () => {
            if (window.bulkOrderManager) {
                window.closeModal('presetManagerModal');
                window.bulkOrderManager.openBulkOrderModal();
            }
        };
        window.importPreset = () => window.bulkOrderManager?.importPreset();
        window.exportAllPresets = () => window.bulkOrderManager?.exportAllPresets();

        console.log('✅ Bulk order global functions initialized');
    }
}
