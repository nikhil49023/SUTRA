#!/bin/bash
set -e

echo "========================================================================="
echo "🚁 Project SUTRA — Subsystem A 3D Gazebo Simulation (Docker + noVNC)"
echo "========================================================================="
echo "Building and starting Docker container..."
echo ""

docker compose up --build sutra_sim_novnc

echo ""
echo "========================================================================="
echo "🌐 Open http://localhost:8080 in your browser to view the 3D Gazebo GUI"
echo "========================================================================="
