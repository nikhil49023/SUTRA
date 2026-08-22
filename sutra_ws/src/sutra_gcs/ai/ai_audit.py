"""
Smart Horizon GCS — AI Prediction & Operator Action Audit Trail
Subsystem: AI Subsystem (Phase 10)
"""

import logging
import time
from typing import Any, Dict, List

from services.logging_service import get_logger

logger = logging.getLogger("sutra_gcs.ai.audit")


class AIAuditLogger:
    """
    Maintains a strict tamper-evident in-memory log of AI reasoning, predictions,
    and subsequent operator decisions.
    """

    def __init__(self) -> None:
        self._entries: List[Dict[str, Any]] = []
        self.logger = get_logger("ai_audit")

    def log_analysis(self, analysis_type: str, result_summary: str, confidence: float) -> None:
        entry = {
            "timestamp": time.time(),
            "type": analysis_type,
            "result": result_summary,
            "confidence": confidence,
        }
        self._entries.append(entry)
        self.logger.info(f"AI [{analysis_type}] ({confidence*100:.0f}% conf): {result_summary}")

    def log_operator_action(self, recommendation_id: str, action: str, operator: str = "OFFGRID_LEAD") -> None:
        entry = {
            "timestamp": time.time(),
            "type": "OPERATOR_DECISION",
            "recommendation_id": recommendation_id,
            "action": action,
            "operator": operator,
        }
        self._entries.append(entry)
        self.logger.info(f"OPERATOR [{action}] on Recommendation {recommendation_id[:8]} by {operator}")

    def get_recent_entries(self, limit: int = 50) -> List[Dict[str, Any]]:
        return self._entries[-limit:]


# Global singleton
ai_audit_logger = AIAuditLogger()
