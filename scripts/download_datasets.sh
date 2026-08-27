#!/bin/bash
# SUTRA Dataset Downloader — All 8 datasets for Subsystem C training
# Usage: bash scripts/download_datasets.sh
# Estimated time: ~10-15 min with aria2c multi-connection | ~6.3 GB total

set -e

export PATH="$HOME/.local/bin:$PATH"

DATA_DIR="$(pwd)/data"
mkdir -p "$DATA_DIR"/{visdrone,hit_uav,sard,xbd,dronecrowd,milipoint,rescuenet,floodnet}

log() { echo -e "\n\033[1;32m[$1]\033[0m $2"; }
warn() { echo -e "\033[1;33m[WARNING]\033[0m $1"; }
err() { echo -e "\033[1;31m[ERROR]\033[0m $1"; }

GDOWN_BIN="$(command -v gdown || echo "$HOME/.local/bin/gdown")"

fast_download() {
  local url="$1"
  local dest_dir="$2"
  local filename="$3"

  if command -v aria2c &>/dev/null; then
    aria2c -x 16 -s 16 -k 1M --allow-overwrite=true -d "$dest_dir" -o "$filename" "$url" 2>&1 || \
    wget -q --show-progress -O "$dest_dir/$filename" "$url" 2>&1 || \
    curl -L -o "$dest_dir/$filename" "$url" 2>&1 || return 1
  else
    wget -q --show-progress -O "$dest_dir/$filename" "$url" 2>&1 || \
    curl -L -o "$dest_dir/$filename" "$url" 2>&1 || return 1
  fi
}

gdrive_download() {
  local fid="$1"
  local dest="$2"
  if [ -x "$GDOWN_BIN" ] || command -v gdown &>/dev/null; then
    "$GDOWN_BIN" "https://drive.google.com/uc?id=$fid" -O "$dest" || \
    gdown "https://drive.google.com/uc?id=$fid" -O "$dest" || return 1
  else
    wget -q --show-progress -O "$dest" \
      "https://drive.google.com/uc?export=download&confirm=t&id=$fid" 2>&1 || \
    curl -L -o "$dest" \
      "https://drive.google.com/uc?export=download&confirm=t&id=$fid" 2>&1 || return 1
  fi
}

safe_unzip() {
  local target_dir="$1"
  cd "$target_dir"
  for z in *.zip; do
    [ -f "$z" ] || continue
    if unzip -t "$z" >/dev/null 2>&1; then
      unzip -qo "$z"
      rm -f "$z"
    else
      warn "Skipping $z (corrupt or incomplete archive)"
      rm -f "$z"
    fi
  done
}

# ──────────────────────────────────────────────────────────────────
# 1. VisDrone — Train + Val + Test-Dev (1.44GB)
# ──────────────────────────────────────────────────────────────────
download_visdrone() {
  log "1/8" "Downloading VisDrone (train + val + test-dev)..."
  
  fast_download "https://github.com/ultralytics/assets/releases/download/v0.0.0/VisDrone2019-DET-train.zip" \
    "$DATA_DIR/visdrone" "VisDrone2019-DET-train.zip" || warn "VisDrone train download failed"
  fast_download "https://github.com/ultralytics/assets/releases/download/v0.0.0/VisDrone2019-DET-val.zip" \
    "$DATA_DIR/visdrone" "VisDrone2019-DET-val.zip" || warn "VisDrone val download failed"
  fast_download "https://github.com/ultralytics/assets/releases/download/v0.0.0/VisDrone2019-DET-test-dev.zip" \
    "$DATA_DIR/visdrone" "VisDrone2019-DET-test-dev.zip" || warn "VisDrone test-dev download failed"

  safe_unzip "$DATA_DIR/visdrone"
  log "1/8" "VisDrone: $(find "$DATA_DIR/visdrone" -name '*.jpg' | wc -l) images extracted"
}

# ──────────────────────────────────────────────────────────────────
# 2. HIT-UAV — Thermal IR (815MB)
# ──────────────────────────────────────────────────────────────────
download_hit_uav() {
  log "2/8" "Downloading HIT-UAV (thermal infrared)..."
  
  fast_download "https://zenodo.org/records/7633120/files/suojiashun/HIT-UAV-Infrared-Thermal-Dataset-v1.2.zip?download=1" \
    "$DATA_DIR/hit_uav" "HIT-UAV.zip" || warn "HIT-UAV download failed"

  safe_unzip "$DATA_DIR/hit_uav"
  log "2/8" "HIT-UAV: $(find "$DATA_DIR/hit_uav" -name '*.jpg' -o -name '*.png' | wc -l) images extracted"
}

# ──────────────────────────────────────────────────────────────────
# 3. SARD — SAR Person Detection (Kaggle / Roboflow)
# ──────────────────────────────────────────────────────────────────
download_sard() {
  log "3/8" "Downloading SARD (search & rescue person detection)..."
  
  fast_download "https://universe.roboflow.com/datasets-pdabr/sard-8xjhy/download/format=yolo8" \
    "$DATA_DIR/sard" "sard.zip" || warn "SARD download failed"

  safe_unzip "$DATA_DIR/sard"
  log "3/8" "SARD: $(find "$DATA_DIR/sard" -name '*.jpg' -o -name '*.png' | wc -l) images extracted"
}

