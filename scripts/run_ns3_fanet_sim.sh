#!/usr/bin/env bash
# ==============================================================================
# SUTRA Subsystem B: Industry-Standard C++ NS-3 FANET Swarm Simulation Runner
# Protocol: IEEE 802.11a Ad-Hoc Wireless Mesh + IETF RFC 3626 OLSR Routing
# Verification Target: Gate G2 (PDR >= 98.0%, Latency < 8.0 ms)
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
NS3_DIR="$WORKSPACE_ROOT/sutra_ws/src/sutra_comms/ns3"

echo "================================================================================"
echo "📡 PROJECT SUTRA — NS-3 DISCRETE-EVENT FANET SWARM NETWORK SIMULATOR"
echo "================================================================================"

mkdir -p "$NS3_DIR/lib"
ln -sf /usr/lib/x86_64-linux-gnu/libgsl.so.27 "$NS3_DIR/lib/libgsl.so" 2>/dev/null || true
ln -sf /usr/lib/x86_64-linux-gnu/libgslcblas.so.0 "$NS3_DIR/lib/libgslcblas.so" 2>/dev/null || true

if [ ! -f "$NS3_DIR/sutra_fanet_sim" ] || [ "$NS3_DIR/sutra_fanet_swarm_sim.cc" -nt "$NS3_DIR/sutra_fanet_sim" ]; then
    echo "[*] Compiling C++ NS-3 FANET Simulation with OLSR, NetAnim & FlowMonitor..."
    g++ -std=c++17 "$NS3_DIR/sutra_fanet_swarm_sim.cc" -o "$NS3_DIR/sutra_fanet_sim" \
        -L "$NS3_DIR/lib" \
        $(pkg-config --cflags --libs ns3-core ns3-network ns3-mobility ns3-wifi ns3-internet ns3-olsr ns3-netanim ns3-applications ns3-flow-monitor | sed 's|/usr/lib/x86_64-linux-gnu/libgsl.so|-lgsl|g' | sed 's|/usr/lib/x86_64-linux-gnu/libgslcblas.so|-lgslcblas|g')
    echo "✓ Build successful: $NS3_DIR/sutra_fanet_sim"
fi

echo "[*] Launching simulation..."
"$NS3_DIR/sutra_fanet_sim"
