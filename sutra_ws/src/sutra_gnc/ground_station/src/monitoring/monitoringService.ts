import { HealthChecker } from './healthChecker';
import { OfflineManager } from './offlineManager';
import { DiagnosticsEngine } from './diagnosticsEngine';
import { LoggerService } from '../services/loggerService';
import type { DetailedHealthMetrics, SubsystemDiagnostic } from './types';

export class MonitoringService {
  private static instance: MonitoringService;
  private offlineManager: OfflineManager = new OfflineManager();

  private constructor() {}

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  public getHealthMetrics(): DetailedHealthMetrics {
    return HealthChecker.collectHealthMetrics(true);
  }

  public runDiagnostics(): SubsystemDiagnostic[] {
    const results = DiagnosticsEngine.runFullDiagnostics();
    LoggerService.info('MonitoringService', `Ran full system diagnostics: ${results.length} subsystems checked.`);
    return results;
  }

  public getOfflineManager(): OfflineManager {
    return this.offlineManager;
  }
}

export const monitoringService = MonitoringService.getInstance();
