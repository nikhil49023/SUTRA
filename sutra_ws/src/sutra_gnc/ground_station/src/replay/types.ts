import type { TelemetryData, AIDetection, OperationalAlert } from '../types';

export interface RecordedFrame {
  timestampMs: number;
  telemetry: TelemetryData;
  aiDetections: AIDetection[];
  commandExecuted?: string;
  annotations?: string[];
}

export interface FlightSessionLog {
  sessionId: string;
  missionName: string;
  droneCallsign: string;
  startTime: string;
  endTime: string;
  totalDurationSec: number;
  frameCount: number;
  frames: RecordedFrame[];
  events: OperationalAlert[];
}

export interface PlaybackState {
  isPlaying: boolean;
  currentFrameIndex: number;
  currentTimeMs: number;
  totalDurationMs: number;
  speedMultiplier: number; // 0.5, 1, 2, 5, 10
  progressPercent: number;
}
