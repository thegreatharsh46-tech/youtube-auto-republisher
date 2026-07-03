/**
 * Authentication Module - User authentication and session management
 * Handles OAuth login, logout, and session validation
 */

const auth = {
    user: null,
    authenticated: false,
    refreshInterval: null,

    /**
     * Initialize authentication
     */
    async init() {
        try {
            console.log('Initializing authentication...');
            
            // Check authentication status
            const status = await api.getAuthStatus();
            
            if (status.authenticated) {
                this.user = status.user;
                this.authenticated = true;
                console.log('User authenticated:', this.user.email);
                this.startAuthMonitoring();
                return true;
            } else {
                this.authenticated = false;
                return false;
            }
        } catch (error) {
            console.error('Auth initialization error:', error);
            this.authenticated = false;
            return false;
        }
    },

    /**
     * Logout user
     */
    async logout() {
        try {
            console.log('Logging out user...');
            await api.logout();
        } catch (error) {
            console.error('Logout error:', error);
        }

        this.user = null;
        this.authenticated = false;
        this.stopAuthMonitoring();

        // Redirect to login page
        window.location.href = '/login';
    },

    /**
     * Get current user
     */
    getUser() {
        return this.user;
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this.authenticated && !!this.user;
    },

    /**
     * Update user profile
     */
    setUser(user) {
        this.user = user;
        this.authenticated = !!user;
    },

    /**
     * Start authentication monitoring
     */
    startAuthMonitoring() {
        // Check auth status every 5 minutes
        this.refreshInterval = setInterval(() => {
            this.checkAuthStatus();
        }, 5 * 60 * 1000);
    },

    /**
     * Stop authentication monitoring
     */
    stopAuthMonitoring() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    },

    /**
     * Check authentication status
     */
    async checkAuthStatus() {
        try {
            const status = await api.getAuthStatus();
            if (status.authenticated) {
                this.user = status.user;
                this.authenticated = true;
            } else {
                this.logout();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.logout();
        }
    }
};
