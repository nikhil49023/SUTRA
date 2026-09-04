"""
Smart Horizon GCS — Formation Calculator Computational Geometry Unit Tests
Subsystem: Test Suite (Phase 6)
"""

import math
import pytest
from fleet.formation_calculator import FormationCalculator
from mission.route_calculator import RouteCalculator


def test_v_formation_offsets():
    """Verify V-formation positions around leader."""
    drones = ["drone_alpha", "drone_bravo", "drone_charlie", "drone_delta"]
    targets = FormationCalculator.calculate_targets(
        leader_id="drone_alpha",
        leader_lat=37.774929,
        leader_lon=-122.419416,
        leader_alt=25.0,
        leader_heading=0.0,  # Facing North
        drone_ids=drones,
        formation_type="V_FORMATION",
        spacing_m=25.0,
    )

    assert len(targets) == 4
    alpha = targets["drone_alpha"]
    bravo = targets["drone_bravo"]
    charlie = targets["drone_charlie"]
    delta = targets["drone_delta"]

    # Leader stays at origin
    assert alpha.latitude == 37.774929
    assert alpha.longitude == -122.419416

    # Bravo is Left Wing (West of leader and South of leader)
    assert bravo.longitude < alpha.longitude
    assert bravo.latitude < alpha.latitude

    # Charlie is Right Wing (East of leader and South of leader)
    assert charlie.longitude > alpha.longitude
    assert charlie.latitude < alpha.latitude

    # Verify spacing is ~25m
    dist_alpha_bravo = RouteCalculator.calculate_distance(
        alpha.latitude, alpha.longitude, bravo.latitude, bravo.longitude
    )
    # sqrt(25^2 + 25^2) = ~35.35m
    assert 30.0 < dist_alpha_bravo < 40.0


def test_line_formation_offsets():
    """Verify lateral Line formation spread."""
    drones = ["drone_alpha", "drone_bravo", "drone_charlie"]
    targets = FormationCalculator.calculate_targets(
        leader_id="drone_alpha",
        leader_lat=37.774929,
        leader_lon=-122.419416,
        leader_alt=25.0,
        leader_heading=0.0,
        drone_ids=drones,
        formation_type="LINE",
        spacing_m=30.0,
    )

    bravo = targets["drone_bravo"]
    charlie = targets["drone_charlie"]

    # Both are at same latitude as leader, spread East/West
    assert abs(bravo.latitude - 37.774929) < 1e-5
    assert abs(charlie.latitude - 37.774929) < 1e-5
    assert bravo.longitude < -122.419416 < charlie.longitude


def test_spacing_scaling():
    """Verify that increasing spacing increases inter-drone distances proportionally."""
    drones = ["drone_alpha", "drone_bravo"]
    targets_25m = FormationCalculator.calculate_targets(
        leader_id="drone_alpha",
        leader_lat=37.774929,
        leader_lon=-122.419416,
        leader_alt=25.0,
        leader_heading=0.0,
        drone_ids=drones,
        formation_type="COLUMN",
        spacing_m=25.0,
    )

    targets_50m = FormationCalculator.calculate_targets(
        leader_id="drone_alpha",
        leader_lat=37.774929,
        leader_lon=-122.419416,
        leader_alt=25.0,
        leader_heading=0.0,
        drone_ids=drones,
        formation_type="COLUMN",
        spacing_m=50.0,
    )

    d25 = RouteCalculator.calculate_distance(
        targets_25m["drone_alpha"].latitude, targets_25m["drone_alpha"].longitude,
        targets_25m["drone_bravo"].latitude, targets_25m["drone_bravo"].longitude
    )
    d50 = RouteCalculator.calculate_distance(
        targets_50m["drone_alpha"].latitude, targets_50m["drone_alpha"].longitude,
        targets_50m["drone_bravo"].latitude, targets_50m["drone_bravo"].longitude
    )

    assert 24.0 < d25 < 26.0
    assert 48.0 < d50 < 52.0
