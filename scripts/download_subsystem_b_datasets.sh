#!/bin/bash
# SUTRA Subsystem B Dataset & Benchmark Downloader — 20 Resources Across 4 Categories
# Usage: bash scripts/download_subsystem_b_datasets.sh

set -e

DATA_DIR="$(pwd)/data/subsystem_b_datasets"
mkdir -p "$DATA_DIR"/{mesh_networking,swarmraft,deep_jscc,swarm_sim}

log() { echo -e "\n\033[1;32m[$1]\033[0m $2"; }
warn() { echo -e "\033[1;33m[WARNING]\033[0m $1"; }

clone_repo() {
  local category="$1"
  local name="$2"
  local url="$3"
  local target_dir="$DATA_DIR/$category/$name"

  log "$category" "Cloning / Updating $name..."
  if [ -d "$target_dir/.git" ]; then
    (cd "$target_dir" && git pull --quiet) || warn "Git pull failed for $name"
  else
    git clone --depth 1 "$url" "$target_dir" 2>&1 || warn "Failed to clone $name"
  fi
}

echo "=========================================================="
echo "  SUTRA Subsystem B — 20 Dataset & Benchmark Resources"
echo "  Target: $DATA_DIR"
echo "=========================================================="

# ──────────────────────────────────────────────────────────────────
# Category 1: 802.11s Mesh Networking
# ──────────────────────────────────────────────────────────────────
clone_repo "mesh_networking" "RoutingMetricsIeee802-11s" "https://github.com/ogbautista/RoutingMetricsIeee802-11s.git"

# ──────────────────────────────────────────────────────────────────
# Category 2: SwarmRAFT Consensus Benchmarks
# ──────────────────────────────────────────────────────────────────
clone_repo "swarmraft" "BALLAST" "https://github.com/Icemap/ballast.git"
clone_repo "swarmraft" "Raft-Refloated" "https://github.com/heidi-ann/ocaml-raft-data.git"
clone_repo "swarmraft" "raft-bench" "https://github.com/winstonleedev/raft-bench.git"
clone_repo "swarmraft" "distrobench" "https://github.com/fadhilkurnia/distro.git"
clone_repo "swarmraft" "bft-consensus-bench" "https://github.com/jdh847/bft-consensus-bench.git"

# ──────────────────────────────────────────────────────────────────
# Category 3: Deep JSCC Neural Compression
# ──────────────────────────────────────────────────────────────────
clone_repo "deep_jscc" "Deep-JSCC-PyTorch" "https://github.com/chunbaobao/Deep-JSCC-PyTorch.git"
clone_repo "deep_jscc" "DeepJSCC-TensorFlow" "https://github.com/samhallSwin/DeepJSCC.git"

# ──────────────────────────────────────────────────────────────────
# Category 4: Swarm Simulation
# ──────────────────────────────────────────────────────────────────
clone_repo "swarm_sim" "SynDrone-Swarm" "https://github.com/MehmetUnall/SynDrone-Swarm.git"
clone_repo "swarm_sim" "U2UData" "https://github.com/fengtt42/U2UData.git"
clone_repo "swarm_sim" "MuJoCo-drones-gym" "https://github.com/tau-intelligence/MuJoCo-drones-gym.git"
clone_repo "swarm_sim" "PyBullet-Swarm-Sim" "https://github.com/alexseysua/pybullet-swarm-sim.git"

# Download HuggingFace drone swarm CSV dataset
log "swarm_sim" "Downloading Drone Swarm Coordination Dataset (CSV)..."
mkdir -p "$DATA_DIR/swarm_sim/drone_swarm_coordination"
wget -q --show-progress -O "$DATA_DIR/swarm_sim/drone_swarm_coordination/drone_swarm_coordination.csv" \
  "https://huggingface.co/datasets/jason1966/ahsanneural_drone-swarm-coordination-dataset/raw/main/drone_swarm_coordination.csv" 2>&1 || warn "HuggingFace CSV download failed"

# Summary
echo ""
echo "=========================================================="
echo "  SUBSYSTEM B DATASETS — DOWNLOAD & CLONE SUMMARY"
echo "=========================================================="
for cat in mesh_networking swarmraft deep_jscc swarm_sim; do
  echo "Category: $cat"
  for d in "$DATA_DIR/$cat"/*; do
    [ -d "$d" ] || continue
    name=$(basename "$d")
    size=$(du -sh "$d" 2>/dev/null | cut -f1)
    printf "  %-30s %s\n" "$name" "$size"
  done
done
echo "=========================================================="
