"""
Smart Horizon GCS — RF Propagation, FSPL & Fresnel Coverage Analyzer
Subsystem: GIS Subsystem (Phase 7)
"""

import math
from typing import Any, Dict, List, Optional, Tuple

from mission.route_calculator import RouteCalculator
from .elevation_service import elevation_service, ElevationService
from .models import RFGridPoint, RFLinkResult


class RFCoverageAnalyzer:
    """
    Computes Free Space Path Loss (FSPL), 1st Fresnel zone clearance,
    link margin thresholds, and spatial RF coverage heatmaps.
    """

    def __init__(self, elev_service: ElevationService = elevation_service) -> None:
        self.elevation_service = elev_service

    @classmethod
    def calculate_fspl_db(cls, distance_m: float, freq_mhz: float = 2400.0) -> float:
        """Computes Free Space Path Loss in decibels."""
        d_km = max(0.0001, distance_m / 1000.0)
        return 20.0 * math.log10(d_km) + 20.0 * math.log10(freq_mhz) + 32.44

    @classmethod
    def calculate_fresnel_radius(cls, d1_m: float, d2_m: float, freq_ghz: float = 2.4) -> float:
        """Calculates 1st Fresnel zone semi-minor radius in meters."""
        if d1_m + d2_m <= 0:
            return 0.0
        return 8.656 * math.sqrt((d1_m * d2_m) / (freq_ghz * (d1_m + d2_m)))

    @classmethod
    def estimate_rssi(cls, distance_m: float, tx_power_dbm: float = 20.0, antenna_gain_dbi: float = 3.0) -> float:
        """Calculates estimated received signal strength in dBm."""
        fspl = cls.calculate_fspl_db(distance_m)
        return round(tx_power_dbm + (2 * antenna_gain_dbi) - fspl, 1)

    @classmethod
    def analyze_link(
        cls,
        distance_m: float,
        freq_mhz: float = 2400.0,
        tx_power_dbm: float = 20.0,
        tx_gain_dbi: float = 3.0,
        rx_gain_dbi: float = 3.0,
        rx_sensitivity_dbm: float = -95.0,
        cable_loss_db: float = 1.5,
    ) -> RFLinkResult:
        """
        Comprehensive point-to-point RF budget analysis.
        """
        fspl = cls.calculate_fspl_db(distance_m, freq_mhz)
        rx_power = tx_power_dbm + tx_gain_dbi + rx_gain_dbi - fspl - cable_loss_db
        margin = rx_power - rx_sensitivity_dbm

        if margin >= 25.0:
            quality = "EXCELLENT"
        elif margin >= 15.0:
            quality = "GOOD"
        elif margin >= 5.0:
            quality = "DEGRADED"
        elif margin >= 0.0:
            quality = "CRITICAL"
        else:
            quality = "LOST"

        half_d = max(1.0, distance_m / 2.0)
        fresnel_r = cls.calculate_fresnel_radius(half_d, half_d, freq_mhz / 1000.0)

        return RFLinkResult(
            frequency_mhz=freq_mhz,
            distance_m=round(distance_m, 1),
            fspl_db=round(fspl, 2),
            rx_power_dbm=round(rx_power, 1),
            link_margin_db=round(margin, 1),
            link_quality=quality,
            fresnel_radius_m=round(fresnel_r, 2),
        )

    def generate_coverage_grid(
        self,
        center_lat: float,
        center_lon: float,
        radius_m: float = 3000.0,
        grid_dim: int = 15,
        tx_power_dbm: float = 20.0,
    ) -> List[RFGridPoint]:
        """
        Computes 2D propagation heatmap nodes around transmitter origin.
        """
        grid_points: List[RFGridPoint] = []
        d_lat = radius_m / 111132.0
        d_lon = radius_m / (111132.0 * math.cos(math.radians(center_lat)))

        for r in range(grid_dim):
            lat = center_lat - d_lat + (2 * d_lat * (r / (grid_dim - 1)))
            for c in range(grid_dim):
                lon = center_lon - d_lon + (2 * d_lon * (c / (grid_dim - 1)))
                dist = RouteCalculator.calculate_distance(center_lat, center_lon, lat, lon)

                if dist <= radius_m:
                    res = self.analyze_link(dist, tx_power_dbm=tx_power_dbm)
                    elev = self.elevation_service.get_elevation(lat, lon)
                    grid_points.append(
                        RFGridPoint(
                            latitude=lat,
                            longitude=lon,
                            distance_m=round(dist, 1),
                            elevation_m=round(elev, 1),
                            rx_power_dbm=res.rx_power_dbm,
                            link_margin_db=res.link_margin_db,
                            status=res.link_quality,
                        )
                    )

        return grid_points


# Backward compatibility singleton & alias
RFAnalyzer = RFCoverageAnalyzer
rf_analyzer = RFCoverageAnalyzer()
rf_coverage_analyzer = rf_analyzer

