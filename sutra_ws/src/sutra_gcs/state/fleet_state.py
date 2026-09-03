"""
Smart Horizon GCS — Centralized Multi-Drone Swarm Fleet State Model
Subsystem: State Management (Phase 6)
"""

import copy
from dataclasses import dataclass, field, replace
from enum import Enum
from typing import Dict, List, Optional


class DroneRole(str, Enum):
    LEADER = "LEADER"
    WINGMAN = "WINGMAN"
    SCOUT = "SCOUT"
    SUPPORT = "SUPPORT"


class FormationType(str, Enum):
    LINE = "LINE"
    COLUMN = "COLUMN"
    V_FORMATION = "V_FORMATION"
    DIAMOND = "DIAMOND"
    ECHELON_LEFT = "ECHELON_LEFT"
    ECHELON_RIGHT = "ECHELON_RIGHT"
    CIRCLE = "CIRCLE"
    GRID = "GRID"
    CUSTOM = "CUSTOM"


@dataclass(frozen=True)
class DroneState:
    """
    Immutable representation of an individual drone in the tactical swarm.
    """

    drone_id: str
    callsign: str
    role: str = "WINGMAN"
    latitude: float = 0.0
    longitude: float = 0.0
    altitude: float = 0.0
    heading: float = 0.0
    pitch: float = 0.0
    roll: float = 0.0
    speed: float = 0.0
    battery: float = 100.0
    connection_status: str = "CONNECTED"  # CONNECTED, DISCONNECTED, DEGRADED
    flight_mode: str = "MANUAL"
    mission_id: Optional[str] = None
    is_leader: bool = False
    formation_index: int = 0
    target_latitude: Optional[float] = None
    target_longitude: Optional[float] = None
    target_altitude: Optional[float] = None
    target_heading: Optional[float] = None
    offset_x: float = 0.0  # East offset in meters relative to leader
    offset_y: float = 0.0  # North offset in meters relative to leader
    formation: str = "V_FORMATION"


@dataclass(frozen=True)
class FleetState:
    """
    Single source of truth for the multi-UAV swarm fleet collection.
    State transformations return new immutable instances to support pure functional updates.
    """

    drones: Dict[str, DroneState] = field(default_factory=dict)
    leader_id: Optional[str] = None
    formation: str = "V_FORMATION"
    spacing: float = 25.0  # Spacing in meters
    formation_heading: Optional[float] = None  # None = follow leader heading
    follow_leader_heading: bool = True
    show_guides: bool = True

    def add_drone(self, drone: DroneState) -> "FleetState":
        """Returns a new FleetState with the drone added."""
        new_drones = dict(self.drones)
        new_drones[drone.drone_id] = drone
        new_leader = self.leader_id
        if drone.is_leader or not new_leader:
            new_leader = drone.drone_id
        return replace(self, drones=new_drones, leader_id=new_leader)

    def remove_drone(self, drone_id: str) -> "FleetState":
        """Returns a new FleetState with the specified drone removed."""
        if drone_id not in self.drones:
            return self
        new_drones = {k: v for k, v in self.drones.items() if k != drone_id}
        new_leader = self.leader_id
        if new_leader == drone_id:
            new_leader = next(iter(new_drones.keys()), None)
            if new_leader and new_leader in new_drones:
                new_drones[new_leader] = replace(new_drones[new_leader], is_leader=True, role="LEADER")
        return replace(self, drones=new_drones, leader_id=new_leader)

    def update_drone(self, drone_id: str, **kwargs) -> "FleetState":
        """Returns a new FleetState with the specified drone updated."""
        if drone_id not in self.drones:
            return self
        cur = self.drones[drone_id]
        updated = replace(cur, **kwargs)
        new_drones = dict(self.drones)
        new_drones[drone_id] = updated
        return replace(self, drones=new_drones)

    def set_leader(self, drone_id: str) -> "FleetState":
        """Promotes a drone to swarm leader and demotes others to followers."""
        if drone_id not in self.drones:
            return self
        new_drones = {}
        for d_id, d in self.drones.items():
            if d_id == drone_id:
                new_drones[d_id] = replace(d, is_leader=True, role="LEADER", formation_index=0)
            else:
                new_drones[d_id] = replace(d, is_leader=False, role="WINGMAN" if d.role == "LEADER" else d.role)
        return replace(self, drones=new_drones, leader_id=drone_id)

    def get_drone(self, drone_id: str) -> Optional[DroneState]:
        """Retrieves a drone by ID."""
        return self.drones.get(drone_id)

    def get_leader(self) -> Optional[DroneState]:
        """Returns the current leader drone, if designated."""
        if self.leader_id and self.leader_id in self.drones:
            return self.drones[self.leader_id]
        for d in self.drones.values():
            if d.is_leader:
                return d
        return None

    def get_followers(self) -> List[DroneState]:
        """Returns list of follower drones sorted by formation index."""
        followers = [d for d in self.drones.values() if not d.is_leader]
        followers.sort(key=lambda d: d.formation_index)
        return followers

    def get_all_drones(self) -> List[DroneState]:
        """Returns a list of all active drone states."""
        return list(self.drones.values())

    def set_formation(self, formation: str) -> "FleetState":
        """Updates formation geometry type."""
        return replace(self, formation=formation)

    def set_spacing(self, spacing: float) -> "FleetState":
        """Updates formation inter-drone spacing in meters."""
        return replace(self, spacing=max(5.0, spacing))

    def set_formation_heading(self, heading: Optional[float]) -> "FleetState":
        """Sets manual fixed formation heading."""
        return replace(self, formation_heading=heading)

    def set_follow_leader_heading(self, follow: bool) -> "FleetState":
        """Toggles following leader heading vs fixed heading."""
        return replace(self, follow_leader_heading=follow)

    def clear_fleet(self) -> "FleetState":
        """Clears all drones from fleet."""
        return replace(self, drones={}, leader_id=None)


fleet_state = FleetState()
