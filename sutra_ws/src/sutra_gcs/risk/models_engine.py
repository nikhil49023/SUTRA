"""
Smart Horizon GCS — Explainable Multi-Factor Risk Calculation Engine
Subsystem: Predictive Risk Engine (Configurable, Explainable, Deterministic)
"""

import abc
import math
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

from .models import FactorScore, RiskCategory, RiskGridCell


@dataclass
class RiskModelWeights:
    """Configurable weights for predictive multi-factor disaster scoring."""
    rainfall: float = 0.25
    flood: float = 0.25
    terrain: float = 0.15
    population: float = 0.15
    infrastructure: float = 0.10
    wind: float = 0.05
    accessibility: float = 0.05

    def normalize(self) -> None:
        total = (
            self.rainfall
            + self.flood
            + self.terrain
            + self.population
            + self.infrastructure
            + self.wind
            + self.accessibility
        )
        if total > 0.0:
            self.rainfall /= total
            self.flood /= total
            self.terrain /= total
            self.population /= total
            self.infrastructure /= total
            self.wind /= total
            self.accessibility /= total


class RiskModel(abc.ABC):
    """Abstract interface for disaster risk models."""

    @abc.abstractmethod
    def evaluate_cell(self, cell: RiskGridCell) -> Tuple[float, RiskCategory, List[FactorScore], str]:
        """Returns: (risk_score [0-100], category, factor_scores, primary_explanation)"""
        pass


class WeightedRiskModel(RiskModel):
    """
    Deterministic, fully explainable weighted linear combination model.
    """

    def __init__(self, weights: Optional[RiskModelWeights] = None):
        self.weights = weights or RiskModelWeights()
        self.weights.normalize()

    def evaluate_cell(self, cell: RiskGridCell) -> Tuple[float, RiskCategory, List[FactorScore], str]:
        # 1. Normalized Factor Computations (0.0 to 100.0)

        # Factor 1: Rainfall (Intensity + Accumulation)
        # 0 mm/h = 0, 75+ mm/h = 100
        rate_norm = min(100.0, (cell.forecast_rainfall_rate_mm_h / 75.0) * 100.0)
        accum_norm = min(100.0, (cell.accumulated_rainfall_mm / 150.0) * 100.0)
        f_rain_score = min(100.0, max(rate_norm, accum_norm))

        # Factor 2: Flood Susceptibility (Elevated dramatically if confirmed flooded by UAV)
        if cell.confirmed_flooded:
            f_flood_score = 100.0
            flood_desc = "Drone camera confirmed active surface inundation"
        else:
            # Low elevation + high synthetic susceptibility
            elev_factor = max(0.0, min(1.0, (50.0 - cell.elevation_m) / 50.0))
            f_flood_score = (cell.flood_susceptibility * 0.7 + elev_factor * 0.3) * 100.0
            flood_desc = f"Hydrological basin susceptibility ({cell.flood_susceptibility:.2f})"

        # Factor 3: Terrain / Elevation & Debris
        if cell.confirmed_debris:
            f_terrain_score = 95.0
            terrain_desc = "Drone camera confirmed structural debris/blockage"
        else:
            # Flat lowlands prone to pooling or steep slopes prone to mudslides
            f_terrain_score = max(5.0, min(90.0, 100.0 - cell.elevation_m * 1.8))
            terrain_desc = f"Topographic elevation {cell.elevation_m:.1f}m AGL"

        # Factor 4: Population Exposure (density + confirmed survivors)
        survivor_boost = min(40.0, cell.survivor_count * 20.0)
        f_pop_score = min(100.0, (cell.population_exposure * 100.0 * 0.7) + survivor_boost)
        pop_desc = (
            f"Population index ({cell.population_exposure:.2f})"
            + (f" + {cell.survivor_count} confirmed survivors" if cell.survivor_count > 0 else "")
        )

        # Factor 5: Infrastructure Exposure (Hospitals, Bridges, Roads)
        f_infra_score = cell.infrastructure_exposure * 100.0
        infra_desc = f"Critical infrastructure density ({cell.infrastructure_exposure:.2f})"

        # Factor 6: Wind Hazard (UAV Operational Limit = 12.0 m/s)
        f_wind_score = min(100.0, (cell.wind_speed_mps / 14.0) * 100.0)
        wind_desc = f"Wind speed {cell.wind_speed_mps:.1f} m/s"

        # Factor 7: Accessibility / Isolation (1.0 = clear, 0.0 = isolated)
        isolation = 1.0 - cell.accessibility_index
        f_access_score = isolation * 100.0
        access_desc = f"Surface route isolation index ({isolation:.2f})"

        # 2. Build Factor Scores List
        factors = [
            FactorScore("RAINFALL", cell.forecast_rainfall_rate_mm_h, f_rain_score, self.weights.rainfall, f_rain_score * self.weights.rainfall, f"Forecast: {cell.forecast_rainfall_rate_mm_h:.1f} mm/h"),
            FactorScore("FLOOD", cell.flood_susceptibility, f_flood_score, self.weights.flood, f_flood_score * self.weights.flood, flood_desc),
            FactorScore("TERRAIN", cell.elevation_m, f_terrain_score, self.weights.terrain, f_terrain_score * self.weights.terrain, terrain_desc),
            FactorScore("POPULATION", cell.population_exposure, f_pop_score, self.weights.population, f_pop_score * self.weights.population, pop_desc),
            FactorScore("INFRASTRUCTURE", cell.infrastructure_exposure, f_infra_score, self.weights.infrastructure, f_infra_score * self.weights.infrastructure, infra_desc),
            FactorScore("WIND", cell.wind_speed_mps, f_wind_score, self.weights.wind, f_wind_score * self.weights.wind, wind_desc),
            FactorScore("ACCESSIBILITY", cell.accessibility_index, f_access_score, self.weights.accessibility, f_access_score * self.weights.accessibility, access_desc),
        ]

        # 3. Weighted Summation
        composite_risk = sum(f.weighted_contribution for f in factors)
        composite_risk = max(0.0, min(100.0, composite_risk))

        # 4. Determine Category
        if composite_risk >= 81.0:
            category = RiskCategory.CRITICAL
        elif composite_risk >= 61.0:
            category = RiskCategory.VERY_HIGH
        elif composite_risk >= 41.0:
            category = RiskCategory.HIGH
        elif composite_risk >= 21.0:
            category = RiskCategory.MODERATE
        else:
            category = RiskCategory.LOW

        # 5. Generate Human-Readable Natural Language Explanation
        sorted_factors = sorted(factors, key=lambda f: f.weighted_contribution, reverse=True)
        top_1 = sorted_factors[0]
        top_2 = sorted_factors[1]

        explanation = (
            f"Primary hazard driven by {top_1.name.lower()} ({top_1.normalized_score:.0f}/100) "
            f"compounded by {top_2.name.lower()} ({top_2.normalized_score:.0f}/100)."
        )

        return composite_risk, category, factors, explanation


class StatisticalRiskModel(RiskModel):
    """Statistical extreme-value Gumbel distribution model stub."""
    def evaluate_cell(self, cell: RiskGridCell) -> Tuple[float, RiskCategory, List[FactorScore], str]:
        # Fallback to deterministic model
        return WeightedRiskModel().evaluate_cell(cell)


class MLForecastRiskModel(RiskModel):
    """Machine learning inference model interface stub."""
    def evaluate_cell(self, cell: RiskGridCell) -> Tuple[float, RiskCategory, List[FactorScore], str]:
        # Fallback to deterministic model
        return WeightedRiskModel().evaluate_cell(cell)
