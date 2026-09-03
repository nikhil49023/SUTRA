#!/usr/bin/env bash
# ==============================================================================
# SUTRA Shortcut: Launch Master Disaster Arena World (Bengaluru Datum)
# ==============================================================================
set -eo pipefail

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
export GZ_PARTITION="sutra_sim"
SIM_DIR="$WORKSPACE_ROOT/sutra_ws/src/sutra_sim"
export GZ_SIM_RESOURCE_PATH="$SIM_DIR:$SIM_DIR/models:$SIM_DIR/worlds:${GZ_SIM_RESOURCE_PATH:-}"
export IGN_GAZEBO_RESOURCE_PATH="$GZ_SIM_RESOURCE_PATH"

echo "[+] Launching Master 80m Disaster Swarm Simulation (Bengaluru WGS84 Datum)..."
echo "    • Arena : Ruined columns, debris, survivor targets, thermal beacons"
echo "    • Swarm : 5x Quadcopters with multi-spectral sensor payloads"
echo "    • Comms : 802.11s Mesh + SwarmRAFT Consensus + Deep JSCC"

exec nice -n 10 ros2 launch sutra_sim sutra_master_integrated_sim.launch.py world:=master_swarm_disaster_world.sdf
