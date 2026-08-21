"""
SUTRA GCS — Fleet State Store
"""

from typing import List, Dict, Any


class FleetState:
    """Tracks all UAVs in the active tactical swarm."""

    def __init__(self):
        self.active_drone_id: str = "drone_alpha"
        self.formation_type: str = "V_FORMATION"
        self.fleet_members: List[str] = ["drone_alpha", "drone_bravo", "drone_charlie", "drone_delta"]
        self.is_swarm_locked: bool = True

    def set_active_drone(self, drone_id: str) -> None:
        if drone_id in self.fleet_members:
            self.active_drone_id = drone_id


fleet_state = FleetState()
