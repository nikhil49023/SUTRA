import type { SecurityAuditLog } from './types';

export class AuditLogger {
  private static logs: SecurityAuditLog[] = [];
  private static storageKey: string = 'gcs_security_audit_logs';

  public static logEvent(
    userId: string,
    callsign: string,
    action: string,
    resource: string,
    status: 'GRANTED' | 'DENIED' | 'SUCCESS' | 'FAILURE'
  ) {
    const entry: SecurityAuditLog = {
      id: `AUDIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId,
      callsign,
      action,
      resource,
      status,
      ipAddress: '127.0.0.1'
    };

    this.logs.push(entry);
    if (this.logs.length > 500) this.logs.shift();

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.logs));
    } catch (e) {}
  }

  public static getLogs(): SecurityAuditLog[] {
    return [...this.logs];
  }
}
