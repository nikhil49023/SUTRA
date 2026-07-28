"""
Unit tests for Subsystem B Mesh Node
"""

import rclpy
from sutra_comms.mesh_node import SutraMeshNode

def test_mesh_node_fspl():
    rclpy.init()
    try:
        node = SutraMeshNode()
        fspl = node.calculate_fspl(100.0)
        assert fspl > 0.0
        node.destroy_node()
    finally:
        rclpy.shutdown()
