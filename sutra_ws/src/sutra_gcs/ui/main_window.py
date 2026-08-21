"""
SUTRA GCS — Main Window Coordinator
"""

from typing import Dict, Any
from .dashboard import dashboard_view
from ..state.application_state import app_state


class MainWindow:
    """Master window manager serving the web dashboard and GUI contexts."""

    @staticmethod
    def get_full_render_context(active_drone_dict: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "app": app_state.to_dict(),
            "dashboard": dashboard_view.render_view(active_drone_dict)
        }


main_window = MainWindow()
