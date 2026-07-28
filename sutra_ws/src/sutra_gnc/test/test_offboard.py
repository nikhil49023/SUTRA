"""
Unit tests for Subsystem A Offboard Node
"""

def test_offboard_node_import():
    from sutra_gnc.offboard_node import SutraOffboardControlNode
    assert SutraOffboardControlNode is not None
