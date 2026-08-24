"""
SMART HORIZON GCS — Phase 12 Production Integration Hardening Backend Tests
Subsystems: StateStore, EventBus, CommandProcessor, Idempotency, Gateway
"""

import os
import sys
import time
import pytest
from dataclasses import replace
from pathlib import Path

gcs_root = Path(__file__).resolve().parent.parent
if str(gcs_root) not in sys.path:
    sys.path.insert(0, str(gcs_root))

from state.application_state import get_state_store, ApplicationState
from services.event_bus import get_event_bus, Event
from services.audit_logger import get_audit_logger
from server.command_processor import get_command_processor, CommandResult
from mission.mission_manager import get_mission_manager
from fleet.formation_engine import get_formation_engine


class TestPhase12Hardening:
    def setup_method(self):
        self.state_store = get_state_store()
        self.event_bus = get_event_bus()
        self.command_processor = get_command_processor()
        self.audit = get_audit_logger()
        self.mission_mgr = get_mission_manager()
        self.formation_eng = get_formation_engine()

    def test_state_versioning_increments_monotonically(self):
        """Test that every state update increments state_version monotonically."""
        v_start = self.state_store.state_version
        
        # Mutation 1
        self.state_store.update_state(lambda s: replace(s, application_status="RUNNING_TEST"))
        v1 = self.state_store.state_version
        assert v1 == v_start + 1

        # Mutation 2
        self.state_store.update_state(lambda s: replace(s, application_status="READY"))
        v2 = self.state_store.state_version
        assert v2 == v1 + 1

    def test_command_processor_idempotency(self):
        """Test that duplicate command_id returns cached result and executes only once."""
        cmd_id = f"cmd-idem-{time.time()}"
        execution_count = 0

        def _action():
            nonlocal execution_count
            execution_count += 1
            return {"count": execution_count}

        # First call
        res1, cached1 = self.command_processor.process(
            command_id=cmd_id,
            command_type="test.action",
            payload={"param": 1},
            executor_func=_action,
        )
        assert cached1 is False
        assert res1.status == "ACCEPTED"
        assert execution_count == 1

        # Second duplicate call with same command_id
        res2, cached2 = self.command_processor.process(
            command_id=cmd_id,
            command_type="test.action",
            payload={"param": 1},
            executor_func=_action,
        )
        assert cached2 is True
        assert res2.status == "ACCEPTED"
        # Executor must NOT run again
        assert execution_count == 1

    def test_command_rejection_validation(self):
        """Test that invalid commands are properly rejected with error messages."""
        cmd_id = f"cmd-reject-{time.time()}"

        def _invalid_action():
            raise ValueError("Altitude -10m is below ground level.")

        res, cached = self.command_processor.process(
            command_id=cmd_id,
            command_type="mission.add_waypoint",
            payload={"altitude": -10},
            executor_func=_invalid_action,
        )

        assert res.status == "REJECTED"
        assert "Altitude -10m is below ground level" in res.error
        assert cached is False

    def test_audit_logging_records_commands(self):
        """Test that all operational commands are captured in audit trail."""
        cmd_id = f"cmd-audit-{time.time()}"
        self.audit.log_command(
            command_id=cmd_id,
            command_type="mission.start",
            user="TEST_OPERATOR",
            target="SYSTEM",
            result="ACCEPTED",
            state_version=self.state_store.state_version,
            payload={"mode": "TACTICAL"},
        )

        entries = self.audit.get_recent_entries(limit=10)
        matching = [e for e in entries if e["command_id"] == cmd_id]
        assert len(matching) == 1
        assert matching[0]["user"] == "TEST_OPERATOR"
        assert matching[0]["result"] == "ACCEPTED"

    def test_event_bus_delivers_with_event_id(self):
        """Test that EventBus generates unique event_id and includes state_version."""
        received_events = []
        unsub = self.event_bus.subscribe("test.phase12.*", lambda e: received_events.append(e))

        ev = self.event_bus.emit(
            "test.phase12.ping",
            payload={"msg": "hello"},
            state_version=self.state_store.state_version,
        )

        assert len(received_events) == 1
        assert received_events[0].event_id is not None
        assert received_events[0].event_name == "test.phase12.ping"
        assert received_events[0].state_version == self.state_store.state_version

        unsub()
