export class ReconnectManager {
  private attempts: number = 0;
  private maxAttempts: number = 10;
  private baseDelayMs: number = 1000;
  private maxDelayMs: number = 30000;
  private timer: number | null = null;

  public scheduleReconnect(onReconnect: () => void): boolean {
    if (this.attempts >= this.maxAttempts) {
      return false;
    }

    this.attempts += 1;
    const delay = Math.min(this.baseDelayMs * Math.pow(2, this.attempts - 1), this.maxDelayMs);

    console.log(`[ReconnectManager] Scheduling attempt ${this.attempts}/${this.maxAttempts} in ${delay}ms`);

    this.timer = window.setTimeout(() => {
      onReconnect();
    }, delay);

    return true;
  }

  public reset(): void {
    this.attempts = 0;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  public getAttempts(): number {
    return this.attempts;
  }
}
