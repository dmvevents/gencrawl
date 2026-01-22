/**
 * Toast Notification System
 *
 * Provides toast notifications using react-hot-toast.
 * Includes custom styling for dark mode and different notification types.
 */

// Note: This requires react-hot-toast to be installed
// Run: pnpm add react-hot-toast

import toast, { Toaster, ToastOptions, Toast } from 'react-hot-toast';

// Custom styles for different toast types
const baseStyles: ToastOptions = {
  duration: 4000,
  position: 'top-right',
  style: {
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: '500',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
};

// Success toast
export function showSuccess(message: string, options?: ToastOptions) {
  return toast.success(message, {
    ...baseStyles,
    ...options,
    style: {
      ...baseStyles.style,
      background: '#10B981',
      color: '#fff',
      ...options?.style,
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#10B981',
    },
  });
}

// Error toast
export function showError(message: string, options?: ToastOptions) {
  return toast.error(message, {
    ...baseStyles,
    duration: 6000, // Errors stay longer
    ...options,
    style: {
      ...baseStyles.style,
      background: '#EF4444',
      color: '#fff',
      ...options?.style,
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#EF4444',
    },
  });
}

// Info toast
export function showInfo(message: string, options?: ToastOptions) {
  return toast(message, {
    ...baseStyles,
    ...options,
    icon: 'i',
    style: {
      ...baseStyles.style,
      background: '#3B82F6',
      color: '#fff',
      ...options?.style,
    },
  });
}

// Warning toast
export function showWarning(message: string, options?: ToastOptions) {
  return toast(message, {
    ...baseStyles,
    duration: 5000,
    ...options,
    icon: '!',
    style: {
      ...baseStyles.style,
      background: '#F59E0B',
      color: '#fff',
      ...options?.style,
    },
  });
}

// Loading toast (returns toast ID for dismissal)
export function showLoading(message: string, options?: ToastOptions) {
  return toast.loading(message, {
    ...baseStyles,
    duration: Infinity, // Loading toasts don't auto-dismiss
    ...options,
    style: {
      ...baseStyles.style,
      background: '#374151',
      color: '#fff',
      ...options?.style,
    },
  });
}

// Promise toast (shows loading, then success/error)
export function showPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((err: Error) => string);
  },
  options?: ToastOptions
) {
  return toast.promise(promise, messages, {
    ...baseStyles,
    ...options,
    loading: {
      ...baseStyles,
      style: {
        ...baseStyles.style,
        background: '#374151',
        color: '#fff',
      },
    },
    success: {
      ...baseStyles,
      style: {
        ...baseStyles.style,
        background: '#10B981',
        color: '#fff',
      },
    },
    error: {
      ...baseStyles,
      style: {
        ...baseStyles.style,
        background: '#EF4444',
        color: '#fff',
      },
    },
  });
}

// Dismiss toast by ID
export function dismissToast(toastId?: string) {
  if (toastId) {
    toast.dismiss(toastId);
  } else {
    toast.dismiss();
  }
}

// Custom toast with JSX
export function showCustom(
  render: (t: Toast) => React.ReactNode,
  options?: ToastOptions
) {
  return toast.custom(render as any, {
    ...baseStyles,
    ...options,
  });
}

// Convenience object with all methods
export const showToast = {
  success: showSuccess,
  error: showError,
  info: showInfo,
  warning: showWarning,
  loading: showLoading,
  promise: showPromise,
  dismiss: dismissToast,
  custom: showCustom,
};

// Export Toaster component for use in layout
export { Toaster };

// Default export
export default showToast;
