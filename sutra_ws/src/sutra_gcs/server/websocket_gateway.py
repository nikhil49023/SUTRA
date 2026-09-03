"""
Smart Horizon GCS — Authoritative WebSocket Gateway & Multi-Drone Swarm Kinematics Engine
Subsystem: Server Gateway & Swarm Orchestrator (Phase 13 Hardened)
"""

import asyncio
import copy
import json
import logging
import math
import os
import sys
import threading
import time
import uuid
from dataclasses import asdict, is_dataclass
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

try:
    import websockets
except ImportError:
    websockets = None

# Ensure sutra_gcs is in path
current_dir = Path(__file__).resolve().parent
gcs_root = current_dir.parent
if str(gcs_root) not in sys.path:
    sys.path.insert(0, str(gcs_root))

from config.settings import get_settings
from services.audit_logger import get_audit_logger
from services.event_bus import Event, EventBus, EventNames, get_event_bus
from services.logging_service import get_logger, setup_logging
from state.application_state import ApplicationState, StateStore, get_state_store
from state.alert_state import Alert, AlertSeverity
from state.fleet_state import DroneState
from state.mission_state import MissionStateEnum
from mission.mission_manager import MissionManager, get_mission_manager
from mission.route_calculator import RouteCalculator
from fleet.fleet_manager import FleetManager, get_fleet_manager
from fleet.formation_engine import FormationEngine, get_formation_engine
from geofence.controller import GeofenceController, get_geofence_controller
from geofence.service import GeofenceService, get_geofence_service
from geofence.geometry import GeofenceGeometry
from geofence.models import GeometryType, ZoneType
from gis.gis_controller import GISController, get_gis_controller
from ai.ai_manager import AIManager, ai_manager
from communication.adapters.perception_subsystem_adapter import perception_adapter
from server.command_processor import CommandProcessor, CommandResult, get_command_processor

# Phase 13 Security Imports
from security import (
    auth_manager,
    session_manager,
    rbac_manager,
    input_validator,
    rate_limiter,
    security_audit_logger,
    SecurityEventType,
    SecretManager,
    get_security_config,
)
from backend.command_gateway import command_gateway

logger = logging.getLogger("sutra_gcs.server.gateway")


def serialize_obj(obj: Any) -> Any:
    """Recursively serializes dataclasses, enums, paths, and tuples to JSON types."""
    if obj is None:
        return None
    if isinstance(obj, (int, float, str, bool)):
        return obj
    if isinstance(obj, Enum):
        return obj.value
    if isinstance(obj, Path):
        return str(obj)
    if is_dataclass(obj) and not isinstance(obj, type):
        res = {}
        for k, v in asdict(obj).items():
            res[k] = serialize_obj(v)
        return res
    if isinstance(obj, dict):
        return {str(k): serialize_obj(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, set)):
        return [serialize_obj(item) for item in obj]
    return str(obj)


