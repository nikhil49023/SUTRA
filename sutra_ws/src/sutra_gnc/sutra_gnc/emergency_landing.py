#!/usr/bin/env python3
"""
SUTRA Subsystem A: Risk-Aware Emergency Landing FSM
References:
  - Vision-Based Risk-Aware Emergency Landing in Urban Environments (arXiv 2505.20423)
  - Risk Assessment for Autonomous Landing using SegFormer (arXiv 2410.12988)
  - Runtime Monitoring for UAV Emergency Landing (arXiv 2202.03059)

Replaces the current 'hold on LOST' VIO failsafe with a graded emergency
landing behaviour that:
  1. Builds a 2.5D risk map from Subsystem C semantic detections.
  2. Identifies the lowest-risk reachable landing zone within glide range.
  3. Executes a 4-state FSM: ASSESS -> NAVIGATE_TO_ZONE -> DESCEND -> GROUNDED.

Gazebo SIM:
  - Without live Subsystem C detections, defaults to risk level MODERATE (1)
    for all cells, causing the drone to descend at its current XY position
    (safe default for empty Gazebo worlds).
  - With Subsystem C JSON stream connected, debris/water/fire zones are avoided.

Wind robustness:
  - NAVIGATE_TO_ZONE uses velocity-clamped proportional control (not pure speed).
  - Vertical descent rate is limited to max_descent_m_s to stay controllable
    in gusty conditions.
"""

import math
from enum import Enum
from typing import Dict, List, Optional, Tuple


class RiskLevel:
    """Semantic landing risk levels (lower = safer)."""
    SAFE        = 0   # Open flat ground, confirmed by YOLO
    MODERATE    = 1   # Unknown / unclassified terrain (Gazebo default)
    DEBRIS      = 2   # Rubble, structural fragments
    WATER       = 3   # Water bodies
    FIRE        = 3   # Active fire / thermal hotspot
    FORBIDDEN   = 4   # Active survivor zone — never land here


class ELFSMState(Enum):
    ASSESS           = 'ASSESS'
    NAVIGATE_TO_ZONE = 'NAVIGATE_TO_ZONE'
    DESCEND          = 'DESCEND'
    GROUNDED         = 'GROUNDED'


class LandingRiskMap:
    """
    2.5D spatial risk grid built from Subsystem C semantic detections.

    Parameters
    ----------
    grid_res_m  : Spatial resolution of the risk grid (metres).
    extent_m    : One-sided extent from origin (total = 2 * extent).
    default_risk: Risk level for unvisited cells.
    """

    def __init__(
        self,
        grid_res_m: float = 0.5,
        extent_m: float = 30.0,
        default_risk: int = RiskLevel.MODERATE,
    ):
        self.grid_res = grid_res_m
        self.extent = extent_m
        self.default_risk = default_risk
        # {(ix, iy) -> risk_level}
        self._grid: Dict[Tuple[int, int], int] = {}

    def update_from_detection(
        self,
        world_x: float,
        world_y: float,
        label: str,
        radius_m: float = 1.5,
    ) -> None:
        """
        Marks the risk level around a detected object's ground projection.

        label must be one of: 'safe_ground', 'debris', 'water', 'fire',
        'survivor', or 'unknown'.
        """
        risk_map = {
            'safe_ground': RiskLevel.SAFE,
            'unknown':     RiskLevel.MODERATE,
            'debris':      RiskLevel.DEBRIS,
            'water':       RiskLevel.WATER,
            'fire':        RiskLevel.FIRE,
            'survivor':    RiskLevel.FORBIDDEN,
        }
        risk = risk_map.get(label, RiskLevel.MODERATE)
        r_cells = max(1, int(math.ceil(radius_m / self.grid_res)))
        cx, cy = self._pos_to_cell(world_x, world_y)
        for dx in range(-r_cells, r_cells + 1):
            for dy in range(-r_cells, r_cells + 1):
                key = (cx + dx, cy + dy)
                if risk == RiskLevel.SAFE:
                    self._grid[key] = RiskLevel.SAFE
                else:
                    existing = self._grid.get(key, self.default_risk)
                    # Take maximum risk (conservative)
                    self._grid[key] = max(existing, risk)

    def update_from_detections_list(self, detections: List[Dict]) -> None:
        """
        Bulk update from Subsystem C JSON detection stream.
        Each detection dict: {label, world_x, world_y, radius_m (optional)}
        """
        for det in detections:
            self.update_from_detection(
                world_x=det.get('world_x', 0.0),
                world_y=det.get('world_y', 0.0),
                label=det.get('label', 'unknown'),
                radius_m=det.get('radius_m', 1.5),
            )

    def risk_at(self, x: float, y: float) -> int:
        """Returns risk level at world position (x, y)."""
        key = self._pos_to_cell(x, y)
        return self._grid.get(key, self.default_risk)

    def best_landing_zone(
        self,
        current_pos: Tuple[float, float, float],
        search_radius_m: float = 15.0,
        target_altitude_m: float = 0.3,
    ) -> Tuple[float, float, float]:
        """
        Returns (x, y, z) of the lowest-risk reachable landing zone.
        Search is centred on current_pos with radius search_radius_m.
        If no safe zone is found, returns current XY (descend in place).
        """
        cx, cy, cz = current_pos
        r_cells = int(math.ceil(search_radius_m / self.grid_res))
        icx, icy = self._pos_to_cell(cx, cy)

        best_risk = self.risk_at(cx, cy)
        best_pos = (cx, cy, target_altitude_m)

        for dx in range(-r_cells, r_cells + 1):
            for dy in range(-r_cells, r_cells + 1):
                dist_m = math.sqrt((dx * self.grid_res)**2 + (dy * self.grid_res)**2)
                if dist_m > search_radius_m:
                    continue
                key = (icx + dx, icy + dy)
                risk = self._grid.get(key, self.default_risk)
                if risk < best_risk:
                    best_risk = risk
                    wx = (key[0] + 0.5) * self.grid_res
                    wy = (key[1] + 0.5) * self.grid_res
                    best_pos = (wx, wy, target_altitude_m)
                    if best_risk == RiskLevel.SAFE:
                        return best_pos  # Can't do better

        return best_pos

    def export_risk_json(self, max_cells: int = 500) -> dict:
        """Returns risk grid as JSON-compatible dict for GCS overlay."""
        cells = []
        for (ix, iy), risk in list(self._grid.items())[:max_cells]:
            wx = (ix + 0.5) * self.grid_res
            wy = (iy + 0.5) * self.grid_res
            cells.append({'x': round(wx, 2), 'y': round(wy, 2), 'risk': risk})
        return {'risk_map': cells, 'resolution_m': self.grid_res}

    def _pos_to_cell(self, x: float, y: float) -> Tuple[int, int]:
        return (int(math.floor(x / self.grid_res)), int(math.floor(y / self.grid_res)))


