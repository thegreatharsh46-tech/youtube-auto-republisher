/**
 * Notifications Module - User notifications and toast messages
 */

const notifications = {
    container: null,
    queue: [],
    currentNotifications: new Map(),

    /**
     * Initialize notifications system
     */
    init() {
        // Create container
        this.container = document.createElement('div');
        this.container.className = 'toast-container';
        document.body.appendChild(this.container);
        console.log('Notifications initialized');
    },

    /**
     * Show notification
     */
    show(message, title = '', type = 'info', duration = 4000) {
        const id = Math.random().toString(36).substr(2, 9);
        const notification = this.createNotification(id, message, title, type);

        this.container.appendChild(notification);
        this.currentNotifications.set(id, notification);

        if (duration > 0) {
            setTimeout(() => this.remove(id), duration);
        }

        return id;
    },

    /**
     * Create notification element
     */
    createNotification(id, message, title, type) {
        const div = document.createElement('div');
        div.className = `toast ${type}`;
        div.id = `notification-${id}`;

        const icon = this.getIcon(type);

        div.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                ${title ? `<p class="toast-title">${title}</p>` : ''}
                <p class="toast-message">${message}</p>
            </div>
        `;

        div.addEventListener('click', () => this.remove(id));

        return div;
    },

    /**
     * Get icon for notification type
     */
    getIcon(type) {
        const icons = {
            'success': '✓',
            'error': '✕',
            'warning': '!',
            'info': 'ℹ'
        };
        return icons[type] || 'ℹ';
    },

    /**
     * Remove notification
     */
    remove(id) {
        const notification = this.currentNotifications.get(id);
        if (notification) {
            notification.remove();
            this.currentNotifications.delete(id);
        }
    },

    /**
     * Success notification
     */
    success(message, title = 'Success') {
        return this.show(message, title, 'success');
    },

    /**
     * Error notification
     */
    error(message, title = 'Error') {
        return this.show(message, title, 'error', 5000);
    },

    /**
     * Warning notification
     */
    warning(message, title = 'Warning') {
        return this.show(message, title, 'warning', 4000);
    },

    /**
     * Info notification
     */
    info(message, title = 'Info') {
        return this.show(message, title, 'info');
    }
};
