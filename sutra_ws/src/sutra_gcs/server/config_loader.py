"""
SMART HORIZON GCS — Production Configuration Loader & Subsystem Environment Manager
Subsystem: Deployment & Operations (Phase 15)
"""

import os
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional
import yaml

logger = logging.getLogger("sutra_gcs.config_loader")


@dataclass
class GCSProductionConfig:
    environment: str = "simulation"
    app_version: str = "1.0.0"
    protocol_version: str = "1.0"
    simulation_mode: bool = True
    hardware_mode: bool = False

    # Server
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    websocket_host: str = "0.0.0.0"
    websocket_port: int = 8765
    allowed_origins: List[str] = field(default_factory=lambda: ["*"])

    # Security
    security_mode: str = "STRICT"
    websocket_auth_required: bool = True
    session_timeout_sec: int = 28800
    rate_limit_rpm: int = 300
    replay_window_sec: int = 60
    token_secret: str = "DEFAULT_SIMULATION_TOKEN_SECRET"
    jwt_secret: str = "DEFAULT_SIMULATION_JWT_SECRET"

    # Logging
    log_level: str = "INFO"
    log_file: str = "development_audit_logs/gcs_sim.log"
    max_bytes: int = 20971520
    backup_count: int = 7
    audit_file: str = "development_audit_logs/audit_sim.log"

    # Telemetry
    telemetry_rate_hz: int = 10
    hud_refresh_rate_hz: int = 60
    simulation_rate_hz: int = 10
    drone_count: int = 4

    # AI
    ai_update_rate_hz: int = 2
    threat_threshold: float = 0.70
    battery_margin_pct: float = 25.0

    # MAVLink
    mavlink_connection: str = "udp:127.0.0.1:14550"
    mavlink_baud: int = 115200


_global_config: Optional[GCSProductionConfig] = None


def load_gcs_config(env_name: Optional[str] = None) -> GCSProductionConfig:
    global _global_config
    env = env_name or os.environ.get("GCS_ENV", os.environ.get("APP_ENV", "simulation")).lower()

    # Search config paths
    search_dirs = [
        Path.cwd() / "config",
        Path.cwd().parent / "config",
        Path(__file__).resolve().parents[4] / "config",
        Path("/etc/smart-horizon"),
    ]

    config_data: Dict[str, Any] = {}
    config_file_path = None

    for d in search_dirs:
        candidate = d / f"{env}.yaml"
        if candidate.exists():
            config_file_path = candidate
            try:
                with open(candidate, "r", encoding="utf-8") as f:
                    config_data = yaml.safe_load(f) or {}
                break
            except Exception as e:
                logger.warning(f"Failed to parse config from {candidate}: {e}")

    # Build dataclass instance
    srv = config_data.get("server", {})
    sec = config_data.get("security", {})
    log = config_data.get("logging", {})
    tel = config_data.get("telemetry", {})
    ai = config_data.get("ai", {})
    mav = config_data.get("mavlink", {})

    cfg = GCSProductionConfig(
        environment=env,
        app_version=config_data.get("app_version", "1.0.0"),
        protocol_version=config_data.get("protocol_version", "1.0"),
        simulation_mode=config_data.get("simulation_mode", env in ("development", "simulation")),
        hardware_mode=config_data.get("hardware_mode", env == "production"),
        backend_host=os.environ.get("GCS_BACKEND_HOST", srv.get("backend_host", "0.0.0.0")),
        backend_port=int(os.environ.get("GCS_BACKEND_PORT", srv.get("backend_port", 8000))),
        websocket_host=os.environ.get("GCS_WEBSOCKET_HOST", srv.get("websocket_host", "0.0.0.0")),
        websocket_port=int(os.environ.get("GCS_WEBSOCKET_PORT", srv.get("websocket_port", 8765))),
        allowed_origins=os.environ.get("GCS_ALLOWED_ORIGINS", "").split(",") if os.environ.get("GCS_ALLOWED_ORIGINS") else srv.get("allowed_origins", ["*"]),
        security_mode=sec.get("security_mode", "STRICT"),
        websocket_auth_required=sec.get("websocket_auth_required", True),
        session_timeout_sec=int(sec.get("session_timeout_sec", 28800)),
        rate_limit_rpm=int(sec.get("rate_limit_rpm", 300)),
        replay_window_sec=int(sec.get("replay_window_sec", 60)),
        token_secret=os.environ.get("GCS_TOKEN_SECRET", sec.get("token_secret", "DEFAULT_SIMULATION_TOKEN_SECRET")),
        jwt_secret=os.environ.get("GCS_JWT_SECRET", sec.get("jwt_secret", "DEFAULT_SIMULATION_JWT_SECRET")),
        log_level=os.environ.get("GCS_LOG_LEVEL", log.get("level", "INFO")),
        log_file=log.get("log_file", "development_audit_logs/gcs_sim.log"),
        max_bytes=int(log.get("max_bytes", 20971520)),
        backup_count=int(log.get("backup_count", 7)),
        audit_file=log.get("audit_file", "development_audit_logs/audit_sim.log"),
        telemetry_rate_hz=int(tel.get("telemetry_rate_hz", 10)),
        hud_refresh_rate_hz=int(tel.get("hud_refresh_rate_hz", 60)),
        simulation_rate_hz=int(tel.get("simulation_rate_hz", 10)),
        drone_count=int(tel.get("drone_count", 4)),
        ai_update_rate_hz=int(ai.get("update_rate_hz", 2)),
        threat_threshold=float(ai.get("threat_threshold", 0.70)),
        battery_margin_pct=float(ai.get("battery_margin_pct", 25.0)),
        mavlink_connection=os.environ.get("GCS_MAVLINK_URI", mav.get("connection_string", "udp:127.0.0.1:14550")),
        mavlink_baud=int(os.environ.get("GCS_MAVLINK_BAUD", mav.get("baud_rate", 115200))),
    )

    _global_config = cfg
    return cfg


def get_gcs_config() -> GCSProductionConfig:
    global _global_config
    if _global_config is None:
        _global_config = load_gcs_config()
    return _global_config
