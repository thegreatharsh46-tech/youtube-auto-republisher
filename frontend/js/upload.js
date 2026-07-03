/**
 * Upload Management Module - Upload history, progress tracking, and retry functionality
 */

class UploadManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.currentFilter = '';
        this.refreshInterval = null;
        this.selectedUpload = null;
    }

    /**
     * Initialize upload manager
     */
    async init() {
        try {
            console.log('Initializing upload manager...');

            // Setup user profile
            await this.setupUserProfile();

            // Setup logout button
            this.setupLogoutButton();

            // Setup filter
            this.setupFilter();

            // Setup modal events
            this.setupModalEvents();

            // Load uploads
            await this.loadUploads();

            // Start auto-refresh
            this.startAutoRefresh();

            console.log('Upload manager initialized successfully');
        } catch (error) {
            console.error('Upload manager initialization error:', error);
            notifications.error('Failed to initialize upload manager', 'Error');
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
     * Setup filter select
     */
    setupFilter() {
        const filterSelect = document.getElementById('statusFilter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.currentPage = 1;
                this.loadUploads();
            });
        }
    }

    /**
     * Setup modal events
     */
    setupModalEvents() {
        const closeBtn = document.getElementById('closeUploadModal');
        const closeDetailBtn = document.getElementById('closeUploadDetailBtn');
        const modal = document.getElementById('uploadDetailModal');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
                document.body.style.overflow = 'auto';
            });
        }

        if (closeDetailBtn) {
            closeDetailBtn.addEventListener('click', () => {
                modal.classList.remove('active');
                document.body.style.overflow = 'auto';
            });
        }

        // Close modal when clicking outside
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                    document.body.style.overflow = 'auto';
                }
            });
        }
    }

    /**
     * Load uploads
     */
    async loadUploads() {
        try {
            console.log('Loading uploads...');
            const tbody = document.getElementById('uploadsTableBody');
            
            // Show loading
            tbody.innerHTML = '<tr><td colspan="7" class="loading">Loading uploads...</td></tr>';

            const response = await api.getUploads(
                this.currentPage,
                this.itemsPerPage,
                this.currentFilter || null
            );

            const items = response.items || response;

            if (!items || items.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No uploads found</td></tr>';
                return;
            }

            tbody.innerHTML = items.map(upload => this.createUploadRow(upload)).join('');
        } catch (error) {
            console.error('Error loading uploads:', error);
            const tbody = document.getElementById('uploadsTableBody');
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Failed to load uploads: ' + (error.message || 'Unknown error') + '</td></tr>';
            notifications.error('Failed to load uploads: ' + (error.message || 'Unknown error'), 'Error');
        }
    }

    /**
     * Create upload table row
     */
    createUploadRow(upload) {
        const statusBadge = `<span class="status-badge ${utils.getStatusColor(upload.status)}">
            ${utils.getStatusDisplay(upload.status)}
        </span>`;

        const progressBar = upload.progress ? `
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${upload.progress}%"></div>
            </div>
            <small>${utils.formatPercentage(upload.progress)}</small>
        ` : '<small>-</small>';

        const actions = upload.status === 'failed' 
            ? `<button class="btn btn-primary btn-small" onclick="uploadManager.openUploadDetail('${upload.id}')">
                View & Retry
              </button>`
            : `<button class="btn btn-secondary btn-small" onclick="uploadManager.openUploadDetail('${upload.id}')">
                View
              </button>`;

        return `
            <tr>
                <td>${statusBadge}</td>
                <td>${utils.truncate(upload.title, 40)}</td>
                <td>${progressBar}</td>
                <td><code style="font-size: 0.8rem;">${utils.truncate(upload.youtube_id, 15)}</code></td>
                <td>${upload.retries || 0}/${upload.max_retries || 3}</td>
                <td>${utils.formatRelativeTime(upload.created_at)}</td>
                <td>${actions}</td>
            </tr>
        `;
    }

    /**
     * Open upload detail modal
     */
    async openUploadDetail(uploadId) {
        try {
            const modal = document.getElementById('uploadDetailModal');
            const content = document.getElementById('uploadDetailContent');
            const retryBtn = document.getElementById('retryUploadBtn');

            // Show loading
            content.innerHTML = '<p class="loading">Loading details...</p>';
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';

            // Load upload details
            const upload = await api.getUpload(uploadId);
            this.selectedUpload = upload;

            // Render details
            content.innerHTML = this.renderUploadDetails(upload);

            // Show/hide retry button
            if (retryBtn) {
                retryBtn.style.display = upload.status === 'failed' ? 'block' : 'none';
                retryBtn.onclick = () => this.retryUpload(uploadId);
            }
        } catch (error) {
            console.error('Error loading upload details:', error);
            const content = document.getElementById('uploadDetailContent');
            content.innerHTML = '<p class="empty-state">Failed to load upload details: ' + (error.message || 'Unknown error') + '</p>';
            notifications.error('Failed to load upload details: ' + (error.message || 'Unknown error'), 'Error');
        }
    }

    /**
     * Render upload details
     */
    renderUploadDetails(upload) {
        return `
            <div>
                <h3>${utils.truncate(upload.title, 60)}</h3>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--spacing-lg); margin: var(--spacing-lg) 0;">
                    <div>
                        <p style="margin: 0 0 var(--spacing-xs) 0; color: var(--text-tertiary); font-size: 0.875rem;">Status</p>
                        <p style="margin: 0; font-weight: 600;">
                            <span class="status-badge ${utils.getStatusColor(upload.status)}">
                                ${utils.getStatusDisplay(upload.status)}
                            </span>
                        </p>
                    </div>
                    
                    <div>
                        <p style="margin: 0 0 var(--spacing-xs) 0; color: var(--text-tertiary); font-size: 0.875rem;">YouTube ID</p>
                        <p style="margin: 0; font-weight: 600; font-family: monospace; font-size: 0.9rem;">
                            ${upload.youtube_id}
                        </p>
                    </div>
                    
                    <div>
                        <p style="margin: 0 0 var(--spacing-xs) 0; color: var(--text-tertiary); font-size: 0.875rem;">Retries</p>
                        <p style="margin: 0; font-weight: 600;">${upload.retries || 0} / ${upload.max_retries || 3}</p>
                    </div>
                    
                    <div>
                        <p style="margin: 0 0 var(--spacing-xs) 0; color: var(--text-tertiary); font-size: 0.875rem;">Started</p>
                        <p style="margin: 0; font-weight: 600;">${utils.formatDate(upload.created_at, 'datetime')}</p>
                    </div>
                </div>

                ${upload.progress ? `
                    <div style="margin: var(--spacing-lg) 0;">
                        <p style="margin: 0 0 var(--spacing-md) 0; color: var(--text-tertiary); font-size: 0.875rem;">Progress</p>
                        <div class="progress-bar" style="height: 8px; margin-bottom: var(--spacing-sm);">
                            <div class="progress-fill" style="width: ${upload.progress}%"></div>
                        </div>
                        <p style="margin: 0; font-weight: 600;">${utils.formatPercentage(upload.progress)}</p>
                    </div>
                ` : ''}

                ${upload.error_message ? `
                    <div style="margin: var(--spacing-lg) 0; padding: var(--spacing-md); background-color: rgba(244, 67, 54, 0.1); border-left: 3px solid var(--error-color); border-radius: var(--border-radius);">
                        <p style="margin: 0 0 var(--spacing-xs) 0; color: var(--error-color); font-weight: 600; font-size: 0.875rem;">Error</p>
                        <p style="margin: 0; color: var(--text-secondary); font-size: 0.875rem;">${upload.error_message}</p>
                    </div>
                ` : ''}

                ${upload.description ? `
                    <div style="margin: var(--spacing-lg) 0;">
                        <p style="margin: 0 0 var(--spacing-xs) 0; color: var(--text-tertiary); font-size: 0.875rem;">Description</p>
                        <p style="margin: 0; color: var(--text-secondary); font-size: 0.875rem;">${upload.description}</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Retry upload
     */
    async retryUpload(uploadId) {
        try {
            console.log('Retrying upload:', uploadId);
            
            await api.retryUpload(uploadId);

            notifications.success('Upload retry queued successfully', 'Success');

            // Close modal after delay
            setTimeout(() => {
                document.getElementById('uploadDetailModal').classList.remove('active');
                document.body.style.overflow = 'auto';
                this.loadUploads();
            }, 1500);
        } catch (error) {
            console.error('Error retrying upload:', error);
            notifications.error('Failed to retry upload: ' + (error.message || 'Unknown error'), 'Error');
        }
    }

    /**
     * Start auto-refresh
     */
    startAutoRefresh() {
        // Refresh uploads every 15 seconds
        this.refreshInterval = setInterval(() => {
            this.loadUploads();
        }, 15000);
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

// Create global upload manager instance
const uploadManager = new UploadManager();

/**
 * Initialize upload manager on page load
 */
document.addEventListener('DOMContentLoaded', async () => {
    const isUploadPage = document.body.classList.contains('upload-page');

    if (isUploadPage) {
        await uploadManager.init();
    }
});

/**
 * Cleanup on page unload
 */
window.addEventListener('beforeunload', () => {
    uploadManager.stopAutoRefresh();
});
