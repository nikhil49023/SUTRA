#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="$PROJECT_ROOT/gazebo_supervisor.log"

echo "[$(date)] SUTRA Gazebo Sim Self-Healing Supervisor started." >> "$LOG_FILE"

while true; do
    echo "[$(date)] Launching Gazebo Sim GUI..." >> "$LOG_FILE"
    bash "$SCRIPT_DIR/launch_flood_gazebo_gui.sh" >> "$LOG_FILE" 2>&1 || true
    echo "[$(date)] Gazebo exited. Cleaning stale processes and relaunching in 2s..." >> "$LOG_FILE"
    pkill -9 -f "gz sim -s" >/dev/null 2>&1 || true
    pkill -9 -f "gz sim -g" >/dev/null 2>&1 || true
    sleep 2
done

