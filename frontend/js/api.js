/**
 * API Module - Centralized API Communication
 * Handles all backend API requests with proper error handling and response parsing
 */

class APIClient {
    constructor() {
        this.baseURL = '/api';
        this.timeout = 30000; // 30 seconds
    }

    /**
     * Make HTTP request with error handling
     */
    async request(endpoint, options = {}) {
        const {
            method = 'GET',
            body = null,
            headers = {},
            isJson = true
        } = options;

        const url = `${this.baseURL}${endpoint}`;
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        if (body) {
            config.body = JSON.stringify(body);
        }

        try {
            const response = await Promise.race([
                fetch(url, config),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Request timeout')), this.timeout)
                )
            ]);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            return isJson ? await response.json() : response;
        } catch (error) {
            console.error(`API Error [${method} ${endpoint}]:`, error);
            throw error;
        }
    }

    /**
     * GET request
     */
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    /**
     * POST request
     */
    async post(endpoint, body) {
        return this.request(endpoint, { method: 'POST', body });
    }

    /**
     * PUT request
     */
    async put(endpoint, body) {
        return this.request(endpoint, { method: 'PUT', body });
    }

    /**
     * DELETE request
     */
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    /**
     * PATCH request
     */
    async patch(endpoint, body) {
        return this.request(endpoint, { method: 'PATCH', body });
    }

    // ========== Authentication ==========

    /**
     * Get current user profile
     */
    async getUserProfile() {
        try {
            return await this.get('/user/profile');
        } catch (error) {
            console.error('Failed to get user profile:', error);
            throw error;
        }
    }

    /**
     * Logout user
     */
    async logout() {
        try {
            return await this.post('/auth/logout', {});
        } catch (error) {
            console.error('Failed to logout:', error);
            throw error;
        }
    }

    // ========== Dashboard ==========

    /**
     * Get dashboard data with stats
     */
    async getDashboard() {
        try {
            return await this.get('/dashboard');
        } catch (error) {
            console.error('Failed to get dashboard data:', error);
            throw error;
        }
    }

    /**
     * Get queue statistics
     */
    async getQueueStats() {
        try {
            return await this.get('/queue/stats');
        } catch (error) {
            console.error('Failed to get queue stats:', error);
            throw error;
        }
    }

    // ========== Videos ==========

    /**
     * Get all user videos
     */
    async getVideos(page = 1, limit = 50) {
        try {
            return await this.get(`/videos?page=${page}&limit=${limit}`);
        } catch (error) {
            console.error('Failed to get videos:', error);
            throw error;
        }
    }

    /**
     * Get specific video details
     */
    async getVideo(videoId) {
        try {
            return await this.get(`/videos/${videoId}`);
        } catch (error) {
            console.error(`Failed to get video ${videoId}:`, error);
            throw error;
        }
    }

    /**
     * Search videos by title or URL
     */
    async searchVideos(query) {
        try {
            return await this.get(`/videos/search?q=${encodeURIComponent(query)}`);
        } catch (error) {
            console.error('Failed to search videos:', error);
            throw error;
        }
    }

    // ========== Queue ==========

    /**
     * Get all queue items
     */
    async getQueue(page = 1, limit = 50) {
        try {
            return await this.get(`/queue?page=${page}&limit=${limit}`);
        } catch (error) {
            console.error('Failed to get queue:', error);
            throw error;
        }
    }

    /**
     * Get specific queue item
     */
    async getQueueItem(itemId) {
        try {
            return await this.get(`/queue/${itemId}`);
        } catch (error) {
            console.error(`Failed to get queue item ${itemId}:`, error);
            throw error;
        }
    }

    /**
     * Add video to queue
     */
    async addToQueue(videoData) {
        try {
            return await this.post('/queue', videoData);
        } catch (error) {
            console.error('Failed to add to queue:', error);
            throw error;
        }
    }

    /**
     * Update queue item
     */
    async updateQueueItem(itemId, updates) {
        try {
            return await this.put(`/queue/${itemId}`, updates);
        } catch (error) {
            console.error(`Failed to update queue item ${itemId}:`, error);
            throw error;
        }
    }

    /**
     * Remove item from queue
     */
    async removeFromQueue(itemId) {
        try {
            return await this.delete(`/queue/${itemId}`);
        } catch (error) {
            console.error(`Failed to remove queue item ${itemId}:`, error);
            throw error;
        }
    }

    // ========== Uploads ==========

    /**
     * Get upload history
     */
    async getUploads(page = 1, limit = 50, status = null) {
        try {
            let endpoint = `/uploads?page=${page}&limit=${limit}`;
            if (status) {
                endpoint += `&status=${status}`;
            }
            return await this.get(endpoint);
        } catch (error) {
            console.error('Failed to get uploads:', error);
            throw error;
        }
    }

    /**
     * Get specific upload details
     */
    async getUpload(uploadId) {
        try {
            return await this.get(`/uploads/${uploadId}`);
        } catch (error) {
            console.error(`Failed to get upload ${uploadId}:`, error);
            throw error;
        }
    }

    /**
     * Get upload progress
     */
    async getUploadProgress(uploadId) {
        try {
            return await this.get(`/uploads/${uploadId}/progress`);
        } catch (error) {
            console.error(`Failed to get upload progress ${uploadId}:`, error);
            throw error;
        }
    }

    /**
     * Retry failed upload
     */
    async retryUpload(uploadId) {
        try {
            return await this.post(`/uploads/${uploadId}/retry`, {});
        } catch (error) {
            console.error(`Failed to retry upload ${uploadId}:`, error);
            throw error;
        }
    }

    /**
     * Get recent uploads (for dashboard)
     */
    async getRecentUploads(limit = 5) {
        try {
            return await this.get(`/uploads?limit=${limit}&sort=recent`);
        } catch (error) {
            console.error('Failed to get recent uploads:', error);
            throw error;
        }
    }

    // ========== Settings ==========

    /**
     * Get user settings
     */
    async getSettings() {
        try {
            return await this.get('/settings');
        } catch (error) {
            console.error('Failed to get settings:', error);
            throw error;
        }
    }

    /**
     * Update user settings
     */
    async updateSettings(settings) {
        try {
            return await this.put('/settings', settings);
        } catch (error) {
            console.error('Failed to update settings:', error);
            throw error;
        }
    }

    // ========== Health Check ==========

    /**
     * Check backend health status
     */
    async healthCheck() {
        try {
            return await this.get('/health');
        } catch (error) {
            console.error('Health check failed:', error);
            throw error;
        }
    }

    /**
     * Check if user is authenticated
     */
    async checkAuth() {
        try {
            await this.get('/user/profile');
            return true;
        } catch (error) {
            return false;
        }
    }
}

// Create global API client instance
const api = new APIClient();
