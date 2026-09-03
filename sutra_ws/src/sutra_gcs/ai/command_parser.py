"""
Smart Horizon GCS — Natural Language NLP Command Parser & Intent Classifier
Subsystem: AI Subsystem (Phase 10)
"""

import re
from dataclasses import dataclass
from typing import Any, Dict, Optional


@dataclass
class ParsedCommandResult:
    intent: str
    action_type: str  # READ_ONLY vs ACTION_REQUEST
    parameters: Dict[str, Any]
    requires_confirmation: bool
    confidence: float
    explanation: str


class CommandParser:
    """
    Classifies operator natural language queries into safe read-only informational requests
    or gated action requests requiring operator approval.
    """

    @classmethod
    def parse(cls, text: str) -> ParsedCommandResult:
        t = text.strip().lower()

        # 1. READ-ONLY QUERIES (Safe, immediate execution)
        if re.search(r"battery|power|charge|soc", t):
            if re.search(r"lowest|min|weakest", t):
                return ParsedCommandResult(
                    intent="GET_LOWEST_BATTERY_DRONE",
                    action_type="READ_ONLY",
                    parameters={},
                    requires_confirmation=False,
                    confidence=0.96,
                    explanation="Identifying swarm aircraft with lowest battery percentage.",
                )
            return ParsedCommandResult(
                intent="GET_BATTERY_STATUS",
                action_type="READ_ONLY",
                parameters={},
                requires_confirmation=False,
                confidence=0.95,
                explanation="Retrieving real-time battery and power metrics.",
            )

        elif re.search(r"eta|arrival|time remaining|duration", t):
            return ParsedCommandResult(
                intent="GET_ETA",
                action_type="READ_ONLY",
                parameters={},
                requires_confirmation=False,
                confidence=0.94,
                explanation="Calculating estimated time of arrival for current mission segments.",
            )

        elif re.search(r"fleet|swarm|drones|aircraft", t):
            return ParsedCommandResult(
                intent="GET_FLEET_STATUS",
                action_type="READ_ONLY",
                parameters={},
                requires_confirmation=False,
                confidence=0.92,
                explanation="Querying health and positions of all swarm aircraft.",
            )

        elif re.search(r"formation|v[- ]?formation|line|wedge", t):
            return ParsedCommandResult(
                intent="GET_FORMATION_STATUS",
                action_type="READ_ONLY",
                parameters={},
                requires_confirmation=False,
                confidence=0.93,
                explanation="Retrieving current swarm formation pattern and geometry offsets.",
            )

        elif re.search(r"geofence|no-fly|airspace", t):
            return ParsedCommandResult(
                intent="GET_GEOFENCE_STATUS",
                action_type="READ_ONLY",
                parameters={},
                requires_confirmation=False,
                confidence=0.95,
                explanation="Querying active geofence boundaries and airspace safety envelope.",
            )

        elif re.search(r"risk|threat|safety", t):
            return ParsedCommandResult(
                intent="GET_RISK_ASSESSMENT",
                action_type="READ_ONLY",
                parameters={},
                requires_confirmation=False,
                confidence=0.91,
                explanation="Evaluating multi-subsystem risk and obstacle matrix.",
            )

        elif re.search(r"mission|waypoints|route|plan", t):
            return ParsedCommandResult(
                intent="GET_MISSION_STATUS",
                action_type="READ_ONLY",
                parameters={},
                requires_confirmation=False,
                confidence=0.94,
                explanation="Querying active flight plan and waypoint progress.",
            )

        # 2. GATED FLIGHT COMMANDS (Require explicit operator confirmation)
        elif re.search(r"arm", t):
            return ParsedCommandResult(
                intent="REQUEST_ARM",
                action_type="ACTION_REQUEST",
                parameters={"arm": True},
                requires_confirmation=True,
                confidence=0.98,
                explanation="ARM command intent detected. Requires explicit operator confirmation.",
            )

        elif re.search(r"takeoff", t):
            match = re.search(r"(\d+)", t)
            alt = float(match.group(1)) if match else 25.0
            return ParsedCommandResult(
                intent="REQUEST_TAKEOFF",
                action_type="ACTION_REQUEST",
                parameters={"altitude_m": alt},
                requires_confirmation=True,
                confidence=0.95,
                explanation=f"TAKEOFF to {alt:.0f}m requested. Gated by safety validator.",
            )

        elif re.search(r"rtl|return", t):
            return ParsedCommandResult(
                intent="REQUEST_RTL",
                action_type="ACTION_REQUEST",
                parameters={},
                requires_confirmation=True,
                confidence=0.98,
                explanation="Return-To-Launch flight action requested.",
            )

        elif re.search(r"abort|emergency|kill", t):
            return ParsedCommandResult(
                intent="REQUEST_EMERGENCY_STOP",
                action_type="ACTION_REQUEST",
                parameters={},
                requires_confirmation=True,
                confidence=1.0,
                explanation="Emergency abort requested. Directing to Emergency Safety Interlock.",
            )

        return ParsedCommandResult(
            intent="UNKNOWN",
            action_type="READ_ONLY",
            parameters={},
            requires_confirmation=False,
            confidence=0.0,
            explanation="Unrecognized operator command or query.",
        )


# Global singleton
command_parser = CommandParser()
