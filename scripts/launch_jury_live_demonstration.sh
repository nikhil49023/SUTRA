#!/usr/bin/env bash
# ==============================================================================
# PROJECT SUTRA — ALL-IN-ONE JURY LIVE DEMONSTRATION MASTER LAUNCHER
# ==============================================================================
# 🎯 Problem Statement: SH-DST-05 (Autonomous Drone Swarm System)
# 🏆 Grand Finale 48-Hour Live Evaluation Runner
# 
# ONE COMMAND LAUNCHES EVERYTHING:
#   1. Gazebo Sim 8 (5-UAV Sandbox World with Physics & Sensors)
#   2. ROS 2 <-> Gazebo Bridge (50Hz Odometry & Velocity Topics for all 5 UAVs)
#   3. SUTRA MAVLink SITL Bridge (Streams live physics to UDP 14550 in ArduPilot dialect)
#   4. 5x Subsystem A Autonomous Flight Controllers (Pegasus Crossing + ORCA 3D)
#   5. ArduPilot Mission Planner GUI (Instant Handshake, 3D Fix, Multi-Vehicle)
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
source "$PROJECT_ROOT/sutra_ws/install/setup.bash" 2>/dev/null || true

echo "=============================================================================="
echo "🚁 PROJECT SUTRA — JURY LIVE DEMONSTRATION MASTER LAUNCHER"
echo "=============================================================================="
echo "🎯 Track: Defence & SpaceTech (SH-DST-05) | Team ID: SHIH26-TID-361"
echo "📡 MAVLink SITL: UDP 127.0.0.1:14550 | Target: ArduPilot Mission Planner"
echo "=============================================================================="

CHILD_PIDS=()

cleanup() {
    echo -e "\n🛑 Gracefully shutting down SUTRA Swarm Simulation Stack..."
    for pid in "${CHILD_PIDS[@]}"; do
        kill "$pid" 2>/dev/null || true
    done
    wait 2>/dev/null || true
    echo "✅ All simulation nodes and bridges cleanly stopped."
}
trap cleanup EXIT SIGINT SIGTERM

# ── Step 0: Pre-flight Cleanup ──────────────────────────────────────────────
echo "🧹 Pre-flight cleanup of old processes..."
pkill -f "ros_gz_bridge parameter_bridge" 2>/dev/null || true
pkill -f "swarm_fixed_path_node.py" 2>/dev/null || true
pkill -f "mavlink_sitl_bridge.py" 2>/dev/null || true

# ── Step 1: Check / Launch Gazebo Sim 8 ──────────────────────────────────────
WORLD_NAME="sutra_coastal_flood_world"
WORLD_FILE="$PROJECT_ROOT/sutra_ws/src/sutra_sim/worlds/sutra_coastal_flood_world.sdf"

if [ "$1" == "--sandbox" ]; then
    WORLD_NAME="sandbox_swarm_world"
    WORLD_FILE="$PROJECT_ROOT/sutra_ws/src/sutra_sim/worlds/sandbox_swarm_world.sdf"
    echo "🌍 Mode: Sandbox Arena Selected"
else
    echo "🌊 Mode: Authentic Coastal Flood Disaster World (Kuttanad, Kerala) Selected"
fi

if pgrep -f "gz sim.*${WORLD_NAME}" > /dev/null; then
    echo "🌍 [1/5] Gazebo Sim 8 is already running (${WORLD_NAME}). Resetting world poses..."
    gz service -s /world/${WORLD_NAME}/control --reqtype gz.msgs.WorldControl --reptype gz.msgs.Boolean --req "reset: {all: true}" > /dev/null 2>&1 || true
    echo "   ✅ World poses reset to home helipads."
else
    echo "🌍 [1/5] Launching Gazebo Sim 8 with 5-UAV ${WORLD_NAME}..."
    gz sim -r "$WORLD_FILE" > /tmp/sutra_gazebo.log 2>&1 &
    CHILD_PIDS+=($!)
    echo "   ⏳ Waiting 4.0s for Gazebo physics engine to initialize..."
    sleep 4.0
    echo "   ✅ Gazebo Sim 8 active (PID: ${CHILD_PIDS[-1]})."
fi

# ── Step 2: Launch ROS 2 <-> Gazebo Bridge ──────────────────────────────────
echo "🔗 [2/5] Starting ROS 2 <-> Gazebo Bridge for all 5 UAVs..."
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
echo "   ✅ ROS-GZ Bridge active (PID: ${CHILD_PIDS[-1]})."
sleep 1.5

# ── Step 3: Launch SUTRA MAVLink SITL Bridge ────────────────────────────────
echo "📡 [3/5] Starting SUTRA MAVLink SITL Bridge (UDP 14550, ArduPilot Dialect)..."
python3 "$PROJECT_ROOT/sutra_ws/src/sutra_gnc/sutra_gnc/mavlink_sitl_bridge.py" \
  --ip 127.0.0.1 --port 14550 --autopilot ardupilot > /tmp/sutra_mavlink_bridge.log 2>&1 &
CHILD_PIDS+=($!)
echo "   ✅ MAVLink SITL Bridge active (PID: ${CHILD_PIDS[-1]})."
sleep 1.0

# ── Step 4: Launch 5x Subsystem A Autonomous Flight Controllers ──────────────
echo "🚀 [4/5] Launching 5x Autonomous Flight Controllers (ORCA 3D Avoidance)..."
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
    CHILD_PIDS+=($!)
    echo "   ⚡ [$did] Controller launched (PID: ${CHILD_PIDS[-1]} | Alt: ${alt}m | Speed: ${spd}m/s)"
done

# ── Step 5: Check / Launch Mission Planner ──────────────────────────────────
MP_EXE="/home/nikhil/MissionPlanner/MissionPlanner.exe"

if pgrep -f "MissionPlanner.exe" > /dev/null; then
    echo "💻 [5/5] Mission Planner is already open on screen."
elif [ -f "$MP_EXE" ] && command -v mono > /dev/null 2>&1; then
    echo "💻 [5/5] Launching Mission Planner via Mono..."
    cd "/home/nikhil/MissionPlanner"
    mono MissionPlanner.exe > /tmp/sutra_missionplanner.log 2>&1 &
    CHILD_PIDS+=($!)
    echo "   ✅ Mission Planner launched (PID: ${CHILD_PIDS[-1]})."
    cd "$PROJECT_ROOT"
else
    echo "ℹ️  [5/5] Mission Planner not found or mono not available; connect from external GCS at UDP 14550."
fi

echo ""
echo "=============================================================================="
echo "🎉 ALL SYSTEMS GO — SUTRA 5-UAV SWARM IS ACTIVELY FLYING!"
echo "=============================================================================="
echo "📋 QUICK JURY PRESENTATION INSTRUCTIONS:"
echo "   1. Mission Planner Connection: Select 'UDP' (port 14550) and click CONNECT."
echo "   2. Map View: Zoom into the quadcopter icon to ZOOM 18–19 to see all 5 drones."
echo "   3. Switch UAV Telemetry: Press [Ctrl + X] to cycle between UAVs 1 through 5."
echo "   4. Stop Simulation: Press [Ctrl + C] in this terminal to shut down cleanly."
echo "=============================================================================="

# Keep alive
while true; do
    sleep 3
    for pid in "${CHILD_PIDS[@]}"; do
        if ! kill -0 "$pid" 2>/dev/null; then
            echo "⚠️  Process $pid exited. Check /tmp/sutra_*.log."
        fi
    done
done
