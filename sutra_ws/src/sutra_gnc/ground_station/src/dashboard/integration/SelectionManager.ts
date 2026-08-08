export type SelectionType = 'NONE' | 'DRONE' | 'MISSION' | 'GEOFENCE' | 'AI_TARGET';

export interface SelectionState {
  type: SelectionType;
  id: string | null;
  data: any | null;
}

type SelectionListener = (state: SelectionState) => void;

export class SelectionManager {
  private static currentState: SelectionState = { type: 'NONE', id: null, data: null };
  private static listeners: Set<SelectionListener> = new Set();

  public static getSelection(): SelectionState {
    return this.currentState;
  }

  public static select(type: SelectionType, id: string | null, data: any | null = null): void {
    this.currentState = { type, id, data };
    this.listeners.forEach((l) => l(this.currentState));
  }

  public static clear(): void {
    this.select('NONE', null, null);
  }

  public static subscribe(listener: SelectionListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
