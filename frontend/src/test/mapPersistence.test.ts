import { describe, it, expect } from 'vitest';
import { mapPersistence } from '../map/MapPersistence';

describe('SMART HORIZON GCS — Map Persistence Singleton', () => {
  it('manages camera state and retains values', () => {
    const cam = mapPersistence.getCameraState();
    expect(cam).toBeDefined();
    expect(cam.pitch).toBe(40);
    expect(cam.zoom).toBe(15.5);

    mapPersistence.setCameraState({ zoom: 17, pitch: 50 });
    const updated = mapPersistence.getCameraState();
    expect(updated.zoom).toBe(17);
    expect(updated.pitch).toBe(50);
  });
});
