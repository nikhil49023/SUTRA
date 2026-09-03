#!/usr/bin/env bash
# ==============================================================================
# SUTRA Shortcut: Launch NS-3 Discrete-Event Wireless Mesh Simulation
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GUI_FLAG="${1:-}"

echo "[+] Launching NS-3 Discrete-Event FANET Mesh Simulation..."
if [ "$GUI_FLAG" = "--gui" ] || [ "$GUI_FLAG" = "-g" ]; then
    bash "$SCRIPT_DIR/run_ns3_fanet_sim.sh" --gui
else
    bash "$SCRIPT_DIR/run_ns3_fanet_sim.sh"
fi
