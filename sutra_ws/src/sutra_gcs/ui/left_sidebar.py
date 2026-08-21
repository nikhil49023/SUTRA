"""
SUTRA GCS — Left Sidebar Component
"""

from typing import List, Dict, Any


class LeftSidebarComponent:
    """Manages master tab navigation list and drone fleet selector."""

    TABS = [
        {"id": "dashboard", "icon": "🛰️", "label": "DASHBOARD"},
        {"id": "planner", "icon": "🗺️", "label": "MISSION PLAN"},
        {"id": "gis", "icon": "🌐", "label": "GIS & RF LOS"},
        {"id": "swarm", "icon": "🦅", "label": "SWARM OPS"},
        {"id": "comms", "icon": "📡", "label": "MAVLINK"},
        {"id": "ai", "icon": "👁️", "label": "AI PERCEPTION"},
        {"id": "replay", "icon": "📼", "label": "REPLAY"},
        {"id": "settings", "icon": "⚙️", "label": "SETTINGS"}
    ]

    @classmethod
    def get_tabs(cls) -> List[Dict[str, str]]:
        return cls.TABS


left_sidebar = LeftSidebarComponent()
