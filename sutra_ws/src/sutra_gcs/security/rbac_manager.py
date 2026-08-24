"""
Smart Horizon GCS — Role-Based Access Control (RBAC) Manager
Subsystem: Security & Governance (Phase 13)
"""

from enum import Enum
from typing import Dict, List, Set, Union
from .permission_manager import Permission, COMMAND_PERMISSION_MATRIX


class UserRole(str, Enum):
    VIEWER = "VIEWER"
    OPERATOR = "OPERATOR"
    MISSION_PLANNER = "MISSION_PLANNER"
    PILOT = "PILOT"
    COMMANDER = "COMMANDER"
    ADMIN = "ADMIN"


# Role Permission Map
ROLE_PERMISSIONS: Dict[UserRole, Set[Permission]] = {
    UserRole.VIEWER: {
        Permission.TELEMETRY_READ,
        Permission.FLEET_READ,
        Permission.MISSION_READ,
        Permission.GEOFENCE_READ,
        Permission.GIS_READ,
        Permission.AI_READ,
        Permission.FORMATION_READ,
        Permission.COMMUNICATION_READ,
    },
    UserRole.OPERATOR: {
        Permission.TELEMETRY_READ,
        Permission.FLEET_READ,
        Permission.MISSION_READ,
        Permission.MISSION_CREATE,
        Permission.MISSION_EDIT,
        Permission.MISSION_VALIDATE,
        Permission.GEOFENCE_READ,
        Permission.GEOFENCE_CREATE,
        Permission.GEOFENCE_EDIT,
        Permission.GIS_READ,
        Permission.GIS_ANALYZE,
        Permission.AI_READ,
        Permission.AI_COMMAND,
        Permission.FORMATION_READ,
        Permission.FORMATION_CHANGE,
        Permission.COMMUNICATION_READ,
    },
    UserRole.MISSION_PLANNER: {
        Permission.TELEMETRY_READ,
        Permission.FLEET_READ,
        Permission.MISSION_READ,
        Permission.MISSION_CREATE,
        Permission.MISSION_EDIT,
        Permission.MISSION_VALIDATE,
        Permission.GEOFENCE_READ,
        Permission.GEOFENCE_CREATE,
        Permission.GEOFENCE_EDIT,
        Permission.GEOFENCE_DELETE,
        Permission.GIS_READ,
        Permission.GIS_ANALYZE,
        Permission.AI_READ,
        Permission.FORMATION_READ,
        Permission.COMMUNICATION_READ,
    },
    UserRole.PILOT: {
        Permission.TELEMETRY_READ,
        Permission.FLEET_READ,
        Permission.MISSION_READ,
        Permission.MISSION_VALIDATE,
        Permission.MISSION_EXECUTE,
        Permission.DRONE_ARM,
        Permission.DRONE_DISARM,
        Permission.DRONE_TAKEOFF,
        Permission.DRONE_LAND,
        Permission.DRONE_RTL,
        Permission.DRONE_MODE_CHANGE,
        Permission.FORMATION_READ,
        Permission.FORMATION_CHANGE,
        Permission.GEOFENCE_READ,
        Permission.GIS_READ,
        Permission.AI_READ,
        Permission.COMMUNICATION_READ,
    },
    UserRole.COMMANDER: {
        Permission.TELEMETRY_READ,
        Permission.FLEET_READ,
        Permission.MISSION_READ,
        Permission.MISSION_CREATE,
        Permission.MISSION_EDIT,
        Permission.MISSION_VALIDATE,
        Permission.MISSION_EXECUTE,
        Permission.MISSION_ABORT,
        Permission.DRONE_ARM,
        Permission.DRONE_DISARM,
        Permission.DRONE_TAKEOFF,
        Permission.DRONE_LAND,
        Permission.DRONE_RTL,
        Permission.DRONE_MODE_CHANGE,
        Permission.FORMATION_READ,
        Permission.FORMATION_CHANGE,
        Permission.GEOFENCE_READ,
        Permission.GEOFENCE_CREATE,
        Permission.GEOFENCE_EDIT,
        Permission.GEOFENCE_DELETE,
        Permission.GIS_READ,
        Permission.GIS_ANALYZE,
        Permission.AI_READ,
        Permission.AI_COMMAND,
        Permission.COMMUNICATION_READ,
        Permission.COMMUNICATION_CONFIGURE,
        Permission.SECURITY_AUDIT,
    },
    UserRole.ADMIN: {p for p in Permission},  # Complete system access
}


class RBACManager:
    """
    Evaluates role-based permissions and explicit command authorizations.
    """

    def __init__(self, custom_role_permissions: Dict[UserRole, Set[Permission]] = None):
        self._role_permissions = custom_role_permissions or dict(ROLE_PERMISSIONS)

    def get_role_permissions(self, role: Union[UserRole, str]) -> Set[Permission]:
        """Returns all active permissions assigned to a given role."""
        if isinstance(role, str):
            try:
                role = UserRole(role.upper())
            except ValueError:
                return set()
        return self._role_permissions.get(role, set())

    def has_permission(self, role: Union[UserRole, str], permission: Union[Permission, str]) -> bool:
        """Checks if a role possesses the specified permission."""
        perms = self.get_role_permissions(role)
        if isinstance(permission, str):
            try:
                permission = Permission(permission)
            except ValueError:
                return False
        return permission in perms

    def get_required_permission_for_command(self, command_type: str) -> Permission:
        """Finds required permission for a command type. Defaults to SYSTEM_CONFIGURE if unknown."""
        return COMMAND_PERMISSION_MATRIX.get(command_type, Permission.SYSTEM_CONFIGURE)

    def is_command_allowed_for_role(self, role: Union[UserRole, str], command_type: str) -> bool:
        """Determines if a role is authorized to invoke a command."""
        req_perm = self.get_required_permission_for_command(command_type)
        return self.has_permission(role, req_perm)


rbac_manager = RBACManager()
