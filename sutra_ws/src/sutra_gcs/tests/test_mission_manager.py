"""
Smart Horizon GCS — MissionManager Unit & Integration Tests
Subsystem: Test Suite (Phase 3)
"""

import pytest
from mission.mission_manager import MissionManager
from mission.waypoint import WaypointCommand
from services.event_bus import EventBus
from state.application_state import StateStore


def test_mission_manager_lifecycle_and_waypoints():
    """Verify adding, moving, deleting, and reordering waypoints in MissionManager."""
    state_store = StateStore()
    event_bus = EventBus()
    mgr = MissionManager(state_store, event_bus)

    # 1. Create Mission
    mgr.create_mission("Alpha Recon", 37.774929, -122.419416)
    assert mgr.get_mission().name == "Alpha Recon"
    assert len(mgr.get_waypoints()) == 0

    # 2. Add Waypoints
    wp1 = mgr.add_waypoint(37.775, -122.419, altitude=25.0, speed=5.0)
    wp2 = mgr.add_waypoint(37.776, -122.418, altitude=30.0, speed=6.0)
    wp3 = mgr.add_waypoint(37.777, -122.417, altitude=35.0, speed=7.0)

    assert len(mgr.get_waypoints()) == 3
    assert mgr.get_waypoints()[0].index == 1
    assert mgr.get_waypoints()[2].index == 3

    # Verify synchronization with centralized StateStore
    app_state = state_store.get_state()
    assert len(app_state.mission_state.waypoints) == 3

    # 3. Move Waypoint 2
    mgr.move_waypoint(wp2.id, 37.780, -122.410)
    moved_wp = mgr.get_mission().waypoints[1]
    assert moved_wp.latitude == 37.780
    assert moved_wp.longitude == -122.410

    # 4. Reorder Waypoint (Move WP1 to position 3)
    mgr.reorder_waypoint(1, 3)
    wps = mgr.get_waypoints()
    assert wps[0].id == wp2.id
    assert wps[2].id == wp1.id
    assert wps[0].index == 1
    assert wps[2].index == 3

    # 5. Delete Waypoint
    mgr.delete_waypoint(wp2.id)
    assert len(mgr.get_waypoints()) == 2
    assert mgr.get_waypoints()[0].index == 1
    assert mgr.get_waypoints()[1].index == 2


def test_mission_manager_undo_redo():
    """Verify robust undo and redo history stack operations."""
    state_store = StateStore()
    event_bus = EventBus()
    mgr = MissionManager(state_store, event_bus)

    mgr.create_mission("History Test")
    mgr.add_waypoint(37.775, -122.419)
    mgr.add_waypoint(37.776, -122.418)
    assert len(mgr.get_waypoints()) == 2

    # Undo addition of WP2
    assert mgr.undo() is True
    assert len(mgr.get_waypoints()) == 1

    # Redo addition of WP2
    assert mgr.redo() is True
    assert len(mgr.get_waypoints()) == 2


def test_waypoint_selection():
    """Verify waypoint selection and state synchronization."""
    mgr = MissionManager()
    wp = mgr.add_waypoint(37.775, -122.419)

    selected = mgr.select_waypoint(wp.id)
    assert selected is not None
    assert selected.id == wp.id
    assert mgr.get_selected_waypoint().id == wp.id

    # Deselect
    mgr.select_waypoint(None)
    assert mgr.get_selected_waypoint() is None
