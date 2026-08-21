"""
Smart Horizon GCS — Fleet State & Multi-Drone Coordination Model
Subsystem: State Management
"""

import copy
from dataclasses import dataclass, field, replace
from typing import Dict, List, Optional


@dataclass(frozen=True)
class DroneState:
    """
    Immutable representation of an individual drone in the tactical swarm.
    """

    drone_id: str
    callsign: str
    role: str = "SCOUT"
    latitude: float = 0.0
    longitude: float = 0.0
    altitude: float = 0.0
    heading: float = 0.0
    speed: float = 0.0
    battery: float = 100.0
    connection_status: str = "CONNECTED"
    flight_mode: str = "MANUAL"
    mission_id: Optional[str] = None
    is_leader: bool = False
    formation: str = "V_FORMATION"
    target_latitude: Optional[float] = None
    target_longitude: Optional[float] = None
    target_heading: Optional[float] = None


@dataclass(frozen=True)
class FleetState:
    """
    Immutable representation of the multi-UAV fleet collection.
    State transformations return new instances to support pure functional updates.
    """

    drones: Dict[str, DroneState] = field(default_factory=dict)
    leader_id: Optional[str] = None

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
                new_drones[new_leader] = replace(new_drones[new_leader], is_leader=True)
        return replace(self, drones=new_drones, leader_id=new_leader)

    def get_drone(self, drone_id: str) -> Optional[DroneState]:
        """Retrieves a drone by ID."""
        return self.drones.get(drone_id)

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
        """Promotes a drone to swarm leader and updates is_leader flags."""
        if drone_id not in self.drones:
            return self
        new_drones = {}
        for d_id, d in self.drones.items():
            new_drones[d_id] = replace(d, is_leader=(d_id == drone_id))
        return replace(self, drones=new_drones, leader_id=drone_id)

    def get_leader(self) -> Optional[DroneState]:
        """Returns the current leader drone, if designated."""
        if self.leader_id and self.leader_id in self.drones:
            return self.drones[self.leader_id]
        for d in self.drones.values():
            if d.is_leader:
                return d
        return None

    def get_all_drones(self) -> List[DroneState]:
        """Returns a list of all active drone states."""
        return list(self.drones.values())


fleet_state = FleetState()
