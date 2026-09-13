/**
 * Triggers a custom, non-blocking modal alert dialog in LocalLLMMind
 * Replaces native browser window.alert()
 * @param {Object} options
 * @param {string} options.title - Dialog heading
 * @param {string} options.message - Informational message
 * @param {'info' | 'success' | 'warning' | 'error'} [options.type='info'] - Visual style/icon tone
 * @param {string} [options.confirmText='OK'] - Dismiss button label
 * @returns {Promise<boolean>}
 */
export function showCustomAlert({
  title = 'Notice',
  message = '',
  type = 'info',
  confirmText = 'OK',
} = {}) {
  if (typeof window === 'undefined') return Promise.resolve(true);

  return new Promise((resolve) => {
    const detail = {
      title,
      message,
      type,
      confirmText,
      isConfirm: false,
      onConfirm: () => resolve(true),
      onCancel: () => resolve(true),
    };
    window.dispatchEvent(new CustomEvent('localllmmind-custom-dialog', { detail }));
  });
}

/**
 * Triggers a custom modal confirmation dialog in LocalLLMMind
 * Replaces native browser window.confirm()
 * @param {Object} options
 * @param {string} options.title - Dialog heading
 * @param {string} options.message - Confirmation prompt message
 * @param {'info' | 'warning' | 'error' | 'success'} [options.type='warning'] - Alert tone
 * @param {string} [options.confirmText='Confirm'] - Confirmation action label
 * @param {string} [options.cancelText='Cancel'] - Cancellation action label
 * @param {'primary' | 'error' | 'warning' | 'success'} [options.confirmColor='primary'] - Button theme
 * @returns {Promise<boolean>} Resolves to true if user confirmed, false if cancelled
 */
export function showCustomConfirm({
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  type = 'warning',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = 'primary',
} = {}) {
  if (typeof window === 'undefined') return Promise.resolve(false);

  return new Promise((resolve) => {
    const detail = {
      title,
      message,
      type,
      confirmText,
      cancelText,
      confirmColor,
      isConfirm: true,
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false),
    };
    window.dispatchEvent(new CustomEvent('localllmmind-custom-dialog', { detail }));
  });
}
