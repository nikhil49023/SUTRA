import { GISService } from './gisService';
import type { Waypoint } from '../types';

export interface MissionPlan {
  id: string;
  name: string;
  createdTime: string;
  cruiseSpeedKmh: number; // km/h
  cruiseAltitudeM: number; // m
  waypoints: Waypoint[];
  homeLocation: { lat: number; lng: number; alt: number };
  geofencePolygons: { id: string; name: string; points: [number, number][] }[];
}

export interface MissionEstimates {
  totalDistanceKm: number; // km
  estimatedFlightTimeMinutes: number; // minutes
  batteryConsumedPercent: number; // %
  mahDrawEstimate: number; // mAh
}

export class MissionService {
  /**
   * Calculates estimated distance, flight duration, and battery drain
   */
  static calculateMissionEstimates(
    waypoints: Waypoint[],
    cruiseSpeedKmh: number = 54,
    batteryCapacityMah: number = 10000
  ): MissionEstimates {
    if (waypoints.length < 2) {
      return {
        totalDistanceKm: 0,
        estimatedFlightTimeMinutes: 0,
        batteryConsumedPercent: 0,
        mahDrawEstimate: 0
      };
    }

    const coords: [number, number][] = waypoints.map((w) => [w.lat, w.lng]);
    const totalDistanceKm = GISService.calculateRouteDistance(coords);

    // Flight time in hours = distance / speed
    const flightTimeHours = totalDistanceKm / cruiseSpeedKmh;
    const flightTimeMinutes = Math.round(flightTimeHours * 60);

    // Battery calculation: Average current draw ~22A for hexacopter
    // Energy mAh = Amps * Hours * 1000
    const mahDrawEstimate = Math.round(22 * flightTimeHours * 1000);
    const batteryConsumedPercent = Math.min(
      100,
      Math.round((mahDrawEstimate / batteryCapacityMah) * 100)
    );

    return {
      totalDistanceKm: +totalDistanceKm.toFixed(2),
      estimatedFlightTimeMinutes: flightTimeMinutes,
      batteryConsumedPercent,
      mahDrawEstimate
    };
  }

  /**
   * Export mission plan to MAVLink / QGroundControl compatible JSON format
   */
  static exportMissionToMAVLinkJSON(mission: MissionPlan): string {
    const mavlinkFormat = {
      fileType: 'Plan',
      version: 1,
      groundStation: 'SmartHorizonGCS',
      mavType: 'MAV_TYPE_HEXAROTOR',
      mission: {
        cruiseSpeed: mission.cruiseSpeedKmh / 3.6, // convert to m/s
        hoverSpeed: 5,
        plannedHomePosition: [
          mission.homeLocation.lat,
          mission.homeLocation.lng,
          mission.homeLocation.alt
        ],
        items: mission.waypoints.map((wp, index) => ({
          autoContinue: true,
          command: wp.action === 'TAKEOFF' ? 22 : wp.action === 'RTH & LAND' ? 20 : 16, // MAV_CMD_NAV_WAYPOINT
          doJumpId: index + 1,
          frame: 3, // MAV_FRAME_GLOBAL_RELATIVE_ALT
          params: [0, 0, 0, null, wp.lat, wp.lng, wp.alt],
          type: 'SimpleItem'
        }))
      },
      geoFence: {
        circles: [],
        polygons: mission.geofencePolygons.map((g) => ({
          inclusion: false,
          version: 1,
          polygon: g.points.map(([lat, lng]) => [lat, lng])
        }))
      }
    };

    return JSON.stringify(mavlinkFormat, null, 2);
  }

  /**
   * Import mission plan from JSON string
   */
  static importMissionFromJSON(jsonString: string): MissionPlan | null {
    try {
      const data = JSON.parse(jsonString);
      if (data.fileType === 'Plan' && data.mission && Array.isArray(data.mission.items)) {
        const waypoints: Waypoint[] = data.mission.items.map((item: any, idx: number) => ({
          id: idx + 1,
          lat: item.params[4] || 34.52,
          lng: item.params[5] || 45.10,
          alt: item.params[6] || 200,
          action: item.command === 22 ? 'TAKEOFF' : item.command === 20 ? 'RTH & LAND' : 'WAYPOINT',
          completed: false
        }));

        return {
          id: `PLAN-${Date.now()}`,
          name: 'Imported Mission Plan',
          createdTime: new Date().toISOString(),
          cruiseSpeedKmh: (data.mission.cruiseSpeed || 15) * 3.6,
          cruiseAltitudeM: 200,
          waypoints,
          homeLocation: {
            lat: data.mission.plannedHomePosition?.[0] || 34.5011,
            lng: data.mission.plannedHomePosition?.[1] || 45.0920,
            alt: data.mission.plannedHomePosition?.[2] || 0
          },
          geofencePolygons: []
        };
      }
    } catch (e) {
      console.error('Failed to parse mission plan JSON', e);
    }
    return null;
  }
}
