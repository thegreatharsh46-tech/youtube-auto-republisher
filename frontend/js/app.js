/**
 * App Initialization Module - Main app setup and initialization
 * Initializes all modules in proper order
 */

class AppManager {
    constructor() {
        this.initialized = false;
        this.modules = [];
    }

    /**
     * Initialize the entire application
     */
    async init() {
        try {
            console.log('🚀 Starting YouTube Auto-Republisher Application...');

            // Step 1: Initialize notifications system
            console.log('Step 1: Initializing notifications...');
            notifications.init();

            // Step 2: Initialize authentication
            console.log('Step 2: Initializing authentication...');
            const isAuthenticated = await auth.init();

            if (!isAuthenticated && !this.isLoginPage()) {
                console.log('User not authenticated, redirecting to login');
                window.location.href = '/login';
                return;
            }

            // Step 3: Setup global error handlers
            console.log('Step 3: Setting up error handlers...');
            this.setupErrorHandlers();

            // Step 4: Setup network monitoring
            console.log('Step 4: Setting up network monitoring...');
            this.setupNetworkMonitoring();

            // Step 5: Initialize page-specific modules
            console.log('Step 5: Initializing page-specific modules...');
            await this.initializePageModules();

            // Step 6: Setup keyboard shortcuts
            console.log('Step 6: Setting up keyboard shortcuts...');
            this.setupKeyboardShortcuts();

            // Step 7: Setup theme
            console.log('Step 7: Setting up theme...');
            this.setupTheme();

            this.initialized = true;
            console.log('✅ Application initialized successfully');

            // Broadcast init complete
            document.dispatchEvent(new Event('appInitialized'));
        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            notifications.error('Failed to initialize application', 'Critical Error');
        }
    }

    /**
     * Initialize page-specific modules
     */
    async initializePageModules() {
        const isDashboardPage = document.body.classList.contains('dashboard-page');
        const isUploadPage = document.body.classList.contains('upload-page');
        const isLoginPage = document.body.classList.contains('login-page');

        if (isDashboardPage && typeof dashboardManager !== 'undefined') {
            console.log('Initializing dashboard...');
            await dashboardManager.init();
            this.modules.push('dashboard');
        }

        if (isUploadPage && typeof uploadManager !== 'undefined') {
            console.log('Initializing upload manager...');
            await uploadManager.init();
            this.modules.push('upload');
        }

        if (isLoginPage && typeof loginManager !== 'undefined') {
            console.log('Initializing login...');
            await loginManager.init();
            this.modules.push('login');
        }
    }

    /**
     * Setup global error handlers
     */
    setupErrorHandlers() {
        // Handle uncaught errors
        window.addEventListener('error', (event) => {
            console.error('Uncaught error:', event.error);
            notifications.error('An unexpected error occurred', 'Error');
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            notifications.error('An unexpected error occurred', 'Error');
        });
    }

    /**
     * Setup network monitoring
     */
    setupNetworkMonitoring() {
        const isOnline = navigator.onLine;
        this.updateOnlineStatus(isOnline);

        window.addEventListener('online', () => {
            console.log('✅ Back online');
            this.updateOnlineStatus(true);
            notifications.success('Connection restored', 'Online');
        });

        window.addEventListener('offline', () => {
            console.log('❌ Offline');
            this.updateOnlineStatus(false);
            notifications.warning('No internet connection', 'Offline');
        });
    }

    /**
     * Update online status indicator
     */
    updateOnlineStatus(isOnline) {
        const indicator = document.getElementById('onlineIndicator');
        if (indicator) {
            indicator.className = isOnline ? 'online' : 'offline';
            indicator.title = isOnline ? 'Online' : 'Offline';
        }
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K - Search/Command palette
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                // TODO: Open search/command palette
            }

