"""
Smart Horizon GCS — Geofence Service Unit Tests
Subsystem: Test Suite (Phase 4)
"""

import pytest
from geofence.models import GeometryType, ZoneType
from geofence.service import GeofenceService
from services.event_bus import EventBus
from state.application_state import StateStore


def test_geofence_service_crud_and_state():
    """Verify creating, updating, selecting, and deleting geofences."""
    state_store = StateStore()
    event_bus = EventBus()
    srv = GeofenceService(state_store, event_bus)

    # 1. Create Geofence
    g1 = srv.create_geofence(
        name="Airport No-Fly Zone",
        zone_type=ZoneType.NO_FLY,
        geometry_type=GeometryType.CIRCLE,
        center=(37.774929, -122.419416),
        radius=500.0,
        altitude_min=0.0,
        altitude_max=120.0,
    )
    assert g1.id is not None
    assert g1.name == "Airport No-Fly Zone"
    assert g1.zone_type == ZoneType.NO_FLY
    assert len(srv.get_all_geofences()) >= 1

    # Verify StateStore sync
    app_state = state_store.get_state()
    assert any(g.id == g1.id for g in app_state.geofence_state.geofences)

    # 2. Update Geofence
    updated = srv.update_geofence(g1.id, name="SFO Expanded Buffer", radius=750.0)
    assert updated is not None
    assert updated.name == "SFO Expanded Buffer"
    assert updated.radius == 750.0

    # 3. Select Geofence
    selected = srv.select_geofence(g1.id)
    assert selected is not None
    assert srv.get_selected().id == g1.id

    # 4. Toggle Visibility
    toggled = srv.toggle_visibility(g1.id)
    assert toggled.visible is False

    # 5. Delete Geofence
    assert srv.delete_geofence(g1.id) is True
    assert srv.get_geofence(g1.id) is None
