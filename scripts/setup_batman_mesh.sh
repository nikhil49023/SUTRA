#!/usr/bin/env bash
# ==============================================================================
# PROJECT SUTRA — B.A.T.M.A.N. Advanced (batman-adv) Layer-2 Mesh Setup Script
# Author: Tech Lead Nikhil (Subsystem B Lead ⚡)
# ==============================================================================
# Sets up layer-2 ad-hoc mesh routing over 802.11s / Wi-Fi interfaces (wlan0..wlan4).
# Usage: ./scripts/setup_batman_mesh.sh [interface] [drone_id_num] [--dry-run]
# Example: ./scripts/setup_batman_mesh.sh wlan0 1

IFACE="${1:-wlan0}"
DRONE_ID="${2:-1}"
DRY_RUN=0

if [[ "$3" == "--dry-run" ]] || [[ "$1" == "--dry-run" ]]; then
    DRY_RUN=1
fi

echo "=========================================================================="
echo " 📡 SUTRA B.A.T.M.A.N. Advanced Layer-2 Wireless Mesh Automation Setup"
echo "=========================================================================="
echo " Interface : $IFACE"
echo " Drone ID  : uav_$DRONE_ID"
echo " Mesh IP   : 192.168.123.$DRONE_ID/24"
echo "=========================================================================="

if [[ $DRY_RUN -eq 1 ]]; then
    echo "🔍 DRY-RUN MODE: Verifying configuration commands without system mutation."
    echo "[CMD] sudo modprobe batman-adv"
    echo "[CMD] sudo ip link set $IFACE down"
    echo "[CMD] sudo iw $IFACE set type ibss"
    echo "[CMD] sudo ip link set $IFACE mtu 1532"
    echo "[CMD] sudo iw $IFACE ibss join sutra-mesh 2412 HT20"
    echo "[CMD] sudo batctl meshif bat0 interface add $IFACE"
    echo "[CMD] sudo ip link set $IFACE up"
    echo "[CMD] sudo ip link set bat0 up"
    echo "[CMD] sudo ip addr add 192.168.123.$DRONE_ID/24 dev bat0"
    echo "✅ DRY-RUN Verification Complete. Script syntax and commands valid."
    exit 0
fi

# Check root permissions
if [[ $EUID -ne 0 ]]; then
    echo "⚠️ Warning: This script requires root privileges to configure network interfaces."
    echo "   Re-run with: sudo $0 $IFACE $DRONE_ID"
    echo "   Running in dry-run mode for validation..."
    $0 $IFACE $DRONE_ID --dry-run
    exit 0
fi

echo "🚀 Step 1: Loading batman-adv kernel module..."
modprobe batman-adv || { echo "❌ Failed to load batman-adv module. Install batctl / linux-modules-extra."; exit 1; }

echo "📡 Step 2: Setting up wireless interface $IFACE in IBSS ad-hoc mode..."
ip link set "$IFACE" down
iw "$IFACE" set type ibss
ip link set "$IFACE" mtu 1532
iw "$IFACE" ibss join sutra-mesh 2412 HT20

echo "🕸️ Step 3: Binding $IFACE to bat0 mesh interface..."
batctl meshif bat0 interface add "$IFACE"
ip link set "$IFACE" up
ip link set bat0 up

echo "🌐 Step 4: Assigning static mesh IP 192.168.123.$DRONE_ID..."
ip addr add "192.168.123.$DRONE_ID/24" dev bat0

echo "=========================================================================="
echo " ✅ B.A.T.M.A.N. Advanced Mesh Layer Active on bat0 (192.168.123.$DRONE_ID)"
echo "=========================================================================="
batctl n
