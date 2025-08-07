// Minimal Authentication Functions - No special characters or complex operations

// Global user state
var currentUser = null;

// Simple user setter
function setUser(user) {
    currentUser = user;
    window.currentUser = user;
    
    if (user) {
        try {
            localStorage.setItem('currentUser', JSON.stringify(user));
            console.log('User set:', user.email);
        } catch (e) {
            console.log('Storage failed');
        }
    } else {
        try {
            localStorage.removeItem('currentUser');
            console.log('User cleared');
        } catch (e) {
            console.log('Storage clear failed');
        }
    }
}

// Simple login function
function simpleLogin(event) {
    if (event && event.preventDefault) {
        event.preventDefault();
    }
    
    try {
        var emailEl = document.getElementById('email');
        var passwordEl = document.getElementById('password');
        
        if (!emailEl || !passwordEl) {
            alert('Form elements not found');
            return;
        }
        
        var email = emailEl.value;
        var password = passwordEl.value;
        
        if (email && password) {
            var userData = {
                email: email,
                name: email.split('@')[0],
                tier: 'Gold Partner',
                loginTime: new Date().toISOString()
            };
            
            setUser(userData);
            
            // Update UI
            if (window.showUserSession) {
                window.showUserSession();
            }
            
            if (window.closeModal) {
                window.closeModal('loginModal');
            }
            
            if (window.showPartnerPortal) {
                window.showPartnerPortal();
            }
            
            if (window.showNotification) {
                window.showNotification('Welcome back, ' + userData.name + '!', 'success');
            }
            
            console.log('Login successful');
        } else {
            if (window.showNotification) {
                window.showNotification('Please enter credentials', 'error');
            } else {
                alert('Please enter credentials');
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed');
    }
}

// Override the main login function
window.login = simpleLogin;
window.setCurrentUser = setUser;

console.log('Minimal auth loaded');
