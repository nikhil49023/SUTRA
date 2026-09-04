#!/usr/bin/env bash
# ==============================================================================
# PROJECT SUTRA — NVIDIA SIONNA 6G RF SIMULATION WORKBENCH LAUNCHER
# ==============================================================================
# Team: SHIH26-TID-361 (Project SUTRA) | Defence & SpaceTech Track
# Author: Tech Lead Nikhil (Subsystem B Comms & Subsystem A GNC Architect ⚡)
#
# Launches the standalone industry-standard RF link-level simulation workbench
# featuring NVIDIA Sionna differentiable 6G neural autoencoder & 3GPP channels.
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$WORKSPACE_ROOT"

# Ensure X11 display is targeted
export DISPLAY="${DISPLAY:-:1}"

echo "================================================================================"
echo "📡 PROJECT SUTRA — NVIDIA SIONNA 6G RF LINK-LEVEL SIMULATION WORKBENCH"
echo "================================================================================"
echo "🎯 Subsystem B (Comms/JSCC) & Subsystem C (AI Perception & Geolocation)"
echo "🖥️ Display: $DISPLAY | GPU: $(python3 -c 'import torch; print(torch.cuda.get_device_name(0) if torch.cuda.is_available() else "Host CPU")')"
echo "================================================================================"
echo ""
echo "ACTIVE DISASTER RECONNAISSANCE STOCK FEEDS:"
echo "  [1] LANDSLIDE : Mountain Landslide & Severed Cliff SAR (Rescue Team & Cliff Edge)"
echo "  [2] FLOOD     : Submerged Urban Flood SAR (Submerged Roads, Boats, Vehicles)"
echo "  [3] THERMAL   : Aerial Wildfire FLIR Thermal Search & Hotspot Recon"
echo "  [4] EW-ZONE   : Electronic Warfare Tactical Ridge Penetration (-18dB Jamming)"
echo ""
echo "CONTROLS & INTERACTION (Available via Mouse Clicks or Keyboard):"
echo "  • Scenarios    : Click buttons or press [1]-[4] to switch disaster video feed"
echo "  • EW Jamming   : Click [J] JAMMER button or press [J] to toggle -18dB Jamming"
echo "  • Modality     : Click [M] MODALITY button or press [M] (Optical RGB <-> FLIR Thermal)"
echo "  • UAV Distance : Drag slider, click [+/- 100m], or use [W]/[X] or [UP]/[DOWN]"
echo "  • Channel SNR  : Drag slider, click [+/- 2dB], use [+/-] keys, or click [AUTO SNR]"
echo "  • Simulation   : [SPACE] Pause/Resume, [D] Step Single Frame, [[] / []] Adjust FPS"
echo "  • Audit Export : Click [S] EXPORT SNAPSHOT or press [S] to save High-Res PNG"
echo "  • Exit         : Click [Q] QUIT or press [Q]"
echo ""
echo "🚀 Launching Standalone Simulation Window on your screen..."
echo "================================================================================"

exec python3 "$WORKSPACE_ROOT/scripts/run_sionna_deep_jscc_rf_workbench.py" "$@"
