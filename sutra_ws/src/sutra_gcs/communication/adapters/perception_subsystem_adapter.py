"""
Smart Horizon GCS — Subsystem C (AI Edge Perception) Communication Adapter
Subsystem: Communication / Adapters (Subsystem C Integration)

Connects Subsystem C (sutra_perception) to the authoritative GCS StateStore and EventBus.
Enforces:
1. Strict telemetry and detection payload validation (NaN, bounds, confidence).
2. Centralized Drone ID normalization (uav_alpha -> alpha).
3. Authoritative ByteTrack ID synchronization without state duplication.
4. Non-blocking ROS 2 subscription with resilient fallback to Python direct test mode.
5. Target lifecycle management (DETECTED -> TRACKED -> UPDATED -> LOST).
6. Alert deduplication & cooldown.
7. Perception status metrics (FPS, Latency, Connection State).
"""

import json
import logging
import math
import threading
import time
import uuid
from dataclasses import asdict, replace
from typing import Any, Dict, List, Optional, Set, Tuple

from services.event_bus import EventBus, get_event_bus
from services.logging_service import get_logger
from state.ai_state import AIAnalysisStatus, TrackedTarget
from state.alert_state import Alert, AlertSeverity
from state.application_state import StateStore, get_state_store

logger = get_logger("perception_adapter")

# Centralized Drone ID Normalization Map
DRONE_ID_MAP: Dict[str, str] = {
    "uav_alpha": "alpha",
    "uav_beta": "bravo",
    "uav_gamma": "charlie",
    "uav_delta": "delta",
    "uav_epsilon": "epsilon",
    "drone_alpha": "alpha",
    "drone_beta": "bravo",
    "drone_charlie": "charlie",
    "drone_delta": "delta",
    "drone_epsilon": "epsilon",
    "alpha": "alpha",
    "bravo": "bravo",
    "charlie": "charlie",
    "delta": "delta",
    "epsilon": "epsilon",
}


def normalize_drone_id(raw_id: Any) -> str:
    """
    Normalizes drone identifiers from ROS 2 naming (uav_alpha) to canonical GCS IDs (alpha).
    Logs warnings for unknown drone identifiers.
    """
    if raw_id is None:
        return "alpha"

    s_id = str(raw_id).strip().lower()
    if s_id in DRONE_ID_MAP:
        return DRONE_ID_MAP[s_id]

    logger.warning(f"Unknown drone ID received from perception: '{raw_id}'. Preserving identifier.")
    return s_id


