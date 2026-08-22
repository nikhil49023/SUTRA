"""
Smart Horizon GCS — Tactical Swarm Formation Computational Geometry Engine
Subsystem: Swarm Fleet Management (Phase 6)
"""

import math
from typing import Dict, List, Optional, Tuple

from .models import FormationType, TargetPosition


class FormationCalculator:
    """
    High-precision geodesic formation geometry calculator.
    Converts local body-frame tactical coordinates into geodetic WGS-84 setpoints
    accounting for aircraft heading, inter-UAV spacing, and geometry shapes.
    """

    # Meters per degree latitude at equator
    METERS_PER_DEG_LAT = 111132.954

    @classmethod
    def calculate_targets(
        cls,
        leader_id: str,
        leader_lat: float,
        leader_lon: float,
        leader_alt: float,
        leader_heading: float,
        drone_ids: List[str],
        formation_type: str = "V_FORMATION",
        spacing_m: float = 25.0,
        formation_heading: Optional[float] = None,
    ) -> Dict[str, TargetPosition]:
        """
        Calculates TargetPosition for every drone in the fleet.
        The leader is positioned at the formation origin (0, 0).
        Followers receive precise spatial geodetic targets.
        """
        targets: Dict[str, TargetPosition] = {}

        # Effective formation heading (degrees)
        eff_heading = leader_heading if formation_heading is None else formation_heading
        heading_rad = math.radians(eff_heading)

        # Separate leader and followers
        followers = [d_id for d_id in drone_ids if d_id != leader_id]

        # 1. Leader target is the formation reference origin
        targets[leader_id] = TargetPosition(
            drone_id=leader_id,
            latitude=leader_lat,
            longitude=leader_lon,
            altitude=leader_alt,
            heading=eff_heading,
            formation_index=0,
            offset_x=0.0,
            offset_y=0.0,
        )

        if not followers:
            return targets

        # 2. Compute Body-Frame Offsets (x_body = right, y_body = forward in meters)
        body_offsets = cls._get_body_offsets(formation_type, len(followers), spacing_m)

        # Longitude scale factor at current latitude
        lat_rad = math.radians(leader_lat)
        meters_per_deg_lon = cls.METERS_PER_DEG_LAT * math.cos(lat_rad)
        if abs(meters_per_deg_lon) < 1.0:
            meters_per_deg_lon = 1.0

        # 3. Rotate Body Offsets by Heading into East-North-Up (ENU) Coordinates
        for idx, f_id in enumerate(followers):
            x_b, y_b, z_b = body_offsets[idx]

            # Rotate: North = y_b * cos(psi) - x_b * sin(psi), East = y_b * sin(psi) + x_b * cos(psi)
            north_m = (y_b * math.cos(heading_rad)) - (x_b * math.sin(heading_rad))
            east_m = (y_b * math.sin(heading_rad)) + (x_b * math.cos(heading_rad))

            d_lat = north_m / cls.METERS_PER_DEG_LAT
            d_lon = east_m / meters_per_deg_lon

            t_lat = leader_lat + d_lat
            t_lon = leader_lon + d_lon
            t_alt = leader_alt + z_b

            targets[f_id] = TargetPosition(
                drone_id=f_id,
                latitude=t_lat,
                longitude=t_lon,
                altitude=t_alt,
                heading=eff_heading,
                formation_index=idx + 1,
                offset_x=east_m,
                offset_y=north_m,
            )

        return targets

    @classmethod
    def _get_body_offsets(
        cls, formation_type: str, count: int, s: float
    ) -> List[Tuple[float, float, float]]:
        """
        Generates relative body-frame Cartesian offsets (x_right, y_forward, z_up) for followers.
        """
        f = formation_type.upper().replace(" ", "_")
        offsets: List[Tuple[float, float, float]] = []

        if f == "LINE":
            # Lateral line abreast (+x = right, -x = left)
            for i in range(count):
                pair = (i // 2) + 1
                sign = -1.0 if (i % 2 == 0) else 1.0
                offsets.append((sign * pair * s, 0.0, 0.0))

        elif f == "COLUMN":
            # Trail column behind leader (-y = aft)
            for i in range(count):
                offsets.append((0.0, -(i + 1) * s, 0.0))

        elif f == "V_FORMATION":
            # Tactical V / Wedge (Leader at apex, followers alternate left/right behind)
            for i in range(count):
                rank = (i // 2) + 1
                sign = -1.0 if (i % 2 == 0) else 1.0
                offsets.append((sign * rank * s, -rank * s, 0.0))

        elif f == "DIAMOND":
            # Diamond geometry
            diamond_pattern = [
                (-s, -s, 0.0),      # 1: Left Wing
                (s, -s, 0.0),       # 2: Right Wing
                (0.0, -2.0 * s, 0.0), # 3: Aft Tail
            ]
            for i in range(count):
                if i < len(diamond_pattern):
                    offsets.append(diamond_pattern[i])
                else:
                    ring = (i - 3) // 4 + 2
                    sub = (i - 3) % 4
                    if sub == 0:
                        offsets.append((-ring * s, -ring * s, 0.0))
                    elif sub == 1:
                        offsets.append((ring * s, -ring * s, 0.0))
                    elif sub == 2:
                        offsets.append((0.0, -2.0 * ring * s, 0.0))
                    else:
                        offsets.append((0.0, ring * s, 0.0))

        elif f == "ECHELON_LEFT":
            # Echelon Left (Diagonal back-left)
            for i in range(count):
                rank = i + 1
                offsets.append((-rank * s, -rank * s, 0.0))

        elif f == "ECHELON_RIGHT":
            # Echelon Right (Diagonal back-right)
            for i in range(count):
                rank = i + 1
                offsets.append((rank * s, -rank * s, 0.0))

        elif f == "CIRCLE":
            # Radial orbit around leader
            radius = max(s, (s * count) / (2.0 * math.pi))
            for i in range(count):
                angle = (2.0 * math.pi * i) / count
                offsets.append((radius * math.sin(angle), radius * math.cos(angle), 0.0))

        elif f == "GRID":
            # 2D Grid behind leader
            cols = math.ceil(math.sqrt(count + 1))
            for i in range(count):
                r = (i + 1) // cols
                c = (i + 1) % cols
                offsets.append(((c - (cols - 1) / 2.0) * s, -r * s, 0.0))

        else:
            # Custom default (staggered echelon)
            for i in range(count):
                rank = i + 1
                offsets.append((rank * s * 0.7, -rank * s, 0.0))

        return offsets


# Global singleton
formation_calc = FormationCalculator()
