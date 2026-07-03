/**
 * API Module - Backend API communication
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
            timeout: options.timeout || this.timeout
        };

        if (data) {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, config);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `API Error: ${response.status}`);
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

    // Auth endpoints
    async login(email, password) {
        return this.post('/auth/login', { email, password });
    },

    async logout() {
        return this.post('/auth/logout');
    },

    async getCurrentUser() {
        return this.get('/auth/user');
    },

    // Dashboard endpoints
    async getDashboard() {
        return this.get('/dashboard');
    },

    async getRecentUploads(limit = 5) {
        return this.get(`/uploads/recent?limit=${limit}`);
    },

    // Upload endpoints
    async getUploads(page = 1, limit = 20, status = null) {
        let url = `/uploads?page=${page}&limit=${limit}`;
        if (status) url += `&status=${status}`;
        return this.get(url);
    },

    async getUpload(uploadId) {
        return this.get(`/uploads/${uploadId}`);
    },

    async retryUpload(uploadId) {
        return this.post(`/uploads/${uploadId}/retry`);
    },

    // Queue endpoints
    async getQueue() {
        return this.get('/queue');
    },

    async addToQueue(data) {
        return this.post('/queue', data);
    },

    async removeFromQueue(itemId) {
        return this.delete(`/queue/${itemId}`);
    },

    // Video endpoints
    async getVideos() {
        return this.get('/videos');
    },

    // Settings endpoints
    async getSettings() {
        return this.get('/settings');
    },

    async updateSettings(data) {
        return this.put('/settings', data);
    }
};