class WebSocketGatewayServer:
    """
    Authoritative backend gateway serving high-performance WebSockets to React GCS.
    Enforces Phase 13 Production Authentication, RBAC, Rate Limiting, and Command Authorization.
    """

    def __init__(self, host: str = "0.0.0.0", port: int = 8765):
        self.host = host
        self.port = port
        self.settings = get_settings()
        self.security_config = get_security_config()
        self.state_store = get_state_store()
        self.event_bus = get_event_bus()
        self.command_processor = get_command_processor()
        self.audit = get_audit_logger()

        self.mission_mgr = get_mission_manager()
        self.fleet_mgr = get_fleet_manager()
        self.formation_eng = get_formation_engine()
        self.geofence_ctrl = get_geofence_controller()
        self.geofence_svc = get_geofence_service()
        self.gis_ctrl = get_gis_controller()
        self.ai_mgr = ai_manager

        self.ws_clients: Set[Any] = set()
        self.client_sessions: Dict[Any, str] = {}  # websocket -> session_id
        self.client_connections: Dict[Any, str] = {} # websocket -> connection_id
        self.loop: Optional[asyncio.AbstractEventLoop] = None
        self.server_thread: Optional[threading.Thread] = None
        self.is_running = False

        # Monotonic Telemetry Sequence Numbers per Drone
        self._telemetry_sequence: Dict[str, int] = {}
        self._seq_lock = threading.Lock()

        # Simulation Kinematics
        self.sim_running = True
        self.sim_target_wp = 1
        self.sim_progress = 0.0
        self.sim_is_rtl = False

        # Geofence breach dedup: key=(drone_id:geofence_id:severity), value=last_alert_time
        self._geofence_alert_dedup: Dict[str, float] = {}
        self._geofence_alert_lock = threading.Lock()

        # Subsystem C AI Perception Ingestion Adapter
        self.perception_adapter = perception_adapter

        # Seed initial mission and geofences if empty
        self._seed_initial_mission()
        self._seed_initial_geofences()

        # Connect EventBus to broadcast
        self.event_bus.subscribe("*", self._on_event_bus_event)

    def _next_sequence(self, drone_id: str) -> int:
        with self._seq_lock:
            seq = self._telemetry_sequence.get(drone_id, 0) + 1
            self._telemetry_sequence[drone_id] = seq
            return seq

    def _seed_initial_mission(self):
        m = self.mission_mgr.get_mission()
        if not m.waypoints:
            self.mission_mgr.add_waypoint(37.7752, -122.4190, 25.0, 6.0)
            self.mission_mgr.add_waypoint(37.7765, -122.4175, 30.0, 8.0)
            self.mission_mgr.add_waypoint(37.7780, -122.4195, 35.0, 7.0)
            self.mission_mgr.add_waypoint(37.7760, -122.4215, 25.0, 5.0)

    def _seed_initial_geofences(self):
        current_gfs = self.geofence_svc.get_all_geofences()
        if not current_gfs:
            # 1. Downtown Heliport NFZ (Red Zone NO_FLY Polygon)
            self.geofence_svc.create_geofence(
                name="Downtown Heliport NFZ",
                zone_type=ZoneType.NO_FLY,
                geometry_type=GeometryType.POLYGON,
                coordinates=[
                    (37.7735, -122.4210),
                    (37.7735, -122.4170),
                    (37.7710, -122.4170),
                    (37.7710, -122.4210),
                ],
                altitude_min=0.0,
                altitude_max=120.0,
                priority=5,
                enabled=True,
                visible=True,
            )
            # 2. Harbor Perimeter Warning (Amber Warning Zone)
            self.geofence_svc.create_geofence(
                name="Harbor Perimeter Warning",
                zone_type=ZoneType.WARNING,
                geometry_type=GeometryType.POLYGON,
                coordinates=[
                    (37.7790, -122.4240),
                    (37.7810, -122.4180),
                    (37.7780, -122.4150),
                ],
                altitude_min=0.0,
                altitude_max=200.0,
                priority=3,
                enabled=True,
                visible=True,
            )

    def start(self):
        """Starts WebSocket server, perception adapter, and 10Hz kinematics loop."""
        self.is_running = True
        self.server_thread = threading.Thread(target=self._run_async_server, daemon=True)
        self.server_thread.start()

        # Start Subsystem C perception adapter
        self.perception_adapter.start(try_ros=True)

        # Start background 10Hz multi-drone simulation loop
        self.sim_thread = threading.Thread(target=self._run_simulation_loop, daemon=True)
        self.sim_thread.start()

        logger.info(f"🚀 Authoritative WebSocket Gateway Server listening on ws://{self.host}:{self.port}")

    def stop(self):
        self.is_running = False
        if self.perception_adapter:
            self.perception_adapter.stop()

    def _run_async_server(self):
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)

        async def _main():
            if websockets is None:
                logger.error("The 'websockets' package is required.")
                return
            async with websockets.serve(self._handle_client, self.host, self.port):
                await asyncio.Future()  # run forever

        try:
            self.loop.run_until_complete(_main())
        except Exception as e:
            logger.error(f"WebSocket server loop error: {e}")

    async def _handle_client(self, websocket, path=None):
        conn_id = f"conn_{uuid.uuid4().hex[:12]}"
        self.ws_clients.add(websocket)
        self.client_connections[websocket] = conn_id
        logger.info(f"📡 React Tactical GCS client connected! Active clients: {len(self.ws_clients)} (conn={conn_id})")

        # In development mode with optional auth, issue a default development session
        if self.security_config.is_development and not self.security_config.websocket_auth_required:
            default_user = auth_manager.get_user("commander")
            if default_user:
                dev_session = session_manager.create_session(
                    user_id=default_user.user_id,
                    username=default_user.username,
                    role=default_user.role,
                    connection_id=conn_id,
                )
                self.client_sessions[websocket] = dev_session.session_id

        # Send authoritative snapshot immediately on connect
        snapshot = self.get_full_state_snapshot()
        await websocket.send(json.dumps({
            "type": "STATE_SNAPSHOT",
            "state_version": self.state_store.state_version,
            "timestamp": time.time(),
            "payload": snapshot,
        }))

        try:
            async for raw_msg in websocket:
                # 1. Message size check
                valid_sz, sz_err = input_validator.validate_message_size(raw_msg)
                if not valid_sz:
                    logger.warning(f"Oversized message received on {conn_id}: {sz_err}")
                    await websocket.send(json.dumps({
                        "type": "COMMAND_ACK",
                        "status": "REJECTED",
                        "error": sz_err,
                        "state_version": self.state_store.state_version,
                        "timestamp": time.time(),
                    }))
                    continue

                try:
                    data = json.loads(raw_msg)
                    await self._process_incoming_command(websocket, data, conn_id)
                except Exception as err:
                    logger.error(f"Error handling GCS command: {err}", exc_info=True)
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            self.ws_clients.discard(websocket)
            session_manager.revoke_connection_sessions(conn_id)
            self.client_sessions.pop(websocket, None)
            self.client_connections.pop(websocket, None)
            logger.info(f"React GCS disconnected. Active clients: {len(self.ws_clients)} (conn={conn_id})")

    def get_full_state_snapshot(self) -> Dict[str, Any]:
        """Collects authoritative state from all backend managers with sanitized credentials."""
        state = self.state_store.get_state()
        app_dict = {
            "application_status": state.application_status,
            "backend_connected": True,
            "websocket_connected": True,
            "mavlink_connected": True,
            "simulation_mode": state.simulation_mode,
            "current_user": state.current_user,
            "app_version": state.app_version,
            "environment": self.security_config.environment,
            "auth_required": self.security_config.websocket_auth_required,
        }

        # Ensure secrets and tokens are redacted from snapshot
        return SecretManager.redact_data({
            "state_version": state.state_version,
            "timestamp": state.timestamp,
            "application": app_dict,
            "mission": serialize_obj(state.mission_state),
            "fleet": serialize_obj(state.fleet_state),
            "telemetry": serialize_obj(state.telemetry_state),
            "geofence": serialize_obj(state.geofence_state),
            "gis": serialize_obj(state.gis_state),
            "ai": serialize_obj(state.ai_state),
            "alerts": serialize_obj(state.alert_state.alerts),
            "communication": serialize_obj(state.communication_state),
        })

    async def _process_incoming_command(self, websocket: Any, data: Dict[str, Any], conn_id: str):
        cmd_type = data.get("command_type") or data.get("command") or data.get("type", "UNKNOWN")
        command_id = data.get("command_id") or str(uuid.uuid4())
        corr_id = data.get("correlation_id") or command_id
        payload = data.get("payload", {})
        session_id = data.get("session_id") or self.client_sessions.get(websocket)
        auth_token = data.get("token") or data.get("auth_token")
        timestamp = data.get("timestamp") or time.time()

        # ==========================================================
        # 1. AUTHENTICATION & SESSION COMMANDS
        # ==========================================================
        if cmd_type in ("auth.login", "AUTH_LOGIN"):
            username = str(payload.get("username", "")).strip()
            password = str(payload.get("password", ""))

            # Rate limit login attempts
            allowed, rate_err = rate_limiter.is_allowed("login", username or conn_id)
            if not allowed:
                await websocket.send(json.dumps({
                    "type": "AUTH_RESPONSE",
                    "status": "FAILED",
                    "error": rate_err,
                    "correlation_id": corr_id,
                    "timestamp": time.time(),
                }))
                return

            user, session, err = auth_manager.authenticate(username, password, connection_id=conn_id)
            if not user or not session:
                await websocket.send(json.dumps({
                    "type": "AUTH_RESPONSE",
                    "status": "FAILED",
                    "error": err or "Authentication failed",
                    "correlation_id": corr_id,
                    "timestamp": time.time(),
                }))
                return

            self.client_sessions[websocket] = session.session_id
            await websocket.send(json.dumps({
                "type": "AUTH_RESPONSE",
                "status": "SUCCESS",
                "user": user.to_safe_dict(),
                "session_id": session.session_id,
                "token": session.token,
                "expires_at": session.expires_at,
                "correlation_id": corr_id,
                "timestamp": time.time(),
            }))
            return

        if cmd_type in ("auth.resume_session", "AUTH_RESUME"):
            token = str(payload.get("token", "")).strip()
            user, session = auth_manager.resume_session(token, connection_id=conn_id)
            if not user or not session:
                await websocket.send(json.dumps({
                    "type": "AUTH_RESPONSE",
                    "status": "EXPIRED",
                    "error": "Session expired or invalid",
                    "correlation_id": corr_id,
                    "timestamp": time.time(),
                }))
                return

            self.client_sessions[websocket] = session.session_id
            await websocket.send(json.dumps({
                "type": "AUTH_RESPONSE",
                "status": "SUCCESS",
                "user": user.to_safe_dict(),
                "session_id": session.session_id,
                "token": session.token,
                "expires_at": session.expires_at,
                "correlation_id": corr_id,
                "timestamp": time.time(),
            }))
            return

        if cmd_type in ("auth.logout", "AUTH_LOGOUT"):
            if session_id:
                auth_manager.logout(session_id)
            self.client_sessions.pop(websocket, None)
            await websocket.send(json.dumps({
                "type": "AUTH_RESPONSE",
                "status": "LOGGED_OUT",
                "correlation_id": corr_id,
                "timestamp": time.time(),
            }))
            return

        # ==========================================================
        # 2. STATE SNAPSHOT & TELEMETRY QUERIES
        # ==========================================================
        if cmd_type == "REQUEST_STATE_SNAPSHOT":
            snapshot = self.get_full_state_snapshot()
            await websocket.send(json.dumps({
                "type": "STATE_SNAPSHOT",
                "state_version": self.state_store.state_version,
                "timestamp": time.time(),
                "correlation_id": corr_id,
                "payload": snapshot,
            }))
            return

        if cmd_type == "REQUEST_MISSION_SNAPSHOT":
            await websocket.send(json.dumps({
                "type": "MISSION_SNAPSHOT",
                "state_version": self.state_store.state_version,
                "timestamp": time.time(),
                "correlation_id": corr_id,
                "payload": serialize_obj(self.state_store.get_state().mission_state),
            }))
            return

        if cmd_type == "REQUEST_FLEET_SNAPSHOT":
            await websocket.send(json.dumps({
                "type": "FLEET_SNAPSHOT",
                "state_version": self.state_store.state_version,
                "timestamp": time.time(),
                "correlation_id": corr_id,
                "payload": serialize_obj(self.state_store.get_state().fleet_state),
            }))
            return

        if cmd_type == "REQUEST_GEOFENCE_SNAPSHOT":
            await websocket.send(json.dumps({
                "type": "GEOFENCE_SNAPSHOT",
                "state_version": self.state_store.state_version,
                "timestamp": time.time(),
                "correlation_id": corr_id,
                "payload": serialize_obj(self.state_store.get_state().geofence_state),
            }))
            return

        if cmd_type == "REQUEST_TELEMETRY_SNAPSHOT":
            await websocket.send(json.dumps({
                "type": "TELEMETRY_SNAPSHOT",
                "state_version": self.state_store.state_version,
                "timestamp": time.time(),
                "correlation_id": corr_id,
                "payload": serialize_obj(self.state_store.get_state().telemetry_state),
            }))
            return

        if cmd_type == "PING":
            await websocket.send(json.dumps({
                "type": "PONG",
                "event_type": "PONG",
                "state_version": self.state_store.state_version,
                "correlation_id": corr_id,
                "timestamp": time.time(),
            }))
            return

        # ==========================================================
        # 3. SECURITY AUDIT LOG QUERY (ADMIN ONLY)
        # ==========================================================
        if cmd_type in ("security.get_audit_log", "GET_AUDIT_LOG"):
            decision = command_authorizer.authorize(
                command_type=cmd_type,
                command_id=command_id,
                payload=payload,
                session_id=session_id,
                auth_token=auth_token,
                timestamp=timestamp,
            )
            if not decision.authorized:
                await websocket.send(json.dumps({
                    "type": "COMMAND_ACK",
                    "command_id": command_id,
                    "command_type": cmd_type,
                    "correlation_id": corr_id,
                    "status": "REJECTED",
                    "error": decision.reason,
                    "state_version": self.state_store.state_version,
                    "timestamp": time.time(),
                }))
                return

            records = security_audit_logger.query(
                user_id=payload.get("user_id"),
                username=payload.get("username"),
                command_type=payload.get("command"),
                authorization_result=payload.get("result"),
                severity=payload.get("severity"),
                search_text=payload.get("search"),
                limit=int(payload.get("limit", 100)),
            )
            await websocket.send(json.dumps({
                "type": "AUDIT_LOG_RESPONSE",
                "correlation_id": corr_id,
                "records": records,
                "timestamp": time.time(),
            }))
            return

        # ==========================================================
        # 4. OPERATIONAL COMMAND AUTHORIZATION & EXECUTION
        # ==========================================================
        def _execute_domain_action() -> Any:
            # Waypoints
            if cmd_type in ("mission.add_waypoint", "WAYPOINT_CREATE"):
                wp = self.mission_mgr.add_waypoint(
                    latitude=float(payload.get("latitude", 0.0)),
                    longitude=float(payload.get("longitude", 0.0)),
                    altitude=float(payload.get("altitude", 25.0)),
                    speed=float(payload.get("speed", 5.0)),
                )
                self.event_bus.emit(
                    "mission.waypoint_added",
                    payload={"waypoint": serialize_obj(wp)},
                    correlation_id=corr_id,
                    state_version=self.state_store.state_version,
                )
                return serialize_obj(wp)

            elif cmd_type in ("mission.update_waypoint", "WAYPOINT_MOVE", "WAYPOINT_MOVE_DRAG", "WAYPOINT_UPDATE"):
                wp_id = payload.get("waypoint_id") or payload.get("id")
                if not wp_id:
                    raise ValueError("waypoint_id is required for waypoint update")

                if "latitude" in payload and "longitude" in payload and len(payload) <= 4:
                    self.mission_mgr.move_waypoint(wp_id, float(payload["latitude"]), float(payload["longitude"]))
                else:
                    clean_kwargs = {k: v for k, v in payload.items() if k not in ("waypoint_id", "id", "version")}
                    self.mission_mgr.update_waypoint(wp_id, **clean_kwargs)

                wp = self.mission_mgr.get_waypoint(wp_id)
                self.event_bus.emit(
                    "mission.waypoint_updated",
                    payload={"waypoint": serialize_obj(wp)},
                    correlation_id=corr_id,
                    state_version=self.state_store.state_version,
                )
                return serialize_obj(wp)

            elif cmd_type in ("mission.delete_waypoint", "WAYPOINT_DELETE"):
                wp_id = payload.get("waypoint_id") or payload.get("id")
                self.mission_mgr.delete_waypoint(wp_id)
                self.event_bus.emit(
                    "mission.waypoint_deleted",
                    payload={"waypoint_id": wp_id},
                    correlation_id=corr_id,
                    state_version=self.state_store.state_version,
                )
                return {"waypoint_id": wp_id}

            elif cmd_type in ("mission.reorder_waypoint", "WAYPOINT_REORDER"):
                self.mission_mgr.reorder_waypoint(
                    int(payload.get("from_index", 1)),
                    int(payload.get("to_index", 1)),
                )
                self.event_bus.emit(
                    "mission.waypoints_updated",
                    payload={"waypoints": serialize_obj(self.mission_mgr.get_waypoints())},
                    correlation_id=corr_id,
                    state_version=self.state_store.state_version,
                )
                return {"reordered": True}

            elif cmd_type in ("mission.clear", "MISSION_CLEAR"):
                self.mission_mgr.clear_waypoints()
                self.event_bus.emit(
                    "mission.updated",
                    payload={"mission": serialize_obj(self.mission_mgr.get_mission())},
                    correlation_id=corr_id,
                    state_version=self.state_store.state_version,
                )
                return {"cleared": True}

            elif cmd_type in ("mission.validate", "MISSION_VALIDATE"):
                report = self.mission_mgr.validate_mission()
                if not report.valid:
                    raise ValueError(f"Validation failed: {', '.join(report.errors)}")
                return {"valid": report.valid, "errors": report.errors, "warnings": report.warnings, "info": report.info}

            # Mission Lifecycle & Dangerous Flight Operations
            elif cmd_type in ("mission.start", "MISSION_START"):
                self.sim_running = True
                self.sim_is_rtl = False
                self.sim_target_wp = 1
                self.event_bus.emit("mission.started", payload={"status": "MISSION"}, correlation_id=corr_id, state_version=self.state_store.state_version)
                return {"status": "MISSION"}

            elif cmd_type in ("mission.pause", "MISSION_PAUSE"):
                self.sim_running = False
                self.event_bus.emit("mission.paused", payload={"status": "HOLD"}, correlation_id=corr_id, state_version=self.state_store.state_version)
                return {"status": "HOLD"}

            elif cmd_type in ("mission.resume", "MISSION_RESUME"):
                self.sim_running = True
                self.event_bus.emit("mission.resumed", payload={"status": "MISSION"}, correlation_id=corr_id, state_version=self.state_store.state_version)
                return {"status": "MISSION"}

            elif cmd_type in ("mission.rtl", "EMERGENCY_RTL", "drone.rtl"):
                drone_id = payload.get("drone_id", "ALL")
                self.sim_is_rtl = True
                self.event_bus.emit("mission.rtl", payload={"drone_id": drone_id}, correlation_id=corr_id, state_version=self.state_store.state_version)
                self.event_bus.emit(
                    "alert.created",
                    payload={
                        "alert": {
                            "severity": "EMERGENCY",
                            "title": "EMERGENCY RTL",
                            "message": f"Emergency RTL commanded for {drone_id}.",
                            "source": "operator",
                        }
                    },
                    correlation_id=corr_id,
                    state_version=self.state_store.state_version,
                )
                return {"status": "RTL", "drone_id": drone_id}

            elif cmd_type in ("drone.arm", "DRONE_ARM"):
                drone_id = payload.get("drone_id", "drone_alpha")
                self.event_bus.emit("drone.armed", payload={"drone_id": drone_id}, correlation_id=corr_id, state_version=self.state_store.state_version)
                return {"drone_id": drone_id, "armed": True}

            elif cmd_type in ("drone.disarm", "DRONE_DISARM"):
                drone_id = payload.get("drone_id", "drone_alpha")
                self.event_bus.emit("drone.disarmed", payload={"drone_id": drone_id}, correlation_id=corr_id, state_version=self.state_store.state_version)
                return {"drone_id": drone_id, "armed": False}

            elif cmd_type in ("drone.takeoff", "DRONE_TAKEOFF"):
                drone_id = payload.get("drone_id", "drone_alpha")
                alt = float(payload.get("altitude", 10.0))
                self.event_bus.emit("drone.takeoff", payload={"drone_id": drone_id, "altitude": alt}, correlation_id=corr_id, state_version=self.state_store.state_version)
                return {"drone_id": drone_id, "altitude": alt, "status": "TAKEOFF"}

            elif cmd_type in ("drone.land", "DRONE_LAND"):
                drone_id = payload.get("drone_id", "drone_alpha")
                self.event_bus.emit("drone.land", payload={"drone_id": drone_id}, correlation_id=corr_id, state_version=self.state_store.state_version)
                return {"drone_id": drone_id, "status": "LANDING"}

            # Fleet & Formation
            elif cmd_type in ("fleet.set_formation", "FLEET_SET_FORMATION"):
                formation = payload.get("formation", "V_FORMATION")
                spacing = float(payload.get("spacing", 25.0))
                self.formation_eng.apply_formation(formation, spacing)
                return {"formation": formation, "spacing": spacing}

            elif cmd_type in ("fleet.set_spacing", "FLEET_SET_SPACING"):
                spacing = float(payload.get("spacing", 25.0))
                self.formation_eng.change_spacing(spacing)
                return {"spacing": spacing}

            elif cmd_type in ("fleet.set_leader", "FLEET_SET_LEADER"):
                leader_id = payload.get("leader_id", "drone_alpha")
                self.fleet_mgr.set_leader(leader_id)
                return {"leader_id": leader_id}

            elif cmd_type in ("fleet.add_drone", "FLEET_ADD_DRONE"):
                drone_id = payload.get("drone_id") or f"drone_{uuid.uuid4().hex[:6]}"
                callsign = payload.get("callsign") or f"UAV-{drone_id[-4:].upper()}"
                leader = self.fleet_mgr.get_leader()
                origin_lat = leader.latitude if leader else 37.774929
                origin_lon = leader.longitude if leader else -122.419416
                d = self.fleet_mgr.register_drone(
                    drone_id=drone_id,
                    callsign=callsign,
                    role="WINGMAN",
                    latitude=origin_lat,
                    longitude=origin_lon,
                    altitude=25.0,
                )
                return serialize_obj(d)

            elif cmd_type in ("fleet.remove_drone", "FLEET_REMOVE_DRONE"):
                drone_id = payload.get("drone_id")
                if not drone_id:
                    raise ValueError("drone_id is required")
                success = self.fleet_mgr.remove_drone(drone_id)
                if not success:
                    raise ValueError(f"Drone {drone_id} not found")
                return {"drone_id": drone_id}

            # Geofence
            elif cmd_type in ("geofence.select", "GEOFENCE_SELECT"):
                gf_id = payload.get("geofence_id")
                from dataclasses import replace as dc_replace
                self.state_store.update_state(
                    lambda s: dc_replace(s, geofence_state=dc_replace(s.geofence_state, selected_geofence_id=gf_id))
                )
                return {"selected_geofence_id": gf_id}

            elif cmd_type in ("geofence.start_drawing", "GEOFENCE_START_DRAWING"):
                self.geofence_ctrl.start_drawing(
                    zone_type=ZoneType(payload.get("zone_type", "NO_FLY")),
                    geometry_type=GeometryType(payload.get("geometry_type", "POLYGON")),
                )
                return {"drawing": True}

            elif cmd_type in ("geofence.add_point", "GEOFENCE_ADD_POINT"):
                self.geofence_ctrl.add_drawing_point(float(payload.get("latitude", 0)), float(payload.get("longitude", 0)))
                return {"point_added": True}

            elif cmd_type in ("geofence.finish_drawing", "GEOFENCE_FINISH_DRAWING", "geofence.create"):
                name = payload.get("name") or "New Geofence"
                zone_type_str = payload.get("zone_type", "NO_FLY")
                geometry_type_str = payload.get("geometry_type", "POLYGON")
                raw_coords = payload.get("coordinates") or payload.get("points") or []
                raw_center = payload.get("center")
                radius = float(payload.get("radius", 200.0))
                corridor_width = float(payload.get("corridor_width", 50.0))
                altitude_min = float(payload.get("altitude_min", 0.0))
                altitude_max = float(payload.get("altitude_max", 120.0))
                priority = int(payload.get("priority", 3))
                enabled = bool(payload.get("enabled", True))
                visible = bool(payload.get("visible", True))

                parsed = []
                for c in raw_coords:
                    if isinstance(c, (list, tuple)) and len(c) >= 2:
                        parsed.append((float(c[0]), float(c[1])))
                    elif isinstance(c, dict):
                        lat = float(c.get("lat", c.get("latitude", 0)))
                        lng = float(c.get("lng", c.get("longitude", 0)))
                        parsed.append((lat, lng))

                center = None
                if raw_center:
                    if isinstance(raw_center, (list, tuple)) and len(raw_center) >= 2:
                        center = (float(raw_center[0]), float(raw_center[1]))
                    elif isinstance(raw_center, dict):
                        center = (float(raw_center.get("lat", raw_center.get("latitude", 0))), float(raw_center.get("lng", raw_center.get("longitude", 0))))
                elif geometry_type_str == "CIRCLE" and parsed:
                    center = parsed[0]

                gf = None

                # Try controller path first if drawing mode is active
                current_gf_state = self.state_store.get_state().geofence_state
                if current_gf_state.drawing_mode:
                    if parsed:
                        from dataclasses import replace as dc_replace
                        self.state_store.update_state(
                            lambda s: dc_replace(
                                s,
                                geofence_state=dc_replace(
                                    s.geofence_state,
                                    drawing_points=parsed,
                                ),
                            )
                        )
                    gf = self.geofence_ctrl.finish_drawing(name)

                # Fallback / direct creation
                if gf is None:
                    gf = self.geofence_svc.create_geofence(
                        name=name,
                        zone_type=ZoneType(zone_type_str),
                        geometry_type=GeometryType(geometry_type_str),
                        coordinates=parsed,
                        center=center,
                        radius=radius,
                        corridor_width=corridor_width,
                        altitude_min=altitude_min,
                        altitude_max=altitude_max,
                        priority=priority,
                        enabled=enabled,
                        visible=visible,
                    )

                if gf:
                    self.event_bus.emit(
                        "geofence.created",
                        payload={"geofence": serialize_obj(gf)},
                        correlation_id=corr_id,
                        state_version=self.state_store.state_version,
                    )
                    return serialize_obj(gf)
                else:
                    raise ValueError("Geofence creation failed: invalid parameters")

            elif cmd_type in ("geofence.cancel_drawing", "GEOFENCE_CANCEL_DRAWING"):
                self.geofence_ctrl.cancel_drawing()
                return {"cancelled": True}

            elif cmd_type in ("geofence.update", "GEOFENCE_UPDATE"):
                gf_id = payload.get("geofence_id")
                updated_fields = {}
                if "name" in payload:
                    updated_fields["name"] = payload["name"]
                if "zone_type" in payload:
                    updated_fields["zone_type"] = ZoneType(payload["zone_type"])
                if "geometry_type" in payload:
                    updated_fields["geometry_type"] = GeometryType(payload["geometry_type"])
                if "altitude_min" in payload:
                    updated_fields["altitude_min"] = float(payload["altitude_min"])
                if "altitude_max" in payload:
                    updated_fields["altitude_max"] = float(payload["altitude_max"])
                if "priority" in payload:
                    updated_fields["priority"] = int(payload["priority"])
                if "radius" in payload:
                    updated_fields["radius"] = float(payload["radius"])
                if "corridor_width" in payload:
                    updated_fields["corridor_width"] = float(payload["corridor_width"])
                if "center" in payload and payload["center"]:
                    c = payload["center"]
                    if isinstance(c, (list, tuple)) and len(c) >= 2:
                        updated_fields["center"] = (float(c[0]), float(c[1]))
                if "visible" in payload:
                    updated_fields["visible"] = bool(payload["visible"])
                if "enabled" in payload:
                    updated_fields["enabled"] = bool(payload["enabled"])
                if "coordinates" in payload:
                    coords = []
                    for c in payload["coordinates"]:
                        if isinstance(c, (list, tuple)) and len(c) >= 2:
                            coords.append((float(c[0]), float(c[1])))
                        elif isinstance(c, dict):
                            coords.append((float(c.get("lat", 0)), float(c.get("lng", 0))))
                    updated_fields["coordinates"] = coords
                gf = self.geofence_svc.update_geofence(gf_id, **updated_fields)
                if gf:
                    self.event_bus.emit("geofence.updated", payload={"geofence": serialize_obj(gf), "geofence_id": gf_id}, correlation_id=corr_id, state_version=self.state_store.state_version)
                    return serialize_obj(gf)
                return {"geofence_id": gf_id}

            elif cmd_type in ("geofence.move_vertex", "GEOFENCE_MOVE_VERTEX"):
                gf = self.geofence_ctrl.move_vertex(
                    payload.get("geofence_id"),
                    int(payload.get("vertex_index", 0)),
                    float(payload.get("latitude", 0)),
                    float(payload.get("longitude", 0)),
                )
                if gf:
                    self.event_bus.emit("geofence.updated", payload={"geofence": serialize_obj(gf), "geofence_id": payload.get("geofence_id")}, correlation_id=corr_id, state_version=self.state_store.state_version)
                    return {"vertex_moved": True, "geofence": serialize_obj(gf)}
                return {"vertex_moved": False}

            elif cmd_type in ("geofence.delete", "GEOFENCE_DELETE"):
                gf_id = payload.get("geofence_id")
                self.geofence_svc.delete_geofence(gf_id)
                self.event_bus.emit("geofence.deleted", payload={"geofence_id": gf_id}, correlation_id=corr_id, state_version=self.state_store.state_version)
                return {"geofence_id": gf_id}

            # GIS
            elif cmd_type in ("gis.run_elevation", "GIS_RUN_ELEVATION"):
                return self.gis_ctrl.run_elevation_profile(
                    tuple(payload.get("start_point", (37.7749, -122.4194))),
                    tuple(payload.get("end_point", (37.779, -122.4155))),
                )

            elif cmd_type in ("gis.run_los", "GIS_RUN_LOS"):
                return self.gis_ctrl.run_los_analysis(
                    tuple(payload.get("obs_point", (37.7749, -122.4194))),
                    float(payload.get("obs_alt", 25.0)),
                    tuple(payload.get("target_point", (37.778, -122.4165))),
                    float(payload.get("target_alt", 35.0)),
                )

            elif cmd_type in ("gis.run_rf", "GIS_RUN_RF"):
                return self.gis_ctrl.run_rf_analysis(
                    tuple(payload.get("center_point", (37.7749, -122.4194))),
                    float(payload.get("radius_m", 2500.0)),
                )

            # AI
            elif cmd_type in ("ai.run_analysis", "AI_RUN_ANALYSIS"):
                return self.ai_mgr.run_full_analysis()

            elif cmd_type in ("ai.decision", "AI_DECISION"):
                return self.ai_mgr.handle_operator_decision(
                    payload.get("recommendation_id"),
                    bool(payload.get("accept", True)),
                )

            elif cmd_type in ("ai.ask", "AI_ASK"):
                reply = self.ai_mgr.ask_assistant(payload.get("query", ""))
                return {"reply": reply}

            elif cmd_type in ("ai.inject_target", "AI_INJECT_TARGET"):
                res = self.perception_adapter.inject_fused_target(payload.get("target") or payload)
                return {"injected_count": len(res), "targets": [t.target_id for t in res]}

            elif cmd_type in ("ai.clear_targets", "AI_CLEAR_TARGETS"):
                from dataclasses import replace
                self.state_store.update_state(
                    lambda s: replace(
                        s,
                        ai_state=replace(
                            s.ai_state,
                            tracked_targets=[],
                            last_update=time.time(),
                        ),
                    )
                )
                self.event_bus.emit("ai.state_updated", payload={"tracked_targets": []}, correlation_id=corr_id, state_version=self.state_store.state_version)
                return {"cleared": True}

            elif cmd_type in ("alert.acknowledge", "ALERT_ACKNOWLEDGE"):
                alert_id = payload.get("alert_id")
                from dataclasses import replace
                self.state_store.update_state(
                    lambda s: replace(s, alert_state=s.alert_state.acknowledge_alert(alert_id))
                )
                self.event_bus.emit("alert.acknowledged", payload={"alert_id": alert_id}, correlation_id=corr_id, state_version=self.state_store.state_version)
                return {"alert_id": alert_id}

            else:
                raise ValueError(f"Unknown operational command_type: {cmd_type}")

        # Execute through authoritative CommandGateway
        exec_status, exec_res, exec_err, state_ver = command_gateway.process_command(
            command_type=cmd_type,
            command_id=command_id,
            payload=payload,
            session_id=session_id,
            auth_token=auth_token,
            correlation_id=corr_id,
            timestamp=timestamp,
            connection_id=conn_id,
            executor_func=_execute_domain_action,
        )

        ack_envelope = {
            "type": "COMMAND_ACK",
            "command_id": command_id,
            "command_type": cmd_type,
            "correlation_id": corr_id,
            "status": exec_status,
            "result": exec_res,
            "error": exec_err,
            "state_version": state_ver,
            "timestamp": time.time(),
        }
        await websocket.send(json.dumps(ack_envelope))

    def _on_event_bus_event(self, event: Event):
        """Pushes EventBus notifications with structured envelopes to all WebSocket clients."""
        if not self.ws_clients or not self.loop:
            return

        current_ver = event.state_version or self.state_store.state_version
        msg = json.dumps({
            "type": "EVENT",
            "event_id": event.event_id,
            "event_type": event.event_name,
            "state_version": current_ver,
            "timestamp": event.timestamp,
            "correlation_id": event.correlation_id,
            "payload": serialize_obj(event.payload),
        })

        asyncio.run_coroutine_threadsafe(self._async_broadcast(msg), self.loop)

    async def _async_broadcast(self, msg: str):
        if not self.ws_clients:
            return
        dead = []
        for client in self.ws_clients:
            try:
                await client.send(msg)
            except Exception:
                dead.append(client)
        for d in dead:
            self.ws_clients.discard(d)

    def _run_simulation_loop_tick(self, dt: float = 0.1):
        """Executes a single simulation tick updating all drone kinematics."""
        state = self.state_store.get_state()
        wps = state.mission_state.waypoints
        fleet = state.fleet_state
        leader = fleet.get_leader()

        if not leader:
            return

        leader_lat = leader.latitude
        leader_lon = leader.longitude
        leader_alt = leader.altitude
        leader_hdg = leader.heading
        leader_spd = leader.speed
        leader_bat = max(5.0, leader.battery - 0.015)

        # 1. Update Leader Waypoint Trajectory Navigation
        if self.sim_running and wps:
            if self.sim_is_rtl:
                t_lat = state.mission_state.home_latitude
                t_lon = state.mission_state.home_longitude
                t_alt = 20.0
            elif 1 <= self.sim_target_wp <= len(wps):
                target_wp = wps[self.sim_target_wp - 1]
                t_lat = target_wp.latitude
                t_lon = target_wp.longitude
                t_alt = target_wp.altitude
            else:
                t_lat = wps[0].latitude
                t_lon = wps[0].longitude
                t_alt = wps[0].altitude

            dist_m = RouteCalculator.calculate_distance(leader_lat, leader_lon, t_lat, t_lon)
            bearing = RouteCalculator.calculate_bearing(leader_lat, leader_lon, t_lat, t_lon)

            if dist_m < 3.0:
                if self.sim_target_wp < len(wps):
                    self.sim_target_wp += 1
                    self.event_bus.emit(
                        "mission.waypoint_reached",
                        payload={"waypoint_index": self.sim_target_wp - 1, "drone_id": leader.drone_id},
                        state_version=self.state_store.state_version,
                    )
                else:
                    self.sim_target_wp = 1
            else:
                step_m = min(dist_m, 6.0 * dt)
                ratio = step_m / dist_m if dist_m > 0 else 1.0
                leader_lat += (t_lat - leader_lat) * ratio
                leader_lon += (t_lon - leader_lon) * ratio
                leader_alt += (t_alt - leader_alt) * min(1.0, 2.0 * dt)
                leader_hdg = bearing
                leader_spd = 6.0

        # 2. Recalculate Formation Targets for ALL Drones based on updated Leader geodetics
        all_drone_ids = list(fleet.drones.keys())
        from fleet.formation_calculator import FormationCalculator
        formation_targets = FormationCalculator.calculate_targets(
            leader_id=leader.drone_id,
            leader_lat=leader_lat,
            leader_lon=leader_lon,
            leader_alt=leader_alt,
            leader_heading=leader_hdg,
            drone_ids=all_drone_ids,
            formation_type=fleet.formation,
            spacing_m=fleet.spacing,
            formation_heading=None if fleet.follow_leader_heading else fleet.formation_heading,
        )

        # 3. Compute Movement & Kinematics for EVERY Drone in the Fleet
        from dataclasses import replace
        updated_drones: Dict[str, DroneState] = {}

        for d_id, drone in fleet.drones.items():
            target = formation_targets.get(d_id)
            target_lat = target.latitude if target else drone.latitude
            target_lon = target.longitude if target else drone.longitude
            target_alt = target.altitude if target else drone.altitude

            if drone.is_leader:
                new_lat = leader_lat
                new_lon = leader_lon
                new_alt = leader_alt
                new_hdg = leader_hdg
                new_spd = leader_spd
                new_bat = leader_bat
            else:
                # Move follower toward its target position in formation
                dist_to_target = RouteCalculator.calculate_distance(
                    drone.latitude, drone.longitude, target_lat, target_lon
                )
                bearing_to_target = RouteCalculator.calculate_bearing(
                    drone.latitude, drone.longitude, target_lat, target_lon
                )

                if dist_to_target > 0.4:
                    f_max_speed = max(7.0, leader_spd * 1.3)
                    step_m = min(dist_to_target, f_max_speed * dt)
                    ratio = step_m / dist_to_target if dist_to_target > 0 else 1.0

                    new_lat = drone.latitude + (target_lat - drone.latitude) * ratio
                    new_lon = drone.longitude + (target_lon - drone.longitude) * ratio
                    new_alt = drone.altitude + (target_alt - drone.altitude) * min(1.0, 2.5 * dt)
                    new_hdg = bearing_to_target if dist_to_target > 1.0 else leader_hdg
                    new_spd = min(12.0, max(2.0, step_m / dt))
                else:
                    new_lat = target_lat
                    new_lon = target_lon
                    new_alt = target_alt
                    new_hdg = leader_hdg
                    new_spd = leader_spd

                new_bat = max(5.0, drone.battery - 0.015)

            updated_drone = replace(
                drone,
                latitude=new_lat,
                longitude=new_lon,
                altitude=new_alt,
                heading=new_hdg,
                speed=new_spd,
                battery=new_bat,
                flight_mode="RTL" if self.sim_is_rtl else ("MISSION" if self.sim_running else "HOLD"),
                target_latitude=target_lat,
                target_longitude=target_lon,
                target_altitude=target_alt,
                target_heading=target.heading if target else new_hdg,
                formation_index=target.formation_index if target else drone.formation_index,
                offset_x=target.offset_x if target else drone.offset_x,
                offset_y=target.offset_y if target else drone.offset_y,
            )
            updated_drones[d_id] = updated_drone

        # 4. Update Entire FleetState in StateStore
        self.state_store.update_state(
            lambda s: replace(
                s,
                fleet_state=replace(s.fleet_state, drones=updated_drones),
                telemetry_state=replace(
                    s.telemetry_state,
                    drone_id=leader.drone_id,
                    latitude=leader_lat,
                    longitude=leader_lon,
                    altitude_agl=leader_alt,
                    heading=leader_hdg,
                    ground_speed=leader_spd,
                    battery_percent=leader_bat,
                    flight_mode="RTL" if self.sim_is_rtl else ("MISSION" if self.sim_running else "HOLD"),
                ),
            )
        )

        # 5. Broadcast Position Updates & Telemetry for EVERY Active Drone
        current_fleet = self.state_store.get_state().fleet_state
        for d_id, drone in updated_drones.items():
            seq_num = self._next_sequence(d_id)

            # A. High-Frequency Telemetry Packet
            self.event_bus.emit(
                "telemetry.updated",
                payload={
                    "drone_id": drone.drone_id,
                    "sequence_number": seq_num,
                    "timestamp": time.time(),
                    "latitude": drone.latitude,
                    "longitude": drone.longitude,
                    "altitude_agl": drone.altitude,
                    "altitude_msl": drone.altitude + 10.0,
                    "heading": drone.heading,
                    "pitch": drone.pitch,
                    "roll": drone.roll,
                    "yaw": drone.heading,
                    "ground_speed": drone.speed,
                    "vertical_speed": 0.0,
                    "battery_percent": drone.battery,
                    "battery_voltage": 24.0 + (drone.battery / 100.0) * 1.2,
                    "battery_current": 12.5,
                    "temperature": 27.5,
                    "satellites": 18,
                    "hdop": 0.8,
                    "gps_fix": 3,
                    "rssi": -55.0,
                    "latency_ms": 12.0,
                    "flight_mode": drone.flight_mode,
                    "is_leader": drone.is_leader,
                    "formation": current_fleet.formation,
                    "formation_role": drone.role,
                    "leader_id": current_fleet.leader_id,
                    "target_position": {
                        "latitude": drone.target_latitude or drone.latitude,
                        "longitude": drone.target_longitude or drone.longitude,
                        "altitude": drone.target_altitude or drone.altitude,
                    },
                    "formation_status": "LOCKED",
                },
                source="gateway_sim",
                state_version=self.state_store.state_version,
            )

            # B. Authoritative Position Event
            self.event_bus.emit(
                "fleet.drone_position_updated",
                payload={
                    "drone_id": drone.drone_id,
                    "timestamp": time.time(),
                    "position": {
                        "latitude": drone.latitude,
                        "longitude": drone.longitude,
                        "altitude": drone.altitude,
                    },
                    "heading": drone.heading,
                    "speed": drone.speed,
                    "battery": drone.battery,
                    "flight_mode": drone.flight_mode,
                    "formation": current_fleet.formation,
                    "formation_role": drone.role,
                    "target_position": {
                        "latitude": drone.target_latitude or drone.latitude,
                        "longitude": drone.target_longitude or drone.longitude,
                        "altitude": drone.target_altitude or drone.altitude,
                    },
                },
                source="gateway_sim",
                state_version=self.state_store.state_version,
            )

    def _run_simulation_loop(self):
        """10Hz background loop for multi-drone kinematics."""
        t_last = time.time()
        while self.is_running:
            time.sleep(0.1)
            t_now = time.time()
            dt = t_now - t_last
            t_last = t_now
            try:
                self._run_simulation_loop_tick(dt)
            except Exception as e:
                logger.error(f"Error in simulation loop tick: {e}", exc_info=True)


# Global gateway server instance
gateway_server = WebSocketGatewayServer()

if __name__ == "__main__":
    setup_logging("INFO")
    gateway_server.start()
    print("=" * 60)
    print("🚁 SMART HORIZON GCS — BACKEND WEBSOCKET SERVER ACTIVE")
    print(f"📡 WebSocket Endpoint: ws://127.0.0.1:8765")
    print("=" * 60)
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        gateway_server.stop()
