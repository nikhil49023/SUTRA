import { useState } from 'react';
import type { Waypoint } from '../../types';

export function useMission() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  return { waypoints, setWaypoints };
}
