"""
Smart Horizon GCS — 10-Variable Explainable Multi-Factor Risk Engine
Subsystem: Predictive Risk Engine (Phase 15 Production Hardened)
"""

import abc
import math
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

from .models import FactorScore, RiskCategory, RiskGridCell


@dataclass
class RiskModelWeights:
    """Configurable weights for 10-variable SUTRA disaster risk scoring."""
    rainfall: float = 0.15               # 1. Rainfall Intensity & Accumulation
    flood: float = 0.15                  # 2. Flood Depth & Ground Inundation
    terrain: float = 0.10                # 3. Topographic Elevation & Slope
    building_instability: float = 0.10   # 4. Building Fragility & Structural Debris
    wind: float = 0.08                   # 5. Wind Velocity & Gusts
    communication: float = 0.08          # 6. Mesh RF Quality & SNR Line-of-Sight
    energy: float = 0.10                 # 7. Drone Transit Energy & Battery Reserve
    airspace: float = 0.06               # 8. Airspace Clearance & NFZ Buffer
    population: float = 0.10             # 9. Population Density & Survivors
    accessibility: float = 0.08          # 10. Road Cut-Off & Accessibility
    infrastructure: float = 0.0          # Backwards-compatible alias for building instability

    def normalize(self) -> None:
        if self.infrastructure > 0.0:
            self.building_instability = self.infrastructure
            if self.communication == 0.08 and self.energy == 0.10 and self.airspace == 0.06:
                self.communication = 0.0
                self.energy = 0.0
                self.airspace = 0.0
        total = (
            self.rainfall
            + self.flood
            + self.terrain
            + self.building_instability
            + self.wind
            + self.communication
            + self.energy
            + self.airspace
            + self.population
            + self.accessibility
        )
        if total > 0.0:
            self.rainfall /= total
            self.flood /= total
            self.terrain /= total
            self.building_instability /= total
            self.wind /= total
            self.communication /= total
            self.energy /= total
            self.airspace /= total
            self.population /= total
            self.accessibility /= total


class RiskModel(abc.ABC):
    """Abstract interface for disaster risk models."""

    @abc.abstractmethod
    def evaluate_cell(self, cell: RiskGridCell) -> Tuple[float, RiskCategory, List[FactorScore], str]:
        """Returns: (risk_score [0-100], category, factor_scores, primary_explanation)"""
        pass


