#!/usr/bin/env python3
"""
Unit and Integration Test Suite for Subsystem Sim — Gazebo Sim 8 (Harmonic) Digital Twin
Lead Engineers: Nikhil & Harika
"""

import os
import unittest
import xml.etree.ElementTree as ET

class TestGazeboSimHarmonicWorlds(unittest.TestCase):
    def setUp(self):
        self.sim_dir = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
        self.worlds_dir = os.path.join(self.sim_dir, 'worlds')
        self.models_dir = os.path.join(self.sim_dir, 'models')

    def test_world_sdf_files_exist_and_parse(self):
        """Verify that all 3 Gazebo Sim 8 Harmonic world files exist and are valid XML/SDF 1.8."""
        world_files = [
            'real_world_digital_twin_swarm.sdf',
            'master_swarm_disaster_world.sdf',
            'high_quality_disaster_swarm_world.sdf'
        ]

        for fname in world_files:
            fpath = os.path.join(self.worlds_dir, fname)
            self.assertTrue(os.path.exists(fpath), f"World file missing: {fname}")

            tree = ET.parse(fpath)
            root = tree.getroot()
            self.assertEqual(root.tag, 'sdf')
            self.assertEqual(root.attrib.get('version'), '1.8')

            # Verify world node exists
            world = root.find('world')
            self.assertIsNotNone(world)

            # Verify 500Hz physics solver
            physics = world.find('physics')
            self.assertIsNotNone(physics)
            step = physics.find('max_step_size')
            self.assertIsNotNone(step)
            self.assertAlmostEqual(float(step.text), 0.002)

            # Verify WGS84 origin
            coords = world.find('spherical_coordinates')
            self.assertIsNotNone(coords)
            self.assertEqual(coords.find('surface_model').text, 'EARTH_WGS84')
            lat = float(coords.find('latitude_deg').text)
            self.assertTrue(-90.0 <= lat <= 90.0)

    def test_submerged_village_flood_world_sdf(self):
        """Verify converted master Blender submerged village flood disaster world."""
        fpath = os.path.join(self.worlds_dir, 'submerged_village_flood_world.sdf')
        self.assertTrue(os.path.exists(fpath), "submerged_village_flood_world.sdf missing")

        tree = ET.parse(fpath)
        root = tree.getroot()
        self.assertEqual(root.tag, 'sdf')
        self.assertEqual(root.attrib.get('version'), '1.8')

        world = root.find('world')
        self.assertIsNotNone(world)

        # Check all 5 Pegasus UAVs exist and spawn at true Blender altitudes
        drones = ['uav_alpha', 'uav_beta', 'uav_gamma', 'uav_delta', 'uav_epsilon']
        model_dict = {m.attrib.get('name'): m for m in world.findall('model')}
        for did in drones:
            self.assertIn(did, model_dict, f"UAV {did} missing from submerged_village_flood_world.sdf")
            pose_str = model_dict[did].find('pose').text.strip()
            parts = [float(v) for v in pose_str.split()]
            self.assertGreater(parts[2], 49.0, f"UAV {did} altitude {parts[2]}m should be > 49m in flood world")

        # Verify artificial platform was cleanly purged
        self.assertNotIn('coastal_launch_platform', model_dict, "Fake launch platform should be purged")

        # Verify exact Blender camera viewpoints exist
        cams = ['blender_cam_01_hero', 'blender_cam_02_drowning_pov', 'blender_cam_03_house_clingers',
                'blender_cam_04_rooftop_lookdown', 'blender_cam_gis_ortho']
        for c in cams:
            self.assertIn(c, model_dict, f"Blender camera {c} missing from world SDF")

        # Verify GUI user camera is configured at Blender Hero viewpoint
        gui = world.find('gui')
        self.assertIsNotNone(gui)
        cam = gui.find('camera')
        self.assertIsNotNone(cam)
        cam_pose = [float(v) for v in cam.find('pose').text.strip().split()]
        self.assertAlmostEqual(cam_pose[0], 18.0, delta=0.5)
        self.assertAlmostEqual(cam_pose[1], -25.0, delta=0.5)
        self.assertAlmostEqual(cam_pose[2], 48.5, delta=0.5)

    def test_gazebo_sim_8_harmonic_plugins(self):
        """Verify core Gazebo Sim 8 Harmonic system plugins are specified."""
        fpath = os.path.join(self.worlds_dir, 'master_swarm_disaster_world.sdf')
        tree = ET.parse(fpath)
        world = tree.getroot().find('world')

        plugins = [p.attrib.get('filename') for p in world.findall('plugin')]
        self.assertIn('gz-sim-physics-system', plugins)
        self.assertIn('gz-sim-user-commands-system', plugins)
        self.assertIn('gz-sim-scene-broadcaster-system', plugins)
        self.assertIn('gz-sim-sensors-system', plugins)

    def test_drone_models_sdf_parsing(self):
        """Verify Gazebo Harmonic SDFormat 1.8 drone models."""
        model_files = ['uav_alpha_lead.sdf', 'uav_beta_relay.sdf']
        for fname in model_files:
            fpath = os.path.join(self.models_dir, fname)
            self.assertTrue(os.path.exists(fpath), f"Model file missing: {fname}")

            tree = ET.parse(fpath)
            root = tree.getroot()
            self.assertEqual(root.tag, 'sdf')
            self.assertEqual(root.attrib.get('version'), '1.8')

            model = root.find('model')
            self.assertIsNotNone(model)
            link = model.find('link')
            self.assertIsNotNone(link)

    def test_uav_alpha_sensors_configuration(self):
        """Verify uav_alpha_lead has RGB, Depth, LWIR Thermal, and IMU sensors."""
        fpath = os.path.join(self.models_dir, 'uav_alpha_lead.sdf')
        tree = ET.parse(fpath)
        link = tree.getroot().find('model').find('link')
        sensor_names = [s.attrib.get('name') for s in link.findall('sensor')]

        self.assertIn('imu_sensor', sensor_names)
        self.assertIn('rgb_camera', sensor_names)
        self.assertIn('depth_camera', sensor_names)
        self.assertIn('thermal_camera', sensor_names)


if __name__ == '__main__':
    unittest.main()
