import { Logger } from './Logger';

export class MissionLogger {
  public static logMissionEvent(missionId: string, event: string): void {
    Logger.info('MISSION_ENGINE', `[Mission ${missionId}] ${event}`);
  }
}
