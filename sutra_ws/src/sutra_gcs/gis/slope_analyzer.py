"""
Smart Horizon GCS — Terrain Slope & Surface Incline Analyzer
Subsystem: GIS Subsystem (Phase 7)
"""

import math
from typing import List, Optional

from .models import ElevationPoint, ElevationProfileReport, SlopeAnalysisReport, SlopeCategory


class SlopeAnalyzer:
    """
    Computes terrain gradient percentages and slope angles along sampled elevation profiles.
    """

    # Configurable Slope Thresholds in Degrees
    LOW_THRESHOLD_DEG: float = 10.0
    MODERATE_THRESHOLD_DEG: float = 20.0
    HIGH_THRESHOLD_DEG: float = 35.0

    @classmethod
    def analyze_profile_slope(cls, report: ElevationProfileReport) -> SlopeAnalysisReport:
        samples = report.samples
        if len(samples) < 2:
            pt = samples[0] if samples else ElevationPoint(0.0, 0.0, 0.0)
            return SlopeAnalysisReport(
                avg_slope_deg=0.0,
                max_slope_deg=0.0,
                steepest_point=pt,
                category=SlopeCategory.LOW,
            )

        slopes_deg: List[float] = []
        max_slope = 0.0
        steepest_pt = samples[0]

        for i in range(len(samples) - 1):
            p1 = samples[i]
            p2 = samples[i + 1]

            d_dist = abs(p2.distance_along_m - p1.distance_along_m)
            d_elev = abs(p2.elevation_m - p1.elevation_m)

            if d_dist > 0.01:
                slope_rad = math.atan(d_elev / d_dist)
                slope_deg = math.degrees(slope_rad)
                slopes_deg.append(slope_deg)

                if slope_deg > max_slope:
                    max_slope = slope_deg
                    steepest_pt = p2

        avg_slope = sum(slopes_deg) / len(slopes_deg) if slopes_deg else 0.0

        if max_slope > cls.HIGH_THRESHOLD_DEG:
            cat = SlopeCategory.VERY_HIGH
        elif max_slope > cls.MODERATE_THRESHOLD_DEG:
            cat = SlopeCategory.HIGH
        elif max_slope > cls.LOW_THRESHOLD_DEG:
            cat = SlopeCategory.MODERATE
        else:
            cat = SlopeCategory.LOW

        return SlopeAnalysisReport(
            avg_slope_deg=round(avg_slope, 1),
            max_slope_deg=round(max_slope, 1),
            steepest_point=steepest_pt,
            category=cat,
        )


# Global singleton
slope_analyzer = SlopeAnalyzer()
