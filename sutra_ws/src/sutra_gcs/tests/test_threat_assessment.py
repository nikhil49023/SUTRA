"""
Smart Horizon GCS — AI Threat Assessment Unit Tests
Subsystem: Test Suite (Phase 10)
"""

import pytest
from ai.threat_assessment import ThreatAssessmentEngine
from state.alert_state import Alert, AlertSeverity, AlertState
from state.application_state import ApplicationState
from state.gis_state import GISState


def test_threat_assessment_geofence_breach():
    """Verify active geofence breach alert is reflected in threat matrix."""
    state = ApplicationState(
        alert_state=AlertState(
            alerts=[
                Alert(severity=AlertSeverity.CRITICAL, title="NO-FLY GEOFENCE BREACH DETECTED")
            ]
        )
    )
    threats = ThreatAssessmentEngine.evaluate_threats(state)
    assert len(threats) >= 1
    assert "GEOFENCE" in threats[0].label


def test_threat_assessment_severe_wind():
    """Verify severe weather conditions in GIS state raise threat entries."""
    state = ApplicationState(
        gis_state=GISState(
            analysis_result={"wind_speed_mps": 18.5}
        )
    )
    threats = ThreatAssessmentEngine.evaluate_threats(state)
    assert any("WIND" in t.label for t in threats)
