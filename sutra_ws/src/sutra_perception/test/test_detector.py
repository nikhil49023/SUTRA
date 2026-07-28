"""
Unit tests for Subsystem C Detector Node
"""

def test_detector_gps_raycast():
    from sutra_perception.detector_node import to_gps
    lat, lon, alt = to_gps(0.0, 0.0, 0.0)
    assert lat == 37.774929
    assert lon == -122.419416