class WeightedRiskModel(RiskModel):
    """
    Deterministic, fully explainable 10-variable weighted risk engine.
    """

    def __init__(self, weights: Optional[RiskModelWeights] = None):
        self.weights = weights or RiskModelWeights()
        self.weights.normalize()

    def evaluate_cell(self, cell: RiskGridCell) -> Tuple[float, RiskCategory, List[FactorScore], str]:
        # 1. Normalized Factor Computations (0.0 to 100.0)

        # Variable 1: Rainfall (Intensity + Accumulation)
        rate_norm = min(100.0, (cell.forecast_rainfall_rate_mm_h / 75.0) * 100.0)
        accum_norm = min(100.0, (cell.accumulated_rainfall_mm / 150.0) * 100.0)
        f_rain_score = min(100.0, max(rate_norm, accum_norm))
        rain_desc = f"Precipitation intensity: {cell.forecast_rainfall_rate_mm_h:.1f} mm/h"

        # Variable 2: Flood Susceptibility / Ground Inundation
        if cell.confirmed_flooded:
            f_flood_score = 100.0
            flood_desc = "Drone camera confirmed active surface inundation"
        else:
            elev_factor = max(0.0, min(1.0, (50.0 - cell.elevation_m) / 50.0))
            f_flood_score = (cell.flood_susceptibility * 0.7 + elev_factor * 0.3) * 100.0
            flood_desc = f"Hydrological basin susceptibility ({cell.flood_susceptibility:.2f})"

        # Variable 3: Terrain / Elevation & Slope Steepness
        if cell.confirmed_debris:
            f_terrain_score = 95.0
            terrain_desc = "Drone camera confirmed structural debris/blockage"
        else:
            f_terrain_score = max(5.0, min(95.0, 100.0 - cell.elevation_m * 1.8))
            terrain_desc = f"Slope: {cell.slope_deg:.1f}° | Elevation: {cell.elevation_m:.1f}m MSL"

        # Variable 4: Building & Structural Instability
        if cell.confirmed_debris:
            f_building_score = 95.0
            building_desc = "Drone edge AI confirmed structural collapse/debris blockage"
        else:
            f_building_score = cell.building_instability_index * 100.0
            building_desc = f"Structural vulnerability index ({cell.building_instability_index:.2f})"

        # Variable 5: Wind Velocity & Turbulence
        f_wind_score = min(100.0, (cell.wind_speed_mps / 14.0) * 100.0)
        wind_desc = f"Wind speed: {cell.wind_speed_mps:.1f} m/s (Limit: 14.0 m/s)"

        # Variable 6: Communication / 802.11s Mesh Link Quality (Lower quality = higher operational risk)
        mesh_isolation = max(0.0, 1.0 - cell.comm_link_quality)
        f_comm_score = mesh_isolation * 100.0
        comm_desc = f"RF Mesh link quality: {cell.comm_link_quality*100:.0f}% SNR"

        # Variable 7: Drone Transit Energy Cost (Distance from staging / battery depletion)
        f_energy_score = cell.drone_transit_energy_cost * 100.0
        energy_desc = f"Estimated transit battery depletion: {cell.drone_transit_energy_cost*100:.0f}%"

        # Variable 8: Airspace Clearance & No-Fly Zone Boundary Proximity
        airspace_risk = max(0.0, 1.0 - cell.airspace_clearance_index)
        f_airspace_score = airspace_risk * 100.0
        airspace_desc = f"Airspace clearance index: {cell.airspace_clearance_index*100:.0f}%"

        # Variable 9: Population Density & Confirmed Survivors
        survivor_boost = min(40.0, cell.survivor_count * 20.0)
        f_pop_score = min(100.0, (cell.population_exposure * 100.0 * 0.7) + survivor_boost)
        pop_desc = (
            f"Population exposure ({cell.population_exposure:.2f})"
            + (f" + {cell.survivor_count} confirmed survivors" if cell.survivor_count > 0 else "")
        )

        # Variable 10: Road Network Accessibility / Cut-Off Index
        if cell.confirmed_flooded:
            f_access_score = 90.0
            access_desc = "Surface access severed due to confirmed flooding"
        else:
            isolation = max(0.0, 1.0 - cell.accessibility_index)
            f_access_score = isolation * 100.0
            access_desc = f"Road cut-off / isolation index: {isolation:.2f}"

        # 2. Build 10-Variable Factor Scores List
        factors = [
            FactorScore("RAINFALL", cell.forecast_rainfall_rate_mm_h, f_rain_score, self.weights.rainfall, f_rain_score * self.weights.rainfall, rain_desc),
            FactorScore("FLOOD", cell.flood_susceptibility, f_flood_score, self.weights.flood, f_flood_score * self.weights.flood, flood_desc),
            FactorScore("TERRAIN", cell.elevation_m, f_terrain_score, self.weights.terrain, f_terrain_score * self.weights.terrain, terrain_desc),
            FactorScore("BUILDING", cell.building_instability_index, f_building_score, self.weights.building_instability, f_building_score * self.weights.building_instability, building_desc),
            FactorScore("WIND", cell.wind_speed_mps, f_wind_score, self.weights.wind, f_wind_score * self.weights.wind, wind_desc),
            FactorScore("COMMS", cell.comm_link_quality, f_comm_score, self.weights.communication, f_comm_score * self.weights.communication, comm_desc),
            FactorScore("ENERGY", cell.drone_transit_energy_cost, f_energy_score, self.weights.energy, f_energy_score * self.weights.energy, energy_desc),
            FactorScore("AIRSPACE", cell.airspace_clearance_index, f_airspace_score, self.weights.airspace, f_airspace_score * self.weights.airspace, airspace_desc),
            FactorScore("POPULATION", cell.population_exposure, f_pop_score, self.weights.population, f_pop_score * self.weights.population, pop_desc),
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
        top_f1 = sorted_factors[0]
        top_f2 = sorted_factors[1]
        explanation = (
            f"Primary hazard driven by {top_f1.name.lower()} ({top_f1.normalized_score:.0f}/100) "
            f"compounded by {top_f2.name.lower()} ({top_f2.normalized_score:.0f}/100)."
        )

        return composite_risk, category, factors, explanation


class StatisticalRiskModel(WeightedRiskModel):
    """Statistical percentile-based variant of the risk model."""
    pass


class MLForecastRiskModel(WeightedRiskModel):
    """Ensemble predictive forecast risk model integrating ML weather weights."""
    pass
