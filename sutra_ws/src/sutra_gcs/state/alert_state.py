"""
Smart Horizon GCS — Alerts, Warnings & Fault Management State Model
Subsystem: State Management
"""

import time
import uuid
from dataclasses import dataclass, field, replace
from enum import Enum
from typing import List, Optional


class AlertSeverity(str, Enum):
    """
    Standard safety severity levels for GCS system alarms.
    """

    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"
    EMERGENCY = "EMERGENCY"


@dataclass(frozen=True)
class Alert:
    """
    Immutable individual alert notification item.
    """

    alert_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: float = field(default_factory=time.time)
    severity: AlertSeverity = AlertSeverity.INFO
    title: str = ""
    message: str = ""
    source: str = "system"
    drone_id: Optional[str] = None
    acknowledged: bool = False


@dataclass(frozen=True)
class AlertState:
    """
    Immutable collection of system alerts.
    Transformations return new instances.
    """

    alerts: List[Alert] = field(default_factory=list)

    def add_alert(self, alert: Alert) -> "AlertState":
        """Adds a new alert to the head of the list."""
        new_alerts = [alert] + [a for a in self.alerts if a.alert_id != alert.alert_id]
        return replace(self, alerts=new_alerts[:50])  # Cap at 50 recent alerts

    def remove_alert(self, alert_id: str) -> "AlertState":
        """Removes an alert by ID."""
        new_alerts = [a for a in self.alerts if a.alert_id != alert_id]
        return replace(self, alerts=new_alerts)

    def acknowledge_alert(self, alert_id: str) -> "AlertState":
        """Marks an alert as acknowledged."""
        new_alerts = [
            replace(a, acknowledged=True) if a.alert_id == alert_id else a
            for a in self.alerts
        ]
        return replace(self, alerts=new_alerts)

    def clear_alerts(self) -> "AlertState":
        """Clears all alerts."""
        return replace(self, alerts=[])

    def get_unacknowledged(self) -> List[Alert]:
        """Returns all unacknowledged alerts."""
        return [a for a in self.alerts if not a.acknowledged]
