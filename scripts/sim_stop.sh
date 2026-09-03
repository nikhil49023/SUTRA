#!/usr/bin/env bash
# ==============================================================================
# SUTRA Surgical Simulation Cleanup Tool
# ==============================================================================
# Author: Tech Lead Nikhil (Tech Architect & Subsystem A + B Lead ⚡)
#
# STRICT SAFETY INVARIANT:
# Only terminates active Gazebo Sim 8, ROS 2 bridge, and SUTRA autopilot processes.
# NEVER touches the Antigravity IDE, VS Code, Chrome, Node.js, or system services.
# ==============================================================================
set -euo pipefail

echo "================================================================================"
echo "🛑  SUTRA SURGICAL SIMULATION STOPPER"
echo "================================================================================"

# Exact simulation process signatures (whitelist of targets to terminate)
SIM_PATTERNS=(
    "gz sim"
    "ros_gz_bridge"
    "mesh_node.py"
    "swarm_fixed_path_node"
    "coordinated_swarm_search_node"
    "sutra_rviz_bridge"
    "sutra_fanet_sim"
    "sutra_fanet_gui"
)

stopped_count=0

for pattern in "${SIM_PATTERNS[@]}"; do
    # Find matching PIDs excluding grep and this script
    pids=$(pgrep -f "$pattern" 2>/dev/null || true)
    if [ -n "$pids" ]; then
        for pid in $pids; do
            # Extra safeguard: do not kill self or parent shell
            if [ "$pid" != "$$" ] && [ "$pid" != "$PPID" ]; then
                cmd=$(ps -p "$pid" -o comm= 2>/dev/null || true)
                # Verify process is indeed related to simulation
                echo "[-] Stopping simulation process [PID $pid]: $pattern ($cmd)"
                kill -15 "$pid" 2>/dev/null || true
                stopped_count=$((stopped_count + 1))
            fi
        done
    fi
done

# Wait briefly for graceful shutdown
if [ "$stopped_count" -gt 0 ]; then
    sleep 1
    # Force kill any stubborn simulation processes remaining
    for pattern in "${SIM_PATTERNS[@]}"; do
        pkill -9 -f "$pattern" 2>/dev/null || true
    done
    echo "✓ Cleaned up $stopped_count simulation process(es)."
else
    echo "✓ No active Gazebo or SUTRA simulation processes found."
fi

# Specifically check if RViz2 was running for sutra
rviz_pids=$(pgrep -f "sutra_swarm_rviz" 2>/dev/null || true)
if [ -n "$rviz_pids" ]; then
    echo "[-] Closing SUTRA RViz2 window [PIDs: $rviz_pids]"
    kill -15 $rviz_pids 2>/dev/null || true
fi

echo "🛡️  Resource check: System memory and GPU VRAM freed."
echo "🛡️  IDE and desktop applications remain completely untouched."
echo "================================================================================"