def validate_target_payload(target_data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """
    Validates incoming detection payload for numerical integrity and realistic bounds.
    Returns (is_valid, error_reason).
    """
    if not isinstance(target_data, dict):
        return False, "Target payload must be a dictionary"

    # 1. Target ID Check
    t_id = target_data.get("id") if "id" in target_data else target_data.get("target_id")
    if t_id is None or (isinstance(t_id, str) and not t_id.strip()):
        return False, "Missing or empty target ID"

    # 2. Latitude Validation (-90.0 to +90.0)
    raw_lat = target_data.get("lat") if "lat" in target_data else target_data.get("latitude")
    if raw_lat is None:
        return False, "Missing latitude coordinate"
    try:
        lat = float(raw_lat)
        if math.isnan(lat) or math.isinf(lat) or not (-90.0 <= lat <= 90.0):
            return False, f"Latitude out of bounds [-90, +90]: {lat}"
    except (ValueError, TypeError):
        return False, f"Invalid latitude format: {raw_lat}"

    # 3. Longitude Validation (-180.0 to +180.0)
    raw_lon = target_data.get("lon") if "lon" in target_data else target_data.get("longitude")
    if raw_lon is None:
        return False, "Missing longitude coordinate"
    try:
        lon = float(raw_lon)
        if math.isnan(lon) or math.isinf(lon) or not (-180.0 <= lon <= 180.0):
            return False, f"Longitude out of bounds [-180, +180]: {lon}"
    except (ValueError, TypeError):
        return False, f"Invalid longitude format: {raw_lon}"

    # 4. Altitude Validation
    raw_alt = target_data.get("alt") if "alt" in target_data else target_data.get("altitude", target_data.get("altitude_m", 0.0))
    try:
        alt = float(raw_alt)
        if math.isnan(alt) or math.isinf(alt) or not (-500.0 <= alt <= 50000.0):
            return False, f"Altitude out of bounds: {alt}"
    except (ValueError, TypeError):
        return False, f"Invalid altitude format: {raw_alt}"

    # 5. Confidence Validation (0.0 to 1.0)
    raw_conf = target_data.get("confidence", 1.0)
    try:
        conf = float(raw_conf)
        if math.isnan(conf) or math.isinf(conf) or not (0.0 <= conf <= 1.0):
            return False, f"Confidence out of bounds [0.0, 1.0]: {conf}"
    except (ValueError, TypeError):
        return False, f"Invalid confidence format: {raw_conf}"

    # 6. Timestamp Validation
    raw_ts = target_data.get("ts") if "ts" in target_data else target_data.get("timestamp", time.time())
    try:
        ts = float(raw_ts)
        if math.isnan(ts) or math.isinf(ts) or ts <= 0:
            return False, f"Invalid timestamp: {ts}"
    except (ValueError, TypeError):
        return False, f"Invalid timestamp format: {raw_ts}"

    return True, None


class PerceptionSubsystemAdapter:
    """
    Authoritative ingestion adapter for Subsystem C (AI Edge Perception).
    Bridges YOLOv8 detections and ByteTrack IDs into GCS AIState and EventBus.
    """

    def __init__(
        self,
        state_store: Optional[StateStore] = None,
        event_bus: Optional[EventBus] = None,
        alert_cooldown_sec: float = 30.0,
        target_timeout_sec: float = 15.0,
    ) -> None:
        self.state_store = state_store or get_state_store()
        self.event_bus = event_bus or get_event_bus()
        self.alert_cooldown_sec = alert_cooldown_sec
        self.target_timeout_sec = target_timeout_sec

        # Telemetry & Status Metrics
        self.connected = False
        self.status = "OFFLINE"  # CONNECTED, DEGRADED, OFFLINE
        self.last_message_time = 0.0
        self.message_count = 0
        self.rejected_count = 0
        self.inference_fps = 0.0
        self.inference_latency_ms = 0.0
        self.last_error: Optional[str] = None

        # Alert Cooldown Cache: key=target_id, value=last_alert_timestamp
        self._alert_cooldowns: Dict[str, float] = {}
        self._lock = threading.Lock()

        # ROS 2 Handle
        self._ros_node = None
        self._ros_sub = None
        self._is_running = False
        self._pruning_thread: Optional[threading.Thread] = None

    def start(self, try_ros: bool = True) -> None:
        """Starts adapter background maintenance and attempts ROS 2 initialization."""
        self._is_running = True

        # Start periodic target timeout pruner
        self._pruning_thread = threading.Thread(target=self._run_pruning_loop, daemon=True)
        self._pruning_thread.start()

        if try_ros:
            self.start_ros_subscriber()

    def stop(self) -> None:
        """Stops adapter and releases ROS 2 resources."""
        self._is_running = False
        self.stop_ros_subscriber()
        with self._lock:
            self.connected = False
            self.status = "OFFLINE"
        self._emit_perception_status()

    # ── ROS 2 Communication Hook ───────────────────────────────────────────────
    def start_ros_subscriber(self) -> bool:
        """
        Attempts to subscribe to ROS 2 perception topics if rclpy is available.
        Never crashes if ROS 2 is not sourced.
        """
        try:
            import rclpy
            from std_msgs.msg import String

            if not rclpy.ok():
                try:
                    rclpy.init()
                except Exception:
                    pass

            if rclpy.ok():
                self._ros_node = rclpy.create_node("sutra_gcs_perception_adapter")
                self._ros_sub = self._ros_node.create_subscription(
                    String,
                    "/sutra/perception/targets",
                    self._on_ros_message,
                    10,
                )
                with self._lock:
                    self.connected = True
                    self.status = "CONNECTED"
                logger.info("📡 Subsystem C ROS 2 subscriber connected to /sutra/perception/targets")
                self._emit_perception_status()
                return True
        except ImportError:
            logger.info("ROS 2 (rclpy) not available. Perception adapter operating in standalone/Python test mode.")
        except Exception as e:
            logger.warning(f"ROS 2 connection failed: {e}. Perception adapter operating in standalone mode.")

        with self._lock:
            self.connected = False
            self.status = "OFFLINE"
        self._emit_perception_status()
        return False

    def stop_ros_subscriber(self) -> None:
        if self._ros_node is not None:
            try:
                self._ros_node.destroy_node()
            except Exception:
                pass
            self._ros_node = None

    def _on_ros_message(self, msg: Any) -> None:
        """Safe ROS 2 String callback dispatcher."""
        try:
            raw_text = getattr(msg, "data", "")
            if not raw_text:
                return
            data = json.loads(raw_text)
            self.inject_fused_target(data, source="ROS2_PERCEPTION")
        except Exception as err:
            logger.error(f"Error decoding ROS 2 perception message: {err}", exc_info=True)
            with self._lock:
                self.last_error = str(err)

    # ── Target Ingestion & Normalization ───────────────────────────────────────
    def inject_fused_target(
        self,
        payload: Any,
        source: str = "PERCEPTION",
    ) -> List[TrackedTarget]:
        """
        Main entry point for perception targets.
        Accepts either a single target dict or a batch dict {"targets": [...]}.
        """
        targets_to_process: List[Dict[str, Any]] = []

        if isinstance(payload, dict):
            if "targets" in payload and isinstance(payload["targets"], list):
                targets_to_process = payload["targets"]
                if "inference_fps" in payload:
                    self.inference_fps = float(payload["inference_fps"])
                if "inference_latency_ms" in payload:
                    self.inference_latency_ms = float(payload["inference_latency_ms"])
            else:
                targets_to_process = [payload]
        elif isinstance(payload, list):
            targets_to_process = payload
        else:
            logger.warning(f"Unexpected payload format to perception adapter: {type(payload)}")
            return []

        processed: List[TrackedTarget] = []
        now = time.time()

        for raw_target in targets_to_process:
            is_valid, err_msg = validate_target_payload(raw_target)
            if not is_valid:
                with self._lock:
                    self.rejected_count += 1
                    self.last_error = err_msg
                logger.warning(f"Rejected malformed target detection: {err_msg} | payload: {raw_target}")
                continue

            target = self._normalize_and_update(raw_target, source, now)
            if target:
                processed.append(target)

        if processed:
            with self._lock:
                self.last_message_time = now
                self.message_count += len(processed)
                self.connected = True
                self.status = "CONNECTED"
            self._emit_perception_status()

        return processed

    def _normalize_and_update(
        self,
        raw: Dict[str, Any],
        source: str,
        now: float,
    ) -> Optional[TrackedTarget]:
        """Normalizes and updates a single validated target record."""
        target_id_raw = raw.get("id") if "id" in raw else raw.get("target_id")
        target_id = str(target_id_raw)
        label = str(raw.get("label", "SURVIVOR")).upper()
        confidence = float(raw.get("confidence", 1.0))
        lat = float(raw.get("lat") if "lat" in raw else raw.get("latitude"))
        lon = float(raw.get("lon") if "lon" in raw else raw.get("longitude"))
        alt = float(raw.get("alt") if "alt" in raw else raw.get("altitude", raw.get("altitude_m", 15.0)))
        drone_id = normalize_drone_id(raw.get("drone") or raw.get("drone_id"))
        modalities = list(raw.get("modalities") or ["visual"])
        ts = float(raw.get("ts") if "ts" in raw else raw.get("timestamp", now))

        state = self.state_store.get_state()
        existing_targets = list(state.ai_state.tracked_targets)
        existing = next((t for t in existing_targets if t.target_id == target_id), None)

        speed_mps = 0.0
        heading_deg = 0.0
        history: List[Dict[str, Any]] = []
        first_seen = ts

        if existing:
            first_seen = existing.first_seen
            history = list(existing.history)
            # Add previous position to history (capped at 20 entries)
            history.append({
                "lat": existing.latitude,
                "lon": existing.longitude,
                "alt": existing.altitude_m,
                "ts": existing.last_seen,
            })
            if len(history) > 20:
                history = history[-20:]

            # Compute simple velocity estimate
            dt = max(0.1, ts - existing.last_seen)
            d_lat_m = (lat - existing.latitude) * 111319.5
            d_lon_m = (lon - existing.longitude) * (111319.5 * math.cos(math.radians(lat)))
            dist_m = math.hypot(d_lat_m, d_lon_m)
            speed_mps = round(dist_m / dt, 2)
            if dist_m > 0.5:
                heading_deg = round(math.degrees(math.atan2(d_lon_m, d_lat_m)) % 360, 1)
            else:
                heading_deg = existing.heading_deg

            updated_target = replace(
                existing,
                label=label,
                latitude=lat,
                longitude=lon,
                altitude_m=alt,
                confidence=confidence,
                speed_mps=speed_mps,
                heading_deg=heading_deg,
                source=source,
                drone_id=drone_id,
                modalities=modalities,
                tracking_status="TRACKED",
                history=history,
                last_seen=ts,
            )
            event_type = "ai.target_updated"
        else:
            history = [{"lat": lat, "lon": lon, "alt": alt, "ts": ts}]
            updated_target = TrackedTarget(
                target_id=target_id,
                label=label,
                latitude=lat,
                longitude=lon,
                altitude_m=alt,
                speed_mps=0.0,
                heading_deg=0.0,
                confidence=confidence,
                source=source,
                drone_id=drone_id,
                modalities=modalities,
                tracking_status="DETECTED",
                history=history,
                first_seen=first_seen,
                last_seen=ts,
            )
            event_type = "ai.target_detected"

        # Update StateStore immutably
        new_targets_list = [t for t in existing_targets if t.target_id != target_id] + [updated_target]
        self.state_store.update_state(
            lambda s: replace(
                s,
                ai_state=replace(
                    s.ai_state,
                    tracked_targets=new_targets_list,
                    last_update=now,
                ),
            )
        )

        # Emit Canonical EventBus Event
        self.event_bus.emit(
            event_type,
            payload={
                "target": self._serialize_target(updated_target),
                "target_id": target_id,
                "drone_id": drone_id,
                "label": label,
                "confidence": confidence,
            },
            source="perception_adapter",
        )

        # Evaluate High-Confidence Survivor Alerts with Cooldown
        if "SURVIVOR" in label and confidence >= 0.70:
            self._trigger_survivor_alert_if_eligible(updated_target, now)

        return updated_target

    def _trigger_survivor_alert_if_eligible(self, target: TrackedTarget, now: float) -> None:
        """Emits a high-priority survivor alert if outside the cooldown window."""
        with self._lock:
            last_alert = self._alert_cooldowns.get(target.target_id, 0.0)
            if (now - last_alert) < self.alert_cooldown_sec:
                return
            self._alert_cooldowns[target.target_id] = now

        alert = Alert(
            alert_id=f"alert_survivor_{target.target_id}_{int(now)}",
            timestamp=now,
            severity=AlertSeverity.CRITICAL,
            title=f"SURVIVOR CONFIRMED: #{target.target_id}",
            message=(
                f"UAV {target.drone_id.upper()} detected {target.label} at "
                f"{target.latitude:.6f}° N, {target.longitude:.6f}° E "
                f"({(target.confidence * 100):.1f}% confidence)"
            ),
            source="sutra_perception",
            drone_id=target.drone_id,
            acknowledged=False,
        )

        # Update AlertState
        self.state_store.update_state(
            lambda s: replace(
                s,
                alert_state=replace(
                    s.alert_state,
                    alerts=[alert] + [a for a in s.alert_state.alerts if a.alert_id != alert.alert_id],
                ),
            )
        )

        # Emit Alert Events
        self.event_bus.emit(
            "alert.created",
            payload={"alert": asdict(alert)},
            source="perception_adapter",
        )
        self.event_bus.emit(
            "SURVIVOR_ALERT",
            payload={
                "alert_id": alert.alert_id,
                "target_id": target.target_id,
                "drone_id": target.drone_id,
                "label": target.label,
                "confidence": target.confidence,
                "latitude": target.latitude,
                "longitude": target.longitude,
                "altitude_m": target.altitude_m,
                "timestamp": now,
            },
            source="perception_adapter",
        )
        logger.info(f"🚨 SURVIVOR ALERT triggered for Target #{target.target_id} ({target.confidence*100:.1f}%)")

    # ── Periodic Target Lifecycle Pruning ──────────────────────────────────────
    def _run_pruning_loop(self) -> None:
        while self._is_running:
            try:
                self.check_target_timeouts(self.target_timeout_sec)
                self._update_connection_status()
            except Exception as e:
                logger.error(f"Error in perception pruning loop: {e}", exc_info=True)
            time.sleep(1.0)

    def check_target_timeouts(self, timeout_sec: float = 15.0) -> List[str]:
        """
        Marks targets that have not been detected within timeout_sec as LOST.
        Returns list of newly lost target IDs.
        """
        now = time.time()
        state = self.state_store.get_state()
        targets = list(state.ai_state.tracked_targets)
        updated_targets = []
        lost_ids: List[str] = []
        changed = False

        for t in targets:
            if t.tracking_status != "LOST" and (now - t.last_seen) > timeout_sec:
                lost_t = replace(t, tracking_status="LOST")
                updated_targets.append(lost_t)
                lost_ids.append(t.target_id)
                changed = True
                self.event_bus.emit(
                    "ai.target_lost",
                    payload={
                        "target_id": t.target_id,
                        "drone_id": t.drone_id,
                        "last_seen": t.last_seen,
                        "time_elapsed_sec": round(now - t.last_seen, 1),
                    },
                    source="perception_adapter",
                )
            else:
                updated_targets.append(t)

        if changed:
            self.state_store.update_state(
                lambda s: replace(
                    s,
                    ai_state=replace(
                        s.ai_state,
                        tracked_targets=updated_targets,
                        last_update=now,
                    ),
                )
            )

        return lost_ids

    def _update_connection_status(self) -> None:
        """Evaluates health status based on message arrival intervals."""
        now = time.time()
        with self._lock:
            if self.last_message_time == 0.0:
                new_status = "OFFLINE"
            elif (now - self.last_message_time) < 5.0:
                new_status = "CONNECTED"
            elif (now - self.last_message_time) < 15.0:
                new_status = "DEGRADED"
            else:
                new_status = "OFFLINE"

            if new_status != self.status:
                self.status = new_status
                self._emit_perception_status()

    def _emit_perception_status(self) -> None:
        """Broadcasts current perception subsystem health to EventBus."""
        state = self.state_store.get_state()
        active_count = len([t for t in state.ai_state.tracked_targets if t.tracking_status != "LOST"])

        payload = {
            "connected": self.connected,
            "status": self.status,
            "last_message_time": self.last_message_time,
            "message_count": self.message_count,
            "rejected_count": self.rejected_count,
            "inference_fps": round(self.inference_fps, 1),
            "inference_latency_ms": round(self.inference_latency_ms, 1),
            "active_tracks": active_count,
            "last_error": self.last_error,
        }

        self.event_bus.emit(
            "ai.perception_status",
            payload=payload,
            source="perception_adapter",
        )

    def _serialize_target(self, target: TrackedTarget) -> Dict[str, Any]:
        """Serializes TrackedTarget to JSON-compliant dictionary."""
        d = asdict(target)
        d["id"] = target.target_id
        d["lat"] = target.latitude
        d["lon"] = target.longitude
        d["alt"] = target.altitude_m
        return d


# Global Singleton Instance
perception_adapter = PerceptionSubsystemAdapter()


def get_perception_adapter() -> PerceptionSubsystemAdapter:
    return perception_adapter
