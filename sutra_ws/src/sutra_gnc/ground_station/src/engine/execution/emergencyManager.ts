import type { EmergencyAction, EmergencyEvent, EmergencyTriggerType } from '../types';
import { missionStateMachine } from '../core/missionStateMachine';

type EmergencyListener = (event: EmergencyEvent) => void;

export class EmergencyManager {
  private activeEvents: EmergencyEvent[] = [];
  private listeners: Set<EmergencyListener> = new Set();

  /**
   * Trigger an emergency event and execute appropriate failsafe sequence: WARNING -> HOVER -> RTL -> EMERGENCY_LAND
   */
  public triggerEmergency(trigger: EmergencyTriggerType, customMessage?: string): EmergencyEvent {
    const action = this.determineAction(trigger);
    const event: EmergencyEvent = {
      id: `emergency-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      trigger,
      action,
      timestamp: new Date().toISOString(),
      message: customMessage || this.getDefaultMessage(trigger, action),
      resolved: false
    };

    this.activeEvents.push(event);
    this.executeAction(action, trigger);

    this.listeners.forEach((listener) => listener(event));
    return event;
  }

  public resolveEmergency(eventId: string): void {
    const evt = this.activeEvents.find((e) => e.id === eventId);
    if (evt) {
      evt.resolved = true;
    }
  }

  public getActiveEmergencies(): EmergencyEvent[] {
    return this.activeEvents.filter((e) => !e.resolved);
  }

  public subscribe(listener: EmergencyListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private determineAction(trigger: EmergencyTriggerType): EmergencyAction {
    switch (trigger) {
      case 'BATTERY_CRITICAL':
        return 'RTL';
      case 'GPS_LOST':
        return 'HOVER';
      case 'RC_LOST':
        return 'RTL';
      case 'TELEMETRY_LOST':
        return 'WARNING';
      case 'GEOFENCE_VIOLATION':
        return 'RTL';
      case 'MOTOR_FAILURE':
        return 'EMERGENCY_LAND';
      case 'WEATHER_EMERGENCY':
        return 'RTL';
      default:
        return 'HOVER';
    }
  }

  private executeAction(action: EmergencyAction, trigger: EmergencyTriggerType): void {
    switch (action) {
      case 'WARNING':
        console.warn(`[EmergencyManager] WARNING issued for trigger ${trigger}`);
        break;
      case 'HOVER':
        missionStateMachine.transitionTo('HOLD', `Failsafe Hover triggered by ${trigger}`);
        break;
      case 'RTL':
        missionStateMachine.transitionTo('RTL', `Failsafe RTL triggered by ${trigger}`);
        break;
      case 'EMERGENCY_LAND':
        missionStateMachine.transitionTo('EMERGENCY', `Emergency Land triggered by ${trigger}`);
        break;
    }
  }

  private getDefaultMessage(trigger: EmergencyTriggerType, action: EmergencyAction): string {
    return `Failsafe triggered: ${trigger}. Executing response: ${action}.`;
  }
}

export const emergencyManager = new EmergencyManager();
