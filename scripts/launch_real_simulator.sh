#!/usr/bin/env bash
# ==============================================================================
# SUTRA Master Simulator Launcher — Safe Resource Allocation
# ==============================================================================
# Author: Tech Lead Nikhil (Tech Architect & Subsystem A + B Lead ⚡)
# Subsystems: A (GNC), B (Comms & Sim), C (Perception), D (GCS)
#
# Safety Measures:
# - Resource Throttling: Runs with 'nice -n 10' to prevent IDE freezes
# - Clean Shutdown: Traps SIGINT/SIGTERM to kill all spawned gz/ros processes
# - Multi-UAV 3D Digital Twin: Launches Gazebo Sim 8 + RViz2 + 802.11s Mesh Node
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SIM_DIR="$WORKSPACE_ROOT/sutra_ws/src/sutra_sim"

echo "================================================================================"
echo "🚁  PROJECT SUTRA — REAL GAZEBO SIM 8 + ROS 2 MULTI-UAV SWARM SIMULATOR"
echo "================================================================================"

# Source ROS 2 Jazzy & SUTRA Workspace
source /opt/ros/jazzy/setup.bash
if [ -f "$WORKSPACE_ROOT/sutra_ws/install/setup.bash" ]; then
    source "$WORKSPACE_ROOT/sutra_ws/install/setup.bash"
fi

# Set Gazebo Environment & Partitions
export GZ_IP="127.0.0.1"
export GZ_PARTITION="sutra_sandbox_ab"
export GZ_SIM_RESOURCE_PATH="$SIM_DIR:$SIM_DIR/models:$SIM_DIR/worlds:${GZ_SIM_RESOURCE_PATH:-}"
export IGN_GAZEBO_RESOURCE_PATH="$GZ_SIM_RESOURCE_PATH"

# Mode Selection
MODE="${1:-sandbox}" # 'sandbox' or 'master'
HEADLESS="${2:-false}" # 'true' or 'false'

cleanup() {
    echo -e "\n[*] Terminating Gazebo Sim 8 and ROS 2 processes cleanly..."
    pkill -9 -f "gz sim" 2>/dev/null || true
    pkill -9 -f "ros_gz_bridge" 2>/dev/null || true
    pkill -9 -f "mesh_node.py" 2>/dev/null || true
    pkill -9 -f "swarm_fixed_path" 2>/dev/null || true
    pkill -9 -f "sutra_rviz_bridge" 2>/dev/null || true
    pkill -9 -f "rviz2" 2>/dev/null || true
    echo "✓ Clean shutdown complete. System resources restored."
}
trap cleanup EXIT INT TERM

echo "[+] Starting 5-UAV Integrated SITL Simulation (Mode: $MODE, Headless: $HEADLESS)..."
echo "    • Subsystem A: 5x Autonomous Flight Autopilots + TF Broadcaster"
echo "    • Subsystem B: 802.11s Mesh + SwarmRAFT Consensus + Deep JSCC"
echo "    • Simulation : Gazebo Sim 8 (500Hz DART Physics) + RViz2 3D HUD"
echo "    • Resource   : Throttled to preserve Antigravity IDE and desktop responsiveness"
echo "--------------------------------------------------------------------------------"

if [ "$MODE" = "master" ]; then
    nice -n 10 ros2 launch sutra_sim sutra_master_integrated_sim.launch.py headless:="$HEADLESS"
else
    nice -n 10 ros2 launch sutra_sim sandbox_swarm_ab_integrated.launch.py headless:="$HEADLESS"
fi
