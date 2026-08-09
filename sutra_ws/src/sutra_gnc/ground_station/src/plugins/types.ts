import type { GCSExtensionSDK } from '../sdk/gcsSDK';

export interface IGCSPlugin {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  onLoad(sdk: GCSExtensionSDK): Promise<void>;
  onUnload(): Promise<void>;
}

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
}
