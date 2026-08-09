import { describe, it, expect } from 'vitest';
import { MAVLinkParser } from '../communication/mavlinkParser';

describe('MAVLinkParser Unit Tests', () => {
  it('should encode MAVLink 2.0 packet frame correctly', () => {
    const frame = MAVLinkParser.encodeFrame(1, 1, 0, { test: 'payload' });
    expect(frame.magic).toBe(0xFD);
    expect(frame.sysId).toBe(1);
    expect(frame.compId).toBe(1);
  });

  it('should decode stringified JSON payload frame', () => {
    const raw = JSON.stringify({ sysId: 2, compId: 1, msgId: 30, payload: { pitch: 0.1 } });
    const decoded = MAVLinkParser.decodeFrame(raw);
    expect(decoded).not.toBeNull();
    expect(decoded?.sysId).toBe(2);
    expect(decoded?.msgId).toBe(30);
  });
});
