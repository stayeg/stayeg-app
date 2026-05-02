/**
 * Unified toast helper wrapping sonner's toast API.
 * Import this everywhere instead of calling toast directly from sonner.
 *
 * Usage:
 *   import { toast } from '@/lib/toast';
 *   toast.success('Payment successful!');
 *   toast.error('Something went wrong');
 *   toast.info('Heads up!');
 */
import { toast as sonnerToast } from 'sonner';

type ToastType = 'success' | 'error' | 'info';

const typeDefaults: Record<ToastType, { description?: string }> = {
  success: {},
  error: {},
  info: {},
};

function createToastHelper(type: ToastType) {
  return (message: string, options?: { description?: string; duration?: number }) => {
    const opts = { ...typeDefaults[type], ...options };
    switch (type) {
      case 'success':
        sonnerToast.success(message, opts);
        break;
      case 'error':
        sonnerToast.error(message, opts);
        break;
      case 'info':
        sonnerToast.info(message, opts);
        break;
    }
  };
}

export const toast = {
  success: createToastHelper('success'),
  error: createToastHelper('error'),
  info: createToastHelper('info'),
  /** Low-level access to sonner's toast for advanced usage */
  raw: sonnerToast,
};
