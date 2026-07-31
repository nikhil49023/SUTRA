export interface IDatabaseAdapter {
  init(): Promise<boolean>;
  saveTelemetryFrame(telemetry: any): Promise<boolean>;
  getTelemetryHistory(limit: number): Promise<any[]>;
  saveMissionPlan(plan: any): Promise<boolean>;
  getMissionPlans(): Promise<any[]>;
}

export class SQLiteAdapter implements IDatabaseAdapter {
  private dbName: string = 'SmartHorizonGCS_DB';
  private storageKey: string = 'gcs_sqlite_emulated_db';

  public async init(): Promise<boolean> {
    if (!localStorage.getItem(this.storageKey)) {
      localStorage.setItem(this.storageKey, JSON.stringify({ telemetry: [], missions: [] }));
    }
    return true;
  }

  public async saveTelemetryFrame(telemetry: any): Promise<boolean> {
    try {
      const data = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
      data.telemetry = data.telemetry || [];
      data.telemetry.push(telemetry);
      if (data.telemetry.length > 200) data.telemetry.shift();
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  public async getTelemetryHistory(limit: number = 50): Promise<any[]> {
    const data = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
    return (data.telemetry || []).slice(-limit);
  }

  public async saveMissionPlan(plan: any): Promise<boolean> {
    const data = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
    data.missions = data.missions || [];
    data.missions.push(plan);
    localStorage.setItem(this.storageKey, JSON.stringify(data));
    return true;
  }

  public async getMissionPlans(): Promise<any[]> {
    const data = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
    return data.missions || [];
  }
}

export const dbAdapter = new SQLiteAdapter();
dbAdapter.init();
