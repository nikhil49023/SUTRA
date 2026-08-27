#!/usr/bin/env bash
# ==============================================================================
# PROJECT SUTRA — GPU-Accelerated Gazebo Sim 8 Swarm Ring Crossing Launcher
# ==============================================================================
# Author: Tech Lead Nikhil (Subsystem A Lead)
#
# Launches 5-Drone Pegasus Quadcopter Swarm in Gazebo Sim 8 (RTX 3050 Accelerated)
# performing live 3D Ring Crossing with SORCA collision avoidance (Gate G5 >= 2.80m).
#
# Usage:
#   ./scripts/run_gazebo_ring_crossing.sh            # Launch with 3D GUI Window
#   ./scripts/run_gazebo_ring_crossing.sh --headless # Run headless in terminal
# ==============================================================================

set -e

HEADLESS="false"
if [ "$1" == "--headless" ] || [ "$1" == "-s" ]; then
    HEADLESS="true"
fi

echo -e "\033[1;36m====================================================================\033[0m"
echo -e "\033[1;32m🚀 PROJECT SUTRA — GAZEBO SIM 8 SWARM RING CROSSING ARENA (RTX 3050)\033[0m"
echo -e "\033[1;36m====================================================================\033[0m"

# 1. Clean up old processes
echo "🧹 Terminating existing Gazebo & ROS 2 bridge instances..."
pkill -f "gz sim" 2>/dev/null || true
pkill -f "parameter_bridge" 2>/dev/null || true
pkill -f "orca_avoidance_node" 2>/dev/null || true
sleep 1

# 2. Source ROS 2 Jazzy & Colcon Workspace
source /opt/ros/jazzy/setup.bash
WS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../sutra_ws" && pwd)"
if [ -f "${WS_DIR}/install/setup.bash" ]; then
    source "${WS_DIR}/install/setup.bash"
fi

# 3. Configure Hardware GPU Environment Variables (NVIDIA RTX 3050 Laptop GPU)
export DISPLAY="${DISPLAY:-:1}"
export __NV_PRIME_RENDER_OFFLOAD=1
export __GLX_VENDOR_LIBRARY_NAME=nvidia
export VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/nvidia_icd.json
export LIBGL_ALWAYS_SOFTWARE=0
export MESA_GL_VERSION_OVERRIDE=4.5

# CycloneDDS & Gazebo Transport Partition
export CYCLONEDDS_URI="file://${WS_DIR}/cyclonedds.xml"
export GZ_IP="127.0.0.1"
export GZ_PARTITION="sutra_ring_crossing"

SIM_DIR="${WS_DIR}/src/sutra_sim"
MODELS_DIR="${SIM_DIR}/models"
WORLDS_DIR="${SIM_DIR}/worlds"
export GZ_SIM_RESOURCE_PATH="${SIM_DIR}:${MODELS_DIR}:${WORLDS_DIR}:${GZ_SIM_RESOURCE_PATH}"
export IGN_GAZEBO_RESOURCE_PATH="${GZ_SIM_RESOURCE_PATH}"

echo -e "\033[1;33m🎮 GPU Active: NVIDIA GeForce RTX 3050 Laptop (4GB VRAM)\033[0m"
echo -e "\033[1;33m🖥️ Display Server: ${DISPLAY}\033[0m"
echo -e "\033[1;33m🎯 World: ring_crossing_arena.sdf (R=12m perimeter, 5 UAVs)\033[0m"
echo -e "\033[1;33m🛡️ GNC Mode: 3D SORCA Collision Avoidance (50Hz setpoints)\033[0m"
echo "--------------------------------------------------------------------"

ros2 launch sutra_sim ring_crossing_gazebo.launch.py headless:="${HEADLESS}"
