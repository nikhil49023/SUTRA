"""
SUTRA GCS — Mission Elevation Profiler
"""

import math
from typing import List, Dict, Any
from .terrain import terrain_model


class ElevationProfiler:
    """Samples terrain elevation along straight-line flight paths."""

    @staticmethod
    def sample_path(start_lat: float, start_lon: float, end_lat: float, end_lon: float, num_samples: int = 20) -> List[Dict[str, float]]:
        samples = []
        dlat = (end_lat - start_lat)
        dlon = (end_lon - start_lon)
        total_dist_m = math.sqrt((dlat * 111139.0)**2 + (dlon * 111139.0 * math.cos(math.radians(start_lat)))**2)

        for i in range(num_samples):
            fraction = i / (num_samples - 1) if num_samples > 1 else 0.0
            cur_lat = start_lat + fraction * dlat
            cur_lon = start_lon + fraction * dlon
            dist_along_m = fraction * total_dist_m
            elev = terrain_model.get_elevation_at(cur_lat, cur_lon)
            samples.append({
                "index": i,
                "distance_m": round(dist_along_m, 1),
                "elevation_m": round(elev, 2),
                "lat": cur_lat,
                "lon": cur_lon
            })
        return samples


elevation_profiler = ElevationProfiler()
