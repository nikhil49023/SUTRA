#!/usr/bin/env python3
"""
Project SUTRA — Subsystem A: 3D Voxel OctoMap Grid Generator Node
==================================================================
Author: Tech Lead Nikhil (Subsystem A)

Features:
- Subscribes to 3D depth camera PointCloud2 topic /uav_alpha/points (and /points fallback).
- Processes and discretizes 3D point cloud into a 0.10m 3D voxel occupancy grid.
- Publishes visualization_msgs/MarkerArray to /octomap_markers and /uav_alpha/octomap_markers.
- Color-codes 3D voxels by altitude for high-visibility visual feedback.
"""

import math
import struct
from typing import Dict, List, Tuple, Set, Union

import numpy as np
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import PointCloud2, PointField
from visualization_msgs.msg import Marker, MarkerArray
from geometry_msgs.msg import Point
from std_msgs.msg import ColorRGBA


def parse_point_cloud2_xyz(msg: PointCloud2) -> np.ndarray:
    """
    Parses sensor_msgs/PointCloud2 binary message into (N, 3) NumPy array of (x, y, z) points.
    Uses np.frombuffer with structured dtypes for high-performance 3D point cloud unpacking.
    """
    field_offsets = {}
    for field in msg.fields:
        if field.name in ['x', 'y', 'z']:
            field_offsets[field.name] = field.offset

    if not ('x' in field_offsets and 'y' in field_offsets and 'z' in field_offsets):
        return np.empty((0, 3), dtype=np.float32)

    x_off = field_offsets['x']
    y_off = field_offsets['y']
    z_off = field_offsets['z']
    point_step = msg.point_step
    data = msg.data
    total_points = msg.width * msg.height

    if total_points == 0 or len(data) < point_step:
        return np.empty((0, 3), dtype=np.float32)

    step = max(1, total_points // 1000)

    try:
        num_points = min(total_points, len(data) // point_step)
        if num_points == 0:
            return np.empty((0, 3), dtype=np.float32)

        arr_dtype = np.dtype({
            'names': ['x', 'y', 'z'],
            'formats': ['<f4', '<f4', '<f4'],
            'offsets': [x_off, y_off, z_off],
            'itemsize': point_step
        })

        raw_struct = np.frombuffer(data, dtype=arr_dtype, count=num_points)
        if step > 1:
            raw_struct = raw_struct[::step]

        points = np.column_stack((raw_struct['x'], raw_struct['y'], raw_struct['z']))

        valid_mask = ~np.isnan(points).any(axis=1)
        return points[valid_mask]
    except Exception:
        # Fallback unpacker using struct if buffer unpacking fails
        points_list = []
        for i in range(0, total_points, step):
            offset = i * point_step
            if offset + max(x_off, y_off, z_off) + 4 <= len(data):
                try:
                    x = struct.unpack_from('<f', data, offset + x_off)[0]
                    y = struct.unpack_from('<f', data, offset + y_off)[0]
                    z = struct.unpack_from('<f', data, offset + z_off)[0]
                    if not (math.isnan(x) or math.isnan(y) or math.isnan(z)):
                        points_list.append((x, y, z))
                except struct.error:
                    continue
        if not points_list:
            return np.empty((0, 3), dtype=np.float32)
        return np.array(points_list, dtype=np.float32)


class OctoMapVoxelGrid:
    """
    3D Occupancy Voxel Grid with default 0.10m resolution (configurable down to 0.05m).
    """

    def __init__(self, resolution: float = 0.10):
        self.resolution = max(0.05, float(resolution))
        self.occupied_voxels: Set[Tuple[int, int, int]] = set()

    def update_from_points(self, points: Union[np.ndarray, List[Tuple[float, float, float]]]):
        """
        Discretizes 3D points into occupied voxel set using vectorized NumPy operations.
        """
        self.occupied_voxels.clear()
        if points is None or len(points) == 0:
            return

        res = self.resolution
        pts_arr = np.asarray(points, dtype=np.float32)
        if pts_arr.size == 0 or pts_arr.ndim != 2 or pts_arr.shape[1] != 3:
            return

        voxels = np.floor(pts_arr / res).astype(int)
        self.occupied_voxels = set(map(tuple, voxels))

    def get_voxel_centers(self) -> List[Tuple[float, float, float]]:
        """
        Returns (x, y, z) center coordinates of all occupied 3D voxels.
        """
        if not self.occupied_voxels:
            return []
        res = self.resolution
        half_res = res / 2.0
        vox_arr = np.array(list(self.occupied_voxels), dtype=np.float32)
        centers_arr = vox_arr * res + half_res
        return [(float(c[0]), float(c[1]), float(c[2])) for c in centers_arr]


class OctoMapGeneratorNode(Node):
    """
    ROS 2 Node generating 0.10m 3D Voxel OctoMap MarkerArray from PointCloud2 input.
    """

    def __init__(self):
        super().__init__("octomap_generator_node")

        self.declare_parameter("drone_id", "uav_alpha")
        self.declare_parameter("voxel_resolution", 0.10)  # 0.10m resolution default

        self.drone_id = self.get_parameter("drone_id").value
        self.resolution = max(0.05, float(self.get_parameter("voxel_resolution").value))

        self.grid = OctoMapVoxelGrid(resolution=self.resolution)

        # Publishers
        self.pub_markers = self.create_publisher(
            MarkerArray, "/octomap_markers", 10
        )
        self.pub_drone_markers = self.create_publisher(
            MarkerArray, f"/{self.drone_id}/octomap_markers", 10
        )

        # Subscriptions
        self.sub_cloud = self.create_subscription(
            PointCloud2, f"/{self.drone_id}/points", self._cloud_cb, 10
        )
        self.sub_cloud_fallback = self.create_subscription(
            PointCloud2, "/uav_alpha/points", self._cloud_cb, 10
        )
        self.sub_lidar = self.create_subscription(
            PointCloud2, f"/{self.drone_id}/lidar/points", self._cloud_cb, 10
        )
        self.sub_lidar_fallback = self.create_subscription(
            PointCloud2, "/uav_alpha/lidar/points", self._cloud_cb, 10
        )
        self.sub_cloud_gen_fallback = self.create_subscription(
            PointCloud2, "/points", self._cloud_cb, 10
        )

        self.get_logger().info(
            f"🧊 3D Voxel OctoMap Generator Node Initialized [{self.drone_id}] | Resolution: {self.resolution:.2f}m"
        )

    def _cloud_cb(self, msg: PointCloud2):
        points = parse_point_cloud2_xyz(msg)
        self.grid.update_from_points(points)
        self.publish_voxel_markers(msg.header.frame_id or "world")

    def publish_voxel_markers(self, frame_id: str):
        voxel_centers = self.grid.get_voxel_centers()

        marker_array = MarkerArray()
        marker = Marker()
        marker.header.stamp = self.get_clock().now().to_msg()
        marker.header.frame_id = frame_id
        marker.ns = "octomap_voxels"
        marker.id = 0
        marker.type = Marker.CUBE_LIST
        marker.action = Marker.ADD

        marker.scale.x = self.resolution
        marker.scale.y = self.resolution
        marker.scale.z = self.resolution

        for cx, cy, cz in voxel_centers:
            p = Point()
            p.x = float(cx)
            p.y = float(cy)
            p.z = float(cz)
            marker.points.append(p)

            # Altitude-based color gradient (cyan to magenta)
            color = ColorRGBA()
            norm_z = max(0.0, min(1.0, cz / 10.0))
            color.r = float(norm_z)
            color.g = float(1.0 - norm_z)
            color.b = 1.0
            color.a = 0.8  # Semi-transparent
            marker.colors.append(color)

        marker_array.markers.append(marker)

        self.pub_markers.publish(marker_array)
        self.pub_drone_markers.publish(marker_array)


def main(args=None):
    rclpy.init(args=args)
    node = OctoMapGeneratorNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
