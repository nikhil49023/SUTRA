"""
SUTRA GCS — 3-Column Tactical Dashboard Layout Coordinator
"""

from typing import Dict, Any
from .top_bar import top_bar
from .left_sidebar import left_sidebar
from .right_inspector import right_inspector
from .bottom_console import bottom_console


class DashboardView:
    """Coordinates the 3-column tactical HUD view (Sidebar + GIS Map + PFD Inspector)."""

    @staticmethod
    def render_view(drone_dict: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "top_bar": top_bar.render_state(),
            "tabs": left_sidebar.get_tabs(),
            "inspector": right_inspector.format_inspector(drone_dict),
            "console": bottom_console.get_console_entries(5)
        }


dashboard_view = DashboardView()
