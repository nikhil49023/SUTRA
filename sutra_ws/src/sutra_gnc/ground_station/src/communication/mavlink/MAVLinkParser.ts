import type { MAVLinkMsgType, MAVLinkPacket } from '../types';

export class MAVLinkParser {
  /**
   * Parse raw binary buffer or payload object into structured MAVLinkPacket.
   */
  public static parsePacket(sysId: number, msgName: MAVLinkMsgType, payload: Record<string, any>): MAVLinkPacket {
    return {
      sysId,
      compId: 1,
      msgId: this.getMsgId(msgName),
      msgName,
      payload,
      sequence: Math.floor(Math.random() * 255),
      timestamp: new Date().toISOString()
    };
  }

  private static getMsgId(msgName: MAVLinkMsgType): number {
    switch (msgName) {
      case 'HEARTBEAT': return 0;
      case 'SYS_STATUS': return 1;
      case 'PARAM_VALUE': return 22;
      case 'ATTITUDE': return 30;
      case 'GLOBAL_POSITION_INT': return 33;
      case 'MISSION_ITEM_INT': return 73;
      case 'MISSION_COUNT': return 44;
      case 'MISSION_ACK': return 47;
      case 'COMMAND_LONG': return 76;
      case 'STATUSTEXT': return 253;
      default: return 0;
    }
  }
}
