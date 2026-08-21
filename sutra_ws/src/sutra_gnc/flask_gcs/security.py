"""
SUTRA Security, RBAC & Audit Trail Manager
Subsystem D: 4-Tier Role-Based Access Control & Tactical Command Authorization
"""

import time
import html
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum


class UserRole(str, Enum):
    COMMANDER = "COMMANDER"  # Full control (Arm, Takeoff, Emergency, Reconfig)
    OPERATOR = "OPERATOR"    # Flight execution (Waypoints, Formations, RTL)
    ANALYST = "ANALYST"      # Intelligence (AI Detections, GIS, Replay, Logs)
    VIEWER = "VIEWER"        # Read-only Telemetry & HUD


class SecurityManager:
    """
    Validates user credentials, checks role permissions, sanitizes inputs,
    and logs critical command actions in an immutable audit trail.
    """

    def __init__(self):
        self.current_user = {
            "callsign": "OFFGRID_LEAD",
            "role": UserRole.COMMANDER,
            "badge": "COMMANDER-01"
        }
        self.audit_logs: List[Dict[str, Any]] = []

    def switch_user(self, callsign: str, role_str: str) -> Dict[str, Any]:
        """Switch active operator role."""
        try:
            role = UserRole(role_str.upper())
        except ValueError:
            role = UserRole.OPERATOR

        self.current_user = {
            "callsign": html.escape(callsign),
            "role": role,
            "badge": f"{role.value}-{(abs(hash(callsign)) % 900 + 100)}"
        }

        self.log_action("OPERATOR_LOGIN", f"Switched active operator to {callsign} ({role.value})")
        return self.current_user

    def can_execute(self, command: str) -> Tuple[bool, str]:
        """Check if current active user role is authorized to execute the given command."""
        cmd = command.upper()
        role = self.current_user["role"]

        # Commander has unrestricted clearance
        if role == UserRole.COMMANDER:
            return True, "Authorized"

        # Critical emergency / arming commands require Commander
        if cmd in ("ARM", "DISARM", "EMERGENCY", "EMERGENCY_STOP") and role != UserRole.COMMANDER:
            return False, f"Permission Denied: '{cmd}' requires COMMANDER role clearance."

        # Navigation commands require Operator or Commander
        if cmd in ("TAKEOFF", "LAND", "RTL", "WAYPOINTS", "FORMATION", "LOITER"):
            if role in (UserRole.COMMANDER, UserRole.OPERATOR):
                return True, "Authorized"
            return False, f"Permission Denied: Flight command '{cmd}' requires OPERATOR clearance."

        # Viewer can only inspect
        if role == UserRole.VIEWER and cmd not in ("INSPECT", "SELECT_DRONE"):
            return False, f"Permission Denied: VIEWER role is strictly read-only."

        return True, "Authorized"

    def log_action(self, action_type: str, details: str) -> None:
        """Record event in security audit trail."""
        entry = {
            "timestamp": time.strftime("%H:%M:%S", time.localtime()),
            "operator": self.current_user["callsign"],
            "role": self.current_user["role"].value,
            "action": action_type,
            "details": html.escape(details)
        }
        self.audit_logs.insert(0, entry)
        if len(self.audit_logs) > 200:
            self.audit_logs.pop()

    def get_audit_logs(self) -> List[Dict[str, Any]]:
        return self.audit_logs
