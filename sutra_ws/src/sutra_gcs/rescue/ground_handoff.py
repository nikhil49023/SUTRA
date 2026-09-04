"""
Smart Horizon GCS — NDMA Ground Rescue Handoff & Human Rescue Coordination
Connects drone swarm intelligence directly to field disaster response teams.
"""

import time
import uuid
import logging
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict

logger = logging.getLogger("sutra_gcs.rescue.ground_handoff")

@dataclass
class SurvivorReport:
    report_id: str
    survivor_tag: str            # e.g., "SURVIVOR-01"
    latitude: float
    longitude: float
    altitude_agl_m: float
    confidence_score: float      # e.g., 94.8%
    tri_modal_evidence: str      # "FLIR 35.8°C + RGB Silhouette + mmWave Micro-Doppler"
    people_count: int            # e.g., 3 people
    access_difficulty: str       # "Rooftop, flood depth 2.4 m, road completely submerged"
    recommended_method: str      # "NDMA Inflatable Flood Rescue Boat + Winch Harness"
    assigned_team: str           # "NDMA 4th Battalion Rescue Unit (Boat Bravo)"
    dispatch_status: str         # "PENDING" -> "DISPATCHED" -> "EN_ROUTE" -> "ON_SCENE" -> "EXTRACTED"
    dispatched_timestamp: Optional[float] = None
    estimated_arrival_mins: float = 8.5
    cot_xml_payload: str = ""

class GroundRescueHandoffManager:
    """Coordinates survivor findings with NDMA/SDRF ground rescue units."""

    def __init__(self):
        self.reports: Dict[str, SurvivorReport] = {}
        self._init_canonical_reports()

    def _init_canonical_reports(self):
        r1 = SurvivorReport(
            report_id="sar-ndma-01",
            survivor_tag="SAR-ALPHA-ROOFTOP",
            latitude=12.97165,
            longitude=77.59462,
            altitude_agl_m=14.2,
            confidence_score=94.8,
            tri_modal_evidence="Thermal FLIR 35.8°C + Optical Bounding Box (0.96) + mmWave Vitals",
            people_count=3,
            access_difficulty="Rooftop — Flood depth 2.4m — Road inaccessible for heavy vehicles",
            recommended_method="NDMA Inflatable Flood Rescue Boat + Tactical Winch Kit",
            assigned_team="NDMA 4th Battalion Team Bravo (Callsign: RESCUE-04)",
            dispatch_status="PENDING",
            estimated_arrival_mins=8.5,
            cot_xml_payload="""<event version="2.0" uid="SAR-ALPHA-ROOFTOP" type="b-r-f-h-c" how="m-g" time="2026-09-03T19:43:40Z" start="2026-09-03T19:43:40Z" stale="2026-09-03T20:43:40Z"><point lat="12.97165" lon="77.59462" hae="914.2" ce="0.32" le="0.5"/><detail><contact callsign="RESCUE-04"/><remarks>3 survivors rooftop flood 2.4m boat req</remarks></detail></event>""",
        )
        self.reports[r1.report_id] = r1

    def dispatch_ground_team(self, report_id: str, team_name: Optional[str] = None) -> Optional[SurvivorReport]:
        """Dispatches ground rescue unit to survivor GPS coordinates."""
        if report_id in self.reports:
            rep = self.reports[report_id]
            rep.dispatch_status = "DISPATCHED"
            rep.dispatched_timestamp = time.time()
            if team_name:
                rep.assigned_team = team_name
            logger.info(f"🚒 GROUND RESCUE DISPATCHED: {rep.survivor_tag} -> {rep.assigned_team}")
            return rep
        return None

    def get_status_dict(self) -> Dict[str, Any]:
        return {
            "reports": [asdict(r) for r in self.reports.values()],
            "pending_count": sum(1 for r in self.reports.values() if r.dispatch_status == "PENDING"),
            "dispatched_count": sum(1 for r in self.reports.values() if r.dispatch_status != "PENDING"),
        }

# Global singleton
rescue_handoff_manager = GroundRescueHandoffManager()
