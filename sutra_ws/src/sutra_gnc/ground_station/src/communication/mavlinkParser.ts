export interface MAVLinkMessageFrame {
  magic: number; // 0xFD for MAVLink 2.0, 0xFE for MAVLink 1.0
  length: number;
  incompatFlags: number;
  compatFlags: number;
  seq: number;
  sysId: number;
  compId: number;
  msgId: number;
  payload: any;
  checksum: number;
}

export class MAVLinkParser {
  /**
   * Encodes a high-level message into a MAVLink 2.0 binary packet representation
   */
  static encodeFrame(sysId: number, compId: number, msgId: number, payload: any): MAVLinkMessageFrame {
    return {
      magic: 0xFD, // MAVLink 2.0 STX
      length: JSON.stringify(payload).length,
      incompatFlags: 0,
      compatFlags: 0,
      seq: (Math.floor(Math.random() * 255)),
      sysId,
      compId,
      msgId,
      payload,
      checksum: 0xFFFF
    };
  }

  /**
   * Decodes raw binary/JSON socket payload into MAVLink message frame
   */
  static decodeFrame(rawData: any): MAVLinkMessageFrame | null {
    try {
      if (typeof rawData === 'string') {
        const parsed = JSON.parse(rawData);
        return {
          magic: 0xFD,
          length: 0,
          incompatFlags: 0,
          compatFlags: 0,
          seq: parsed.seq || 0,
          sysId: parsed.sysId || 1,
          compId: parsed.compId || 1,
          msgId: parsed.msgId || 0,
          payload: parsed.payload || parsed,
          checksum: 0
        };
      }
      return null;
    } catch (e) {
      return null;
    }
  }
}
