SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="$PROJECT_ROOT/gazebo_supervisor.log"

while true; do
    echo "[$(date)] Starting Gazebo Sim..." >> "$LOG_FILE"
    bash "$SCRIPT_DIR/launch_flood_gazebo_gui.sh" >> "$LOG_FILE" 2>&1
    echo "[$(date)] Gazebo exited, relaunching in 2s..." >> "$LOG_FILE"
    sleep 2
done
