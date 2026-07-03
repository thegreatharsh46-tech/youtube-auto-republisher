/**
 * Loading State Management Module - Handle loading states across the app
 */

const loading = {
    /**
     * Show loading state for element
     */
    show(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = '<p class="loading">Loading...</p>';
            element.setAttribute('data-loading', 'true');
        }
    },

    /**
     * Show empty state for element
     */
    empty(elementId, message = 'No data found') {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `<p class="empty-state">${message}</p>`;
            element.removeAttribute('data-loading');
        }
    },

    /**
     * Show error state for element
     */
    error(elementId, message = 'An error occurred') {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <div style="padding: 2rem; text-align: center;">
                    <p style="color: var(--error-color); font-weight: 600; margin-bottom: 0.5rem;">${message}</p>
                    <p style="color: var(--text-tertiary); font-size: 0.875rem;">Please try again later</p>
                </div>
            `;
            element.removeAttribute('data-loading');
        }
    },

    /**
     * Set button loading state
     */
    setButtonLoading(buttonId, isLoading) {
        const button = document.getElementById(buttonId);
        if (button) {
            if (isLoading) {
                button.disabled = true;
                button.setAttribute('data-loading', 'true');
                const originalText = button.textContent;
                button.setAttribute('data-original-text', originalText);
                button.innerHTML = '<span style="display: inline-flex; gap: 0.5rem; align-items: center;"><span class="spinner" style="width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite;"></span>Loading...</span>';
            } else {
                button.disabled = false;
                button.removeAttribute('data-loading');
                const originalText = button.getAttribute('data-original-text') || 'Submit';
                button.textContent = originalText;
            }
        }
    },

    /**
     * Clear loading state for element
     */
    clear(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = '';
            element.removeAttribute('data-loading');
        }
    }
};
