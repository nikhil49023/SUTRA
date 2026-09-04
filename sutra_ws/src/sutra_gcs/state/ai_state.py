"""
Smart Horizon GCS — AI Intelligence, Decision Support & Predictive State Model
Subsystem: State Management (Phase 10)
"""

import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class AIMode(str, Enum):
    DISABLED = "DISABLED"
    ADVISORY = "ADVISORY"
    SIMULATION = "SIMULATION"
    ASSISTED = "ASSISTED"


class AIAnalysisStatus(str, Enum):
    IDLE = "IDLE"
    ANALYZING = "ANALYZING"
    COMPLETED = "COMPLETED"
    DEGRADED = "DEGRADED"
    ERROR = "ERROR"


class RecommendationSeverity(str, Enum):
    EMERGENCY = "EMERGENCY"
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


@dataclass(frozen=True)
class BatteryPrediction:
    drone_id: str
    current_battery_pct: float
    predicted_landing_pct: float
    predicted_rth_pct: float
    discharge_rate_pct_per_min: float
    reserve_margin_pct: float
    is_anomaly: bool = False
    confidence: float = 0.90
    timestamp: float = field(default_factory=time.time)


@dataclass(frozen=True)
class ETAPrediction:
    drone_id: str
    eta_to_next_waypoint_sec: float
    eta_to_mission_end_sec: float
    eta_to_home_sec: float
    estimated_distance_remaining_m: float
    average_speed_mps: float
    confidence: float = 0.88
    timestamp: float = field(default_factory=time.time)


@dataclass(frozen=True)
class RouteRiskReport:
    mission_name: str
    risk_level: str  # LOW, MEDIUM, HIGH, CRITICAL
    hazard_count: int
    terrain_clearance_issues: List[str] = field(default_factory=list)
    geofence_proximity_warnings: List[str] = field(default_factory=list)
    rf_weak_segments: List[str] = field(default_factory=list)
    confidence: float = 0.85
    timestamp: float = field(default_factory=time.time)


@dataclass(frozen=True)
class FailurePrediction:
    prediction_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    drone_id: str = "drone_alpha"
    subsystem: str = "POWER"  # POWER, GPS, COMM, PROPULSION, SENSORS
    failure_type: str = "BATTERY_DEGRADATION"
    severity: RecommendationSeverity = RecommendationSeverity.MEDIUM
    probability: float = 0.15
    confidence: float = 0.82
    evidence: str = "Nominal discharge curve"
    timestamp: float = field(default_factory=time.time)


@dataclass(frozen=True)
class ThreatItem:
    threat_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    label: str = "OBSTACLE"
    severity: RecommendationSeverity = RecommendationSeverity.MEDIUM
    latitude: float = 0.0
    longitude: float = 0.0
    altitude_m: float = 0.0
    distance_m: float = 0.0
    source: str = "GIS_ELEVATION"
    confidence: float = 0.90
    timestamp: float = field(default_factory=time.time)


@dataclass(frozen=True)
class RecommendationItem:
    recommendation_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    title: str = "NOMINAL FLIGHT"
    message: str = "All parameters within standard mission flight envelope."
    reason: str = "Nominal battery and geofence clearance."
    severity: RecommendationSeverity = RecommendationSeverity.INFO
    suggested_action: Optional[str] = None  # e.g. "RTL", "HOLD", "ASCEND_10M"
    requires_operator_approval: bool = False
    status: str = "PENDING"  # PENDING, ACCEPTED, REJECTED, DISMISSED
    confidence: float = 0.90
    source: str = "mission_advisor"
    timestamp: float = field(default_factory=time.time)


@dataclass(frozen=True)
class TrackedTarget:
    target_id: str
    label: str
    latitude: float
    longitude: float
    altitude_m: float
    speed_mps: float = 0.0
    heading_deg: float = 0.0
    confidence: float = 1.0
    source: str = "PERCEPTION"
    drone_id: Optional[str] = None
    world_id: str = "WORLD_1"
    modalities: List[str] = field(default_factory=list)
    tracking_status: str = "TRACKED"
    history: List[Dict[str, Any]] = field(default_factory=list)
    first_seen: float = field(default_factory=time.time)
    last_seen: float = field(default_factory=time.time)
    bbox: Optional[List[float]] = None
    norm_bbox: Optional[List[float]] = None



@dataclass(frozen=True)
class AssistantMessage:
    msg_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    sender: str = "USER"  # USER, ASSISTANT, SYSTEM
    text: str = ""
    confidence: Optional[float] = None
    timestamp: float = field(default_factory=time.time)


@dataclass(frozen=True)
class AIState:
    """
    Single-source-of-truth state container for all AI predictions, recommendations,
    threat matrices, and operator decision requests.
    """

    enabled: bool = True
    mode: AIMode = AIMode.ADVISORY
    analysis_status: AIAnalysisStatus = AIAnalysisStatus.IDLE
    last_update: float = field(default_factory=time.time)
    battery_predictions: Dict[str, BatteryPrediction] = field(default_factory=dict)
    eta_predictions: Dict[str, ETAPrediction] = field(default_factory=dict)
    route_prediction: Optional[RouteRiskReport] = None
    risk_assessment: str = "LOW"
    failure_predictions: List[FailurePrediction] = field(default_factory=list)
    recommendations: List[RecommendationItem] = field(default_factory=list)
    threats: List[ThreatItem] = field(default_factory=list)
    tracked_targets: List[TrackedTarget] = field(default_factory=list)
    assistant_messages: List[AssistantMessage] = field(default_factory=list)
    overall_confidence: float = 0.88
    last_error: Optional[str] = None


ai_state = AIState()
