#!/usr/bin/env python3
"""
Project SUTRA — Subsystem A+B RViz2 Bridge Node
================================================
Converts Sub-A search status + Sub-B Raft state into RViz2-renderable
markers AND publishes TF transforms for all 5 drones so RViz2 can
show their coordinate frames in the world.

Publishes:
  /sutra/gnc/phase_markers   → MarkerArray (mission phase text + orbit ring)
  /sutra/comms/raft_markers  → MarkerArray (Raft leader badge + log text)
  /tf                        → TF transforms (world → uav_*)

Subscribes:
  /sutra/gnc/search_status   → Sub-A phase + target positions JSON
  /sutra/swarm/raft_consensus → Sub-B Raft log JSON
  /sutra/swarm/mesh_status    → Sub-B mesh link quality JSON
  /model/uav_*/odometry       → Live drone positions for TF
"""

import json
import math
import rclpy
from rclpy.node import Node
from std_msgs.msg import String, ColorRGBA
from visualization_msgs.msg import Marker, MarkerArray
from geometry_msgs.msg import Point, TransformStamped
from nav_msgs.msg import Odometry
from tf2_ros import TransformBroadcaster


DRONE_IDS = ["uav_alpha", "uav_beta", "uav_gamma", "uav_delta", "uav_epsilon"]

# Per-drone RViz colours (R,G,B normalised 0–1)
DRONE_COLOURS = {
    "uav_alpha":   (0.00, 0.78, 1.00),  # Cyan
    "uav_beta":    (1.00, 0.50, 0.00),  # Orange
    "uav_gamma":   (0.20, 1.00, 0.20),  # Green
    "uav_delta":   (1.00, 0.20, 1.00),  # Magenta
    "uav_epsilon": (1.00, 1.00, 0.00),  # Yellow
}

# Planned Pegasus routes (must match swarm_fixed_path_node.py exactly)
DRONE_ROUTES = {
    "uav_alpha": [
        (28.0,  0.0, 5.0), (20.0, 14.0, 5.0), ( 0.0, 18.0, 5.0),
        (-20.0, 14.0, 5.0), (-28.0,  0.0, 5.0), (-20.0,-14.0, 5.0),
        ( 0.0,-18.0, 5.0), ( 20.0,-14.0, 5.0),
    ],
    "uav_beta": [
        ( 0.0, 28.0, 6.5), (14.0, 20.0, 6.5), (18.0,  0.0, 6.5),
        (14.0,-20.0, 6.5), ( 0.0,-28.0, 6.5), (-14.0,-20.0, 6.5),
        (-18.0,  0.0, 6.5), (-14.0, 20.0, 6.5),
    ],
    "uav_gamma": [
        (25.0, 25.0, 4.0), (12.0, 12.0, 4.0), ( 0.0,  0.0, 4.0),
        (-12.0,-12.0, 4.0), (-25.0,-25.0, 4.0), (-12.0,-12.0, 4.5),
        ( 0.0,  0.0, 4.5), ( 12.0, 12.0, 4.5),
    ],
    "uav_delta": [
        (-25.0, 25.0, 7.0), (-12.0, 12.0, 7.0), (  0.0,  0.0, 7.0),
        (12.0,-12.0, 7.0), ( 25.0,-25.0, 7.0), ( 12.0,-12.0, 7.5),
        (  0.0,  0.0, 7.5), (-12.0, 12.0, 7.5),
    ],
    "uav_epsilon": [
        (15.0,  0.0, 5.8), ( 4.6, 14.3, 5.8), (-12.1,  8.8, 5.8),
        (-12.1, -8.8, 5.8), ( 4.6,-14.3, 5.8),
    ],
}


