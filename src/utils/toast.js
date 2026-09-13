/**
 * Triggers a global toast notification in LocalMind
 * @param {string} message - The message to display
 * @param {'success' | 'info' | 'warning' | 'error'} severity - Notification tone
 */
export function showToast(message, severity = 'info') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('llm-toast', {
        detail: { message, severity },
      })
    );
  }
}
