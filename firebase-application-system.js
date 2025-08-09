// Firebase Business Application System for Faded Skies Portal
// Real-time application processing with live admin notifications

class FirebaseApplicationManager {
    constructor() {
        this.firebaseManager = null;
        this.currentStep = 1;
        this.applicationData = {};
        this.uploadedDocuments = [];
        this.isSubmitting = false;
        
        this.initialize();
    }

    async initialize() {
        console.log('📝 Initializing Firebase Application Manager...');
        
        // Wait for Firebase to initialize
        if (window.firebaseDataManager) {
            this.firebaseManager = window.firebaseDataManager;
            this.setupAdminSubscriptions();
        } else {
            window.addEventListener('firebaseInitialized', (event) => {
                this.firebaseManager = event.detail.manager;
                this.setupAdminSubscriptions();
            });
        }
        
        console.log('✅ Firebase Application Manager initialized');
    }

    setupAdminSubscriptions() {
        // Set up real-time subscription for admin portal
        if (this.isAdminPortal()) {
            this.firebaseManager.subscribeToApplications((applications) => {
                this.updateAdminApplicationsDisplay(applications);
            });

            this.firebaseManager.subscribeToAdminNotifications((notifications) => {
                this.handleAdminNotifications(notifications);
            });
        }
    }

    isAdminPortal() {
        return window.location.href.includes('admin') || 
               document.title.includes('Admin') ||
               document.getElementById('adminDashboard');
    }

    // BUSINESS APPLICATION SUBMISSION
    async submitBusinessApplication(formData) {
        if (this.isSubmitting) {
            this.showNotification('⏳ Application already being submitted...', 'warning');
            return false;
        }

        this.isSubmitting = true;

        try {
            // Validate form data
            const validation = this.validateApplicationData(formData);
            if (!validation.valid) {
                this.showNotification(`❌ ${validation.message}`, 'error');
                this.isSubmitting = false;
                return false;
            }

            // Prepare application data for Firebase
            const applicationData = {
                // Business Information
                businessName: formData.businessName,
                contactName: formData.contactName,
                businessEmail: formData.businessEmail,
                phone: formData.phone,
                businessAddress: formData.businessAddress,
                businessType: formData.businessType,
                licenseNumber: formData.licenseNumber,
                estimatedMonthlyVolume: formData.estimatedMonthlyVolume,
                yearsInBusiness: formData.yearsInBusiness || '',
                businessDescription: formData.businessDescription || '',
                
                // Additional fields
                taxId: formData.taxId || '',
                website: formData.website || '',
                
                // Documents
                documents: this.uploadedDocuments,
                
                // Status and tracking
                status: 'pending',
                priority: this.calculateApplicationPriority(formData),
                applicationId: this.generateApplicationId(),
                
                // Metadata
                submissionIP: await this.getClientIP(),
                userAgent: navigator.userAgent,
                referralSource: document.referrer || 'direct',
                
                // Timestamps
                submittedAt: new Date().toISOString(),
                lastModified: new Date().toISOString()
            };

            // Submit to Firebase
            const result = await this.firebaseManager.submitBusinessApplication(applicationData);
            
            this.showNotification(`🎉 Application submitted successfully! Application ID: ${result.id}`, 'success');
            
            setTimeout(() => {
                this.showNotification('📧 Confirmation email sent to your business email', 'success');
            }, 2000);

            setTimeout(() => {
                this.showNotification('👨‍💼 Our team will review your application within 24-48 hours', 'info');
            }, 4000);

            // Reset form
            this.resetApplicationForm();
            
            // Close modal
            if (typeof closeModal === 'function') {
                closeModal('registerModal');
            }

            this.isSubmitting = false;
            return result;

        } catch (error) {
            console.error('Application submission error:', error);
            this.showNotification('❌ Application submission failed. Please try again.', 'error');
            this.isSubmitting = false;
            return false;
        }
    }

    validateApplicationData(formData) {
        const requiredFields = [
            'businessName',
            'contactName', 
            'businessEmail',
            'phone',
            'businessAddress',
            'businessType',
            'licenseNumber',
            'estimatedMonthlyVolume'
        ];

        for (const field of requiredFields) {
            if (!formData[field] || !formData[field].toString().trim()) {
                return {
                    valid: false,
                    message: `${this.getFieldLabel(field)} is required`
                };
            }
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.businessEmail)) {
            return {
                valid: false,
                message: 'Please enter a valid business email address'
            };
        }

