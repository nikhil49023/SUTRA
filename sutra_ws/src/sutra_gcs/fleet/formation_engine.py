"""
SUTRA GCS — Swarm Formation State Machine
"""

from typing import Dict, Any
from .formation_calculator import formation_calc


class FormationEngine:
    """Manages active swarm formation states."""

    def __init__(self):
        self.active_formation = "V_FORMATION"

    def set_formation(self, formation_name: str) -> Dict[str, Any]:
        self.active_formation = formation_name.upper()
        offsets = formation_calc.get_formation_offsets(self.active_formation)
        return {
            "formation": self.active_formation,
            "offsets": offsets
        }


formation_engine = FormationEngine()
