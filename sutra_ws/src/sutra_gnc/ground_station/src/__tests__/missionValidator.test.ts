import { describe, it, expect } from 'vitest';
import { MissionValidator } from '../engine/missionValidator';
import type { Waypoint } from '../types';

describe('MissionValidator Integration Tests', () => {
  it('should detect error if flight plan has less than 2 waypoints', () => {
    const waypoints: Waypoint[] = [{ id: 1, lat: 34.5, lng: 45.1, alt: 100, action: 'TAKEOFF', completed: false }];
    const issues = MissionValidator.validate(waypoints);
    expect(issues.some((i) => i.severity === 'ERROR')).toBe(true);
  });

  it('should trigger altitude warning if waypoint exceeds 500m AGL', () => {
    const waypoints: Waypoint[] = [
      { id: 1, lat: 34.5, lng: 45.1, alt: 100, action: 'TAKEOFF', completed: false },
      { id: 2, lat: 34.51, lng: 45.11, alt: 650, action: 'WAYPOINT', completed: false }
    ];
    const issues = MissionValidator.validate(waypoints);
    expect(issues.some((i) => i.id.includes('VAL-ALT-HIGH'))).toBe(true);
  });
});
