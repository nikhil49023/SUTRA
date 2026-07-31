import type { TelemetryData, AIDetection, OperationalAlert } from '../types';
import type { FlightSessionLog, RecordedFrame } from './types';
import { LocalStorageReplayAdapter } from './storageAdapter';

export class RecordingService {
  private isRecording: boolean = false;
  private currentSession: FlightSessionLog | null = null;
  private startTimeMs: number = 0;
  private storageAdapter: LocalStorageReplayAdapter = new LocalStorageReplayAdapter();

  public startRecording(missionName: string = 'Op Desert Falcon', droneCallsign: string = 'SH-HEX-01'): void {
    this.isRecording = true;
    this.startTimeMs = Date.now();

    this.currentSession = {
      sessionId: `REC-${this.startTimeMs}`,
      missionName,
      droneCallsign,
      startTime: new Date(this.startTimeMs).toISOString(),
      endTime: '',
      totalDurationSec: 0,
      frameCount: 0,
      frames: [],
      events: []
    };
  }

  public recordFrame(telemetry: TelemetryData, aiDetections: AIDetection[] = [], commandExecuted?: string): void {
    if (!this.isRecording || !this.currentSession) return;

    const frame: RecordedFrame = {
      timestampMs: Date.now() - this.startTimeMs,
      telemetry: { ...telemetry },
      aiDetections: [...aiDetections],
      commandExecuted
    };

    this.currentSession.frames.push(frame);
    this.currentSession.frameCount++;
  }

  public recordEvent(event: OperationalAlert): void {
    if (!this.isRecording || !this.currentSession) return;
    this.currentSession.events.push(event);
  }

  public async stopRecording(): Promise<FlightSessionLog | null> {
    if (!this.isRecording || !this.currentSession) return null;

    this.isRecording = false;
    const endTimeMs = Date.now();
    this.currentSession.endTime = new Date(endTimeMs).toISOString();
    this.currentSession.totalDurationSec = Math.round((endTimeMs - this.startTimeMs) / 1000);

    await this.storageAdapter.saveSession(this.currentSession);
    const session = this.currentSession;
    this.currentSession = null;
    return session;
  }

  public isCurrentlyRecording(): boolean {
    return this.isRecording;
  }
}
