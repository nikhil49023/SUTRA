#!/usr/bin/env bash
# ==============================================================================
# PROJECT SUTRA — CANOPY FOREST WORLD GAZEBO SIM 8 GUI LAUNCHER (SH-DST-05)
# ==============================================================================
# Launches Gazebo Sim 8 GUI with the photorealistic forest canopy disaster world,
# mountain terrain, pine tree clusters, and 5 SUTRA Pegasus UAVs.
# Includes automatic failsafe camera alignment to the calibrated overhead view.
# ==============================================================================

set -e

# Clean Snap GTK environment variables to prevent GUI crash
unset GTK_PATH GTK_IM_MODULE LOCPATH GIO_MODULE_DIR LD_LIBRARY_PATH

source /opt/ros/jazzy/setup.bash 2>/dev/null || true

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SUTRA_SIM_DIR="$PROJECT_ROOT/sutra_ws/src/sutra_sim"

export GZ_SIM_RESOURCE_PATH="$SUTRA_SIM_DIR:$SUTRA_SIM_DIR/models:$SUTRA_SIM_DIR/worlds:${GZ_SIM_RESOURCE_PATH:-}"
export IGN_GAZEBO_RESOURCE_PATH="$GZ_SIM_RESOURCE_PATH"
export SDF_PATH="$SUTRA_SIM_DIR/models:${SDF_PATH:-}"
export GZ_PARTITION="sutra_sim"

export DISPLAY="${DISPLAY:-:0}"
export WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-wayland-0}"
export QT_QPA_PLATFORM="${QT_QPA_PLATFORM:-xcb}"
xhost +local: >/dev/null 2>&1 || true

WORLD_FILE="$SUTRA_SIM_DIR/worlds/forest_canopy_sar_world.sdf"

echo "=============================================================================="
echo "🌲 PROJECT SUTRA — LAUNCHING CANOPY FOREST WORLD (GAZEBO SIM 8)"
echo "=============================================================================="
echo "📍 WORLD SDF         : $WORLD_FILE"
echo "🎮 CAMERA VIEWPOINT  : Overhead Cinematic Hero (16m, -16m, 62m | Pitch 37.6°)"
echo "🚁 DRONES SPAWNED    : 5x SUTRA Pegasus UAVs (uav_alpha .. uav_epsilon)"
echo "=============================================================================="

# Background Camera Alignment Watcher (snaps camera to overhead hero viewpoint)
(
    for i in {1..10}; do
        sleep 1.0
        if gz service -s /gui/move_to/pose \
            --reqtype gz.msgs.GUICamera \
            --reptype gz.msgs.Boolean \
            --timeout 1500 \
            --req 'pose: { position: { x: 16.0, y: -16.0, z: 62.0 }, orientation: { x: -0.2809, y: 0.1590, z: 0.8236, w: 0.4663 } }' \
            >/dev/null 2>&1; then
            echo "   ✅ Gazebo GUI Camera aligned to Overhead Cinematic View."
            break
        fi
    done
) &

exec gz sim -r "$WORLD_FILE"
