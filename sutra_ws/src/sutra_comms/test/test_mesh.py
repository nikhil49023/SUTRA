"""
Unit tests for Subsystem B Mesh Node
"""

def test_mesh_node_fspl():
    from sutra_comms.mesh_node import SutraMeshNode
    node = SutraMeshNode()
    fspl = node.calculate_fspl(100.0)
    assert fspl > 0.0
