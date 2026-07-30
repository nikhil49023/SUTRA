import { create } from 'zustand';

export interface ToastNotification {
  id: string;
  type: 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS';
  title: string;
  message: string;
  timestamp: string;
}

export interface NotificationStoreState {
  toasts: ToastNotification[];
  addToast: (toast: Omit<ToastNotification, 'id' | 'timestamp'>) => void;
  removeToast: (id: string) => void;
}

export const useNotificationStore = create<NotificationStoreState>((set) => ({
  toasts: [],
  addToast: (toastData) => {
    const id = `TOAST-${Date.now()}`;
    const timestamp = new Date().toTimeString().split(' ')[0];
    const newToast: ToastNotification = { ...toastData, id, timestamp };

    set((state) => ({ toasts: [newToast, ...state.toasts].slice(0, 5) }));

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
}));
