import { useState, useEffect } from 'react';

export interface HUDConfig {
  showPitchLadder: boolean;
  showCompassRibbon: boolean;
  showAirspeedTape: boolean;
  showAltimeterTape: boolean;
  showFlightDirector: boolean;
  showTargetReticle: boolean;
  showCameraHUD: boolean;
}

type HUDListener = () => void;

class HUDStore {
  private config: HUDConfig = {
    showPitchLadder: true,
    showCompassRibbon: true,
    showAirspeedTape: true,
    showAltimeterTape: true,
    showFlightDirector: true,
    showTargetReticle: true,
    showCameraHUD: false
  };

  private listeners: Set<HUDListener> = new Set();

  public getConfig(): HUDConfig {
    return { ...this.config };
  }

  public updateConfig(patch: Partial<HUDConfig>): void {
    Object.assign(this.config, patch);
    this.notify();
  }

  public subscribe(listener: HUDListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }
}

export const hudStore = new HUDStore();

export function useHUDStore() {
  const [, setTick] = useState(0);
  useEffect(() => {
    return hudStore.subscribe(() => setTick((t) => t + 1));
  }, []);

  return {
    config: hudStore.getConfig(),
    updateConfig: hudStore.updateConfig.bind(hudStore)
  };
}
