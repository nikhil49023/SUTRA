#!/bin/bash
# ==============================================================================
# SUTRA: Official 5-Drone PX4 Swarm Launcher
# Gazebo Harmonic + px4_msgs main + Micro-XRCE-DDS-Agent
# Validated fixes applied:
#   - Fix 3: PX4-Autopilot main branch (Harmonic-native gz_x500)
#   - Fix 5: 8s GZ server init wait, 3s subsequent standalone intervals
#   - Fix 6: PX4_GZ_WORLD parameterized (default: "default")
#   - Instance 0 = no standalone (starts GZ server)
#   - Instances 1..4 = PX4_GZ_STANDALONE=1
# Topic namespacing:
#   Instance 0  -> /fmu/* (target_system=1)
#   Instance 1+ -> /px4_{i}/fmu/* (target_system=i+1)
# ==============================================================================
trap 'echo "🛑 Shutting down SUTRA swarm..."; kill $(jobs -p) 2>/dev/null; wait' EXIT INT TERM

WORLD_NAME="${1:-default}"
PX4_DIR="$HOME/PX4-Autopilot"
PX4_BIN="$PX4_DIR/build/px4_sitl_default/bin/px4"

# Validate PX4 binary exists
if [ ! -f "$PX4_BIN" ]; then
    echo "❌ PX4 SITL binary not found at: $PX4_BIN"
    echo "   Run: bash scripts/setup_official_px4_environment.sh first."
    exit 1
fi

# Validate Micro-XRCE-DDS-Agent available
if ! command -v MicroXRCEAgent &>/dev/null; then
    echo "❌ MicroXRCEAgent not found in PATH."
    echo "   Run: bash scripts/setup_official_px4_environment.sh first."
    exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  SUTRA — Official 5-Drone PX4 Swarm Launcher                ║"
echo "║  World: $WORLD_NAME"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ── Stage 1: Start DDS Bridge ─────────────────────────────────────────────────
echo "🚀 [Stage 1/3] Starting Micro-XRCE-DDS-Agent on UDP:8888..."
MicroXRCEAgent udp4 -p 8888 &
AGENT_PID=$!
sleep 2
echo "  ✅ DDS Bridge PID=$AGENT_PID — namespaces will appear as:"
echo "     Drone 0  → /fmu/*          (target_system=1)"
echo "     Drone 1  → /px4_1/fmu/*    (target_system=2)"
echo "     Drone 2  → /px4_2/fmu/*    (target_system=3)"
echo "     Drone 3  → /px4_3/fmu/*    (target_system=4)"
echo "     Drone 4  → /px4_4/fmu/*    (target_system=5)"

# ── Stage 2: Spawn gz_x500 Swarm ─────────────────────────────────────────────
echo ""
echo "🚁 [Stage 2/3] Spawning 5-UAV gz_x500 Swarm..."

# Drone 0 (Alpha) — starts Gazebo Harmonic server (NO PX4_GZ_STANDALONE)
echo "  🚁 Drone 0 (Alpha) at [0, 0, 0.2] — starting Gazebo server..."
PX4_GZ_WORLD="$WORLD_NAME" \
PX4_SYS_AUTOSTART=4001 \
PX4_GZ_MODEL_POSE="0,0,0.2,0,0,0" \
PX4_SIM_MODEL=gz_x500 \
    "$PX4_BIN" -i 0 &

# Fix 5: Wait 8s for GZ server + physics initialization
echo "  ⏳ Waiting 8s for Gazebo Harmonic server initialization..."
sleep 8

# Drone 1 (Beta) — standalone client
echo "  🚁 Drone 1 (Beta) at [4, 0, 0.2]..."
PX4_GZ_STANDALONE=1 \
PX4_SYS_AUTOSTART=4001 \
PX4_GZ_MODEL_POSE="4,0,0.2,0,0,0" \
PX4_SIM_MODEL=gz_x500 \
    "$PX4_BIN" -i 1 &
sleep 3

# Drone 2 (Gamma) — standalone client
echo "  🚁 Drone 2 (Gamma) at [0, 4, 0.2]..."
PX4_GZ_STANDALONE=1 \
PX4_SYS_AUTOSTART=4001 \
PX4_GZ_MODEL_POSE="0,4,0.2,0,0,0" \
PX4_SIM_MODEL=gz_x500 \
    "$PX4_BIN" -i 2 &
sleep 3

# Drone 3 (Delta) — standalone client
echo "  🚁 Drone 3 (Delta) at [-4, 0, 0.2]..."
PX4_GZ_STANDALONE=1 \
PX4_SYS_AUTOSTART=4001 \
PX4_GZ_MODEL_POSE="-4,0,0.2,0,0,0" \
PX4_SIM_MODEL=gz_x500 \
    "$PX4_BIN" -i 3 &
sleep 3

# Drone 4 (Epsilon) — standalone client
echo "  🚁 Drone 4 (Epsilon) at [0, -4, 0.2]..."
PX4_GZ_STANDALONE=1 \
PX4_SYS_AUTOSTART=4001 \
PX4_GZ_MODEL_POSE="0,-4,0.2,0,0,0" \
PX4_SIM_MODEL=gz_x500 \
    "$PX4_BIN" -i 4 &

# ── Stage 3: Status summary ───────────────────────────────────────────────────
echo ""
echo "✨ [Stage 3/3] SUTRA 5-Drone PX4 Swarm Online!"
echo "   To verify ROS 2 topics: ros2 topic list | grep fmu"
echo "   To run offboard control: ros2 run sutra_gnc px4_swarm_offboard_node.py"
echo "   Press Ctrl+C to stop the swarm cleanly."
echo ""

wait
