import type { MissionState, TimelineEvent } from '../types';

type TimelineListener = (event: TimelineEvent) => void;

export class MissionTimeline {
  private events: TimelineEvent[] = [];
  private listeners: Set<TimelineListener> = new Set();

  public addEvent(
    state: MissionState,
    category: 'STATE_CHANGE' | 'COMMAND' | 'WARNING' | 'ERROR' | 'CHECKPOINT',
    message: string,
    details?: Record<string, any>
  ): TimelineEvent {
    const event: TimelineEvent = {
      id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      state,
      category,
      message,
      details
    };

    this.events.push(event);
    this.listeners.forEach((listener) => listener(event));
    return event;
  }

  public getEvents(): TimelineEvent[] {
    return [...this.events];
  }

  public clear(): void {
    this.events = [];
  }

  public subscribe(listener: TimelineListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const missionTimeline = new MissionTimeline();
