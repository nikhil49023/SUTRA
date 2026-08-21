"""
SUTRA GCS — Top Bar Header Component
"""

from typing import Dict, Any


class TopBarComponent:
    """Manages system title, operator callsign, network status, and emergency abort."""

    @staticmethod
    def render_state(operator: str = "OFFGRID_LEAD", role: str = "COMMANDER", is_connected: bool = True) -> Dict[str, Any]:
        return {
            "title": "SUTRA TACTICAL GCS",
            "operator": operator,
            "role": role,
            "connected": is_connected,
            "status_badge": "ONLINE (10Hz)" if is_connected else "DISCONNECTED"
        }


top_bar = TopBarComponent()
