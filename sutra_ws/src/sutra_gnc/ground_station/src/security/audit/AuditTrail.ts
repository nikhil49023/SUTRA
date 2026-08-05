import type { SecurityAuditRecord } from '../types';

export class AuditTrail {
  private static logs: SecurityAuditRecord[] = [];

  public static logAction(action: string, targetResource: string, status: 'SUCCESS' | 'DENIED' | 'FLAGGED' = 'SUCCESS'): void {
    const record: SecurityAuditRecord = {
      id: `audit-${Date.now()}`,
      userId: 'user-001',
      action,
      targetResource,
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
      status
    };
    this.logs.unshift(record);
  }

  public static getLogs(): SecurityAuditRecord[] {
    return [...this.logs];
  }
}
