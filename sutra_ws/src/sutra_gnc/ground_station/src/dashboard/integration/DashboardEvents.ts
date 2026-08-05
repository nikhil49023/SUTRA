import { eventBus } from '../../services/eventBus';

export class DashboardEvents {
  public static triggerEmergency(droneId: string, reason: string): void {
    eventBus.emit('EMERGENCY_TRIGGERED' as any, { droneId, reason });
  }

  public static selectEntity(type: 'DRONE' | 'MISSION' | 'GEOFENCE' | 'AI_TARGET', id: string): void {
    eventBus.emit('ENTITY_SELECTED' as any, { type, id });
  }
}
