import type { CameraConfig, CameraStreamType } from './types';

export class CameraStreamGateway {
  private activeCameras: Map<string, CameraConfig> = new Map();

  constructor() {
    this.registerDefaultHardwareCameras();
  }

  private registerDefaultHardwareCameras() {
    const defaultCameras: CameraConfig[] = [
      { id: 'CAM-RTSP-01', type: 'RTSP_IP', endpoint: 'rtsp://192.168.1.100:554/live/stream0', resolution: '1080p60', fps: 60, isActive: true },
      { id: 'CAM-USB-01', type: 'USB_V4L2', endpoint: '/dev/video0', resolution: '720p30', fps: 30, isActive: false },
      { id: 'CAM-THERMAL-01', type: 'THERMAL_IR', endpoint: 'rtsp://192.168.1.101:554/thermal', resolution: '640x512', fps: 30, isActive: false }
    ];

    defaultCameras.forEach((c) => this.activeCameras.set(c.id, c));
  }

  public getCameras(): CameraConfig[] {
    return Array.from(this.activeCameras.values());
  }

  public activateCamera(camId: string): boolean {
    for (const cam of this.activeCameras.values()) {
      cam.isActive = cam.id === camId;
    }
    return true;
  }
}
