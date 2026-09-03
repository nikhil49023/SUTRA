"""
Smart Horizon GCS — Automated Emergency Failsafe Coordinator
Subsystem: Mission Engine (Phase 5)
"""

from dataclasses import replace
from typing import Optional

from services.event_bus import EventBus, get_event_bus
from services.logging_service import get_logger
from state.alert_state import Alert, AlertSeverity
from state.application_state import StateStore, get_state_store
from state.mission_state import MissionStateEnum


class EmergencyManager:
    """
    Coordinates emergency fail-safes (Low battery RTL, No-Fly Zone auto-cutoff, Communication Link Loss).
    """

    def __init__(
        self,
        state_store: Optional[StateStore] = None,
        event_bus: Optional[EventBus] = None,
    ) -> None:
        self.state_store = state_store or get_state_store()
        self.event_bus = event_bus or get_event_bus()
        self.logger = get_logger("emergency_manager")

    def trigger_emergency(self, reason: str) -> None:
        """Forces immediate emergency state and broadcast."""
        self.logger.critical(f"EMERGENCY TRIGGERED: {reason}")

        # 1. Update MissionState to EMERGENCY
        self.state_store.update_state(
            lambda s: replace(
                s,
                mission_state=replace(s.mission_state, state=MissionStateEnum.EMERGENCY),
                alert_state=s.alert_state.add_alert(
                    Alert(
                        severity=AlertSeverity.EMERGENCY,
                        source="emergency_manager",
                        message=f"EMERGENCY TRIGGERED: {reason}",
                    )
                ),
            )
        )

        # 2. Broadcast via EventBus
        self.event_bus.emit(
            "system.emergency",
            payload={"reason": reason},
            source="emergency_manager",
        )
