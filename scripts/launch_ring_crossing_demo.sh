#!/usr/bin/env bash
# ==============================================================================
# PROJECT SUTRA — Industry-Grade 3D Swarm Ring Crossing Showcase Launcher
# ==============================================================================
# Author: Tech Lead Nikhil (Subsystem A Lead)
#
# Provides 3 Clean, Zero-Bloat Presentation Modes for Jury Demos:
#   1. web      -> Interactive 3D GCS WebGL Arena (React 18 + Canvas 60 FPS HUD)
#   2. visual   -> High-FPS 3D Spatial + Radar Dual-Viewport Visualizer (Python/Matplotlib)
#   3. gazebo   -> Full GPU-Accelerated Gazebo Sim 8 3D Physics Digital Twin
# ==============================================================================

set -e

MODE="${1:-web}"

echo -e "\033[1;36m====================================================================\033[0m"
echo -e "\033[1;32m🚁 SUTRA 3D SWARM RING CROSSING SHOWCASE (GATE G5: CLEARANCE >= 2.80M)\033[0m"
echo -e "\033[1;36m====================================================================\033[0m"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

case "${MODE}" in
    web|gcs)
        echo -e "\033[1;33m🌐 Starting Interactive 3D WebGL Ring Crossing Arena on GCS Dashboard...\033[0m"
        echo "   Access in your browser at: http://localhost:5173 (Click '3D Ring Crossing Arena' tab)"
        cd sutra_ws/src/sutra_gcs
        npm run dev
        ;;

    visual|standalone)
        echo -e "\033[1;33m🖥️ Launching Standalone 3D Spatial + 2D Radar Dual-Viewport Visualizer...\033[0m"
        echo "   Controls: [SPACE] Pause | [R] Reset | [S] Toggle SORCA | [O] Toggle Pillar | [Q] Exit"
        python3 scripts/run_visual_ring_crossing_sim.py
        ;;

    gazebo|sim)
        echo -e "\033[1;33m🎮 Launching GPU-Accelerated Gazebo Sim 8 Digital Twin (RTX 3050)...\033[0m"
        ./scripts/launch_gpu_gazebo_sim.sh swarm
        ;;

    *)
        echo "Usage: $0 {web | visual | gazebo}"
        echo "  web     : Launch 3D WebGL GCS Dashboard (Default)"
        echo "  visual  : Launch Standalone Dual-Viewport Python GUI"
        echo "  gazebo  : Launch Gazebo Sim 8 3D Physics Simulator"
        exit 1
        ;;
esac
