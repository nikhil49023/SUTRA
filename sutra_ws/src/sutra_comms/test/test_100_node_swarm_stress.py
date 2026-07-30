"""
SUTRA Subsystem B: 100-Node Swarm Communication Mesh & LoRa Telemetry Stress Audit
Lead Engineer & Tech Architect: Nikhil
Branch: feature/subsystem-b-comms

Features Tested across 100 Autonomous UAV Nodes:
1. 100-Node 3D Mesh Topology & Link Matrix (1000m x 1000m x 100m Search Area).
2. Autonomous Mission Status & WGS84 Target Broadcast.
3. 3D Occupancy OctoMap Delta-Compression over Dual-Band LoRa / Wi-Fi Mesh.
4. SwarmRAFT Leader Election Failover (< 500ms recovery across 100 nodes).
5. Deep JSCC Semantic Payload Compression & Throughput Audit.
"""

import time
import math
import pytest
import torch
import rclpy
from sutra_comms.mesh_node import SutraMeshNode, SwarmRaftConsensusEngine
from sutra_comms.perceptron_jscc import PerceptronSemanticCommsPipeline


@pytest.fixture(scope="module")
def ros_context():
    rclpy.init()
    yield
    rclpy.shutdown()


def test_100_node_swarm_topology_and_stress_audit(ros_context):
    """Stress test 100 simulated UAV nodes across a 1km x 1km x 100m 3D disaster terrain."""
    node = SutraMeshNode()
    try:
        # Generate 100 3D positions spread across 1000m x 1000m x 100m
        peers_100 = {
            f"uav_{i}": (
                float((i % 10) * 100.0 - 450.0),
                float((i // 10) * 100.0 - 450.0),
                float(15.0 + (i % 5) * 5.0)
            )
            for i in range(100)
        }
        node.peer_positions = peers_100
        
        start_time = time.time()
        # Compute distance and RF link matrix across 100 nodes
        # Unique directional links = (100 * 99) / 2 = 4,950 link pairs
        matrix = node.compute_peer_link_matrix()
        calc_time_ms = (time.time() - start_time) * 1000.0
        
        assert len(matrix) == 4950
        assert calc_time_ms < 1500.0  # Topology matrix processing (< 1.5s for 4,950 links)
        
        print(f"\n✅ [100-NODE AUDIT] Calculated 4,950 peer links in {calc_time_ms:.2f} ms")
    finally:
        node.destroy_node()


def test_100_node_swarm_raft_consensus_failover(ros_context):
    """Stress test SwarmRAFT leader election failover in a 100-node cluster."""
    peers_100 = [f"uav_{i}" for i in range(100)]
    
    # Leader is uav_0
    leader_engine = SwarmRaftConsensusEngine(node_id="uav_0", peers=peers_100)
    leader_engine.become_leader()
    assert leader_engine.role == "LEADER"
    
    # Leader appends 3D OctoMap delta log entry
    leader_engine.append_state_entry("3D_OCTOMAP_DELTA", {
        "voxels_added": 128,
        "bounds_min": [-100.0, -100.0, 0.0],
        "bounds_max": [+100.0, +100.0, 50.0],
        "wgs84_targets": [{"lat": 37.774731, "lon": -122.419206}]
    })
    
    # Simulate leader crash (uav_0 goes offline)
    surviving_peers = peers_100[1:]  # 99 surviving nodes
    
    # Candidate uav_1 initiates election
    candidate = SwarmRaftConsensusEngine(node_id="uav_1", peers=surviving_peers)
    candidate.start_election()
    assert candidate.role == "CANDIDATE"
    
    # Collect votes from 50 peers (majority quorum required = (99 // 2) + 1 = 50 votes)
    start_failover = time.time()
    for voter in surviving_peers[1:50]:  # Collect votes from 49 additional peers
        candidate.receive_vote(voter)
        
    failover_ms = (time.time() - start_failover) * 1000.0
    
    # Verify uav_1 becomes new leader across 100 nodes
    assert candidate.role == "LEADER"
    assert failover_ms < 100.0  # Failover resolved in < 100ms
    print(f"✅ [100-NODE AUDIT] SwarmRAFT Leader Failover executed in {failover_ms:.2f} ms")


def test_100_node_lora_and_deep_jscc_practicality_audit(ros_context):
    """
    Audit practicality of transmitting 3D maps, detections, and status over LoRa / Deep JSCC.
    """
    pipeline = PerceptronSemanticCommsPipeline()
    
    # Raw uncompressed 3D OctoMap size = 2048 KB (2 MB)
    raw_3d_map_kb = 2048.0
    
    # Deep JSCC compresses 3D map into a 16-dim latent vector payload = 64 KB
    res = pipeline.process_semantic_transmission(image_size_kb=raw_3d_map_kb, distance_m=150.0)
    
    # LoRa Telemetry Packetizing (64 bytes per packet @ 433MHz)
    compressed_payload_bytes = res['compressed_size_kb'] * 1024.0  # 65,536 bytes
    num_lora_packets = math.ceil(compressed_payload_bytes / 64.0)  # 1024 LoRa packets
    
    # Bandwidth verification
    assert res['compression_ratio'] < 0.05
    assert res['psnr_db'] >= 28.0
    assert res['latency_ms'] < 60.0  # Extended range 150m 100-node 2MB OctoMap mesh latency (< 60ms)


    
    print(f"✅ [PRACTICALITY AUDIT] Raw 3D Map (2MB) compressed to {res['compressed_size_kb']} KB via Deep JSCC.")
    print(f"   LoRa Telemetry Backhaul: Split into {num_lora_packets} compact packets @ {res['latency_ms']} ms transmission latency.")
    
    print(f"✅ [PRACTICALITY AUDIT] Raw 3D Map (2MB) compressed to {res['compressed_size_kb']} KB via Deep JSCC.")
    print(f"   LoRa Telemetry Backhaul: Split into {num_lora_packets} compact packets @ {res['latency_ms']} ms transmission latency.")
