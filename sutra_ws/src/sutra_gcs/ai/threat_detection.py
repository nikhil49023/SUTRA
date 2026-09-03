"""
SUTRA GCS — AI Edge Threat & Target Detection
"""

import time
import math
from typing import List, Dict, Any


class ThreatDetector:
    """Simulates YOLOv8 edge object detections (Survivors, Wildfires, Obstacles)."""

    def __init__(self, origin_lat: float = 37.774929, origin_lon: float = -122.419416):
        self.origin_lat = origin_lat
        self.origin_lon = origin_lon

    def get_detections(self, drone_lat: float, drone_lon: float) -> List[Dict[str, Any]]:
        t = time.time() * 0.1
        detections = [
            {
                "target_id": "SAR-01",
                "label": "SURVIVOR",
                "confidence": 0.94,
                "heat_signature_c": 36.8,
                "lat": self.origin_lat + 0.0006 + math.sin(t * 0.2) * 0.00005,
                "lon": self.origin_lon + 0.0008,
                "threat_level": "NOMINAL",
                "box_norm": [0.35, 0.40, 0.12, 0.20]
            },
            {
                "target_id": "HAZ-02",
                "label": "FIRE_FLARE",
                "confidence": 0.88,
                "heat_signature_c": 142.5,
                "lat": self.origin_lat - 0.0009,
                "lon": self.origin_lon - 0.0007,
                "threat_level": "ELEVATED",
                "box_norm": [0.65, 0.25, 0.18, 0.22]
            }
        ]
        return detections


threat_detector = ThreatDetector()
