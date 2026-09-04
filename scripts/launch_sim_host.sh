#!/usr/bin/env bash
# ==============================================================================
# PROJECT SUTRA — DISTRIBUTED SIMULATION HOST LAUNCHER (NIKHIL'S LAPTOP)
# ==============================================================================
# Track: Defence & SpaceTech (SH-DST-05) | Team: SHIH26-TID-361
# 
# Runs Gazebo Sim 8 Digital Twin, Physics Engine, GNC Controllers, and streams
# raw 360° visual/thermal video feeds and 50Hz telemetry to Shiva's compute post.
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Clean Snap GTK environment variables
unset GTK_PATH GTK_IM_MODULE LOCPATH GIO_MODULE_DIR LD_LIBRARY_PATH

# Export Gazebo Resource Paths
export SDF_PATH="$PROJECT_ROOT/sutra_ws/src/sutra_sim/models:$SDF_PATH"
export GZ_SIM_RESOURCE_PATH="$PROJECT_ROOT/sutra_ws/src/sutra_sim/models:$PROJECT_ROOT/sutra_ws/src/sutra_sim:$GZ_SIM_RESOURCE_PATH"
export IGN_GAZEBO_RESOURCE_PATH="$GZ_SIM_RESOURCE_PATH"

source /opt/ros/jazzy/setup.bash 2>/dev/null || true
source "$PROJECT_ROOT/sutra_ws/install/setup.bash" 2>/dev/null || true

# Auto-detect Host LAN IP
HOST_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
if [ -z "$HOST_IP" ]; then
    HOST_IP="127.0.0.1"
fi

echo "=============================================================================="
echo "🚁 PROJECT SUTRA — DISTRIBUTED SIMULATION HOST (NIKHIL'S LAPTOP)"
echo "=============================================================================="
echo "📍 HOST LOCAL LAN IP : $HOST_IP"
echo "📡 SIM EXPORTER WS   : ws://${HOST_IP}:9090 (Telemetry, 360° Video, RTL Uplink)"
echo "🎮 MAVLINK SITL UDP  : 14550 (ArduPilot Dialect for Mission Planner)"
echo "🌲 WORLD ENVIRONMENT : Master Forest Canopy & Mountain Ridge (SH-DST-05)"
echo "=============================================================================="

CHILD_PIDS=()

cleanup() {
    echo -e "\n🛑 Shutting down SUTRA Simulation Host..."
    for pid in "${CHILD_PIDS[@]}"; do
        kill "$pid" 2>/dev/null || true
    done
    wait 2>/dev/null || true
    echo "✅ Simulation host cleanly stopped."
}
trap cleanup EXIT SIGINT SIGTERM

# Step 0: Pre-flight Cleanup
pkill -f "ros_gz_bridge parameter_bridge" 2>/dev/null || true
pkill -f "swarm_fixed_path_node.py" 2>/dev/null || true
pkill -f "mavlink_sitl_bridge.py" 2>/dev/null || true
pkill -f "sutra_sim_exporter.py" 2>/dev/null || true

# Step 1: Launch Gazebo Sim 8
WORLD_FILE="$PROJECT_ROOT/sutra_ws/src/sutra_sim/worlds/forest_canopy_sar_world.sdf"
echo "🌍 [1/5] Launching Gazebo Sim 8 Forest Canopy World..."
gz sim -r "$WORLD_FILE" > /tmp/sutra_gazebo.log 2>&1 &
CHILD_PIDS+=($!)
sleep 4.0
echo "   ✅ Gazebo Sim 8 active (PID: ${CHILD_PIDS[-1]})."

# Step 2: Launch ROS 2 <-> Gazebo Bridge
echo "🔗 [2/5] Starting ROS 2 <-> Gazebo Bridge for 5 UAVs..."
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
CHILD_PIDS+=($!)
sleep 1.5
echo "   ✅ ROS-GZ Bridge active (PID: ${CHILD_PIDS[-1]})."

# Step 3: Launch MAVLink SITL Bridge
echo "📡 [3/5] Starting MAVLink SITL Bridge (UDP 14550)..."
python3 "$PROJECT_ROOT/sutra_ws/src/sutra_gnc/sutra_gnc/mavlink_sitl_bridge.py" \
  --ip 0.0.0.0 --port 14550 --autopilot ardupilot > /tmp/sutra_mavlink_bridge.log 2>&1 &
CHILD_PIDS+=($!)
sleep 1.0
echo "   ✅ MAVLink SITL Bridge active."

# Step 4: Launch 5x GNC Controllers
echo "🚀 [4/5] Launching 5x Autonomous Flight Controllers (ORCA 3D Avoidance)..."
DRONES=("uav_alpha" "uav_beta" "uav_gamma" "uav_delta" "uav_epsilon")
ALTS=("46.0" "54.0" "64.0" "52.0" "49.0")
SPEEDS=("3.2" "3.8" "2.5" "3.5" "3.0")

for i in "${!DRONES[@]}"; do
    did="${DRONES[$i]}"
    spd="${SPEEDS[$i]}"
    alt="${ALTS[$i]}"
    python3 "$PROJECT_ROOT/sutra_ws/src/sutra_gnc/sutra_gnc/swarm_fixed_path_node.py" \
      --ros-args \
      -p drone_id:="$did" \
      -p route_mode:=canopy_forest \
      -p cruise_speed:="$spd" \
      -p takeoff_altitude:="$alt" \
      -p use_sim_time:=true > "/tmp/sutra_ctrl_${did}.log" 2>&1 &
    CHILD_PIDS+=($!)
done
echo "   ✅ 5x Flight controllers active."

# Step 5: Launch SUTRA Sim Exporter
echo "🌐 [5/5] Starting SUTRA Distributed Sim Exporter on ws://0.0.0.0:9090..."
python3 "$PROJECT_ROOT/sutra_ws/src/sutra_comms/sutra_comms/sutra_sim_exporter.py" > /tmp/sutra_sim_exporter.log 2>&1 &
CHILD_PIDS+=($!)
echo "   ✅ Simulation Exporter active."

echo ""
echo "=============================================================================="
echo "🎉 SIMULATION HOST IS FULLY ARMED & STREAMING ACROSS LAN!"
echo "=============================================================================="
echo "👉 INSTRUCTION FOR SHIVA'S LAPTOP (RUN THIS COMMAND IN TERMINAL):"
echo ""
echo "   bash scripts/launch_gcs_compute.sh $HOST_IP"
echo ""
echo "=============================================================================="

while true; do
    sleep 3
    for i in "${!CHILD_PIDS[@]}"; do
        pid="${CHILD_PIDS[$i]}"
        if ! kill -0 "$pid" 2>/dev/null; then
            echo "⚠️  Process $pid exited. Check /tmp/sutra_*.log."
            unset 'CHILD_PIDS[i]'
        fi
    done
done
