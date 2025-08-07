// Modern Authentication System with Live Sync
// Real-time state management and cross-tab synchronization

class AuthenticationManager {
    constructor() {
        this.state = {
            user: null,
            isAuthenticated: false,
            sessionId: null,
            loginTime: null,
            lastActivity: null
        };
        
        this.listeners = new Set();
        this.storageKey = 'faded-skies-auth';
        this.activityKey = 'faded-skies-activity';
        
        this.init();
    }

    init() {
        console.log('🔐 Initializing Authentication Manager...');
        
        // Set up cross-tab sync listener
        this.setupCrossTabSync();
        
        // Set up activity tracking
        this.setupActivityTracking();
        
        // Restore session if exists
        this.restoreSession();
        
        // Set up auto-logout on inactivity
        this.setupAutoLogout();
        
        console.log('✅ Authentication Manager initialized');
    }

    setupCrossTabSync() {
        window.addEventListener('storage', (event) => {
            if (event.key === this.storageKey) {
                console.log('🔄 Auth state changed in another tab');
                this.handleExternalAuthChange(event.newValue);
            } else if (event.key === this.activityKey) {
                this.updateLastActivity(JSON.parse(event.newValue || '{}').timestamp);
            }
        });

        // Listen for focus events to sync state
        window.addEventListener('focus', () => {
            this.syncWithStorage();
        });
    }

