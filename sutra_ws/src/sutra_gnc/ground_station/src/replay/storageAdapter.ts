import type { FlightSessionLog } from './types';

export interface IReplayStorageAdapter {
  saveSession(session: FlightSessionLog): Promise<boolean>;
  getSessionById(sessionId: string): Promise<FlightSessionLog | undefined>;
  getAllSessions(): Promise<FlightSessionLog[]>;
  deleteSession(sessionId: string): Promise<boolean>;
}

export class LocalStorageReplayAdapter implements IReplayStorageAdapter {
  private storageKey: string = 'gcs_flight_recording_logs';

  public async saveSession(session: FlightSessionLog): Promise<boolean> {
    try {
      const existing = await this.getAllSessions();
      const filtered = existing.filter((s) => s.sessionId !== session.sessionId);
      filtered.push(session);
      localStorage.setItem(this.storageKey, JSON.stringify(filtered));
      return true;
    } catch (e) {
      return false;
    }
  }

  public async getSessionById(sessionId: string): Promise<FlightSessionLog | undefined> {
    const sessions = await this.getAllSessions();
    return sessions.find((s) => s.sessionId === sessionId);
  }

  public async getAllSessions(): Promise<FlightSessionLog[]> {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  public async deleteSession(sessionId: string): Promise<boolean> {
    const sessions = await this.getAllSessions();
    const updated = sessions.filter((s) => s.sessionId !== sessionId);
    localStorage.setItem(this.storageKey, JSON.stringify(updated));
    return true;
  }
}
