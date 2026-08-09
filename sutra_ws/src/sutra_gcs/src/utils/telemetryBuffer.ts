/**
 * SUTRA Subsystem D: Decoupled Telemetry Ring-Buffer Stream Throttler
 * Lead Engineer: Siva Kesava (Subsystem D Lead)
 * 
 * Prevents React UI main-thread micro-stutters under 50Hz telemetry updates from 10+ drones
 * by buffering incoming WebSocket packets and flushing at locked 60 FPS requestAnimationFrame rate.
 */

export interface TelemetryPacket {
  droneId: string;
  lat: number;
  lon: number;
  alt: number;
  heading: number;
  batteryPct: number;
  timestamp: number;
}

export class TelemetryRingBuffer {
  private buffer: Map<string, TelemetryPacket> = new Map();
  private listeners: Array<(packets: Map<string, TelemetryPacket>) => void> = [];
  private animFrameId: number | null = null;

  public push(packet: TelemetryPacket): void {
    this.buffer.set(packet.droneId, packet);
    this.scheduleFlush();
  }

  public subscribe(callback: (packets: Map<string, TelemetryPacket>) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private scheduleFlush(): void {
    if (this.animFrameId !== null) return;

    if (typeof requestAnimationFrame !== 'undefined') {
      this.animFrameId = requestAnimationFrame(() => this.flush());
    } else {
      setTimeout(() => this.flush(), 16);
    }
  }

  private flush(): void {
    this.animFrameId = null;
    const currentSnapshot = new Map(this.buffer);
    this.listeners.forEach((listener) => listener(currentSnapshot));
  }

  public clear(): void {
    this.buffer.clear();
  }
}

export const globalTelemetryBuffer = new TelemetryRingBuffer();
