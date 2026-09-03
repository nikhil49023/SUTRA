"""
Smart Horizon GCS — ROS 2 Predictive Disaster Risk Node
Subsystem: ROS 2 Topics, Services & Swarm Risk Map Broadcasting
"""

import json
import threading
import time
from typing import Optional

try:
    import rclpy
    from rclpy.node import Node
    from rclpy.qos import QoSProfile, ReliabilityPolicy, HistoryPolicy
    from std_msgs.msg import String
    ROS2_AVAILABLE = True
except ImportError:
    ROS2_AVAILABLE = False
    Node = object

from services.logging_service import get_logger
from .engine import PredictiveRiskEngine, get_risk_engine
from prepositioning.optimizer import PrepositioningOptimizer, get_prepositioning_optimizer

logger = get_logger("sutra_risk_node")


class SutraRiskNode(Node if ROS2_AVAILABLE else object):
    """
    ROS 2 Node broadcasting dynamic geospatial risk grids and pre-positioning staging setpoints.
    """

    def __init__(self, risk_engine: Optional[PredictiveRiskEngine] = None):
        self.risk_engine = risk_engine or get_risk_engine()
        self.optimizer: PrepositioningOptimizer = get_prepositioning_optimizer()

        if ROS2_AVAILABLE:
            super().__init__("sutra_risk_engine_node")
            qos = QoSProfile(
                reliability=ReliabilityPolicy.BEST_EFFORT,
                history=HistoryPolicy.KEEP_LAST,
                depth=10,
            )
            self._grid_pub = self.create_publisher(String, "/sutra/risk/grid", qos)
            self._alerts_pub = self.create_publisher(String, "/sutra/risk/alerts", qos)
            self._prep_pub = self.create_publisher(String, "/sutra/prepositioning/recommendations", qos)
            self._timer = self.create_timer(2.0, self._publish_cycle)
            logger.info("[SutraRiskNode] ROS 2 Predictive Risk Node initialized on /sutra/risk/*")
        else:
            logger.info("[SutraRiskNode] Operating in standalone Python/WebSocket mode (rclpy not available).")

    def _publish_cycle(self):
        if not ROS2_AVAILABLE:
            return
        try:
            grid = self.risk_engine.get_current_grid()
            if grid and self._grid_pub:
                msg = String()
                msg.data = json.dumps(grid.to_dict())
                self._grid_pub.publish(msg)

            alerts = self.risk_engine.get_active_alerts()
            if alerts and self._alerts_pub:
                msg = String()
                msg.data = json.dumps([a.to_dict() for a in alerts])
                self._alerts_pub.publish(msg)

            recs = self.optimizer.get_recommendations()
            if recs and self._prep_pub:
                msg = String()
                msg.data = json.dumps([r.to_dict() for r in recs])
                self._prep_pub.publish(msg)
        except Exception as e:
            logger.error(f"[SutraRiskNode] ROS 2 publish error: {e}")


def main(args=None):
    if ROS2_AVAILABLE:
        rclpy.init(args=args)
        node = SutraRiskNode()
        try:
            rclpy.spin(node)
        except KeyboardInterrupt:
            pass
        finally:
            node.destroy_node()
            rclpy.shutdown()
    else:
        print("ROS 2 is not installed in this environment. Run via start_gcs.py.")


if __name__ == "__main__":
    main()
