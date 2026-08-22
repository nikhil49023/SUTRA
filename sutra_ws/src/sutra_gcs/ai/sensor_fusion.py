"""
SUTRA GCS — Tri-Modal Sensor Fusion Engine
"""

from typing import Dict, Any, List


class SensorFusionEngine:
    """Fuses RGB Optical, FLIR Thermal, and Optical Flow sensor data streams."""

    @staticmethod
    def fuse_telemetry(rgb_active: bool, thermal_active: bool, opt_flow_active: bool) -> Dict[str, Any]:
        modes = []
        if rgb_active:
            modes.append("RGB_4K_GIMBAL")
        if thermal_active:
            modes.append("FLIR_THERMAL_LWIR")
        if opt_flow_active:
            modes.append("DOWNWARD_OPTICAL_FLOW")

        return {
            "active_streams": modes,
            "fusion_health": "OPTIMAL" if len(modes) >= 2 else "DEGRADED",
            "confidence_score": 0.98 if len(modes) >= 2 else 0.85
        }


# Backward compatibility singleton & alias
SensorFusion = SensorFusionEngine
sensor_fusion = SensorFusionEngine()

