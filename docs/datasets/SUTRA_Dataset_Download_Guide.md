# SUTRA Dataset Download Guide

> **Last Updated:** 2026-08-04
> **Purpose:** All datasets required for Subsystem C (AI Edge Perception) training
> **Target Model:** YOLOv8n (Nano) — TensorRT FP16 on Jetson Orin Nano
> **Total Estimated Size:** ~6.3 GB

---

## Quick Start

```bash
# Run the full automated download
bash scripts/download_datasets.sh

# Or download individually using the URLs below
```

---

## Dataset Summary

| # | Dataset | Purpose | Size | Source | Priority |
|---|---------|---------|------|--------|----------|
| 1 | VisDrone | Aerial object detection (Phase 1 pretrain) | ~1.8 GB | Google Drive | HIGH |
| 2 | HIT-UAV | Thermal IR survivor detection | ~815 MB | Zenodo | HIGH |
| 3 | SARD | SAR person detection from drones | ~4.4 GB | IEEE DataPort | HIGH |
| 4 | xBD | Building damage assessment | ~2 GB | Kaggle | HIGH |
| 5 | DRONECrowd | Aerial crowd counting | ~1 GB | Google Drive | MEDIUM |
| 6 | MiliPoint | mmWave radar point clouds | ~160 MB | Google Drive | MEDIUM |
| 7 | RescueNet | Post-hurricane UAV damage segmentation | ~500 MB | Figshare | MEDIUM |
| 8 | FloodNet | Post-flood UAV damage segmentation | ~400 MB | Dropbox | LOW |

---

## 1. VisDrone (Phase 1 Pretraining)

**What:** Aerial RGB images with bounding box annotations for 10 object classes.
**Why:** Best aerial perspective diversity — 2.6M bounding boxes from drones at various altitudes.
**Classes:** pedestrian, car, van, bus, truck, bicycle, motorbike, tricycle, ignored region, others.

### Google Drive Links (Recommended)

```bash
# Train set — 6,471 images (1.44 GB)
wget -O data/visdrone/VisDrone2019-DET-train.zip \
  "https://drive.google.com/uc?export=download&confirm=t&id=1a2oHjcEcwXP8oUF95qiwrqzACb2YlUhn"

# Val set — 548 images (0.07 GB)
wget -O data/visdrone/VisDrone2019-DET-val.zip \
  "https://drive.google.com/uc?export=download&confirm=t&id=1bxK5zgLn0_L8x276eKkuYA_FzwCIjb59"

# Test-dev set — 1,610 images (0.28 GB)
wget -O data/visdrone/VisDrone2019-DET-test-dev.zip \
  "https://drive.google.com/uc?export=download&confirm=t&id=1PFdW_VFSCfZ_sTSZAGjQdifF_Xd5mf0V"
```

### Ultralytics Auto-Download (Alternative)

```python
from ultralytics import YOLO

# VisDrone downloads automatically on first train
model = YOLO('yolov8n.pt')
model.train(data='VisDrone.yaml', epochs=1, imgsz=640)
# Dataset downloads to datasets/VisDrone/ automatically
```

### BaiduYun Links (Backup)

| Split | BaiduYun Link | Code |
|-------|--------------|------|
| Train | https://pan.baidu.com/s/1K-JtLnlHw98UuBDrYJvw3A | — |
| Val | https://pan.baidu.com/s/1jdK_dAxRJeF2Xi50IoML1g | — |
| Test-dev | https://pan.baidu.com/s/1RdRfSWV-1IFK7aWljLU_LQ | — |

### Extraction

```bash
cd data/visdrone/
unzip VisDrone2019-DET-train.zip
unzip VisDrone2019-DET-val.zip
unzip VisDrone2019-DET-test-dev.zip

# Convert to YOLO format (uses ultralytics built-in converter)
python3 -c "
from ultralytics.data.utils import visdrone2yolo
from pathlib import Path
visdrone2yolo(Path('.'))
"
```

### Annotation Format (VisDrone)

Each `.txt` file has one row per object:
```
bbox_x, bbox_y, bbox_w, bbox_h, score, category, truncation, occlusion
```
- Category IDs: 1=pedestrian, 2=people, 3=bicycle, 4=car, 5=van, 6=bus, 7=truck, 8=motor, 9=tricycle, 10=ignored, 11=others

---

## 2. HIT-UAV (Thermal IR Detection)

