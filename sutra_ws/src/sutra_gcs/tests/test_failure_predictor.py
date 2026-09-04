"""
Smart Horizon GCS — AI Subsystem Fault Predictor Unit Tests
Subsystem: Test Suite (Phase 10)
"""

import pytest
from dataclasses import replace
from ai.failure_predictor import FailurePredictor
from state.application_state import ApplicationState
from state.communication_state import CommunicationState
from state.telemetry_state import TelemetryState


def test_failure_prediction_gnss_dilution():
    """Verify low satellites and high HDOP raise GNSS degradation failure warning."""
    state = ApplicationState(
        telemetry_state=TelemetryState(satellites=4, hdop=3.2)
    )
    faults = FailurePredictor.audit_faults(state)
    assert any(f.subsystem == "GPS" for f in faults)


def test_failure_prediction_latency_degradation():
    """Verify elevated RTT latency raises COMM degradation warning."""
    state = ApplicationState(
        communication_state=CommunicationState(latency_ms=250.0)
    )
    faults = FailurePredictor.audit_faults(state)
    assert any(f.subsystem == "COMM" for f in faults)
