"""
SUTRA Subsystem B (Comms & Sim) — Master Unit & Gate G2 Integration Tests
Lead Engineer: Nikhil
"""

import pytest
import rclpy
from sutra_comms.mesh_node import SutraMeshNode


@pytest.fixture(scope="module")
def ros_context():
    rclpy.init()
    yield
    rclpy.shutdown()


def test_mesh_node_fspl(ros_context):
    node = SutraMeshNode()
    try:
        # Test 1: Near range (10m)
        fspl_10m = node.calculate_fspl(10.0, freq_mhz=2400.0)
        assert fspl_10m > 50.0 and fspl_10m < 70.0

        # Test 2: Mid range (100m)
        fspl_100m = node.calculate_fspl(100.0, freq_mhz=2400.0)
        assert fspl_100m > fspl_10m

        # Test 3: Zero distance edge case
        assert node.calculate_fspl(0.0) == 0.0
    finally:
        node.destroy_node()


def test_snr_and_packet_loss(ros_context):
    node = SutraMeshNode()
    try:
        # High SNR -> Zero/Nominal Loss
        snr_high = node.calculate_snr(tx_power_dbm=20.0, fspl_db=40.0)
        loss_high = node.calculate_packet_loss(snr_high)
        assert snr_high > 25.0
        assert loss_high <= 0.1

        # Low SNR -> Moderate Loss
        loss_low = node.calculate_packet_loss(snr_db=10.0)
        assert loss_low > 1.0 and loss_low < 20.0
    finally:
        node.destroy_node()


def test_deep_jscc_encoding(ros_context):
    node = SutraMeshNode()
    try:
        raw_size_kb = 1024.0
        snr_db = 20.0
        result = node.deep_jscc_encode(raw_size_kb, snr_db)

        # Check payload reduction (should be compressed by ~88%)
        assert result['compressed_size_kb'] < raw_size_kb * 0.2
        # Check PSNR quality (should be >= 30 dB)
        assert result['psnr_db'] >= 30.0
        # Check latency (should be under 12ms)
        assert result['latency_ms'] < 12.0
    finally:
        node.destroy_node()


def test_gate_g2_metric_audit(ros_context):
    node = SutraMeshNode()
    try:
        matrix = node.compute_peer_link_matrix()
        assert len(matrix) > 0

        # Gate G2 Requirements: Latency < 12ms, Packet Loss < 2.0%
        for link_name, metrics in matrix.items():
            assert metrics['latency_ms'] < 12.0, f"Gate G2 Fail on link {link_name}: Latency {metrics['latency_ms']}ms >= 12ms"
            assert metrics['packet_loss_pct'] < 2.0, f"Gate G2 Fail on link {link_name}: Loss {metrics['packet_loss_pct']}% >= 2%"
    finally:
        node.destroy_node()


def test_swarm_raft_consensus(ros_context):
    node = SutraMeshNode()
    try:
        engine = node.raft_engine
        assert engine.role == "LEADER"
        assert engine.node_id == "uav_alpha"
        assert len(engine.log) >= 1
        
        # Test candidate election timeout logic (peer count = 3 requires quorum of 2 votes)
        follower_engine = node.raft_engine.__class__(node_id="uav_beta", peers=["uav_alpha", "uav_beta", "uav_gamma"])
        assert follower_engine.role == "FOLLOWER"
        follower_engine.start_election()
        assert follower_engine.role == "CANDIDATE"  # Needs majority vote from peers
        
        # When quorum of 1 is needed (solo peer), immediately becomes leader
        solo_engine = node.raft_engine.__class__(node_id="uav_solo", peers=["uav_solo"])
        solo_engine.start_election()
        assert solo_engine.role == "LEADER"
    finally:
        node.destroy_node()


def test_perceptron_semantic_jscc(ros_context):
    from sutra_comms.perceptron_jscc import PerceptronSemanticCommsPipeline
    pipeline = PerceptronSemanticCommsPipeline()
    res = pipeline.process_semantic_transmission(image_size_kb=512.0, distance_m=20.0)
    
    assert res['compression_ratio'] < 0.05  # > 95% payload compression
    assert res['psnr_db'] >= 28.0  # High visual quality under noise
    assert res['latency_ms'] < 12.0  # Gate G2 compliant latency (< 12ms)
    assert res['graceful_degradation'] is True

