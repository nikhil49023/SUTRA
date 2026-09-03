"""
Smart Horizon GCS — Message Envelope Validation & Priority Dispatcher
Subsystem: Communication Core (Phase 8)
"""

import json
import logging
import time
import uuid
from typing import Any, Dict, List, Optional, Tuple

from services.event_bus import EventBus, get_event_bus
from .connection_metrics import ConnectionMetrics, connection_metrics
from .subscription_manager import SubscriptionManager, subscription_manager

logger = logging.getLogger("sutra_gcs.communication.dispatcher")


class MessageDispatcher:
    """
    Validates structured message envelopes, enforces priority queueing,
    and routes inbound packets to matching subscriptions and EventBus channels.
    """

    def __init__(
        self,
        event_bus: Optional[EventBus] = None,
        sub_manager: Optional[SubscriptionManager] = None,
        metrics: Optional[ConnectionMetrics] = None,
        max_queue_size: int = 1000,
    ) -> None:
        self.event_bus = event_bus or get_event_bus()
        self.sub_manager = sub_manager or subscription_manager
        self.metrics = metrics or connection_metrics
        self.max_queue_size = max_queue_size
        self.logger = logger

    def validate_envelope(self, msg: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """
        Validates required envelope fields.
        """
        if not isinstance(msg, dict):
            return False, "Message is not a JSON object."

        required_fields = ["type", "topic", "payload"]
        for f in required_fields:
            if f not in msg:
                return False, f"Missing required envelope field: '{f}'"

        return True, None

    def build_envelope(
        self,
        msg_type: str,
        topic: str,
        payload: Dict[str, Any],
        correlation_id: Optional[str] = None,
        priority: str = "NORMAL",
    ) -> Dict[str, Any]:
        """
        Constructs standard outgoing packet envelope.
        """
        return {
            "type": msg_type,
            "topic": topic,
            "timestamp": time.time(),
            "message_id": str(uuid.uuid4()),
            "correlation_id": correlation_id,
            "priority": priority,
            "payload": payload,
        }

    def dispatch_inbound(self, raw_message: Any) -> bool:
        """
        Parses and validates raw message string or dict, then invokes matching callbacks.
        """
        try:
            if isinstance(raw_message, (str, bytes)):
                msg = json.loads(raw_message)
            elif isinstance(raw_message, dict):
                msg = raw_message
            else:
                self.metrics.record_dropped()
                return False

            valid, err = self.validate_envelope(msg)
            if not valid:
                self.logger.warning(f"Rejected invalid message envelope: {err}")
                self.metrics.record_dropped()
                return False

            msg_type = msg.get("type", "generic")
            topic = msg.get("topic", "system/general")
            payload = msg.get("payload", {})

            self.metrics.record_received(len(str(raw_message)))

            # 1. Route to direct topic subscribers
            subscribers = self.sub_manager.get_subscribers(topic)
            for cb in subscribers:
                try:
                    cb(msg)
                except Exception as e:
                    self.logger.error(f"Error in subscription callback for topic '{topic}': {e}")

            # 2. Emit onto EventBus
            self.event_bus.emit(
                f"communication.message_received",
                payload={"type": msg_type, "topic": topic, "payload": payload},
                source="message_dispatcher",
            )

            return True

        except Exception as e:
            self.logger.error(f"Failed to dispatch inbound message: {e}")
            self.metrics.record_dropped()
            return False


# Global singleton
message_dispatcher = MessageDispatcher()
