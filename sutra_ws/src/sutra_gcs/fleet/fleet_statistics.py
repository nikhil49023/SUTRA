"""
Smart Horizon GCS — Swarm Fleet Statistics & Aggregation Engine
Subsystem: Swarm Fleet Management (Phase 6)
"""

from typing import List, Optional

from state.fleet_state import DroneState, FleetState
from .models import FleetStatistics


class FleetStatisticsCalculator:
    """
    Computes statistical aggregations across the multi-UAV swarm.
    """

    @classmethod
    def compute_statistics(cls, fleet: FleetState) -> FleetStatistics:
        drones = fleet.get_all_drones()
        if not drones:
            return FleetStatistics()

        total = len(drones)
        connected = sum(1 for d in drones if d.connection_status == "CONNECTED")
        disconnected = total - connected

        batteries = [d.battery for d in drones]
        avg_battery = sum(batteries) / total if total > 0 else 100.0
        min_battery = min(batteries) if batteries else 100.0

        speeds = [d.speed for d in drones]
        avg_speed = sum(speeds) / total if total > 0 else 0.0

        alts = [d.altitude for d in drones]
        avg_alt = sum(alts) / total if total > 0 else 0.0

        # Swarm Geometric Center (Centroid)
        center_lat = sum(d.latitude for d in drones) / total if total > 0 else 37.774929
        center_lon = sum(d.longitude for d in drones) / total if total > 0 else -122.419416

        leader = fleet.get_leader()
        leader_name = leader.callsign if leader else "NONE"

        return FleetStatistics(
            total_drones=total,
            connected_drones=connected,
            disconnected_drones=disconnected,
            avg_battery=round(avg_battery, 1),
            min_battery=round(min_battery, 1),
            formation=fleet.formation,
            spacing=fleet.spacing,
            fleet_center_lat=center_lat,
            fleet_center_lon=center_lon,
            fleet_avg_alt=round(avg_alt, 1),
            avg_speed=round(avg_speed, 1),
            leader_callsign=leader_name,
        )
