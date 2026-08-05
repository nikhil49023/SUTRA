export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  meta?: any;
}

export class Logger {
  private static logs: LogEntry[] = [];

  public static info(category: string, message: string, meta?: any): void {
    this.log('INFO', category, message, meta);
  }

  public static warn(category: string, message: string, meta?: any): void {
    this.log('WARN', category, message, meta);
  }

  public static error(category: string, message: string, meta?: any): void {
    this.log('ERROR', category, message, meta);
  }

  private static log(level: LogLevel, category: string, message: string, meta?: any): void {
    const entry: LogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      meta
    };
    this.logs.unshift(entry);
  }

  public static getLogs(): LogEntry[] {
    return [...this.logs];
  }
}
