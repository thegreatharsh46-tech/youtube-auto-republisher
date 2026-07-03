/**
 * Modal Management Module - Handle modal operations
 */

const modal = {
    /**
     * Close all modals
     */
    closeAll() {
        const modals = document.querySelectorAll('.modal.active');
        modals.forEach(m => {
            m.classList.remove('active');
        });
        document.body.style.overflow = 'auto';
    },

    /**
     * Open modal
     */
    open(modalId) {
        const modalElement = document.getElementById(modalId);
        if (modalElement) {
            modalElement.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    },

    /**
     * Close modal
     */
    close(modalId) {
        const modalElement = document.getElementById(modalId);
        if (modalElement) {
            modalElement.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    },

    /**
     * Toggle modal
     */
    toggle(modalId) {
        const modalElement = document.getElementById(modalId);
        if (modalElement) {
            modalElement.classList.toggle('active');
            if (modalElement.classList.contains('active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = 'auto';
            }
        }
    }
};