**What:** 2,898 infrared thermal images from UAV at 60–130m altitude.
**Why:** Direct match for FLIR Lepton 3.5 sensor. Person/vehicle detection in thermal band.
**Classes:** Person, Bicycle, Car, OtherVehicle.
**License:** CC BY 4.0

### Zenodo Download (Recommended)

```bash
# 814.8 MB — direct download
wget -O data/hit_uav/HIT-UAV-v1.2.zip \
  "https://zenodo.org/records/7633120/files/suojiashun/HIT-UAV-Infrared-Thermal-Dataset-v1.2.zip?download=1"
```

### GitHub Repository

```bash
git clone https://github.com/suojiashun/HIT-UAV-Infrared-Thermal-Dataset.git data/hit_uav/
```

### Extraction

```bash
cd data/hit_uav/
unzip HIT-UAV-v1.2.zip

# Structure:
# HIT-UAV/
# ├── images/
# │   ├── train/
# │   ├── val/
# │   └── test/
# └── annotations/
#     ├── train/
#     ├── val/
#     └── test/
```

### Citation

```
Suo, J., Wang, T., Zhang, X., Chen, H., Zhou, W. & Shi, W. (2023).
HIT-UAV: A high-altitude infrared thermal dataset for Unmanned Aerial
Vehicle-based object detection. Scientific Data 10, 227.
https://doi.org/10.1038/s41597-023-02066-6
```

---

## 3. SARD (Search And Rescue Dataset)

**What:** 1,981 images of people in SAR scenarios captured by DJI Phantom 4A drone.
**Why:** Actors simulate exhausted/injured persons in realistic terrain (roads, quarries, grass, forest).
**Classes:** Standing, Walking, Running, Sitting, Lying, Not Defined.
**License:** CC BY 4.0

### IEEE DataPort (Official)

```bash
# 4.43 GB — requires free IEEE DataPort account
# URL: https://doi.org/10.21227/ahxm-k331
# Download: https://ieee-dataport.org/documents/search-and-rescue-image-dataset-person-detection-sard
```

### Kaggle (SARD-2, YOLO-Ready)

```bash
# Install kaggle CLI
pip install kaggle

# Download SARD-2 (extra classes, YOLO format)
kaggle datasets download -d nikolasgegenava/sard-2-search-and-rescue-dataset-extra-classes \
  --unzip -p data/sard/
```

### HuggingFace (YOLO26 Pre-trained)

```bash
# Pre-processed for YOLO training (5,755 images, 640x640)
# https://huggingface.co/Rctohhhh/SARD
```

### Roboflow (Alternative)

```bash
# YOLO-format annotated SARD
# https://universe.roboflow.com/datasets-pdabr/sard-8xjhy
```

### Extraction

```bash
cd data/sard/
# If using Kaggle download:
unzip sard-2-search-and-rescue-dataset-extra-classes.zip

# Structure:
# SARD/
# ├── train/
# │   ├── images/
# │   └── labels/
# ├── valid/
# │   ├── images/
# │   └── labels/
# └── test/
#     ├── images/
#     └── labels/
```

---

## 4. xBD (Building Damage Assessment)

**What:** 850K+ annotations of building damage from satellite imagery (pre/post disaster).
**Why:** Only dataset with real disaster damage grades. Critical for `structural_damage` class.
**Classes:** no-damage, minor-damage, major-damage, destroyed.

### Kaggle Download

```bash
pip install kagglehub

python3 -c "
import kagglehub
path = kagglehub.dataset_download('xview2/xview2', path='data/xbd/')
print(f'Downloaded to: {path}')
"
```

### Direct Kaggle CLI

```bash
kaggle datasets download -d xview2/xview2 --unzip -p data/xbd/
```

### Extraction

```bash
cd data/xbd/
# Structure:
# xbd/
# ├── train/
# │   ├── images/
# │   ├── labels/
# │   └── targets/
# ├── test/
# └── tier3/
```

### Annotation Format (xBD)

```json
{
  "features": [
    {
      "properties": {
        "subtype": "no-damage",
        "building_id": "abc123"
      },
      "wkt": "POLYGON ((...))"
    }
  ]
}
```

---

## 5. DRONECrowd (Aerial Crowd Counting)

**What:** 33,600 HD frames with 4.8M head annotations across 70 scenarios.
**Why:** Dense crowd counting from drones. Useful for survivor cluster detection.
**License:** Research use

### Google Drive Download

