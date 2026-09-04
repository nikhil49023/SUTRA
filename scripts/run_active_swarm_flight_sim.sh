#!/usr/bin/env bash
# ==============================================================================
# PROJECT SUTRA — Integrated Active Swarm Flight & Mission Planner SITL Launcher
# ==============================================================================
# 1. Launches Gazebo Sim 8 with 5 active UAVs and ORCA 3D collision avoidance.
# 2. Runs 5x autonomous fixed-path flight controllers (drones take off and fly).
# 3. Runs MAVLink SITL Bridge feeding live Gazebo physics directly to Mission Planner (UDP 14550).
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Clean Snap GTK environment variables (prevents glibc/libpthread symbol lookup error)
unset GTK_PATH
unset GTK_IM_MODULE
unset LOCPATH
unset GIO_MODULE_DIR

# Export Gazebo Resource Paths
export GZ_SIM_RESOURCE_PATH="$PROJECT_ROOT/sutra_ws/src/sutra_sim/models:$PROJECT_ROOT/sutra_ws/src/sutra_sim:$GZ_SIM_RESOURCE_PATH"
export IGN_GAZEBO_RESOURCE_PATH="$GZ_SIM_RESOURCE_PATH"

source /opt/ros/jazzy/setup.bash 2>/dev/null || true

echo "=============================================================================="
echo "🚁 PROJECT SUTRA — ACTIVE SWARM SIMULATION & MISSION PLANNER SITL"
echo "=============================================================================="
echo "🎯 Mode: 5-UAV Autonomous Search + Live Physics MAVLink Stream (UDP 14550)"
echo "=============================================================================="

# 1. Start MAVLink SITL Bridge in background
python3 "$PROJECT_ROOT/sutra_ws/src/sutra_gnc/sutra_gnc/mavlink_sitl_bridge.py" --ip 127.0.0.1 --port 14550 &
BRIDGE_PID=$!

cleanup() {
    echo -e "\n🛑 Shutting down SUTRA Swarm Simulation..."
    kill $BRIDGE_PID 2>/dev/null || true
    wait $BRIDGE_PID 2>/dev/null || true
    echo "✅ Shutdown complete."
}
trap cleanup EXIT SIGINT SIGTERM

echo "✅ MAVLink SITL Bridge active (PID: $BRIDGE_PID)."
echo "🚀 Launching Gazebo Sim 8 + Subsystem A Flight Controllers..."
echo "------------------------------------------------------------------------------"

# 2. Launch Full Integrated Swarm Stack (Gazebo + 5x Flight Controllers + ROS-GZ Bridge)
ros2 launch "$PROJECT_ROOT/sutra_ws/src/sutra_sim/launch/sandbox_swarm_ab_integrated.launch.py" no_rviz:=true
