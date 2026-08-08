import type { CameraStreamConfig } from '../types';

export class RTSPManager {
  private static streams: CameraStreamConfig[] = [
    { id: 'cam-main', name: 'Primary EO 4K Gimbal', type: 'RTSP_STREAM', url: 'rtsp://192.168.1.10:554/live/eo', resolution: '3840x2160', fps: 30, isRecording: false, isActive: true },
    { id: 'cam-thermal', name: 'IR Thermal Sensor', type: 'THERMAL_INFRARED', url: 'rtsp://192.168.1.10:554/live/ir', resolution: '640x512', fps: 60, isRecording: false, isActive: false },
    { id: 'cam-fpv', name: 'FPV Pilot Camera', type: 'USB_WEBCAM', url: '/dev/video0', resolution: '1920x1080', fps: 60, isRecording: false, isActive: false }
  ];

  public static getStreams(): CameraStreamConfig[] {
    return [...this.streams];
  }

  public static setActiveStream(id: string): void {
    this.streams.forEach((s) => {
      s.isActive = s.id === id;
    });
  }
}
