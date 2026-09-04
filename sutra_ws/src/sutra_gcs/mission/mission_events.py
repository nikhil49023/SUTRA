"""
Smart Horizon GCS — Mission Event Taxonomies
Subsystem: Mission Engine (Phase 3)
"""

from enum import Enum


class MissionEventNames(str, Enum):
    """
    Centralized mission lifecycle and waypoint editing events.
    """

    MISSION_CREATED = "mission.created"
    MISSION_UPDATED = "mission.updated"
    MISSION_DELETED = "mission.deleted"
    MISSION_WAYPOINT_ADDED = "mission.waypoint_added"
    MISSION_WAYPOINT_UPDATED = "mission.waypoint_updated"
    MISSION_WAYPOINT_MOVED = "mission.waypoint_moved"
    MISSION_WAYPOINT_DELETED = "mission.waypoint_deleted"
    MISSION_WAYPOINT_REORDERED = "mission.waypoint_reordered"
    MISSION_WAYPOINT_SELECTED = "mission.waypoint_selected"
    MISSION_ROUTE_UPDATED = "mission.route_updated"
    MISSION_VALIDATION_STARTED = "mission.validation_started"
    MISSION_VALIDATION_COMPLETED = "mission.validation_completed"
    MISSION_SAVED = "mission.saved"
    MISSION_LOADED = "mission.loaded"
    MISSION_CLEARED = "mission.cleared"
