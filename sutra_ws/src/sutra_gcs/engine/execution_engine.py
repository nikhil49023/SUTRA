"""
Smart Horizon GCS — Real-Time Flight Execution & Kinematic Simulation Engine
Subsystem: Mission Engine (Phase 5)
"""

import math
import time
from dataclasses import replace
from typing import List, Optional, Set, Tuple

from PySide6.QtCore import QObject, QTimer, Signal

from geofence.geometry import GeofenceGeometry
from geofence.models import GeometryType, ZoneType
from mission.models import Mission
from mission.route_calculator import RouteCalculator
from mission.waypoint import Waypoint
from services.event_bus import EventBus, get_event_bus
from services.logging_service import get_logger
from state.alert_state import Alert, AlertSeverity
from state.application_state import ApplicationState, StateStore, get_state_store
from state.mission_state import MissionStateEnum
from .mission_state_machine import MissionStateMachine
from .mission_timeline import MissionTimeline, get_mission_timeline
from .telemetry_simulator import TelemetrySimulator


class ExecutionEngine(QObject):
    """
    High-fidelity kinematic flight simulator executing autonomous waypoint missions.
    Performs 60 FPS spatial interpolation, live battery depletion, real-time geofence
    breach detection, dynamic route re-planning, and telemetry generation.
    """

    tick_updated = Signal()
    waypoint_reached_signal = Signal(int)
    mission_completed_signal = Signal()

    def __init__(
        self,
        state_store: Optional[StateStore] = None,
        event_bus: Optional[EventBus] = None,
        fsm: Optional[MissionStateMachine] = None,
        timeline: Optional[MissionTimeline] = None,
        parent=None,
    ) -> None:
        super().__init__(parent)
        self.state_store = state_store or get_state_store()
        self.event_bus = event_bus or get_event_bus()
        self.fsm = fsm or MissionStateMachine(self.state_store, self.event_bus)
        self.timeline = timeline or get_mission_timeline()
        self.telemetry_sim = TelemetrySimulator(self.state_store, self.event_bus)
        self.logger = get_logger("execution_engine")

        # Kinematic Aircraft State
        self.current_lat: float = 37.774929
        self.current_lon: float = -122.419416
        self.current_alt: float = 0.0
        self.current_speed: float = 0.0
        self.current_heading: float = 0.0
        self.current_battery: float = 100.0
        self.vertical_speed: float = 0.0

        # Mission Progress Indices
        self.target_wp_index: int = 1
        self.hold_time_remaining: float = 0.0
        self.is_rtl: bool = False
        self.speed_multiplier: float = 1.0

        # Breach deduplication
        self._active_warning_zones: Set[str] = set()

        # Simulation Timer (60 Hz loop ~16ms)
        self._sim_timer = QTimer(self)
        self._sim_timer.timeout.connect(self._on_sim_tick)
        self._last_tick_time = time.time()

        # Subscribe to State Store to observe dynamic waypoint changes
        self._unsub_state = self.state_store.subscribe(self._on_app_state_changed)

    # ── 1. Mission Flight Controls ───────────────────────────────────────────
    def start_mission(self) -> bool:
        """Arms UAV, performs takeoff, and begins autonomous mission execution."""
        app_state = self.state_store.get_state()
        m = app_state.mission_state
        wps = m.waypoints

        if not wps:
            self.logger.warning("Cannot start mission: Zero waypoints.")
            return False

        # Reset Kinematics to Home
        self.current_lat = m.home_latitude
        self.current_lon = m.home_longitude
        self.current_alt = 0.0
        self.current_battery = 100.0
        self.target_wp_index = 1
        self.is_rtl = False
        self._active_warning_zones.clear()

        # FSM State Advancement: READY -> ARMING -> TAKEOFF -> MISSION
        if not self.fsm.transition_to(MissionStateEnum.ARMING, "Operator Launch"):
            return False

        self.timeline.add_event("ARMING", "UAV propulsion systems armed and verified.", "INFO")
        self.fsm.transition_to(MissionStateEnum.TAKEOFF, "Auto Takeoff")
        self.timeline.add_event("TAKEOFF", f"Climbing to initial waypoint altitude ({wps[0].altitude:.0f}m).", "INFO")

        self.current_alt = wps[0].altitude
        self.fsm.transition_to(MissionStateEnum.MISSION, "Entering autonomous navigation")
        self.timeline.add_event("MISSION_START", f"Navigating to WP01 ({wps[0].latitude:.5f}, {wps[0].longitude:.5f}).", "INFO")

        self._last_tick_time = time.time()
        self._sim_timer.start(16)  # 60 FPS
        return True

    def pause_mission(self) -> bool:
        """Puts UAV in GPS loiter hold."""
        if self.fsm.current_state == MissionStateEnum.MISSION:
            if self.fsm.transition_to(MissionStateEnum.HOLD, "Operator Pause"):
                self.timeline.add_event("HOLD", f"Loitering in position at WP{self.target_wp_index:02d}.", "WARNING")
                return True
        return False

    def resume_mission(self) -> bool:
        """Resumes navigation from loiter hold."""
        if self.fsm.current_state == MissionStateEnum.HOLD:
            if self.fsm.transition_to(MissionStateEnum.MISSION, "Operator Resume"):
                self.timeline.add_event("RESUME", "Resuming mission corridor navigation.", "INFO")
                return True
        return False

    def trigger_rtl(self) -> bool:
        """Aborts active flight leg and commands immediate Return-to-Launch."""
        if self.fsm.can_transition_to(MissionStateEnum.RTL):
            if self.fsm.transition_to(MissionStateEnum.RTL, "RTL Command"):
                self.is_rtl = True
                self.timeline.add_event("RTL", "Returning to Launch Origin (Home).", "WARNING")
                return True
        return False

    def abort_mission(self) -> None:
        """Immediately halts flight simulation."""
        self._sim_timer.stop()
        self.current_speed = 0.0
        self.fsm.transition_to(MissionStateEnum.ABORTED, "Operator Abort")
        self.timeline.add_event("ABORT", "Mission flight execution ABORTED.", "CRITICAL")

    def reset_mission(self) -> None:
        """Resets simulation back to initial idle position."""
        self._sim_timer.stop()
        app_state = self.state_store.get_state()
        self.current_lat = app_state.mission_state.home_latitude
        self.current_lon = app_state.mission_state.home_longitude
        self.current_alt = 0.0
        self.current_speed = 0.0
        self.current_battery = 100.0
        self.target_wp_index = 1
        self.is_rtl = False
        self._active_warning_zones.clear()
        self.fsm.reset()
        self.telemetry_sim.update_telemetry(
            self.current_lat, self.current_lon, 0.0, 0.0, 0.0, 0.0, 100.0, flight_mode="IDLE"
        )

    # ── 2. Dynamic Waypoint Synchronization ──────────────────────────────────
    def _on_app_state_changed(self, state: ApplicationState) -> None:
        """Ensures that dynamic waypoint additions/edits/deletions during flight are updated."""
        wps = state.mission_state.waypoints
        if not wps and self._sim_timer.isActive() and not self.is_rtl:
            self.logger.warning("All waypoints removed during active flight! Triggering RTL.")
            self.trigger_rtl()
            return

        if self.target_wp_index > len(wps) and not self.is_rtl:
            self.target_wp_index = max(1, len(wps))

    # ── 3. High-Frequency 60 FPS Kinematic Simulation Loop ───────────────────
    def _on_sim_tick(self) -> None:
        now = time.time()
        dt = min(0.1, (now - self._last_tick_time) * self.speed_multiplier)
        self._last_tick_time = now

        curr_state = self.fsm.current_state
        if curr_state not in {
            MissionStateEnum.MISSION,
            MissionStateEnum.HOLD,
            MissionStateEnum.RTL,
            MissionStateEnum.LANDING,
        }:
            return

        app_state = self.state_store.get_state()
        mission = app_state.mission_state
        wps = mission.waypoints

        # 1. Determine Target Setpoint
        if self.is_rtl or curr_state == MissionStateEnum.RTL:
            target_lat = mission.home_latitude
            target_lon = mission.home_longitude
            target_alt = 20.0
            target_speed = 8.0
            target_hold = 0.0
            acceptance_radius = 2.0
        elif wps and 1 <= self.target_wp_index <= len(wps):
            target_wp = wps[self.target_wp_index - 1]
            target_lat = target_wp.latitude
            target_lon = target_wp.longitude
            target_alt = target_wp.altitude
            target_speed = target_wp.speed
            target_hold = target_wp.hold_time
            acceptance_radius = target_wp.acceptance_radius
        else:
            # Reached end of mission
            self._handle_mission_complete()
            return

        # 2. Distance and Bearing Calculation
        dist_to_target_m = RouteCalculator.calculate_distance(
            self.current_lat, self.current_lon, target_lat, target_lon
        )
        target_bearing = RouteCalculator.calculate_bearing(
            self.current_lat, self.current_lon, target_lat, target_lon
        )

        # 3. Kinematic Translation & Interpolation
        if curr_state == MissionStateEnum.HOLD:
            self.current_speed = 0.0
        elif dist_to_target_m <= acceptance_radius:
            # Waypoint Arrived!
            if self.hold_time_remaining > 0:
                self.hold_time_remaining -= dt
                self.current_speed = 0.0
            else:
                self._advance_to_next_waypoint(wps)
        else:
            # Fly toward target
            self.current_speed = min(target_speed, max(2.0, dist_to_target_m))
            self.current_heading = target_bearing

            # Step distance in meters
            step_m = self.current_speed * dt
            step_ratio = min(1.0, step_m / dist_to_target_m) if dist_to_target_m > 0 else 1.0

            self.current_lat += (target_lat - self.current_lat) * step_ratio
            self.current_lon += (target_lon - self.current_lon) * step_ratio

            # Smooth Altitude Transition
            alt_diff = target_alt - self.current_alt
            self.vertical_speed = math.copysign(min(2.5, abs(alt_diff)), alt_diff)
            self.current_alt += self.vertical_speed * dt

        # 4. Battery Consumption Simulation
        consumption_rate = (0.04 if self.current_speed > 1.0 else 0.02) * self.speed_multiplier
        self.current_battery = max(0.0, self.current_battery - (consumption_rate * dt))

        if self.current_battery < 20.0 and self.current_battery + (consumption_rate * dt) >= 20.0:
            self.event_bus.emit("battery.warning", payload={"battery": self.current_battery}, source="execution_engine")
            self.timeline.add_event("BATTERY_WARN", f"Battery low ({self.current_battery:.0f}%).", "WARNING")
        elif self.current_battery < 10.0 and not self.is_rtl:
            self.event_bus.emit("battery.critical", payload={"battery": self.current_battery}, source="execution_engine")
            self.timeline.add_event("BATTERY_CRITICAL", "Battery critical (<10%). Auto RTL triggered.", "EMERGENCY")
            self.trigger_rtl()

        # 5. Real-Time Geofence Containment & Breach Detection
        self._check_geofence_breaches(app_state.geofence_state.geofences)

        # 6. Calculate Mission Progress %
        total_m = RouteCalculator.calculate_total_distance(wps, mission.home_latitude, mission.home_longitude)
        rem_m = RouteCalculator.calculate_distance_remaining(
            self.current_lat, self.current_lon, self.target_wp_index, wps
        ) if wps else 0.0
        progress_pct = max(0.0, min(100.0, ((total_m - rem_m) / total_m * 100.0))) if total_m > 0 else 100.0

        # 7. Update Telemetry & StateStore
        flight_mode_str = "RTL" if self.is_rtl else curr_state.value
        self.telemetry_sim.update_telemetry(
            latitude=self.current_lat,
            longitude=self.current_lon,
            altitude=self.current_alt,
            ground_speed=self.current_speed,
            heading=self.current_heading,
            vertical_speed=self.vertical_speed,
            battery_percent=self.current_battery,
            flight_mode=flight_mode_str,
            current_waypoint_index=self.target_wp_index,
            mission_progress=progress_pct,
        )

        self.tick_updated.emit()

    def _advance_to_next_waypoint(self, wps: List[Waypoint]) -> None:
        """Transitions to the subsequent mission waypoint or initiates landing."""
        if self.is_rtl:
            self._handle_mission_complete()
            return

        self.timeline.add_event(
            "WAYPOINT_REACHED", f"Arrived at WP{self.target_wp_index:02d}.", "INFO"
        )
        self.waypoint_reached_signal.emit(self.target_wp_index)

        if self.target_wp_index < len(wps):
            self.target_wp_index += 1
            next_wp = wps[self.target_wp_index - 1]
            self.hold_time_remaining = next_wp.hold_time
            self.timeline.add_event(
                "WAYPOINT_NEXT", f"Targeting WP{self.target_wp_index:02d} ({next_wp.command.value}).", "INFO"
            )
        else:
            self._handle_mission_complete()

    def _handle_mission_complete(self) -> None:
        """Completes mission execution and lands aircraft."""
        self._sim_timer.stop()
        self.current_speed = 0.0
        self.fsm.transition_to(MissionStateEnum.LANDING, "Destination Reached")
        self.timeline.add_event("LANDING", "Touchdown initiated at destination point.", "INFO")
        self.fsm.transition_to(MissionStateEnum.COMPLETE, "Mission Finished")
        self.timeline.add_event("COMPLETE", "Autonomous mission completed successfully.", "INFO")
        self.mission_completed_signal.emit()

    # ── 4. Airspace Geofence Breach Detection ────────────────────────────────
    def _check_geofence_breaches(self, geofences) -> None:
        """Audits current live UAV coordinate against all active geofences."""
        for g in geofences:
            if not g.enabled or not g.visible:
                continue

            # Altitude check
            if not (g.altitude_min <= self.current_alt <= g.altitude_max):
                continue

            # Geometric containment
            poly = None
            if g.geometry_type == GeometryType.CIRCLE and g.center:
                poly = GeofenceGeometry.create_circle(g.center[0], g.center[1], g.radius)
            elif g.geometry_type == GeometryType.CORRIDOR and len(g.coordinates) >= 2:
                poly = GeofenceGeometry.create_corridor(g.coordinates, g.corridor_width)
            elif g.coordinates and len(g.coordinates) >= 3:
                poly = GeofenceGeometry.create_polygon(g.coordinates)

            if not poly:
                continue

            is_inside = GeofenceGeometry.contains_point(poly, self.current_lat, self.current_lon)

            if is_inside:
                if g.zone_type == ZoneType.NO_FLY:
                    # CRITICAL BREACH: Stop simulation & trigger Emergency
                    self._sim_timer.stop()
                    self.fsm.transition_to(MissionStateEnum.EMERGENCY, f"Breach of NO-FLY ZONE '{g.name}'")
                    self.timeline.add_event(
                        "GEOFENCE_BREACH",
                        f"CRITICAL NO-FLY BREACH: Entered restricted zone '{g.name}'!",
                        "EMERGENCY",
                    )
                    self.state_store.update_state(
                        lambda s: replace(
                            s,
                            alert_state=s.alert_state.add_alert(
                                Alert(
                                    severity=AlertSeverity.EMERGENCY,
                                    source="geofence_monitor",
                                    message=f"CRITICAL AIRSPACE BREACH: NO-FLY ZONE '{g.name}' VIOLATION!",
                                )
                            ),
                        )
                    )
                    self.event_bus.emit(
                        "geofence.breach",
                        payload={"geofence_id": g.id, "name": g.name},
                        source="execution_engine",
                    )
                    return

                elif g.zone_type == ZoneType.WARNING:
                    if g.id not in self._active_warning_zones:
                        self._active_warning_zones.add(g.id)
                        self.timeline.add_event(
                            "GEOFENCE_WARNING",
                            f"Aircraft entered WARNING ZONE: '{g.name}'.",
                            "WARNING",
                        )
            else:
                if g.id in self._active_warning_zones:
                    self._active_warning_zones.remove(g.id)