```bash
# 1.03 GB — condensed version
wget -O data/dronecrowd/dronecrowd.zip \
  "https://drive.google.com/uc?export=download&confirm=t&id=1HY3V4QObrVjzXUxL_J86oxn2bi7FMUgd"
```

### Full Version (Google Drive)

```bash
# Full version with all 33,600 frames
# Google Drive: https://drive.google.com/drive/folders/1EUKLJ1WmrhWTNGt4wFLyHRfspJAt56WN?usp=sharing
```

### Extraction

```bash
cd data/dronecrowd/
unzip dronecrowd.zip

# Structure:
# DroneCrowd/
# ├── train/
# │   ├── images/
# │   └── annotations/
# ├── val/
# └── test/
```

---

## 6. MiliPoint (mmWave Radar Point Clouds)

**What:** 545K point cloud frames for mmWave radar human activity recognition.
**Why:** Matches LoRa Ra-02 radar channel. Paper C3 shows 0.195m accuracy through obstacles.
**License:** MIT

### GitHub + Google Drive

```bash
# Clone repo (code + configs)
git clone https://github.com/yizzfz/MiliPoint.git data/milipoint/

# Download data (160MB)
wget -O data/milipoint/MiliPoint_data.zip \
  "https://drive.google.com/uc?export=download&confirm=t&id=1rq8yyokrNhAGQryx7trpUqKenDnTI6Ky"
```

### Extraction

```bash
cd data/milipoint/
unzip MiliPoint_data.zip -d data/raw/

# Structure:
# MiliPoint/
# ├── data/
# │   └── raw/
# │       ├── 1.pkl
# │       ├── 2.pkl
# │       └── ...
# ├── configs/
# └── mm/
```

---

## 7. RescueNet (Post-Hurricane UAV Segmentation)

**What:** 4,494 high-resolution UAV images post-Hurricane Michael with pixel-level annotations.
**Why:** 10-class semantic segmentation including building damage grades (no/minor/major/destroyed).
**License:** CC BY 4.0

### Figshare Download

```bash
# Download from Figshare (may require browser for large files)
wget -O data/rescuenet/rescuenet.zip \
  "https://figshare.com/ndownloader/articles/23618275/versions/1"
```

### Dropbox Alternative

```bash
wget -O data/rescuenet/rescuenet.zip \
  "https://www.dropbox.com/scl/fo/ntgeyhxe2mzd2wuh7he7x/AHJ-cNzQL-Eu04HS6bvBgcw?rlkey=6vxiaqve9gp6vzvzh3t5mz0vv&e=1&dl=0"
```

### GitHub Repository

```bash
git clone https://github.com/BinaLab/RescueNet-A-High-Resolution-Post-Disaster-UAV-Dataset-for-Semantic-Segmentation.git data/rescuenet/
```

### Extraction

```bash
cd data/rescuenet/
unzip rescuenet.zip

# Structure:
# RescueNet/
# ├── images/
# │   ├── train/
# │   ├── val/
# │   └── test/
# └── labels/
#     ├── train/
#     ├── val/
#     └── test/
```

### Classes (10)

| ID | Class |
|----|-------|
| 0 | Background |
| 1 | Water |
| 2 | Building No Damage |
| 3 | Building Minor Damage |
| 4 | Building Major Damage |
| 5 | Building Total Destruction |
| 6 | Road Clear |
| 7 | Road Blocked |
| 8 | Vehicle |
| 9 | Tree |
| 10 | Pool |

---

## 8. FloodNet (Post-Flood UAV Segmentation)

**What:** 2,343 UAV images post-Hurricane Harvey with semantic segmentation labels.
**Why:** Flood damage assessment. Complements RescueNet for multi-disaster generalization.
**License:** CC BY-SA 4.0

### Dropbox Download

```bash
wget -O data/floodnet/floodnet.zip \
  "https://www.dropbox.com/scl/fo/k33qdif15ns2qv2jdxvhx/ANGaa8iPRhvlrvcKXjnmNRc?rlkey=ao2493wzl1cltonowjdbrnp7f&e=2&dl=0"
```

### Kaggle Download

```bash
kaggle datasets download -d aletbm/aerial-imagery-dataset-floodnet-challenge \
  --unzip -p data/floodnet/
```

### GitHub Repository

```bash
git clone https://github.com/BinaLab/FloodNet-Supervised_v1.0.git data/floodnet/
```

### Extraction

```bash
cd data/floodnet/
unzip floodnet.zip

# Structure:
# FloodNet/
# ├── train_image/
# ├── train_label/
# ├── val_image/
# ├── val_label/
# ├── test_image/
# └── test_label/
```

