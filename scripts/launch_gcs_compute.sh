#!/usr/bin/env bash
# ==============================================================================
# PROJECT SUTRA — DISTRIBUTED GCS COMPUTE & DASHBOARD LAUNCHER (SHIVA'S LAPTOP)
# ==============================================================================
# Track: Defence & SpaceTech (SH-DST-05) | Team: SHIH26-TID-361
# 
# Usage:
#   ./scripts/launch_gcs_compute.sh [HOST_IP]
# Example:
#   ./scripts/launch_gcs_compute.sh 192.168.1.15
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

HOST_IP="${1:-127.0.0.1}"

echo "=============================================================================="
echo "🧠 PROJECT SUTRA — GCS TACTICAL COMPUTE POST (SHIVA'S LAPTOP)"
echo "=============================================================================="
echo "🎯 TARGET SIMULATION HOST : $HOST_IP"
echo "📡 HOST WS INGESTION      : ws://${HOST_IP}:9090"
echo "🗺️  LOCAL MBTILES ENGINE   : http://127.0.0.1:8088/tiles/{z}/{x}/{y}.png"
echo "💻 LOCAL GCS FRONTEND     : http://127.0.0.1:5173"
echo "=============================================================================="

CHILD_PIDS=()

cleanup() {
    echo -e "\n🛑 Shutting down SUTRA GCS Compute Post..."
    for pid in "${CHILD_PIDS[@]}"; do
        kill "$pid" 2>/dev/null || true
    done
    wait 2>/dev/null || true
    echo "✅ GCS compute services cleanly stopped."
}
trap cleanup EXIT SIGINT SIGTERM

# Step 0: Pre-flight cleanup of old local processes
pkill -f "sutra_tile_server.py" 2>/dev/null || true
pkill -f "sutra_gcs_compute_worker.py" 2>/dev/null || true

# Step 1: Start Local SQLite / MBTiles Tile Server
echo "🗺️  [1/3] Starting Local MBTiles Dynamic Orthomosaic Server (Port 8088)..."
python3 "$PROJECT_ROOT/sutra_ws/src/sutra_gcs/sutra_tile_server.py" > /tmp/sutra_shiva_tiles.log 2>&1 &
CHILD_PIDS+=($!)
sleep 1.0
echo "   ✅ MBTiles server active."

# Step 2: Start GCS Compute Worker (Perception, Raycasting, Deep JSCC)
echo "🧠 [2/3] Starting SUTRA Compute & Perception Worker (Connecting to $HOST_IP)..."
python3 "$PROJECT_ROOT/sutra_ws/src/sutra_gcs/sutra_gcs_compute_worker.py" "$HOST_IP" > /tmp/sutra_shiva_compute.log 2>&1 &
CHILD_PIDS+=($!)
sleep 1.0
echo "   ✅ Compute worker active."

# Step 3: Serve & Launch GCS Web UI
echo "🌐 [3/3] Serving GCS Frontend Dashboard..."
cd "$PROJECT_ROOT/frontend"

# Launch lightweight static HTTP server if built or vite
if [ -d "$PROJECT_ROOT/frontend/dist" ]; then
    python3 -m http.server 5173 --directory "$PROJECT_ROOT/frontend/dist" > /tmp/sutra_shiva_web.log 2>&1 &
    CHILD_PIDS+=($!)
else
    python3 -m http.server 5173 --directory "$PROJECT_ROOT/frontend" > /tmp/sutra_shiva_web.log 2>&1 &
    CHILD_PIDS+=($!)
fi

echo "   ✅ GCS Web Dashboard active at http://127.0.0.1:5173"

# Automatically open browser on Shiva's laptop
URL="http://127.0.0.1:5173/?remote=127.0.0.1"
if command -v xdg-open > /dev/null 2>&1; then
    xdg-open "$URL" 2>/dev/null &
elif command -v open > /dev/null 2>&1; then
    open "$URL" 2>/dev/null &
fi

echo ""
echo "=============================================================================="
echo "🎉 GCS COMPUTE POST IS LIVE & PAIRED WITH SIMULATION HOST!"
echo "=============================================================================="
echo "📋 JURY DEMO CHECKLIST:"
echo "   1. Browser: View 360° live feeds with YOLO detection boxes in HUD."
echo "   2. Map View: Switch Basemap to 'Live JSCC Ortho' to see drone-mapped ground truth."
echo "   3. Emergency RTL: Click 'RTL' button in GCS top-bar to command swarm in Gazebo."
echo "=============================================================================="

while true; do
    sleep 3
    for i in "${!CHILD_PIDS[@]}"; do
        pid="${CHILD_PIDS[$i]}"
        if ! kill -0 "$pid" 2>/dev/null; then
            echo "⚠️  Process $pid exited. Check /tmp/sutra_shiva_*.log."
            unset 'CHILD_PIDS[i]'
        fi
    done
done