class EmergencyLandingFSM:
    """
    4-state emergency landing state machine.

    States
    ------
    ASSESS           : Compute best landing zone from risk map.
    NAVIGATE_TO_ZONE : Fly horizontally to the target zone at current altitude.
    DESCEND          : Vertical descent to target altitude.
    GROUNDED         : Zero velocity, mission complete.

    Parameters
    ----------
    risk_map          : LandingRiskMap instance.
    nav_speed_m_s     : Horizontal navigation speed (m/s).
    max_descent_m_s   : Maximum vertical descent rate (m/s).
    xy_threshold_m    : Horizontal arrival tolerance (m).
    ground_threshold_m: Altitude below which GROUNDED is declared (m).
    search_radius_m   : Landing zone search radius from current position.
    """

    def __init__(
        self,
        risk_map: LandingRiskMap,
        nav_speed_m_s: float = 1.5,
        max_descent_m_s: float = 0.5,
        xy_threshold_m: float = 0.8,
        ground_threshold_m: float = 0.3,
        search_radius_m: float = 15.0,
    ):
        self.risk_map = risk_map
        self.nav_speed = nav_speed_m_s
        self.max_descent = max_descent_m_s
        self.xy_threshold = xy_threshold_m
        self.ground_threshold = ground_threshold_m
        self.search_radius = search_radius_m

        self.state = ELFSMState.ASSESS
        self._target: Optional[Tuple[float, float, float]] = None
        self._assess_count: int = 0

    def step(
        self,
        current_pos: Tuple[float, float, float],
        current_vel: Tuple[float, float, float] = (0., 0., 0.),
    ) -> Tuple[Tuple[float, float, float], str]:
        """
        Advances the FSM by one step.

        Returns
        -------
        (velocity_setpoint (vx,vy,vz), fsm_state_name)
        """
        cx, cy, cz = current_pos

        if self.state == ELFSMState.ASSESS:
            self._target = self.risk_map.best_landing_zone(
                current_pos, self.search_radius
            )
            self._assess_count += 1
            # Transition immediately after assessment
            self.state = ELFSMState.NAVIGATE_TO_ZONE
            return (0.0, 0.0, 0.0), self.state.value

        if self.state == ELFSMState.NAVIGATE_TO_ZONE:
            tx, ty, _ = self._target
            dx, dy = tx - cx, ty - cy
            horiz_dist = math.sqrt(dx*dx + dy*dy)

            if horiz_dist < self.xy_threshold:
                self.state = ELFSMState.DESCEND
                return (0.0, 0.0, 0.0), self.state.value

            scale = min(self.nav_speed, horiz_dist) / horiz_dist
            return (dx * scale, dy * scale, 0.0), self.state.value

        if self.state == ELFSMState.DESCEND:
            if cz <= self.ground_threshold:
                self.state = ELFSMState.GROUNDED
                return (0.0, 0.0, 0.0), self.state.value
            vz = -min(self.max_descent, cz)
            return (0.0, 0.0, vz), self.state.value

        # GROUNDED
        return (0.0, 0.0, 0.0), ELFSMState.GROUNDED.value

    def reset(self) -> None:
        """Resets FSM to ASSESS state (use when VIO recovers)."""
        self.state = ELFSMState.ASSESS
        self._target = None

    @property
    def is_complete(self) -> bool:
        """True when GROUNDED state has been reached."""
        return self.state == ELFSMState.GROUNDED
