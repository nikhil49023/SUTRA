"""
Smart Horizon GCS — AI Intelligence & Tactical Decision Support Subsystem Package
"""

from .models import (
    AIAnalysisStatus,
    AIConfidenceLevel,
    AIMode,
    BatteryPrediction,
    ETAPrediction,
    FailurePrediction,
    RecommendationItem,
    RecommendationSeverity,
    RouteRiskReport,
    ThreatItem,
    TrackedTarget,
)
from .confidence import ConfidenceCalculator, confidence_calc
from .battery_predictor import BatteryPredictor, battery_predictor
from .eta_predictor import ETAPredictor, eta_predictor
from .route_predictor import RoutePredictor, route_predictor
from .failure_predictor import FailurePredictor, failure_predictor
from .threat_assessment import ThreatAssessmentEngine, threat_assessment
from .recommendation_engine import RecommendationEngine, recommendation_engine
from .command_parser import CommandParser, ParsedCommandResult, command_parser
from .mission_advisor import MissionAdvisorEngine, MissionAdvisor, mission_advisor
from .sensor_fusion import SensorFusionEngine, SensorFusion, sensor_fusion
from .target_tracker import TargetTracker, target_tracker
from .ai_audit import AIAuditLogger, ai_audit_logger
from .ai_manager import AIManager, ai_manager

__all__ = [
    "AIAnalysisStatus",
    "AIConfidenceLevel",
    "AIMode",
    "BatteryPrediction",
    "ETAPrediction",
    "FailurePrediction",
    "RecommendationItem",
    "RecommendationSeverity",
    "RouteRiskReport",
    "ThreatItem",
    "TrackedTarget",
    "ConfidenceCalculator",
    "confidence_calc",
    "BatteryPredictor",
    "battery_predictor",
    "ETAPredictor",
    "eta_predictor",
    "RoutePredictor",
    "route_predictor",
    "FailurePredictor",
    "failure_predictor",
    "ThreatAssessmentEngine",
    "threat_assessment",
    "RecommendationEngine",
    "recommendation_engine",
    "CommandParser",
    "ParsedCommandResult",
    "command_parser",
    "MissionAdvisorEngine",
    "MissionAdvisor",
    "mission_advisor",
    "SensorFusionEngine",
    "SensorFusion",
    "sensor_fusion",
    "TargetTracker",
    "target_tracker",
    "AIAuditLogger",
    "ai_audit_logger",
    "AIManager",
    "ai_manager",
]
