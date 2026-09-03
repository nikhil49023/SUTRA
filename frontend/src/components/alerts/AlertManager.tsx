import React from 'react';
import { useAlertStore } from '../../stores/alertStore';
import { wsClient } from '../../communication/WebSocketClient';
import { ShieldAlert, AlertTriangle, Info, Check, X } from 'lucide-react';
import { formatTimestamp } from '../../utils/formatting';

export const AlertManager: React.FC = () => {
  const { alerts, acknowledgeAlert } = useAlertStore();

  const unacknowledged = alerts.filter((a) => !a.acknowledged);

  if (unacknowledged.length === 0) return null;

  return (
    <div className="fixed top-14 right-4 z-50 flex flex-col space-y-2 max-w-sm pointer-events-auto select-none font-mono">
      {unacknowledged.slice(0, 3).map((alert) => {
        const isEmergency = alert.severity === 'EMERGENCY' || alert.severity === 'CRITICAL';

        return (
          <div
            key={alert.alert_id}
            className={`p-3 rounded-lg border shadow-xl backdrop-blur-md flex items-start space-x-3 transition-all animate-slide-in ${
              isEmergency
                ? 'bg-rose-950/95 border-rose-500 text-rose-100'
                : alert.severity === 'WARNING'
                ? 'bg-amber-950/95 border-amber-500 text-amber-100'
                : 'bg-slate-900/95 border-cyan-500 text-slate-100'
            }`}
          >
            {isEmergency ? (
              <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0 animate-bounce mt-0.5" />
            ) : alert.severity === 'WARNING' ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            ) : (
              <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider">{alert.title || alert.severity}</span>
                <span className="text-[9px] text-slate-400 tabular-nums">{formatTimestamp(alert.timestamp)}</span>
              </div>
              <p className="text-[11px] mt-0.5 leading-snug">{alert.message}</p>

              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => {
                    acknowledgeAlert(alert.alert_id);
                    wsClient.sendCommand('ALERT_ACKNOWLEDGE', { alert_id: alert.alert_id });
                  }}
                  className="px-2 py-0.5 rounded bg-black/40 border border-slate-600 hover:bg-black/60 text-[10px] font-bold flex items-center space-x-1"
                >
                  <Check className="w-3 h-3" />
                  <span>ACKNOWLEDGE</span>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
