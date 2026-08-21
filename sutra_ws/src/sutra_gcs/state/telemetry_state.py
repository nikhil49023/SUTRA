"""
SUTRA GCS — Telemetry State Store
"""

import time
from typing import Dict, Any, Optional


class TelemetryState:
    """Stores high-rate telemetry snapshots for UI rendering."""

    def __init__(self):
        self.last_update_ts: float = time.time()
        self.snapshots: Dict[str, Dict[str, Any]] = {}

    def update_drone_telemetry(self, drone_id: str, data: Dict[str, Any]) -> None:
        self.snapshots[drone_id] = data
        self.last_update_ts = time.time()

    def get_telemetry(self, drone_id: str) -> Optional[Dict[str, Any]]:
        return self.snapshots.get(drone_id)

    def get_all(self) -> Dict[str, Dict[str, Any]]:
        return self.snapshots


telemetry_state = TelemetryState()
