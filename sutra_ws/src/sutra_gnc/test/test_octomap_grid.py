#!/usr/bin/env python3
"""
Test Suite: 3D Voxel OctoMap Grid Generator (Subsystem A)
=========================================================
Verifies 3D voxel grid discretization, PointCloud2 binary parsing,
and 0.10m resolution voxelization in `sutra_gnc.octomap_generator`.
"""

import math
import struct
import pytest
import rclpy
from sensor_msgs.msg import PointCloud2, PointField
from sutra_gnc.octomap_generator import (
    OctoMapVoxelGrid,
    OctoMapGeneratorNode,
    parse_point_cloud2_xyz,
)


@pytest.fixture(scope="module", autouse=True)
def init_rclpy():
    if not rclpy.ok():
        rclpy.init()
    yield
    if rclpy.ok():
        rclpy.shutdown()


def create_sample_point_cloud2(points):
    """Helper utility to construct a binary sensor_msgs/PointCloud2 message."""
    msg = PointCloud2()
    msg.header.frame_id = "uav_alpha/base_link"
    msg.height = 1
    msg.width = len(points)
    msg.point_step = 12
    msg.row_step = 12 * len(points)
    msg.is_dense = True

    msg.fields = [
        PointField(name="x", offset=0, datatype=PointField.FLOAT32, count=1),
        PointField(name="y", offset=4, datatype=PointField.FLOAT32, count=1),
        PointField(name="z", offset=8, datatype=PointField.FLOAT32, count=1),
    ]

    buffer = b""
    for x, y, z in points:
        buffer += struct.pack("<fff", x, y, z)
    msg.data = buffer
    return msg


def test_octomap_voxel_grid_resolution():
    grid = OctoMapVoxelGrid(resolution=0.10)
    assert grid.resolution == 0.10

    # Multiple points falling within the same 0.10m voxel (e.g. voxel (1, 2, 3))
    pts_same_voxel = [
        (0.11, 0.22, 0.33),
        (0.14, 0.28, 0.39),
        (0.18, 0.21, 0.35),
    ]
    grid.update_from_points(pts_same_voxel)

    assert len(grid.occupied_voxels) == 1
    assert (1, 2, 3) in grid.occupied_voxels

    centers = grid.get_voxel_centers()
    assert len(centers) == 1
    assert pytest.approx(centers[0][0], 1e-4) == 0.15
    assert pytest.approx(centers[0][1], 1e-4) == 0.25
    assert pytest.approx(centers[0][2], 1e-4) == 0.35


def test_octomap_voxel_grid_distinct_voxels():
    grid = OctoMapVoxelGrid(resolution=0.10)
    pts_distinct = [
        (0.05, 0.05, 0.05),   # voxel (0, 0, 0) -> center (0.05, 0.05, 0.05)
        (1.05, 2.05, 3.05),   # voxel (10, 20, 30) -> center (1.05, 2.05, 3.05)
        (-0.05, -0.05, 0.05), # voxel (-1, -1, 0) -> center (-0.05, -0.05, 0.05)
    ]
    grid.update_from_points(pts_distinct)

    assert len(grid.occupied_voxels) == 3
    centers = grid.get_voxel_centers()
    assert len(centers) == 3


def test_parse_point_cloud2_xyz():
    raw_points = [(1.0, 2.0, 3.0), (-4.5, 5.5, 6.0), (float("nan"), 1.0, 2.0)]
    msg = create_sample_point_cloud2(raw_points)

    parsed = parse_point_cloud2_xyz(msg)
    # NaN points must be filtered out
    assert len(parsed) == 2
    assert pytest.approx(parsed[0][0], 1e-4) == 1.0
    assert pytest.approx(parsed[0][1], 1e-4) == 2.0
    assert pytest.approx(parsed[0][2], 1e-4) == 3.0
    assert pytest.approx(parsed[1][0], 1e-4) == -4.5


def test_octomap_generator_node_cloud_processing():
    node = OctoMapGeneratorNode()
    assert node.drone_id == "uav_alpha"
    assert node.resolution == 0.10

    test_points = [(0.55, 0.65, 0.75), (1.15, 1.25, 1.35)]
    cloud_msg = create_sample_point_cloud2(test_points)

    node._cloud_cb(cloud_msg)
    assert len(node.grid.occupied_voxels) == 2

    node.destroy_node()
