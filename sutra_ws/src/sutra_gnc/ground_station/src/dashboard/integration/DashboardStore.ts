import { SelectionManager } from './SelectionManager';

export class DashboardStore {
  private static activeTab: string = 'DASHBOARD';
  private static layerToggles: Record<string, boolean> = {
    DRONES: true,
    WAYPOINTS: true,
    GEOFENCES: true,
    TERRAIN: true,
    WEATHER: true,
    RF_COVERAGE: false,
    AI_DETECTIONS: true,
    SWARM_FORMATION: true
  };

  public static getActiveTab(): string { return this.activeTab; }
  public static setActiveTab(tab: string): void { this.activeTab = tab; }

  public static getLayerToggles(): Record<string, boolean> { return { ...this.layerToggles }; }
  public static toggleLayer(layerKey: string): void {
    this.layerToggles[layerKey] = !this.layerToggles[layerKey];
  }
}
