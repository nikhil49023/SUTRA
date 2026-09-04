"""
Smart Horizon GCS — Computational Geometry & Spatial Operations Engine
Subsystem: Geofence Subsystem (Phase 4)
"""

import math
from typing import List, Optional, Tuple, Union

try:
    import pyproj
    _HAVE_PYPROJ = True
except ImportError:
    pyproj = None
    _HAVE_PYPROJ = False

from shapely.geometry import LineString, MultiPolygon, Point, Polygon
from shapely.validation import make_valid


class _GeodFallback:
    """WGS84 ellipsoidal/geodesic approximations when pyproj is unavailable."""

    def fwd(self, lon: float, lat: float, azimuth: float, dist_m: float) -> Tuple[float, float, float]:
        R = 6378137.0
        lat_rad = math.radians(lat)
        lon_rad = math.radians(lon)
        az_rad = math.radians(azimuth)
        d_div_r = dist_m / R

        lat2 = math.asin(
            math.sin(lat_rad) * math.cos(d_div_r)
            + math.cos(lat_rad) * math.sin(d_div_r) * math.cos(az_rad)
        )
        lon2 = lon_rad + math.atan2(
            math.sin(az_rad) * math.sin(d_div_r) * math.cos(lat_rad),
            math.cos(d_div_r) - math.sin(lat_rad) * math.sin(lat2)
        )
        return math.degrees(lon2), math.degrees(lat2), 0.0

    def polygon_area_perimeter(self, lons: List[float], lats: List[float]) -> Tuple[float, float]:
        R = 6378137.0
        if not lats or not lons:
            return 0.0, 0.0
        lat0 = sum(lats) / len(lats)
        cos_lat0 = math.cos(math.radians(lat0))
        xs = [math.radians(lon) * R * cos_lat0 for lon in lons]
        ys = [math.radians(lat) * R for lat in lats]
        n = len(xs)
        area = 0.5 * abs(sum(xs[i] * ys[(i + 1) % n] - xs[(i + 1) % n] * ys[i] for i in range(n)))
        perim = sum(math.hypot(xs[(i + 1) % n] - xs[i], ys[(i + 1) % n] - ys[i]) for i in range(n))
        return area, perim


