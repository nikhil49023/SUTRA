export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';

export interface Alert {
  alert_id: string;
  timestamp: number;
  severity: AlertSeverity;
  title?: string;
  message: string;
  source: string;
  drone_id?: string | null;
  acknowledged: boolean;
}
