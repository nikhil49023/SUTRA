import type { MAVLinkMsgType, MAVLinkPacket } from '../types';
import { MAVLinkParser } from './MAVLinkParser';

export class MAVLinkEncoder {
  public static encode(msgName: MAVLinkMsgType, payload: Record<string, any>, sysId: number = 255): MAVLinkPacket {
    return MAVLinkParser.parsePacket(sysId, msgName, payload);
  }
}