            // Ctrl/Cmd + / - Show keyboard shortcuts help
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                this.showKeyboardShortcuts();
            }

            // Escape - Close modals
            if (e.key === 'Escape') {
                modal.closeAll();
            }
        });
    }

    /**
     * Show keyboard shortcuts help
     */
    showKeyboardShortcuts() {
        const shortcuts = [
            { key: 'Ctrl/Cmd + K', action: 'Open search' },
            { key: 'Ctrl/Cmd + /', action: 'Show shortcuts' },
            { key: 'Esc', action: 'Close modal' }
        ];

        let html = '<h3>Keyboard Shortcuts</h3><table style="width: 100%; margin-top: 1rem;">';
        shortcuts.forEach(s => {
            html += `<tr><td style="padding: 0.5rem;"><kbd>${s.key}</kbd></td><td style="padding: 0.5rem;">${s.action}</td></tr>`;
        });
        html += '</table>';

        // Create temporary modal
        const tempModal = document.createElement('div');
        tempModal.className = 'modal active';
        tempModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Keyboard Shortcuts</h2>
                    <button onclick="this.closest('.modal').remove()" class="btn btn-ghost">✕</button>
                </div>
                <div class="modal-body">
                    ${html}
                </div>
            </div>
        `;
        document.body.appendChild(tempModal);
        document.body.style.overflow = 'hidden';

        tempModal.addEventListener('click', (e) => {
            if (e.target === tempModal) {
                tempModal.remove();
                document.body.style.overflow = 'auto';
            }
        });
    }

    /**
     * Setup theme
     */
    setupTheme() {
        const theme = utils.getStorage('theme', 'light');
        this.setTheme(theme);

        // Listen for theme changes
        document.addEventListener('themeChanged', (e) => {
            this.setTheme(e.detail.theme);
        });
    }

    /**
     * Set theme
     */
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        utils.setStorage('theme', theme);
    }

    /**
     * Check if current page is login page
     */
    isLoginPage() {
        return document.body.classList.contains('login-page');
    }

    /**
     * Get app status
     */
    getStatus() {
        return {
            initialized: this.initialized,
            modules: this.modules,
            online: navigator.onLine,
            user: auth.getUser()
        };
    }

    /**
     * Destroy app (cleanup)
     */
    destroy() {
        console.log('Destroying application...');

        if (dashboardManager) {
            dashboardManager.stopAutoRefresh();
        }

        if (uploadManager) {
            uploadManager.stopAutoRefresh();
        }

        if (auth) {
            auth.stopAuthMonitoring();
        }

        this.initialized = false;
    }
}

// Create global app manager instance
const app = new AppManager();

/**
 * Initialize app when DOM is ready
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app.init();
    });
} else {
    // DOM already loaded
    app.init();
}

/**
 * Cleanup on page unload
 */
window.addEventListener('beforeunload', () => {
    app.destroy();
});

/**
 * Handle visibility change (pause refresh when tab is not visible)
 */
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('App hidden - pausing refresh');
        if (dashboardManager) {
            dashboardManager.stopAutoRefresh();
        }
        if (uploadManager) {
            uploadManager.stopAutoRefresh();
        }
    } else {
        console.log('App visible - resuming refresh');
        if (dashboardManager && dashboardManager.currentPage === 'dashboard') {
            dashboardManager.startAutoRefresh();
        }
        if (uploadManager) {
            uploadManager.startAutoRefresh();
        }
    }
});

/**
 * Expose app for debugging
 */
window.debugApp = () => {
    console.log('=== App Debug Info ===');
    console.log('Status:', app.getStatus());
    console.log('Auth:', auth);
    console.log('Utils:', utils);
    console.log('Notifications:', notifications);
    if (typeof dashboardManager !== 'undefined') {
        console.log('Dashboard:', dashboardManager);
    }
    if (typeof uploadManager !== 'undefined') {
        console.log('Upload:', uploadManager);
    }
};

console.log('%c📱 YouTube Auto-Republisher', 'font-size: 16px; font-weight: bold; color: #FF0000;');
console.log('%cType debugApp() in console to view app information', 'font-size: 12px; color: #666;');
