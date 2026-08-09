import React from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useNotificationStore } from '../../store/notificationStore';

export const NotificationToastContainer: React.FC = () => {
  const { toasts, removeToast } = useNotificationStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col space-y-2 w-80 pointer-events-auto">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`p-2.5 rounded border backdrop-blur-md shadow-2xl flex items-start justify-between font-mono text-xs animate-in slide-in-from-right duration-200 ${
            toast.type === 'CRITICAL'
              ? 'bg-rose-500/15 border-rose-500/50 text-rose-300'
              : toast.type === 'WARNING'
              ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
              : toast.type === 'SUCCESS'
              ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
              : 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300'
          }`}
        >
          <div className="flex items-start space-x-2">
            {toast.type === 'CRITICAL' || toast.type === 'WARNING' ? (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            ) : toast.type === 'SUCCESS' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold text-[11px] uppercase flex items-center justify-between">
                <span>{toast.title}</span>
                <span className="text-[9px] opacity-60 ml-2">{toast.timestamp}</span>
              </div>
              <p className="text-[10px] opacity-90 mt-0.5">{toast.message}</p>
            </div>
          </div>

          <button
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-slate-200 p-0.5 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
