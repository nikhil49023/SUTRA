#!/usr/bin/env bash
# ==============================================================================
# PROJECT SUTRA — Subsystem A: Flight Controller & Mission Planner Master Launcher
# ==============================================================================
# Starts Subsystem A GNC MAVLink SITL Bridge on UDP 14550 and connects
# ArduPilot Mission Planner / QGroundControl for live jury demonstration.
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=============================================================================="
echo "🚁 PROJECT SUTRA — FLIGHT CONTROLLER SITL & MISSION PLANNER BRIDGE"
echo "=============================================================================="
echo "🎯 Subsystem A (GNC): 50Hz Offboard Trajectory & PX4 Autopilot Simulation"
echo "📡 Protocol: Standard MAVLink v2 over UDP Port 14550"
echo "=============================================================================="

# Detect Local and LAN IP
LOCAL_IP="127.0.0.1"
LAN_IP=$(ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v "127.0.0.1" | head -n 1 || echo "127.0.0.1")

echo "🌐 Listening on Local: udp://${LOCAL_IP}:14550"
echo "📶 Listening on LAN:   udp://${LAN_IP}:14550 (For Windows Teammate Laptop)"
echo "------------------------------------------------------------------------------"

# 1. Start MAVLink SITL Bridge
python3 "$PROJECT_ROOT/sutra_ws/src/sutra_gnc/sutra_gnc/mavlink_sitl_bridge.py" --ip 127.0.0.1 --port 14550 &
BRIDGE_PID=$!

cleanup() {
    echo -e "\n🛑 Shutting down SUTRA Flight Controller Bridge..."
    kill $BRIDGE_PID 2>/dev/null || true
    wait $BRIDGE_PID 2>/dev/null || true
    echo "✅ Shutdown complete."
}
trap cleanup EXIT SIGINT SIGTERM

echo "✅ MAVLink SITL Bridge running (PID: $BRIDGE_PID)."
echo "------------------------------------------------------------------------------"

# 2. Check for Mission Planner Execution
MP_DIR="/home/nikhil/MissionPlanner"

if command -v mono >/dev/null 2>&1; then
    if [ -f "$MP_DIR/MissionPlanner.exe" ]; then
        echo "💻 Launching Mission Planner via Mono..."
        cd "$MP_DIR"
        mono MissionPlanner.exe &
        MP_PID=$!
        wait $MP_PID
    else
        echo "⚠️ MissionPlanner.exe not found in $MP_DIR."
    fi
else
    echo "ℹ️  Mono runtime is not installed on this Linux instance."
    echo ""
    echo "👉 OPTION 1 (Teammate's Windows Laptop — 0% Crash Risk):"
    echo "   1. Open Mission Planner on Windows."
    echo "   2. In top-right corner: Select 'UDP', Port '14550', Host '${LAN_IP}'."
    echo "   3. Click 'CONNECT'."
    echo ""
    echo "👉 OPTION 2 (Run locally on this Ubuntu laptop):"
    echo "   1. Open a new terminal."
    echo "   2. Run: sudo apt-get update && sudo apt-get install -y mono-complete"
    echo "   3. Run: cd /home/nikhil/MissionPlanner && mono MissionPlanner.exe"
    echo "------------------------------------------------------------------------------"
    echo "Press Ctrl+C to stop the MAVLink telemetry stream."
    wait $BRIDGE_PID
fi
