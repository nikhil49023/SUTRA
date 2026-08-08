import { Logger } from './Logger';

export class AuditLogger {
  public static logOperatorAction(action: string, details: string): void {
    Logger.info('OPERATOR_AUDIT', `${action}: ${details}`);
  }
}
