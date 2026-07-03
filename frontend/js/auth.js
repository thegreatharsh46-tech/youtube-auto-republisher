/**
 * Authentication Module - User authentication and session management
 */

const auth = {
    user: null,
    token: null,
    refreshInterval: null,

    /**
     * Initialize authentication
     */
    async init() {
        try {
            // Check if token exists
            this.token = utils.getStorage('authToken');
            if (!this.token) {
                return false;
            }

            // Verify token by fetching current user
            try {
                this.user = await api.getCurrentUser();
                this.startAuthMonitoring();
                return true;
            } catch (error) {
                console.error('Token verification failed:', error);
                this.logout();
                return false;
            }
        } catch (error) {
            console.error('Auth initialization error:', error);
            return false;
        }
    },

    /**
     * Login user
     */
    async login(email, password) {
        try {
            const response = await api.login(email, password);
            this.token = response.token;
            this.user = response.user;

            // Save token
            utils.setStorage('authToken', this.token);
            utils.setStorage('user', this.user);

            // Start monitoring
            this.startAuthMonitoring();

            return true;
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    },

    /**
     * Logout user
     */
    async logout() {
        try {
            await api.logout();
        } catch (error) {
            console.error('Logout error:', error);
        }

        this.token = null;
        this.user = null;
        utils.removeStorage('authToken');
        utils.removeStorage('user');
        this.stopAuthMonitoring();

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
        return !!this.token && !!this.user;
    },

    /**
     * Get auth token
     */
    getToken() {
        return this.token;
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
            const user = await api.getCurrentUser();
            this.user = user;
            utils.setStorage('user', user);
        } catch (error) {
            console.error('Auth check failed:', error);
            this.logout();
        }
    }
};
