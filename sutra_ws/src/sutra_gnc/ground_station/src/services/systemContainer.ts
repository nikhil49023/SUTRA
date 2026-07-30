import { droneManager } from '../communication/mavlinkDroneManager';
import { MissionEngine } from '../engine/missionEngine';
import { GISIntelligenceService } from '../gis/gisIntelligenceService';
import { MissionAIEngine } from '../ai/missionAIEngine';
import { replayEngine } from '../replay/replayEngine';
import { monitoringService } from '../monitoring/monitoringService';
import { swarmManager } from '../swarm/swarmManager';
import { securityManager } from '../security/securityManager';
import { pluginManager } from '../plugins/pluginManager';
import { configManager } from '../config/configManager';
import { collaborationManager } from '../collaboration/collaborationManager';
import { eventBus } from './eventBus';
import { LoggerService } from './loggerService';

export class GCSSystemContainer {
  private static instance: GCSSystemContainer;

  private constructor() {
    this.initSystemLogging();
  }

  public static getInstance(): GCSSystemContainer {
    if (!GCSSystemContainer.instance) {
      GCSSystemContainer.instance = new GCSSystemContainer();
    }
    return GCSSystemContainer.instance;
  }

  private initSystemLogging() {
    eventBus.subscribe('SYSTEM_ALERT', (evt) => {
      LoggerService.info('EventBus', `System Alert: ${evt.data?.message || 'Triggered'}`);
    });
  }

  public getDroneManager() { return droneManager; }
  public getMissionEngine() { return MissionEngine; }
  public getGISService() { return GISIntelligenceService; }
  public getAIEngine() { return MissionAIEngine; }
  public getReplayEngine() { return replayEngine; }
  public getMonitoringService() { return monitoringService; }
  public getSwarmManager() { return swarmManager; }
  public getSecurityManager() { return securityManager; }
  public getPluginManager() { return pluginManager; }
  public getConfigManager() { return configManager; }
  public getCollaborationManager() { return collaborationManager; }
  public getEventBus() { return eventBus; }
}

export const gcsSystem = GCSSystemContainer.getInstance();
