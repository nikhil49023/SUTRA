"""
SUTRA GCS — Tactical Mission Advisor & NLP Assistant
"""

import re
from typing import Dict, Any, List


class MissionAdvisor:
    """Provides natural language command parsing and tactical recommendations."""

    @staticmethod
    def parse_command(text: str) -> Dict[str, Any]:
        t = text.strip().lower()
        if re.search(r"arm", t):
            return {"action": "ARM", "confidence": 0.98}
        elif re.search(r"takeoff", t):
            match = re.search(r"(\d+)", t)
            alt = float(match.group(1)) if match else 15.0
            return {"action": "TAKEOFF", "altitude_m": alt, "confidence": 0.95}
        elif re.search(r"rtl|return", t):
            return {"action": "RTL", "confidence": 0.99}
        elif re.search(r"abort|emergency", t):
            return {"action": "EMERGENCY_STOP", "confidence": 1.0}
        elif re.search(r"grid|search", t):
            return {"action": "GRID_SEARCH", "confidence": 0.92}
        elif re.search(r"v[- ]?formation|wedge", t):
            return {"action": "V_FORMATION", "confidence": 0.92}
        return {"action": "UNKNOWN", "confidence": 0.0}


mission_advisor = MissionAdvisor()
