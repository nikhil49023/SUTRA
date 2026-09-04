#!/usr/bin/env bash
# ==============================================================================
# PROJECT SUTRA — Attach Active Swarm Flight Controllers to Running Gazebo
# ==============================================================================
# Use this when Gazebo Sim 8 is ALREADY OPEN on screen with sandbox_swarm_world.
# It starts:
#   1. ROS 2 <-> Gazebo bridge for all 5 UAVs (odometry + twist commands)
#   2. 5x autonomous fixed-path flight controllers with ORCA 3D collision avoidance
#   3. SUTRA MAVLink SITL Bridge streaming live Gazebo physics directly to Mission Planner
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Clean Snap GTK environment variables
unset GTK_PATH
unset GTK_IM_MODULE
unset LOCPATH
unset GIO_MODULE_DIR

source /opt/ros/jazzy/setup.bash 2>/dev/null || true
source "$PROJECT_ROOT/sutra_ws/install/setup.bash" 2>/dev/null || true

echo "=============================================================================="
echo "🚁 PROJECT SUTRA — ATTACHING SWARM CONTROLLERS & MAVLINK SITL BRIDGE"
echo "=============================================================================="
echo "🎯 Targets: 5 UAVs (Alpha, Beta, Gamma, Delta, Epsilon) in Pegasus Crossing"
echo "📡 Mission Planner: UDP 127.0.0.1:14550"
echo "=============================================================================="

PIDS=()

cleanup() {
    echo -e "\n🛑 Stopping swarm controllers and bridges..."
    for pid in "${PIDS[@]}"; do
        kill "$pid" 2>/dev/null || true
    done
    echo "✅ Swarm controllers safely detached."
}
trap cleanup EXIT SIGINT SIGTERM

# 1. Start ROS-GZ Parameter Bridge
echo "🔗 1/3 Starting ROS 2 <-> Gazebo Bridge for 5 UAVs..."
ros2 run ros_gz_bridge parameter_bridge \
  /clock@rosgraph_msgs/msg/Clock[gz.msgs.Clock \
  /model/uav_alpha/odometry@nav_msgs/msg/Odometry[gz.msgs.Odometry \
  /uav_alpha/gazebo/command/twist@geometry_msgs/msg/TwistStamped]gz.msgs.Twist \
  /model/uav_beta/odometry@nav_msgs/msg/Odometry[gz.msgs.Odometry \
  /uav_beta/gazebo/command/twist@geometry_msgs/msg/TwistStamped]gz.msgs.Twist \
  /model/uav_gamma/odometry@nav_msgs/msg/Odometry[gz.msgs.Odometry \
  /uav_gamma/gazebo/command/twist@geometry_msgs/msg/TwistStamped]gz.msgs.Twist \
  /model/uav_delta/odometry@nav_msgs/msg/Odometry[gz.msgs.Odometry \
  /uav_delta/gazebo/command/twist@geometry_msgs/msg/TwistStamped]gz.msgs.Twist \
  /model/uav_epsilon/odometry@nav_msgs/msg/Odometry[gz.msgs.Odometry \
  /uav_epsilon/gazebo/command/twist@geometry_msgs/msg/TwistStamped]gz.msgs.Twist \
  --ros-args -p use_sim_time:=true > /tmp/sutra_ros_gz_bridge.log 2>&1 &
PIDS+=($!)
echo "   ✅ Bridge active (PID: ${PIDS[-1]})."

sleep 1.5

# 2. Start MAVLink SITL Bridge
echo "📡 2/3 Starting SUTRA MAVLink SITL Bridge for Mission Planner (UDP 14550)..."
python3 "$PROJECT_ROOT/sutra_ws/src/sutra_gnc/sutra_gnc/mavlink_sitl_bridge.py" \
  --ip 127.0.0.1 --port 14550 > /tmp/sutra_mavlink_bridge.log 2>&1 &
PIDS+=($!)
echo "   ✅ MAVLink SITL Bridge active (PID: ${PIDS[-1]})."

sleep 1.0

# 3. Start 5x Autonomous Flight Controllers
echo "🚀 3/3 Activating 5x Subsystem A Fixed-Path Autopilots (ORCA 3D Collision Avoidance)..."
DRONES=("uav_alpha" "uav_beta" "uav_gamma" "uav_delta" "uav_epsilon")
SPEEDS=("3.8" "4.2" "3.5" "4.0" "3.2")
ALTS=("5.0" "6.5" "4.0" "7.0" "5.8")

for i in "${!DRONES[@]}"; do
    did="${DRONES[$i]}"
    spd="${SPEEDS[$i]}"
    alt="${ALTS[$i]}"
    python3 "$PROJECT_ROOT/sutra_ws/src/sutra_gnc/sutra_gnc/swarm_fixed_path_node.py" \
      --ros-args \
      -p drone_id:="$did" \
      -p cruise_speed:="$spd" \
      -p takeoff_altitude:="$alt" \
      -p use_sim_time:=true > "/tmp/sutra_ctrl_${did}.log" 2>&1 &
    PIDS+=($!)
    echo "   ⚡ [$did] Controller launched (PID: ${PIDS[-1]} | Takeoff: ${alt}m | Speed: ${spd}m/s)"
done

echo "=============================================================================="
echo "🎉 ALL 5 UAV FLIGHT CONTROLLERS ARE ACTIVE & FLYING IN GAZEBO!"
echo "📡 Check Mission Planner: Telemetry and artificial horizon are live from Gazebo!"
echo "Press Ctrl+C at any time to stop flight controllers."
echo "=============================================================================="

# Keep alive and print status
while true; do
    sleep 3
    # Check if processes are alive
    for pid in "${PIDS[@]}"; do
        if ! kill -0 "$pid" 2>/dev/null; then
            echo "⚠️  Process $pid terminated unexpectedly. Check /tmp/sutra_*.log."
        fi
    done
done
