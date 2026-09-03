"""
SUTRA GCS — Message Dispatcher
"""

from typing import Dict, Any, Callable
from ..services.event_bus import event_bus
from ..state.telemetry_state import telemetry_state


class MessageDispatcher:
    """Dispatches incoming telemetry, MAVLink frames, and AI detections to system state."""

    def dispatch(self, topic: str, message: Dict[str, Any]) -> None:
        if topic == "telemetry":
            drone_id = message.get("drone_id", "drone_alpha")
            telemetry_state.update_drone_telemetry(drone_id, message)
            event_bus.publish("TELEMETRY_UPDATED", message)
        elif topic == "sar_target":
            event_bus.publish("SAR_TARGET_DETECTED", message)
        elif topic == "alert":
            event_bus.publish("ALERT_TRIGGERED", message)


dispatcher = MessageDispatcher()
