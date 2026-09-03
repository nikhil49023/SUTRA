"""
Smart Horizon GCS — Tactical AI Mission Advisor & Conversational Assistant
Subsystem: AI Subsystem (Phase 10)
"""

import re
from typing import Any, Dict, List, Optional

from state.application_state import ApplicationState
from .command_parser import CommandParser, ParsedCommandResult
from .models import AssistantMessage


class MissionAdvisorEngine:
    """
    Conversational AI assistant that analyzes ApplicationState and generates factual,
    grounded responses to operator questions.
    """

    @classmethod
    def answer_query(cls, query_text: str, state: ApplicationState) -> AssistantMessage:
        parsed: ParsedCommandResult = CommandParser.parse(query_text)
        intent = parsed.intent
        telem = state.telemetry_state
        fleet = state.fleet_state
        mission = state.mission_state
        geofence = state.geofence_state
        comm = state.communication_state

        bat = getattr(telem, "battery_percent", getattr(telem, "battery_level", 100.0))

        if intent == "GET_BATTERY_STATUS":
            response = (
                f"Battery State: {bat:.0f}% ({telem.battery_voltage:.1f}V). "
                f"Predicted reserve margin: {max(0.0, bat - 20.0):.0f}%."
            )
            conf = 0.95

        elif intent == "GET_LOWEST_BATTERY_DRONE":
            drones = fleet.get_all_drones()
            if drones:
                min_d = min(drones, key=lambda d: d.battery)
                response = f"Aircraft with lowest battery is {min_d.callsign} at {min_d.battery:.0f}%."
                conf = 0.98
            else:
                response = f"Single aircraft active: {telem.drone_id} at {bat:.0f}%."
                conf = 0.95

        elif intent == "GET_ETA":
            spd = max(1.0, telem.ground_speed)
            dist_rem = mission.total_distance - (mission.current_waypoint_index * (mission.total_distance / max(1, len(mission.waypoints))))
            eta_sec = dist_rem / spd if spd > 1.0 else 0.0
            mins = int(eta_sec // 60)
            secs = int(eta_sec % 60)
            response = f"Estimated Time of Arrival: {mins:02d}:{secs:02d} (Remaining Distance: {dist_rem:.0f}m at {spd:.1f} m/s)."
            conf = 0.90

        elif intent == "GET_FLEET_STATUS":
            drones = fleet.get_all_drones()
            d_count = len(drones)
            response = f"Fleet Swarm Status: {d_count} drones active in {fleet.formation}. Leader is {fleet.leader_id or 'ALPHA'}."
            conf = 0.96

        elif intent == "GET_FORMATION_STATUS":
            response = f"Current Swarm Formation: {fleet.formation} with {fleet.spacing:.1f}m lateral inter-drone spacing."
            conf = 0.98

        elif intent == "GET_GEOFENCE_STATUS":
            count = len(getattr(geofence, "geofences", []))
            alerts = getattr(state.alert_state, "alerts", [])
            breaches = any("GEOFENCE" in a.title.upper() for a in alerts)
            status_txt = "BREACH ACTIVE" if breaches else "CLEAR"
            response = f"Airspace Geofence Status: {status_txt}. Active containment zones: {count}."
            conf = 0.98

        elif intent == "GET_MISSION_STATUS":
            cur_wp = getattr(mission, "current_waypoint_index", 1)
            tot_wp = len(getattr(mission, "waypoints", []))
            response = f"Active Mission: '{mission.mission_name}' [{mission.state.value}]. Progress: WP {cur_wp}/{tot_wp}."
            conf = 0.96

        elif intent == "GET_RISK_ASSESSMENT":
            reasons = []
            if bat < 30.0:
                reasons.append(f"Battery is {bat:.0f}%")
            if comm.latency_ms > 100.0:
                reasons.append(f"Link latency is elevated ({comm.latency_ms:.0f}ms)")
            alerts = getattr(state.alert_state, "alerts", [])
            if any("GEOFENCE" in a.title.upper() for a in alerts):
                reasons.append("Active geofence proximity breach")

            if not reasons:
                reasons.append("All kinematics and safety envelopes nominal")

            response = f"Mission Risk is {state.ai_state.risk_assessment}. Factors: " + "; ".join(reasons) + "."
            conf = 0.92

        elif parsed.action_type == "ACTION_REQUEST":
            response = (
                f"ACTION INTENT DETECTED: {parsed.intent}. "
                "AI decision support cannot autonomously issue flight controls. "
                "Please verify flight safety and confirm action in the command queue."
            )
            conf = 1.0

        else:
            response = (
                "Query not recognized. You can ask about battery status, mission progress, "
                "ETA, fleet swarm health, geofences, or risk assessment."
            )
            conf = 0.50

        return AssistantMessage(sender="ASSISTANT", text=response, confidence=conf)

    @staticmethod
    def parse_command(text: str) -> Dict[str, Any]:
        """Backward-compatible parse_command method."""
        t = text.strip().lower()
        if re.search(r"arm", t):
            return {"action": "ARM", "confidence": 0.98}
        elif re.search(r"takeoff", t):
            match = re.search(r"(\d+)", t)
            alt = float(match.group(1)) if match else 15.0
            return {"action": "TAKEOFF", "altitude_m": alt, "confidence": 0.95}
        elif re.search(r"rtl|return", t):
            return {"action": "RTL", "confidence": 0.99}
        elif re.search(r"abort|emergency", t):
            return {"action": "EMERGENCY_STOP", "confidence": 1.0}
        elif re.search(r"grid|search", t):
            return {"action": "GRID_SEARCH", "confidence": 0.92}
        elif re.search(r"v[- ]?formation|wedge", t):
            return {"action": "V_FORMATION", "confidence": 0.92}
        return {"action": "UNKNOWN", "confidence": 0.0}


# Backward-compatible global singleton & alias
MissionAdvisor = MissionAdvisorEngine
mission_advisor = MissionAdvisorEngine()
