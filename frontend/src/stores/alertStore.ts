import { create } from 'zustand';
import { Alert, AlertSeverity } from '../types/alerts';

interface AlertStoreState {
  alerts: Alert[];
  unreadCount: number;
  filterSeverity: 'ALL' | AlertSeverity;

  addAlert: (alert: Omit<Alert, 'alert_id' | 'timestamp' | 'acknowledged'> & { alert_id?: string }) => void;
  acknowledgeAlert: (alertId: string) => void;
  acknowledgeAll: () => void;
  clearAlerts: () => void;
  setFilterSeverity: (sev: 'ALL' | AlertSeverity) => void;
  hydrateFromSnapshot: (alerts: Alert[]) => void;
}

export const useAlertStore = create<AlertStoreState>((set) => ({
  alerts: [
    {
      alert_id: 'alt-init-1',
      timestamp: Date.now() - 120000,
      severity: 'INFO',
      title: 'Swarm Link Active',
      message: '4/4 UAVs linked with SwarmRAFT mesh consensus.',
      source: 'communication',
      acknowledged: true,
    },
    {
      alert_id: 'alt-init-2',
      timestamp: Date.now() - 60000,
      severity: 'WARNING',
      title: 'Wind Gust Advisory',
      message: 'Crosswind 14 kts detected at 30m AGL.',
      source: 'gis_weather',
      acknowledged: false,
    },
  ],
  unreadCount: 1,
  filterSeverity: 'ALL',

  addAlert: (alertData) =>
    set((s) => {
      const newAlert: Alert = {
        alert_id: alertData.alert_id || `alert-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp: Date.now(),
        severity: alertData.severity,
        title: alertData.title || alertData.severity,
        message: alertData.message,
        source: alertData.source,
        drone_id: alertData.drone_id,
        acknowledged: false,
      };
      const updatedAlerts = [newAlert, ...s.alerts].slice(0, 50);
      const unreadCount = updatedAlerts.filter((a) => !a.acknowledged).length;
      return { alerts: updatedAlerts, unreadCount };
    }),

  acknowledgeAlert: (alertId) =>
    set((s) => {
      const updated = s.alerts.map((a) => (a.alert_id === alertId ? { ...a, acknowledged: true } : a));
      return {
        alerts: updated,
        unreadCount: updated.filter((a) => !a.acknowledged).length,
      };
    }),

  acknowledgeAll: () =>
    set((s) => ({
      alerts: s.alerts.map((a) => ({ ...a, acknowledged: true })),
      unreadCount: 0,
    })),

  clearAlerts: () => set({ alerts: [], unreadCount: 0 }),
  setFilterSeverity: (filterSeverity) => set({ filterSeverity }),
  hydrateFromSnapshot: (alerts) =>
    set({
      alerts,
      unreadCount: alerts.filter((a) => !a.acknowledged).length,
    }),
}));
