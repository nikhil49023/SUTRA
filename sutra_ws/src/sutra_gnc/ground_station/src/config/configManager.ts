export interface EnterpriseGCSConfig {
  environment: 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT';
  mavlinkVersion: '2.0' | '1.0';
  defaultBaudRate: number;
  sitlUdpPort: number;
  maxAllowedAltitudeM: number;
  minRthBatteryReservePercent: number;
  enableEncryption: boolean;
  activeTileProvider: 'DARK' | 'SATELLITE' | 'TERRAIN' | 'ROADS';
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config: EnterpriseGCSConfig = {
    environment: 'PRODUCTION',
    mavlinkVersion: '2.0',
    defaultBaudRate: 57600,
    sitlUdpPort: 14540,
    maxAllowedAltitudeM: 500,
    minRthBatteryReservePercent: 25,
    enableEncryption: true,
    activeTileProvider: 'DARK'
  };

  private constructor() {}

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public getConfig(): EnterpriseGCSConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<EnterpriseGCSConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

export const configManager = ConfigManager.getInstance();
