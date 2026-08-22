"""
Smart Horizon GCS — Master Mission Intelligence & Execution Engine Orchestrator
Subsystem: Mission Engine (Phase 5)
"""

from typing import List, Optional

from geofence.service import get_geofence_service
from mission.mission_manager import get_mission_manager
from mission.models import Mission
from services.event_bus import EventBus, get_event_bus
from state.application_state import ApplicationState, StateStore, get_state_store

from .battery_estimator import BatteryEstimator
from .execution_engine import ExecutionEngine
from .mission_state_machine import MissionStateMachine
from .mission_timeline import MissionTimeline, get_mission_timeline
from .mission_validator import ComprehensiveMissionValidator, ValidationReport
from .models import BatteryAnalysis, PreflightReport, RiskReport
from .risk_engine import RiskEngine


class MissionEngine:
    """
    Master Mission Orchestrator integrating Pre-Flight Validation, Battery Estimation,
    Risk Profiling, State Machine sequencing, and Real-Time Flight Simulation.
    """

    def __init__(
        self,
        state_store: Optional[StateStore] = None,
        event_bus: Optional[EventBus] = None,
    ) -> None:
        self.state_store = state_store or get_state_store()
        self.event_bus = event_bus or get_event_bus()

        # Core Subsystem Engines
        self.fsm = MissionStateMachine(self.state_store, self.event_bus)
        self.timeline = get_mission_timeline()
        self.execution_engine = ExecutionEngine(
            self.state_store, self.event_bus, self.fsm, self.timeline
        )

    def validate_mission(self) -> ValidationReport:
        """Runs pre-flight validation rules."""
        self.event_bus.emit("mission.validation_started", source="mission_engine")
        self.timeline.add_event("VALIDATION", "Initiated mission flight envelope audit.", "INFO")

        mission = self._get_current_mission()
        geofences = get_geofence_service().get_all_geofences()
        telem = self.state_store.get_state().telemetry_state

        report = ComprehensiveMissionValidator.validate_complete_mission(
            mission, geofences, telem.battery_percent, telem.gps_satellites, telem.rssi_percent
        )

        if report.valid:
            self.fsm.transition_to(
                self.fsm.current_state.__class__.READY, "Validation Passed"
            )
            self.timeline.add_event("VALIDATION", "Mission validated successfully (All checks passed).", "INFO")
        else:
            self.timeline.add_event(
                "VALIDATION_FAIL", f"Validation failed ({len(report.errors)} errors detected).", "CRITICAL"
            )

        self.event_bus.emit(
            "mission.validation_completed",
            payload={"valid": report.valid, "errors": report.errors},
            source="mission_engine",
        )
        return report

    def estimate_battery(self) -> BatteryAnalysis:
        """Calculates energy consumption and RTH reserve margin."""
        mission = self._get_current_mission()
        telem = self.state_store.get_state().telemetry_state
        return BatteryEstimator.estimate_mission_energy(mission, telem.battery_percent)

    def evaluate_risk(self) -> RiskReport:
        """Evaluates operational flight risk level and score."""
        mission = self._get_current_mission()
        geofences = get_geofence_service().get_all_geofences()
        telem = self.state_store.get_state().telemetry_state
        return RiskEngine.evaluate_mission_risk(
            mission, geofences, telem.battery_percent, telem.gps_satellites, telem.rssi_percent
        )

    def generate_preflight(self) -> PreflightReport:
        """Builds itemized pre-flight readiness checklist."""
        mission = self._get_current_mission()
        geofences = get_geofence_service().get_all_geofences()
        telem = self.state_store.get_state().telemetry_state
        return ComprehensiveMissionValidator.generate_preflight_checklist(
            mission, geofences, telem.battery_percent, telem.gps_satellites, telem.rssi_percent
        )

    def start(self) -> bool:
        """Starts mission flight simulation."""
        return self.execution_engine.start_mission()

    def pause(self) -> bool:
        """Pauses mission flight simulation."""
        return self.execution_engine.pause_mission()

    def resume(self) -> bool:
        """Resumes mission flight simulation."""
        return self.execution_engine.resume_mission()

    def rtl(self) -> bool:
        """Commands Return-To-Launch."""
        return self.execution_engine.trigger_rtl()

    def abort(self) -> None:
        """Aborts mission immediately."""
        self.execution_engine.abort_mission()

    def reset(self) -> None:
        """Resets mission to idle launch state."""
        self.execution_engine.reset_mission()

    def _get_current_mission(self) -> Mission:
        return get_mission_manager().get_mission()


# Global singleton
_global_mission_engine: Optional[MissionEngine] = None


def get_mission_engine() -> MissionEngine:
    """Returns global MissionEngine singleton."""
    global _global_mission_engine
    if _global_mission_engine is None:
        _global_mission_engine = MissionEngine()
    return _global_mission_engine
