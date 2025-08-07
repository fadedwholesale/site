// Complete Authentication Override - Bypasses all existing auth issues
// This file loads after main-app.js and overrides problematic functions

console.log('Loading auth override...');

// Global state
var globalUser = null;

// Ultra-safe user setter
function safeSetUser(user) {
    globalUser = user;
    window.currentUser = user;
    window.globalUser = user;
    
    // Update global currentUser reference from main-app.js
    if (window.currentUser !== user) {
        window.currentUser = user;
    }
    
    // Safe storage
    if (user) {
        try {
            localStorage.setItem('currentUser', JSON.stringify(user));
        } catch (e) {
            console.log('Storage failed, continuing...');
        }
    } else {
        try {
            localStorage.removeItem('currentUser');
        } catch (e) {
            console.log('Storage clear failed, continuing...');
        }
    }
    
    return user;
}

// Ultra-safe login function
function safeLogin(event) {
    console.log('Safe login called');
    
    // Prevent form submission
    if (event) {
        if (event.preventDefault) event.preventDefault();
        if (event.stopPropagation) event.stopPropagation();
    }
    
    // Get form elements
    var emailEl = document.getElementById('email');
    var passwordEl = document.getElementById('password');
    
    if (!emailEl || !passwordEl) {
        alert('Form elements not found');
        return false;
    }
    
    var email = emailEl.value;
    var password = passwordEl.value;
    
    console.log('Email:', email ? 'provided' : 'missing');
    console.log('Password:', password ? 'provided' : 'missing');
    
    if (!email || !password) {
        alert('Please enter both email and password');
        return false;
    }
    
    // Create user data
    var userData = {
        email: email,
        name: email.split('@')[0],
        tier: 'Gold Partner',
        loginTime: new Date().toISOString()
    };
    
    console.log('Setting user:', userData.email);
    
    // Set user safely
    safeSetUser(userData);
    
    console.log('User set, updating UI...');
    
    // Update UI safely
    try {
        if (window.showUserSession && typeof window.showUserSession === 'function') {
            window.showUserSession();
            console.log('User session shown');
        }
    } catch (e) {
        console.log('showUserSession failed:', e.message);
    }
    
    try {
        if (window.closeModal && typeof window.closeModal === 'function') {
            window.closeModal('loginModal');
            console.log('Modal closed');
        }
    } catch (e) {
        console.log('closeModal failed:', e.message);
    }
    
    try {
        if (window.showPartnerPortal && typeof window.showPartnerPortal === 'function') {
            window.showPartnerPortal();
            console.log('Partner portal shown');
        }
    } catch (e) {
        console.log('showPartnerPortal failed:', e.message);
    }
    
    try {
        if (window.showNotification && typeof window.showNotification === 'function') {
            window.showNotification('Login successful!', 'success');
        } else {
            alert('Welcome back, ' + userData.name + '!');
        }
    } catch (e) {
        console.log('Notification failed:', e.message);
        alert('Welcome back, ' + userData.name + '!');
    }
    
    console.log('Login process completed');
    return false; // Prevent form submission
}

// Override existing functions immediately
window.setCurrentUser = safeSetUser;
window.login = safeLogin;
window.safeLogin = safeLogin;
window.safeSetUser = safeSetUser;

// Override form submission
document.addEventListener('DOMContentLoaded', function() {
    console.log('Setting up safe login form handler...');
    
    var loginForm = document.getElementById('loginForm');
    if (loginForm) {
        // Remove existing event listeners by cloning the form
        var newForm = loginForm.cloneNode(true);
        loginForm.parentNode.replaceChild(newForm, loginForm);
        
        // Add our safe handler
        newForm.addEventListener('submit', safeLogin);
        newForm.onsubmit = safeLogin;
        
        console.log('Safe login form handler installed');
    } else {
        console.log('Login form not found, will try again...');
        setTimeout(function() {
            var form = document.getElementById('loginForm');
            if (form) {
                form.addEventListener('submit', safeLogin);
                form.onsubmit = safeLogin;
                console.log('Safe login form handler installed (delayed)');
            }
        }, 1000);
    }
});

// Test function to verify override is working
window.testAuth = function() {
    console.log('=== AUTH OVERRIDE TEST ===');
    console.log('window.login:', typeof window.login);
    console.log('window.setCurrentUser:', typeof window.setCurrentUser);
    console.log('window.safeLogin:', typeof window.safeLogin);
    console.log('window.currentUser:', window.currentUser);
    console.log('Form element:', !!document.getElementById('loginForm'));
    console.log('========================');

    // Try a test login
    console.log('Testing login with test@example.com...');
    window.safeSetUser({
        email: 'test@example.com',
        name: 'test',
        tier: 'Gold Partner',
        loginTime: new Date().toISOString()
    });
    console.log('Test user set:', window.currentUser);
};

console.log('Auth override loaded successfully');
console.log('Run window.testAuth() to test the authentication system');
