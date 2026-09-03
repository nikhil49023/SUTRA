"""
SUTRA GCS — Drone Map Renderer
Generates SVG icon definitions and heading rotation CSS.
"""

from typing import Dict, Any


class DroneMapRenderer:
    """Generates animated tactical drone SVG markers for map rendering."""

    @staticmethod
    def get_marker_props(drone_id: str, heading_deg: float, armed: bool) -> Dict[str, Any]:
        color = "#10b981" if armed else "#38bdf8"
        return {
            "icon_type": "svg_quadcopter",
            "color": color,
            "rotation_deg": heading_deg,
            "glow": armed
        }


drone_map_renderer = DroneMapRenderer()
