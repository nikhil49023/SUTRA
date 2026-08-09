import type { MAVParam } from './types';

export class ParameterManager {
  private parameters: Map<string, MAVParam> = new Map();

  constructor() {
    // Populate initial default PX4/ArduPilot parameters
    this.seedDefaultParameters();
  }

  private seedDefaultParameters() {
    const defaults: MAVParam[] = [
      { paramId: 'MPC_XY_CRUISE', paramValue: 15.0, paramType: 'FLOAT', paramIndex: 0, paramCount: 4 },
      { paramId: 'RTL_ALT', paramValue: 150.0, paramType: 'FLOAT', paramIndex: 1, paramCount: 4 },
      { paramId: 'BATT_ARM_VOLT', paramValue: 21.6, paramType: 'FLOAT', paramIndex: 2, paramCount: 4 },
      { paramId: 'COM_RC_IN_ACT', paramValue: 1, paramType: 'INT32', paramIndex: 3, paramCount: 4 },
    ];
    defaults.forEach((p) => this.parameters.set(p.paramId, p));
  }

  public async requestParameterList(): Promise<MAVParam[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(Array.from(this.parameters.values()));
      }, 300);
    });
  }

  public async setParameter(paramId: string, value: number): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const existing = this.parameters.get(paramId);
        if (existing) {
          this.parameters.set(paramId, { ...existing, paramValue: value });
          resolve(true);
        } else {
          this.parameters.set(paramId, {
            paramId,
            paramValue: value,
            paramType: 'FLOAT',
            paramIndex: this.parameters.size,
            paramCount: this.parameters.size + 1
          });
          resolve(true);
        }
      }, 200);
    });
  }

  public getParameter(paramId: string): MAVParam | undefined {
    return this.parameters.get(paramId);
  }
}
