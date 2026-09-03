"""
SUTRA GCS — Telemetry Stream Service
Prepares formatted SSE / WebSocket telemetry payloads at 10Hz/20Hz.
"""

import json
import time
from typing import Dict, Any, Generator


class TelemetryStreamer:
    """Formats fleet state into SSE and streaming chunks."""

    @staticmethod
    def format_sse_frame(event_name: str, data: Dict[str, Any]) -> str:
        """Returns standard Server-Sent Events (SSE) packet formatting."""
        payload = json.dumps(data)
        return f"event: {event_name}\ndata: {payload}\n\n"


streamer = TelemetryStreamer()
