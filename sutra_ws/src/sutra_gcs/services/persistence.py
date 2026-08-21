"""
SUTRA GCS — Persistence Service
Saves and loads mission plans, flight logs (.gcslog), and user settings.
"""

import json
import os
from typing import Any, Dict, Optional


class PersistenceService:
    """Manages file storage for missions, settings, and flight logs."""

    def __init__(self, data_dir: str = "/tmp/sutra_gcs_data"):
        self.data_dir = data_dir
        os.makedirs(self.data_dir, exist_ok=True)

    def save_mission(self, name: str, mission_data: Dict[str, Any]) -> str:
        filepath = os.path.join(self.data_dir, f"mission_{name}.json")
        with open(filepath, "w") as f:
            json.dump(mission_data, f, indent=2)
        return filepath

    def load_mission(self, name: str) -> Optional[Dict[str, Any]]:
        filepath = os.path.join(self.data_dir, f"mission_{name}.json")
        if os.path.exists(filepath):
            with open(filepath, "r") as f:
                return json.load(f)
        return None

    def export_flight_log(self, filename: str, log_data: Dict[str, Any]) -> str:
        filepath = os.path.join(self.data_dir, f"{filename}.gcslog")
        with open(filepath, "w") as f:
            json.dump(log_data, f, indent=2)
        return filepath


persistence = PersistenceService()
