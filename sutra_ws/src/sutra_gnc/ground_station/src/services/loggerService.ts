export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  details?: any;
}

export class LoggerService {
  private static logBuffer: LogEntry[] = [];
  private static maxBufferLength: number = 200;

  public static info(module: string, message: string, details?: any) {
    this.log('INFO', module, message, details);
  }

  public static warn(module: string, message: string, details?: any) {
    this.log('WARN', module, message, details);
  }

  public static error(module: string, message: string, details?: any) {
    this.log('ERROR', module, message, details);
  }

  private static log(level: LogLevel, module: string, message: string, details?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      details
    };

    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferLength) {
      this.logBuffer.shift();
    }

    if (level === 'ERROR' || level === 'FATAL') {
      console.error(`[${entry.timestamp}] [${level}] [${module}]`, message, details || '');
    } else if (level === 'WARN') {
      console.warn(`[${entry.timestamp}] [${level}] [${module}]`, message, details || '');
    }
  }

  public static getLogs(): LogEntry[] {
    return [...this.logBuffer];
  }
}
