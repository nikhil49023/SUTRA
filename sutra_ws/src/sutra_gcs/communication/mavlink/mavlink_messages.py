"""
Smart Horizon GCS — MAVLink v2 Message Types & Command Definitions
Subsystem: MAVLink Subsystem (Phase 8)
"""

from enum import IntEnum


class MAVType(IntEnum):
    GENERIC = 0
    FIXED_WING = 1
    QUADROTOR = 2
    HEXAROTOR = 13
    OCTOROTOR = 14


class MAVAutopilot(IntEnum):
    GENERIC = 0
    ARDUPILOTMEGA = 3
    PX4 = 12


class MAVModeFlag(IntEnum):
    CUSTOM_MODE_ENABLED = 1
    TEST_ENABLED = 2
    AUTO_ENABLED = 4
    GUIDED_ENABLED = 8
    STABILIZE_ENABLED = 16
    HIL_ENABLED = 32
    MANUAL_INPUT_ENABLED = 64
    SAFETY_ARMED = 128


class MAVCmd(IntEnum):
    NAV_WAYPOINT = 16
    NAV_LOITER_UNLIM = 17
    NAV_LOITER_TURNS = 18
    NAV_LOITER_TIME = 19
    NAV_RETURN_TO_LAUNCH = 20
    NAV_LAND = 21
    NAV_TAKEOFF = 22
    COMPONENT_ARM_DISARM = 400
    DO_SET_MODE = 176
