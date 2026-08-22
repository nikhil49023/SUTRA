"""
Smart Horizon GCS — AI Command Parser Unit Tests
Subsystem: Test Suite (Phase 10)
"""

import pytest
from ai.command_parser import CommandParser


def test_safe_read_only_queries():
    """Verify safe informational queries do not require confirmation."""
    q1 = CommandParser.parse("what is the current battery level?")
    assert q1.action_type == "READ_ONLY"
    assert q1.requires_confirmation is False
    assert q1.intent == "GET_BATTERY_STATUS"

    q2 = CommandParser.parse("show mission eta")
    assert q2.action_type == "READ_ONLY"
    assert q2.intent == "GET_ETA"

    q3 = CommandParser.parse("which drone has lowest battery?")
    assert q3.intent == "GET_LOWEST_BATTERY_DRONE"


def test_gated_action_commands():
    """Verify flight actions (arm, takeoff, rtl, abort) are flagged for operator confirmation."""
    cmd1 = CommandParser.parse("arm drone")
    assert cmd1.action_type == "ACTION_REQUEST"
    assert cmd1.requires_confirmation is True
    assert cmd1.intent == "REQUEST_ARM"

    cmd2 = CommandParser.parse("takeoff to 30 meters")
    assert cmd2.action_type == "ACTION_REQUEST"
    assert cmd2.requires_confirmation is True
    assert cmd2.parameters.get("altitude_m") == 30.0

    cmd3 = CommandParser.parse("emergency abort")
    assert cmd3.requires_confirmation is True
    assert cmd3.intent == "REQUEST_EMERGENCY_STOP"