        // Phone validation
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(formData.phone.replace(/[\s\-\(\)]/g, ''))) {
            return {
                valid: false,
                message: 'Please enter a valid phone number'
            };
        }

        // Document validation
        if (this.uploadedDocuments.length < 3) {
            return {
                valid: false,
                message: 'Please upload all required documents (Business License, Cannabis License, Tax ID)'
            };
        }

        return { valid: true };
    }

    getFieldLabel(fieldName) {
        const labels = {
            businessName: 'Business Name',
            contactName: 'Contact Name',
            businessEmail: 'Business Email',
            phone: 'Phone Number',
            businessAddress: 'Business Address',
            businessType: 'Business Type',
            licenseNumber: 'License Number',
            estimatedMonthlyVolume: 'Estimated Monthly Volume'
        };
        return labels[fieldName] || fieldName;
    }

    calculateApplicationPriority(formData) {
        let priority = 'normal';
        
        // High priority criteria
        if (formData.estimatedMonthlyVolume && parseFloat(formData.estimatedMonthlyVolume.replace(/[^0-9.]/g, '')) > 10000) {
            priority = 'high';
        }
        
        if (formData.yearsInBusiness && parseInt(formData.yearsInBusiness) > 5) {
            priority = 'high';
        }
        
        if (formData.businessType === 'dispensary' || formData.businessType === 'distributor') {
            priority = 'high';
        }
        
        return priority;
    }

    generateApplicationId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9).toUpperCase();
        return `APP-${timestamp}-${random}`;
    }

    async getClientIP() {
        try {
            // In production, you might want to use a proper IP service
            return 'demo-ip-address';
        } catch (error) {
            return 'unknown';
        }
    }

    // DOCUMENT HANDLING
    handleFileUpload(input, documentType) {
        const files = Array.from(input.files);
        
        files.forEach(file => {
            // Validate file
            if (!this.validateUploadedFile(file)) {
                return;
            }

            // Process file
            const fileData = {
                name: file.name,
                size: file.size,
                type: file.type,
                documentType: documentType,
                uploadedAt: new Date().toISOString(),
                // In production, you'd upload to Firebase Storage and store the URL
                dataUrl: URL.createObjectURL(file)
            };

            this.uploadedDocuments.push(fileData);
            this.updateDocumentPreview(documentType, fileData);
        });

        // Update proceed button state
        this.updateProceedButtonState();
    }

    validateUploadedFile(file) {
        // File size validation (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showNotification('❌ File size must be less than 10MB', 'error');
            return false;
        }

        // File type validation
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            this.showNotification('❌ File must be PDF, JPG, or PNG format', 'error');
            return false;
        }

        return true;
    }

    updateDocumentPreview(documentType, fileData) {
        const previewContainer = document.getElementById(documentType + 'Preview');
        if (previewContainer) {
            previewContainer.innerHTML = `
                <div class="file-preview-item">
                    <div class="file-info">
                        <span class="file-icon">📄</span>
                        <div class="file-details">
                            <div class="file-name">${fileData.name}</div>
                            <div class="file-size">${(fileData.size / 1024 / 1024).toFixed(2)} MB</div>
                        </div>
                        <span class="file-status">✅</span>
                    </div>
                </div>
            `;
        }
    }

    updateProceedButtonState() {
        const proceedButton = document.querySelector('[onclick="nextRegistrationStep()"]');
        if (proceedButton) {
            const requiredDocs = ['businessLicense', 'cannabisLicense', 'taxId'];
            const uploadedDocTypes = this.uploadedDocuments.map(doc => doc.documentType);
            const allRequiredDocsUploaded = requiredDocs.every(docType => uploadedDocTypes.includes(docType));
            
            if (allRequiredDocsUploaded) {
                proceedButton.disabled = false;
                proceedButton.style.background = 'var(--brand-green)';
                proceedButton.textContent = 'Continue to Review ➡️';
            } else {
                proceedButton.disabled = true;
                proceedButton.style.background = '#666';
                proceedButton.textContent = 'Upload All Documents';
            }
        }
    }

    // ADMIN PORTAL INTEGRATION
    updateAdminApplicationsDisplay(applications) {
        const applicationsTable = document.getElementById('applicationsBody');
        if (!applicationsTable) return;

        if (applications.length === 0) {
            applicationsTable.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No applications found</td></tr>';
            return;
        }

        applicationsTable.innerHTML = applications.map(app => {
            const submittedDate = new Date(app.submittedAt).toLocaleDateString();
            const statusClass = `status-${app.status.toLowerCase()}`;
            const priorityBadge = app.priority === 'high' ? '<span style="background: var(--accent-red); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px;">HIGH</span>' : '';
            
            return `
                <tr class="application-row" data-app-id="${app.id}">
                    <td><strong>${app.applicationId || app.id}</strong></td>
                    <td>
                        <strong>${app.businessName}</strong><br>
                        <small style="color: var(--text-muted);">${app.businessType}</small>
                    </td>
                    <td>
                        <strong>${app.contactName}</strong><br>
                        <small style="color: var(--text-muted);">${app.businessEmail}</small>
                    </td>
                    <td>${app.licenseNumber}</td>
                    <td>${app.estimatedMonthlyVolume}</td>
                    <td>
                        <span class="${statusClass}">${app.status.toUpperCase()}</span>
                        ${priorityBadge}
                    </td>
                    <td>${submittedDate}</td>
                    <td>
                        <button class="btn btn-sm btn-secondary" onclick="window.firebaseApplicationManager.viewApplication('${app.id}')">👁️ View</button>
                        <button class="btn btn-sm btn-primary" onclick="window.firebaseApplicationManager.reviewApplication('${app.id}')">📋 Review</button>
                    </td>
                </tr>
            `;
        }).join('');

        // Update application statistics
        this.updateApplicationStats(applications);
    }

    updateApplicationStats(applications) {
        const pending = applications.filter(app => app.status === 'pending').length;
        const approved = applications.filter(app => app.status === 'approved').length;
        const rejected = applications.filter(app => app.status === 'rejected').length;
        const high_priority = applications.filter(app => app.priority === 'high').length;

        this.updateStatCard('pendingApplications', pending);
        this.updateStatCard('approvedApplications', approved);
        this.updateStatCard('rejectedApplications', rejected);
        this.updateStatCard('highPriorityApplications', high_priority);
    }

    updateStatCard(statId, value) {
        const statElement = document.getElementById(statId);
        if (statElement) {
            statElement.textContent = value;
            statElement.classList.add('stat-updated');
            setTimeout(() => {
                statElement.classList.remove('stat-updated');
            }, 1000);
        }
    }

    async viewApplication(applicationId) {
        try {
            // This would fetch the full application details
            this.showNotification(`📋 Viewing application ${applicationId}`, 'info');
            // In a real implementation, you'd open a detailed view modal
        } catch (error) {
            console.error('Error viewing application:', error);
            this.showNotification('❌ Error loading application details', 'error');
        }
    }

    async reviewApplication(applicationId) {
        try {
            const action = prompt('Enter action (approve/reject/pending):');
            if (!action) return;

            const notes = prompt('Enter review notes (optional):') || '';

            await this.firebaseManager.updateApplicationStatus(applicationId, action.toLowerCase(), notes);
            this.showNotification(`✅ Application ${action}d successfully`, 'success');

        } catch (error) {
            console.error('Error reviewing application:', error);
            this.showNotification('❌ Error updating application status', 'error');
        }
    }

    handleAdminNotifications(notifications) {
        // Handle new application notifications
        const newApplications = notifications.filter(n => 
            n.type === 'new_application' && !n.read
        );

        if (newApplications.length > 0) {
            newApplications.forEach(notification => {
                this.showNotification(`📝 New business application from ${notification.data.businessName}`, 'info');
            });
        }
    }

    // FORM MANAGEMENT
    resetApplicationForm() {
        this.currentStep = 1;
        this.applicationData = {};
        this.uploadedDocuments = [];
        
        // Reset form steps
        document.querySelectorAll('[id^="registrationStep"]').forEach(step => {
            step.style.display = 'none';
        });
        document.getElementById('registrationStep1').style.display = 'block';
        
        // Reset progress
        this.updateApplicationProgress(1);
        
        // Clear form fields
        document.querySelectorAll('#registerModal input, #registerModal textarea, #registerModal select').forEach(field => {
            field.value = '';
        });
        
        // Clear document previews
        document.querySelectorAll('[id$="Preview"]').forEach(preview => {
            preview.innerHTML = '';
        });
    }

    updateApplicationProgress(step) {
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
                stepDiv.style.background = 'var(--brand-green)';
                stepDiv.textContent = '✓';
            } else if (stepNumber === step) {
                stepDiv.style.background = 'var(--brand-green)';
                stepDiv.textContent = stepNumber;
            } else {
                stepDiv.style.background = 'var(--border-subtle)';
                stepDiv.textContent = stepNumber;
            }
        });
    }

    showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
}

// Initialize Firebase Application Manager
window.firebaseApplicationManager = new FirebaseApplicationManager();

// Make methods globally available
window.submitBusinessApplication = (formData) => window.firebaseApplicationManager?.submitBusinessApplication(formData);
window.handleFileUpload = (input, documentType) => window.firebaseApplicationManager?.handleFileUpload(input, documentType);

console.log('📝 Firebase Application System initialized');
