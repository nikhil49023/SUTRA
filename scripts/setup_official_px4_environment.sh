#!/bin/bash
# ==============================================================================
# SUTRA: Official PX4 + Gazebo Harmonic Environment Setup
# Validated against PX4 PR #21091, Issue #21284, OSRF package registry.
# ==============================================================================
set -e

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  SUTRA — Official PX4 + Gazebo Harmonic Environment Setup   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ── Step 1: Resolve ROS 2 Gazebo package conflicts ────────────────────────────
# Fix 4 from validation: ros-humble-ros-gz* and ros-humble-ros-gzharmonic
# CANNOT coexist — purge the conflicting one first.
echo "📦 [1/4] Resolving ROS 2 Gazebo package conflicts..."
if dpkg -l | grep -q "ros-humble-ros-gz "; then
    echo "  ⚠️  Detected conflicting ros-humble-ros-gz — removing..."
    sudo apt-get remove -y ros-humble-ros-gz* 2>/dev/null || true
fi
sudo apt-get update -qq
sudo apt-get install -y ros-humble-ros-gzharmonic
echo "  ✅ ros-humble-ros-gzharmonic installed (conflict-free)."

# ── Step 2: Build official Micro-XRCE-DDS-Agent from source ──────────────────
echo ""
echo "📦 [2/4] Building official Micro-XRCE-DDS-Agent (eProsima)..."
if command -v MicroXRCEAgent &>/dev/null; then
    echo "  ✅ MicroXRCEAgent already installed: $(which MicroXRCEAgent)"
else
    if [ ! -d "$HOME/Micro-XRCE-DDS-Agent" ]; then
        git clone https://github.com/eProsima/Micro-XRCE-DDS-Agent.git "$HOME/Micro-XRCE-DDS-Agent"
    fi
    cd "$HOME/Micro-XRCE-DDS-Agent"
    mkdir -p build && cd build
    cmake .. -DCMAKE_BUILD_TYPE=Release
    make -j2
    sudo make install
    sudo ldconfig /usr/local/lib/
    echo "  ✅ MicroXRCEAgent installed: $(which MicroXRCEAgent)"
fi

# ── Step 3: Clone PX4-Autopilot main branch (Gazebo Harmonic native) ─────────
echo ""
echo "📦 [3/4] Cloning PX4-Autopilot (main branch — native Gazebo Harmonic)..."
if [ ! -d "$HOME/PX4-Autopilot" ]; then
    git clone https://github.com/PX4/PX4-Autopilot.git --recursive "$HOME/PX4-Autopilot"
else
    echo "  📁 PX4-Autopilot exists. Updating main branch..."
    cd "$HOME/PX4-Autopilot" && git checkout main && git pull --ff-only
fi
echo "  🔧 Installing PX4 Ubuntu dependencies..."
bash "$HOME/PX4-Autopilot/Tools/setup/ubuntu.sh" --no-sim-tools 2>/dev/null || \
    bash "$HOME/PX4-Autopilot/Tools/setup/ubuntu.sh"
echo "  🔨 Building PX4 SITL (RAM-safe: -j2)..."
cd "$HOME/PX4-Autopilot"
MAKEFLAGS="-j2" make px4_sitl
echo "  ✅ PX4 SITL built: $HOME/PX4-Autopilot/build/px4_sitl_default/bin/px4"

# ── Step 4: Add px4_msgs (main) into sutra_ws ─────────────────────────────────
echo ""
echo "📦 [4/4] Integrating official px4_msgs (main branch)..."
SUTRA_WS="/home/nikhil/Desktop/Project SUTRA/sutra_ws"
PX4_MSGS_DIR="$SUTRA_WS/src/px4_msgs"
if [ ! -d "$PX4_MSGS_DIR" ]; then
    git clone https://github.com/PX4/px4_msgs.git -b main "$PX4_MSGS_DIR"
else
    cd "$PX4_MSGS_DIR" && git checkout main && git pull --ff-only
fi
source /opt/ros/humble/setup.bash
cd "$SUTRA_WS"
colcon build --symlink-install --packages-select px4_msgs \
    --parallel-workers 2 --cmake-args -DCMAKE_BUILD_TYPE=Release --make-args -j2
echo "  ✅ px4_msgs installed in sutra_ws."

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ✅ SUTRA Official PX4 + Gazebo Harmonic Environment Ready!  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
