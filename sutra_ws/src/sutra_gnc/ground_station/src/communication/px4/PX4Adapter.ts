import type { DroneAsset } from '../../types';

export class PX4Adapter {
  public static sendTakeoff(drone: DroneAsset, altMeters: number = 50): void {
    console.log(`[PX4Adapter] Command MAV_CMD_NAV_TAKEOFF sent to sysId ${drone.id} with alt ${altMeters}m`);
  }

  public static sendRTL(drone: DroneAsset): void {
    console.log(`[PX4Adapter] Command MAV_CMD_NAV_RETURN_TO_LAUNCH sent to sysId ${drone.id}`);
  }

  public static sendLand(drone: DroneAsset): void {
    console.log(`[PX4Adapter] Command MAV_CMD_NAV_LAND sent to sysId ${drone.id}`);
  }
}
