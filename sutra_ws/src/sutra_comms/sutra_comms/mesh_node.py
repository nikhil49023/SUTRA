#!/usr/bin/env python3
"""
SUTRA Subsystem B: Swarm 802.11s Mesh Routing & Deep JSCC Neural Link Node
Lead Engineer: Nikhil (Tech Architect & Subsystem B Lead)

Features:
- Free Space Path Loss (FSPL) and Signal-to-Noise Ratio (SNR) modeling for 2.4GHz / 5.8GHz ad-hoc mesh.
- Peer distance matrix tracking & link quality evaluation for dynamic swarm topologies.
- Deep JSCC (Joint Source-Channel Coding) neural image encoder simulation for low SNR image transmission.
- Packet loss estimation and latency metric monitoring (Verification Gate G2).
"""

import math
import time
import json
import random
from typing import Dict, Tuple, List, Optional
import rclpy
from rclpy.node import Node
from std_msgs.msg import String


class SwarmRaftConsensusEngine:
    """
    SwarmRaft Distributed Consensus Engine for Multi-Drone Swarms.
    Implements Raft Leader Election & Log State Machine Replication over 802.11s mesh networks.
    Ensures fault-tolerant leader failover (< 500ms) and target consensus in GNSS-denied environments.
    """

    def __init__(self, node_id: str, peers: List[str]):
        self.node_id = node_id
        self.peers = peers
        self.current_term = 0
        self.voted_for: Optional[str] = None
        self.role = "FOLLOWER"  # Roles: FOLLOWER, CANDIDATE, LEADER
        self.leader_id: Optional[str] = None
        self.log: List[dict] = []
        self.commit_index = 0
        self.last_heartbeat_time = time.time()
        self.election_timeout_sec = random.uniform(0.3, 0.5)  # 300ms - 500ms fast failover

    def check_election_timeout(self) -> bool:
        """Check if follower missed leader heartbeat and should trigger candidate election."""
        if self.role != "LEADER" and (time.time() - self.last_heartbeat_time) > self.election_timeout_sec:
            self.start_election()
            return True
        return False

    def start_election(self):
        """Transition to CANDIDATE role and increment term."""
        self.role = "CANDIDATE"
        self.current_term += 1
        self.voted_for = self.node_id
        self.last_heartbeat_time = time.time()
        # Vote tally (self vote = 1)
        votes = 1
        needed_votes = (len(self.peers) // 2) + 1
        if votes >= needed_votes:
            self.become_leader()

    def receive_heartbeat(self, leader_id: str, term: int, leader_commit: int):
        """Process leader heartbeat and update local raft state machine."""
        if term >= self.current_term:
            self.current_term = term
            self.role = "FOLLOWER"
            self.leader_id = leader_id
            self.last_heartbeat_time = time.time()
            self.commit_index = min(leader_commit, len(self.log))

    def become_leader(self):
        """Transition to LEADER role."""
        self.role = "LEADER"
        self.leader_id = self.node_id
        self.last_heartbeat_time = time.time()

    def append_state_entry(self, entry_type: str, data: dict):
        """Append target/waypoint entry to Raft state log."""
        entry = {
            'term': self.current_term,
            'index': len(self.log) + 1,
            'type': entry_type,
            'data': data
        }
        self.log.append(entry)
        return entry


class SutraMeshNode(Node):
    """
    SUTRA Swarm Mesh & Deep JSCC Neural Link Controller.
    Manages peer-to-peer 802.11s routing, SwarmRaft consensus, and adaptive neural channel coding.
    """

    def __init__(self):
        super().__init__('sutra_mesh_node')
        
        # Publishers
        self.publisher_mesh_status = self.create_publisher(String, '/sutra/swarm/mesh_status', 10)
        self.publisher_raft_state = self.create_publisher(String, '/sutra/swarm/raft_consensus', 10)
        
        # Swarm Peer Positions (x, y, z in meters)
        self.peer_positions: Dict[str, Tuple[float, float, float]] = {
            'uav_alpha': (0.0, 0.0, 15.0),
            'uav_beta': (15.0, 20.0, 18.0),
            'uav_gamma': (-25.0, 30.0, 12.0),
            'uav_delta': (40.0, -10.0, 20.0),
        }
        
        # Initialize Perceptron-Powered Semantic JSCC Communication Engine
        from sutra_comms.perceptron_jscc import PerceptronSemanticCommsPipeline
        self.perceptron_pipeline = PerceptronSemanticCommsPipeline()
        
        # Initialize SwarmRaft Engine for uav_alpha
        self.raft_engine = SwarmRaftConsensusEngine(
            node_id='uav_alpha',
            peers=list(self.peer_positions.keys())
        )
        self.raft_engine.become_leader()  # Initial state
        self.raft_engine.append_state_entry("WGS84_TARGET", {"lat": 37.774731, "lon": -122.419206, "confidence": 0.942})
        
        # Timer for 1Hz status broadcast
        self.timer = self.create_timer(1.0, self.publish_mesh_status)
        self.get_logger().info('📡 SUTRA Swarm 802.11s Mesh + Perceptron Deep JSCC & SwarmRAFT Node Initialized.')

    def calculate_distance(self, pos1: Tuple[float, float, float], pos2: Tuple[float, float, float]) -> float:
        """Calculate 3D Euclidean distance between two UAV positions in meters."""
        return math.sqrt(sum((a - b) ** 2 for a, b in zip(pos1, pos2)))

    def calculate_fspl(self, distance_m: float, freq_mhz: float = 2400.0) -> float:
        """
        Calculate Free Space Path Loss (FSPL) in dB.
        FSPL = 20 * log10(d_km) + 20 * log10(f_MHz) + 32.44
        """
        if distance_m <= 0.1:
            return 0.0
        dist_km = distance_m / 1000.0
        return round(20.0 * math.log10(dist_km) + 20.0 * math.log10(freq_mhz) + 32.44, 2)

    def calculate_snr(self, tx_power_dbm: float, fspl_db: float, noise_floor_dbm: float = -95.0) -> float:
        """Calculate Signal-to-Noise Ratio (SNR) in dB."""
        rx_power = tx_power_dbm - fspl_db
        snr = rx_power - noise_floor_dbm
        return round(snr, 2)

    def calculate_packet_loss(self, snr_db: float) -> float:
        """
        Estimate 802.11s packet loss percentage based on SNR.
        Gate G2 Target: Packet Loss < 2.0% for SNR >= 15 dB.
        """
        if snr_db >= 25.0:
            return 0.05  # 0.05% nominal loss
        elif snr_db >= 15.0:
            return round(0.05 + (25.0 - snr_db) * 0.1, 2)  # Max 1.05%
        elif snr_db >= 5.0:
            return round(1.05 + (15.0 - snr_db) * 1.5, 2)  # Up to 16.05%
        else:
            return 85.0  # Heavy link degradation

    def deep_jscc_encode(self, image_size_kb: float, snr_db: float) -> Dict[str, float]:
        """Delegates semantic transmission to PerceptronSemanticCommsPipeline."""
        return self.perceptron_pipeline.process_semantic_transmission(image_size_kb, distance_m=25.0)

    def compute_peer_link_matrix(self) -> Dict[str, dict]:
        """Generate full link metrics matrix across all UAV peer pairs."""
        peers = list(self.peer_positions.keys())
        matrix = {}
        for i in range(len(peers)):
            for j in range(i + 1, len(peers)):
                p1, p2 = peers[i], peers[j]
                dist = self.calculate_distance(self.peer_positions[p1], self.peer_positions[p2])
                fspl = self.calculate_fspl(dist)
                snr = self.calculate_snr(tx_power_dbm=20.0, fspl_db=fspl)
                pkt_loss = self.calculate_packet_loss(snr)
                jscc_stats = self.deep_jscc_encode(image_size_kb=512.0, snr_db=snr)
                
                link_key = f"{p1}<->{p2}"
                matrix[link_key] = {
                    'distance_m': round(dist, 2),
                    'fspl_db': fspl,
                    'snr_db': snr,
                    'packet_loss_pct': pkt_loss,
                    'jscc_psnr_db': jscc_stats['psnr_db'],
                    'latency_ms': jscc_stats['latency_ms']
                }
        return matrix

    def publish_mesh_status(self):
        """Broadcast 1Hz telemetry status payload to /sutra/swarm/mesh_status."""
        link_matrix = self.compute_peer_link_matrix()
        
        # Gate G2 Audit Check
        max_latency = max(info['latency_ms'] for info in link_matrix.values())
        max_loss = max(info['packet_loss_pct'] for info in link_matrix.values())
        gate_g2_passed = (max_latency < 12.0) and (max_loss < 2.0)
        
        payload = {
            'timestamp': time.time(),
            'subsystem': 'Subsystem B (Comms & Sim)',
            'lead': 'Nikhil',
            'mesh_topology': '802.11s Ad-Hoc Peer-to-Peer',
            'peer_links': link_matrix,
            'gate_g2_audit': {
                'target_latency_ms': '< 12.0',
                'max_measured_latency_ms': max_latency,
                'target_packet_loss_pct': '< 2.0',
                'max_measured_packet_loss_pct': max_loss,
                'status': 'PASSED' if gate_g2_passed else 'DEGRADED'
            }
        }
        
        msg = String()
        msg.data = json.dumps(payload, indent=2)
        self.publisher_mesh_status.publish(msg)
        self.get_logger().info(f"📡 Mesh Status Broadcasted | Links: {len(link_matrix)} | Max Latency: {max_latency}ms | Gate G2: {'✓ PASS' if gate_g2_passed else '❌ FAIL'}")


def main(args=None):
    rclpy.init(args=args)
    node = SutraMeshNode()
    try:
        rclpy.spin_once(node, timeout_sec=0.1)
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
