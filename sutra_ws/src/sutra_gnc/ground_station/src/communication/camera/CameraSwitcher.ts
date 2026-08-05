import { RTSPManager } from './RTSPManager';

export class CameraSwitcher {
  public static switchCamera(cameraId: string): void {
    RTSPManager.setActiveStream(cameraId);
  }
}
