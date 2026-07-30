export interface MAVLinkMissionItem {
  seq: number;
  frame: number; // MAV_FRAME_GLOBAL_RELATIVE_ALT
  command: number; // MAV_CMD_NAV_WAYPOINT
  current: number;
  autocontinue: number;
  param1: number;
  param2: number;
  param3: number;
  param4: number;
  x: number; // Lat
  y: number; // Lng
  z: number; // Alt
}

export class MissionTransferManager {
  /**
   * Performs MAVLink Mission Upload Handshake
   * Step 1: Send MISSION_COUNT
   * Step 2: Receive MISSION_REQUEST_INT
   * Step 3: Send MISSION_ITEM_INT
   * Step 4: Receive MISSION_ACK
   */
  static async uploadMission(sysId: number, waypoints: MAVLinkMissionItem[]): Promise<{ success: boolean; ack: string }> {
    return new Promise((resolve) => {
      // Handshake simulation delay
      setTimeout(() => {
        resolve({
          success: true,
          ack: 'MAV_MISSION_ACCEPTED'
        });
      }, 500);
    });
  }

  /**
   * Performs MAVLink Mission Download Handshake
   * Step 1: Send MISSION_REQUEST_LIST
   * Step 2: Receive MISSION_COUNT
   * Step 3: Send MISSION_REQUEST_INT for each sequence
   * Step 4: Send MISSION_ACK
   */
  static async downloadMission(sysId: number): Promise<MAVLinkMissionItem[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockDownloadedItems: MAVLinkMissionItem[] = [
          { seq: 0, frame: 3, command: 22, current: 1, autocontinue: 1, param1: 0, param2: 0, param3: 0, param4: 0, x: 34.5011, y: 45.0920, z: 200 },
          { seq: 1, frame: 3, command: 16, current: 0, autocontinue: 1, param1: 0, param2: 0, param3: 0, param4: 0, x: 34.5180, y: 45.1020, z: 450 },
          { seq: 2, frame: 3, command: 20, current: 0, autocontinue: 1, param1: 0, param2: 0, param3: 0, param4: 0, x: 34.5011, y: 45.0920, z: 0 }
        ];
        resolve(mockDownloadedItems);
      }, 600);
    });
  }
}
