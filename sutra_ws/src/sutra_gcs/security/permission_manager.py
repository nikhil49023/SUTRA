"""
Smart Horizon GCS — Permission Definitions & Matrix
Subsystem: Security & Governance (Phase 13)
"""

from enum import Enum
from typing import Dict, List, Set


class Permission(str, Enum):
    # Telemetry & Monitoring
    TELEMETRY_READ = "telemetry.read"
    FLEET_READ = "fleet.read"
    COMMUNICATION_READ = "communication.read"

    # Mission Planning & Lifecycle
    MISSION_READ = "mission.read"
    MISSION_CREATE = "mission.create"
    MISSION_EDIT = "mission.edit"
    MISSION_VALIDATE = "mission.validate"
    MISSION_EXECUTE = "mission.execute"
    MISSION_ABORT = "mission.abort"

    # Geofence Operations
    GEOFENCE_READ = "geofence.read"
    GEOFENCE_CREATE = "geofence.create"
    GEOFENCE_EDIT = "geofence.edit"
    GEOFENCE_DELETE = "geofence.delete"

    # GIS Analysis
    GIS_READ = "gis.read"
    GIS_ANALYZE = "gis.analyze"

    # AI Operations
    AI_READ = "ai.read"
    AI_COMMAND = "ai.command"

    # Flight & Vehicle Control
    DRONE_ARM = "drone.arm"
    DRONE_DISARM = "drone.disarm"
    DRONE_TAKEOFF = "drone.takeoff"
    DRONE_LAND = "drone.land"
    DRONE_RTL = "drone.rtl"
    DRONE_MODE_CHANGE = "drone.mode_change"

    # Swarm Formations
    FORMATION_READ = "formation.read"
    FORMATION_CHANGE = "formation.change"

    # System & Security Administration
    COMMUNICATION_CONFIGURE = "communication.configure"
    SYSTEM_CONFIGURE = "system.configure"
    SECURITY_AUDIT = "security.audit"


