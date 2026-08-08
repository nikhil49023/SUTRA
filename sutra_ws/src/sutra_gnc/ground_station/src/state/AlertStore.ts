import { useState, useEffect } from 'react';

export interface TacticalAlert {
  id: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  timestamp: string;
}

type AlertListener = () => void;

class AlertStore {
  private alerts: TacticalAlert[] = [];
  private listeners: Set<AlertListener> = new Set();

  public getAlerts(): TacticalAlert[] {
    return [...this.alerts];
  }

  public addAlert(severity: 'INFO' | 'WARNING' | 'CRITICAL', message: string): void {
    const alert: TacticalAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      severity,
      message,
      timestamp: new Date().toTimeString().split(' ')[0]
    };
    this.alerts.unshift(alert);
    if (this.alerts.length > 50) this.alerts.pop();
    this.notify();
  }

  public subscribe(listener: AlertListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }
}

export const alertStore = new AlertStore();

export function useAlertStore() {
  const [, setTick] = useState(0);
  useEffect(() => {
    return alertStore.subscribe(() => setTick((t) => t + 1));
  }, []);

  return {
    alerts: alertStore.getAlerts(),
    addAlert: alertStore.addAlert.bind(alertStore)
  };
}
