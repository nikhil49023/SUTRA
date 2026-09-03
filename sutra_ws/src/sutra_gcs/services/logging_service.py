"""
Smart Horizon GCS — Centralized Logging Infrastructure
Subsystem: Core Services
"""

import logging
import sys
from typing import Any, Dict, Optional


class GCSLogFormatter(logging.Formatter):
    """
    Standardized log formatter for Ground Control Station subsystems.
    Output: [TIMESTAMP] [LEVEL] [LOGGER] (source=SOURCE drone=DRONE mission=MISSION): MESSAGE
    """

    def format(self, record: logging.LogRecord) -> str:
        timestamp = self.formatTime(record, "%Y-%m-%d %H:%M:%S")
        level = record.levelname.ljust(8)
        logger_name = record.name
        message = record.getMessage()

        # Extract optional structured context attributes
        source = getattr(record, "source", "system")
        drone_id = getattr(record, "drone_id", None)
        mission_id = getattr(record, "mission_id", None)
        correlation_id = getattr(record, "correlation_id", None)

        context_parts = [f"src={source}"]
        if drone_id:
            context_parts.append(f"drone={drone_id}")
        if mission_id:
            context_parts.append(f"mission={mission_id}")
        if correlation_id:
            context_parts.append(f"cid={correlation_id}")

        context_str = f"({', '.join(context_parts)})"
        return f"[{timestamp}] [{level}] [{logger_name}] {context_str}: {message}"


def setup_logging(log_level: str = "INFO") -> logging.Logger:
    """
    Initializes root logging for the GCS application with standard output handler.
    """
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)

    root_logger = logging.getLogger("sutra_gcs")
    root_logger.setLevel(numeric_level)

    # Avoid duplicate handlers on re-initialization
    if not root_logger.handlers:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(numeric_level)
        console_handler.setFormatter(GCSLogFormatter())
        root_logger.addHandler(console_handler)

def get_logger(name: str) -> logging.Logger:
    """
    Convenience factory to obtain child loggers under the 'sutra_gcs' namespace.
    """
    if name.startswith("sutra_gcs.") or name == "sutra_gcs":
        return logging.getLogger(name)
    return logging.getLogger(f"sutra_gcs.{name}")


class GCSLoggerService:
    """Provides memory ring buffered logs for UI console readouts."""

    def __init__(self, max_buffer_size: int = 1000):
        self.max_buffer_size = max_buffer_size
        self.logs: list = []
        self._logger = get_logger("service")

    def log(self, level: str, source: str, message: str) -> dict:
        import time
        entry = {
            "timestamp": time.strftime("%H:%M:%S"),
            "level": level.upper(),
            "source": source,
            "message": message,
        }
        self.logs.insert(0, entry)
        if len(self.logs) > self.max_buffer_size:
            self.logs.pop()
        getattr(self._logger, level.lower(), self._logger.info)(
            message, extra={"source": source}
        )
        return entry

    def info(self, source: str, message: str) -> None:
        self.log("INFO", source, message)

    def warn(self, source: str, message: str) -> None:
        self.log("WARN", source, message)

    def error(self, source: str, message: str) -> None:
        self.log("ERROR", source, message)

    def get_recent(self, count: int = 50) -> list:
        return self.logs[:count]


logger_service = GCSLoggerService()
