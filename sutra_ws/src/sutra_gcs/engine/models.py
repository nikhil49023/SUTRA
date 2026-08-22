"""
Smart Horizon GCS — Mission Execution, Preflight & Risk Domain Models
Subsystem: Mission Engine (Phase 5)
"""

import time
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional


class RiskLevel(str, Enum):
    """
    Airspace and operational flight risk categories.
    """

    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class PreflightItemStatus(str, Enum):
    """
    Status outcome for an individual pre-flight audit check.
    """

    PASS = "PASS"
    WARNING = "WARNING"
    FAIL = "FAIL"


@dataclass(frozen=True)
class PreflightItem:
    """
    Individual pre-flight readiness checklist item.
    """

    name: str
    status: PreflightItemStatus
    message: str
    critical: bool = True


@dataclass(frozen=True)
class PreflightReport:
    """
    Aggregated pre-flight readiness report.
    """

    items: List[PreflightItem] = field(default_factory=list)
    all_passed: bool = True
    has_critical_failures: bool = False


@dataclass(frozen=True)
class BatteryAnalysis:
    """
    Detailed energy consumption and safety reserve analysis.
    """

    estimated_energy_wh: float = 0.0
    estimated_flight_time_sec: float = 0.0
    battery_at_completion_pct: float = 100.0
    battery_reserve_pct: float = 100.0
    rth_reserve_pct: float = 15.0
    rth_safe: bool = True
    status: str = "SAFE"  # SAFE, WARNING, CRITICAL


@dataclass(frozen=True)
class RiskFactor:
    """
    Individual risk contribution factor with weighted score.
    """

    category: str
    score: float  # 0.0 - 100.0
    weight: float
    description: str


@dataclass(frozen=True)
class RiskReport:
    """
    Aggregated mission flight risk evaluation.
    """

    risk_level: RiskLevel = RiskLevel.LOW
    risk_score: float = 0.0
    factors: List[RiskFactor] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)


@dataclass(frozen=True)
class TimelineEvent:
    """
    Chronological operational mission lifecycle event record.
    """

    timestamp: float = field(default_factory=time.time)
    event_type: str = "SYSTEM"
    message: str = ""
    severity: str = "INFO"  # INFO, WARNING, CRITICAL, EMERGENCY
