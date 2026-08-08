export interface GCSConfig {
  appName: string;
  version: string;
  buildNumber: string;
  environment: 'development' | 'testing' | 'production';
  mavlinkUdpPort: number;
  rtspGatewayUrl: string;
}

export class ConfigManager {
  private static config: GCSConfig = {
    appName: 'SUTRA Ground Control Station',
    version: 'v2.4.0-PROD',
    buildNumber: '2026.08.05.101',
    environment: 'production',
    mavlinkUdpPort: 14540,
    rtspGatewayUrl: 'rtsp://192.168.1.10:554/live'
  };

  public static getConfig(): GCSConfig {
    return { ...this.config };
  }
}
