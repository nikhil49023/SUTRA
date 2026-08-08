import type { MissionState } from '../types';

type StateListener = (state: MissionState, previousState: MissionState, reason?: string) => void;

/**
 * Valid state transitions mapping
 */
const VALID_TRANSITIONS: Record<MissionState, MissionState[]> = {
  IDLE: ['PLANNING', 'EMERGENCY'],
  PLANNING: ['READY', 'IDLE', 'ABORTED', 'EMERGENCY'],
  READY: ['UPLOADING', 'PLANNING', 'ABORTED', 'EMERGENCY'],
  UPLOADING: ['ARMING', 'READY', 'ABORTED', 'EMERGENCY'],
  ARMING: ['TAKEOFF', 'READY', 'ABORTED', 'EMERGENCY'],
  TAKEOFF: ['MISSION', 'HOLD', 'RTL', 'LANDING', 'ABORTED', 'EMERGENCY'],
  MISSION: ['HOLD', 'RTL', 'LANDING', 'COMPLETE', 'ABORTED', 'EMERGENCY'],
  HOLD: ['MISSION', 'RTL', 'LANDING', 'ABORTED', 'EMERGENCY'],
  RTL: ['LANDING', 'HOLD', 'ABORTED', 'EMERGENCY'],
  LANDING: ['COMPLETE', 'RTL', 'ABORTED', 'EMERGENCY'],
  COMPLETE: ['IDLE', 'PLANNING'],
  ABORTED: ['IDLE', 'PLANNING', 'RTL', 'LANDING'],
  EMERGENCY: ['LANDING', 'RTL', 'IDLE', 'ABORTED']
};

export class MissionStateMachine {
  private currentState: MissionState = 'IDLE';
  private listeners: Set<StateListener> = new Set();
  private history: { state: MissionState; timestamp: string; reason?: string }[] = [];

  constructor(initialState: MissionState = 'IDLE') {
    this.currentState = initialState;
    this.recordHistory(initialState, 'Initialization');
  }

  public getState(): MissionState {
    return this.currentState;
  }

  public canTransitionTo(nextState: MissionState): boolean {
    const allowed = VALID_TRANSITIONS[this.currentState] || [];
    return allowed.includes(nextState);
  }

  public transitionTo(nextState: MissionState, reason?: string): boolean {
    if (this.currentState === nextState) return true;

    if (!this.canTransitionTo(nextState)) {
      console.warn(`[MissionStateMachine] Invalid transition from ${this.currentState} to ${nextState}`);
      return false;
    }

    const previousState = this.currentState;
    this.currentState = nextState;
    this.recordHistory(nextState, reason);

    this.listeners.forEach((listener) => listener(nextState, previousState, reason));
    return true;
  }

  public forceState(nextState: MissionState, reason?: string): void {
    const previousState = this.currentState;
    this.currentState = nextState;
    this.recordHistory(nextState, `FORCED: ${reason || ''}`);
    this.listeners.forEach((listener) => listener(nextState, previousState, reason));
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getHistory() {
    return [...this.history];
  }

  private recordHistory(state: MissionState, reason?: string) {
    this.history.push({
      state,
      timestamp: new Date().toISOString(),
      reason
    });
  }
}

export const missionStateMachine = new MissionStateMachine();