class SutraRVizBridge(Node):

    def __init__(self):
        super().__init__("sutra_rviz_bridge")

        # TF broadcaster for drone frames
        self.tf_broadcaster = TransformBroadcaster(self)

        # Live drone positions (updated from odometry)
        self.positions = {d: (0.0, 0.0, 0.2) for d in DRONE_IDS}

        # Sub-A state
        self.phase = "SECTOR_SEARCH"
        self.survivor_gps = None
        self.active_targets = {}

        # Sub-B state
        self.raft_role = "UNKNOWN"
        self.raft_leader = "?"
        self.raft_term = 0
        self.mesh_snr = {}

        # ── Publishers ────────────────────────────────────────────────────────
        self.pub_phase_markers = self.create_publisher(
            MarkerArray, "/sutra/gnc/phase_markers", 10)
        self.pub_raft_markers = self.create_publisher(
            MarkerArray, "/sutra/comms/raft_markers", 10)
        self.pub_path_static = self.create_publisher(
            MarkerArray, "/sutra/swarm/path_markers", 10)

        # ── Subscriptions ─────────────────────────────────────────────────────
        self.create_subscription(String, "/sutra/gnc/search_status",
                                 self._on_search_status, 10)
        self.create_subscription(String, "/sutra/swarm/raft_consensus",
                                 self._on_raft_consensus, 10)
        self.create_subscription(String, "/sutra/swarm/mesh_status",
                                 self._on_mesh_status, 10)

        for did in DRONE_IDS:
            self.create_subscription(
                Odometry, f"/model/{did}/odometry",
                lambda msg, d=did: self._on_odom(msg, d), 10)

        # 10Hz publish loop
        self.create_timer(0.1, self._publish_all)
        # Static path lines published at 1Hz (they don't change unless phase changes)
        self.create_timer(1.0, self._publish_static_paths)

        self.get_logger().info(
            "🎨 SUTRA RViz2 Bridge Node ONLINE — "
            "publishing TF + phase markers + Raft markers + path lines"
        )

    # ── Callbacks ─────────────────────────────────────────────────────────────

    def _on_odom(self, msg: Odometry, drone_id: str):
        p = msg.pose.pose.position
        self.positions[drone_id] = (p.x, p.y, p.z)

    def _on_search_status(self, msg: String):
        try:
            d = json.loads(msg.data)
            self.phase = d.get("phase", self.phase)
            sg = d.get("survivor_gps")
            self.survivor_gps = tuple(sg) if sg else None
            self.active_targets = d.get("active_targets", {})
        except Exception:
            pass

    def _on_raft_consensus(self, msg: String):
        try:
            d = json.loads(msg.data)
            self.raft_role = d.get("role", d.get("consensus_role", self.raft_role))
            self.raft_leader = d.get("leader_id", self.raft_leader)
            self.raft_term = d.get("term", d.get("current_term", self.raft_term))
        except Exception:
            pass

    def _on_mesh_status(self, msg: String):
        try:
            d = json.loads(msg.data)
            links = d.get("peer_links", d.get("links", {}))
            for peer, info in links.items():
                snr = info.get("snr_db", info.get("snr", 0.0)) if isinstance(info, dict) else 0.0
                self.mesh_snr[peer] = snr
        except Exception:
            pass

    # ── TF Broadcasting ───────────────────────────────────────────────────────

    def _broadcast_tf(self):
        now = self.get_clock().now().to_msg()
        for did, (x, y, z) in self.positions.items():
            t = TransformStamped()
            t.header.stamp = now
            t.header.frame_id = "world"
            t.child_frame_id = did
            t.transform.translation.x = x
            t.transform.translation.y = y
            t.transform.translation.z = z
            t.transform.rotation.w = 1.0
            self.tf_broadcaster.sendTransform(t)

    # ── Static Path LINE_STRIP markers ────────────────────────────────────────

    def _publish_static_paths(self):
        """
        Publish planned Pegasus route lines as LINE_STRIP markers.
        In SECTOR_SEARCH: shows the looping Pegasus paths.
        In SURVIVOR_CONCENTRIC_SURROUND: shows the orbit circle per drone.
        """
        ma = MarkerArray()
        now = self.get_clock().now().to_msg()
        mid = 0

        if self.phase == "SECTOR_SEARCH":
            for did, route in DRONE_ROUTES.items():
                r, g, b = DRONE_COLOURS[did]

                # Route LINE_STRIP (closed loop)
                m = Marker()
                m.header.stamp = now
                m.header.frame_id = "world"
                m.ns = f"{did}_route"
                m.id = mid; mid += 1
                m.type = Marker.LINE_STRIP
                m.action = Marker.ADD
                m.scale.x = 0.12
                m.color = ColorRGBA(r=r, g=g, b=b, a=0.65)
                pts = list(route) + [route[0]]
                for x, y, z in pts:
                    p = Point(); p.x = float(x); p.y = float(y); p.z = float(z)
                    m.points.append(p)
                ma.markers.append(m)

                # Waypoint dots
                for i, (wx, wy, wz) in enumerate(route):
                    dot = Marker()
                    dot.header.stamp = now
                    dot.header.frame_id = "world"
                    dot.ns = f"{did}_wpdot"
                    dot.id = mid; mid += 1
                    dot.type = Marker.SPHERE
                    dot.action = Marker.ADD
                    dot.pose.position.x = float(wx)
                    dot.pose.position.y = float(wy)
                    dot.pose.position.z = float(wz)
                    dot.pose.orientation.w = 1.0
                    dot.scale.x = dot.scale.y = dot.scale.z = 0.5
                    dot.color = ColorRGBA(r=r, g=g, b=b, a=0.9)
                    ma.markers.append(dot)

        elif self.phase == "SURVIVOR_CONCENTRIC_SURROUND" and self.survivor_gps:
            sx, sy, sz = self.survivor_gps
            radius = 10.0
            n = len(DRONE_IDS)

            for i, did in enumerate(DRONE_IDS):
                r, g, b = DRONE_COLOURS[did]
                theta = i * (2.0 * math.pi / n)
                ox = sx + radius * math.cos(theta)
                oy = sy + radius * math.sin(theta)
                oz = 3.5 + i * (2.5 / (n - 1))

                # Spoke line: survivor → orbit slot
                spoke = Marker()
                spoke.header.stamp = now
                spoke.header.frame_id = "world"
                spoke.ns = f"{did}_orbit_spoke"
                spoke.id = mid; mid += 1
                spoke.type = Marker.LINE_STRIP
                spoke.action = Marker.ADD
                spoke.scale.x = 0.08
                spoke.color = ColorRGBA(r=r, g=g, b=b, a=0.5)
                sp = Point(); sp.x = sx; sp.y = sy; sp.z = sz
                ep = Point(); ep.x = ox; ep.y = oy; ep.z = oz
                spoke.points = [sp, ep]
                ma.markers.append(spoke)

                # Orbit slot sphere
                slot = Marker()
                slot.header.stamp = now
                slot.header.frame_id = "world"
                slot.ns = f"{did}_orbit_slot"
                slot.id = mid; mid += 1
                slot.type = Marker.SPHERE
                slot.action = Marker.ADD
                slot.pose.position.x = ox
                slot.pose.position.y = oy
                slot.pose.position.z = oz
                slot.pose.orientation.w = 1.0
                slot.scale.x = slot.scale.y = slot.scale.z = 1.2
                slot.color = ColorRGBA(r=r, g=g, b=b, a=1.0)
                ma.markers.append(slot)

            # Orbit circle outline
            circle = Marker()
            circle.header.stamp = now
            circle.header.frame_id = "world"
            circle.ns = "orbit_circle"
            circle.id = mid; mid += 1
            circle.type = Marker.LINE_STRIP
            circle.action = Marker.ADD
            circle.scale.x = 0.2
            circle.color = ColorRGBA(r=1.0, g=0.3, b=0.0, a=0.8)
            for k in range(37):
                a = k * (2 * math.pi / 36)
                pt = Point()
                pt.x = sx + radius * math.cos(a)
                pt.y = sy + radius * math.sin(a)
                pt.z = (sz if sz else 0.0) + 4.5
                circle.points.append(pt)
            ma.markers.append(circle)

            # Survivor position — red pulsing sphere
            surv = Marker()
            surv.header.stamp = now
            surv.header.frame_id = "world"
            surv.ns = "survivor_target"
            surv.id = mid; mid += 1
            surv.type = Marker.SPHERE
            surv.action = Marker.ADD
            surv.pose.position.x = sx
            surv.pose.position.y = sy
            surv.pose.position.z = sz if sz else 0.5
            surv.pose.orientation.w = 1.0
            surv.scale.x = surv.scale.y = surv.scale.z = 2.0
            surv.color = ColorRGBA(r=1.0, g=0.1, b=0.0, a=0.9)
            ma.markers.append(surv)

        self.pub_path_static.publish(ma)

    # ── Phase Markers (Sub-A status in RViz2) ─────────────────────────────────

    def _make_phase_markers(self) -> MarkerArray:
        ma = MarkerArray()
        now = self.get_clock().now().to_msg()
        mid = 0

        # ORCA avoidance bubble per live drone position
        for did, (x, y, z) in self.positions.items():
            r, g, b = DRONE_COLOURS[did]
            bubble = Marker()
            bubble.header.stamp = now
            bubble.header.frame_id = "world"
            bubble.ns = f"{did}_orca_bubble"
            bubble.id = mid; mid += 1
            bubble.type = Marker.SPHERE
            bubble.action = Marker.ADD
            bubble.pose.position.x = x
            bubble.pose.position.y = y
            bubble.pose.position.z = z
            bubble.pose.orientation.w = 1.0
            bubble.scale.x = bubble.scale.y = bubble.scale.z = 7.0  # 3.5m radius
            bubble.color = ColorRGBA(r=r, g=g, b=b, a=0.08)
            ma.markers.append(bubble)

        # Mission phase text — floating top-centre of arena
        phase_colors = {
            "SECTOR_SEARCH": (0.2, 0.8, 0.2),
            "SURVIVOR_CONCENTRIC_SURROUND": (1.0, 0.3, 0.0),
        }
        pc = phase_colors.get(self.phase, (1.0, 1.0, 1.0))
        txt = Marker()
        txt.header.stamp = now
        txt.header.frame_id = "world"
        txt.ns = "mission_phase_text"
        txt.id = mid; mid += 1
        txt.type = Marker.TEXT_VIEW_FACING
        txt.action = Marker.ADD
        txt.pose.position.x = 0.0
        txt.pose.position.y = 0.0
        txt.pose.position.z = 18.0
        txt.pose.orientation.w = 1.0
        txt.scale.z = 2.5
        txt.color = ColorRGBA(r=pc[0], g=pc[1], b=pc[2], a=1.0)
        survivor_str = f" @ ({self.survivor_gps[0]:.1f},{self.survivor_gps[1]:.1f})" if self.survivor_gps else ""
        txt.text = f"🔍 PHASE: {self.phase}{survivor_str}"
        ma.markers.append(txt)

        # Per-drone label text at live position
        for did, (x, y, z) in self.positions.items():
            r, g, b = DRONE_COLOURS[did]
            lbl = Marker()
            lbl.header.stamp = now
            lbl.header.frame_id = "world"
            lbl.ns = f"{did}_label"
            lbl.id = mid; mid += 1
            lbl.type = Marker.TEXT_VIEW_FACING
            lbl.action = Marker.ADD
            lbl.pose.position.x = x
            lbl.pose.position.y = y
            lbl.pose.position.z = z + 1.2
            lbl.pose.orientation.w = 1.0
            lbl.scale.z = 0.9
            lbl.color = ColorRGBA(r=r, g=g, b=b, a=1.0)
            snr = self.mesh_snr.get(did, "?")
            snr_str = f"{snr:.1f}dB" if isinstance(snr, float) else str(snr)
            lbl.text = f"{did}\nSNR:{snr_str}"
            ma.markers.append(lbl)

        return ma

    # ── Raft Markers (Sub-B status in RViz2) ──────────────────────────────────

    def _make_raft_markers(self) -> MarkerArray:
        ma = MarkerArray()
        now = self.get_clock().now().to_msg()

        # Raft status text — top-right of arena
        txt = Marker()
        txt.header.stamp = now
        txt.header.frame_id = "world"
        txt.ns = "raft_status"
        txt.id = 0
        txt.type = Marker.TEXT_VIEW_FACING
        txt.action = Marker.ADD
        txt.pose.position.x = 25.0
        txt.pose.position.y = 32.0
        txt.pose.position.z = 14.0
        txt.pose.orientation.w = 1.0
        txt.scale.z = 1.8
        txt.color = ColorRGBA(r=0.3, g=0.8, b=1.0, a=1.0)
        txt.text = (
            f"📡 SwarmRAFT\n"
            f"Leader: {self.raft_leader}\n"
            f"Term:   {self.raft_term}\n"
            f"Role:   {self.raft_role}"
        )
        ma.markers.append(txt)

        # Leader crown sphere at leader drone's position
        if self.raft_leader in self.positions:
            lx, ly, lz = self.positions[self.raft_leader]
            crown = Marker()
            crown.header.stamp = now
            crown.header.frame_id = "world"
            crown.ns = "raft_leader_crown"
            crown.id = 1
            crown.type = Marker.SPHERE
            crown.action = Marker.ADD
            crown.pose.position.x = lx
            crown.pose.position.y = ly
            crown.pose.position.z = lz + 2.5
            crown.pose.orientation.w = 1.0
            crown.scale.x = crown.scale.y = crown.scale.z = 1.0
            crown.color = ColorRGBA(r=1.0, g=0.85, b=0.0, a=1.0)
            ma.markers.append(crown)

            # Crown label
            clbl = Marker()
            clbl.header.stamp = now
            clbl.header.frame_id = "world"
            clbl.ns = "raft_leader_label"
            clbl.id = 2
            clbl.type = Marker.TEXT_VIEW_FACING
            clbl.action = Marker.ADD
            clbl.pose.position.x = lx
            clbl.pose.position.y = ly
            clbl.pose.position.z = lz + 4.0
            clbl.pose.orientation.w = 1.0
            clbl.scale.z = 0.8
            clbl.color = ColorRGBA(r=1.0, g=0.85, b=0.0, a=1.0)
            clbl.text = f"👑 RAFT LEADER"
            ma.markers.append(clbl)

        return ma

    # ── Main Publish Loop ─────────────────────────────────────────────────────

    def _publish_all(self):
        self._broadcast_tf()
        self.pub_phase_markers.publish(self._make_phase_markers())
        self.pub_raft_markers.publish(self._make_raft_markers())


def main(args=None):
    rclpy.init(args=args)
    node = SutraRVizBridge()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