### Classes (10)

| ID | Class |
|----|-------|
| 0 | Background |
| 1 | Building Flooded |
| 2 | Building Non-Flooded |
| 3 | Road Flooded |
| 4 | Road Non-Flooded |
| 5 | Water |
| 6 | Tree |
| 7 | Vehicle |
| 8 | Pool |
| 9 | Grass |

---

## Directory Structure (After Download)

```
data/
├── visdrone/              # Phase 1 pretraining (aerial RGB)
│   ├── VisDrone2019-DET-train/
│   ├── VisDrone2019-DET-val/
│   └── VisDrone2019-DET-test-dev/
├── hit_uav/               # Phase 2 fine-tuning (thermal IR)
│   └── HIT-UAV/
├── sard/                  # Phase 2 fine-tuning (SAR persons)
│   └── SARD/
├── xbd/                   # Phase 2 fine-tuning (building damage)
│   └── xview2/
├── dronecrowd/            # Enrichment (crowd counting)
│   └── DroneCrowd/
├── milipoint/             # Enrichment (mmWave radar)
│   ├── data/raw/
│   └── ...
├── rescuenet/             # Enrichment (damage segmentation)
│   └── RescueNet/
└── floodnet/              # Enrichment (flood damage)
    └── FloodNet/
```

---

## Verification Commands

```bash
# Count images per dataset
echo "=== VisDrone ===" && find data/visdrone/ -name "*.jpg" | wc -l
echo "=== HIT-UAV ===" && find data/hit_uav/ -name "*.jpg" | wc -l
echo "=== SARD ===" && find data/sard/ -name "*.jpg" | wc -l
echo "=== xBD ===" && find data/xbd/ -name "*.jpg" | wc -l
echo "=== DRONECrowd ===" && find data/dronecrowd/ -name "*.jpg" | wc -l
echo "=== MiliPoint ===" && find data/milipoint/ -name "*.pkl" | wc -l
echo "=== RescueNet ===" && find data/rescuenet/ -name "*.jpg" | wc -l
echo "=== FloodNet ===" && find data/floodnet/ -name "*.jpg" | wc -l

# Total disk usage
du -sh data/*/
du -sh data/  # Total
```

---

## Class Remapping (VisDrone → SAR)

For Phase 2 fine-tuning, remap VisDrone classes to SAR classes:

| VisDrone Class | ID | SAR Class | SAR ID |
|---|---|---|---|
| pedestrian, people | 0, 1 | **survivor** | 0 |
| car, van, bus, truck | 3, 4, 5, 6 | **vehicle** | 1 |
| bicycle, tricycle, motor | 2, 8, 7 | **obstacle** | 2 |
| — | — | **fire** | 3 |
| — | — | **structural_damage** | 4 |

**5 SAR classes** total.

---

## Training Pipeline

```bash
# Phase 1: Aerial Pretraining on VisDrone
yolo train model=yolov8n.pt data=VisDrone.yaml epochs=30 imgsz=640 batch=16

# Phase 2: SAR Fine-Tuning on merged dataset
yolo train model=runs/detect/train/weights/best.pt \
  data=sar_merged.yaml epochs=50 imgsz=640 batch=16 lr0=0.001

# Export to TensorRT FP16
yolo export model=best.pt format=engine half=True
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Google Drive download fails | Add `&confirm=t` to URL, or use `gdown` Python package |
| Kaggle 403 error | Run `kaggle configure` and enter your API token |
| Zenodo 503 error | Retry after 30s, or use GitHub mirror |
| xBD too large (>2GB) | Download tier3 subset only, or use Kaggle's partial download |
| SARD requires IEEE account | Use Kaggle SARD-2 version instead (free, YOLO-ready) |
| FloodNet Dropbox link broken | Use Kaggle `aletbm/aerial-imagery-dataset-floodnet-challenge` |

---

## References

| Paper | Dataset Used | DOI |
|-------|-------------|-----|
| Jadeja et al. 2024 | SARD, VisDrone | Nature Scientific Reports |
| DRJSCC 2026 | xBD, RescueNet | Digital Signal Processing 176 |
| HIT-UAV 2023 | HIT-UAV | Scientific Data 10, 227 |
| Kubo et al. 2026 | Thermal SAR | Remote Sensing 18(14) |
| FloodNet 2020 | FloodNet | IEEE IJCNN |
| RescueNet 2023 | RescueNet | Scientific Data 10, 913 |
