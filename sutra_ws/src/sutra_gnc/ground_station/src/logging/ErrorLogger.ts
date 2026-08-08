import { Logger } from './Logger';

export class ErrorLogger {
  public static logException(context: string, error: Error | any): void {
    Logger.error('EXCEPTION', `[${context}] ${error?.message || String(error)}`, { stack: error?.stack });
  }
}
