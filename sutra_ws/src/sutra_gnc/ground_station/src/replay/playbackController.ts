import type { FlightSessionLog, PlaybackState, RecordedFrame } from './types';

export type PlaybackFrameListener = (frame: RecordedFrame) => void;

export class PlaybackController {
  private session: FlightSessionLog | null = null;
  private timer: number | null = null;
  private listeners: Set<PlaybackFrameListener> = new Set();

  private state: PlaybackState = {
    isPlaying: false,
    currentFrameIndex: 0,
    currentTimeMs: 0,
    totalDurationMs: 0,
    speedMultiplier: 1.0,
    progressPercent: 0
  };

  public loadSession(session: FlightSessionLog): void {
    this.stop();
    this.session = session;
    const totalDurationMs = session.frames.length > 0 ? session.frames[session.frames.length - 1].timestampMs : 0;

    this.state = {
      isPlaying: false,
      currentFrameIndex: 0,
      currentTimeMs: 0,
      totalDurationMs,
      speedMultiplier: 1.0,
      progressPercent: 0
    };
  }

  public play(): void {
    if (!this.session || this.session.frames.length === 0) return;
    this.state.isPlaying = true;

    if (this.timer !== null) clearInterval(this.timer);

    const intervalMs = Math.round(100 / this.state.speedMultiplier);
    this.timer = window.setInterval(() => {
      if (this.state.currentFrameIndex >= this.session!.frames.length - 1) {
        this.pause();
        return;
      }

      this.state.currentFrameIndex++;
      const currentFrame = this.session!.frames[this.state.currentFrameIndex];
      this.state.currentTimeMs = currentFrame.timestampMs;
      this.state.progressPercent = +((this.state.currentFrameIndex / (this.session!.frames.length - 1)) * 100).toFixed(1);

      this.notifyListeners(currentFrame);
    }, intervalMs);
  }

  public pause(): void {
    this.state.isPlaying = false;
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public stop(): void {
    this.pause();
    this.state.currentFrameIndex = 0;
    this.state.currentTimeMs = 0;
    this.state.progressPercent = 0;
  }

  public setSpeed(speed: number): void {
    this.state.speedMultiplier = speed;
    if (this.state.isPlaying) {
      this.play(); // Restart timer with new interval speed
    }
  }

  public seekToPercent(percent: number): void {
    if (!this.session || this.session.frames.length === 0) return;
    const targetIdx = Math.min(
      this.session.frames.length - 1,
      Math.max(0, Math.round(((percent / 100) * (this.session.frames.length - 1))))
    );
    this.state.currentFrameIndex = targetIdx;
    const frame = this.session.frames[targetIdx];
    this.state.currentTimeMs = frame.timestampMs;
    this.state.progressPercent = percent;

    this.notifyListeners(frame);
  }

  public stepForward(): void {
    if (!this.session) return;
    if (this.state.currentFrameIndex < this.session.frames.length - 1) {
      this.state.currentFrameIndex++;
      const frame = this.session.frames[this.state.currentFrameIndex];
      this.notifyListeners(frame);
    }
  }

  public stepBackward(): void {
    if (!this.session) return;
    if (this.state.currentFrameIndex > 0) {
      this.state.currentFrameIndex--;
      const frame = this.session.frames[this.state.currentFrameIndex];
      this.notifyListeners(frame);
    }
  }

  public subscribe(listener: PlaybackFrameListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(frame: RecordedFrame): void {
    this.listeners.forEach((fn) => fn(frame));
  }

  public getState(): PlaybackState {
    return { ...this.state };
  }
}