# ──────────────────────────────────────────────────────────────────
# 4. xBD — Building Damage (~2GB)
# ──────────────────────────────────────────────────────────────────
download_xbd() {
  log "4/8" "Downloading xBD (building damage assessment)..."
  
  if command -v kaggle &>/dev/null && [ -f "$HOME/.kaggle/access_token" -o -f "$HOME/.kaggle/kaggle.json" ]; then
    kaggle datasets download -d xview2/xview2 --unzip -p "$DATA_DIR/xbd/" 2>&1 || warn "xBD download via kaggle failed"
  else
    log "4/8" "kaggle API token not configured — cloning RescueNet/xBD structural reference repository..."
    if [ ! -d "$DATA_DIR/xbd/repo" ]; then
      git clone --depth 1 https://github.com/diqigao/xBD-dataset-processing.git "$DATA_DIR/xbd/repo" 2>&1 || true
    fi
  fi
  log "4/8" "xBD: $(find "$DATA_DIR/xbd" -name '*.jpg' -o -name '*.png' | wc -l) images extracted"
}

# ──────────────────────────────────────────────────────────────────
# 5. DRONECrowd — Aerial Crowd Counting (1.03GB)
# ──────────────────────────────────────────────────────────────────
download_dronecrowd() {
  log "5/8" "Downloading DRONECrowd (aerial crowd counting)..."
  
  gdrive_download "1HY3V4QObrVjzXUxL_J86oxn2bi7FMUgd" "$DATA_DIR/dronecrowd/dronecrowd.zip" || warn "DRONECrowd download failed"
  safe_unzip "$DATA_DIR/dronecrowd"
  log "5/8" "DRONECrowd: $(find "$DATA_DIR/dronecrowd" -name '*.jpg' -o -name '*.png' | wc -l) images extracted"
}

# ──────────────────────────────────────────────────────────────────
# 6. MiliPoint — mmWave Radar Point Clouds (160MB)
# ──────────────────────────────────────────────────────────────────
download_milipoint() {
  log "6/8" "Downloading MiliPoint (mmWave radar)..."
  
  if [ ! -d "$DATA_DIR/milipoint/.git" ]; then
    git clone --depth 1 https://github.com/yizzfz/MiliPoint.git "$DATA_DIR/milipoint/" 2>&1 || warn "MiliPoint git clone failed"
  fi

  gdrive_download "1rq8yyokrNhAGQryx7trpUqKenDnTI6Ky" "$DATA_DIR/milipoint/MiliPoint_data.zip" || warn "MiliPoint data download failed"

  mkdir -p "$DATA_DIR/milipoint/data/raw"
  safe_unzip "$DATA_DIR/milipoint"
  log "6/8" "MiliPoint: $(find "$DATA_DIR/milipoint" -name '*.pkl' | wc -l) point cloud files"
}

# ──────────────────────────────────────────────────────────────────
# 7. RescueNet — Post-Hurricane UAV Segmentation (~500MB)
# ──────────────────────────────────────────────────────────────────
download_rescuenet() {
  log "7/8" "Downloading RescueNet (post-hurricane damage)..."
  
  fast_download "https://figshare.com/ndownloader/articles/23618275/versions/1" \
    "$DATA_DIR/rescuenet" "rescuenet.zip" || \
  git clone --depth 1 \
    https://github.com/BinaLab/RescueNet-A-High-Resolution-Post-Disaster-UAV-Dataset-for-Semantic-Segmentation.git \
    "$DATA_DIR/rescuenet/repo/" 2>&1 || warn "RescueNet download failed"

  safe_unzip "$DATA_DIR/rescuenet"
  log "7/8" "RescueNet: $(find "$DATA_DIR/rescuenet" -name '*.jpg' -o -name '*.png' | wc -l) images"
}

# ──────────────────────────────────────────────────────────────────
# 8. FloodNet — Post-Flood UAV Segmentation (~400MB)
# ──────────────────────────────────────────────────────────────────
download_floodnet() {
  log "8/8" "Downloading FloodNet (post-flood damage)..."
  
  git clone --depth 1 \
    https://github.com/BinaLab/FloodNet-Supervised_v1.0.git \
    "$DATA_DIR/floodnet/repo/" 2>&1 || warn "FloodNet download failed"

  safe_unzip "$DATA_DIR/floodnet"
  log "8/8" "FloodNet: $(find "$DATA_DIR/floodnet" -name '*.jpg' -o -name '*.png' | wc -l) images"
}

# ──────────────────────────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────────────────────────
echo "============================================"
echo "  SUTRA Dataset Downloader — 8 Datasets"
echo "  Target: $DATA_DIR"
echo "============================================"

download_visdrone
download_hit_uav
download_sard
download_xbd
download_dronecrowd
download_milipoint
download_rescuenet
download_floodnet

# Summary
echo ""
echo "============================================"
echo "  DOWNLOAD COMPLETE — SUMMARY"
echo "============================================"
for d in visdrone hit_uav sard xbd dronecrowd milipoint rescuenet floodnet; do
  count=$(find "$DATA_DIR/$d" -type f \( -name "*.jpg" -o -name "*.png" -o -name "*.pkl" \) 2>/dev/null | wc -l)
  size=$(du -sh "$DATA_DIR/$d" 2>/dev/null | cut -f1)
  printf "  %-15s %5d files  %s\n" "$d" "$count" "$size"
done
echo "  -------------------------------------------"
echo "  TOTAL: $(du -sh "$DATA_DIR" 2>/dev/null | cut -f1)"
echo "============================================"
