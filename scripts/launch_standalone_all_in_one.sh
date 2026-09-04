#!/usr/bin/env bash
# ==============================================================================
# PROJECT SUTRA — STANDALONE ALL-IN-ONE MASTER LAUNCHER (SINGLE WORKSTATION)
# ==============================================================================
# Track: Defence & SpaceTech (SH-DST-05) | Team: SHIH26-TID-361
#
# Launches both Gazebo Sim 8 Simulation Host and Tactical GCS Dashboard
# on Nikhil's machine (ASUS TUF A15).
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=============================================================================="
echo "⚡ PROJECT SUTRA — STANDALONE ALL-IN-ONE WORKSTATION LAUNCHER"
echo "=============================================================================="

CHILD_PIDS=()

cleanup() {
    echo -e "\n🛑 Shutting down standalone SUTRA services..."
    for pid in "${CHILD_PIDS[@]}"; do
        kill "$pid" 2>/dev/null || true
    done
    wait 2>/dev/null || true
    echo "✅ Clean shutdown complete."
}
trap cleanup EXIT SIGINT SIGTERM

# Step 1: Verify / Start Dynamic Tile Server (Port 8088)
if ! ss -tlpn | grep -q ":8088 "; then
    echo "🗺️  [1/4] Starting Local Dynamic MBTiles Tile Server on port 8088..."
    python3 "$PROJECT_ROOT/sutra_ws/src/sutra_gcs/sutra_tile_server.py" > /tmp/sutra_local_tiles.log 2>&1 &
    CHILD_PIDS+=($!)
    sleep 1.0
    echo "   ✅ Tile server active on http://127.0.0.1:8088"
else
    echo "🗺️  [1/4] Tile server already running on port 8088."
fi

# Step 2: Verify / Start Simulation Exporter (Port 9090)
if ! ss -tlpn | grep -q ":9090 "; then
    echo "📡 [2/4] Starting Simulation Exporter (Port 9090)..."
    python3 "$PROJECT_ROOT/sutra_ws/src/sutra_comms/sutra_comms/sutra_sim_exporter.py" > /tmp/sutra_sim_exporter.log 2>&1 &
    CHILD_PIDS+=($!)
    sleep 1.5
    echo "   ✅ Simulation Exporter active on ws://127.0.0.1:9090"
else
    echo "📡 [2/4] Simulation Exporter already running on port 9090."
fi

# Step 3: Verify / Start Static GCS HTTP Server (Port 5173)
if ! ss -tlpn | grep -q ":5173 "; then
    echo "🌐 [3/4] Serving GCS Tactical Frontend on port 5173..."
    python3 -m http.server 5173 --directory "$PROJECT_ROOT/sutra_ws/src/sutra_gcs/dist" > /tmp/sutra_web.log 2>&1 &
    CHILD_PIDS+=($!)
    sleep 1.0
    echo "   ✅ GCS Web Dashboard active at http://127.0.0.1:5173"
else
    echo "🌐 [3/4] GCS Web Dashboard already serving on port 5173."
fi

# Step 4: Launch Local Tactical HUD in Browser
DASHBOARD_URL="http://127.0.0.1:5173"
echo "💻 [4/4] Opening Tactical GCS Dashboard in browser: $DASHBOARD_URL"

export DISPLAY="${DISPLAY:-:1}"

if command -v google-chrome > /dev/null 2>&1; then
    google-chrome --app="$DASHBOARD_URL" --new-window > /dev/null 2>&1 &
elif command -v google-chrome-stable > /dev/null 2>&1; then
    google-chrome-stable --app="$DASHBOARD_URL" --new-window > /dev/null 2>&1 &
elif command -v xdg-open > /dev/null 2>&1; then
    xdg-open "$DASHBOARD_URL" > /dev/null 2>&1 &
fi

echo ""
echo "=============================================================================="
echo "🎉 PROJECT SUTRA ALL-IN-ONE STANDALONE ENVIRONMENT ACTIVE!"
echo "=============================================================================="
echo "🎯 Gazebo Sim 8 GUI        : Running (forest_canopy_sar_world.sdf)"
echo "📡 Simulation Bridge       : ws://127.0.0.1:9090 (5-UAV Telemetry + JSCC)"
echo "🗺️  Dynamic MBTiles Server  : http://127.0.0.1:8088/tiles/{z}/{x}/{y}.png"
echo "💻 Tactical GCS Dashboard  : http://127.0.0.1:5173"
echo "=============================================================================="

# Keep alive to monitor child processes if any were spawned in this session
if [ ${#CHILD_PIDS[@]} -gt 0 ]; then
    while true; do
        sleep 3
        for i in "${!CHILD_PIDS[@]}"; do
            pid="${CHILD_PIDS[$i]}"
            if ! kill -0 "$pid" 2>/dev/null; then
                echo "⚠️  Process $pid exited."
                unset 'CHILD_PIDS[i]'
            fi
        done
    done
fi
