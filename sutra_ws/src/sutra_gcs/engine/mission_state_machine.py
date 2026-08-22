"""
Smart Horizon GCS — Mission Execution Finite State Machine (FSM)
Subsystem: Mission Engine (Phase 5)
"""

import logging
from dataclasses import replace
from typing import Dict, List, Optional, Set

from services.event_bus import EventBus, get_event_bus
from services.logging_service import get_logger
from state.application_state import StateStore, get_state_store
from state.mission_state import MissionStateEnum

logger = logging.getLogger("sutra_gcs.mission_state_machine")


class MissionStateMachine:
    """
    Strict deterministic Finite State Machine governing autonomous flight plan lifecycle.
    Prevents illegal state transitions, enforces pre-flight validation gates,
    and synchronizes mission state across the application.
    """

    # Explicit whitelist of allowed directional state transitions
    ALLOWED_TRANSITIONS: Dict[MissionStateEnum, Set[MissionStateEnum]] = {
        MissionStateEnum.IDLE: {
            MissionStateEnum.PLANNING,
            MissionStateEnum.VALIDATING,
            MissionStateEnum.EMERGENCY,
        },
        MissionStateEnum.PLANNING: {
            MissionStateEnum.VALIDATING,
            MissionStateEnum.IDLE,
            MissionStateEnum.ABORTED,
            MissionStateEnum.EMERGENCY,
        },
        MissionStateEnum.VALIDATING: {
            MissionStateEnum.READY,
            MissionStateEnum.PLANNING,
            MissionStateEnum.IDLE,
            MissionStateEnum.ABORTED,
            MissionStateEnum.EMERGENCY,
        },
        MissionStateEnum.READY: {
            MissionStateEnum.ARMING,
            MissionStateEnum.PLANNING,
            MissionStateEnum.UPLOADING,
            MissionStateEnum.IDLE,
            MissionStateEnum.ABORTED,
            MissionStateEnum.EMERGENCY,
        },
        MissionStateEnum.UPLOADING: {
            MissionStateEnum.ARMING,
            MissionStateEnum.READY,
            MissionStateEnum.ABORTED,
        },
        MissionStateEnum.ARMING: {
            MissionStateEnum.TAKEOFF,
            MissionStateEnum.READY,
            MissionStateEnum.ABORTED,
            MissionStateEnum.EMERGENCY,
        },
        MissionStateEnum.TAKEOFF: {
            MissionStateEnum.MISSION,
            MissionStateEnum.HOLD,
            MissionStateEnum.RTL,
            MissionStateEnum.ABORTED,
            MissionStateEnum.EMERGENCY,
        },
        MissionStateEnum.MISSION: {
            MissionStateEnum.HOLD,
            MissionStateEnum.RTL,
            MissionStateEnum.LANDING,
            MissionStateEnum.ABORTED,
            MissionStateEnum.EMERGENCY,
        },
        MissionStateEnum.HOLD: {
            MissionStateEnum.MISSION,
            MissionStateEnum.RTL,
            MissionStateEnum.LANDING,
            MissionStateEnum.ABORTED,
            MissionStateEnum.EMERGENCY,
        },
        MissionStateEnum.RTL: {
            MissionStateEnum.LANDING,
            MissionStateEnum.HOLD,
            MissionStateEnum.ABORTED,
            MissionStateEnum.EMERGENCY,
        },
        MissionStateEnum.LANDING: {
            MissionStateEnum.COMPLETE,
            MissionStateEnum.ABORTED,
            MissionStateEnum.EMERGENCY,
        },
        MissionStateEnum.COMPLETE: {
            MissionStateEnum.IDLE,
            MissionStateEnum.PLANNING,
        },
        MissionStateEnum.ABORTED: {
            MissionStateEnum.IDLE,
            MissionStateEnum.PLANNING,
        },
        MissionStateEnum.EMERGENCY: {
            MissionStateEnum.IDLE,
            MissionStateEnum.PLANNING,
            MissionStateEnum.ABORTED,
        },
    }

    def __init__(
        self,
        state_store: Optional[StateStore] = None,
        event_bus: Optional[EventBus] = None,
    ) -> None:
        self.state_store = state_store or get_state_store()
        self.event_bus = event_bus or get_event_bus()
        self.logger = get_logger("state_machine")

    @property
    def current_state(self) -> MissionStateEnum:
        """Returns active mission state from StateStore."""
        return self.state_store.get_state().mission_state.state

    def can_transition_to(self, target_state: MissionStateEnum) -> bool:
        """Checks if a transition from current_state to target_state is permitted."""
        curr = self.current_state
        allowed = self.ALLOWED_TRANSITIONS.get(curr, set())
        return target_state in allowed

    def transition_to(self, target_state: MissionStateEnum, reason: str = "") -> bool:
        """
        Attempts to advance the FSM to target_state.
        Returns True if successful, False if rejected.
        """
        curr = self.current_state
        if not self.can_transition_to(target_state):
            self.logger.warning(
                f"REJECTED illegal FSM transition: {curr.value} -> {target_state.value} ({reason})"
            )
            return False

        self.logger.info(
            f"FSM Transition: {curr.value} -> {target_state.value} [{reason or 'Nominal'}]"
        )

        # Update StateStore
        self.state_store.update_state(
            lambda s: replace(
                s,
                mission_state=replace(s.mission_state, state=target_state),
            )
        )

        # Emit EventBus event
        self.event_bus.emit(
            f"mission.{target_state.value.lower()}",
            payload={
                "previous_state": curr.value,
                "current_state": target_state.value,
                "reason": reason,
            },
            source="mission_state_machine",
        )
        return True

    def reset(self) -> None:
        """Resets the state machine to IDLE."""
        self.state_store.update_state(
            lambda s: replace(
                s,
                mission_state=replace(s.mission_state, state=MissionStateEnum.IDLE),
            )
        )
        self.event_bus.emit(
            "mission.idle",
            payload={"current_state": "IDLE", "reason": "FSM Reset"},
            source="mission_state_machine",
        )
