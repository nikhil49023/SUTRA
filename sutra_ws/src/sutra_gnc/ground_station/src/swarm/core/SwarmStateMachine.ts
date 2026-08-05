import type { SwarmState } from '../types';

type SwarmStateListener = (state: SwarmState, previousState: SwarmState) => void;

export class SwarmStateMachine {
  private currentState: SwarmState = 'IN_FORMATION';
  private listeners: Set<SwarmStateListener> = new Set();

  public getState(): SwarmState {
    return this.currentState;
  }

  public transitionTo(nextState: SwarmState): boolean {
    if (this.currentState === nextState) return true;
    const prev = this.currentState;
    this.currentState = nextState;
    this.listeners.forEach((l) => l(nextState, prev));
    return true;
  }

  public subscribe(listener: SwarmStateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const swarmStateMachine = new SwarmStateMachine();