    setupActivityTracking() {
        const trackActivity = () => {
            if (this.state.isAuthenticated) {
                this.updateActivity();
            }
        };

        // Track user activity
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, trackActivity, { passive: true });
        });

        // Track activity every 30 seconds
        setInterval(trackActivity, 30000);
    }

    setupAutoLogout() {
        // Check for inactivity every minute
        setInterval(() => {
            if (this.state.isAuthenticated && this.isInactive()) {
                console.log('⏰ Auto-logout due to inactivity');
                this.logout('INACTIVE');
            }
        }, 60000);
    }

    handleExternalAuthChange(newValue) {
        try {
            const newState = newValue ? JSON.parse(newValue) : null;
            
            if (!newState && this.state.isAuthenticated) {
                // User logged out in another tab
                this.state = {
                    user: null,
                    isAuthenticated: false,
                    sessionId: null,
                    loginTime: null,
                    lastActivity: null
                };
                this.notifyListeners('logout', { reason: 'EXTERNAL' });
            } else if (newState && !this.state.isAuthenticated) {
                // User logged in in another tab
                this.state = { ...newState };
                this.notifyListeners('login', { user: this.state.user });
            }
        } catch (error) {
            console.error('Error handling external auth change:', error);
        }
    }

    syncWithStorage() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const storedState = JSON.parse(stored);
                if (storedState.sessionId !== this.state.sessionId) {
                    console.log('🔄 Syncing auth state from storage');
                    this.state = { ...storedState };
                    this.notifyListeners('sync', { user: this.state.user });
                }
            }
        } catch (error) {
            console.error('Error syncing with storage:', error);
        }
    }

    restoreSession() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const authData = JSON.parse(stored);
                
                // Check if session is still valid (24 hours)
                const sessionAge = Date.now() - new Date(authData.loginTime).getTime();
                const maxAge = 24 * 60 * 60 * 1000; // 24 hours
                
                if (sessionAge < maxAge) {
                    this.state = { ...authData };
                    console.log('✅ Session restored for:', this.state.user?.email);
                    this.notifyListeners('restore', { user: this.state.user });
                    return true;
                } else {
                    console.log('⏰ Session expired, clearing');
                    this.clearSession();
                }
            }
        } catch (error) {
            console.error('Error restoring session:', error);
            this.clearSession();
        }
        return false;
    }

    async login(credentials) {
        console.log('🔐 Attempting login...', { email: credentials.email });
        
        try {
            // Simulate authentication (in real app, this would be an API call)
            const authResult = await this.authenticateUser(credentials);
            
            if (authResult.success) {
                const sessionId = this.generateSessionId();
                const now = new Date().toISOString();
                
                this.state = {
                    user: authResult.user,
                    isAuthenticated: true,
                    sessionId: sessionId,
                    loginTime: now,
                    lastActivity: now
                };
                
                this.saveSession();
                this.updateActivity();
                
                console.log('✅ Login successful:', this.state.user.email);
                this.notifyListeners('login', { user: this.state.user });
                
                return { success: true, user: this.state.user };
            } else {
                console.log('❌ Login failed:', authResult.error);
                return { success: false, error: authResult.error };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Authentication failed' };
        }
    }

    async authenticateUser(credentials) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simple validation (in real app, this would be server-side)
        if (credentials.email && credentials.password) {
            const user = {
                id: this.generateUserId(),
                email: credentials.email,
                name: credentials.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ''),
                tier: 'Gold Partner',
                permissions: ['view_products', 'place_orders', 'view_history'],
                avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${credentials.email}`,
                joinDate: new Date().toISOString()
            };
            
            return { success: true, user };
        }
        
        return { success: false, error: 'Invalid credentials' };
    }

    logout(reason = 'USER') {
        console.log('🔐 Logging out...', { reason });
        
        const wasAuthenticated = this.state.isAuthenticated;
        const user = this.state.user;
        
        this.state = {
            user: null,
            isAuthenticated: false,
            sessionId: null,
            loginTime: null,
            lastActivity: null
        };
        
        this.clearSession();
        
        if (wasAuthenticated) {
            console.log('✅ Logout successful');
            this.notifyListeners('logout', { reason, user });
        }
        
        return { success: true };
    }

    updateActivity() {
        if (this.state.isAuthenticated) {
            const now = new Date().toISOString();
            this.state.lastActivity = now;
            
            // Store activity timestamp for cross-tab sync
            try {
                localStorage.setItem(this.activityKey, JSON.stringify({
                    timestamp: now,
                    sessionId: this.state.sessionId
                }));
            } catch (error) {
                console.error('Error updating activity:', error);
            }
        }
    }

    updateLastActivity(timestamp) {
        if (this.state.isAuthenticated && timestamp) {
            this.state.lastActivity = timestamp;
        }
    }

    isInactive() {
        if (!this.state.lastActivity) return false;
        
        const lastActivity = new Date(this.state.lastActivity).getTime();
        const now = Date.now();
        const inactiveThreshold = 30 * 60 * 1000; // 30 minutes
        
        return (now - lastActivity) > inactiveThreshold;
    }

    saveSession() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.state));
        } catch (error) {
            console.error('Error saving session:', error);
        }
    }

    clearSession() {
        try {
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem(this.activityKey);
        } catch (error) {
            console.error('Error clearing session:', error);
        }
    }

    generateSessionId() {
        return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateUserId() {
        return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Public API
    getUser() {
        return this.state.user;
    }

    isAuthenticated() {
        return this.state.isAuthenticated;
    }

    getSessionInfo() {
        return {
            sessionId: this.state.sessionId,
            loginTime: this.state.loginTime,
            lastActivity: this.state.lastActivity,
            isActive: !this.isInactive()
        };
    }

    // Event system
    on(event, callback) {
        this.listeners.add({ event, callback });
        return () => this.listeners.delete({ event, callback });
    }

    off(callback) {
        this.listeners.forEach(listener => {
            if (listener.callback === callback) {
                this.listeners.delete(listener);
            }
        });
    }

    notifyListeners(event, data) {
        this.listeners.forEach(listener => {
            if (listener.event === event || listener.event === '*') {
                try {
                    listener.callback(event, data);
                } catch (error) {
                    console.error('Error in auth listener:', error);
                }
            }
        });

        // Also dispatch global events for compatibility
        window.dispatchEvent(new CustomEvent(`auth:${event}`, {
            detail: { event, data, timestamp: new Date().toISOString() }
        }));
    }

    // Debug utilities
    getDebugInfo() {
        return {
            state: this.state,
            isInactive: this.isInactive(),
            sessionAge: this.state.loginTime ? 
                Date.now() - new Date(this.state.loginTime).getTime() : null,
            listenerCount: this.listeners.size
        };
    }
}

// Create global auth manager instance
window.authManager = new AuthenticationManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthenticationManager;
}

console.log('🔐 Authentication system loaded and ready');
