"""
Smart Horizon GCS — Swarm Fleet, Formation & Target Position Domain Models
Subsystem: Swarm Fleet Management (Phase 6)
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple

from state.fleet_state import DroneRole, FormationType, DroneState


@dataclass(frozen=True)
class TargetPosition:
    """
    Geodetic setpoint and local Cartesian ENU offset for an individual drone within a swarm formation.
    """

    drone_id: str
    latitude: float
    longitude: float
    altitude: float
    heading: float
    formation_index: int
    offset_x: float  # East offset in meters relative to formation origin
    offset_y: float  # North offset in meters relative to formation origin


@dataclass(frozen=True)
class FleetStatistics:
    """
    Real-time aggregated swarm metrics across all active aircraft.
    """

    total_drones: int = 0
    connected_drones: int = 0
    disconnected_drones: int = 0
    avg_battery: float = 100.0
    min_battery: float = 100.0
    formation: str = "V_FORMATION"
    spacing: float = 25.0
    fleet_center_lat: float = 37.774929
    fleet_center_lon: float = -122.419416
    fleet_avg_alt: float = 0.0
    avg_speed: float = 0.0
    leader_callsign: str = "ALPHA (LEADER)"
