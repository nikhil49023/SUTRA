export class FPSMonitor {
  private static currentFPS: number = 60;

  public static getFPS(): number {
    return this.currentFPS;
  }
}
