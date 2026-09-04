#!/usr/bin/env bash
# ==============================================================================
# PROJECT SUTRA — Gazebo Sim 8 Model Environment & World Launcher
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Export Gazebo Sim Resource Path for x3_uav and disaster models
export GZ_SIM_RESOURCE_PATH="$PROJECT_ROOT/sutra_ws/src/sutra_sim/models:$PROJECT_ROOT/sutra_ws/src/sutra_sim:$GZ_SIM_RESOURCE_PATH"
export IGN_GAZEBO_RESOURCE_PATH="$GZ_SIM_RESOURCE_PATH"

echo "=============================================================================="
echo "🚁 LAUNCHING GAZEBO SIM 8 (SWARM ARENA)"
echo "=============================================================================="
echo "📁 Models Path: $PROJECT_ROOT/sutra_ws/src/sutra_sim/models"
echo "🌍 World File:  sutra_ws/src/sutra_sim/worlds/sandbox_swarm_world.sdf"
echo "=============================================================================="

gz sim -r "$PROJECT_ROOT/sutra_ws/src/sutra_sim/worlds/sandbox_swarm_world.sdf"
