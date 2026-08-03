#!/usr/bin/env python3
"""
SUTRA Subsystem A: 3D OctoMap Voxel Grid Generator Node
Lead Engineer: Rohith Kumar (Subsystem A Lead)

Features:
- Constructs 3D Occupancy Voxel Grid (default resolution: 0.10m).
- Implements raycasting log-odds voxel clearing / decay to prevent stale dynamic obstacle "ghosts".
- Processes depth sensor point clouds / range data into 3D voxel occupancy states.
"""

import math
from typing import List, Tuple, Dict, Set, Optional

try:
    import rclpy
    from rclpy.node import Node
    from sensor_msgs.msg import PointCloud2
    HAS_RCLPY = True
except ImportError:
    HAS_RCLPY = False
    class Node:
        def __init__(self, *args, **kwargs): pass
    class PointCloud2: pass


class VoxelState:
    FREE = 0
    UNKNOWN = 1
    OCCUPIED = 2


class OctoMap3DVoxelGrid:
    """
    3D Voxel Occupancy Grid with 0.10m resolution and raycast log-odds clearing/decay.
    """
    def __init__(
        self,
        resolution_m: float = 0.10,
        l_occupy: float = 0.85,
        l_free: float = -0.40,
        l_min: float = -2.0,
        l_max: float = 3.5,
        occ_threshold: float = 0.5
    ):
        self.resolution = resolution_m
        self.l_occupy = l_occupy
        self.l_free = l_free
        self.l_min = l_min
        self.l_max = l_max
        self.occ_threshold = occ_threshold

        # Dict mapping (vx, vy, vz) -> log_odds float
        self.grid: Dict[Tuple[int, int, int], float] = {}

    def pos_to_voxel(self, x: float, y: float, z: float) -> Tuple[int, int, int]:
        """Convert continuous 3D world position (m) into integer voxel indices."""
        vx = int(math.floor(x / self.resolution))
        vy = int(math.floor(y / self.resolution))
        vz = int(math.floor(z / self.resolution))
        return (vx, vy, vz)

    def voxel_to_pos(self, vx: int, vy: int, vz: int) -> Tuple[float, float, float]:
        """Convert voxel indices back to continuous 3D world center (m)."""
        x = (vx + 0.5) * self.resolution
        y = (vy + 0.5) * self.resolution
        z = (vz + 0.5) * self.resolution
        return (x, y, z)

    def get_voxel_state(self, vx: int, vy: int, vz: int) -> int:
        """Returns VoxelState (FREE, UNKNOWN, OCCUPIED)."""
        key = (vx, vy, vz)
        if key not in self.grid:
            return VoxelState.UNKNOWN
        log_odds = self.grid[key]
        prob = 1.0 - (1.0 / (1.0 + math.exp(log_odds)))
        return VoxelState.OCCUPIED if prob >= self.occ_threshold else VoxelState.FREE

    def bresenham_3d_raycast(
        self,
        start: Tuple[int, int, int],
        end: Tuple[int, int, int]
    ) -> List[Tuple[int, int, int]]:
        """
        Bresenham 3D line algorithm to traverse voxels between sensor origin and target point.
        """
        x1, y1, z1 = start
        x2, y2, z2 = end

        voxels = []
        dx = abs(x2 - x1)
        dy = abs(y2 - y1)
        dz = abs(z2 - z1)

        xs = 1 if x2 > x1 else -1
        ys = 1 if y2 > y1 else -1
        zs = 1 if z2 > z1 else -1

        # Driving axis is X-axis
        if dx >= dy and dx >= dz:
            p1 = 2 * dy - dx
            p2 = 2 * dz - dx
            while x1 != x2:
                voxels.append((x1, y1, z1))
                x1 += xs
                if p1 >= 0:
                    y1 += ys
                    p1 -= 2 * dx
                if p2 >= 0:
                    z1 += zs
                    p2 -= 2 * dx
                p1 += 2 * dy
                p2 += 2 * dz
        # Driving axis is Y-axis
        elif dy >= dx and dy >= dz:
            p1 = 2 * dx - dy
            p2 = 2 * dz - dy
            while y1 != y2:
                voxels.append((x1, y1, z1))
                y1 += ys
                if p1 >= 0:
                    x1 += xs
                    p1 -= 2 * dy
                if p2 >= 0:
                    z1 += zs
                    p2 -= 2 * dy
                p1 += 2 * dx
                p2 += 2 * dz
        # Driving axis is Z-axis
        else:
            p1 = 2 * dy - dz
            p2 = 2 * dx - dz
            while z1 != z2:
                voxels.append((x1, y1, z1))
                z1 += zs
                if p1 >= 0:
                    y1 += ys
                    p1 -= 2 * dz
                if p2 >= 0:
                    x1 += xs
                    p2 -= 2 * dz
                p1 += 2 * dy
                p2 += 2 * dx

        return voxels

    def insert_hit_point(self, origin: Tuple[float, float, float], hit: Tuple[float, float, float]):
        """
        Updates voxel grid with hit point (occupied) and clears traversed voxels (raycasting decay).
        """
        start_v = self.pos_to_voxel(*origin)
        hit_v = self.pos_to_voxel(*hit)

        # Raycast traversed free voxels
        free_voxels = self.bresenham_3d_raycast(start_v, hit_v)
        for v in free_voxels:
            current_log_odds = self.grid.get(v, 0.0)
            new_log_odds = max(self.l_min, current_log_odds + self.l_free)
            self.grid[v] = new_log_odds

        # Update hit voxel as occupied
        current_hit_odds = self.grid.get(hit_v, 0.0)
        self.grid[hit_v] = min(self.l_max, current_hit_odds + self.l_occupy)


class OctoMapGeneratorNode(Node):
    """
    ROS 2 Node for 3D OctoMap generation & raycasting voxel clearing.
    """
    def __init__(self):
        super().__init__('sutra_octomap_generator')
        self.voxel_grid = OctoMap3DVoxelGrid(resolution_m=0.10)
        self.get_logger().info('🧊 SUTRA 3D OctoMap Generator Node Initialized (0.10m resolution).')


def main(args=None):
    if HAS_RCLPY:
        rclpy.init(args=args)
        node = OctoMapGeneratorNode()
        try:
            rclpy.spin(node)
        finally:
            node.destroy_node()
            rclpy.shutdown()


if __name__ == '__main__':
    main()
