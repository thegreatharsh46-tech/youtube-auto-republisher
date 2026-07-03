/**
 * Dashboard Module - Dashboard functionality and page management
 * Handles navigation, data loading, and user interactions
 */

class DashboardManager {
    constructor() {
        this.currentPage = 'dashboard';
        this.refreshInterval = null;
        this.dashboardData = null;
    }

    /**
     * Initialize dashboard
     */
    async init() {
        try {
            console.log('Initializing dashboard...');
            
            // Setup user profile
            await this.setupUserProfile();
            
            // Setup navigation
            this.setupNavigation();
            
            // Setup sidebar toggle
            this.setupSidebarToggle();
            
            // Setup logout button
            this.setupLogoutButton();
            
            // Load dashboard data
            await this.loadDashboard();
            
            // Start auto-refresh
            this.startAutoRefresh();
            
            console.log('Dashboard initialized successfully');
        } catch (error) {
            console.error('Dashboard initialization error:', error);
            notifications.error('Failed to initialize dashboard', 'Error');
        }
    }

    /**
     * Setup user profile display
     */
    async setupUserProfile() {
        try {
            const user = auth.getUser();
            if (user) {
                const profileName = document.querySelector('.profile-name');
                const profileEmail = document.querySelector('.profile-email');
                const profilePic = document.querySelector('.profile-pic');

                if (profileName) profileName.textContent = user.name || user.email || 'User';
                if (profileEmail) profileEmail.textContent = user.email || '-';
                if (profilePic && user.picture) {
                    profilePic.src = user.picture;
                    profilePic.onerror = () => {
                        profilePic.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.email)}&background=random`;
                    };
                }
            }
        } catch (error) {
            console.error('Error setting up user profile:', error);
        }
    }

    /**
     * Setup logout button
     */
    setupLogoutButton() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                auth.logout();
            });
        }
    }

    /**
     * Setup navigation between pages
     */
    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const page = item.dataset.page;
                if (page) {
                    e.preventDefault();
                    this.navigateTo(page);
                    this.closeSidebar();
                }
            });
        });
    }

    /**
     * Navigate to page
     */
    async navigateTo(page) {
        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to current nav item
        const activeItem = document.querySelector(`[data-page="${page}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }

        // Hide all pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
            p.style.display = 'none';
        });

        // Show selected page
        const pageElement = document.getElementById(`${page}Page`);
        if (pageElement) {
            pageElement.style.display = 'block';
            pageElement.classList.add('active');
        }

        this.currentPage = page;

        // Load page-specific data
        await this.loadPageData(page);
    }

    /**
     * Load page-specific data
     */
    async loadPageData(page) {
        try {
            switch (page) {
                case 'dashboard':
                    await this.loadDashboard();
                    break;
                case 'videos':
                    await this.loadVideos();
                    break;
                case 'queue':
                    await this.loadQueue();
                    break;
                case 'settings':
                    await this.loadSettings();
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${page}:`, error);
            notifications.error(`Failed to load ${page}`, 'Error');
        }
    }

    /**
     * Load dashboard data
     */
    async loadDashboard() {
        try {
            console.log('Loading dashboard data...');
            const data = await api.getDashboard();
            this.dashboardData = data;

            // Update stats
            const totalQueue = document.getElementById('statTotalQueue');
            const pending = document.getElementById('statPending');
            const completed = document.getElementById('statCompleted');
            const failed = document.getElementById('statFailed');

            if (totalQueue) totalQueue.textContent = data.total_queue || 0;
            if (pending) pending.textContent = data.pending || 0;
            if (completed) completed.textContent = data.completed || 0;
            if (failed) failed.textContent = data.failed || 0;

            // Load recent uploads
            await this.loadRecentUploads();
        } catch (error) {
            console.error('Error loading dashboard:', error);
            notifications.error('Failed to load dashboard data', 'Error');
        }
    }

    /**
     * Load recent uploads
     */
    async loadRecentUploads() {
        try {
            const uploads = await api.getRecentUploads(5);
            const list = document.getElementById('recentUploadsList');

            if (!uploads || uploads.length === 0) {
                list.innerHTML = '<p class="empty-state">No uploads yet</p>';
                return;
            }

            list.innerHTML = uploads.map(upload => `
                <div class="upload-item">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div style="flex: 1;">
                            <h4>${utils.truncate(upload.title, 50)}</h4>
                            <p style="margin: 0; font-size: 0.875rem; color: var(--text-tertiary);">
                                ${utils.formatRelativeTime(upload.created_at)}
                            </p>
                        </div>
                        <span class="status-badge ${utils.getStatusColor(upload.status)}">
                            ${utils.getStatusDisplay(upload.status)}
                        </span>
                    </div>
                    ${upload.progress ? `
                        <div class="progress-bar" style="margin-top: var(--spacing-md);">
                            <div class="progress-fill" style="width: ${upload.progress}%"></div>
                        </div>
                        <p style="margin: var(--spacing-xs) 0 0 0; font-size: 0.75rem; color: var(--text-tertiary);">
                            ${utils.formatPercentage(upload.progress)}
                        </p>
                    ` : ''}
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading recent uploads:', error);
            document.getElementById('recentUploadsList').innerHTML = '<p class="empty-state">Failed to load uploads</p>';
        }
    }

    /**
     * Load videos
     */
    async loadVideos() {
        try {
            console.log('Loading videos...');
            const videosGrid = document.getElementById('videosGrid');
            if (!videosGrid) return;

            videosGrid.innerHTML = '<p class="loading">Loading videos...</p>';

            const response = await api.getVideos();
            const videos = response.items || response;

            if (!videos || videos.length === 0) {
                videosGrid.innerHTML = '<p class="empty-state">No videos found. Make sure you\'ve authenticated with YouTube.</p>';
                return;
            }

            videosGrid.innerHTML = videos.map(video => `
                <div class="video-card">
                    <img src="${utils.getYouTubeThumbnail(video.youtube_id) || 'https://via.placeholder.com/250x140'}" 
                         alt="${video.title}" class="video-thumbnail" onerror="this.src='https://via.placeholder.com/250x140'">
                    <h3 class="video-title">${utils.truncate(video.title, 40)}</h3>
                    <p class="video-meta">${utils.truncate(video.description, 80) || 'No description'}</p>
                    <div class="video-actions">
                        <button class="btn btn-primary btn-small" onclick="dashboardManager.addVideoToQueue('${video.youtube_id}', '${video.title.replace(/'/g, "\\'")}')">
                            Add to Queue
                        </button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading videos:', error);
            const videosGrid = document.getElementById('videosGrid');
            if (videosGrid) {
                videosGrid.innerHTML = '<p class="empty-state">Failed to load videos: ' + (error.message || 'Unknown error') + '</p>';
            }
        }
    }

    /**
     * Add video to queue
     */
    async addVideoToQueue(videoId, title) {
        try {
            console.log('Adding video to queue:', videoId);
            
            await api.addToQueue({
                youtube_id: videoId,
                title: title
            });

            notifications.success(`Added "${utils.truncate(title, 30)}" to queue`, 'Success');
            
            // Refresh dashboard
            await this.loadDashboard();
        } catch (error) {
            console.error('Error adding to queue:', error);
            notifications.error('Failed to add video to queue: ' + (error.message || 'Unknown error'), 'Error');
        }
    }

    /**
     * Load queue
     */
    async loadQueue() {
        try {
            console.log('Loading queue...');
            const queueList = document.getElementById('queueList');
            if (!queueList) return;

            queueList.innerHTML = '<p class="loading">Loading queue...</p>';

            const response = await api.getQueue();
            const items = response.items || response;

            if (!items || items.length === 0) {
                queueList.innerHTML = '<p class="empty-state">Queue is empty. Add videos from the "My Videos" page.</p>';
                return;
            }

            queueList.innerHTML = items.map(item => `
                <div class="queue-item">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div style="flex: 1;">
                            <h3 class="video-title">${utils.truncate(item.title, 40)}</h3>
                            <p class="video-meta">
                                Added ${utils.formatRelativeTime(item.created_at)}
                            </p>
                        </div>
                        <span class="status-badge ${utils.getStatusColor(item.status)}">
                            ${utils.getStatusDisplay(item.status)}
                        </span>
                    </div>
                    <div class="video-actions" style="margin-top: var(--spacing-md);">
                        <button class="btn btn-secondary btn-small" onclick="dashboardManager.removeFromQueue('${item.id}')">
                            Remove
                        </button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading queue:', error);
            const queueList = document.getElementById('queueList');
            if (queueList) {
                queueList.innerHTML = '<p class="empty-state">Failed to load queue: ' + (error.message || 'Unknown error') + '</p>';
            }
        }
    }

    /**
     * Remove from queue
     */
    async removeFromQueue(itemId) {
        if (!confirm('Are you sure you want to remove this item from the queue?')) {
            return;
        }

        try {
            await api.removeFromQueue(itemId);
            notifications.success('Item removed from queue', 'Success');
            await this.loadQueue();
        } catch (error) {
            console.error('Error removing from queue:', error);
            notifications.error('Failed to remove from queue: ' + (error.message || 'Unknown error'), 'Error');
        }
    }

    /**
     * Load settings
     */
    async loadSettings() {
        try {
            console.log('Loading settings...');
            const settings = await api.getSettings();

            const uploadIntervalInput = document.getElementById('uploadInterval');
            const maxRetriesInput = document.getElementById('maxRetries');
            const saveButton = document.getElementById('saveSettings');

            if (uploadIntervalInput && settings.upload_interval) {
                uploadIntervalInput.value = settings.upload_interval;
            }

            if (maxRetriesInput && settings.max_retries) {
                maxRetriesInput.value = settings.max_retries;
            }

            if (saveButton) {
                saveButton.onclick = () => this.saveSettings();
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            notifications.error('Failed to load settings: ' + (error.message || 'Unknown error'), 'Error');
        }
    }

    /**
     * Save settings
     */
    async saveSettings() {
        try {
            const uploadInterval = parseInt(document.getElementById('uploadInterval').value);
            const maxRetries = parseInt(document.getElementById('maxRetries').value);

            if (uploadInterval < 60 || uploadInterval > 1440) {
                notifications.warning('Upload interval must be between 60 and 1440 minutes', 'Warning');
                return;
            }

            if (maxRetries < 1 || maxRetries > 10) {
                notifications.warning('Max retries must be between 1 and 10', 'Warning');
                return;
            }

            await api.updateSettings({
                upload_interval: uploadInterval,
                max_retries: maxRetries
            });

            notifications.success('Settings saved successfully', 'Success');
        } catch (error) {
            console.error('Error saving settings:', error);
            notifications.error('Failed to save settings: ' + (error.message || 'Unknown error'), 'Error');
        }
    }

    /**
     * Setup sidebar toggle for mobile
     */
    setupSidebarToggle() {
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.querySelector('.sidebar');

        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }

        // Close sidebar when clicking on page content
        document.querySelector('.main-content')?.addEventListener('click', () => {
            this.closeSidebar();
        });
    }

    /**
     * Toggle sidebar
     */
    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        sidebar?.classList.toggle('open');
    }

    /**
     * Close sidebar
     */
    closeSidebar() {
        const sidebar = document.querySelector('.sidebar');
        sidebar?.classList.remove('open');
    }

    /**
     * Start auto-refresh
     */
    startAutoRefresh() {
        // Refresh dashboard every 30 seconds
        this.refreshInterval = setInterval(() => {
            if (this.currentPage === 'dashboard') {
                this.loadDashboard();
            }
        }, 30000);
    }

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}

// Create global dashboard manager instance
const dashboardManager = new DashboardManager();

/**
 * Initialize dashboard on page load
 */
document.addEventListener('DOMContentLoaded', async () => {
    const isDashboardPage = document.body.classList.contains('dashboard-page');
    
    if (isDashboardPage) {
        await dashboardManager.init();
        
        // Show dashboard page by default
        dashboardManager.navigateTo('dashboard');
    }
});

/**
 * Cleanup on page unload
 */
window.addEventListener('beforeunload', () => {
    dashboardManager.stopAutoRefresh();
});