# Centralized Drone Command Permission Mapping
COMMAND_PERMISSION_MATRIX: Dict[str, Permission] = {
    # Waypoints & Mission
    "mission.add_waypoint": Permission.MISSION_CREATE,
    "WAYPOINT_CREATE": Permission.MISSION_CREATE,
    "mission.update_waypoint": Permission.MISSION_EDIT,
    "WAYPOINT_MOVE": Permission.MISSION_EDIT,
    "WAYPOINT_MOVE_DRAG": Permission.MISSION_EDIT,
    "WAYPOINT_UPDATE": Permission.MISSION_EDIT,
    "mission.delete_waypoint": Permission.MISSION_EDIT,
    "WAYPOINT_DELETE": Permission.MISSION_EDIT,
    "mission.reorder_waypoint": Permission.MISSION_EDIT,
    "WAYPOINT_REORDER": Permission.MISSION_EDIT,
    "mission.clear": Permission.MISSION_EDIT,
    "MISSION_CLEAR": Permission.MISSION_EDIT,
    "mission.validate": Permission.MISSION_VALIDATE,
    "MISSION_VALIDATE": Permission.MISSION_VALIDATE,
    "mission.start": Permission.MISSION_EXECUTE,
    "MISSION_START": Permission.MISSION_EXECUTE,
    "mission.pause": Permission.MISSION_EXECUTE,
    "MISSION_PAUSE": Permission.MISSION_EXECUTE,
    "mission.resume": Permission.MISSION_EXECUTE,
    "MISSION_RESUME": Permission.MISSION_EXECUTE,
    "mission.rtl": Permission.DRONE_RTL,
    "EMERGENCY_RTL": Permission.DRONE_RTL,
    "mission.abort": Permission.MISSION_ABORT,
    "MISSION_ABORT": Permission.MISSION_ABORT,

    # Flight Controls
    "drone.arm": Permission.DRONE_ARM,
    "DRONE_ARM": Permission.DRONE_ARM,
    "drone.disarm": Permission.DRONE_DISARM,
    "DRONE_DISARM": Permission.DRONE_DISARM,
    "drone.takeoff": Permission.DRONE_TAKEOFF,
    "DRONE_TAKEOFF": Permission.DRONE_TAKEOFF,
    "drone.land": Permission.DRONE_LAND,
    "DRONE_LAND": Permission.DRONE_LAND,
    "drone.mode_change": Permission.DRONE_MODE_CHANGE,
    "DRONE_MODE_CHANGE": Permission.DRONE_MODE_CHANGE,
    "drone.emergency_stop": Permission.DRONE_DISARM,
    "EMERGENCY_STOP": Permission.DRONE_DISARM,

    # Swarm & Fleet
    "fleet.set_formation": Permission.FORMATION_CHANGE,
    "FLEET_SET_FORMATION": Permission.FORMATION_CHANGE,
    "fleet.set_spacing": Permission.FORMATION_CHANGE,
    "FLEET_SET_SPACING": Permission.FORMATION_CHANGE,
    "fleet.set_leader": Permission.FORMATION_CHANGE,
    "FLEET_SET_LEADER": Permission.FORMATION_CHANGE,
    "fleet.add_drone": Permission.FORMATION_CHANGE,
    "FLEET_ADD_DRONE": Permission.FORMATION_CHANGE,
    "fleet.remove_drone": Permission.FORMATION_CHANGE,
    "FLEET_REMOVE_DRONE": Permission.FORMATION_CHANGE,
    "fleet.select_drone": Permission.FLEET_READ,
    "FLEET_SELECT_DRONE": Permission.FLEET_READ,

    # Geofences
    "geofence.start_drawing": Permission.GEOFENCE_CREATE,
    "GEOFENCE_START_DRAWING": Permission.GEOFENCE_CREATE,
    "geofence.add_point": Permission.GEOFENCE_CREATE,
    "GEOFENCE_ADD_POINT": Permission.GEOFENCE_CREATE,
    "geofence.finish_drawing": Permission.GEOFENCE_CREATE,
    "GEOFENCE_FINISH_DRAWING": Permission.GEOFENCE_CREATE,
    "geofence.create": Permission.GEOFENCE_CREATE,
    "geofence.cancel_drawing": Permission.GEOFENCE_CREATE,
    "GEOFENCE_CANCEL_DRAWING": Permission.GEOFENCE_CREATE,
    "geofence.move_vertex": Permission.GEOFENCE_EDIT,
    "GEOFENCE_MOVE_VERTEX": Permission.GEOFENCE_EDIT,
    "geofence.delete": Permission.GEOFENCE_DELETE,
    "GEOFENCE_DELETE": Permission.GEOFENCE_DELETE,

    # GIS
    "gis.run_elevation": Permission.GIS_ANALYZE,
    "GIS_RUN_ELEVATION": Permission.GIS_ANALYZE,
    "gis.run_los": Permission.GIS_ANALYZE,
    "GIS_RUN_LOS": Permission.GIS_ANALYZE,
    "gis.run_rf": Permission.GIS_ANALYZE,
    "GIS_RUN_RF": Permission.GIS_ANALYZE,

    # AI
    "ai.run_analysis": Permission.AI_READ,
    "AI_RUN_ANALYSIS": Permission.AI_READ,
    "ai.decision": Permission.AI_COMMAND,
    "AI_DECISION": Permission.AI_COMMAND,
    "ai.ask": Permission.AI_READ,
    "AI_ASK": Permission.AI_READ,

    # Alerts & System
    "alert.acknowledge": Permission.TELEMETRY_READ,
    "ALERT_ACKNOWLEDGE": Permission.TELEMETRY_READ,
    "system.configure": Permission.SYSTEM_CONFIGURE,
    "SYSTEM_CONFIGURE": Permission.SYSTEM_CONFIGURE,
    "security.get_audit_log": Permission.SECURITY_AUDIT,
}
