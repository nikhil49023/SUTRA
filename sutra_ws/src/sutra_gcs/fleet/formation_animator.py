"""
Smart Horizon GCS — Swarm Formation 60 FPS Kinematic Animator
Subsystem: Swarm Fleet Management (Phase 6)
"""

import math
import time
from dataclasses import replace
from typing import Optional

try:
    from PySide6.QtCore import QObject, QTimer, Signal
except ImportError:
    class QObject:
        def __init__(self, *args, **kwargs):
            pass
    class Signal:
        def emit(self, *args, **kwargs):
            pass
    class QTimer:
        def __init__(self, *args, **kwargs):
            self.timeout = self
        def connect(self, *args, **kwargs):
            pass
        def start(self, *args, **kwargs):
            pass
        def stop(self, *args, **kwargs):
            pass

from services.event_bus import EventBus, get_event_bus
from services.logging_service import get_logger
from state.application_state import ApplicationState, StateStore, get_state_store
from state.fleet_state import DroneState, FleetState


class FormationAnimator(QObject):
    """
    High-frequency 60 FPS kinematic interpolation loop for multi-drone swarm formations.
    Smoothly glides follower drones to their computed target setpoints without teleportation.
    """

    frame_rendered = Signal()

    def __init__(
        self,
        state_store: Optional[StateStore] = None,
        event_bus: Optional[EventBus] = None,
        parent=None,
    ) -> None:
        super().__init__(parent)
        self.state_store = state_store or get_state_store()
        self.event_bus = event_bus or get_event_bus()
        self.logger = get_logger("formation_animator")

        # 60 FPS animation timer (~16ms)
        self._timer = QTimer(self)
        self._timer.timeout.connect(self._on_animation_tick)
        self._last_tick = time.time()
        self.convergence_speed = 8.0  # Interpolation factor

        self.start()

    def start(self) -> None:
        """Starts the 60 FPS formation interpolation loop."""
        if not self._timer.isActive():
            self._last_tick = time.time()
            self._timer.start(16)
            self.logger.info("FormationAnimator 60 FPS loop started.")

    def stop(self) -> None:
        """Stops the animation loop."""
        self._timer.stop()

    def _on_animation_tick(self) -> None:
        now = time.time()
        dt = min(0.05, now - self._last_tick)
        self._last_tick = now

        fleet = self.state_store.get_state().fleet_state
        if not fleet.drones:
            return

        leader = fleet.get_leader()
        has_movement = False
        new_drones = dict(fleet.drones)

        # Smoothly interpolate each follower toward target
        for d_id, drone in fleet.drones.items():
            if drone.is_leader:
                continue

            t_lat = drone.target_latitude
            t_lon = drone.target_longitude
            t_alt = drone.target_altitude if drone.target_altitude is not None else drone.altitude
            t_heading = drone.target_heading if drone.target_heading is not None else drone.heading

            if t_lat is None or t_lon is None:
                continue

            d_lat = t_lat - drone.latitude
            d_lon = t_lon - drone.longitude
            d_alt = t_alt - drone.altitude

            # If position difference exists, interpolate
            if abs(d_lat) > 1e-7 or abs(d_lon) > 1e-7 or abs(d_alt) > 0.05:
                has_movement = True
                factor = min(1.0, self.convergence_speed * dt)

                cur_lat = drone.latitude + (d_lat * factor)
                cur_lon = drone.longitude + (d_lon * factor)
                cur_alt = drone.altitude + (d_alt * factor)

                # Heading smoothing
                cur_heading = drone.heading + ((t_heading - drone.heading) * factor)

                # Simulated speed (m/s)
                dist_m = math.sqrt((d_lat * 111132.0)**2 + (d_lon * 85000.0)**2)
                speed = min(15.0, max(0.5, dist_m * self.convergence_speed))

                new_drones[d_id] = replace(
                    drone,
                    latitude=cur_lat,
                    longitude=cur_lon,
                    altitude=cur_alt,
                    heading=cur_heading,
                    speed=speed,
                )

        if has_movement:
            self.state_store.update_state(
                lambda s: replace(s, fleet_state=replace(s.fleet_state, drones=new_drones))
            )
            self.frame_rendered.emit()


# Global singleton
_global_animator: Optional[FormationAnimator] = None


def get_formation_animator() -> FormationAnimator:
    """Returns global FormationAnimator singleton."""
    global _global_animator
    if _global_animator is None:
        _global_animator = FormationAnimator()
    return _global_animator
