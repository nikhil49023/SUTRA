"""
SUTRA GCS — Compass HUD Tape
"""

from typing import Dict, Any


class CompassTape:
    """Provides heading cardinal points (N, NE, E, SE, S, SW, W, NW)."""

    CARDINALS = {0: "N", 45: "NE", 90: "E", 135: "SE", 180: "S", 225: "SW", 270: "W", 315: "NW"}

    @classmethod
    def get_cardinal(cls, heading_deg: float) -> str:
        h = int(heading_deg % 360)
        closest = min(cls.CARDINALS.keys(), key=lambda k: min(abs(k - h), 360 - abs(k - h)))
        return cls.CARDINALS[closest]


compass_tape = CompassTape()