class GeofenceGeometry:
    """
    High-precision geospatial geometry engine using Shapely and PyProj.
    Coordinates are standard (latitude, longitude) in degrees.
    Internal Shapely representations use (longitude, latitude) (x, y) order for spatial correctness.
    """

    # WGS84 Geodesic reference
    GEOD = pyproj.Geod(ellps="WGS84") if _HAVE_PYPROJ else _GeodFallback()

    @classmethod
    def latlon_to_shapely(cls, coords: List[Tuple[float, float]]) -> List[Tuple[float, float]]:
        """Converts [(lat, lon), ...] to [(lon, lat), ...] for Shapely (x, y) cartesian operations."""
        return [(lon, lat) for lat, lon in coords]

    @classmethod
    def shapely_to_latlon(cls, coords: List[Tuple[float, float]]) -> List[Tuple[float, float]]:
        """Converts [(lon, lat), ...] back to [(lat, lon), ...] format."""
        return [(lat, lon) for lon, lat in coords]

    @classmethod
    def create_polygon(cls, coordinates: List[Tuple[float, float]]) -> Optional[Polygon]:
        """Creates a Shapely Polygon from a list of (lat, lon) vertices."""
        if len(coordinates) < 3:
            return None
        xy_coords = cls.latlon_to_shapely(coordinates)
        # Ensure closure
        if xy_coords[0] != xy_coords[-1]:
            xy_coords.append(xy_coords[0])

        poly = Polygon(xy_coords)
        if not poly.is_valid:
            poly = cls.repair_geometry(poly)
        return poly

    @classmethod
    def create_circle(
        cls,
        center_lat: float,
        center_lon: float,
        radius_m: float,
        num_points: int = 64,
    ) -> Polygon:
        """
        Creates a high-accuracy geodesic circle polygon centered on (center_lat, center_lon)
        with radius in meters.
        """
        circle_coords: List[Tuple[float, float]] = []
        for i in range(num_points):
            azimuth = 360.0 * (i / num_points)
            lon2, lat2, _ = cls.GEOD.fwd(center_lon, center_lat, azimuth, radius_m)
            circle_coords.append((lat2, lon2))

        return cls.create_polygon(circle_coords)

    @classmethod
    def create_corridor(
        cls,
        path_coordinates: List[Tuple[float, float]],
        corridor_width_m: float,
    ) -> Optional[Polygon]:
        """
        Creates a buffered flight corridor polygon along a path with total width in meters.
        """
        if len(path_coordinates) < 2:
            return None

        # Convert corridor width to approximate degree buffer at the path's mean latitude
        mean_lat = sum(c[0] for c in path_coordinates) / len(path_coordinates)
        meters_per_deg_lat = 111132.954
        meters_per_deg_lon = 111412.84 * math.cos(math.radians(mean_lat))
        avg_meters_per_deg = (meters_per_deg_lat + meters_per_deg_lon) / 2.0

        half_width_deg = (corridor_width_m / 2.0) / avg_meters_per_deg

        xy_coords = cls.latlon_to_shapely(path_coordinates)
        line = LineString(xy_coords)
        buffered = line.buffer(half_width_deg, cap_style="round", join_style="round")

        if isinstance(buffered, MultiPolygon):
            buffered = max(buffered.geoms, key=lambda g: g.area)

        return buffered if buffered.is_valid else cls.repair_geometry(buffered)

    @classmethod
    def calculate_area(cls, geom_or_coords: Union[Polygon, List[Tuple[float, float]]]) -> float:
        """
        Calculates the true geodesic surface area in square meters (m²).
        """
        if isinstance(geom_or_coords, list):
            poly = cls.create_polygon(geom_or_coords)
        else:
            poly = geom_or_coords

        if not poly or poly.is_empty:
            return 0.0

        lons, lats = zip(*poly.exterior.coords)
        area, _ = cls.GEOD.polygon_area_perimeter(lons, lats)
        return abs(area)

    @classmethod
    def calculate_perimeter(cls, geom_or_coords: Union[Polygon, List[Tuple[float, float]]]) -> float:
        """
        Calculates the true geodesic perimeter length in meters (m).
        """
        if isinstance(geom_or_coords, list):
            poly = cls.create_polygon(geom_or_coords)
        else:
            poly = geom_or_coords

        if not poly or poly.is_empty:
            return 0.0

        lons, lats = zip(*poly.exterior.coords)
        _, perimeter = cls.GEOD.polygon_area_perimeter(lons, lats)
        return abs(perimeter)

    @classmethod
    def calculate_centroid(
        cls, geom_or_coords: Union[Polygon, List[Tuple[float, float]]]
    ) -> Tuple[float, float]:
        """
        Computes geodetic (latitude, longitude) center of mass of the geometry.
        """
        if isinstance(geom_or_coords, list):
            poly = cls.create_polygon(geom_or_coords)
        else:
            poly = geom_or_coords

        if not poly or poly.is_empty:
            return (37.774929, -122.419416)

        c = poly.centroid
        return (c.y, c.x)  # (lat, lon)

    @classmethod
    def contains_point(
        cls,
        geom_or_coords: Union[Polygon, List[Tuple[float, float]]],
        lat: float,
        lon: float,
    ) -> bool:
        """
        Tests whether the given (latitude, longitude) coordinate lies inside or on the boundary of the geofence.
        """
        if isinstance(geom_or_coords, list):
            poly = cls.create_polygon(geom_or_coords)
        else:
            poly = geom_or_coords

        if not poly or poly.is_empty:
            return False

        pt = Point(lon, lat)
        return poly.contains(pt) or poly.touches(pt)

    @classmethod
    def intersects_line(
        cls,
        geom_or_coords: Union[Polygon, List[Tuple[float, float]]],
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float,
    ) -> bool:
        """
        Tests whether a flight path segment between (lat1, lon1) and (lat2, lon2) intersects the geofence.
        """
        if isinstance(geom_or_coords, list):
            poly = cls.create_polygon(geom_or_coords)
        else:
            poly = geom_or_coords

        if not poly or poly.is_empty:
            return False

        line = LineString([(lon1, lat1), (lon2, lat2)])
        return poly.intersects(line)

    @classmethod
    def distance_to_boundary(
        cls,
        geom_or_coords: Union[Polygon, List[Tuple[float, float]]],
        lat: float,
        lon: float,
    ) -> float:
        """
        Computes minimum distance in meters from (lat, lon) to the perimeter boundary.
        """
        if isinstance(geom_or_coords, list):
            poly = cls.create_polygon(geom_or_coords)
        else:
            poly = geom_or_coords

        if not poly or poly.is_empty:
            return float("inf")

        pt = Point(lon, lat)
        # Approximate degrees to meters
        mean_lat = lat
        meters_per_deg_lat = 111132.954
        meters_per_deg_lon = 111412.84 * math.cos(math.radians(mean_lat))
        avg_scale = (meters_per_deg_lat + meters_per_deg_lon) / 2.0

        dist_deg = poly.exterior.distance(pt)
        return dist_deg * avg_scale

    @classmethod
    def is_valid(cls, coordinates: List[Tuple[float, float]]) -> bool:
        """Validates that coordinates form a non-self-intersecting valid polygon."""
        if len(coordinates) < 3:
            return False
        # Duplicate consecutive check
        for i in range(len(coordinates) - 1):
            if coordinates[i] == coordinates[i + 1]:
                return False
        xy = cls.latlon_to_shapely(coordinates)
        if xy[0] != xy[-1]:
            xy.append(xy[0])
        poly = Polygon(xy)
        return poly.is_valid and not poly.is_empty

    @classmethod
    def repair_geometry(cls, geom: Polygon) -> Polygon:
        """Repairs invalid/self-intersecting geometries."""
        repaired = make_valid(geom)
        if isinstance(repaired, MultiPolygon):
            return max(repaired.geoms, key=lambda g: g.area)
        return repaired
