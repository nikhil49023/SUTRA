import { eventBus } from '../services/eventBus';
import { presentationEngine } from './presentationEngine';

export class DemoModeEngine {
  private static isDemoActive: boolean = false;
  private static demoInterval: number | null = null;
  private static alertCounter: number = 0;

  public static startDemoMode(): void {
    if (this.isDemoActive) return;
    this.isDemoActive = true;

    eventBus.emit('SYSTEM_ALERT', {
      title: 'DEMO MODE ACTIVATED',
      message: 'High-fidelity multi-drone SITL simulation, AI detection loop, and camera streams engaged.'
    });

    const mockAlerts = [
      { title: 'WILDFIRE HOTSPOT LOCKED', message: 'Thermal camera locked active flame spot at 97.8% confidence.' },
      { title: 'CONVOY VEHICLE TRACKED', message: 'Armored vehicle tracked moving at 45.0 km/h in Sector 4-B.' },
      { title: 'PERSONNEL DETECTED', message: 'IR heat signature identified in sector perimeter.' },
      { title: 'SATCOM LINK STABLE', message: 'AES-256 telemetry link operating at 98% quality (14ms latency).' }
    ];

    this.demoInterval = window.setInterval(() => {
      // 1. Emit AI Detections
      eventBus.emit('AI_TARGET_DETECTED', {
        class: this.alertCounter % 2 === 0 ? 'FIRE' : 'VEHICLE',
        confidence: 96.5,
        lat: 34.5225,
        lng: 45.1082
      });

      // 2. Emit Dynamic Alert
      const alert = mockAlerts[this.alertCounter % mockAlerts.length];
      eventBus.emit('SYSTEM_ALERT', alert);

      this.alertCounter++;
    }, 6000);
  }

  public static stopDemoMode(): void {
    this.isDemoActive = false;
    if (this.demoInterval !== null) {
      clearInterval(this.demoInterval);
      this.demoInterval = null;
    }
  }

  public static isDemoRunning(): boolean {
    return this.isDemoActive;
  }

  public static getPresentationEngine() {
    return presentationEngine;
  }
}
