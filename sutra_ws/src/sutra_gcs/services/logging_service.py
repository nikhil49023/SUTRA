"""
SUTRA GCS — Logging & Audit Service
"""

import time
import logging
from typing import List, Dict, Any

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s"
)


class LoggingService:
    """Provides structured audit and telemetry logs with memory ring buffering."""

    def __init__(self, max_buffer_size: int = 1000):
        self.max_buffer_size = max_buffer_size
        self.logs: List[Dict[str, Any]] = []

    def log(self, level: str, source: str, message: str) -> Dict[str, Any]:
        entry = {
            "timestamp": time.strftime("%H:%M:%S"),
            "level": level.upper(),
            "source": source,
            "message": message
        }
        self.logs.insert(0, entry)
        if len(self.logs) > self.max_buffer_size:
            self.logs.pop()
        return entry

    def info(self, source: str, message: str) -> None:
        self.log("INFO", source, message)

    def warn(self, source: str, message: str) -> None:
        self.log("WARN", source, message)

    def error(self, source: str, message: str) -> None:
        self.log("ERROR", source, message)

    def get_recent(self, count: int = 50) -> List[Dict[str, Any]]:
        return self.logs[:count]


logger_service = LoggingService()
