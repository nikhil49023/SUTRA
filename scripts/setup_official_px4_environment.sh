#!/bin/bash
# ==============================================================================
# SUTRA: Official PX4 + Gazebo Harmonic Environment Setup
# System: ROS 2 Jazzy + Gazebo Sim 8.11.0 (Harmonic) — native pairing
# No ros-gz conflicts on Jazzy (gz-harmonic is the default).
# ==============================================================================
set -e

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  SUTRA — Official PX4 + Gazebo Harmonic Environment Setup   ║"
echo "║  ROS 2 Jazzy + Gazebo Sim 8.11.0 (Harmonic)                 ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Source ROS 2 Jazzy
source /opt/ros/jazzy/setup.bash

# ── Step 1: Build official Micro-XRCE-DDS-Agent from source ──────────────────
echo "📦 [1/3] Building official Micro-XRCE-DDS-Agent (eProsima)..."
if command -v MicroXRCEAgent &>/dev/null; then
    echo "  ✅ MicroXRCEAgent already installed: $(which MicroXRCEAgent)"
else
    # Install build deps
    sudo apt-get install -y cmake g++ libssl-dev 2>/dev/null || true
    if [ ! -d "$HOME/Micro-XRCE-DDS-Agent" ]; then
        git clone https://github.com/eProsima/Micro-XRCE-DDS-Agent.git "$HOME/Micro-XRCE-DDS-Agent"
    fi
    cd "$HOME/Micro-XRCE-DDS-Agent"
    mkdir -p build && cd build
    cmake .. -DCMAKE_BUILD_TYPE=Release -DTHIRDPARTY=ON
    make -j2
    sudo make install
    sudo ldconfig /usr/local/lib/
    echo "  ✅ MicroXRCEAgent installed: $(which MicroXRCEAgent)"
fi

# ── Step 2: Clone & build PX4-Autopilot (main branch) ─────────────────────────
echo ""
echo "📦 [2/3] Setting up PX4-Autopilot (main branch, Gazebo Harmonic native)..."
if [ ! -d "$HOME/PX4-Autopilot" ]; then
    git clone https://github.com/PX4/PX4-Autopilot.git --recursive --depth=1 "$HOME/PX4-Autopilot"
else
    echo "  📁 PX4-Autopilot exists. Updating..."
    cd "$HOME/PX4-Autopilot" && git checkout main && git pull --ff-only
    git submodule update --init --recursive
fi
echo "  🔧 Installing PX4 Ubuntu dependencies (suppressing pip noise)..."
bash "$HOME/PX4-Autopilot/Tools/setup/ubuntu.sh" --no-sim-tools 2>/dev/null || \
    bash "$HOME/PX4-Autopilot/Tools/setup/ubuntu.sh"
echo "  🔨 Building PX4 SITL (RAM-safe: -j2, this takes ~10min)..."
cd "$HOME/PX4-Autopilot"
MAKEFLAGS="-j2" make px4_sitl
echo "  ✅ PX4 binary: $HOME/PX4-Autopilot/build/px4_sitl_default/bin/px4"

# ── Step 3: Add px4_msgs (main) into sutra_ws ─────────────────────────────────
echo ""
echo "📦 [3/3] Integrating official px4_msgs (main branch)..."
SUTRA_WS="/home/nikhil/Desktop/Project SUTRA/sutra_ws"
PX4_MSGS_DIR="$SUTRA_WS/src/px4_msgs"
if [ ! -d "$PX4_MSGS_DIR" ]; then
    git clone https://github.com/PX4/px4_msgs.git -b main "$PX4_MSGS_DIR"
else
    cd "$PX4_MSGS_DIR" && git checkout main && git pull --ff-only
fi
cd "$SUTRA_WS"
colcon build --symlink-install --packages-select px4_msgs \
    --parallel-workers 2 --cmake-args -DCMAKE_BUILD_TYPE=Release --make-args -j2
echo "  ✅ px4_msgs installed in sutra_ws/install/"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ✅ SUTRA Official PX4 + Gazebo Harmonic Environment Ready!  ║"
echo "║                                                              ║"
echo "║  Next: bash scripts/launch_official_px4_swarm.sh            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
