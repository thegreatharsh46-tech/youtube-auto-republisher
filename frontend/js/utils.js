/**
 * Utility Functions Module - Common helper functions used across the application
 */

const utils = {
    /**
     * Format date to display format
     */
    formatDate(date, format = 'date') {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');

        switch (format) {
            case 'date':
                return `${year}-${month}-${day}`;
            case 'time':
                return `${hours}:${minutes}:${seconds}`;
            case 'datetime':
                return `${year}-${month}-${day} ${hours}:${minutes}`;
            case 'short':
                return `${month}/${day}/${year}`;
            default:
                return d.toLocaleString();
        }
    },

    /**
     * Format date as relative time (e.g., "2 hours ago")
     */
    formatRelativeTime(date) {
        const now = new Date();
        const d = new Date(date);
        const diff = Math.floor((now - d) / 1000); // seconds

        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
        if (diff < 2592000) return `${Math.floor(diff / 604800)} weeks ago`;
        if (diff < 31536000) return `${Math.floor(diff / 2592000)} months ago`;
        return `${Math.floor(diff / 31536000)} years ago`;
    },

    /**
     * Format number as percentage
     */
    formatPercentage(value) {
        return `${Math.round(value)}%`;
    },

    /**
     * Truncate text to specified length
     */
    truncate(text, maxLength = 50) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    /**
     * Get status color class
     */
    getStatusColor(status) {
        const statusColors = {
            'pending': 'status-pending',
            'in-progress': 'status-in-progress',
            'processing': 'status-in-progress',
            'completed': 'status-completed',
            'success': 'status-completed',
            'failed': 'status-failed',
            'error': 'status-failed'
        };
        return statusColors[status?.toLowerCase()] || 'status-pending';
    },

    /**
     * Get status display text
     */
    getStatusDisplay(status) {
        const displays = {
            'pending': 'Pending',
            'in-progress': 'In Progress',
            'processing': 'Processing',
            'completed': 'Completed',
            'success': 'Success',
            'failed': 'Failed',
            'error': 'Error'
        };
        return displays[status?.toLowerCase()] || status;
    },

    /**
     * Get YouTube thumbnail URL
     */
    getYouTubeThumbnail(videoId) {
        if (!videoId) return null;
        return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    },

    /**
     * Get local storage
     */
    getStorage(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : defaultValue;
        } catch (error) {
            console.error('Storage error:', error);
            return defaultValue;
        }
    },

    /**
     * Set local storage
     */
    setStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error('Storage error:', error);
        }
    },

    /**
     * Debounce function
     */
    debounce(func, delay = 300) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }
};
