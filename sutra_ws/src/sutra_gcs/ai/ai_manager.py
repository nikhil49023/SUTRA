"""
Smart Horizon GCS — Master AI Intelligence & Decision Support Coordinator
Subsystem: AI Subsystem (Phase 10)
"""

import time
from dataclasses import replace
from typing import Any, Callable, Dict, List, Optional

from services.event_bus import EventBus, get_event_bus
from services.logging_service import get_logger
from state.ai_state import AIAnalysisStatus, AIMode, AIState
from state.application_state import ApplicationState, StateStore, get_state_store

from .ai_audit import AIAuditLogger, ai_audit_logger
from .battery_predictor import BatteryPredictor, battery_predictor
from .command_parser import CommandParser, command_parser
from .eta_predictor import ETAPredictor, eta_predictor
from .failure_predictor import FailurePredictor, failure_predictor
from .mission_advisor import MissionAdvisorEngine, mission_advisor
from .models import AssistantMessage, RecommendationItem
from .recommendation_engine import RecommendationEngine, recommendation_engine
from .route_predictor import RoutePredictor, route_predictor
from .sensor_fusion import SensorFusionEngine, sensor_fusion
from .target_tracker import TargetTracker, target_tracker
from .threat_assessment import ThreatAssessmentEngine, threat_assessment

logger = get_logger("ai_manager")


class AIManager:
    """
    Coordinates asynchronous predictive AI analysis passes, maintains single-source
    AI state updates, and gates action executions behind operator confirmation.
    """

    def __init__(
        self,
        state_store: Optional[StateStore] = None,
        event_bus: Optional[EventBus] = None,
        audit_log: Optional[AIAuditLogger] = None,
    ) -> None:
        self.state_store = state_store or get_state_store()
        self.event_bus = event_bus or get_event_bus()
        self.audit_log = audit_log or ai_audit_logger
        self.logger = logger

    def run_full_analysis(self) -> None:
        """
        Executes a complete AI decision support analysis cycle and updates AIState.
        """
        state = self.state_store.get_state()
        if not state.ai_state.enabled:
            return

        self.event_bus.emit("ai.analysis_started", payload={}, source="ai_manager")

        try:
            # 1. Battery Prediction for all active drones
            bat_preds = {}
            for d in state.fleet_state.get_all_drones():
                pred = battery_predictor.predict(
                    drone_id=d.drone_id,
                    current_battery=d.battery,
                    remaining_distance_m=getattr(state.mission_state, "distance_remaining", 500.0),
                    rth_distance_m=500.0,
                    ground_speed_mps=d.speed,
                )
                bat_preds[d.drone_id] = pred

            # 2. ETA Prediction
            telem = state.telemetry_state
            eta_pred = {
                telem.drone_id: eta_predictor.predict(
                    drone_id=telem.drone_id,
                    current_speed_mps=telem.ground_speed,
                    dist_to_next_wp_m=getattr(state.mission_state, "active_segment_distance", 100.0),
                    dist_remaining_mission_m=getattr(state.mission_state, "distance_remaining", 500.0),
                    dist_to_home_m=500.0,
                )
            }

            # 3. Route Risk
            wps = state.mission_state.waypoints
            route_pred = route_predictor.analyze_route(state.mission_state.mission_name, wps)

            # 4. Failure Predictions
            faults = failure_predictor.audit_faults(state)

            # 5. Threats
            threats = threat_assessment.evaluate_threats(state)

            # 6. Prioritized Recommendations
            recs = recommendation_engine.generate_recommendations(state)

            # 7. Update AIState
            self.state_store.update_state(
                lambda s: replace(
                    s,
                    ai_state=replace(
                        s.ai_state,
                        analysis_status=AIAnalysisStatus.COMPLETED,
                        last_update=time.time(),
                        battery_predictions=bat_preds,
                        eta_predictions=eta_pred,
                        route_prediction=route_pred,
                        risk_assessment=route_pred.risk_level,
                        failure_predictions=faults,
                        threats=threats,
                        recommendations=recs,
                        overall_confidence=0.92,
                    ),
                )
            )

            self.event_bus.emit(
                "ai.analysis_completed",
                payload={"recommendations_count": len(recs), "threats_count": len(threats)},
                source="ai_manager",
            )

        except Exception as e:
            self.logger.error(f"AI Analysis error: {e}")
            self.state_store.update_state(
                lambda s: replace(
                    s,
                    ai_state=replace(s.ai_state, analysis_status=AIAnalysisStatus.ERROR, last_error=str(e)),
                )
            )

    def handle_operator_decision(self, recommendation_id: str, accept: bool) -> None:
        """
        Processes operator approval or rejection of an advisory recommendation.
        """
        action = "ACCEPTED" if accept else "REJECTED"
        self.audit_log.log_operator_action(recommendation_id, action)

        def updater(s: ApplicationState) -> ApplicationState:
            updated_recs = []
            for r in s.ai_state.recommendations:
                if r.recommendation_id == recommendation_id:
                    updated_recs.append(replace(r, status=action))
                else:
                    updated_recs.append(r)
            return replace(s, ai_state=replace(s.ai_state, recommendations=updated_recs))

        self.state_store.update_state(updater)

    def ask_assistant(self, query_text: str) -> str:
        """
        Direct NLP conversational interface.
        """
        state = self.state_store.get_state()
        user_msg = AssistantMessage(sender="USER", text=query_text)
        reply = MissionAdvisorEngine.answer_query(query_text, state)

        self.state_store.update_state(
            lambda s: replace(
                s,
                ai_state=replace(
                    s.ai_state,
                    assistant_messages=s.ai_state.assistant_messages + [user_msg, reply],
                ),
            )
        )
        return reply.text


# Global singleton
ai_manager = AIManager()
