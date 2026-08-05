import { useState, useEffect } from 'react';

export interface MapState {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  styleMode: string;
}

type MapListener = () => void;

class MapStore {
  private state: MapState = {
    center: [34.5225, 45.1082],
    zoom: 14,
    pitch: 45,
    bearing: -15,
    styleMode: 'TACTICAL_DARK'
  };

  private listeners: Set<MapListener> = new Set();

  public getState(): MapState {
    return { ...this.state };
  }

  public updateState(patch: Partial<MapState>): void {
    Object.assign(this.state, patch);
    this.notify();
  }

  public subscribe(listener: MapListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }
}

export const mapStore = new MapStore();

export function useMapStore() {
  const [, setTick] = useState(0);
  useEffect(() => {
    return mapStore.subscribe(() => setTick((t) => t + 1));
  }, []);

  return {
    state: mapStore.getState(),
    updateState: mapStore.updateState.bind(mapStore)
  };
}
