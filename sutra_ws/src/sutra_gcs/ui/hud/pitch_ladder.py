"""
SUTRA GCS — Pitch Ladder Model
"""

from typing import List, Dict, Any


class PitchLadder:
    """Generates pitch rungs (-40 deg to +40 deg in 5-deg intervals)."""

    @staticmethod
    def get_pitch_rungs() -> List[int]:
        return list(range(-40, 45, 5))


pitch_ladder = PitchLadder()
