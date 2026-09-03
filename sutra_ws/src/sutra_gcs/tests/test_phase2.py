"""
Smart Horizon GCS — Phase 2 Tactical Dashboard & Persistent Map Test Suite
Subsystem: Test Suite (Phase 2)
"""

import os
import pytest
from PySide6.QtCore import Qt
from PySide6.QtWidgets import QApplication

from config.settings import Settings
from map.map_camera import MapCamera
from map.map_controller import MapController
from map.map_widget import MapWidget
from services.event_bus import EventBus, EventNames
from state.application_state import ApplicationState, StateStore
from state.fleet_state import DroneState, FleetState
from ui.main_window import MainWindow


@pytest.fixture(scope="session")
def qapp():
    """Ensure single QApplication instance exists in offscreen mode for testing."""
    os.environ["QT_QPA_PLATFORM"] = "offscreen"
    app = QApplication.instance()
    if app is None:
        app = QApplication([])
    return app


def test_map_camera_transformations():
    """Verify planar Mercator geographic-to-screen coordinate transformations."""
    cam = MapCamera(latitude=37.774929, longitude=-122.419416, zoom=16.0)
    w, h = 800, 600

    # Center coordinates should map precisely to viewport center
    cx, cy = cam.geo_to_screen(37.774929, -122.419416, w, h)
    assert abs(cx - 400.0) < 1e-3
    assert abs(cy - 300.0) < 1e-3

    # Screen to geo round-trip
    lat, lon = cam.screen_to_geo(cx, cy, w, h)
    assert abs(lat - 37.774929) < 1e-5
    assert abs(lon - -122.419416) < 1e-5


def test_map_controller_operations():
    """Verify MapController operations on camera and state."""
    state_store = StateStore()
    event_bus = EventBus()
    cam = MapCamera()
    controller = MapController(cam, state_store, event_bus)

    # Center & Zoom
    controller.set_center(38.0, -120.0)
    assert cam.latitude == 38.0
    assert cam.longitude == -120.0

    controller.set_zoom(15.5)
    assert cam.zoom == 15.5

    # Drone Management via Controller
    drone = DroneState(drone_id="drone_delta", callsign="DELTA (RELAY)", battery=85.0)
    controller.add_drone(drone)
    assert state_store.get_state().fleet_state.get_drone("drone_delta") is not None

    # Selection
    controller.select_drone("drone_delta")
    assert cam.selected_drone_id == "drone_delta"
    assert state_store.get_state().map_state.selected_drone_id == "drone_delta"

    controller.clear_selection()
    assert cam.selected_drone_id is None


def test_mandatory_map_persistence_workflow(qapp):
    """
    CRITICAL MANDATORY TEST:
    Start Application -> Move map -> Zoom to 15.0 -> Select drone Alpha ->
    Navigate to Mission -> GIS -> Fleet -> Return to Dashboard ->
    Verify:
      1. EXACT same MapWidget instance in memory.
      2. EXACT same camera coordinates.
      3. EXACT same zoom.
      4. EXACT same selected drone.
      5. Zero map re-instantiations or reloads.
    """
    state_store = StateStore()
    event_bus = EventBus()
    settings = Settings()

    # Seed FleetState with Alpha and Bravo
    state_store.update_state(
        lambda s: s.__class__(
            **{
                **s.__dict__,
                "fleet_state": FleetState()
                .add_drone(DroneState(drone_id="drone_alpha", callsign="ALPHA (LEADER)", is_leader=True))
                .add_drone(DroneState(drone_id="drone_bravo", callsign="BRAVO (WING)")),
            }
        )
    )

    # 1. Initialize MainWindow
    win = MainWindow(state_store, event_bus, settings)
    initial_map_instance = win.map_widget

    # 2. Move Map camera & Zoom to 15.0
    win.map_widget.controller.set_center(37.780000, -122.420000)
    win.map_widget.controller.set_zoom(15.0)
    assert win.map_widget.camera.latitude == 37.780000
    assert win.map_widget.camera.zoom == 15.0

    # 3. Select drone Alpha
    win.map_widget.controller.select_drone("drone_alpha")
    assert win.map_widget.camera.selected_drone_id == "drone_alpha"

    # 4. Navigate through all views: Mission -> GIS -> Fleet -> Live Ops -> AI -> Settings
    win.left_sidebar.navigation_requested.emit("mission")
    win.left_sidebar.navigation_requested.emit("gis")
    win.left_sidebar.navigation_requested.emit("fleet")
    win.left_sidebar.navigation_requested.emit("live_ops")
    win.left_sidebar.navigation_requested.emit("ai")
    win.left_sidebar.navigation_requested.emit("settings")

    # 5. Return to Dashboard
    win.left_sidebar.navigation_requested.emit("dashboard")

    # 6. Verify Persistent Singleton Invariants
    assert win.map_widget is initial_map_instance, "MapWidget was recreated! Must be a persistent singleton."
    assert win.map_widget.camera.latitude == 37.780000, "Camera position was reset during navigation!"
    assert win.map_widget.camera.longitude == -122.420000, "Camera position was reset during navigation!"
    assert win.map_widget.camera.zoom == 15.0, "Camera zoom was reset during navigation!"
    assert win.map_widget.camera.selected_drone_id == "drone_alpha", "Selected drone was lost during navigation!"


def test_emergency_button_and_alert_generation(qapp):
    """Verify that clicking the emergency button in TopBar raises an Emergency Alert and publishes on EventBus."""
    state_store = StateStore()
    event_bus = EventBus()
    settings = Settings()

    received_emergency_events = []
    event_bus.subscribe("system.emergency", lambda ev: received_emergency_events.append(ev))

    win = MainWindow(state_store, event_bus, settings)

    # Click Emergency Button
    win.top_bar.emergency_btn.click()

    # Verify event on EventBus
    assert len(received_emergency_events) == 1
    assert received_emergency_events[0].payload["action"] == "EMERGENCY_STOP"
