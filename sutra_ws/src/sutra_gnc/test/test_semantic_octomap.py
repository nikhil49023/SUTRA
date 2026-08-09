#!/usr/bin/env python3
"""
Unit tests for Subsystem A: Semantic OctoMap Voxel Label Channel (Phase 3)
"""

import unittest
from sutra_gnc.semantic_octomap import SemanticOctoMap, SemanticLabel


class TestSemanticOctoMap(unittest.TestCase):
    def setUp(self):
        self.map = SemanticOctoMap(resolution_m=0.10)

    def test_semantic_label_setting(self):
        self.map.set_semantic_label((1.0, 2.0, 3.0), SemanticLabel.SURVIVOR_AREA, radius_m=0.2)
        lbl = self.map.get_semantic_label((1.0, 2.0, 3.0))
        self.assertEqual(lbl, SemanticLabel.SURVIVOR_AREA)

    def test_detection_stream_update(self):
        detections = [
            {'label': 'Survivor', 'world_x': 5.0, 'world_y': 5.0, 'world_z': 0.0, 'radius_m': 0.3},
            {'label': 'debris', 'world_x': 2.0, 'world_y': 0.0, 'world_z': 0.0, 'radius_m': 0.2}
        ]
        count = self.map.update_from_detection_stream(detections)
        self.assertEqual(count, 2)
        self.assertEqual(self.map.get_semantic_label((5.0, 5.0, 0.0)), SemanticLabel.SURVIVOR_AREA)
        self.assertEqual(self.map.get_semantic_label((2.0, 0.0, 0.0)), SemanticLabel.DEBRIS)

    def test_export_json_schema(self):
        self.map.set_semantic_label((1.0, 1.0, 1.0), SemanticLabel.SAFE_ZONE)
        data = self.map.export_semantic_json()
        self.assertIn('semantic_voxels', data)
        self.assertIn('total_labeled', data)


if __name__ == '__main__':
    unittest.main()
