"""
SUTRA GCS — RF Propagation & 1st Fresnel Zone Analyzer
"""

import math
from typing import Dict, Any, List


class RFAnalyzer:
    """Calculates 1st Fresnel Zone (F1) radius, Free Space Path Loss, and RSSI."""

    @staticmethod
    def calculate_fresnel_radius(d1_m: float, d2_m: float, freq_ghz: float = 2.4) -> float:
        if d1_m + d2_m <= 0:
            return 0.0
        return 8.656 * math.sqrt((d1_m * d2_m) / (freq_ghz * (d1_m + d2_m)))

    @staticmethod
    def calculate_fspl_db(distance_m: float, freq_mhz: float = 2400.0) -> float:
        d_km = max(0.001, distance_m / 1000.0)
        return 20.0 * math.log10(d_km) + 20.0 * math.log10(freq_mhz) + 32.44

    @staticmethod
    def estimate_rssi(distance_m: float, tx_power_dbm: float = 20.0, antenna_gain_dbi: float = 3.0) -> float:
        fspl = RFAnalyzer.calculate_fspl_db(distance_m)
        return round(tx_power_dbm + (2 * antenna_gain_dbi) - fspl, 1)


rf_analyzer = RFAnalyzer()
