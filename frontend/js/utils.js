/**
 * Utilities Module - Helper functions and notification system
 * Provides toast notifications, formatting, and common utilities
 */

class NotificationSystem {
    constructor() {
        this.toastContainer = null;
    }

    /**
     * Initialize toast container
     */
    init() {
        this.toastContainer = document.getElementById('toastContainer');
        if (!this.toastContainer) {
            this.toastContainer = document.createElement('div');
            this.toastContainer.className = 'toast-container';
            this.toastContainer.id = 'toastContainer';
            document.body.appendChild(this.toastContainer);
        }
    }

    /**
     * Show toast notification
     */
    show(message, type = 'info', title = '', duration = 5000) {
        if (!this.toastContainer) {
            this.init();
        }

        const toastId = `toast-${Date.now()}`;
        
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.id = toastId;
        toast.innerHTML = `
            <div class="toast-icon">${icons[type]}</div>
            <div class="toast-content">
                ${title ? `<p class="toast-title">${title}</p>` : ''}
                <p class="toast-message">${message}</p>
            </div>
        `;

        this.toastContainer.appendChild(toast);

        if (duration > 0) {
            setTimeout(() => {
                toast.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }

        return toastId;
    }

    /**
     * Show success notification
     */
    success(message, title = 'Success', duration = 5000) {
        return this.show(message, 'success', title, duration);
    }

    /**
     * Show error notification
     */
    error(message, title = 'Error', duration = 5000) {
        return this.show(message, 'error', title, duration);
    }

    /**
     * Show warning notification
     */
    warning(message, title = 'Warning', duration = 5000) {
        return this.show(message, 'warning', title, duration);
    }

    /**
     * Show info notification
     */
    info(message, title = 'Info', duration = 5000) {
        return this.show(message, 'info', title, duration);
    }

    /**
     * Remove specific toast
     */
    remove(toastId) {
        const toast = document.getElementById(toastId);
        if (toast) {
            toast.remove();
        }
    }

    /**
     * Clear all toasts
     */
    clearAll() {
        if (this.toastContainer) {
            this.toastContainer.innerHTML = '';
        }
    }
}

/**
 * Utilities class for formatting and common operations
 */
class Utilities {
    /**
     * Format file size to human readable format
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Format duration (seconds to hh:mm:ss)
     */
    static formatDuration(seconds) {
        if (!seconds) return '00:00:00';

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        return [
            hours.toString().padStart(2, '0'),
            minutes.toString().padStart(2, '0'),
            secs.toString().padStart(2, '0')
        ].join(':');
    }

    /**
     * Format date to readable format
     */
    static formatDate(date, format = 'short') {
        if (!date) return '-';

        const d = new Date(date);

        if (format === 'short') {
            return d.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } else if (format === 'long') {
            return d.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });
        } else if (format === 'datetime') {
            return d.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        return d.toString();
    }

    /**
     * Format relative time (e.g., "2 hours ago")
     */
    static formatRelativeTime(date) {
        if (!date) return '-';

        const now = new Date();
        const d = new Date(date);
        const seconds = Math.floor((now - d) / 1000);

        const intervals = [
            { label: 'year', seconds: 31536000 },
            { label: 'month', seconds: 2592000 },
            { label: 'week', seconds: 604800 },
            { label: 'day', seconds: 86400 },
            { label: 'hour', seconds: 3600 },
            { label: 'minute', seconds: 60 }
        ];

        for (const interval of intervals) {
            const count = Math.floor(seconds / interval.seconds);
            if (count >= 1) {
                return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
            }
        }

        return 'just now';
    }

    /**
     * Truncate text to specified length
     */
    static truncate(text, length = 50) {
        if (!text) return '';
        if (text.length <= length) return text;
        return text.substring(0, length) + '...';
    }

    /**
     * Extract YouTube video ID from URL
     */
    static getYouTubeId(url) {
        if (!url) return null;

        const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
        const match = url.match(regex);
        return match ? match[1] : null;
    }

    /**
     * Generate YouTube thumbnail URL
     */
    static getYouTubeThumbnail(videoId, quality = 'medium') {
        if (!videoId) return null;

        const qualities = {
            low: 'default',
            medium: 'mqdefault',
            high: 'sddefault',
            max: 'maxresdefault'
        };

        return `https://img.youtube.com/vi/${videoId}/${qualities[quality] || 'mqdefault'}.jpg`;
    }

    /**
     * Debounce function
     */
    static debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function
     */
    static throttle(func, limit = 300) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => (inThrottle = false), limit);
            }
        };
    }

    /**
     * Copy text to clipboard
     */
    static copyToClipboard(text) {
        if (!navigator.clipboard) {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            return true;
        }

        return navigator.clipboard.writeText(text)
            .then(() => true)
            .catch(() => false);
    }

    /**
     * Validate email address
     */
    static isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    /**
     * Validate URL
     */
    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Deep clone object
     */
    static deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * Check if object is empty
     */
    static isEmpty(obj) {
        return Object.keys(obj).length === 0;
    }

    /**
     * Get object value by path
     */
    static getNestedValue(obj, path) {
        return path.split('.').reduce((current, prop) => current?.[prop], obj);
    }

    /**
     * Set object value by path
     */
    static setNestedValue(obj, path, value) {
        const keys = path.split('.');
        let current = obj;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key]) {
                current[key] = {};
            }
            current = current[key];
        }

        current[keys[keys.length - 1]] = value;
        return obj;
    }

    /**
     * Convert object to query string
     */
    static objectToQueryString(obj) {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(obj)) {
            if (value !== null && value !== undefined) {
                params.append(key, value);
            }
        }
        return params.toString();
    }

    /**
     * Wait for specified duration
     */
    static wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Generate unique ID
     */
    static generateId(prefix = '') {
        const id = Math.random().toString(36).substring(2, 11);
        return prefix ? `${prefix}-${id}` : id;
    }

    /**
     * Get storage item with fallback
     */
    static getStorage(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : defaultValue;
        } catch {
            return defaultValue;
        }
    }

    /**
     * Set storage item
     */
    static setStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Remove storage item
     */
    static removeStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Check if online
     */
    static isOnline() {
        return navigator.onLine;
    }

    /**
     * Format percentage
     */
    static formatPercentage(value, decimals = 1) {
        return `${(value || 0).toFixed(decimals)}%`;
    }

    /**
     * Get status color class
     */
    static getStatusColor(status) {
        const statusMap = {
            'pending': 'status-pending',
            'in_progress': 'status-in-progress',
            'completed': 'status-completed',
            'failed': 'status-failed'
        };
        return statusMap[status] || 'status-pending';
    }

    /**
     * Get status display name
     */
    static getStatusDisplay(status) {
        const displayMap = {
            'pending': 'Pending',
            'in_progress': 'In Progress',
            'completed': 'Completed',
            'failed': 'Failed'
        };
        return displayMap[status] || status;
    }

    /**
     * Build retry button text
     */
    static getRetryText(retries, maxRetries) {
        return `Retry (${retries}/${maxRetries})`;
    }
}

