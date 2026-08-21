"""
SUTRA AI Bridge — Computer Vision Perception & Natural Language Mission Assistant
Subsystem A <-> Subsystem C Integration Bridge
"""

import math
import time
import re
from typing import Dict, List, Any, Tuple
from gnc_engine import CoordinateTransform, FlightMode


class AIPerceptionBridge:
    """
    Simulates tri-modal computer vision detections (RGB + Thermal FLIR + Edge YOLOv8)
    and performs 3D camera raycast target geolocation to WGS84.
    """

    def __init__(self, origin_lat: float = 37.774929, origin_lon: float = -122.419416):
        self.transformer = CoordinateTransform(origin_lat, origin_lon, 0.0)

        # Ground Truth Targets for Search & Rescue mission simulation
        self.sar_targets = [
            {
                "target_id": "SAR-01",
                "type": "SURVIVOR",
                "label": "Trapped Survivor (Thermal Anomaly 37.8°C)",
                "lat": origin_lat + 0.00035,
                "lon": origin_lon + 0.00042,
                "confidence": 0.94,
                "priority": "CRITICAL"
            },
            {
                "target_id": "SAR-02",
                "type": "FIRE_HAZARD",
                "label": "Wildfire Edge Flare",
                "lat": origin_lat + 0.00072,
                "lon": origin_lon - 0.00030,
                "confidence": 0.89,
                "priority": "HIGH"
            },
            {
                "target_id": "SAR-03",
                "type": "DEBRIS",
                "label": "Blocked Evacuation Route",
                "lat": origin_lat - 0.00025,
                "lon": origin_lon + 0.00055,
                "confidence": 0.82,
                "priority": "MEDIUM"
            }
        ]
        self.active_camera_mode = "RGB_GIMBAL"  # "RGB_GIMBAL", "THERMAL_FLIR", "OPTICAL_FLOW"
        self.detection_history: List[Dict[str, Any]] = []

    def set_camera_mode(self, mode: str) -> str:
        """Switch active camera sensor feed."""
        valid_modes = ["RGB_GIMBAL", "THERMAL_FLIR", "OPTICAL_FLOW"]
        if mode.upper() in valid_modes:
            self.active_camera_mode = mode.upper()
        return self.active_camera_mode

    def compute_threat_risk_index(self, detections: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Compute composite SAR Threat & Hazard Risk Index."""
        critical_count = sum(1 for d in detections if d.get("priority") == "CRITICAL")
        high_count = sum(1 for d in detections if d.get("priority") == "HIGH")
        medium_count = sum(1 for d in detections if d.get("priority") == "MEDIUM")

        score = min(100.0, critical_count * 40.0 + high_count * 20.0 + medium_count * 10.0)
        level = "CRITICAL" if score >= 70 else ("ELEVATED" if score >= 30 else "NOMINAL")

        return {
            "threat_score": round(score, 1),
            "threat_level": level,
            "critical_targets": critical_count,
            "high_targets": high_count,
            "survivors_located": sum(1 for d in detections if d.get("type") == "SURVIVOR"),
            "camera_mode": self.active_camera_mode
        }

    def raycast_ground_target(
        self,
        drone_lat: float,
        drone_lon: float,
        drone_alt_agl: float,
        yaw_deg: float,
        camera_pitch_deg: float = -45.0,
        pixel_x_norm: float = 0.5,
        pixel_y_norm: float = 0.5
    ) -> Tuple[float, float]:
        """
        Geolocate bounding box from normalized image pixel [0, 1] to Ground WGS-84 coordinate.
        Calculates line-of-sight intersection of optical camera ray with ground plane ($Z = 0$).
        """
        # Camera FOV angles (e.g. 60 deg HFOV, 45 deg VFOV)
        hfov_rad = math.radians(60.0)
        vfov_rad = math.radians(45.0)

        angle_offset_x = (pixel_x_norm - 0.5) * hfov_rad
        angle_offset_y = (pixel_y_norm - 0.5) * vfov_rad

        eff_pitch = math.radians(camera_pitch_deg) + angle_offset_y
        eff_yaw = math.radians(yaw_deg) + angle_offset_x

        # Ground distance along line of sight: d = h / tan(-eff_pitch)
        if math.sin(eff_pitch) >= -0.05:
            slant_ground_dist = drone_alt_agl * 2.0  # fallback limit
        else:
            slant_ground_dist = abs(drone_alt_agl / math.tan(eff_pitch))

        # Project along heading
        north_offset = slant_ground_dist * math.cos(eff_yaw)
        east_offset = slant_ground_dist * math.sin(eff_yaw)

        # Convert back to WGS84
        d_lat = north_offset / 111139.0
        d_lon = east_offset / (111139.0 * math.cos(math.radians(drone_lat)))

        return (drone_lat + d_lat, drone_lon + d_lon)

    def get_live_detections(self, drone_telemetry: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Calculate which SAR targets fall inside the drone's active camera FOV footprint.
        """
        lat = drone_telemetry.get("lat", 0.0)
        lon = drone_telemetry.get("lon", 0.0)
        alt = drone_telemetry.get("alt_agl", 0.0)
        detections = []

        if alt < 1.0:
            return []  # on ground, no aerial camera view

        for target in self.sar_targets:
            # Distance from drone in meters
            dn = (target["lat"] - lat) * 111139.0
            de = (target["lon"] - lon) * (111139.0 * math.cos(math.radians(lat)))
            dist_2d = math.sqrt(dn**2 + de**2)

            # Camera coverage radius at current altitude (approx cone radius)
            cam_radius = alt * 1.5 + 25.0

            if dist_2d <= cam_radius:
                # Simulated bounding box normalized coordinates
                bbox_cx = 0.5 + (de / (cam_radius * 2.0))
                bbox_cy = 0.5 + (dn / (cam_radius * 2.0))
                bbox_w = 0.15 + (20.0 / max(10.0, alt)) * 0.05
                bbox_h = 0.18 + (20.0 / max(10.0, alt)) * 0.05

                detections.append({
                    "target_id": target["target_id"],
                    "label": target["label"],
                    "type": target["type"],
                    "priority": target["priority"],
                    "confidence": target["confidence"],
                    "lat": target["lat"],
                    "lon": target["lon"],
                    "distance_m": round(dist_2d, 1),
                    "bbox": [
                        max(0.05, min(0.85, bbox_cx - bbox_w / 2)),
                        max(0.05, min(0.85, bbox_cy - bbox_h / 2)),
                        min(0.3, bbox_w),
                        min(0.3, bbox_h)
                    ]
                })

        return detections


class NLPMissionAssistant:
    """
    Processes natural language tactical commands and translates them into GNC state transitions.
    Great for judges demonstrations to showcase autonomous AI integration.
    """

    @staticmethod
    def parse_command(text: str) -> Dict[str, Any]:
        t = text.lower().strip()

        if any(w in t for w in ["emergency", "abort", "kill", "halt", "all stop"]):
            return {
                "action": "EMERGENCY_STOP",
                "target": "ALL",
                "message": "🚨 EXECUTING EMERGENCY ALL-STOP DISARM"
            }

        if any(w in t for w in ["rtl", "return", "home", "back"]):
            return {
                "action": "RTL",
                "target": "ALL" if "all" in t or "fleet" in t else "SELECTED",
                "message": "🏡 RETURNING TO LAUNCH (RTL) ENGAGED"
            }

        if "takeoff" in t or "take off" in t or "launch" in t:
            # Check for specific altitude
            alt_match = re.search(r'(\d+)\s*(?:m|meter|meters)', t)
            alt = float(alt_match.group(1)) if alt_match else 15.0
            return {
                "action": "TAKEOFF",
                "altitude": alt,
                "target": "ALL" if "all" in t or "fleet" in t else "SELECTED",
                "message": f"🚀 INITIATING AUTONOMOUS TAKEOFF TO {alt}M AGL"
            }

        if "arm" in t:
            return {
                "action": "ARM",
                "target": "ALL" if "all" in t or "fleet" in t else "SELECTED",
                "message": "⚙️ ARMING MOTORS (50Hz OFFBOARD READY)"
            }

        if "disarm" in t or "land" in t:
            return {
                "action": "LAND",
                "target": "ALL" if "all" in t or "fleet" in t else "SELECTED",
                "message": "🛬 INITIATING PRECISION TOUCHDOWN / LANDING"
            }

        if "grid" in t or "search" in t or "sar" in t or "pattern" in t:
            return {
                "action": "FORMATION",
                "formation": "GRID_SEARCH",
                "message": "📡 INITIATING MULTI-LANE SEARCH & RESCUE GRID COVERAGE"
            }

        if "v formation" in t or "wedge" in t or "formation" in t:
            return {
                "action": "FORMATION",
                "formation": "V_FORMATION",
                "message": "🦅 INITIATING TACTICAL V-FORMATION SYNCHRONIZATION"
            }

        if "perimeter" in t or "box" in t or "orbit" in t:
            return {
                "action": "FORMATION",
                "formation": "PERIMETER_BOX",
                "message": "🛡️ DEPLOYING PERIMETER SURVEILLANCE ENCIRCLEMENT"
            }

        return {
            "action": "UNKNOWN",
            "message": f"Command received: '{text}'. Try 'takeoff 20m', 'grid search', 'rtl', or 'emergency abort'."
        }
