/**
 * API Module - Backend API communication
 * Handles all HTTP requests to Flask backend with proper error handling
 */

const api = {
    baseURL: '/api',
    timeout: 30000,

    /**
     * Make API request
     */
    async request(method, endpoint, data = null, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        const config = {
            method,
            headers,
            timeout: options.timeout || this.timeout,
            credentials: 'include' // Include cookies for session management
        };

        if (data) {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, config);
            
            // Handle response based on content type
            const contentType = response.headers.get('content-type');
            let result;
            
            if (contentType && contentType.includes('application/json')) {
                result = await response.json();
            } else {
                result = await response.text();
            }

            if (!response.ok) {
                throw {
                    status: response.status,
                    error: result.error || `API Error: ${response.status}`,
                    message: result.message || 'An error occurred',
                    code: result.code || 'UNKNOWN_ERROR'
                };
            }

            return result;
        } catch (error) {
            console.error(`API Error [${method} ${endpoint}]:`, error);
            throw error;
        }
    },

    /**
     * GET request
     */
    get(endpoint, options) {
        return this.request('GET', endpoint, null, options);
    },

    /**
     * POST request
     */
    post(endpoint, data, options) {
        return this.request('POST', endpoint, data, options);
    },

    /**
     * PUT request
     */
    put(endpoint, data, options) {
        return this.request('PUT', endpoint, data, options);
    },

    /**
     * DELETE request
     */
    delete(endpoint, options) {
        return this.request('DELETE', endpoint, null, options);
    },

    // ============ AUTH ENDPOINTS ============
    
    /**
     * Get current user info
     */
    async getCurrentUser() {
        return this.get('/auth/status');
    },

    /**
     * Get authentication status
     */
    async getAuthStatus() {
        return this.get('/auth/status');
    },

    /**
     * Logout user
     */
    async logout() {
        return this.post('/auth/logout');
    },

    // ============ DASHBOARD ENDPOINTS ============
    
    /**
     * Get dashboard data (stats and recent uploads)
     */
    async getDashboard() {
        try {
            const response = await this.get('/dashboard');
            return {
                total_queue: response.queue?.total || 0,
                pending: response.queue?.pending || 0,
                completed: response.queue?.completed || 0,
                failed: response.queue?.failed || 0,
                recent_uploads: response.recent_uploads || [],
                user: response.user
            };
        } catch (error) {
            console.error('Error fetching dashboard:', error);
            throw error;
        }
    },

    /**
     * Get recent uploads
     */
    async getRecentUploads(limit = 5) {
        try {
            const response = await this.get('/uploads/recent?limit=' + limit);
            return response.uploads || response;
        } catch (error) {
            console.error('Error fetching recent uploads:', error);
            throw error;
        }
    },

    // ============ UPLOAD ENDPOINTS ============
    
    /**
     * Get uploads list with pagination and filtering
     */
    async getUploads(page = 1, limit = 20, status = null) {
        try {
            let url = `/uploads?page=${page}&limit=${limit}`;
            if (status) url += `&status=${status}`;
            const response = await this.get(url);
            return {
                items: response.uploads || response.items || response,
                total: response.total,
                pages: response.pages,
                current_page: response.current_page
            };
        } catch (error) {
            console.error('Error fetching uploads:', error);
            throw error;
        }
    },

    /**
     * Get single upload details
     */
    async getUpload(uploadId) {
        try {
            const response = await this.get(`/uploads/${uploadId}`);
            return response.upload || response;
        } catch (error) {
            console.error('Error fetching upload:', error);
            throw error;
        }
    },

    /**
     * Retry failed upload
     */
    async retryUpload(uploadId) {
        try {
            return this.post(`/uploads/${uploadId}/retry`, {});
        } catch (error) {
            console.error('Error retrying upload:', error);
            throw error;
        }
    },

    // ============ QUEUE ENDPOINTS ============
    
    /**
     * Get queue items
     */
    async getQueue() {
        try {
            const response = await this.get('/queue');
            return {
                items: response.queue || response.items || response,
                total: response.total,
                count: response.count
            };
        } catch (error) {
            console.error('Error fetching queue:', error);
            throw error;
        }
    },

    /**
     * Add item to queue
     */
    async addToQueue(data) {
        try {
            return this.post('/queue', data);
        } catch (error) {
            console.error('Error adding to queue:', error);
            throw error;
        }
    },

    /**
     * Remove item from queue
     */
    async removeFromQueue(itemId) {
        try {
            return this.delete(`/queue/${itemId}`);
        } catch (error) {
            console.error('Error removing from queue:', error);
            throw error;
        }
    },

    /**
     * Update queue item
     */
    async updateQueueItem(itemId, data) {
        try {
            return this.put(`/queue/${itemId}`, data);
        } catch (error) {
            console.error('Error updating queue item:', error);
            throw error;
        }
    },

    // ============ VIDEO ENDPOINTS ============
    
    /**
     * Get user's YouTube videos
     */
    async getVideos() {
        try {
            const response = await this.get('/videos');
            return {
                items: response.videos || response.items || response,
                total: response.total,
                count: response.count
            };
        } catch (error) {
            console.error('Error fetching videos:', error);
            throw error;
        }
    },

    /**
     * Download video by ID
     */
    async downloadVideo(videoId) {
        try {
            return this.post(`/videos/${videoId}/download`, {});
        } catch (error) {
            console.error('Error downloading video:', error);
            throw error;
        }
    },

    // ============ SETTINGS ENDPOINTS ============
    
    /**
     * Get user settings
     */
    async getSettings() {
        try {
            const response = await this.get('/settings');
            return {
                upload_interval: response.upload_interval || 150,
                max_retries: response.max_retries || 3,
                auto_schedule: response.auto_schedule !== undefined ? response.auto_schedule : true,
                ...response
            };
        } catch (error) {
            console.error('Error fetching settings:', error);
            throw error;
        }
    },

    /**
     * Update user settings
     */
    async updateSettings(data) {
        try {
            return this.put('/settings', data);
        } catch (error) {
            console.error('Error updating settings:', error);
            throw error;
        }
    },

    // ============ LOGS ENDPOINTS ============
    
    /**
     * Get application logs
     */
    async getLogs(page = 1, limit = 50, level = null) {
        try {
            let url = `/logs?page=${page}&limit=${limit}`;
            if (level) url += `&level=${level}`;
            const response = await this.get(url);
            return {
                logs: response.logs || response.items || response,
                total: response.total
            };
        } catch (error) {
            console.error('Error fetching logs:', error);
            throw error;
        }
    },

    // ============ HEALTH CHECK ============
    
    /**
     * Health check endpoint
     */
    async healthCheck() {
        try {
            return this.get('/health');
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }
};