/**
 * Modal helper class
 */
class ModalHelper {
    /**
     * Open modal
     */
    static open(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Close modal
     */
    static close(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    }

    /**
     * Toggle modal
     */
    static toggle(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.toggle('active');
            if (modal.classList.contains('active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = 'auto';
            }
        }
    }

    /**
     * Close all modals
     */
    static closeAll() {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = 'auto';
    }
}

/**
 * Loading helper class
 */
class LoadingHelper {
    /**
     * Show loading state
     */
    static show(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = '<p class="loading">Loading...</p>';
        }
    }

    /**
     * Show error state
     */
    static error(elementId, message = 'Failed to load') {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `<p class="empty-state">${message}</p>`;
        }
    }

    /**
     * Show empty state
     */
    static empty(elementId, message = 'No items') {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `<p class="empty-state">${message}</p>`;
        }
    }

    /**
     * Set button loading state
     */
    static setButtonLoading(buttonId, isLoading = true) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = isLoading;
            button.style.opacity = isLoading ? '0.6' : '1';
            if (isLoading) {
                button.dataset.originalText = button.textContent;
                button.textContent = 'Loading...';
            } else {
                button.textContent = button.dataset.originalText || button.textContent;
            }
        }
    }
}

// Create global instances
const notifications = new NotificationSystem();
const utils = Utilities;
const modal = ModalHelper;
const loading = LoadingHelper;

// Initialize notifications on page load
document.addEventListener('DOMContentLoaded', () => {
    notifications.init();
});

// Add slide out animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
