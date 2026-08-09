#!/usr/bin/env bash
# SUTRA Subsystem B: Linux Kernel B.A.T.M.A.N. Advanced (batman-adv) 802.11s Layer-2 Mesh Setup Script
# Author: Nikhil (Tech Architect & Subsystem B Lead)

set -e

IFACE=${1:-"wlan0"}
BAT_IFACE="bat0"
NODE_IP=${2:-"192.168.123.10/24"}

echo "=========================================================="
echo " 📡 SUTRA Subsystem B — Kernel Mesh Setup (batman-adv)"
echo " Interface: ${IFACE} | Bat-Node: ${BAT_IFACE} | IP: ${NODE_IP}"
echo "=========================================================="

# Check root permissions
if [ "$EUID" -ne 0 ]; then
  echo "⚠ Permission notice: Run with sudo to configure network interfaces."
  exit 1
fi

# Load kernel module
modprobe batman-adv || true

# Bring interface down
ip link set dev "${IFACE}" down || true
iw dev "${IFACE}" set type ibss || true

# Set interface to ad-hoc / mesh mode
ip link set dev "${IFACE}" mtu 1500
batctl meshif "${BAT_IFACE}" interface add "${IFACE}" || true
ip link set dev "${IFACE}" up
ip link set dev "${BAT_IFACE}" up
ip addr add "${NODE_IP}" dev "${BAT_IFACE}" || true

echo "✅ B.A.T.M.A.N. Advanced mesh node active on ${BAT_IFACE}!"
batctl neighbors || true
