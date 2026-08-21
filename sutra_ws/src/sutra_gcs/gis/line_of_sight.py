"""
SUTRA GCS — 3D Line-of-Sight (LOS) Ray Tracer
"""

from typing import List, Dict, Any


class LineOfSightAnalyzer:
    """Calculates optical line of sight over terrain obstacles."""

    @staticmethod
    def check_los(profile: List[Dict[str, float]], gcs_alt_msl: float, drone_alt_msl: float) -> Dict[str, Any]:
        num_samples = len(profile)
        if num_samples < 2:
            return {"clear": True, "min_clearance_m": 100.0}

        min_clearance = float("inf")
        is_clear = True

        for i, pt in enumerate(profile):
            fraction = i / (num_samples - 1)
            los_ray_alt = gcs_alt_msl + fraction * (drone_alt_msl - gcs_alt_msl)
            terrain_alt = pt["elevation_m"]
            clearance = los_ray_alt - terrain_alt
            if clearance < min_clearance:
                min_clearance = clearance
            if clearance <= 0.0:
                is_clear = False

        return {
            "clear": is_clear,
            "min_clearance_m": round(min_clearance, 2)
        }


los_analyzer = LineOfSightAnalyzer()
