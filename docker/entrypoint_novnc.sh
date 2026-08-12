#!/bin/bash
set -e

# Start Virtual Framebuffer Xvfb on display :99
export DISPLAY=:99
Xvfb :99 -screen 0 1920x1080x24 +extension GLX +extension Composite &
sleep 2

# Start Fluxbox Window Manager
fluxbox &
sleep 1

# Start x11vnc server on port 5900
x11vnc -display :99 -forever -shared -nopw -rfbport 5900 &
sleep 1

# Start noVNC Web Server on port 8080 forwarding to VNC 5900
/usr/share/novnc/utils/novnc_proxy --vnc localhost:5900 --listen 8080 &
sleep 1

echo "=========================================================================="
echo "🚀 SUTRA Subsystem A Simulation Container Ready (NVIDIA GPU Enabled)!"
echo "🎮 Hardware GPU: $(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null || echo 'Software/Mesa OpenGL Fallback')"
echo "🌐 Open http://localhost:8080 in your browser to view 3D Gazebo GUI"
echo "=========================================================================="

# Source ROS 2 workspace
source /opt/ros/jazzy/setup.bash
if [ -f /sutra_ws/install/setup.bash ]; then
    source /sutra_ws/install/setup.bash
fi

# Execute launch command passed to container or default Phase 1 flight launch
if [ "$#" -gt 0 ]; then
    exec "$@"
else
    exec ros2 launch sutra_sim phase1_flight.launch.py headless:=false
fi
