/**
 * Authentication Module - Handles OAuth login flow and session management
 */

class AuthManager {
    constructor() {
        this.user = null;
        this.isAuthenticated = false;
        this.loginCheckInterval = null;
    }

    /**
     * Initialize authentication
     */
    async init() {
        try {
            // Check if user is already authenticated
            const user = await api.getUserProfile();
            this.setUser(user);
            return true;
        } catch (error) {
            console.log('User not authenticated');
            return false;
        }
    }

    /**
     * Set user data
     */
    setUser(user) {
        this.user = user;
        this.isAuthenticated = !!user;
        this.saveUserToStorage();
        this.updateUIWithUser();
        console.log('User set:', user);
    }

    /**
     * Get current user
     */
    getUser() {
        return this.user;
    }

    /**
     * Check if user is authenticated
     */
    isLoggedIn() {
        return this.isAuthenticated && !!this.user;
    }

    /**
     * Logout user
     */
    async logout() {
        try {
            await api.logout();
            this.user = null;
            this.isAuthenticated = false;
            this.clearUserFromStorage();
            this.updateUIWithUser();
            notifications.success('Logged out successfully', 'Logout');
            // Redirect to login
            setTimeout(() => {
                window.location.href = '/login';
            }, 1500);
        } catch (error) {
            notifications.error('Logout failed: ' + error.message, 'Error');
            console.error('Logout error:', error);
        }
    }

    /**
     * Save user to localStorage
     */
    saveUserToStorage() {
        if (this.user) {
            utils.setStorage('user', this.user);
        }
    }

    /**
     * Load user from localStorage
     */
    loadUserFromStorage() {
        const user = utils.getStorage('user');
        if (user) {
            this.setUser(user);
        }
    }

    /**
     * Clear user from storage
     */
    clearUserFromStorage() {
        utils.removeStorage('user');
    }

    /**
     * Update UI with user information
     */
    updateUIWithUser() {
        const userProfile = document.getElementById('userProfile');
        const profilePic = document.querySelector('.profile-pic');
        const profileName = document.querySelector('.profile-name');
        const profileEmail = document.querySelector('.profile-email');

        if (userProfile && this.user) {
            if (profilePic && this.user.profile_picture) {
                profilePic.src = this.user.profile_picture;
                profilePic.onerror = () => {
                    profilePic.src = 'https://via.placeholder.com/40';
                };
            }
            if (profileName) {
                profileName.textContent = this.user.name || 'User';
            }
            if (profileEmail) {
                profileEmail.textContent = this.user.email || '-';
            }
        }
    }

    /**
     * Check authentication and redirect if needed
     */
    requireAuth() {
        if (!this.isLoggedIn()) {
            console.log('User not authenticated, redirecting to login');
            window.location.href = '/login';
            return false;
        }
        return true;
    }

    /**
     * Monitor auth status changes
     */
    startAuthMonitoring() {
        // Check auth status every 5 minutes
        this.loginCheckInterval = setInterval(async () => {
            try {
                const isAuth = await api.checkAuth();
                if (!isAuth && this.isAuthenticated) {
                    console.log('Session expired, redirecting to login');
                    this.user = null;
                    this.isAuthenticated = false;
                    window.location.href = '/login';
                }
            } catch (error) {
                console.error('Auth check error:', error);
            }
        }, 5 * 60 * 1000);
    }

    /**
     * Stop auth monitoring
     */
    stopAuthMonitoring() {
        if (this.loginCheckInterval) {
            clearInterval(this.loginCheckInterval);
            this.loginCheckInterval = null;
        }
    }
}

// Create global auth manager instance
const auth = new AuthManager();

/**
 * Initialize authentication on page load
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Check if on login page
    const isLoginPage = document.body.classList.contains('login-page');

    if (!isLoginPage) {
        // On dashboard/upload pages, check authentication
        const isAuthenticated = await auth.init();
        if (!isAuthenticated) {
            window.location.href = '/login';
            return;
        }
        // Start monitoring auth status
        auth.startAuthMonitoring();
    } else {
        // On login page, check if already logged in
        const isAuthenticated = await auth.init();
        if (isAuthenticated) {
            window.location.href = '/';
        }
    }

    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.logout();
        });
    }
});

/**
 * Cleanup on page unload
 */
window.addEventListener('beforeunload', () => {
    auth.stopAuthMonitoring();
});
