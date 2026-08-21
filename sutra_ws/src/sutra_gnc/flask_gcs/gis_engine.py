"""
SUTRA GIS & RF Intelligence Engine
Subsystem A & D: Terrain Elevation, RF Line-of-Sight (LOS) & Fresnel Zone Analysis
"""

import math
from typing import List, Dict, Any, Tuple


class GISEngine:
    """
    Computes terrain elevation profiles, RF line-of-sight propagation with Fresnel zone clearance,
    and environmental atmospheric wind vectors.
    """

    def __init__(self, origin_lat: float = 37.774929, origin_lon: float = -122.419416):
        self.origin_lat = origin_lat
        self.origin_lon = origin_lon

        # Simulated terrain elevation map (San Francisco coastal hills model)
        self.base_elevation_msl = 45.0  # meters MSL

    def get_elevation_profile(self, start_lat: float, start_lon: float, end_lat: float, end_lon: float, samples: int = 20) -> List[Dict[str, Any]]:
        """
        Generate a realistic terrain elevation profile along a flight corridor.
        """
        profile = []
        d_lat = (end_lat - start_lat) / samples
        d_lon = (end_lon - start_lon) / samples

        for i in range(samples + 1):
            cur_lat = start_lat + i * d_lat
            cur_lon = start_lon + i * d_lon

            # Synthetic elevation using dual-frequency terrain harmonics
            norm_dist = i / samples
            hill_1 = 35.0 * math.sin(norm_dist * math.pi)
            hill_2 = 15.0 * math.sin(norm_dist * 3 * math.pi)
            elev = self.base_elevation_msl + hill_1 + hill_2

            profile.append({
                "index": i,
                "lat": round(cur_lat, 6),
                "lon": round(cur_lon, 6),
                "distance_pct": round(norm_dist * 100, 1),
                "terrain_elevation_msl": round(elev, 1),
                "safety_clearance_m": round(elev + 25.0, 1)  # recommended minimum flight level
            })

        return profile

    def compute_rf_los(
        self,
        gcs_lat: float,
        gcs_lon: float,
        gcs_alt_msl: float,
        drone_lat: float,
        drone_lon: float,
        drone_alt_msl: float,
        freq_ghz: float = 2.4,
        samples: int = 20
    ) -> Dict[str, Any]:
        """
        Compute Radio Frequency (RF) Line-of-Sight and 1st Fresnel Zone clearance.
        Fresnel Zone Radius: F1 = 8.656 * sqrt( (d1 * d2) / (f_GHz * (d1 + d2)) ) in meters.
        """
        # Distance calculation
        dn = (drone_lat - gcs_lat) * 111139.0
        de = (drone_lon - gcs_lon) * (111139.0 * math.cos(math.radians(gcs_lat)))
        total_dist_m = math.sqrt(dn**2 + de**2)

        terrain_profile = self.get_elevation_profile(gcs_lat, gcs_lon, drone_lat, drone_lon, samples)

        los_points = []
        is_los_clear = True
        min_clearance_m = 999.0

        for pt in terrain_profile:
            ratio = pt["distance_pct"] / 100.0
            d1 = total_dist_m * ratio
            d2 = total_dist_m * (1.0 - ratio)

            # Direct LOS beam altitude at this point
            beam_alt = gcs_alt_msl + ratio * (drone_alt_msl - gcs_alt_msl)

            # 1st Fresnel Zone Radius
            if total_dist_m > 1.0 and freq_ghz > 0.1:
                fresnel_r = 8.656 * math.sqrt((d1 * d2) / (freq_ghz * total_dist_m))
            else:
                fresnel_r = 1.0

            clearance = (beam_alt - fresnel_r) - pt["terrain_elevation_msl"]
            if clearance < min_clearance_m:
                min_clearance_m = clearance

            if clearance < 0:
                is_los_clear = False

            los_points.append({
                "distance_m": round(d1, 1),
                "beam_alt_msl": round(beam_alt, 1),
                "fresnel_radius_m": round(fresnel_r, 1),
                "terrain_alt_msl": pt["terrain_elevation_msl"],
                "clearance_m": round(clearance, 1)
            })

        # Calculate estimated link margin & RSSI (Free Space Path Loss)
        # FSPL(dB) = 20*log10(d_km) + 20*log10(f_MHz) + 32.44
        d_km = max(0.01, total_dist_m / 1000.0)
        f_mhz = freq_ghz * 1000.0
        fspl_db = 20 * math.log10(d_km) + 20 * math.log10(f_mhz) + 32.44
        tx_power_dbm = 20.0  # 100mW Mesh Radio
        estimated_rssi = tx_power_dbm - fspl_db + 6.0  # +6dBi antenna gain

        return {
            "total_distance_m": round(total_dist_m, 1),
            "freq_ghz": freq_ghz,
            "is_los_clear": is_los_clear,
            "min_fresnel_clearance_m": round(min_clearance_m, 2),
            "path_loss_db": round(fspl_db, 1),
            "estimated_rssi_dbm": round(estimated_rssi, 1),
            "link_status": "EXCELLENT" if estimated_rssi > -70 and is_los_clear else ("DEGRADED" if is_los_clear else "BLOCKED"),
            "profile": los_points
        }

    def get_weather_conditions(self) -> Dict[str, Any]:
        """Simulated real-time atmospheric & wind vector data."""
        return {
            "wind_speed_mps": 3.8,
            "wind_direction_deg": 245,  # West-Southwest
            "wind_gust_mps": 6.2,
            "temperature_c": 19.4,
            "humidity_pct": 62,
            "pressure_hpa": 1014.2,
            "visibility_km": 15.0,
            "flyability_index": "OPTIMAL (GREEN)"
        }
