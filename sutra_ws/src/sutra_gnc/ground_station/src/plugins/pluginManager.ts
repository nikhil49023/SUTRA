import type { IGCSPlugin } from './types';
import { GCSExtensionSDK } from '../sdk/gcsSDK';
import { LoggerService } from '../services/loggerService';

export class ThermalAnalyticsPlugin implements IGCSPlugin {
  public id: string = 'PLG-THERMAL-01';
  public name: string = 'Thermal IR Analytics Plugin';
  public version: string = '1.2.0';
  public author: string = 'SUTRA Defense AI Lab';
  public description: string = 'Real-time thermal hotspot anomaly detection and radiometric temperature profiling.';

  public async onLoad(sdk: GCSExtensionSDK): Promise<void> {
    LoggerService.info('ThermalAnalyticsPlugin', 'Loaded Thermal IR Analytics Plugin successfully.');
  }

  public async onUnload(): Promise<void> {
    LoggerService.info('ThermalAnalyticsPlugin', 'Unloaded Thermal IR Analytics Plugin.');
  }
}

export class GCSPluginManager {
  private static instance: GCSPluginManager;
  private plugins: Map<string, IGCSPlugin> = new Map();
  private sdk: GCSExtensionSDK = new GCSExtensionSDK();

  private constructor() {
    this.registerPlugin(new ThermalAnalyticsPlugin());
  }

  public static getInstance(): GCSPluginManager {
    if (!GCSPluginManager.instance) {
      GCSPluginManager.instance = new GCSPluginManager();
    }
    return GCSPluginManager.instance;
  }

  public registerPlugin(plugin: IGCSPlugin): void {
    this.plugins.set(plugin.id, plugin);
    plugin.onLoad(this.sdk);
  }

  public unregisterPlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.onUnload();
      this.plugins.delete(pluginId);
    }
  }

  public getPlugins(): IGCSPlugin[] {
    return Array.from(this.plugins.values());
  }
}

export const pluginManager = GCSPluginManager.getInstance();
