#!/usr/bin/env bash
set -e

source /opt/ros/jazzy/setup.bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SUTRA_SIM_DIR="$PROJECT_ROOT/sutra_ws/src/sutra_sim"
export GZ_SIM_RESOURCE_PATH="$SUTRA_SIM_DIR:$SUTRA_SIM_DIR/models:$SUTRA_SIM_DIR/worlds:${GZ_SIM_RESOURCE_PATH:-}"
export IGN_GAZEBO_RESOURCE_PATH="$GZ_SIM_RESOURCE_PATH"
export GZ_PARTITION="sutra_sim"

export DISPLAY=":0"
export WAYLAND_DISPLAY="wayland-0"
export QT_QPA_PLATFORM="xcb"

WORLD_FILE="$SUTRA_SIM_DIR/worlds/submerged_village_flood_world.sdf"

exec gz sim -r "$WORLD_FILE"
