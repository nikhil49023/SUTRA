"""
SUTRA GCS — Bottom Console Component
"""

from typing import List, Dict, Any
from ..services.logging_service import logger_service


class BottomConsoleComponent:
    """Manages real-time scrolling console log output."""

    @staticmethod
    def get_console_entries(count: int = 10) -> List[Dict[str, Any]]:
        return logger_service.get_recent(count)


bottom_console = BottomConsoleComponent()
