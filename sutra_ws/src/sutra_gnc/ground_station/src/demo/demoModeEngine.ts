import { eventBus } from '../services/eventBus';

export class DemoModeEngine {
  private static isDemoActive: boolean = false;
  private static demoInterval: number | null = null;

  public static startDemoMode(): void {
    if (this.isDemoActive) return;
    this.isDemoActive = true;

    eventBus.emit('SYSTEM_ALERT', {
      title: 'DEMO MODE ACTIVATED',
      message: 'High-fidelity multi-drone SITL simulation and AI detection loop engaged.'
    });

    this.demoInterval = window.setInterval(() => {
      eventBus.emit('AI_TARGET_DETECTED', {
        class: 'FIRE',
        confidence: 98.4,
        lat: 34.5225,
        lng: 45.1082
      });
    }, 8000);
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
}
