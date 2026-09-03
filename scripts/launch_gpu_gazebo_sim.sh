#!/usr/bin/env bash
# ==============================================================================
# PROJECT SUTRA — GPU-Accelerated Gazebo Sim 8 Launcher
# ==============================================================================
# Forces NVIDIA PRIME GPU offload to leverage the discrete RTX 3050 GPU (4GB VRAM)
# for high-performance 3D rendering (OGRE 2 / OpenGL / Vulkan).
#
# Usage:
#   ./scripts/launch_gpu_gazebo_sim.sh swarm     # 5-Drone Pegasus Swarm & ORCA 3D
#   ./scripts/launch_gpu_gazebo_sim.sh flight    # Single Drone 3D Ring Pursuit
#   ./scripts/launch_gpu_gazebo_sim.sh obstacle  # 50m Rubble & Obstacle Slalom
#   ./scripts/launch_gpu_gazebo_sim.sh master    # 5-UAV Master Disaster Digital Twin
# ==============================================================================

MODE="${1:-swarm}"

echo -e "\033[1;36m====================================================================\033[0m"
echo -e "\033[1;32m🚀 SUTRA GPU-ACCELERATED GAZEBO SIM 8 LAUNCHER (RTX 3050 / 4GB VRAM)\033[0m"
echo -e "\033[1;36m====================================================================\033[0m"

# 1. Clean up old instances
echo "🧹 Terminating existing Gazebo & ROS bridge instances..."
pkill -f "gz sim" 2>/dev/null || true
pkill -f "ros_gz_bridge" 2>/dev/null || true
sleep 1

# 2. Source ROS 2 Jazzy & Workspace
source /opt/ros/jazzy/setup.bash
WS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../sutra_ws" && pwd)"
if [ -f "${WS_DIR}/install/setup.bash" ]; then
    source "${WS_DIR}/install/setup.bash"
fi

# 3. Configure Hardware GPU Environment Variables
export DISPLAY="${DISPLAY:-:1}"
export __NV_PRIME_RENDER_OFFLOAD=1
export __GLX_VENDOR_LIBRARY_NAME=nvidia
export VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/nvidia_icd.json
export LIBGL_ALWAYS_SOFTWARE=0
export MESA_GL_VERSION_OVERRIDE=4.5

# CycloneDDS & Gazebo Transport
export CYCLONEDDS_URI="file://${WS_DIR}/cyclonedds.xml"
export GZ_IP="127.0.0.1"
export GZ_PARTITION="sutra_sim"

SIM_DIR="${WS_DIR}/src/sutra_sim"
MODELS_DIR="${SIM_DIR}/models"
WORLDS_DIR="${SIM_DIR}/worlds"
export GZ_SIM_RESOURCE_PATH="${SIM_DIR}:${MODELS_DIR}:${WORLDS_DIR}:${GZ_SIM_RESOURCE_PATH}"
export IGN_GAZEBO_RESOURCE_PATH="${GZ_SIM_RESOURCE_PATH}"

echo -e "\033[1;33m🎮 GPU Active: NVIDIA RTX 3050 Laptop (4GB VRAM)\033[0m"
echo -e "\033[1;33m🖥️ Display: ${DISPLAY}\033[0m"
echo -e "\033[1;33m🎯 Simulation Mode: ${MODE}\033[0m"
echo "--------------------------------------------------------------------"

case "${MODE}" in
    swarm)
        echo "🚁 Launching 5-Drone Pegasus Swarm & ORCA 3D Avoidance..."
        ros2 launch sutra_sim sandbox_swarm.launch.py headless:=false
        ;;
    flight)
        echo "🚁 Launching Single Drone 3D Dynamic Ring Pursuit..."
        ros2 launch sutra_sim phase1_flight.launch.py headless:=false
        ;;
    obstacle)
        echo "🚁 Launching Single Drone Rubble & Obstacle Slalom Course..."
        ros2 launch sutra_sim single_drone_obstacle.launch.py headless:=false
        ;;
    master)
        echo "🚁 Launching 5-UAV Master Disaster Digital Twin Swarm..."
        ros2 launch sutra_sim sutra_master_integrated_sim.launch.py world:=master_swarm_disaster_world headless:=false
        ;;
    *)
        echo "❌ Unknown mode '${MODE}'! Defaulting to 'swarm'..."
        ros2 launch sutra_sim sandbox_swarm.launch.py headless:=false
        ;;
esac
