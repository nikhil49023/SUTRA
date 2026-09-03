#!/usr/bin/env bash
# ==============================================================================
# SUTRA Shortcut: Launch 5-UAV Sandbox Swarm (A+B Integrated)
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 1. Strictly stop any ongoing Gazebo simulations to free GPU/CPU
"$SCRIPT_DIR/sim_stop.sh"

# 2. Source ROS 2 environment
source /opt/ros/jazzy/setup.bash
if [ -f "$WORKSPACE_ROOT/sutra_ws/install/setup.bash" ]; then
    source "$WORKSPACE_ROOT/sutra_ws/install/setup.bash"
fi

export GZ_IP="127.0.0.1"
export GZ_PARTITION="sutra_sandbox_ab"
SIM_DIR="$WORKSPACE_ROOT/sutra_ws/src/sutra_sim"
export GZ_SIM_RESOURCE_PATH="$SIM_DIR:$SIM_DIR/models:$SIM_DIR/worlds:${GZ_SIM_RESOURCE_PATH:-}"
export IGN_GAZEBO_RESOURCE_PATH="$GZ_SIM_RESOURCE_PATH"

echo "[+] Launching 5-UAV Sandbox Swarm with Safe Resource Throttling (nice -n 10)..."
echo "    • Models: 5x Quadcopters (uav_alpha..uav_epsilon)"
echo "    • Comms : 802.11s Mesh + SwarmRAFT Consensus + Deep JSCC"
echo "    • GNC   : 5x Pegasus Autopilots + 3D Collision Avoidance"
echo "    • Views : Gazebo Sim 8 3D GUI + RViz2 Swarm Dashboard"

exec nice -n 10 ros2 launch sutra_sim sandbox_swarm_ab_integrated.launch.py
