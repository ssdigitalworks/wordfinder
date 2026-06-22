// Simple event-driven toast system
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export function showToast(message: string, type: ToastType = 'info', duration: number = 5000) {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('show-toast', {
      detail: { message, type, duration }
    });
    window.dispatchEvent(event);
  }
}
