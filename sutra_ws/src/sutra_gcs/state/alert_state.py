"""
SUTRA GCS — Alert & Alarm State Store
"""

import time
from typing import List, Dict, Any


class AlertState:
    """Tracks active system alarms, warnings, and priority caution strips."""

    def __init__(self):
        self.active_alerts: List[Dict[str, Any]] = []

    def add_alert(self, level: str, title: str, details: str) -> None:
        alert = {
            "id": f"alert_{int(time.time()*1000)}",
            "level": level.upper(),
            "title": title,
            "details": details,
            "timestamp": time.strftime("%H:%M:%S")
        }
        self.active_alerts.insert(0, alert)
        if len(self.active_alerts) > 20:
            self.active_alerts.pop()

    def clear_all(self) -> None:
        self.active_alerts = []


alert_state = AlertState()
