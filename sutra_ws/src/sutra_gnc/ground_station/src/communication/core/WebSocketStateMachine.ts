import type { ConnectionState } from './ConnectionState';

type StateListener = (state: ConnectionState, reason?: string) => void;

export class WebSocketStateMachine {
  private currentState: ConnectionState = 'DISCONNECTED';
  private listeners: Set<StateListener> = new Set();

  public getState(): ConnectionState {
    return this.currentState;
  }

  public transitionTo(nextState: ConnectionState, reason?: string): boolean {
    if (this.currentState === nextState) return false;

    console.log(`[WS StateMachine] Transition: ${this.currentState} -> ${nextState} (${reason || 'N/A'})`);
    this.currentState = nextState;
    this.notify(reason);
    return true;
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(reason?: string): void {
    this.listeners.forEach((l) => l(this.currentState, reason));
  }
}
