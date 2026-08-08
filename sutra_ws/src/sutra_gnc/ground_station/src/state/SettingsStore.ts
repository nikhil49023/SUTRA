import { useState, useEffect } from 'react';

export interface AppSettings {
  units: 'METRIC' | 'IMPERIAL';
  theme: 'TACTICAL_DARK' | 'NIGHT_VISION' | 'HIGH_CONTRAST';
  voiceCommandsEnabled: boolean;
  audioAlertsEnabled: boolean;
  maxAltitudeCeilingM: number;
}

type SettingsListener = () => void;

class SettingsStore {
  private settings: AppSettings = {
    units: 'METRIC',
    theme: 'TACTICAL_DARK',
    voiceCommandsEnabled: true,
    audioAlertsEnabled: true,
    maxAltitudeCeilingM: 500
  };

  private listeners: Set<SettingsListener> = new Set();

  public getSettings(): AppSettings {
    return { ...this.settings };
  }

  public updateSettings(patch: Partial<AppSettings>): void {
    Object.assign(this.settings, patch);
    this.notify();
  }

  public subscribe(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }
}

export const settingsStore = new SettingsStore();

export function useSettingsStore() {
  const [, setTick] = useState(0);
  useEffect(() => {
    return settingsStore.subscribe(() => setTick((t) => t + 1));
  }, []);

  return {
    settings: settingsStore.getSettings(),
    updateSettings: settingsStore.updateSettings.bind(settingsStore)
  };
}
