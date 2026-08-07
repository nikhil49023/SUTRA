"""
Subsystem C: Tri-Modal AI Perception Package
Lead Engineer: Vedanth Sai Ram
Branch: feature/subsystem-c-perception

Public API:
  to_gps()           - WGS-84 GPS coordinate converter
  pixel_to_ned()     - Pinhole camera ground-plane projector
  BBox               - Bounding box with IoU helpers
  VisualDetection    - YOLOv8 detection result
  ThermalBlob        - Thermal hot-spot detection result
  RadarTarget        - mmWave radar clustered return
  FusedTarget        - Final tri-modal fused detection output
  SutraDetectorNode  - ROS 2 Tri-Modal Detector Node
"""

__version__ = "1.0.0"
__author__ = "Vedanth Sai Ram"
__email__ = "vedanth@sutra.ai"

from sutra_perception.detector_node import (  # noqa: F401
    BBox,
    FusedTarget,
    RadarTarget,
    ThermalBlob,
    VisualDetection,
    SutraDetectorNode,
    to_gps,
    pixel_to_ned,
    ORIGIN_LAT,
    ORIGIN_LON,
    ORIGIN_ALT,
    W_VISUAL,
    W_THERMAL,
    W_RADAR,
)
