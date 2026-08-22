"""
Smart Horizon GCS — State to HUD Normalization Data Adapter
Subsystem: HUD / PFD Subsystem (Phase 9)
"""

import time
from typing import Optional

from state.application_state import ApplicationState
from state.communication_state import ConnectionState
from .models import GeofenceHUDStatus, GPSFixType, HUDModel


class HUDDataAdapter:
    """
    Transforms multi-subsystem ApplicationState into a single, normalized, immutable HUDModel.
    Decouples UI rendering completely from backend communication and mission engines.
    """

    @classmethod
    def adapt(
        cls,
        state: ApplicationState,
        selected_drone_id: str = "drone_alpha",
        stale_threshold_sec: float = 2.0,
        lost_threshold_sec: float = 5.0,
    ) -> HUDModel:
        fleet = state.fleet_state
        drone = fleet.get_drone(selected_drone_id)

        # Fallback to leader or first available drone if selected_drone_id not found
        if not drone:
            drone = fleet.get_leader() or (fleet.get_all_drones()[0] if fleet.get_all_drones() else None)

        now = time.time()
        telem = state.telemetry_state
        comm = state.communication_state
        mission = state.mission_state
        geofence = state.geofence_state

        # Primary Telemetry Metrics
        if drone:
            d_id = drone.drone_id
            callsign = drone.callsign
            lat = drone.latitude
            lon = drone.longitude
            alt_agl = drone.altitude
            alt_msl = drone.altitude + 40.0  # Approx terrain elevation base
            spd = drone.speed
            hdg = drone.heading
            pitch = drone.pitch
            roll = drone.roll
            bat = drone.battery
            v_spd = drone.velocity[2] if hasattr(drone, "velocity") and len(drone.velocity) >= 3 else 0.0
            flight_mode = drone.flight_mode
            f_role = drone.role
        else:
            d_id = "drone_alpha"
            callsign = "ALPHA (UNCONNECTED)"
            lat = telem.latitude
            lon = telem.longitude
            alt_agl = telem.altitude_agl
            alt_msl = telem.altitude_msl
            spd = telem.ground_speed
            hdg = telem.heading
            pitch = telem.pitch
            roll = telem.roll
            bat = getattr(telem, "battery_percent", getattr(telem, "battery_level", 100.0))
            v_spd = telem.vertical_speed
            flight_mode = telem.flight_mode
            f_role = "LEADER"

        # Data Age & Staleness Audit
        t_stamp = getattr(telem, "timestamp", getattr(telem, "last_update_time", time.time()))
        data_age = max(0.0, now - t_stamp) if t_stamp > 0 else 0.0
        is_stale = data_age > stale_threshold_sec and comm.connection_mode != "SIMULATION"
        is_link_lost = (
            (data_age > lost_threshold_sec and comm.connection_mode != "SIMULATION")
            or comm.websocket_state in (ConnectionState.DISCONNECTED, ConnectionState.ERROR, ConnectionState.TIMEOUT)
        )

        # GPS Fix
        fix_val = str(getattr(telem, "gps_fix", "3D"))
        gps_fix = GPSFixType.FIX_3D if "3" in fix_val else (GPSFixType.FIX_2D if "2" in fix_val else GPSFixType.NO_FIX)

        # Geofence Status
        alert_list = getattr(state.alert_state, "alerts", []) if hasattr(state, "alert_state") else []
        has_breach_alert = any("GEOFENCE" in a.title.upper() or "NO-FLY" in a.title.upper() for a in alert_list)
        if has_breach_alert:
            geo_status = GeofenceHUDStatus.BREACH
        elif geofence and getattr(geofence, "geofences", []):
            geo_status = GeofenceHUDStatus.CLEAR
        else:
            geo_status = GeofenceHUDStatus.CLEAR

        # Mission Progress
        cur_wp = getattr(mission, "current_waypoint_index", 1)
        wps = getattr(mission, "waypoints", [])
        tot_wp = len(wps)
        prog = (cur_wp / tot_wp * 100.0) if tot_wp > 0 else 0.0
        dist_wp = getattr(mission, "active_segment_distance", 0.0)
        tot_dist = getattr(mission, "total_distance", 0.0)
        dist_rem = tot_dist - (cur_wp * (tot_dist / max(1, tot_wp)))
        eta = (dist_rem / spd) if spd > 1.0 else 0.0

        return HUDModel(
            drone_id=d_id,
            callsign=callsign,
            latitude=lat,
            longitude=lon,
            altitude_msl=alt_msl,
            altitude_agl=alt_agl,
            ground_speed=spd,
            air_speed=spd * 1.05 if spd > 0 else None,
            vertical_speed=v_spd,
            heading=hdg,
            pitch=pitch,
            roll=roll,
            battery_percent=bat,
            battery_voltage=15.2 + (bat / 100.0) * 1.6,
            rth_reserve_percent=25.0,
            gps_fix=gps_fix,
            satellites=telem.satellites,
            hdop=telem.hdop,
            link_quality="EXCELLENT" if not is_stale else "DEGRADED",
            latency_ms=comm.latency_ms,
            ws_state=comm.websocket_state.value,
            mavlink_state=comm.mavlink_state,
            heartbeat_ok=comm.heartbeat_ok,
            flight_mode=flight_mode,
            mission_name=mission.mission_name,
            mission_state=mission.state.value,
            current_waypoint=cur_wp,
            total_waypoints=tot_wp,
            distance_to_waypoint=dist_wp,
            distance_remaining=max(0.0, dist_rem),
            mission_progress=prog,
            eta_seconds=eta,
            geofence_status=geo_status,
            formation=str(getattr(fleet, "formation", "V_FORMATION")),
            formation_role=f_role,
            swarm_count=len(fleet.get_all_drones()),
            risk_level="LOW" if not has_breach_alert else "CRITICAL",
            is_stale=is_stale,
            is_link_lost=is_link_lost,
            data_age_sec=data_age,
            timestamp=now,
        )
