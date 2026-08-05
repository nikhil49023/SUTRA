import type { MAVParameter } from '../types';

export class ParameterProtocol {
  private static defaultParams: MAVParameter[] = [
    { name: 'MPC_XY_CRUISE', value: 12.0, type: 'FLOAT', defaultValue: 12.0, description: 'Maximum cruise speed in XY plane (m/s)', category: 'POSITION_CONTROL' },
    { name: 'MPC_Z_VEL_MAX_DN', value: 3.0, type: 'FLOAT', defaultValue: 3.0, description: 'Max vertical descent velocity (m/s)', category: 'POSITION_CONTROL' },
    { name: 'MIS_TAKEOFF_ALT', value: 50.0, type: 'FLOAT', defaultValue: 50.0, description: 'Default takeoff altitude (m)', category: 'MISSION' },
    { name: 'RTL_RETURN_ALT', value: 60.0, type: 'FLOAT', defaultValue: 60.0, description: 'Return to launch altitude (m)', category: 'RTL' },
    { name: 'COM_LOW_BAT_ACT', value: 2.0, type: 'INT32', defaultValue: 2.0, description: 'Failsafe action on critical battery (2=RTL)', category: 'SAFETY' }
  ];

  public static getParameters(): MAVParameter[] {
    return [...this.defaultParams];
  }

  public static setParameter(name: string, value: number): void {
    const p = this.defaultParams.find((param) => param.name === name);
    if (p) {
      p.value = value;
      p.isModified = true;
    }
  }

  public async requestParameterList(): Promise<MAVParameter[]> {
    return ParameterProtocol.getParameters();
  }

  public async setParameter(name: string, value: number): Promise<boolean> {
    ParameterProtocol.setParameter(name, value);
    return true;
  }
}
